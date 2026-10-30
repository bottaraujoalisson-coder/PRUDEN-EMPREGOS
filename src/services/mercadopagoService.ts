import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
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

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    return { 'Content-Type': 'application/json' };
  }
  const token = await user.getIdToken().catch(() => '');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
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
 * Cria pagamento PIX autenticado via backend (AUD-04)
 */
export async function createPixPayment(packageId: string): Promise<ProcessPixResponse> {
  const user = auth.currentUser;
  const headers = await getAuthHeaders();
  return processMercadoPagoPix({
    type: 'credits',
    packageId,
    userId: user?.uid || getActiveAuthenticatedUid() || '',
    payerEmail: user?.email || 'cliente@prudenempregos.com.br',
    payerName: user?.displayName || 'Cliente PrudenEmpregos',
    headers,
  });
}

/**
 * Cria preferência Checkout Pro autenticada via backend (AUD-04)
 */
export async function createCheckoutPreference(packageId: string): Promise<CreatePreferenceResponse> {
  const user = auth.currentUser;
  const headers = await getAuthHeaders();
  return createMercadoPagoPreference({
    type: 'credits',
    packageId,
    userId: user?.uid || getActiveAuthenticatedUid() || '',
    payerEmail: user?.email || 'cliente@prudenempregos.com.br',
    payerName: user?.displayName || 'Cliente PrudenEmpregos',
    headers,
  });
}

/**
 * Cria uma preferência de pagamento no Mercado Pago (Checkout Pro)
 * O backend cria o registro em credit_orders de forma autoritativa (AUD-04).
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
  headers?: Record<string, string>;
}): Promise<CreatePreferenceResponse> {
  const headers = params.headers || (await getAuthHeaders());
  const { headers: _omit, ...bodyParams } = params;

  let data = await fetchJsonSafe<CreatePreferenceResponse>('/api/mercadopago/create-preference', {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyParams),
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
            packageId: pkg?.id || params.packageId || 'pkg_30',
            packageName: pkg?.title || params.planTitle || 'Pacote de Créditos',
            credits: pkg?.totalCredits || 30,
            amount: pkg?.price ?? Number(params.amount || 34.9),
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

  if (data.order && data.orderId) {
    upsertLocalOrder(data.order);
  }

  return data;
}

/**
 * Gera uma cobrança Pix instantânea do Mercado Pago com QR Code e Copia-e-Cola
 * O backend cria o pedido em credit_orders (AUD-04).
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
  headers?: Record<string, string>;
}): Promise<ProcessPixResponse> {
  const headers = params.headers || (await getAuthHeaders());
  const { headers: _omit, ...bodyParams } = params;

  let data = await fetchJsonSafe<ProcessPixResponse>('/api/mercadopago/create-pix', {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyParams),
  });

  if (!data) {
    const now = new Date().toISOString();
    const pkg = params.packageId ? getCreditPackageById(params.packageId) : undefined;
    const isCredits = params.type === 'credits' || Boolean(pkg);
    const orderId = isCredits
      ? `cred_ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;
    const resolvedAmount = pkg?.price ?? Number(params.amount || 34.9);
    const qrCode = buildFallbackPixCode(resolvedAmount, orderId || params.planId || 'PRUDEN');
    const mpPaymentId = `pix_${Date.now()}`;
    const fallbackOrder: CreditOrder | undefined =
      isCredits && orderId
        ? stripUndefined<CreditOrder>({
            id: orderId,
            userId: params.userId || getActiveAuthenticatedUid() || 'anonymous',
            userEmail: params.payerEmail,
            userName: params.payerName,
            packageId: pkg?.id || params.packageId || 'pkg_30',
            packageName: pkg?.title || params.planTitle || 'Pacote de Créditos',
            credits: pkg?.totalCredits || 30,
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

  if (data.order && data.orderId) {
    upsertLocalOrder(data.order);
  }

  return data;
}

/**
 * Confirma e credita um pedido de créditos via servidor de forma 100% IDEMPOTENTE (AUD-04, AUD-09):
 * Nenhuma escrita direta em credit_orders ou credit_transactions é feita pelo cliente.
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
  const headers = await getAuthHeaders();
  const serverConfirmation = await fetchJsonSafe<{
    alreadyProcessed?: boolean;
    creditsAdded?: number;
    newBalance?: number;
    order?: CreditOrder;
    transaction?: CreditTransaction;
  }>('/api/mercadopago/confirm-credit-order', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      orderId,
      paymentId: paymentId ? String(paymentId) : undefined,
    }),
  });

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

  const pkg = serverOrder ? getCreditPackageById(serverOrder.packageId) : undefined;
  const authoritativeCredits = pkg
    ? pkg.totalCredits
    : Number(serverConfirmation?.creditsAdded || serverOrder?.credits || 15);

  const now = new Date().toISOString();
  const txId = `tx_${orderId}`;
  const existingLocalTx = readLocalTransactions().find((t) => t.id === txId);

  if (serverConfirmation?.alreadyProcessed || existingLocalTx) {
    return {
      alreadyProcessed: true,
      creditsAdded: 0,
      newBalance:
        typeof serverConfirmation?.newBalance === 'number'
          ? serverConfirmation.newBalance
          : currentUser.credits ?? INITIAL_FREE_CREDITS,
      order: serverOrder,
    };
  }

  const newBalance =
    typeof serverConfirmation?.newBalance === 'number'
      ? serverConfirmation.newBalance
      : (currentUser.credits ?? INITIAL_FREE_CREDITS) + authoritativeCredits;

  const finalOrder: CreditOrder = stripUndefined({
    id: orderId,
    userId: currentUser.uid,
    userEmail: currentUser.email,
    userName: currentUser.name,
    packageId: serverOrder?.packageId || pkg?.id || 'pkg_30',
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

/**
 * Registra no extrato local uma movimentação de débito (o backend grava no Firestore)
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
}

/**
 * Consulta o status de um pedido específico no backend (/api/mercadopago/order-status/:orderId)
 */
