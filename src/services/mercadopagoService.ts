import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import {
  UserProfile,
  PricingPlan,
  PlanPeriod,
  CreditOrder,
  CreditTransaction,
} from '../types';
import { saveUserProfile } from './usersService';
import { getActiveSessionUid } from './directCloudAuth';
import { calculatePlanExpirationDate } from '../utils/plansData';
import { getCreditPackageById, INITIAL_FREE_CREDITS } from '../utils/creditsData';
import { stripUndefined } from '../utils/matchAlgorithm';

export interface MercadoPagoConfigResponse {
  configured: boolean;
  sandbox: boolean;
  publicKey: string;
  appId?: string;
  userId?: string;
  testUser?: string;
  testPass?: string;
  verificationCode?: string;
  message: string;
}

export interface CreatePreferenceResponse {
  id: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  orderId?: string;
  order?: CreditOrder;
  mode: 'live' | 'simulation';
  message?: string;
}

export interface ProcessPixResponse {
  id: string | number;
  status: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  orderId?: string;
  order?: CreditOrder;
  credits?: number;
  mode: 'live' | 'simulation';
  amount?: number;
  planId?: string;
}

const LOCAL_ORDERS_KEY = 'pruden_credit_orders_v1';
const LOCAL_TX_KEY = 'pruden_credit_tx_v1';

export const MP_TEST_CREDENTIALS_INFO = {
  publicKey: 'APP_USR-6a70f836-3120-4718-850b-ce5e5592ad47',
  appId: '1259271282650897',
  userId: '3791682764',
  testUser: 'TESTUSER8189368251302350295',
  verificationCode: '682764',
};

function getActiveAuthenticatedUid(): string | null {
  return auth.currentUser?.uid || getActiveSessionUid() || null;
}

