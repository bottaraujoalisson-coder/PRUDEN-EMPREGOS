import React, { useState, useEffect } from 'react';
import { PricingPlan, PlanPeriod, UserProfile } from '../types';
import { formatPriceBRL } from '../utils/plansData';
import { CreditPackage } from '../utils/creditsData';
import {
  getMercadoPagoConfig,
  createMercadoPagoPreference,
  processMercadoPagoPix,
  activateUserPlan,
  confirmAndCreditOrder,
  checkCreditOrderStatus,
  MercadoPagoConfigResponse,
  ProcessPixResponse,
  CreatePreferenceResponse,
} from '../services/mercadopagoService';

const PERIOD_LABELS: Record<PlanPeriod, string> = {
  monthly: 'Mensal',
  yearly: 'Anual',
};

function getPlanPriceForPeriod(plan: PricingPlan, period: PlanPeriod): number {
  return period === 'yearly' ? plan.yearlyTotal : plan.monthlyPrice;
}
import {
  X,
  QrCode,
  CreditCard,
  Copy,
  Check,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  Loader2,
  Lock,
  Sparkles,
  Clock,
  Coins,
  ArrowRight,
} from 'lucide-react';

interface MercadoPagoModalProps {
  isOpen: boolean;
  plan?: PricingPlan | null;
  period?: PlanPeriod;
  creditPackage?: CreditPackage | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onPlanActivated: (updates: Partial<UserProfile>, planTitle: string) => void;
  onCreditsPurchased?: (newBalance: number, creditsAdded: number, packageTitle: string) => void;
  onRequireAuth: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type PaymentTab = 'pix' | 'checkout_pro';

export const MercadoPagoModal: React.FC<MercadoPagoModalProps> = ({
  isOpen,
  plan,
  period = 'monthly',
  creditPackage,
  currentUser,
  onClose,
  onPlanActivated,
  onCreditsPurchased,
  onRequireAuth,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<PaymentTab>('pix');
  const [config, setConfig] = useState<MercadoPagoConfigResponse | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [pixData, setPixData] = useState<ProcessPixResponse | null>(null);
  const [generatingPix, setGeneratingPix] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const [preferenceData, setPreferenceData] = useState<CreatePreferenceResponse | null>(null);
  const [generatingPreference, setGeneratingPreference] = useState(false);

  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [step, setStep] = useState<'checkout' | 'success'>('checkout');
  const [pixSecondsLeft, setPixSecondsLeft] = useState(900);
  const [confirmedNewBalance, setConfirmedNewBalance] = useState<number | null>(null);

  const isCreditPurchase = Boolean(creditPackage);

  useEffect(() => {
    if (!isOpen) return;
    setStep('checkout');
    setPixData(null);
    setPreferenceData(null);
    setCopiedPix(false);
    setActiveTab('pix');
    setPixSecondsLeft(900);
    setConfirmedNewBalance(null);

    setLoadingConfig(true);
    getMercadoPagoConfig()
      .then((res) => setConfig(res))
      .finally(() => setLoadingConfig(false));
  }, [isOpen, plan?.id, period, creditPackage?.id]);

  // Countdown de expiração para o QR Code Pix
  useEffect(() => {
    if (!isOpen || !pixData || step === 'success') return;
    const timer = window.setInterval(() => {
      setPixSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, pixData, step]);

  // Polling automático a cada 5s para detectar confirmação via Webhook do Mercado Pago
  useEffect(() => {
    const activeOrderId = pixData?.orderId || preferenceData?.orderId;
    if (!isOpen || !isCreditPurchase || !activeOrderId || !currentUser || step === 'success') {
      return;
    }

    const pollInterval = window.setInterval(async () => {
      const statusRes = await checkCreditOrderStatus(currentUser, activeOrderId);
      if (statusRes.approved && typeof statusRes.newBalance === 'number' && creditPackage) {
        window.clearInterval(pollInterval);
        setConfirmedNewBalance(statusRes.newBalance);
        onCreditsPurchased?.(
          statusRes.newBalance,
          creditPackage.totalCredits,
          creditPackage.title
        );
        setStep('success');
      }
    }, 5000);

    return () => window.clearInterval(pollInterval);
  }, [
    isOpen,
    isCreditPurchase,
    pixData?.orderId,
    preferenceData?.orderId,
    currentUser,
    step,
    creditPackage,
    onCreditsPurchased,
  ]);

  if (!isOpen || (!plan && !creditPackage)) return null;

  const amount = creditPackage
    ? creditPackage.price
    : plan
    ? getPlanPriceForPeriod(plan, period)
    : 0;

  const itemTitle = creditPackage ? creditPackage.title : plan?.title || '';
  const currentCredits = currentUser?.credits ?? 0;
  const projectedCredits = creditPackage
    ? currentCredits + creditPackage.totalCredits
    : currentCredits;

  const formatCountdown = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const handleGeneratePix = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    try {
      setGeneratingPix(true);
      const res = await processMercadoPagoPix({
        type: isCreditPurchase ? 'credits' : 'subscription',
        packageId: creditPackage?.id,
        userId: currentUser.uid,
        planId: plan?.id,
        planTitle: creditPackage
          ? `${creditPackage.title} (+${creditPackage.totalCredits} créditos)`
          : `${plan?.title} (${PERIOD_LABELS[period]})`,
        amount,
        payerEmail: currentUser.email,
        payerName: currentUser.name,
        documentNumber: currentUser.documentNumber || currentUser.cpf || currentUser.cnpj,
        documentType: currentUser.documentType || (currentUser.type === 'company' ? 'CNPJ' : 'CPF'),
      });
      setPixData(res);
      setPixSecondsLeft(900);
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar cobrança Pix no Mercado Pago.', 'error');
    } finally {
      setGeneratingPix(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopiedPix(true);
      showToast('Código Pix Copia e Cola copiado!');
      setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      showToast('Não foi possível copiar automaticamente. Selecione o código abaixo.', 'error');
    }
  };

  const handleOpenCheckoutPro = async () => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    try {
      setGeneratingPreference(true);
      const pref = await createMercadoPagoPreference({
        type: isCreditPurchase ? 'credits' : 'subscription',
        packageId: creditPackage?.id,
        userId: currentUser.uid,
        planId: plan?.id,
        planTitle: itemTitle,
        amount,
        payerEmail: currentUser.email,
        payerName: currentUser.name,
        period,
      });
      setPreferenceData(pref);
    } catch (err: any) {
      showToast(err.message || 'Erro ao abrir Checkout Pro do Mercado Pago.', 'error');
    } finally {
      setGeneratingPreference(false);
    }
  };

  const handleConfirmPayment = async (method: 'pix' | 'credit_card') => {
    if (!currentUser) {
      onRequireAuth();
      return;
    }

    try {
      setConfirmingPayment(true);

      if (isCreditPurchase && creditPackage) {
        let targetOrderId = pixData?.orderId || preferenceData?.orderId;

        if (!targetOrderId) {
          if (method === 'pix') {
            const generated = await processMercadoPagoPix({
              type: 'credits',
              packageId: creditPackage.id,
              userId: currentUser.uid,
              payerEmail: currentUser.email,
              payerName: currentUser.name,
            });
            setPixData(generated);
            targetOrderId = generated.orderId;
          } else {
            const generatedPref = await createMercadoPagoPreference({
              type: 'credits',
              packageId: creditPackage.id,
              userId: currentUser.uid,
              payerEmail: currentUser.email,
              payerName: currentUser.name,
            });
            setPreferenceData(generatedPref);
            targetOrderId = generatedPref.orderId;
          }
        }

        if (!targetOrderId) {
          throw new Error('Pedido de créditos não identificado.');
        }

        const result = await confirmAndCreditOrder(
          currentUser,
          targetOrderId,
          pixData?.id || preferenceData?.id
        );

        setConfirmedNewBalance(result.newBalance);

        if (result.alreadyProcessed) {
          showToast('Este pedido já havia sido creditado anteriormente (Sem duplicidade).');
        } else {
          onCreditsPurchased?.(result.newBalance, result.creditsAdded, creditPackage.title);
        }

        setStep('success');
        return;
      }

      if (plan) {
        const updates = await activateUserPlan(
          currentUser,
          plan,
          period,
          method,
          pixData?.id || preferenceData?.id
        );
        setStep('success');
        onPlanActivated(updates, plan.title);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao confirmar pagamento.', 'error');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const checkoutUrl = preferenceData?.sandboxInitPoint || preferenceData?.initPoint;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mp-checkout-title"
    >
      <div className="bg-white border border-[#DBEAFE] rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl my-auto">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-[#2563EB] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center font-extrabold text-sm tracking-tight shrink-0">
              MP
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 id="mp-checkout-title" className="text-[15px] font-bold leading-tight">
                  Checkout Seguro Mercado Pago
                </h2>
                <Lock className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <p className="text-[11px] text-blue-100">
                {loadingConfig
                  ? 'Conectando ao gateway...'
                  : config?.configured
                  ? 'Conexão Oficial Criptografada (SSL)'
                  : 'Ambiente Homologado · Liberação Instantânea'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar checkout"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {step === 'success' ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#ECFDF5] text-[#059669]">
                Pagamento Confirmado
              </span>
              <h3 className="text-[22px] font-extrabold text-[#0F172A]">
                {isCreditPurchase && creditPackage
                  ? `+${creditPackage.totalCredits} créditos liberados!`
                  : `${itemTitle} ativado com sucesso!`}
              </h3>
              <p className="text-[13px] text-[#475569] max-w-sm mx-auto">
                {isCreditPurchase
                  ? 'Seus créditos já foram adicionados à sua carteira digital e não possuem prazo de validade.'
                  : 'Os recursos do seu plano já estão disponíveis na sua conta.'}
              </p>
            </div>

            {isCreditPurchase && creditPackage && (
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-left space-y-2 text-[13px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Pacote adquirido</span>
                  <span className="font-bold text-[#0F172A]">{creditPackage.title}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">Créditos adicionados</span>
                  <span className="font-extrabold text-[#059669]">
                    +{creditPackage.totalCredits} créditos
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                  <span className="font-semibold text-[#0F172A]">Saldo disponível na carteira</span>
                  <span className="text-[15px] font-extrabold text-[#1E40AF] tabular-nums">
                    {confirmedNewBalance ?? projectedCredits} créditos
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              data-testid="mp-finish-btn"
              onClick={onClose}
              className="w-full min-h-[46px] rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold text-[14px] transition-colors cursor-pointer"
            >
              Concluir e Continuar
            </button>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-5">
            {/* 1. Resumo Limpo do Pedido e Saldo */}
            <div className="bg-[#F8FAFC] border border-[#DBEAFE] rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] block">
                    {isCreditPurchase ? 'Recarga Avulsa de Créditos' : 'Assinatura'}
                  </span>
                  <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-snug mt-0.5">
                    {itemTitle}
                  </h3>
                  <p className="text-[12px] text-[#64748B]">
                    {isCreditPurchase
                      ? 'Pagamento único · Créditos sem data de expiração'
                      : `Ciclo ${PERIOD_LABELS[period]}`}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-semibold text-[#64748B] block">Total</span>
                  <span className="text-[22px] font-extrabold text-[#0F172A] tabular-nums leading-none">
                    {formatPriceBRL(amount)}
                  </span>
                </div>
              </div>

              {/* Simulação de Saldo Atual -> Novo Saldo */}
              {isCreditPurchase && creditPackage && currentUser && (
                <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-1.5 text-[#475569]">
                    <Coins className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Saldo na carteira:</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold tabular-nums">
                    <span className="text-[#64748B]">{currentCredits} cr</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-md border border-[#A7F3D0]">
                      {projectedCredits} créditos (+{creditPackage.totalCredits})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso caso usuário não esteja autenticado */}
            {!currentUser && (
              <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-between gap-3">
                <p className="text-[12px] text-[#92400E] font-medium">
                  Entre ou crie sua conta gratuita para vincular os créditos à sua carteira.
                </p>
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="px-3 py-1.5 rounded-lg bg-[#92400E] text-white text-[12px] font-bold shrink-0 cursor-pointer"
                >
                  Entrar / Cadastrar
                </button>
              </div>
            )}

            {/* 2. Seletor de Método de Pagamento */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F1F5F9] rounded-xl">
              <button
                type="button"
                data-testid="mp-tab-pix"
                onClick={() => setActiveTab('pix')}
                className={`py-2.5 px-3 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'pix'
                    ? 'bg-white text-[#1E40AF] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <QrCode className="w-4 h-4 text-[#009EE3]" />
                <span>Pix Imediato</span>
              </button>

              <button
                type="button"
                data-testid="mp-tab-card"
                onClick={() => setActiveTab('checkout_pro')}
                className={`py-2.5 px-3 rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'checkout_pro'
                    ? 'bg-white text-[#1E40AF] shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <CreditCard className="w-4 h-4 text-[#2563EB]" />
                <span>Cartão (Até 12x)</span>
              </button>
            </div>

            {/* 3. Conteúdo da Aba Pix */}
            {activeTab === 'pix' && (
              <div className="space-y-4">
                {!pixData ? (
                  <div className="border border-[#E2E8F0] rounded-xl p-5 text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] text-[#009EE3] flex items-center justify-center mx-auto">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[15px] font-bold text-[#0F172A]">
                        Pagamento Instantâneo via Pix
                      </h4>
                      <p className="text-[12px] text-[#64748B] max-w-xs mx-auto">
                        Gere o QR Code ou código Pix Copia e Cola. Seus créditos são liberados assim que o pagamento é confirmado.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="mp-generate-pix-btn"
                      onClick={handleGeneratePix}
                      disabled={generatingPix}
                      className="w-full min-h-[46px] rounded-xl bg-[#009EE3] hover:bg-[#0086C3] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {generatingPix ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gerando QR Code Pix...</span>
                        </>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Gerar QR Code Pix ({formatPriceBRL(amount)})</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="border border-[#DBEAFE] rounded-xl p-4 space-y-4 bg-[#F8FAFC]/60">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="font-bold text-[#059669] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        QR Code Pix pronto para pagamento
                      </span>
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-[#475569] bg-white px-2 py-0.5 rounded border border-[#E2E8F0]">
                        <Clock className="w-3 h-3 text-[#2563EB]" />
                        {formatCountdown(pixSecondsLeft)}
                      </span>
                    </div>

                    {/* QR Code Visual */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-[#E2E8F0]">
                      <div className="p-2 bg-white border border-[#E2E8F0] rounded-xl shrink-0">
                        {pixData.qrCodeBase64 ? (
                          <img
                            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                            alt="QR Code Pix Mercado Pago"
                            className="w-32 h-32 object-contain"
                          />
                        ) : (
                          <svg
                            viewBox="0 0 120 120"
                            className="w-32 h-32 text-slate-900"
                            aria-label="QR Code Pix"
                          >
                            <rect width="120" height="120" fill="white" />
                            <rect
                              x="8"
                              y="8"
                              width="30"
                              height="30"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="6"
                            />
                            <rect x="17" y="17" width="12" height="12" fill="currentColor" />
                            <rect
                              x="82"
                              y="8"
                              width="30"
                              height="30"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="6"
                            />
                            <rect x="91" y="17" width="12" height="12" fill="currentColor" />
                            <rect
                              x="8"
                              y="82"
                              width="30"
                              height="30"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="6"
                            />
                            <rect x="17" y="91" width="12" height="12" fill="currentColor" />
                            <rect x="46" y="12" width="6" height="6" fill="currentColor" />
                            <rect x="58" y="12" width="12" height="6" fill="currentColor" />
                            <rect x="46" y="24" width="12" height="6" fill="currentColor" />
                            <rect x="64" y="24" width="6" height="12" fill="currentColor" />
                            <rect x="12" y="46" width="12" height="6" fill="currentColor" />
                            <rect x="30" y="46" width="6" height="12" fill="currentColor" />
                            <rect x="46" y="46" width="24" height="24" fill="#009EE3" rx="4" />
                            <text
                              x="58"
                              y="62"
                              textAnchor="middle"
                              fill="white"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              PIX
                            </text>
                            <rect x="78" y="46" width="12" height="6" fill="currentColor" />
                            <rect x="96" y="52" width="12" height="12" fill="currentColor" />
                            <rect x="46" y="78" width="12" height="6" fill="currentColor" />
                            <rect x="64" y="84" width="18" height="6" fill="currentColor" />
                            <rect x="88" y="78" width="18" height="12" fill="currentColor" />
                            <rect x="46" y="96" width="18" height="12" fill="currentColor" />
                            <rect x="76" y="96" width="32" height="12" fill="currentColor" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 space-y-2.5 w-full">
                        <div className="text-[12px] text-[#475569] leading-relaxed">
                          Escaneie o QR Code no aplicativo do seu banco ou copie o código abaixo:
                        </div>

                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            readOnly
                            value={pixData.qrCode}
                            aria-label="Código Pix Copia e Cola"
                            className="flex-1 text-[11px] font-mono bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg px-2.5 py-2 text-[#334155] select-all"
                          />
                          <button
                            type="button"
                            onClick={handleCopyPixCode}
                            className="px-3 py-2 rounded-lg bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1E40AF] font-bold text-[12px] inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                          >
                            {copiedPix ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-[#059669]" />
                                <span className="text-[#059669]">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="mp-confirm-pix-btn"
                      onClick={() => handleConfirmPayment('pix')}
                      disabled={confirmingPayment}
                      className="w-full min-h-[46px] rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {confirmingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Validando pagamento e liberando créditos...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isCreditPurchase && creditPackage
                              ? `Já paguei · Liberar +${creditPackage.totalCredits} Créditos`
                              : 'Confirmar Pagamento Pix'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 4. Conteúdo da Aba Cartão / Checkout Pro */}
            {activeTab === 'checkout_pro' && (
              <div className="border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                <div className="space-y-1 text-center">
                  <div className="w-11 h-11 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mx-auto mb-2">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h4 className="text-[15px] font-bold text-[#0F172A]">
                    Cartão de Crédito ou Saldo Mercado Pago
                  </h4>
                  <p className="text-[12px] text-[#64748B] max-w-xs mx-auto">
                    Pague com qualquer cartão em até 12x no ambiente criptografado do Mercado Pago.
                  </p>
                </div>

                {!preferenceData ? (
                  <button
                    type="button"
                    data-testid="mp-generate-pref-btn"
                    onClick={handleOpenCheckoutPro}
                    disabled={generatingPreference}
                    className="w-full min-h-[46px] rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {generatingPreference ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Preparando Checkout Seguro...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Pagar com Cartão ({formatPriceBRL(amount)})</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-3 pt-1">
                    {checkoutUrl && (
                      <a
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full min-h-[44px] rounded-xl bg-[#009EE3] hover:bg-[#0086C3] text-white font-bold text-[13px] flex items-center justify-center gap-2 transition-colors"
                      >
                        <span>Abrir Página do Mercado Pago</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      data-testid="mp-confirm-card-btn"
                      onClick={() => handleConfirmPayment('credit_card')}
                      disabled={confirmingPayment}
                      className="w-full min-h-[46px] rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {confirmingPayment ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Confirmando e creditando...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {isCreditPurchase && creditPackage
                              ? `Confirmar Aprovação (+${creditPackage.totalCredits} Créditos)`
                              : 'Confirmar Pagamento por Cartão'}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rodapé enxuto de segurança */}
            <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[11px] text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                Transação protegida com validação idempotente
              </span>
              <span className="font-semibold text-[#1E40AF]">Mercado Pago</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
