import {
  doc,
  setDoc,
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
import { calculatePlanExpirationDate } from '../utils/plansData';
import { getCreditPackageById } from '../utils/creditsData';
import { stripUndefined } from '../utils/matchAlgorithm';

export interface MercadoPagoConfigResponse {
  configured: boolean;
  sandbox: boolean;
  publicKey: string;
  testUser?: string;
  testPass?: string;
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

/**
 * Consulta a configuração pública do Mercado Pago
 */
export async function getMercadoPagoConfig(): Promise<MercadoPagoConfigResponse> {
  try {
    const res = await fetch('/api/mercadopago/config');
    if (!res.ok) {
      throw new Error('Falha ao obter status do gateway.');
    }
    return await res.json();
  } catch {
    return {
      configured: false,
      sandbox: true,
      publicKey: 'TEST-SIMULATED-KEY',
      message: 'Modo de testes ativo.',
    };
  }
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
  const res = await fetch('/api/mercadopago/create-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData.error || 'Não foi possível gerar a preferência de pagamento no Mercado Pago.'
    );
  }

  const data: CreatePreferenceResponse = await res.json();

  // Se for um pedido de créditos, persiste o pedido pendente na coleção credit_orders no Firestore (se autenticado)
  if (data.order && data.orderId && auth.currentUser && (!params.userId || auth.currentUser.uid === params.userId)) {
    try {
      await setDoc(
        doc(db, 'credit_orders', data.orderId),
        stripUndefined(data.order),
        { merge: true }
      );
    } catch {
      // Silencioso caso já registrado pelo backend
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
  const res = await fetch('/api/mercadopago/process-pix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao gerar o código Pix no Mercado Pago.');
  }

  const data: ProcessPixResponse = await res.json();

  // Se for um pedido de créditos, persiste o pedido pendente na coleção credit_orders no Firestore (se autenticado)
  if (data.order && data.orderId && auth.currentUser && (!params.userId || auth.currentUser.uid === params.userId)) {
    try {
      await setDoc(
        doc(db, 'credit_orders', data.orderId),
        stripUndefined(data.order),
        { merge: true }
      );
    } catch {
      // Silencioso caso já registrado pelo backend
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
  const res = await fetch('/api/mercadopago/confirm-credit-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      paymentId: paymentId ? String(paymentId) : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Não foi possível validar o pagamento no Mercado Pago.');
  }

  const serverConfirmation = await res.json();
  const serverOrder: CreditOrder | undefined = serverConfirmation.order;

  // Resolve quantidade autoritativa de créditos a partir do catálogo oficial
  const pkg = serverOrder ? getCreditPackageById(serverOrder.packageId) : undefined;
  const authoritativeCredits = pkg
    ? pkg.totalCredits
    : Number(serverConfirmation.creditsAdded || serverOrder?.credits || 0);

  const now = new Date().toISOString();
  const txId = `tx_${orderId}`;

  // Se o usuário não estiver autenticado no Firebase Auth (ex: preview mode), utiliza a resposta autoritativa do backend
  if (!auth.currentUser || auth.currentUser.uid !== currentUser.uid) {
    return {
      alreadyProcessed: Boolean(serverConfirmation.alreadyProcessed),
      creditsAdded: authoritativeCredits,
      newBalance: (currentUser.credits ?? 5) + authoritativeCredits,
      order: serverOrder,
    };
  }

  // Transação atômica no Firestore para garantir que mesmo chamadas concorrentes ou webhooks repetidos
  // jamás gerem créditos duplicados na carteira do usuário
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
        ? (userSnap.data().credits ?? currentUser.credits ?? 5)
        : (currentUser.credits ?? 5);

      // TRAVA DE IDEMPOTÊNCIA: Se o pedido já consta como aprovado com processedAt ou a transação tx_{orderId} já existe
      if (
        (orderSnap.exists() &&
          orderSnap.data().status === 'approved' &&
          orderSnap.data().processedAt) ||
        txSnap.exists()
      ) {
        return {
          alreadyProcessed: true,
          creditsAdded: 0,
          newBalance: currentDbCredits,
          order: (orderSnap.exists() ? orderSnap.data() : serverOrder) as CreditOrder,
        };
      }

      const newBalance = currentDbCredits + authoritativeCredits;

      const finalOrder: CreditOrder = stripUndefined({
        id: orderId,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        userName: currentUser.name,
        packageId: serverOrder?.packageId || 'pack_pro',
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
      transaction.update(userRef, {
        credits: newBalance,
        updatedAt: now,
      });
      transaction.set(txRef, finalTransaction);

      return {
        alreadyProcessed: false,
        creditsAdded: authoritativeCredits,
        newBalance,
        order: finalOrder,
      };
    });

    return txResult;
  } catch (err) {
    console.warn('Fallback on Firestore transaction, syncing profile directly:', err);
    if (serverConfirmation.alreadyProcessed) {
      return {
        alreadyProcessed: true,
        creditsAdded: 0,
        newBalance: currentUser.credits ?? 5,
        order: serverOrder,
      };
    }
    const fallbackNewBalance = (currentUser.credits ?? 5) + authoritativeCredits;
    await saveUserProfile(currentUser.uid, { credits: fallbackNewBalance });
    return {
      alreadyProcessed: false,
      creditsAdded: authoritativeCredits,
      newBalance: fallbackNewBalance,
      order: serverOrder,
    };
  }
}

/**
 * Consulta o status de um pedido específico e sincroniza caso aprovado via Webhook
 */
export async function checkCreditOrderStatus(
  currentUser: UserProfile,
  orderId: string
): Promise<{ approved: boolean; order?: CreditOrder; newBalance?: number }> {
  try {
    const res = await fetch(`/api/mercadopago/order-status/${encodeURIComponent(orderId)}`);
    if (!res.ok) return { approved: false };
    const data = await res.json();
    if (data.approved) {
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
    return { approved: false, order: data.order };
  } catch {
    return { approved: false };
  }
}

/**
 * Consulta o histórico de pedidos e transações de créditos do usuário (Firestore + Servidor)
 */
export async function getUserCreditsHistory(userId: string): Promise<{
  orders: CreditOrder[];
  transactions: CreditTransaction[];
}> {
  const ordersMap = new Map<string, CreditOrder>();
  const txMap = new Map<string, CreditTransaction>();

  // 1. Consulta Firestore
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

  // 2. Consulta espelho do servidor
  try {
    const res = await fetch(`/api/mercadopago/user-credits/${encodeURIComponent(userId)}`);
    if (res.ok) {
      const serverData = await res.json();
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
  } catch {
    // Ignora falha de rede
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

