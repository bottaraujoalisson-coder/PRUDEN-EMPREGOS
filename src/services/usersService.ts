import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getActiveSessionUid } from './directCloudAuth';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import {
  UserProfile,
  ResumeTemplateId,
  GeneratedResumeRecord,
  CreditTransaction,
} from '../types';
import { stripUndefined } from '../utils/matchAlgorithm';
import {
  getDocumentRegistryKey,
  isValidCPF,
  isValidCNPJ,
  normalizeCPF,
  normalizeCNPJ,
  formatCPF,
  formatCNPJ,
} from '../utils/validation';
import {
  RESUME_GENERATION_COST,
  buildStructuredResumeFromProfile,
  generateSelectableResumePdfDataUrl,
} from '../utils/pdfResumeGenerator';
import { INITIAL_WELCOME_CREDITS } from '../utils/creditsData';

export const ADMIN_EMAIL = 'bottaraujoalisson@gmail.com';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const [userSnap, privateSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'private_profiles', uid)).catch(() => null),
    ]);
    if (userSnap.exists()) {
      const publicData = userSnap.data() as UserProfile;
      const privateData = privateSnap && privateSnap.exists() ? privateSnap.data() : {};
      return {
        ...publicData,
        ...privateData,
      } as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

/**
 * Verifica disponibilidade e validade de CPF ou CNPJ no backend e no Firestore (document_registry)
 * sem expor dados privados de outros usuários.
 */
export async function checkDocumentAvailability(
  documentType: 'CPF' | 'CNPJ',
  rawDocument: string,
  currentUid?: string
): Promise<{ valid: boolean; available: boolean; message?: string }> {
  const clean = documentType === 'CPF' ? normalizeCPF(rawDocument) : normalizeCNPJ(rawDocument);

  if (documentType === 'CPF' && !isValidCPF(clean)) {
    return {
      valid: false,
      available: false,
      message: 'CPF inválido. Verifique os 11 números e os dígitos verificadores.',
    };
  }

  if (documentType === 'CNPJ' && !isValidCNPJ(clean)) {
    return {
      valid: false,
      available: false,
      message: 'CNPJ inválido. Verifique os 14 números e os dígitos verificadores.',
    };
  }

  // 1. Verifica no Backend autoritativo
  try {
    const res = await fetch('/api/users/check-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType,
        document: clean,
        uid: currentUid,
      }),
    });
    const data = await res.json().catch(() => null);
    if (data && data.available === false) {
      return {
        valid: true,
        available: false,
        message:
          data.message ||
          `Este ${documentType} já está vinculado a uma conta cadastrada na plataforma.`,
      };
    }
  } catch {
    // Segue para verificação direta no Firestore
  }

  // 2. Verifica na coleção de restrição de unicidade do Firestore (document_registry e documents)
  try {
    const docKey = getDocumentRegistryKey(documentType, clean);
    const [regSnap, docSnap] = await Promise.all([
      getDoc(doc(db, 'document_registry', docKey)),
      getDoc(doc(db, 'documents', clean)).catch(() => null),
    ]);
    if (regSnap.exists()) {
      const regData = regSnap.data();
      if (regData.uid && regData.uid !== currentUid) {
        return {
          valid: true,
          available: false,
          message: `Este ${documentType} já está vinculado a uma conta cadastrada na plataforma.`,
        };
      }
    }
    if (docSnap && docSnap.exists()) {
      const docData = docSnap.data();
      if (docData.uid && docData.uid !== currentUid) {
        return {
          valid: true,
          available: false,
          message: `Este ${documentType} já está vinculado a uma conta cadastrada na plataforma.`,
        };
      }
    }
  } catch {
    // Ignora erro de rede se backend já validou
  }

  return { valid: true, available: true };
}

/**
 * Registra ou atualiza o perfil do usuário garantindo:
 * 1. Validação no backend (/api/users/register-document)
 * 2. Restrição atômica de unicidade de CPF/CNPJ nas coleções document_registry e documents
 * 3. Segregação LGPD em /private_profiles/{uid} (CPF, CNPJ, endereço fiscal e telefone privado)
 */
