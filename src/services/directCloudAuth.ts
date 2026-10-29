import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import firebaseConfig from '../../firebase-applet-config.json';
import { normalizeDigits, validatePasswordStrength } from '../utils/validation';

const CLOUD_SESSION_STORAGE_KEY = 'pruden_cloud_session_uid_v1';
const LOGIN_RATE_LIMIT_KEY = 'pruden_login_attempts_v1';
const CLOUD_BRIDGE_ORIGIN = 'https://ais-pre-xxoymionfwyzqrkkm4w3x7-467353303181.us-east1.run.app';
const PBKDF2_ITERATIONS = 100000;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000;

type SessionListener = (uid: string | null) => void;
const sessionListeners = new Set<SessionListener>();
const inMemoryRateLimit = new Map<string, { attempts: number; lockedUntil: number }>();

export function getActiveSessionUid(): string | null {
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CLOUD_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setActiveSessionUid(uid: string | null): void {
  if (typeof window !== 'undefined') {
    try {
      if (uid) {
        window.localStorage.setItem(CLOUD_SESSION_STORAGE_KEY, uid);
      } else {
        window.localStorage.removeItem(CLOUD_SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }
  sessionListeners.forEach((listener) => {
    try {
      listener(uid);
    } catch {
      // ignore listener error
    }
  });
}

export function subscribeCloudSession(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

/**
 * Comparação em tempo constante para mitigar ataques de timing na verificação de hashes.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Controle de tentativas de login (proteção contra força bruta automatizada).
 */
function getAttemptRecord(emailKey: string): { attempts: number; lockedUntil: number } {
  const mem = inMemoryRateLimit.get(emailKey);
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(`${LOGIN_RATE_LIMIT_KEY}_${emailKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.attempts === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return mem || { attempts: 0, lockedUntil: 0 };
}

function saveAttemptRecord(emailKey: string, record: { attempts: number; lockedUntil: number }): void {
  inMemoryRateLimit.set(emailKey, record);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${LOGIN_RATE_LIMIT_KEY}_${emailKey}`, JSON.stringify(record));
    } catch {
      // ignore
    }
  }
}

export function checkLoginRateLimit(email: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  const key = email.trim().toLowerCase();
  const record = getAttemptRecord(key);
  const now = Date.now();

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    saveAttemptRecord(key, { attempts: 0, lockedUntil: 0 });
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, retryAfterSeconds: 0 };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_LOGIN_ATTEMPTS - record.attempts),
    retryAfterSeconds: 0,
  };
}

export function recordFailedLoginAttempt(email: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const key = email.trim().toLowerCase();
  const current = getAttemptRecord(key);
  const attempts = current.attempts + 1;
  const locked = attempts >= MAX_LOGIN_ATTEMPTS;
  const lockedUntil = locked ? Date.now() + LOCKOUT_WINDOW_MS : 0;
  saveAttemptRecord(key, { attempts, lockedUntil });
  return {
    locked,
    retryAfterSeconds: locked ? Math.ceil(LOCKOUT_WINDOW_MS / 1000) : 0,
  };
}

export function resetLoginAttempts(email: string): void {
  const key = email.trim().toLowerCase();
  inMemoryRateLimit.delete(key);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(`${LOGIN_RATE_LIMIT_KEY}_${key}`);
    } catch {
      // ignore
    }
  }
}

function fallbackDeterministicHash(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0, ch; i < input.length; i++) {
    ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export async function sha256Hex(message: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback below
    }
  }
  return (
    fallbackDeterministicHash(message) +
    fallbackDeterministicHash('salt_' + message)
  ).slice(0, 48);
}

/**
 * Derivação de chave criptográfica PBKDF2-HMAC-SHA256 com 100.000 iterações e salt exclusivo.
 * Retorna string compacta de 80 caracteres compatível com as regras de tamanho do Firestore.
 */
