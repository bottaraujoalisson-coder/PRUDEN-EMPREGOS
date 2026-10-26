import React, { useState, useEffect } from 'react';
import { PricingPlan, PlanPeriod, UserProfile } from '../types';
import { CreditPackage } from '../utils/creditsData';
import {
  processMercadoPagoPix,
  createMercadoPagoPreference,
  activateUserPlan,
  confirmAndCreditOrder,
  checkCreditOrderStatus,
  getMercadoPagoConfig,
  ProcessPixResponse,
  CreatePreferenceResponse,
  MercadoPagoConfigResponse,
} from '../services/mercadopagoService';
import {
  formatPriceBRL,
  formatDailyEquivalent,
  calculateSavings,
  getPlanProtectionReason,
} from '../utils/plansData';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  CreditCard,
  Sparkles,
  ArrowRight,
  Lock,
  Clock,
  BadgeCheck,
  Coins,
} from 'lucide-react';

interface MercadoPagoModalProps {
  isOpen: boolean;
  plan: PricingPlan | null;
  creditPackage?: CreditPackage | null;
  period: PlanPeriod;
  currentUser: UserProfile | null;
  onClose: () => void;
  onPlanActivated: (updatedUser: Partial<UserProfile>) => void;
  onCreditsPurchased?: (newBalance: number, creditsAdded: number) => void;
  onRequireAuth: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MercadoPagoModal: React.FC<MercadoPagoModalProps> = ({
  isOpen,
  plan,
  creditPackage = null,
  period,
  currentUser,
  onClose,
  onPlanActivated,
  onCreditsPurchased,
  onRequireAuth,
  showToast,
}) => {
  const [paymentTab, setPaymentTab] = useState<'pix' | 'card'>('pix');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<ProcessPixResponse | null>(null);
  const [prefData, setPrefData] = useState<CreatePreferenceResponse | null>(null);
  const [mpConfig, setMpConfig] = useState<MercadoPagoConfigResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedTestUser, setCopiedTestUser] = useState(false);
  const [activating, setActivating] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(900); // 15 minutos padrão Banco Central
  const [completedSuccess, setCompletedSuccess] = useState(false);
  const [creditedSummary, setCreditedSummary] = useState<{
    added: number;
    newBalance: number;
    orderId: string;
  } | null>(null);

  const isCreditPurchase = Boolean(creditPackage);

  const amount = creditPackage
    ? creditPackage.price
    : plan
    ? period === 'yearly'
      ? plan.yearlyTotal
      : plan.monthlyPrice
    : 0;

  // Fecha no Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Contagem regressiva do Pix
  useEffect(() => {
    if (!isOpen || paymentTab !== 'pix' || completedSuccess) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, paymentTab, completedSuccess]);