export async function saveUserProfile(
  uid: string,
  profile: Partial<UserProfile>
): Promise<void> {
  const now = new Date().toISOString();

  // Identifica se o payload traz CPF ou CNPJ para garantir normalização e unicidade
  const rawCpf = profile.cpf || (profile.documentType === 'CPF' ? profile.documentNumber : undefined);
  const rawCnpj = profile.cnpj || (profile.documentType === 'CNPJ' ? profile.documentNumber : undefined);

  let docType: 'CPF' | 'CNPJ' | undefined = profile.documentType;
  let normalizedDoc = '';
  let formattedDoc = '';

  if (rawCpf && normalizeCPF(rawCpf).length > 0) {
    docType = 'CPF';
    normalizedDoc = normalizeCPF(rawCpf);
    if (!isValidCPF(normalizedDoc)) {
      throw new Error('CPF inválido. Verifique os 11 dígitos e os dígitos verificadores.');
    }
    formattedDoc = formatCPF(normalizedDoc);
  } else if (rawCnpj && normalizeCNPJ(rawCnpj).length > 0) {
    docType = 'CNPJ';
    normalizedDoc = normalizeCNPJ(rawCnpj);
    if (!isValidCNPJ(normalizedDoc)) {
      throw new Error('CNPJ inválido. Verifique os 14 dígitos e os dígitos verificadores.');
    }
    formattedDoc = formatCNPJ(normalizedDoc);
  }

  // Valida e registra no backend quando disponível; no Netlify estático, a transação do Firestore garante a unicidade
  if (docType && normalizedDoc) {
    const backendRes = await fetch('/api/users/register-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        documentType: docType,
        document: normalizedDoc,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        cep: profile.cep,
        city: profile.city,
        credits: profile.credits,
      }),
    }).catch(() => null);

    if (
      backendRes &&
      (backendRes.status === 400 || backendRes.status === 409) &&
      (backendRes.headers.get('content-type') || '').includes('application/json')
    ) {
      const errBody = await backendRes.json().catch(() => ({}));
      throw new Error(
        errBody.error ||
          `Este ${docType} já está cadastrado na plataforma ou os dados são inválidos.`
      );
    }
  }

  // Operações no Firestore são executadas quando o usuário possui sessão ativa
  const activeUid = auth.currentUser?.uid || getActiveSessionUid();
  if (!activeUid || activeUid !== uid) {
    return;
  }

  try {
    const userRef = doc(db, 'users', uid);
    const publicProfileRef = doc(db, 'profiles', uid);
    const privateRef = doc(db, 'private_profiles', uid);

    const buildPublicShowcasePayload = (src: Partial<UserProfile>) =>
      stripUndefined({
        uid,
        name: src.name,
        displayName: src.name,
        role: src.role || (src.type === 'company' ? 'company' : 'candidate'),
        city: src.city || 'Presidente Prudente, SP',
        state: src.state || 'SP',
        bio: src.about || '',
        desiredRole: src.role || '',
        skills: src.skills || [],
        experiences: src.experiences || [],
        education: src.education || '',
        companyName: src.type === 'company' ? src.name : undefined,
        tradeName: src.nomeFantasia || undefined,
        publicEmail: src.email || '',
        isVerifiedCompany: false,
        updatedAt: now,
      });

    const buildPrivatePayload = (src: Partial<UserProfile>) =>
      stripUndefined({
        uid,
        documentType: docType || src.documentType,
        documentNumber: formattedDoc || src.documentNumber,
        normalizedDocument: normalizedDoc || src.normalizedDocument,
        document: normalizedDoc || src.normalizedDocument,
        cpf: docType === 'CPF' ? formattedDoc : src.cpf,
        cnpj: docType === 'CNPJ' ? formattedDoc : src.cnpj,
        privatePhone: src.phone,
        whatsapp: src.phone,
        phone: src.phone,
        cep: src.cep,
        street: src.street,
        addressNumber: src.addressNumber,
        neighborhood: src.neighborhood,
        fiscalAddress: stripUndefined({
          cep: src.cep || '',
          street: src.street || '',
          number: src.addressNumber || '',
          neighborhood: src.neighborhood || '',
          city: src.city || '',
          state: src.state || '',
        }),
        updatedAt: now,
      });

    if (docType && normalizedDoc) {
      const docKey = getDocumentRegistryKey(docType, normalizedDoc);
      const regRef = doc(db, 'document_registry', docKey);
      const docDirectRef = doc(db, 'documents', normalizedDoc);

      await runTransaction(db, async (transaction) => {
        const [regSnap, docDirectSnap, userSnap] = await Promise.all([
          transaction.get(regRef),
          transaction.get(docDirectRef),
          transaction.get(userRef),
        ]);

        if (regSnap.exists()) {
          const existingOwnerUid = regSnap.data().uid;
          if (existingOwnerUid && existingOwnerUid !== uid) {
            throw new Error(
              `DOCUMENT_DUPLICATE: Este ${docType} já está vinculado a outro cadastro na plataforma.`
            );
          }
        }
        if (docDirectSnap.exists()) {
          const existingOwnerUid = docDirectSnap.data().uid;
          if (existingOwnerUid && existingOwnerUid !== uid) {
            throw new Error(
              `DOCUMENT_DUPLICATE: Este ${docType} já está vinculado a outro cadastro na plataforma.`
            );
          }
        }

        const alreadyGrantedWelcome =
          (regSnap.exists() && regSnap.data().welcomeCreditsGranted === true) ||
          (docDirectSnap.exists() && docDirectSnap.data().welcomeCreditsGranted === true) ||
          (userSnap.exists() && userSnap.data().welcomeCreditsGranted === true);

        const enrichedProfile = stripUndefined({
          ...profile,
          documentType: docType,
          documentNumber: formattedDoc,
          normalizedDocument: normalizedDoc,
          ...(docType === 'CPF' ? { cpf: formattedDoc } : { cnpj: formattedDoc }),
          welcomeCreditsGranted: true,
          updatedAt: now,
        });

        const docRegistryRecord = {
          docId: docKey,
          documentType: docType,
          normalizedDocument: normalizedDoc,
          uid,
          welcomeCreditsGranted: true,
          updatedAt: now,
          ...(regSnap.exists() ? {} : { createdAt: now }),
        };

        transaction.set(regRef, docRegistryRecord, { merge: true });
        transaction.set(
          docDirectRef,
          {
            document: normalizedDoc,
            documentType: docType,
            uid,
            welcomeCreditsGranted: true,
            updatedAt: now,
            ...(docDirectSnap.exists() ? {} : { createdAt: now }),
          },
          { merge: true }
        );
        transaction.set(privateRef, buildPrivatePayload(enrichedProfile), { merge: true });

        if (userSnap.exists()) {
          const existingCredits = Number(userSnap.data().credits ?? 0);
          const shouldGrantWelcomeNow =
            !alreadyGrantedWelcome && existingCredits === 0 && typeof profile.credits === 'number';
          transaction.update(userRef, {
            ...enrichedProfile,
            ...(shouldGrantWelcomeNow ? { credits: profile.credits } : {}),
          });
        } else {
          const initialCredits = alreadyGrantedWelcome
            ? 0
            : typeof enrichedProfile.credits === 'number'
            ? enrichedProfile.credits
            : INITIAL_WELCOME_CREDITS;
          transaction.set(
            userRef,
            stripUndefined({
              uid,
              createdAt: now,
              credits: initialCredits,
              ...enrichedProfile,
              welcomeCreditsGranted: true,
            })
          );
          if (initialCredits > 0) {
            const welcomeTxRef = doc(db, 'credit_transactions', `tx_welcome_${uid}`);
            transaction.set(welcomeTxRef, {
              id: `tx_welcome_${uid}`,
              userId: uid,
              orderId: 'welcome_bonus',
              type: 'bonus',
              amount: initialCredits,
              balanceAfter: initialCredits,
              description: `Bônus de boas-vindas no 1º cadastro (+${initialCredits} créditos gratuitos)`,
              createdAt: now,
            });
          }
        }
      });
      const batch = writeBatch(db);
      batch.set(publicProfileRef, buildPublicShowcasePayload(profile), { merge: true });
      batch.set(privateRef, buildPrivatePayload(profile), { merge: true });
      await batch.commit().catch(() => {});
      return;
    }

    const batch = writeBatch(db);
    batch.set(publicProfileRef, buildPublicShowcasePayload(profile), { merge: true });
    batch.set(privateRef, buildPrivatePayload(profile), { merge: true });
    await batch.commit().catch(() => {});

    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      const payload = stripUndefined({
        ...profile,
        updatedAt: now,
      });
      await updateDoc(userRef, payload);
    } else {
      const initialCredits =
        typeof profile.credits === 'number' ? profile.credits : INITIAL_WELCOME_CREDITS;
      const payload = stripUndefined({
        uid,
        createdAt: now,
        updatedAt: now,
        credits: initialCredits,
        ...profile,
      });
      await setDoc(userRef, payload);

      const welcomeTxRef = doc(db, 'credit_transactions', `tx_welcome_${uid}`);
      await setDoc(welcomeTxRef, {
        id: `tx_welcome_${uid}`,
        userId: uid,
        orderId: 'welcome_bonus',
        type: 'bonus',
        amount: initialCredits,
        balanceAfter: initialCredits,
        description: `Bônus de boas-vindas no 1º cadastro (+${initialCredits} créditos gratuitos)`,
        createdAt: now,
      }).catch(() => {});

      await fetch('/api/users/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, credits: initialCredits }),
      }).catch(() => {});
    }
  } catch (error: any) {
    if (error instanceof Error && error.message.startsWith('DOCUMENT_DUPLICATE:')) {
      throw new Error(error.message.replace('DOCUMENT_DUPLICATE: ', ''));
    }
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

/**
 * Gera o currículo profissional em PDF debitando 15 créditos de forma segura e idempotente.
 * A validação e geração ocorrem no backend (/api/resumes/generate) e sincronizam com o Firestore.
 */
export async function generateResumeWithCredits(
  user: UserProfile,
  options: {
    templateId: ResumeTemplateId;
    includeCpfInPdf: boolean;
    idempotencyKey: string;
  }
): Promise<{
  success: boolean;
  alreadyProcessed: boolean;
  resumeId: string;
  fileName: string;
  pdfDataUrl: string;
  downloadUrl: string;
  creditsDebited: number;
  newBalance: number;
  transaction?: CreditTransaction;
}> {
  const structuredResume = buildStructuredResumeFromProfile(user, {
    templateId: options.templateId,
    includeCpfInPdf: options.includeCpfInPdf,
  });

  const currentCredits = Number(user.credits ?? 0);
  if (currentCredits < RESUME_GENERATION_COST) {
    throw new Error(
      `Saldo insuficiente. A geração do currículo custa ${RESUME_GENERATION_COST} créditos e seu saldo atual é de ${currentCredits} créditos.`
    );
  }

  let data: any = {};
  try {
    const res = await fetch('/api/resumes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.uid,
        userEmail: user.email,
        currentClientCredits: currentCredits,
        idempotencyKey: options.idempotencyKey,
        templateId: options.templateId,
        includeCpfInPdf: options.includeCpfInPdf,
        resumePayload: structuredResume,
      }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.error ||
            'Não foi possível gerar o currículo no momento. Nenhum crédito foi debitado.'
        );
      }
    }
  } catch (err: any) {
    if (err.message?.includes('Saldo insuficiente') || err.message?.includes('Não foi possível')) {
      throw err;
    }
  }

  // Fallback cliente (hospedagem estática / Netlify CDN) caso o servidor Node não tenha respondido com o PDF
  if (!data.pdfDataUrl) {
    const generatedPdf = generateSelectableResumePdfDataUrl(structuredResume);
    data = {
      resumeId: `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: generatedPdf.fileName,
      pdfDataUrl: generatedPdf.dataUrl,
      downloadUrl: generatedPdf.dataUrl,
      creditsDebited: RESUME_GENERATION_COST,
      newBalance: Math.max(0, currentCredits - RESUME_GENERATION_COST),
    };
  }

  const resumeId: string = data.resumeId;
  const txId = `tx_resume_${options.idempotencyKey}`;
  const now = new Date().toISOString();

  // Sincroniza de forma idempotente no Firestore para manter saldo e histórico 100% consistentes
  const activeResumeUid = auth.currentUser?.uid || getActiveSessionUid();
  if (activeResumeUid && activeResumeUid === user.uid) {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const txRef = doc(db, 'credit_transactions', txId);
        const genRef = doc(db, 'generated_resumes', resumeId);

        const [userSnap, txSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(txRef),
        ]);

        // Se a transação de geração já foi gravada no Firestore, não debita novamente
        if (txSnap.exists()) {
          return;
        }

        const dbCredits = userSnap.exists()
          ? (userSnap.data().credits ?? user.credits ?? 0)
          : (user.credits ?? 0);

        const updatedBalance =
          typeof data.newBalance === 'number'
            ? data.newBalance
            : Math.max(0, dbCredits - RESUME_GENERATION_COST);

        const txRecord: CreditTransaction = {
          id: txId,
          userId: user.uid,
          orderId: resumeId,
          type: 'usage',
          amount: -RESUME_GENERATION_COST,
          balanceAfter: updatedBalance,
          description: `Geração de Currículo Profissional ATS (${options.templateId}) (-${RESUME_GENERATION_COST} créditos)`,
          createdAt: now,
        };

        const genRecord: GeneratedResumeRecord = {
          id: resumeId,
          userId: user.uid,
          templateId: options.templateId,
          fileName: data.fileName,
          downloadUrl: data.downloadUrl,
          creditsCharged: RESUME_GENERATION_COST,
          transactionId: txId,
          createdAt: now,
        };

        if (userSnap.exists()) {
          transaction.update(userRef, {
            credits: updatedBalance,
            updatedAt: now,
          });
        }
        transaction.set(txRef, txRecord);
        transaction.set(genRef, genRecord);
      });
    } catch {
      // O servidor já registrou a transação e o saldo autoritativo
    }
  }

  return {
    success: true,
    alreadyProcessed: Boolean(data.alreadyProcessed),
    resumeId: data.resumeId,
    fileName: data.fileName,
    pdfDataUrl: data.pdfDataUrl,
    downloadUrl: data.downloadUrl,
    creditsDebited: data.creditsDebited ?? RESUME_GENERATION_COST,
    newBalance: data.newBalance,
    transaction: data.transaction,
  };
}

export type CreditActionType = 'apply_job' | 'post_job' | 'boost_job' | 'generate_resume';

const CLIENT_ACTION_COSTS: Record<CreditActionType, { cost: number; label: string }> = {
  apply_job: { cost: 10, label: 'Candidatura a vaga de emprego' },
  post_job: { cost: 10, label: 'Publicação de nova vaga' },
  boost_job: { cost: 15, label: 'Destaque / Impulsionamento de vaga' },
  generate_resume: { cost: 15, label: 'Geração de Currículo em PDF Padrão ATS' },
};

/**
 * Valida o saldo de créditos antes da ação e debita atomicamente no servidor e no Firestore.
 * Caso o usuário não possua créditos suficientes, bloqueia a ação imediatamente lançando erro estruturado.
 */
export async function consumeUserCredits(
  user: UserProfile,
  options: {
    actionType?: CreditActionType;
    action?: CreditActionType;
    referenceId?: string;
    targetId?: string;
    description?: string;
    idempotencyKey?: string;
  }
): Promise<{
  success: boolean;
  creditsDebited: number;
  newBalance: number;
  transaction?: CreditTransaction;
}> {
  const resolvedAction = (options.actionType || options.action || 'apply_job') as CreditActionType;
  const resolvedRefId = options.referenceId || options.targetId;
  const actionMeta = CLIENT_ACTION_COSTS[resolvedAction];
  const currentCredits = Number(user.credits ?? 0);

  if (currentCredits < actionMeta.cost) {
    const err: any = new Error(
      `Saldo insuficiente. Esta ação (${actionMeta.label}) exige ${actionMeta.cost} créditos e você possui ${currentCredits} créditos.`
    );
    err.code = 'INSUFFICIENT_CREDITS';
    err.requiredCredits = actionMeta.cost;
    err.currentCredits = currentCredits;
    throw err;
  }

  let data: any = {};
  try {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => '') : '';
    const res = await fetch('/api/credits/consume', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify({
        userId: user.uid,
        actionType: resolvedAction,
        action: resolvedAction,
        currentClientCredits: currentCredits,
        referenceId: resolvedRefId,
        targetId: resolvedRefId,
        description: options.description,
        idempotencyKey: options.idempotencyKey,
      }),
    });

    const isJson = res.headers.get('content-type')?.includes('application/json');
    if (isJson) {
      data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(
          data.error || `Saldo insuficiente para ${actionMeta.label} (${actionMeta.cost} créditos).`
        );
        err.code = data.code || 'INSUFFICIENT_CREDITS';
        err.requiredCredits = data.requiredCredits ?? actionMeta.cost;
        err.currentCredits = data.currentCredits ?? currentCredits;
        throw err;
      }
    }
  } catch (err: any) {
    if (err.code === 'INSUFFICIENT_CREDITS') {
      throw err;
    }
  }

  const newBalance: number =
    typeof data.newBalance === 'number'
      ? data.newBalance
      : Math.max(0, currentCredits - actionMeta.cost);

  const txId: string =
    data.transaction?.id ||
    `tx_${resolvedAction}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const txRecord: CreditTransaction = {
    id: txId,
    userId: user.uid,
    orderId: resolvedRefId || resolvedAction,
    type: 'usage',
    amount: -actionMeta.cost,
    balanceAfter: newBalance,
    description:
      options.description || `${actionMeta.label} (-${actionMeta.cost} créditos)`,
    createdAt: now,
  };

  try {
    const rawLocal = localStorage.getItem('pruden_credit_tx_v1');
    const parsedLocal: CreditTransaction[] = rawLocal ? JSON.parse(rawLocal) : [];
    const updatedLocal = [
      txRecord,
      ...(Array.isArray(parsedLocal) ? parsedLocal.filter((t) => t.id !== txId) : []),
    ].slice(0, 100);
    localStorage.setItem('pruden_credit_tx_v1', JSON.stringify(updatedLocal));
  } catch {
    // Ignore localStorage quota error
  }

  // Sincroniza no Firestore quando autenticado
  const activeConsumeUid = auth.currentUser?.uid || getActiveSessionUid();
  if (activeConsumeUid && activeConsumeUid === user.uid) {
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const txRef = doc(db, 'credit_transactions', txId);
        const [userSnap, txSnap] = await Promise.all([
          transaction.get(userRef),
          transaction.get(txRef),
        ]);

        if (txSnap.exists()) return;

        if (userSnap.exists()) {
          transaction.update(userRef, {
            credits: newBalance,
            updatedAt: now,
          });
        }
        transaction.set(txRef, txRecord);
      });
    } catch {
      // Servidor já atualizou o saldo autoritativo
    }
  }

  return {
    success: true,
    creditsDebited: actionMeta.cost,
    newBalance,
    transaction: data.transaction || txRecord,
  };
}