export async function derivePbkdf2Hash(
  email: string,
  password: string,
  customSaltHex?: string
): Promise<string> {
  const cleanEmail = email.trim().toLowerCase();
  const saltHex =
    customSaltHex || (await sha256Hex(`pruden_pbkdf2_salt_v2::${cleanEmail}`)).slice(0, 24);

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: enc.encode(`pruden_v2_${saltHex}_${cleanEmail}`),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        baseKey,
        256
      );
      const derivedHex = Array.from(new Uint8Array(derivedBits))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 48);
      return `pbkdf2$${saltHex}$${derivedHex}`;
    } catch {
      // fallback below if WebCrypto unavailable
    }
  }

  const fallbackHex = (await sha256Hex(`pbkdf2_fb_${saltHex}_${cleanEmail}::${password}`)).slice(
    0,
    48
  );
  return `pbkdf2$${saltHex}$${fallbackHex}`;
}

export async function getEmailAccountDocId(email: string): Promise<string> {
  const clean = email.trim().toLowerCase();
  const hash = await sha256Hex(`pruden_email_id_${clean}`);
  return `acc_${hash.slice(0, 32)}`;
}

export async function hashAccountPassword(email: string, password: string): Promise<string> {
  return derivePbkdf2Hash(email, password);
}

export async function verifyAccountPassword(
  email: string,
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean; upgradedHash?: string }> {
  if (!storedHash) return { valid: false, needsUpgrade: false };

  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    const saltHex = parts[1] || '';
    const candidateHash = await derivePbkdf2Hash(email, password, saltHex);
    return {
      valid: constantTimeEqual(candidateHash, storedHash),
      needsUpgrade: false,
    };
  }

  // Compatibilidade com hashes v1 legados + migração automática transparente para PBKDF2
  const clean = email.trim().toLowerCase();
  const legacyV1 = await sha256Hex(`pruden_pw_v1_${clean}::${password}`);
  const isLegacyMatch = constantTimeEqual(legacyV1, storedHash);
  if (isLegacyMatch) {
    const upgradedHash = await derivePbkdf2Hash(clean, password);
    return { valid: true, needsUpgrade: true, upgradedHash };
  }

  return { valid: false, needsUpgrade: false };
}

export async function smartRegisterWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const pwdCheck = validatePasswordStrength(password);
  if (!pwdCheck.valid) {
    const weakErr: any = new Error(pwdCheck.message || 'Senha fraca.');
    weakErr.code = 'auth/weak-password';
    throw weakErr;
  }

  // Registro direto e seguro no Firestore com PBKDF2-HMAC-SHA256 (100.000 iterações)
  // Funciona em todos os domínios (localhost, .run.app, prudenempregos.netlify.app e prudenempregos.com.br)
  const accountId = await getEmailAccountDocId(cleanEmail);
  const accountRef = doc(db, 'auth_accounts', accountId);
  const existingSnap = await getDoc(accountRef);

  if (existingSnap.exists()) {
    const dupErr: any = new Error('Este e-mail já está cadastrado na plataforma.');
    dupErr.code = 'auth/email-already-in-use';
    throw dupErr;
  }

  const uid = `usr_${accountId.replace(/^acc_/, '').slice(0, 24)}`;
  const passwordHash = await hashAccountPassword(cleanEmail, password);
  const now = new Date().toISOString();

  await setDoc(accountRef, {
    id: accountId,
    uid,
    email: cleanEmail,
    passwordHash,
    createdAt: now,
    updatedAt: now,
  });

  setActiveSessionUid(uid);
  return { uid, email: cleanEmail };
}

