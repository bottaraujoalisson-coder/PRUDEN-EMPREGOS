import React, { useState, useEffect, useCallback } from 'react';
import { PricingPlan, PlanPeriod, UserProfile, CreditOrder, CreditTransaction } from '../types';
import { formatPriceBRL } from '../utils/plansData';
import {
  CREDIT_PACKAGES,
  CANDIDATE_RESUME_CREDIT_PACKAGE,
  CreditPackage,
  INITIAL_FREE_CREDITS,
  APPLY_JOB_CREDIT_COST,
  RESUME_PDF_CREDIT_COST,
  POST_JOB_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
} from '../utils/creditsData';
import {
  getUserCreditsHistory,
  checkCreditOrderStatus,
  getMercadoPagoConfig,
} from '../services/mercadopagoService';
import { formatDate } from '../utils/matchAlgorithm';
import {
  Check,
  ShieldCheck,
  Coins,
  QrCode,
  CreditCard,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Briefcase,
  Send,
  Lock,
} from 'lucide-react';

interface PlansViewProps {
  currentUser: UserProfile | null;
  initialRole?: 'candidate' | 'company';
  onSelectPlan: (plan: PricingPlan, period: PlanPeriod) => void;
  onSelectCreditPackage?: (pkg: CreditPackage) => void;
  onOpenAuth: (type?: 'candidate' | 'company', mode?: 'login' | 'register') => void;
  onNavigate?: (view: any, subTab?: string) => void;
  onCreditsUpdated?: (newBalance: number) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

type PackageFilter = 'all' | 'candidate' | 'company';

export const PlansView: React.FC<PlansViewProps> = ({
  currentUser,
  onSelectCreditPackage,
  onOpenAuth,
  onCreditsUpdated,
  showToast,
}) => {
  const [filter, setFilter] = useState<PackageFilter>('all');
  const [orders, setOrders] = useState<CreditOrder[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [gatewayReady, setGatewayReady] = useState(true);

  const loadHistory = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoadingHistory(true);
    try {
      const data = await getUserCreditsHistory(currentUser.uid);
      setOrders(data.orders);
      setTransactions(data.transactions);
    } finally {
      setLoadingHistory(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    getMercadoPagoConfig()
      .then(() => setGatewayReady(true))
      .catch(() => setGatewayReady(true));
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      loadHistory();
    } else {
      setOrders([]);
      setTransactions([]);
    }
  }, [currentUser?.uid, currentUser?.credits, loadHistory]);

  const handleVerifyOrder = async (orderId: string) => {
    if (!currentUser) return;
    try {
      setCheckingOrderId(orderId);
      const res = await checkCreditOrderStatus(currentUser, orderId);
      if (res.approved && typeof res.newBalance === 'number') {
        onCreditsUpdated?.(res.newBalance);
        showToast?.('Pagamento confirmado! Créditos adicionados à sua carteira.');
      } else {
        showToast?.('Pedido ainda aguarda confirmação de pagamento no Mercado Pago.');
      }
      await loadHistory();
    } catch {
      showToast?.('Não foi possível consultar o status deste pedido.', 'error');
    } finally {
      setCheckingOrderId(null);
    }
  };

  const allPackages: Array<{ pkg: CreditPackage; audience: 'candidate' | 'company' | 'both' }> = [
    { pkg: CREDIT_PACKAGES[0], audience: 'both' }, // 10 créditos — R$ 14,90
    { pkg: CANDIDATE_RESUME_CREDIT_PACKAGE, audience: 'both' }, // 15 créditos — R$ 19,90
    { pkg: CREDIT_PACKAGES[1], audience: 'both' }, // 35 créditos (30+5) — R$ 44,90
    { pkg: CREDIT_PACKAGES[2], audience: 'company' }, // 100 créditos (80+20) — R$ 109,90
  ];

  const visiblePackages = allPackages.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'candidate') return item.audience === 'candidate' || item.audience === 'both';
    return item.audience === 'company' || item.audience === 'both';
  });

  const currentCredits = currentUser?.credits ?? 0;

  return (
    <div id="creditos" className="min-h-screen bg-[#F4F7FE] py-8 md:py-12 scroll-mt-24">
      <div className="container-app max-w-6xl space-y-8">
        {/* 1. CABEÇALHO E CARTEIRA DO USUÁRIO */}
        <section className="bg-white border border-[#DBEAFE] rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wider text-[#2563EB]">
                <ShieldCheck className="w-4 h-4 text-[#1E40AF]" />
                <span>Pagamentos e Créditos · Checkout Oficial Mercado Pago</span>
                {gatewayReady && (
                  <span className="inline-flex items-center gap-1 text-[#059669] ml-1">
                    · Online
                  </span>
                )}
              </div>
              <h1 className="text-[24px] md:text-[32px] font-extrabold text-[#0F172A] tracking-tight leading-tight">
                Recarregue créditos sob demanda, sem mensalidade
              </h1>
              <p className="text-[14px] md:text-[15px] text-[#475569] leading-relaxed">
                Use seus créditos para se candidatar a vagas, gerar currículos em PDF com IA ou publicar e destacar vagas em Presidente Prudente e região. Seus créditos nunca expiram.
              </p>
            </div>

            {/* Card de Saldo Logado OU Card de Bônus de 1º Cadastro */}
            {currentUser ? (
              <div className="bg-gradient-to-br from-[#1E40AF] to-[#2563EB] text-white rounded-2xl p-5 md:p-6 min-w-[280px] sm:min-w-[320px] shadow-md flex flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                      Saldo da sua Carteira
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span
                        data-testid="plans-wallet-balance"
                        className="text-[32px] font-extrabold tracking-tight tabular-nums leading-none"
                      >
                        {currentCredits}
                      </span>
                      <span className="text-[14px] font-semibold text-blue-100">
                        créditos disponíveis
                      </span>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                    <Coins className="w-5 h-5 text-amber-300" />
                  </div>
                </div>

                <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2 text-[12px] text-blue-100">
                  <span>Conta: {currentUser.name}</span>
                  <button
                    type="button"
                    onClick={loadHistory}
                    disabled={loadingHistory}
                    className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-amber-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-5 md:p-6 min-w-[280px] sm:min-w-[330px] flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#1E40AF]">
                    <Sparkles className="w-4 h-4 text-[#2563EB]" />
                    <span>Vantagem de 1º Cadastro</span>
                  </div>
                  <p className="text-[18px] font-extrabold text-[#0F172A] leading-snug">
                    Ganhe {INITIAL_FREE_CREDITS} créditos grátis ao criar sua conta
                  </p>
                  <p className="text-[12px] text-[#475569] leading-relaxed">
                    Teste a plataforma gratuitamente sem precisar informar cartão de crédito.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenAuth('candidate', 'register')}
                  className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>Criar Conta e Ganhar {INITIAL_FREE_CREDITS} Créditos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* 2. SEPARAÇÃO VISUAL CLARA DE CONSUMO DE CRÉDITOS: CANDIDATOS (CPF) vs. EMPRESAS (CNPJ) */}
          <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#64748B] mb-3.5">
              Como utilizar seus créditos (Candidatos vs. Empresas)
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Card 1: Para Candidatos (CPF) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#DBEAFE] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    <h2 className="text-[14px] font-extrabold text-[#0F172A]">
                      Para Candidatos (CPF)
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    <Sparkles className="w-3 h-3" /> +{INITIAL_FREE_CREDITS} créditos grátis no cadastro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Send className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-[#0F172A]">Candidatar-se</div>
                        <div className="text-[11px] text-[#64748B]">Envio direto à empresa</div>
                      </div>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#1E40AF] tabular-nums shrink-0">
                      {APPLY_JOB_CREDIT_COST} cr
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-[#0F172A]">Gerar Currículo ATS</div>
                        <div className="text-[11px] text-[#64748B]">3 modelos em PDF com IA</div>
                      </div>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#1E40AF] tabular-nums shrink-0">
                      {RESUME_PDF_CREDIT_COST} cr
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Para Empresas (CNPJ) */}
              <div id="para-empresas" className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] border border-[#DBEAFE] space-y-3.5 scroll-mt-24">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1E40AF]" />
                    <h2 className="text-[14px] font-extrabold text-[#0F172A]">
                      Para Empresas (CNPJ)
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                    +{INITIAL_FREE_CREDITS} créditos grátis no 1º cadastro
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-[#0F172A]">Publicar vaga</div>
                        <div className="text-[11px] text-[#64748B]">Ativa por 30 dias no mural</div>
                      </div>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#1E40AF] tabular-nums shrink-0">
                      {POST_JOB_CREDIT_COST} cr
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#2563EB] shrink-0" />
                      <div>
                        <div className="text-[13px] font-bold text-[#0F172A]">Destacar vaga no topo</div>
                        <div className="text-[11px] text-[#64748B]">Prioridade nas buscas</div>
                      </div>
                    </div>
                    <span className="text-[13px] font-extrabold text-[#1E40AF] tabular-nums shrink-0">
                      {BOOST_JOB_CREDIT_COST} cr
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. SELETOR DE PACOTES DE CRÉDITOS */}
        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-extrabold text-[#0F172A]">
                Escolha seu Pacote de Créditos
              </h2>
              <p className="text-[13px] text-[#64748B]">
                Liberação imediata via Pix ou Cartão de Crédito pelo Mercado Pago.
              </p>
            </div>

            {/* Filtro limpo por perfil */}
            <div className="inline-flex p-1 rounded-xl bg-white border border-[#DBEAFE] self-start">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-[#1E40AF] text-white'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Todos ({allPackages.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('candidate')}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                  filter === 'candidate'
                    ? 'bg-[#1E40AF] text-white'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Candidatos
              </button>
              <button
                type="button"
                onClick={() => setFilter('company')}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                  filter === 'company'
                    ? 'bg-[#1E40AF] text-white'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Empresas
              </button>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 gap-5 items-stretch ${
              visiblePackages.length === 4
                ? 'md:grid-cols-2 lg:grid-cols-4'
                : 'md:grid-cols-3'
            }`}
          >
            {visiblePackages.map(({ pkg }) => {
              const isHighlighted = Boolean(pkg.isFeatured);
              const displayBadge =
                pkg.id === 'pack_30'
                  ? 'Mais Popular / Melhor Custo-Benefício'
                  : pkg.badge;
              return (
                <div
                  key={pkg.id}
                  data-testid={`credit-card-${pkg.id}`}
                  className={`bg-white rounded-2xl p-6 flex flex-col justify-between relative transition-all ${
                    isHighlighted
                      ? 'border-2 border-[#2563EB] shadow-md'
                      : 'border border-[#DBEAFE] shadow-sm hover:border-[#93C5FD]'
                  }`}
                >
                  {displayBadge && (
                    <div
                      className={`text-[10px] font-extrabold uppercase tracking-wider mb-3 inline-flex self-start px-2.5 py-1 rounded-md ${
                        isHighlighted
                          ? 'bg-[#1E40AF] text-white'
                          : 'bg-[#EFF6FF] text-[#1E40AF]'
                      }`}
                    >
                      {displayBadge}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[17px] font-extrabold text-[#0F172A] leading-snug">
                          {pkg.title}
                        </h3>
                        <p className="text-[12px] text-[#64748B] mt-0.5">
                          {pkg.subtitle || pkg.description}
                        </p>
                      </div>
                      <div className="px-2.5 py-1.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-center shrink-0">
                        <span className="text-[17px] font-extrabold text-[#1E40AF] block leading-none tabular-nums">
                          +{pkg.totalCredits}
                        </span>
                        <span className="text-[9px] font-bold uppercase text-[#2563EB]">
                          créditos
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 pb-3 border-y border-[#F1F5F9]">
                      <div className="text-[11px] text-[#94A3B8] line-through tabular-nums">
                        De {formatPriceBRL(pkg.originalPrice)}
                      </div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-[28px] font-extrabold text-[#0F172A] tracking-tight tabular-nums">
                          {formatPriceBRL(pkg.price)}
                        </span>
                        <span className="text-[11px] font-medium text-[#64748B]">/ único</span>
                      </div>
                      <div className="text-[11px] font-semibold text-[#059669] mt-1 tabular-nums">
                        Sai a {formatPriceBRL(pkg.costPerCredit)} por crédito
                      </div>
                    </div>

                    <ul className="space-y-2">
                      {pkg.features.slice(0, 4).map((feature, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-[12px] text-[#334155] leading-snug"
                        >
                          <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-5 mt-5 border-t border-[#F1F5F9] space-y-2">
                    <button
                      type="button"
                      data-testid={`buy-credit-pkg-${pkg.id}`}
                      onClick={() => onSelectCreditPackage?.(pkg)}
                      className={`w-full min-h-[44px] px-4 py-2.5 rounded-xl text-[13px] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                        isHighlighted
                          ? 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white shadow-sm'
                          : 'bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1E40AF]'
                      }`}
                    >
                      <span>Comprar +{pkg.totalCredits} Créditos</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <div className="flex items-center justify-center gap-3 text-[11px] text-[#64748B]">
                      <span className="inline-flex items-center gap-1">
                        <QrCode className="w-3 h-3 text-[#009EE3]" /> Pix Imediato
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-[#2563EB]" /> Cartão até 12x
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. HISTÓRICO DE PEDIDOS E EXTRATO (VISÍVEL PARA USUÁRIO LOGADO) */}
        {currentUser && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pedidos Mercado Pago */}
            <div className="bg-white border border-[#DBEAFE] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-[16px] font-bold text-[#0F172A]">
                    Meus Pedidos (Mercado Pago)
                  </h3>
                  <p className="text-[12px] text-[#64748B]">
                    Histórico de recargas via Pix e Cartão
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-[#059669] bg-[#ECFDF5] px-2.5 py-1 rounded-md border border-[#A7F3D0]">
                  Zero Duplicidade
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="p-8 text-center text-[13px] text-[#64748B]">
                  Nenhum pedido de recarga realizado ainda. Ao escolher um pacote acima, seu pedido aparecerá aqui em tempo real.
                </div>
              ) : (
                <div className="divide-y divide-[#F1F5F9] max-h-[340px] overflow-y-auto">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#0F172A] truncate">
                            {ord.packageName}
                          </span>
                          <span className="text-[12px] font-extrabold text-[#2563EB] tabular-nums">
                            +{ord.credits} cr
                          </span>
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono truncate">
                          {ord.id} · {formatDate(ord.processedAt || ord.createdAt)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[13px] font-bold text-[#0F172A] tabular-nums">
                          {formatPriceBRL(ord.amount)}
                        </span>
                        {ord.status === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ECFDF5] text-[#059669]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Creditado
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleVerifyOrder(ord.id)}
                            disabled={checkingOrderId === ord.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#B45309] transition-colors cursor-pointer"
                          >
                            <Clock className="w-3 h-3" />
                            <span>
                              {checkingOrderId === ord.id ? 'Verificando...' : 'Confirmar'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Extrato de Créditos */}
            <div className="bg-white border border-[#DBEAFE] rounded-2xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#F1F5F9] flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-[16px] font-bold text-[#0F172A]">
                    Extrato de Movimentações
                  </h3>
                  <p className="text-[12px] text-[#64748B]">
                    Entradas de pacotes, bônus inicial e uso na plataforma
                  </p>
                </div>
                <span className="text-[12px] font-bold text-[#1E40AF] tabular-nums">
                  Saldo: {currentCredits} cr
                </span>
              </div>

              <div className="divide-y divide-[#F1F5F9] max-h-[340px] overflow-y-auto">
                {transactions.map((tx) => {
                  const isDebit = tx.type === 'debit' || tx.type === 'usage' || tx.amount < 0;
                  const absAmount = Math.abs(tx.amount);
                  return (
                    <div
                      key={tx.id}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8FAFC]"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-[13px] font-medium text-[#0F172A] truncate">
                          {tx.description}
                        </div>
                        <div className="text-[11px] text-[#64748B] tabular-nums">
                          {formatDate(tx.createdAt)} · Saldo após: {tx.balanceAfter} cr
                        </div>
                      </div>
                      <span
                        className={`text-[13px] font-extrabold tabular-nums shrink-0 ${
                          isDebit ? 'text-[#475569]' : 'text-[#059669]'
                        }`}
                      >
                        {isDebit ? `-${absAmount}` : `+${absAmount}`} cr
                      </span>
                    </div>
                  );
                })}

                {/* Linha permanente do Bônus de 1º Cadastro */}
                <div className="p-4 flex items-center justify-between gap-3 bg-[#F8FAFC]/60">
                  <div className="space-y-0.5">
                    <div className="text-[13px] font-medium text-[#0F172A]">
                      Bônus de Boas-Vindas (1º Cadastro Gratuito)
                    </div>
                    <div className="text-[11px] text-[#64748B]">
                      Créditos iniciais concedidos gratuitamente na criação da conta
                    </div>
                  </div>
                  <span className="text-[13px] font-extrabold text-[#059669] tabular-nums shrink-0">
                    +{INITIAL_FREE_CREDITS} cr
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 5. RODAPÉ DE SEGURANÇA MERCADO PAGO */}
        <section className="bg-white border border-[#DBEAFE] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-[12px] text-[#475569]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#1E40AF] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-[#0F172A] block">
                Ambiente Seguro Integrado ao Mercado Pago
              </span>
              <span>
                Os preços e quantidades de créditos são validados no servidor com proteção contra cobrança ou crédito duplicado.
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[12px] font-semibold text-[#1E40AF] shrink-0">
            <span>Pix Copia e Cola / QR Code</span>
            <span>·</span>
            <span>Cartão em até 12x</span>
            <span>·</span>
            <span>Créditos sem validade</span>
          </div>
        </section>
      </div>
    </div>
  );
};