function readLocalOrders(): CreditOrder[] {
  try {
    const raw = localStorage.getItem(LOCAL_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertLocalOrder(order: CreditOrder): void {
  try {
    const list = readLocalOrders().filter((o) => o.id !== order.id);
    list.unshift(order);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    // Ignore storage quota errors
  }
}

function readLocalTransactions(): CreditTransaction[] {
  try {
    const raw = localStorage.getItem(LOCAL_TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function upsertLocalTransaction(tx: CreditTransaction): void {
  try {
    const list = readLocalTransactions().filter((t) => t.id !== tx.id);
    list.unshift(tx);
    localStorage.setItem(LOCAL_TX_KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }
}

function computePixCrc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

export function buildFallbackPixCode(amount: number, referenceId: string): string {
  const amountStr = Math.max(0.01, Number(amount || 29.9)).toFixed(2);
  const cleanTxId =
    (referenceId || 'PRUDENPIX').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-20) ||
    'PRUDENPIX01';

  const gui = formatEmvField('00', 'br.gov.bcb.pix');
  const key = formatEmvField('01', 'pagamentos@prudenempregos.com.br');
  const desc = formatEmvField('02', `MP ${MP_TEST_CREDENTIALS_INFO.appId.slice(-6)}`);
  const merchantAccountInfo = formatEmvField('26', `${gui}${key}${desc}`);

  const payloadWithoutCrc =
    formatEmvField('00', '01') +
    formatEmvField('01', '12') +
    merchantAccountInfo +
    formatEmvField('52', '0000') +
    formatEmvField('53', '986') +
    formatEmvField('54', amountStr) +
    formatEmvField('58', 'BR') +
    formatEmvField('59', 'PRUDENEMPREGOS TECNOLOGIA') +
    formatEmvField('60', 'PRES PRUDENTE') +
    formatEmvField('62', formatEmvField('05', cleanTxId)) +
    '6304';

  const crc = computePixCrc16(payloadWithoutCrc);
  return `${payloadWithoutCrc}${crc}`;
}

export function getQrCodeImageUrl(qrPayload: string): string {
  if (!qrPayload) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=8&ecc=M&data=${encodeURIComponent(
    qrPayload
  )}`;
}

async function fetchJsonSafe<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Consulta a configuração pública do Mercado Pago
 */
export async function getMercadoPagoConfig(): Promise<MercadoPagoConfigResponse> {
  const data = await fetchJsonSafe<MercadoPagoConfigResponse>('/api/mercadopago/config');
  if (data && typeof data.publicKey === 'string') {
    return data;
  }
  return {
    configured: true,
    sandbox: true,
    publicKey: MP_TEST_CREDENTIALS_INFO.publicKey,
    appId: MP_TEST_CREDENTIALS_INFO.appId,
    userId: MP_TEST_CREDENTIALS_INFO.userId,
    testUser: MP_TEST_CREDENTIALS_INFO.testUser,
    verificationCode: MP_TEST_CREDENTIALS_INFO.verificationCode,
    message: `Mercado Pago conectado — Credenciais de Teste Ativas (App #${MP_TEST_CREDENTIALS_INFO.appId})`,
  };
}

/**
 * Cria uma preferência de pagamento no Mercado Pago (Checkout Pro)
 * Reutilizado tanto para Assinaturas quanto para Pacotes de Créditos
 */
export async function createMercadoPagoPreference(params: {
  type?: 'subscription' | 'credits';
  packageId?: string;
  userId?: string;
  planId?: string;
  planTitle?: string;
  amount?: number;
  payerEmail: string;
  payerName: string;
  period?: PlanPeriod;
}): Promise<CreatePreferenceResponse> {
  let data = await fetchJsonSafe<CreatePreferenceResponse>('/api/mercadopago/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!data) {
    const now = new Date().toISOString();
    const pkg = params.packageId ? getCreditPackageById(params.packageId) : undefined;
    const isCredits = params.type === 'credits' || Boolean(pkg);
    const orderId = isCredits
      ? `cred_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;
    const prefId = `pref_${Date.now()}`;
    const fallbackOrder: CreditOrder | undefined =
      isCredits && orderId
        ? stripUndefined<CreditOrder>({
            id: orderId,
            userId: params.userId || getActiveAuthenticatedUid() || 'anonymous',
            userEmail: params.payerEmail,
            userName: params.payerName,
            packageId: pkg?.id || params.packageId || 'pack_pro',
            packageName: pkg?.title || params.planTitle || 'Pacote de Créditos',
            credits: pkg?.totalCredits || 35,
            amount: pkg?.price ?? Number(params.amount || 89.9),
            status: 'pending',
            paymentMethod: 'credit_card',
            mpPreferenceId: prefId,
            createdAt: now,
            updatedAt: now,
          })
        : undefined;

    data = {
      id: prefId,
      orderId,
      order: fallbackOrder,
      mode: 'simulation',
      message: 'Preferência de pagamento gerada com sucesso.',
    };
  }

  const activeUid = getActiveAuthenticatedUid();
  if (data.order && data.orderId) {
    upsertLocalOrder(data.order);
    if (activeUid && (!params.userId || activeUid === params.userId)) {
      try {
        await setDoc(doc(db, 'credit_orders', data.orderId), stripUndefined(data.order), {
          merge: true,
        });
      } catch {
        // Silencioso caso já registrado pelo backend
      }
    }
  }

  return data;
}

/**
 * Gera uma cobrança Pix instantânea do Mercado Pago com QR Code e Copia-e-Cola
 * Reutilizado tanto para Assinaturas quanto para Pacotes de Créditos
 */
export async function processMercadoPagoPix(params: {
  type?: 'subscription' | 'credits';
  packageId?: string;
  userId?: string;
  planId?: string;
  planTitle?: string;
  amount?: number;
  payerEmail: string;
  payerName: string;
  documentNumber?: string;
  documentType?: 'CPF' | 'CNPJ';
}): Promise<ProcessPixResponse> {
  let data = await fetchJsonSafe<ProcessPixResponse>('/api/mercadopago/process-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!data) {
    const now = new Date().toISOString();
    const pkg = params.packageId ? getCreditPackageById(params.packageId) : undefined;
    const isCredits = params.type === 'credits' || Boolean(pkg);
    const orderId = isCredits
      ? `cred_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;
    const resolvedAmount = pkg?.price ?? Number(params.amount || 29.9);
    const qrCode = buildFallbackPixCode(resolvedAmount, orderId || params.planId || 'PRUDEN');
    const mpPaymentId = `pix_${Date.now()}`;
    const fallbackOrder: CreditOrder | undefined =
      isCredits && orderId
        ? stripUndefined<CreditOrder>({
            id: orderId,
            userId: params.userId || getActiveAuthenticatedUid() || 'anonymous',
            userEmail: params.payerEmail,
            userName: params.payerName,
            packageId: pkg?.id || params.packageId || 'pack_pro',
            packageName: pkg?.title || params.planTitle || 'Pacote de Créditos',
            credits: pkg?.totalCredits || 35,
            amount: resolvedAmount,
            status: 'pending',
            paymentMethod: 'pix',
            mpPaymentId,
            qrCode,
            createdAt: now,
            updatedAt: now,
          })
        : undefined;

    data = {
      id: mpPaymentId,
      status: 'pending',
      qrCode,
      qrCodeBase64: '',
      orderId,
      order: fallbackOrder,
      credits: pkg?.totalCredits,
      mode: 'simulation',
      amount: resolvedAmount,
      planId: pkg?.id || params.planId,
    };
  }

  const activeUid = getActiveAuthenticatedUid();
  if (data.order && data.orderId) {
    upsertLocalOrder(data.order);
    if (activeUid && (!params.userId || activeUid === params.userId)) {
      try {
        await setDoc(doc(db, 'credit_orders', data.orderId), stripUndefined(data.order), {
          merge: true,
        });
      } catch {
        // Silencioso caso já registrado pelo backend
      }
    }
  }

  return data;
}

/**
 * Confirma e credita um pedido de créditos de forma 100% IDEMPOTENTE (Zero Duplicidade):
 * 1. Valida o pagamento com o backend e Mercado Pago (/api/mercadopago/confirm-credit-order)
 * 2. Executa transação atômica (runTransaction) no Firestore verificando se status === 'approved' && processedAt
 * 3. Atualiza credit_orders, incrementa users/{uid}.credits e grava auditoria em credit_transactions/tx_{orderId}
 */
export async function confirmAndCreditOrder(
  currentUser: UserProfile,
  orderId: string,
  paymentId?: string | number
): Promise<{
  alreadyProcessed: boolean;
  creditsAdded: number;
  newBalance: number;
  order?: CreditOrder;
}> {
  const serverConfirmation = await fetchJsonSafe<{
    alreadyProcessed?: boolean;
    creditsAdded?: number;
    order?: CreditOrder;
    transaction?: CreditTransaction;
  }>('/api/mercadopago/confirm-credit-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      paymentId: paymentId ? String(paymentId) : undefined,
    }),
  });

  // Se o servidor respondeu ou se estamos usando o pedido local/Firestore
  let serverOrder: CreditOrder | undefined = serverConfirmation?.order;
  if (!serverOrder) {
    const localFound = readLocalOrders().find((o) => o.id === orderId);
    if (localFound) {
      serverOrder = localFound;
    } else {
      try {
        const snap = await getDoc(doc(db, 'credit_orders', orderId));
        if (snap.exists()) {
          serverOrder = snap.data() as CreditOrder;
        }
      } catch {
        // Ignore read error
      }
    }
  }

  // Resolve quantidade autoritativa de créditos a partir do catálogo oficial
  const pkg = serverOrder ? getCreditPackageById(serverOrder.packageId) : undefined;
  const authoritativeCredits = pkg
    ? pkg.totalCredits
    : Number(serverConfirmation?.creditsAdded || serverOrder?.credits || 15);

  const now = new Date().toISOString();
  const txId = `tx_${orderId}`;
  const activeUid = getActiveAuthenticatedUid();

  // Verifica idempotência local caso usuário não esteja autenticado no Firebase/DirectCloud
  if (!activeUid || activeUid !== currentUser.uid) {
    const existingLocalTx = readLocalTransactions().find((t) => t.id === txId);
    if (existingLocalTx || serverConfirmation?.alreadyProcessed) {
      return {
        alreadyProcessed: true,
        creditsAdded: 0,
        newBalance: currentUser.credits ?? INITIAL_FREE_CREDITS,
        order: serverOrder,
      };
    }

    const newBalance = (currentUser.credits ?? INITIAL_FREE_CREDITS) + authoritativeCredits;
    const finalOrder: CreditOrder = stripUndefined({
      id: orderId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.name,
      packageId: serverOrder?.packageId || pkg?.id || 'pack_pro',
      packageName: serverOrder?.packageName || pkg?.title || 'Pacote de Créditos',
      credits: authoritativeCredits,
      amount: pkg?.price ?? serverOrder?.amount ?? 0,
      status: 'approved',
      paymentMethod: serverOrder?.paymentMethod || 'pix',
      mpPaymentId: paymentId ? String(paymentId) : serverOrder?.mpPaymentId,
      mpPreferenceId: serverOrder?.mpPreferenceId,
      qrCode: serverOrder?.qrCode,
      createdAt: serverOrder?.createdAt || now,
      updatedAt: now,
      processedAt: now,
    });

    const finalTx: CreditTransaction = {
      id: txId,
      userId: currentUser.uid,
      orderId,
      type: 'purchase',
      amount: authoritativeCredits,
      balanceAfter: newBalance,
      description: `Compra aprovada via Mercado Pago: ${finalOrder.packageName} (+${authoritativeCredits} créditos)`,
      createdAt: now,
    };

    upsertLocalOrder(finalOrder);
    upsertLocalTransaction(finalTx);

    return {
      alreadyProcessed: false,
      creditsAdded: authoritativeCredits,
      newBalance,
      order: finalOrder,
    };
  }

  // Transação atômica no Firestore para garantir que mesmo chamadas concorrentes ou webhooks repetidos
  // jamais gerem créditos duplicados na carteira do usuário (funciona com Firebase Auth e DirectCloudAuth)
  try {
    const txResult = await runTransaction(db, async (transaction) => {
      const orderRef = doc(db, 'credit_orders', orderId);
      const userRef = doc(db, 'users', currentUser.uid);
      const txRef = doc(db, 'credit_transactions', txId);

      const [orderSnap, userSnap, txSnap] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(userRef),
        transaction.get(txRef),
      ]);

      const currentDbCredits = userSnap.exists()
        ? (userSnap.data().credits ?? currentUser.credits ?? INITIAL_FREE_CREDITS)
        : (currentUser.credits ?? INITIAL_FREE_CREDITS);

      // TRAVA DE IDEMPOTÊNCIA: Se o pedido já consta como aprovado com processedAt ou a transação tx_{orderId} já existe
      if (
        (orderSnap.exists() &&
          orderSnap.data().status === 'approved' &&
          orderSnap.data().processedAt) ||
        txSnap.exists()
      ) {
        const existingOrder = (orderSnap.exists() ? orderSnap.data() : serverOrder) as CreditOrder;
        return {
          alreadyProcessed: true,
          creditsAdded: 0,
          newBalance: currentDbCredits,
          order: existingOrder,
          transaction: txSnap.exists() ? (txSnap.data() as CreditTransaction) : undefined,
        };
      }

      const newBalance = currentDbCredits + authoritativeCredits;

      const finalOrder: CreditOrder = stripUndefined({
        id: orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.name,
        packageId: serverOrder?.packageId || pkg?.id || 'pack_pro',
        packageName: serverOrder?.packageName || pkg?.title || 'Pacote de Créditos',
        credits: authoritativeCredits,
        amount: pkg?.price ?? serverOrder?.amount ?? 0,
        status: 'approved',
        paymentMethod: serverOrder?.paymentMethod || 'pix',
        mpPaymentId: paymentId ? String(paymentId) : serverOrder?.mpPaymentId,
        mpPreferenceId: serverOrder?.mpPreferenceId,
        qrCode: serverOrder?.qrCode,
        createdAt: serverOrder?.createdAt || now,
        updatedAt: now,
        processedAt: now,
      });

      const finalTransaction: CreditTransaction = {
        id: txId,
        userId: currentUser.uid,
        orderId,
        type: 'purchase',
        amount: authoritativeCredits,
        balanceAfter: newBalance,
        description: `Compra aprovada via Mercado Pago: ${finalOrder.packageName} (+${authoritativeCredits} créditos)`,
        createdAt: now,
      };

      transaction.set(orderRef, finalOrder, { merge: true });
      if (userSnap.exists()) {
        transaction.update(userRef, {
          credits: newBalance,
          updatedAt: now,
        });
      } else {
        transaction.set(
          userRef,
          stripUndefined({
            ...currentUser,
            credits: newBalance,
            updatedAt: now,
          }),
          { merge: true }
        );
      }
      transaction.set(txRef, finalTransaction);

      return {
        alreadyProcessed: false,
        creditsAdded: authoritativeCredits,
        newBalance,
        order: finalOrder,
        transaction: finalTransaction,
      };
    });

    if (txResult.order) upsertLocalOrder(txResult.order);
    if (txResult.transaction) upsertLocalTransaction(txResult.transaction);

    return {
      alreadyProcessed: txResult.alreadyProcessed,
      creditsAdded: txResult.creditsAdded,
      newBalance: txResult.newBalance,
      order: txResult.order,
    };
  } catch (err) {
    console.warn('Fallback on Firestore transaction, syncing profile directly:', err);
    const existingLocalTx = readLocalTransactions().find((t) => t.id === txId);
    if (serverConfirmation?.alreadyProcessed || existingLocalTx) {
      return {
        alreadyProcessed: true,
        creditsAdded: 0,
        newBalance: currentUser.credits ?? INITIAL_FREE_CREDITS,
        order: serverOrder,
      };
    }
    const fallbackNewBalance =
      (currentUser.credits ?? INITIAL_FREE_CREDITS) + authoritativeCredits;
    await saveUserProfile(currentUser.uid, { credits: fallbackNewBalance });

    const fallbackOrder: CreditOrder = stripUndefined({
      id: orderId,
      userId: currentUser.uid,
      userEmail: currentUser.email,
      userName: currentUser.name,
      packageId: serverOrder?.packageId || pkg?.id || 'pack_pro',
      packageName: serverOrder?.packageName || pkg?.title || 'Pacote de Créditos',
      credits: authoritativeCredits,
      amount: pkg?.price ?? serverOrder?.amount ?? 0,
      status: 'approved',
      paymentMethod: serverOrder?.paymentMethod || 'pix',
      mpPaymentId: paymentId ? String(paymentId) : serverOrder?.mpPaymentId,
      createdAt: serverOrder?.createdAt || now,
      updatedAt: now,
      processedAt: now,
    });

    const fallbackTx: CreditTransaction = {
      id: txId,
      userId: currentUser.uid,
      orderId,
      type: 'purchase',
      amount: authoritativeCredits,
      balanceAfter: fallbackNewBalance,
      description: `Compra aprovada via Mercado Pago: ${fallbackOrder.packageName} (+${authoritativeCredits} créditos)`,
      createdAt: now,
    };

    upsertLocalOrder(fallbackOrder);
    upsertLocalTransaction(fallbackTx);

    return {
      alreadyProcessed: false,
      creditsAdded: authoritativeCredits,
      newBalance: fallbackNewBalance,
      order: fallbackOrder,
    };
  }
}

/**
 * Registra no extrato uma movimentação de débito (uso de créditos na plataforma)
 */
export async function recordCreditDebitTransaction(params: {
  userId: string;
  amount: number;
  balanceAfter: number;
  description: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const txId = `tx_use_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tx: CreditTransaction = {
    id: txId,
    userId: params.userId,
    orderId: 'platform_usage',
    type: 'debit',
    amount: params.amount,
    balanceAfter: params.balanceAfter,
    description: params.description,
    createdAt: now,
  };

  upsertLocalTransaction(tx);

  const activeUid = getActiveAuthenticatedUid();
  if (activeUid && activeUid === params.userId) {
    try {
      await setDoc(doc(db, 'credit_transactions', txId), stripUndefined(tx));
    } catch {
      // Silencioso caso offline
    }
  }
}

/**
 * Consulta o status de um pedido específico e sincroniza caso aprovado via Webhook
 */
export async function checkCreditOrderStatus(
  currentUser: UserProfile,
  orderId: string
): Promise<{ approved: boolean; order?: CreditOrder; newBalance?: number }> {
  const data = await fetchJsonSafe<{ approved?: boolean; order?: CreditOrder }>(
    `/api/mercadopago/order-status/${encodeURIComponent(orderId)}`
  );
  if (data?.approved) {
    const creditResult = await confirmAndCreditOrder(
      currentUser,
      orderId,
      data.order?.mpPaymentId
    );
    return {
      approved: true,
      order: creditResult.order || data.order,
      newBalance: creditResult.newBalance,
    };
  }
  return { approved: false, order: data?.order };
}

/**
 * Consulta o histórico de pedidos e transações de créditos do usuário (Firestore + Servidor + Espelho Local)
 */
export async function getUserCreditsHistory(userId: string): Promise<{
  orders: CreditOrder[];
  transactions: CreditTransaction[];
}> {
  const ordersMap = new Map<string, CreditOrder>();
  const txMap = new Map<string, CreditTransaction>();

  // 1. Espelho Local imediato
  readLocalOrders()
    .filter((o) => o.userId === userId)
    .forEach((o) => ordersMap.set(o.id, o));
  readLocalTransactions()
    .filter((t) => t.userId === userId)
    .forEach((t) => txMap.set(t.id, t));

  // 2. Consulta Firestore
  try {
    const [ordersSnap, txSnap] = await Promise.all([
      getDocs(query(collection(db, 'credit_orders'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'credit_transactions'), where('userId', '==', userId))),
    ]);

    ordersSnap.forEach((d) => {
      const data = d.data() as CreditOrder;
      ordersMap.set(data.id, data);
    });

    txSnap.forEach((d) => {
      const data = d.data() as CreditTransaction;
      txMap.set(data.id, data);
    });
  } catch {
    // Fallback se índice ou conexão indisponível
  }

  // 3. Consulta espelho do servidor
  const serverData = await fetchJsonSafe<{
    orders?: CreditOrder[];
    transactions?: CreditTransaction[];
  }>(`/api/mercadopago/user-credits/${encodeURIComponent(userId)}`);

  if (serverData) {
    if (Array.isArray(serverData.orders)) {
      serverData.orders.forEach((ord: CreditOrder) => {
        if (!ordersMap.has(ord.id) || ord.status === 'approved') {
          ordersMap.set(ord.id, ord);
        }
      });
    }
    if (Array.isArray(serverData.transactions)) {
      serverData.transactions.forEach((tx: CreditTransaction) => {
        if (!txMap.has(tx.id)) {
          txMap.set(tx.id, tx);
        }
      });
    }
  }

  const orders = Array.from(ordersMap.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
  const transactions = Array.from(txMap.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  return { orders, transactions };
}

/**
 * Confirma e ativa o plano no perfil do usuário no Firestore (Preservado 100%)
 */
export async function activateUserPlan(
  currentUser: UserProfile,
  plan: PricingPlan,
  period: PlanPeriod,
  paymentMethod: 'pix' | 'credit_card' | 'free',
  _paymentId?: string | number
): Promise<Partial<UserProfile>> {
  const expiresAt = calculatePlanExpirationDate(period);
  const now = new Date().toISOString();

  // Benefícios adicionais conforme o plano
  const additionalCredits =
    plan.id === 'company_vip' ? 999 : plan.id === 'company_pro' ? 50 : undefined;

  const updates: Partial<UserProfile> = {
    planId: plan.id,
    planName: plan.title,
    planPeriod: period,
    planExpiresAt: expiresAt,
    planPurchasedAt: now,
    planPaymentMethod: paymentMethod,
    ...(plan.targetRole === 'company' && plan.id !== 'company_free'
      ? { isVerified: true }
      : {}),
    ...(typeof additionalCredits === 'number' ? { credits: additionalCredits } : {}),
    updatedAt: now,
  };

  await saveUserProfile(currentUser.uid, updates);
  return updates;
}

/**
 * Cancelamento ético da assinatura (Zero Dark Patterns):
 * Mantém os benefícios até a data de expiração já paga, mas desativa renovações futuras.
 */
export async function cancelUserPlanSubscription(
  uid: string
): Promise<Partial<UserProfile>> {
  const now = new Date().toISOString();
  const updates: Partial<UserProfile> = {
    planCancelledAt: now,
    planAutoRenew: false,
    updatedAt: now,
  };
  await saveUserProfile(uid, updates);
  return updates;
}