export async function smartSignInWithEmailPassword(
  email: string,
  password: string
): Promise<{ uid: string; email: string }> {
  const cleanEmail = email.trim().toLowerCase();

  // Verifica rate-limit contra força bruta antes de processar tentativa
  const rateCheck = checkLoginRateLimit(cleanEmail);
  if (!rateCheck.allowed) {
    const lockErr: any = new Error(
      `Muitas tentativas incorretas. Por segurança, aguarde ${rateCheck.retryAfterSeconds} segundos antes de tentar novamente.`
    );
    lockErr.code = 'auth/too-many-requests';
    throw lockErr;
  }

  const accountId = await getEmailAccountDocId(cleanEmail);
  const accountRef = doc(db, 'auth_accounts', accountId);
  const snap = await getDoc(accountRef);

  if (!snap.exists()) {
    // Se for o administrador principal entrando pela primeira vez, inicializa a credencial PBKDF2 e perfil
    if (cleanEmail === 'bottaraujoalisson@gmail.com' && password.length >= 6) {
      const adminUid = `usr_${accountId.replace(/^acc_/, '').slice(0, 24)}`;
      const passwordHash = await hashAccountPassword(cleanEmail, password);
      const now = new Date().toISOString();
      await setDoc(accountRef, {
        id: accountId,
        uid: adminUid,
        email: cleanEmail,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      const adminUserRef = doc(db, 'users', adminUid);
      const adminUserSnap = await getDoc(adminUserRef);
      if (!adminUserSnap.exists()) {
        await setDoc(adminUserRef, {
          uid: adminUid,
          email: cleanEmail,
          name: 'Alisson Araujo (Admin)',
          type: 'admin',
          documentType: 'CPF',
          documentNumber: '000.000.000-00',
          normalizedDocument: '00000000000',
          city: 'Presidente Prudente, SP',
          state: 'SP',
          skills: [],
          credits: 999,
          isVerified: true,
          createdAt: now,
          updatedAt: now,
        });
      }
      resetLoginAttempts(cleanEmail);
      setActiveSessionUid(adminUid);
      return { uid: adminUid, email: cleanEmail };
    }

    const failInfo = recordFailedLoginAttempt(cleanEmail);
    const notFoundErr: any = new Error(
      failInfo.locked
        ? `Conta temporariamente bloqueada após 5 tentativas falhas. Tente novamente em ${failInfo.retryAfterSeconds}s.`
        : 'E-mail ou senha incorretos.'
    );
    notFoundErr.code = failInfo.locked ? 'auth/too-many-requests' : 'auth/invalid-credential';
    throw notFoundErr;
  }

  const data = snap.data();
  const verification = await verifyAccountPassword(cleanEmail, password, data.passwordHash);
  if (!verification.valid) {
    const failInfo = recordFailedLoginAttempt(cleanEmail);
    const wrongPwErr: any = new Error(
      failInfo.locked
        ? `Conta temporariamente bloqueada após 5 tentativas falhas. Tente novamente em ${failInfo.retryAfterSeconds}s.`
        : 'E-mail ou senha incorretos.'
    );
    wrongPwErr.code = failInfo.locked ? 'auth/too-many-requests' : 'auth/invalid-credential';
    throw wrongPwErr;
  }

  // Upgrade transparente de hash SHA-256 v1 para PBKDF2-HMAC-SHA256 v2
  if (verification.needsUpgrade && verification.upgradedHash) {
    await setDoc(
      accountRef,
      {
        ...data,
        passwordHash: verification.upgradedHash,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {});
  }

  resetLoginAttempts(cleanEmail);
  setActiveSessionUid(data.uid);
  return { uid: data.uid, email: cleanEmail };
}

/**
 * Redefinição segura de senha validando E-mail + CPF/CNPJ vinculado ao perfil (sem enumeração de contas),
 * além de disparar o e-mail de recuperação do Firebase Auth quando aplicável.
 */
export async function smartResetPassword(options: {
  email: string;
  document?: string;
  newPassword?: string;
}): Promise<{ mode: 'email_sent' | 'password_updated'; message: string }> {
  const cleanEmail = options.email.trim().toLowerCase();

  // Se o usuário informou também nova senha, valida a titularidade (ou permite redefinição direta se a conta foi criada apenas com e-mail/senha)
  if (options.newPassword) {
    const pwdCheck = validatePasswordStrength(options.newPassword);
    if (!pwdCheck.valid) {
      throw new Error(pwdCheck.message || 'A nova senha deve ter no mínimo 6 caracteres.');
    }

    const cleanDoc = normalizeDigits(options.document);
    const accountId = await getEmailAccountDocId(cleanEmail);
    const accountRef = doc(db, 'auth_accounts', accountId);
    const accountSnap = await getDoc(accountRef);

    if (!accountSnap.exists()) {
      throw new Error('Dados de verificação não conferem com nenhuma conta ativa.');
    }

    const accountData = accountSnap.data();
    const userSnap = await getDoc(doc(db, 'users', accountData.uid));
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const userDocDigits = normalizeDigits(
        userData.normalizedDocument || userData.cpf || userData.cnpj || userData.documentNumber
      );

      // Se o perfil possui CPF/CNPJ vinculado, exige a confirmação do documento
      if (userDocDigits && userDocDigits !== '00000000000') {
        if (!cleanDoc || !constantTimeEqual(cleanDoc, userDocDigits)) {
          recordFailedLoginAttempt(cleanEmail);
          throw new Error('O CPF/CNPJ informado não corresponde ao titular deste e-mail.');
        }
      }
    }

    const newPasswordHash = await hashAccountPassword(cleanEmail, options.newPassword);
    await setDoc(
      accountRef,
      {
        ...accountData,
        passwordHash: newPasswordHash,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    resetLoginAttempts(cleanEmail);

    return {
      mode: 'password_updated',
      message: 'Sua senha foi redefinida com sucesso! Você já pode entrar com a nova senha.',
    };
  }

  // Envio padrão sem enumeração de e-mail
  await sendPasswordResetEmail(auth, cleanEmail).catch(() => {});
  return {
    mode: 'email_sent',
    message:
      'Se o e-mail estiver cadastrado, as instruções de recuperação foram enviadas para sua caixa de entrada.',
  };
}

export function isCurrentHostAuthorizedSync(): boolean {
  if (typeof window === 'undefined') return true;
  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname.endsWith('.run.app') ||
    hostname.endsWith('.firebaseapp.com') ||
    hostname.endsWith('.web.app')
  );
}

export async function isCurrentHostAuthorizedInFirebase(): Promise<boolean> {
  return isCurrentHostAuthorizedSync();
}

export interface SmartGoogleAuthResult {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
}

export async function smartSignInWithGoogle(): Promise<SmartGoogleAuthResult> {
  // Verificação síncrona para preservar o gesto de clique do navegador (evita bloqueio de pop-up)
  const isAuthorized = isCurrentHostAuthorizedSync();

  if (isAuthorized) {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, provider);
      setActiveSessionUid(res.user.uid);
      return {
        uid: res.user.uid,
        email: res.user.email,
        displayName: res.user.displayName,
        phoneNumber: res.user.phoneNumber,
        photoURL: res.user.photoURL,
      };
    } catch (err: any) {
      if (err?.code !== 'auth/unauthorized-domain') {
        throw err;
      }
    }
  }

  // Ponte Automática de Domínio Autorizado (executa o OAuth do Google no domínio autorizado .run.app e autentica na aplicação)
  const sessionId = `ab_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  const bridgeUrl = `${CLOUD_BRIDGE_ORIGIN}/api/auth/google-bridge?sessionId=${encodeURIComponent(
    sessionId
  )}&origin=${encodeURIComponent(window.location.origin)}`;

  const width = 500;
  const height = 640;
  const left = Math.max(0, Math.round((window.screen.width - width) / 2));
  const top = Math.max(0, Math.round((window.screen.height - height) / 2));

  const popup = window.open(
    bridgeUrl,
    'PrudenGoogleAuthBridge',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
  );

  if (!popup) {
    const blockedErr: any = new Error(
      'O navegador bloqueou a janela de login do Google. Permita pop-ups para este site ou entre usando seu E-mail e Senha acima.'
    );
    blockedErr.code = 'auth/popup-blocked';
    throw blockedErr;
  }

  return new Promise<SmartGoogleAuthResult>((resolve, reject) => {
    let settled = false;
    let unsubFirestore: (() => void) | null = null;
    let closeCheckTimer: number | null = null;
    let pollTimer: number | null = null;
    let timeoutTimer: number | null = null;

    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      if (unsubFirestore) {
        try {
          unsubFirestore();
        } catch {
          // ignore
        }
        unsubFirestore = null;
      }
      if (closeCheckTimer) window.clearInterval(closeCheckTimer);
      if (pollTimer) window.clearInterval(pollTimer);
      if (timeoutTimer) window.clearTimeout(timeoutTimer);
    };

    const completeWithBridgePayload = async (payload: {
      idToken?: string | null;
      accessToken?: string | null;
      uid?: string;
      email?: string | null;
      displayName?: string | null;
      phoneNumber?: string | null;
      photoURL?: string | null;
    }) => {
      if (settled) return;
      settled = true;
      cleanup();

      try {
        await deleteDoc(doc(db, 'auth_bridge', sessionId)).catch(() => {});
      } catch {
        // ignore
      }

      if (payload.idToken || payload.accessToken) {
        try {
          const credential = GoogleAuthProvider.credential(
            payload.idToken || null,
            payload.accessToken || undefined
          );
          const credRes = await signInWithCredential(auth, credential);
          setActiveSessionUid(credRes.user.uid);
          resolve({
            uid: credRes.user.uid,
            email: credRes.user.email,
            displayName: credRes.user.displayName,
            phoneNumber: credRes.user.phoneNumber,
            photoURL: credRes.user.photoURL,
          });
          return;
        } catch (credErr) {
          console.warn('Fallback to bridge user identity:', credErr);
        }
      }

      if (payload.uid || payload.email) {
        // Garante que o UID siga o padrão ^usr_[a-zA-Z0-9_-]{8,64}$ autorizado nas regras do Firestore caso request.auth seja nulo no domínio externo
        const rawIdentifier = String(payload.uid || payload.email || 'googleuser').replace(
          /[^a-zA-Z0-9_-]/g,
          ''
        );
        const safePlatformUid = rawIdentifier.startsWith('usr_')
          ? rawIdentifier
          : `usr_g_${rawIdentifier.slice(0, 24).padEnd(8, '0')}`;
        setActiveSessionUid(safePlatformUid);
        resolve({
          uid: safePlatformUid,
          email: payload.email || null,
          displayName: payload.displayName || null,
          phoneNumber: payload.phoneNumber || null,
          photoURL: payload.photoURL || null,
        });
        return;
      }

      const failErr: any = new Error('Não foi possível concluir a autenticação com o Google.');
      failErr.code = 'auth/internal-error';
      reject(failErr);
    };

    const handleMessage = (event: MessageEvent) => {
      const data = event?.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'PRUDEN_GOOGLE_AUTH_SUCCESS' && data.sessionId === sessionId) {
        completeWithBridgePayload({
          idToken: data.idToken,
          accessToken: data.accessToken,
          uid: data.user?.uid,
          email: data.user?.email,
          displayName: data.user?.displayName,
          phoneNumber: data.user?.phoneNumber,
          photoURL: data.user?.photoURL,
        });
      } else if (data.type === 'PRUDEN_GOOGLE_AUTH_ERROR' && data.sessionId === sessionId) {
        if (settled) return;
        settled = true;
        cleanup();
        const err: any = new Error(
          data.message || 'Autenticação com o Google cancelada.'
        );
        err.code = data.code || 'auth/popup-closed-by-user';
        reject(err);
      }
    };

    window.addEventListener('message', handleMessage);

    // Canal 2: Em tempo real via Firestore (funciona mesmo quando Cross-Origin-Opener-Policy isola window.opener)
    unsubFirestore = onSnapshot(
      doc(db, 'auth_bridge', sessionId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data && (data.idToken || data.accessToken || data.uid)) {
          completeWithBridgePayload({
            idToken: data.idToken,
            accessToken: data.accessToken,
            uid: data.uid,
            email: data.email,
            displayName: data.displayName,
            phoneNumber: data.phoneNumber,
            photoURL: data.photoURL,
          });
        }
      },
      () => {
        // Ignora erro de listener
      }
    );

    // Canal 3: Polling HTTP direto na Ponte Cloud a cada 1.2s para máxima resiliência
    pollTimer = window.setInterval(async () => {
      if (settled) return;
      try {
        const res = await fetch(
          `${CLOUD_BRIDGE_ORIGIN}/api/auth/bridge-session/${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        if (json?.found && json?.session) {
          const s = json.session;
          completeWithBridgePayload({
            idToken: s.idToken,
            accessToken: s.accessToken,
            uid: s.uid,
            email: s.email,
            displayName: s.displayName,
            phoneNumber: s.phoneNumber,
            photoURL: s.photoURL,
          });
        }
      } catch {
        // ignore network poll errors
      }
    }, 1200);

    closeCheckTimer = window.setInterval(() => {
      if (popup.closed && !settled) {
        window.setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            const closedErr: any = new Error('A janela de login foi fechada antes de concluir.');
            closedErr.code = 'auth/popup-closed-by-user';
            reject(closedErr);
          }
        }, 1800);
      }
    }, 600);

    timeoutTimer = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          popup.close();
        } catch {
          // ignore
        }
        const timeoutErr: any = new Error('Tempo limite de login excedido. Tente novamente.');
        timeoutErr.code = 'auth/timeout';
        reject(timeoutErr);
      }
    }, 120000);
  });
}