  // Carrega cobrança do Mercado Pago ao abrir (Reutilizado para Planos e Créditos)
  useEffect(() => {
    if (!isOpen || (!plan && !creditPackage)) {
      setPixData(null);
      setPrefData(null);
      setCompletedSuccess(false);
      setCreditedSummary(null);
      return;
    }

    if (!currentUser) return;

    let isMounted = true;
    const loadMercadoPago = async () => {
      setLoading(true);
      try {
        if (creditPackage) {
          const [pixRes, prefRes, configRes] = await Promise.all([
            processMercadoPagoPix({
              type: 'credits',
              packageId: creditPackage.id,
              userId: currentUser.uid,
              payerEmail: currentUser.email,
              payerName: currentUser.name,
              documentNumber:
                currentUser.cnpj || currentUser.cpf || currentUser.documentNumber,
              documentType:
                currentUser.documentType ||
                (currentUser.type === 'company' ? 'CNPJ' : 'CPF'),
            }).catch(() => null),
            createMercadoPagoPreference({
              type: 'credits',
              packageId: creditPackage.id,
              userId: currentUser.uid,
              payerEmail: currentUser.email,
              payerName: currentUser.name,
            }).catch(() => null),
            getMercadoPagoConfig().catch(() => null),
          ]);

          if (isMounted) {
            if (pixRes) setPixData(pixRes);
            if (prefRes) setPrefData(prefRes);
            if (configRes) setMpConfig(configRes);
          }
        } else if (plan) {
          const [pixRes, prefRes, configRes] = await Promise.all([
            processMercadoPagoPix({
              type: 'subscription',
              planId: plan.id,
              planTitle: plan.title,
              amount,
              payerEmail: currentUser.email,
              payerName: currentUser.name,
              documentNumber:
                currentUser.cpf || currentUser.cnpj || currentUser.documentNumber,
              documentType:
                currentUser.documentType ||
                (plan.targetRole === 'company' ? 'CNPJ' : 'CPF'),
            }).catch(() => null),
            createMercadoPagoPreference({
              type: 'subscription',
              planId: plan.id,
              planTitle: plan.title,
              amount,
              payerEmail: currentUser.email,
              payerName: currentUser.name,
              period,
            }).catch(() => null),
            getMercadoPagoConfig().catch(() => null),
          ]);

          if (isMounted) {
            if (pixRes) setPixData(pixRes);
            if (prefRes) setPrefData(prefRes);
            if (configRes) setMpConfig(configRes);
          }
        }
      } catch (err: any) {
        console.error('Error generating Mercado Pago transaction:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMercadoPago();

    return () => {
      isMounted = false;
    };
  }, [isOpen, plan, creditPackage, period, currentUser, amount]);

  // Monitoramento automático do pedido de créditos via Webhook / API do Mercado Pago
  useEffect(() => {
    const activeOrderId =
      paymentTab === 'pix' ? pixData?.orderId : prefData?.orderId || pixData?.orderId;
    if (!isOpen || !isCreditPurchase || !currentUser || !activeOrderId || completedSuccess) {
      return;
    }

    const pollInterval = setInterval(async () => {
      const check = await checkCreditOrderStatus(currentUser, activeOrderId);
      if (check.approved && typeof check.newBalance === 'number') {
        const added = creditPackage?.totalCredits || 0;
        setCreditedSummary({
          added,
          newBalance: check.newBalance,
          orderId: activeOrderId,
        });
        onPlanActivated({ credits: check.newBalance });
        onCreditsPurchased?.(check.newBalance, added);
        setCompletedSuccess(true);
        showToast(
          `Pagamento confirmado pelo Mercado Pago! +${added} créditos liberados.`,
          'success'
        );
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [
    isOpen,
    isCreditPurchase,
    currentUser,
    paymentTab,
    pixData?.orderId,
    prefData?.orderId,
    completedSuccess,
    creditPackage,
    onPlanActivated,
    onCreditsPurchased,
    showToast,
  ]);

  if (!isOpen || (!plan && !creditPackage)) return null;

  const savings = plan ? calculateSavings(plan, period) : null;
  const dailyEquivalent = formatDailyEquivalent(amount, period);
  const protection = plan
    ? getPlanProtectionReason(plan.id, plan.targetRole)
    : {
        headline: `Adicione ${creditPackage?.totalCredits} créditos permanentes sem mensalidade`,
        lossPrevention:
          'Evite ficar sem saldo quando encontrar um candidato ideal. Seus créditos nunca expiram e liberam contatos imediatos.',
        gainPoints: creditPackage?.features || [],
      };

  const handleCopyPix = () => {
    if (!pixData?.qrCode) return;
    navigator.clipboard.writeText(pixData.qrCode);
    setCopied(true);
    showToast('Código Pix copiado com sucesso! Abra o app do seu banco para colar.');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleConfirmAndActivate = async (method: 'pix' | 'credit_card') => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    try {
      setActivating(true);

      if (creditPackage) {
        const orderId =
          (method === 'pix' ? pixData?.orderId : prefData?.orderId) ||
          pixData?.orderId ||
          prefData?.orderId;

        if (!orderId) {
          showToast('Aguarde a geração do pedido no Mercado Pago.', 'error');
          return;
        }

        const paymentId = method === 'pix' ? pixData?.id : prefData?.id;
        const result = await confirmAndCreditOrder(currentUser, orderId, paymentId);

        setCreditedSummary({
          added: creditPackage.totalCredits,
          newBalance: result.newBalance,
          orderId,
        });
        onPlanActivated({ credits: result.newBalance });
        onCreditsPurchased?.(result.newBalance, creditPackage.totalCredits);
        setCompletedSuccess(true);

        if (result.alreadyProcessed) {
          showToast('Este pedido já havia sido creditado anteriormente (proteção contra duplicidade ativa).');
        } else {
          showToast(
            `+${creditPackage.totalCredits} créditos adicionados! Novo saldo: ${result.newBalance} créditos.`,
            'success'
          );
        }
        return;
      }

      if (plan) {
        const updates = await activateUserPlan(
          currentUser,
          plan,
          period,
          method,
          pixData?.id || prefData?.id
        );
        onPlanActivated(updates);
        setCompletedSuccess(true);
        showToast(`Plano ${plan.title} ativado com sucesso!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao confirmar pagamento. Tente novamente.', 'error');
    } finally {
      setActivating(false);
    }
  };

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-[#0B1F3A]/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mp-modal-title"
        className="modal-surface w-full max-w-[620px] max-h-[92vh] overflow-y-auto relative z-10 rounded-2xl bg-white shadow-2xl border border-[#CBD5E1]"
      >
        {/* Step Indicator */}
        <div className="px-6 pt-5 pb-3 border-b border-[#E2E8F0] bg-[#F8FAFC] rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#009EE3] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Mercado Pago Checkout Seguro
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-[11px] text-[#16835D] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Compra Garantida
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar janela de pagamento"
              className="w-8 h-8 inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#E2E8F0] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepped Breadcrumb */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-[#E2E8F0]">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#16835D]">
              <span className="w-5 h-5 rounded-full bg-[#ECFDF5] border border-[#16835D] text-[#16835D] flex items-center justify-center text-[10px]">
                ✓
              </span>
              <span className="truncate">
                {isCreditPurchase ? '1. Pacote Escolhido' : '1. Plano Escolhido'}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold ${completedSuccess ? 'text-[#16835D]' : 'text-[#009EE3]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${completedSuccess ? 'bg-[#ECFDF5] border border-[#16835D] text-[#16835D]' : 'bg-[#EFF6FF] border border-[#009EE3] text-[#009EE3]'}`}>
                {completedSuccess ? '✓' : '2'}
              </span>
              <span className="truncate">2. Pagamento Seguro</span>
            </div>
            <div className={`flex items-center gap-1.5 text-[11px] ${completedSuccess ? 'font-bold text-[#16835D]' : 'font-medium text-[#94A3B8]'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${completedSuccess ? 'bg-[#16835D] text-white font-bold' : 'bg-[#F1F5F9] border border-[#CBD5E1] text-[#94A3B8]'}`}>
                3
              </span>
              <span className="truncate">
                {isCreditPurchase ? '3. Créditos na Carteira' : '3. Benefícios Ativos'}
              </span>
            </div>
          </div>
        </div>

        {/* CELEBRATION SUCCESS STATE */}
        {completedSuccess ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] border-2 border-[#16835D] text-[#16835D] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            {isCreditPurchase && creditPackage ? (
              <div className="space-y-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#16835D] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#BBF7D0]">
                  Créditos Liberados com Sucesso
                </span>
                <h2 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
                  +{creditPackage.totalCredits} créditos foram adicionados à sua carteira!
                </h2>
                <p className="text-[14px] text-[#64748B] max-w-md mx-auto leading-relaxed">
                  Seu novo saldo disponível é de{' '}
                  <strong className="text-[#0F172A]">
                    {creditedSummary?.newBalance ?? (currentUser?.credits ?? 5)} créditos
                  </strong>
                  . Pedido registrado com proteção contra duplicidade ({creditedSummary?.orderId}).
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#16835D] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#BBF7D0]">
                  Assinatura Confirmada
                </span>
                <h2 className="text-[22px] font-bold text-[#0F172A] tracking-tight">
                  Parabéns! O plano {plan?.title} já está ativo na sua conta.
                </h2>
                <p className="text-[14px] text-[#64748B] max-w-md mx-auto leading-relaxed">
                  Seus benefícios foram liberados imediatamente sem burocracia. Um comprovante detalhado foi registrado com garantia de 7 dias.
                </p>
              </div>
            )}

            {/* Unlocked Superpowers Card */}
            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-left space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] block">
                {isCreditPurchase
                  ? 'Resumo da Transação Auditável:'
                  : 'Superpoderes Ativados no seu Perfil:'}
              </span>
              <ul className="space-y-1.5 text-[13px] text-[#0F172A]">
                {protection.gainPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <BadgeCheck className="w-4 h-4 text-[#16835D] shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-base btn-lg btn-primary w-full shadow-md flex items-center justify-center gap-2 cursor-pointer font-semibold"
            >
              <span>
                {isCreditPurchase
                  ? 'Voltar ao Painel com Meu Novo Saldo'
                  : 'Acessar Meu Painel e Usar os Benefícios'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            {/* Not Logged In Warning */}
            {!currentUser && (
              <div className="p-6 bg-[#EFF6FF] border-b border-[#BFDBFE] text-center space-y-3">
                <p className="text-[14px] text-[#1E3A8A] font-medium leading-relaxed">
                  Para vincular a compra à sua conta e carteira de créditos, entre na sua conta ou cadastre-se gratuitamente em 1 minuto.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRequireAuth();
                  }}
                  className="btn-base btn-md btn-primary w-full shadow-sm"
                >
                  Entrar ou Criar Conta Gratuita
                </button>
              </div>
            )}

            {currentUser && (
              <div className="p-6 space-y-6">
                {/* Order Summary with Anchoring */}
                <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD5E1] space-y-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 id="mp-modal-title" className="text-[18px] font-bold text-[#0F172A]">
                          {creditPackage ? creditPackage.title : plan?.title}
                        </h3>
                        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#EFF6FF] text-[#009EE3] border border-[#BFDBFE]">
                          {creditPackage
                            ? `${creditPackage.totalCredits} Créditos Avulsos`
                            : period === 'yearly'
                            ? 'Ciclo Anual'
                            : 'Ciclo Mensal'}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#64748B] mt-0.5">
                        {creditPackage
                          ? `Pedido vinculado a ${currentUser.name} · Saldo atual: ${currentUser.credits ?? 5} créditos`
                          : plan?.targetRole === 'company'
                          ? 'Para Recrutadores e Empresas (CNPJ)'
                          : 'Para Candidatos e Profissionais (CPF)'}
                      </p>
                    </div>

                    {/* Price & Daily Equivalent Anchor */}
                    <div className="text-right">
                      {creditPackage ? (
                        <div className="text-[12px] text-[#94A3B8] line-through tabular-nums">
                          {formatPriceBRL(creditPackage.originalPrice)}
                        </div>
                      ) : (
                        savings &&
                        savings.savingsTotal > 0 && (
                          <div className="text-[12px] text-[#94A3B8] line-through tabular-nums">
                            {formatPriceBRL(savings.originalTotal)}
                          </div>
                        )
                      )}
                      <div className="text-[22px] font-extrabold text-[#0F172A] tabular-nums leading-tight">
                        {formatPriceBRL(amount)}
                      </div>
                      <div className="text-[11px] text-[#16835D] font-bold tabular-nums">
                        {creditPackage
                          ? `Apenas ${formatPriceBRL(creditPackage.costPerCredit)} por crédito`
                          : `Equivalente a apenas ${dailyEquivalent}`}
                      </div>
                    </div>
                  </div>

                  {/* Protection and Value Microcopy */}
                  <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B] flex items-center gap-1">
                      {creditPackage ? (
                        <>
                          <Coins className="w-3.5 h-3.5 text-[#009EE3]" />
                          <span>
                            Créditos sem prazo de validade · Pedido:{' '}
                            <strong className="font-mono text-[#0F172A]">
                              {pixData?.orderId || prefData?.orderId || 'gerando...'}
                            </strong>
                          </span>
                        </>
                      ) : period === 'yearly' ? (
                        'Economia garantida de até 25% no ciclo anual'
                      ) : (
                        'Sem contrato de permanência mínima'
                      )}
                    </span>
                    <span className="font-semibold text-[#16835D] bg-[#ECFDF5] px-2 py-0.5 rounded">
                      Taxas extras: R$ 0,00
                    </span>
                  </div>
                </div>

                {/* Gain & Loss Prevention Box */}
                <div className="p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF] block">
                    Por que este investimento vale a pena agora:
                  </span>
                  <p className="text-[13px] text-[#1E3A8A] font-medium leading-relaxed">
                    {protection.headline}. {protection.lossPrevention}
                  </p>
                </div>

                {/* Method Selection */}
                <div className="space-y-3">
                  <label className="text-[12px] font-bold uppercase tracking-wider text-[#475569] block">
                    Selecione a Forma de Pagamento no Mercado Pago:
                  </label>

                  <div className="grid grid-cols-2 gap-2.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                    <button
                      type="button"
                      onClick={() => setPaymentTab('pix')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                        paymentTab === 'pix'
                          ? 'bg-white text-[#009EE3] shadow-xs border border-[#CBD5E1]'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Pix Instantâneo</span>
                      <span className="text-[10px] bg-[#ECFDF5] text-[#16835D] font-bold px-1.5 py-0.2 rounded-sm">
                        Liberação Imediata
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentTab('card')}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                        paymentTab === 'card'
                          ? 'bg-white text-[#009EE3] shadow-xs border border-[#CBD5E1]'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Cartão ou Checkout Pro</span>
                    </button>
                  </div>
                </div>

                {/* PIX CONTENT (Cap. 3 - 1-Clique & Cashless) */}
                {paymentTab === 'pix' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex flex-col sm:flex-row items-center gap-4">
                      {/* Stylized Central Bank / Mercado Pago QR Preview */}
                      <div className="w-36 h-36 bg-white p-2.5 rounded-xl border border-[#CBD5E1] shadow-xs flex flex-col items-center justify-center shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full text-[#0B1F3A]">
                          <rect x="5" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="5" />
                          <rect x="12" y="12" width="14" height="14" fill="currentColor" />
                          <rect x="67" y="5" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="5" />
                          <rect x="74" y="12" width="14" height="14" fill="currentColor" />
                          <rect x="5" y="67" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="5" />
                          <rect x="12" y="74" width="14" height="14" fill="currentColor" />
                          <rect x="42" y="10" width="16" height="6" fill="currentColor" />
                          <rect x="42" y="24" width="10" height="8" fill="currentColor" />
                          <rect x="10" y="44" width="12" height="12" fill="currentColor" />
                          <rect x="30" y="44" width="14" height="6" fill="currentColor" />
                          <rect x="50" y="42" width="18" height="18" fill="currentColor" />
                          <rect x="74" y="44" width="16" height="12" fill="currentColor" />
                          <rect x="42" y="70" width="14" height="12" fill="currentColor" />
                          <rect x="64" y="72" width="18" height="18" fill="currentColor" />
                        </svg>
                        <span className="text-[10px] font-bold text-[#009EE3] mt-1 tracking-wider uppercase">
                          Mercado Pago Pix
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5 text-center sm:text-left">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#16835D] bg-[#ECFDF5] px-2.5 py-1 rounded-md">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aprovação Automática em Segundos</span>
                        </div>
                        <h4 className="text-[15px] font-semibold text-[#0F172A]">
                          Abra o app do seu banco e escaneie o QR Code
                        </h4>
                        <p className="text-[12px] text-[#64748B] leading-relaxed">
                          Ou utilize a chave Copia e Cola abaixo. O sistema do Mercado Pago identifica a compensação na hora.
                        </p>
                        <div className="flex items-center gap-1.5 text-[12px] text-[#D97706] font-semibold tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Código válido por: <strong>{formattedTimer}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Copia e Cola with 1-Click Copy */}
                    <div>
                      <label className="text-[12px] font-semibold text-[#475569] mb-1.5 flex items-center justify-between">
                        <span>Código Pix Copia e Cola Oficial:</span>
                        <span className="text-[11px] text-[#64748B] font-normal">Clique para copiar em 1 segundo</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixData?.qrCode || 'Gerando código Pix Mercado Pago...'}
                          className="form-control text-xs font-mono bg-[#F8FAFC] py-2.5 truncate text-[#334155] select-all cursor-pointer"
                          onClick={handleCopyPix}
                        />
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          disabled={loading || !pixData?.qrCode}
                          className="btn-base btn-md btn-secondary shrink-0 gap-1.5 text-[13px] font-semibold cursor-pointer shadow-xs"
                        >
                          {copied ? <Check className="w-4 h-4 text-[#16835D]" /> : <Copy className="w-4 h-4" />}
                          <span>{copied ? 'Copiado!' : 'Copiar Pix'}</span>
                        </button>
                      </div>
                    </div>

                    {/* 1-Click Instant Activation (Cap. 3 & Cap. 8) */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmAndActivate('pix')}
                        disabled={activating}
                        className="w-full btn-base btn-lg bg-[#009EE3] hover:bg-[#0086C3] text-white font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                      >
                        <Sparkles className="w-5 h-5" />
                        <span>
                          {activating
                            ? 'Validando pagamento no Mercado Pago...'
                            : isCreditPurchase
                            ? `Confirmar Pagamento e Liberar +${creditPackage?.totalCredits} Créditos Agora`
                            : 'Confirmar Pagamento e Ativar Plano Agora'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* CARD & CHECKOUT PRO CONTENT */}
                {paymentTab === 'card' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[#0F172A]">
                          Checkout Pro Oficial do Mercado Pago
                        </span>
                      </div>
                      <p className="text-[13px] text-[#64748B] leading-relaxed">
                        Pague em até 12x no cartão de crédito (todas as bandeiras) ou utilize seu saldo em conta do Mercado Pago com total segurança.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[12px] text-[#475569]">
                        <span className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] font-semibold">Visa</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] font-semibold">Mastercard</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] font-semibold">Elo</span>
                        <span className="px-2 py-0.5 rounded bg-white border border-[#CBD5E1] font-semibold">Hipercard</span>
                        <span className="px-2 py-0.5 rounded bg-[#EFF6FF] text-[#009EE3] border border-[#BFDBFE] font-semibold">
                          Saldo Mercado Pago
                        </span>
                      </div>
                    </div>

                    {prefData?.initPoint && (
                      <div className="space-y-3">
                        <a
                          href={prefData.initPoint}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full btn-base btn-lg bg-[#009EE3] hover:bg-[#0086C3] text-white font-bold shadow-md flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-5 h-5" />
                          <span>Abrir Tela Segura de Pagamento Mercado Pago</span>
                        </a>

                        {/* Test credentials helper */}
                        {mpConfig?.testUser && (
                          <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-left space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-[#16835D]">
                                Conta de Teste do Mercado Pago (para simular no checkout):
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${mpConfig.testUser}`);
                                  setCopiedTestUser(true);
                                  showToast('Usuário de teste copiado!');
                                  setTimeout(() => setCopiedTestUser(false), 2000);
                                }}
                                className="text-[11px] text-[#16835D] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                              >
                                {copiedTestUser ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copiedTestUser ? 'Copiado!' : 'Copiar Login'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px] font-mono text-[#1E293B]">
                              <div>
                                <span className="text-[#64748B] font-sans font-medium text-[11px]">Usuário: </span>
                                <strong className="text-[#0F172A]">{mpConfig.testUser}</strong>
                              </div>
                              <div>
                                <span className="text-[#64748B] font-sans font-medium text-[11px]">Senha: </span>
                                <strong className="text-[#0F172A]">{mpConfig.testPass || '******'}</strong>
                              </div>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleConfirmAndActivate('credit_card')}
                          disabled={activating}
                          className="w-full btn-base btn-md btn-secondary font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#16835D]" />
                          <span>
                            {activating
                              ? 'Validando...'
                              : isCreditPurchase
                              ? `Confirmar e Creditar +${creditPackage?.totalCredits} Créditos na Carteira`
                              : 'Confirmar e Liberar Benefícios Imediatamente'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Risk-Reversal & Trust Architecture (Cap. 2 - Aversão à Perda & Cap. 9 - Ética) */}
                <div className="pt-4 border-t border-[#E2E8F0] space-y-2">
                  <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#16835D] shrink-0" />
                    <div className="text-[12px] text-[#334155] leading-relaxed">
                      <strong className="text-[#0F172A]">Garantia Incondicional de 7 Dias:</strong> Se por qualquer motivo você não ficar 100% satisfeito com o resultado, devolvemos seu dinheiro integralmente com 1 clique no painel. Sem letras miúdas.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-[#64748B]">
                    <span>· Sem fidelidade ou permanência obrigatória</span>
                    <span>· Cancele quando quiser com 1 clique</span>
                    <span>· Mercado Pago Compra Garantida</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