export async function checkIsAdmin(uid: string, email?: string | null): Promise<boolean> {
  if (email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    try {
      await setDoc(
        doc(db, 'admins', uid),
        {
          uid,
          email: email.toLowerCase(),
          grantedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {
      // Ignore if offline or already exists
    }
    return true;
  }
  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch {
    return false;
  }
}

export async function getAllUsersForAdmin(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users: UserProfile[] = [];
    snap.forEach((d) => users.push(d.data() as UserProfile));
    return users;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function deleteUserByAdmin(uid: string): Promise<void> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const data = userSnap.data() as UserProfile;
      const rawDoc = data.cpf || data.cnpj || data.documentNumber;
      const docType = data.documentType || (data.cnpj ? 'CNPJ' : 'CPF');
      if (rawDoc && docType) {
        const docKey = getDocumentRegistryKey(docType, rawDoc);
        await deleteDoc(doc(db, 'document_registry', docKey)).catch(() => {});
        await fetch('/api/users/release-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid, documentType: docType, document: rawDoc }),
        }).catch(() => {});
      }
    }
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}`);
  }
}

export async function clearAllDatabaseData(keepAdminUid?: string): Promise<{
  jobsDeleted: number;
  applicationsDeleted: number;
  reportsDeleted: number;
  usersDeleted: number;
}> {
  let jobsDeleted = 0;
  let applicationsDeleted = 0;
  let reportsDeleted = 0;
  let usersDeleted = 0;

  const jobsSnap = await getDocs(collection(db, 'jobs'));
  for (const d of jobsSnap.docs) {
    await deleteDoc(doc(db, 'jobs', d.id));
    jobsDeleted++;
  }

  const appsSnap = await getDocs(collection(db, 'applications'));
  for (const d of appsSnap.docs) {
    await deleteDoc(doc(db, 'applications', d.id));
    applicationsDeleted++;
  }

  const reportsSnap = await getDocs(collection(db, 'reports'));
  for (const d of reportsSnap.docs) {
    await deleteDoc(doc(db, 'reports', d.id));
    reportsDeleted++;
  }

  const docsRegSnap = await getDocs(collection(db, 'document_registry')).catch(() => null);
  if (docsRegSnap) {
    for (const d of docsRegSnap.docs) {
      if (keepAdminUid && d.data().uid === keepAdminUid) continue;
      await deleteDoc(doc(db, 'document_registry', d.id)).catch(() => {});
    }
  }

  const usersSnap = await getDocs(collection(db, 'users'));
  for (const d of usersSnap.docs) {
    if (keepAdminUid && d.id === keepAdminUid) continue;
    await deleteDoc(doc(db, 'users', d.id));
    usersDeleted++;
  }

  await fetch('/api/users/clear-registry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keepAdminUid }),
  }).catch(() => {});

  return { jobsDeleted, applicationsDeleted, reportsDeleted, usersDeleted };
}

export async function completeUserOnboarding(payload: {
  uid?: string;
  email?: string;
  role: 'candidate' | 'company';
  document: string;
  name: string;
  phone: string;
  city: string;
  lgpdAccepted?: boolean;
  razaoSocial?: string;
  nomeFantasia?: string;
  cep?: string;
  fiscalAddress?: {
    cep?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };
}): Promise<{
  success: boolean;
  credits?: number;
  role?: 'candidate' | 'company';
  isVerifiedCompany?: boolean;
  welcomeCreditsGranted?: boolean;
  profile: UserProfile;
}> {
  const currentUser = auth.currentUser;
  const uid = payload.uid || currentUser?.uid || getActiveSessionUid();
  if (!uid) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const token = currentUser ? await currentUser.getIdToken().catch(() => '') : '';
  const response = await fetch('/api/auth/complete-onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      uid,
      email: payload.email || currentUser?.email || '',
      ...payload,
      lgpdAccepted: payload.lgpdAccepted ?? true,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Não foi possível validar o documento.');
  }

  const cleanDoc = payload.document.replace(/\D/g, '');
  const now = new Date().toISOString();
  const profileData: UserProfile = {
    uid,
    email: payload.email || currentUser?.email || '',
    name: payload.name,
    type: payload.role,
    role: payload.role,
    phone: payload.phone,
    city: payload.city || 'Presidente Prudente, SP',
    cep: payload.fiscalAddress?.cep || payload.cep || '19010-000',
    street: payload.fiscalAddress?.street,
    addressNumber: payload.fiscalAddress?.number,
    neighborhood: payload.fiscalAddress?.neighborhood,
    cpf: payload.role === 'candidate' ? cleanDoc : undefined,
    cnpj: payload.role === 'company' ? cleanDoc : undefined,
    documentType: payload.role === 'company' ? 'CNPJ' : 'CPF',
    documentNumber: cleanDoc,
    companyName: payload.nomeFantasia || payload.razaoSocial || payload.name,
    razaoSocial: payload.razaoSocial,
    nomeFantasia: payload.nomeFantasia,
    cnpjVerified: payload.role === 'company',
    isVerifiedCompany: payload.role === 'company',
    onboardingCompleted: true,
    lgpdConsent: true,
    lgpdConsentAt: now,
    welcomeCreditsGranted: true,
    credits: data.credits ?? 30,
    plan: 'free',
    updatedAt: now,
  };

  await saveUserProfile(uid, profileData);

  return {
    ...data,
    success: true,
    welcomeCreditsGranted: data.welcomeCreditsGranted ?? true,
    profile: profileData,
  };
}