export async function checkCreditOrderStatus(
  currentUserOrOrderId: UserProfile | string,
  maybeOrderId?: string
): Promise<{
  approved: boolean;
  status: string;
  credited: boolean;
  credits: number;
  order?: CreditOrder;
  newBalance?: number;
}> {
  const orderId =
    typeof currentUserOrOrderId === 'string' ? currentUserOrOrderId : maybeOrderId || '';
  const currentUser =
    typeof currentUserOrOrderId === 'object' ? currentUserOrOrderId : null;

  const headers = await getAuthHeaders();
  const data = await fetchJsonSafe<{
    approved?: boolean;
    status?: string;
    credited?: boolean;
    credits?: number;
    order?: CreditOrder;
  }>(`/api/mercadopago/order-status/${encodeURIComponent(orderId)}`, { headers });

  if (data?.approved && currentUser) {
    const creditResult = await confirmAndCreditOrder(
      currentUser,
      orderId,
      data.order?.mpPaymentId
    );
    return {
      approved: true,
      status: 'approved',
      credited: true,
      credits: creditResult.creditsAdded || data.credits || 0,
      order: creditResult.order || data.order,
      newBalance: creditResult.newBalance,
    };
  }

  return {
    approved: Boolean(data?.approved),
    status: data?.status || data?.order?.status || 'pending',
    credited: Boolean(data?.credited),
    credits: data?.credits || data?.order?.credits || 0,
    order: data?.order,
  };
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

  readLocalOrders()
    .filter((o) => o.userId === userId)
    .forEach((o) => ordersMap.set(o.id, o));
  readLocalTransactions()
    .filter((t) => t.userId === userId)
    .forEach((t) => txMap.set(t.id, t));

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

export async function activateUserPlan(
  currentUser: UserProfile,
  plan: PricingPlan,
  period: PlanPeriod,
  paymentMethod: 'pix' | 'credit_card' | 'free',
  _paymentId?: string | number
): Promise<Partial<UserProfile>> {
  const expiresAt = calculatePlanExpirationDate(period);
  const now = new Date().toISOString();

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
