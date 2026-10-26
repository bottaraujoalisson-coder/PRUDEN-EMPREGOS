import React, { useState } from 'react';
import { UserProfile, PlanPeriod, PricingPlan } from '../types';
import { formatPriceBRL } from '../utils/plansData';
import {
  CREDIT_PACKAGES,
  CREDIT_TRUST_BAR_ITEMS,
  HERO_VALUE_PROPOSITION,
  CreditPackage,
} from '../utils/creditsData';
import {
  Check,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  Coins,
  Zap,
  Lock,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

interface PlansViewProps {
  currentUser: UserProfile | null;
  initialRole?: 'company' | 'candidate';
  onSelectPlan?: (plan: PricingPlan, period: PlanPeriod) => void;
  onSelectCreditPackage?: (pkg: CreditPackage) => void;
  onNavigate: (view: string, subTab?: string) => void;
  onOpenAuth: (type: 'candidate' | 'company', mode?: 'login' | 'register') => void;
}

const CREDITS_FAQ = [
  {
    question: 'Como funciona a compra de pacotes de créditos pelo Mercado Pago?',
    answer:
      'Você escolhe um dos pacotes de créditos acima e realiza o pagamento único via Pix instantâneo ou Cartão de Crédito (em até 12x) pelo Mercado Pago. Assim que o pagamento é aprovado oficialmente, os créditos são adicionados automaticamente na carteira da sua conta.',
  },
  {
    question: 'Os créditos comprados possuem prazo de validade ou mensalidade?',
    answer:
      'Não! Todos os pacotes são de pagamento único, sem assinatura recorrente e sem fidelidade. Seus créditos são cumulativos e permanecem disponíveis na sua carteira até serem utilizados.',
  },
  {
    question: 'É seguro comprar créditos? Existe risco de cobrança ou crédito duplicado?',
    answer:
      'Sim, 100% seguro. A integração utiliza o Mercado Pago com validação server-side de valores e trava de idempotência por pedido e por paymentId, garantindo que cada pagamento aprovado seja processado exatamente uma única vez.',
  },
  {
    question: 'Como funciona a Garantia Incondicional de 7 dias?',
    answer:
      'Sua compra conta com a proteção do Mercado Pago. Caso desista da compra dos créditos não utilizados dentro de até 7 dias corridos, você pode solicitar o reembolso integral sem burocracia.',
  },
  {
    question: 'Minha empresa recebe comprovante e histórico das transações?',
    answer:
      'Sim! No Painel da Empresa, na aba "Carteira de Créditos", você consulta em tempo real o saldo atualizado, o status de cada pedido no Mercado Pago e o extrato auditável de todas as recargas realizadas.',
  },
];

export const PlansView: React.FC<PlansViewProps> = ({
  currentUser,
  onSelectCreditPackage,
  onNavigate,
}) => {
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F4F6FA] pb-14">
      {/* 1. CLAREZA DE VALOR E ENQUADRAMENTO NO TOPO (Prevenção de Dúvidas e Aversão à Perda) */}
      <section className="bg-[#0B1F3A] text-white border-b border-[#1E3A8A] pt-9 pb-12 md:py-15">
        <div className="container-app text-center max-w-3xl space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#93C5FD] border border-white/15">
            <Sparkles className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <span>Carteira Digital de Créditos · Pagamento Único via Mercado Pago</span>
          </div>

          <h1 className="text-[24px] sm:text-[28px] md:text-[38px] font-bold text-white tracking-tight leading-tight">
            {HERO_VALUE_PROPOSITION.title}
          </h1>

          <p className="text-[14px] sm:text-[15px] md:text-[17px] text-slate-200 leading-relaxed max-w-2xl mx-auto">
            {HERO_VALUE_PROPOSITION.subtitle}
          </p>

          {/* Pílula/Banner de transparência rápida explicando a regra de uso */}
          <div className="pt-1">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#132A4A]/95 border border-[#38BDF8]/30 text-[12px] sm:text-[13px] font-semibold text-[#E0F2FE] shadow-xs">
              <Zap className="w-4 h-4 text-[#38BDF8] shrink-0" />
              <span>{HERO_VALUE_PROPOSITION.transparencyPill}</span>
            </div>
          </div>

          {currentUser && (
            <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#132A4A] border border-white/15 text-sm text-white">
                <Coins className="w-4 h-4 text-[#38BDF8]" />
                <span>Seu saldo atual na carteira:</span>
                <strong className="text-[#38BDF8] font-extrabold tabular-nums">
                  {currentUser.credits ?? 5} créditos
                </strong>
              </div>
              {currentUser.type === 'company' && (
                <button
                  type="button"
                  onClick={() => onNavigate('company', 'credits')}
                  className="text-xs font-semibold text-[#93C5FD] hover:text-white underline cursor-pointer"
                >
                  Ver extrato e histórico de pedidos →
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 2 & 3 & 4. VIÉS DA ANCORAGEM (Mobile-First Order), LIMPEZA VISUAL E CTAs OTIMIZADOS */}
      <section className="container-app -mt-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {CREDIT_PACKAGES.map((pkg) => {
            const isRecommended = Boolean(pkg.isFeatured);
            return (
              <div
                key={pkg.id}
                className={`surface-card p-6 md:p-7 flex flex-col justify-between relative rounded-2xl transition-all ${
                  isRecommended
                    ? 'order-first lg:order-none border-2 border-[#009EE3] shadow-xl lg:-translate-y-2 bg-white'
                    : 'border border-[#CBD5E1] shadow-xs bg-white'
                }`}
              >
                {pkg.badge && (
                  <div
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-1 px-3.5 rounded-full shadow-xs whitespace-nowrap ${
                      pkg.badgeVariant === 'featured'
                        ? 'bg-[#009EE3] text-white'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {pkg.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div>
                      <h2 className="text-[19px] sm:text-[20px] font-bold text-[#0F172A]">
                        {pkg.title}
                      </h2>
                      <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>
                    <div
                      className={`px-3.5 py-2 rounded-xl text-center shrink-0 ${
                        isRecommended
                          ? 'bg-[#EFF6FF] border border-[#93C5FD]'
                          : 'bg-[#F8FAFC] border border-[#E2E8F0]'
                      }`}
                    >
                      <span
                        className={`text-[20px] font-extrabold block leading-none tabular-nums ${
                          isRecommended ? 'text-[#009EE3]' : 'text-[#0F172A]'
                        }`}
                      >
                        +{pkg.totalCredits}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider ${
                          isRecommended ? 'text-[#1E40AF]' : 'text-[#475569]'
                        }`}
                      >
                        Créditos
                      </span>
                    </div>
                  </div>

                  {/* Price Box */}
                  <div className="pt-2 pb-4 border-b border-[#E2E8F0]">
                    <div className="text-[12px] text-[#94A3B8] line-through font-medium tabular-nums">
                      De {formatPriceBRL(pkg.originalPrice)}
                    </div>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-[32px] md:text-[36px] font-extrabold text-[#0F172A] tabular-nums whitespace-nowrap">
                        {formatPriceBRL(pkg.price)}
                      </span>
                      <span className="text-[13px] text-[#64748B] font-medium whitespace-nowrap">
                        / pagamento único
                      </span>
                    </div>
                    <div className="text-[12px] font-bold text-[#16835D] mt-1 tabular-nums">
                      Sai por apenas {formatPriceBRL(pkg.costPerCredit)} cada crédito
                      {pkg.bonusCredits > 0 ? ` (inclui +${pkg.bonusCredits} de bônus)` : ''}
                    </div>
                  </div>

                  {/* Padronizados e enxutos bullets de benefícios (3 a 4 itens por pacote) */}
                  <div className="space-y-2.5 pt-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#475569] block">
                      Diferenciais do pacote:
                    </span>
                    <ul className="space-y-2.5">
                      {pkg.features.map((feat, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2.5 text-[13px] text-[#334155] leading-snug"
                        >
                          <Check className="w-4 h-4 text-[#16835D] shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 4. OTIMIZAÇÃO DOS BOTÕES DE AÇÃO (CTAs) - sem texto repetitivo abaixo */}
                <div className="pt-5 mt-6 border-t border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => onSelectCreditPackage?.(pkg)}
                    className={`w-full min-h-[48px] btn-base btn-md font-bold text-[14px] cursor-pointer transition-all ${
                      isRecommended
                        ? 'bg-[#009EE3] hover:bg-[#0086C3] text-white shadow-md'
                        : 'btn-primary'
                    }`}
                  >
                    {pkg.ctaLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. BARRA COMPACTA DE CONFIANÇA ÚNICA (Trust Bar) logo abaixo dos cards */}
        <div className="mt-5 bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] sm:text-[13px] font-semibold text-[#334155]">
            {CREDIT_TRUST_BAR_ITEMS.map((item, index) => (
              <div key={index} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#16835D] shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HEURÍSTICA DO AFETO E COMPACTAÇÃO DO FINAL DA PÁGINA ("Como funciona" mais compacto no mobile) */}
      <section className="container-app mt-8 md:mt-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-5">
          <div className="surface-card p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-[#CBD5E1] flex items-center md:items-start gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#009EE3] flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="text-[14px] md:text-[15px] font-bold text-[#0F172A] leading-snug">
                1. Escolha seu Pacote
              </h3>
              <p className="text-[12px] md:text-[13px] text-[#64748B] mt-0.5 leading-snug">
                Selecione o volume ideal com bônus progressivos sem mensalidade.
              </p>
            </div>
          </div>

          <div className="surface-card p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-[#CBD5E1] flex items-center md:items-start gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#ECFDF5] border border-[#BBF7D0] text-[#16835D] flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="text-[14px] md:text-[15px] font-bold text-[#0F172A] leading-snug">
                2. Pague com Mercado Pago
              </h3>
              <p className="text-[12px] md:text-[13px] text-[#64748B] mt-0.5 leading-snug">
                Pix instantâneo ou cartão em até 12x vinculado à sua conta.
              </p>
            </div>
          </div>

          <div className="surface-card p-3.5 md:p-5 rounded-xl md:rounded-2xl border border-[#CBD5E1] flex items-center md:items-start gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#009EE3] flex items-center justify-center shrink-0">
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h3 className="text-[14px] md:text-[15px] font-bold text-[#0F172A] leading-snug">
                3. Liberação Automática
              </h3>
              <p className="text-[12px] md:text-[13px] text-[#64748B] mt-0.5 leading-snug">
                Créditos entram na hora na carteira após aprovação oficial.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Box */}
      <section className="container-app mt-8">
        <div className="p-5 md:p-7 bg-white border border-[#CBD5E1] rounded-2xl shadow-xs flex flex-col md:flex-row items-center gap-4 md:gap-6">
          <div className="w-13 h-13 md:w-15 md:h-15 rounded-2xl bg-[#ECFDF5] border border-[#16835D]/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 md:w-8 md:h-8 text-[#16835D]" />
          </div>

          <div className="flex-1 space-y-1 text-center md:text-left">
            <h3 className="text-[16px] md:text-[18px] font-bold text-[#0F172A]">
              Garantia Incondicional de 7 Dias com o Mercado Pago
            </h3>
            <p className="text-[13px] md:text-[14px] text-[#475569] leading-relaxed">
              Compre seus créditos com total tranquilidade. Se dentro dos primeiros 7 dias você não utilizar o pacote e desejar o estorno, devolvemos 100% do seu valor direto pelo Mercado Pago sem burocracia.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
            <div className="text-center px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">
                Segurança
              </span>
              <span className="text-[12px] font-bold text-[#009EE3]">Mercado Pago SSL</span>
            </div>
            <div className="text-center px-3.5 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <span className="text-[10px] font-bold text-[#64748B] block uppercase tracking-wider">
                Liberação
              </span>
              <span className="text-[12px] font-bold text-[#16835D]">Pix Imediato</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container-app mt-10 max-w-3xl">
        <div className="text-center mb-5">
          <h3 className="text-[20px] md:text-[22px] font-bold text-[#0F172A]">
            Perguntas frequentes sobre os pacotes de créditos
          </h3>
          <p className="text-[13px] md:text-[14px] text-[#64748B] mt-1">
            Tire suas dúvidas sobre pagamento via Mercado Pago, validade dos créditos e segurança.
          </p>
        </div>

        <div className="space-y-2.5">
          {CREDITS_FAQ.map((faq, idx) => {
            const isExpanded = expandedFaqIndex === idx;
            return (
              <div
                key={idx}
                className="surface-card overflow-hidden border border-[#CBD5E1] rounded-xl bg-white"
              >
                <button
                  type="button"
                  onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}
                  className="w-full text-left p-4 flex items-center justify-between gap-3 font-semibold text-[14px] md:text-[15px] text-[#0F172A] hover:bg-[#F8FAFC] transition-colors cursor-pointer min-h-[48px]"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-[#009EE3] shrink-0" />
                    <span>{faq.question}</span>
                  </span>
                  <span className="text-lg font-bold text-[#64748B] shrink-0">
                    {isExpanded ? '−' : '+'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="p-4 pt-3 text-[13px] md:text-[14px] text-[#475569] leading-relaxed border-t border-[#E2E8F0] bg-[#F8FAFC]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
