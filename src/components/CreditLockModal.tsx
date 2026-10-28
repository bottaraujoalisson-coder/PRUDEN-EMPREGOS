import React from 'react';
import { UserProfile } from '../types';
import {
  CREDIT_PACKAGES,
  CANDIDATE_RESUME_CREDIT_PACKAGE,
  CreditPackage,
  POST_JOB_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
  APPLY_JOB_CREDIT_COST,
  RESUME_PDF_CREDIT_COST,
} from '../utils/creditsData';
import { formatPriceBRL } from '../utils/plansData';
import { X, Coins, Check, ShieldCheck, ArrowRight } from 'lucide-react';

interface CreditLockModalProps {
  isOpen: boolean;
  user?: UserProfile | null;
  currentCredits?: number;
  requiredCredits: number;
  actionTitle?: string;
  actionDescription?: string;
  actionLabel?: string;
  onClose: () => void;
  onSelectPackage?: (pkg: CreditPackage) => void;
  onBuyCredits?: (planId: string) => void;
  onOpenPlansView?: () => void;
}

export const CreditLockModal: React.FC<CreditLockModalProps> = ({
  isOpen,
  user,
  currentCredits,
  requiredCredits,
  actionTitle,
  actionDescription,
  actionLabel,
  onClose,
  onSelectPackage,
  onBuyCredits,
  onOpenPlansView,
}) => {
  if (!isOpen) return null;

  const resolvedCurrentCredits =
    typeof currentCredits === 'number' ? currentCredits : Number(user?.credits ?? 0);
  const missingCredits = Math.max(1, requiredCredits - resolvedCurrentCredits);
  const resolvedTitle = actionTitle || actionLabel || 'continuar esta ação';
  const packages = [CANDIDATE_RESUME_CREDIT_PACKAGE, ...CREDIT_PACKAGES];

  const handleChoosePackage = (pkg: CreditPackage) => {
    onClose();
    if (onSelectPackage) {
      onSelectPackage(pkg);
    } else if (onBuyCredits) {
      onBuyCredits(pkg.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-lock-title"
    >
      <div className="bg-white border border-[#DBEAFE] rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto">
        <div className="bg-gradient-to-r from-[#1E3A8A] via-[#1E40AF] to-[#2563EB] p-6 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Coins className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-200">
                Saldo Insuficiente · Faltam {missingCredits} créditos
              </span>
              <h2 id="credit-lock-title" className="text-[20px] font-extrabold leading-snug mt-0.5">
                {resolvedTitle}
              </h2>
              <p className="text-[13px] text-blue-100 mt-0.5">
                {actionDescription || (
                  <>
                    Esta ação requer <strong>{requiredCredits} créditos</strong> e seu saldo atual é de{' '}
                    <strong>{resolvedCurrentCredits} créditos</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-2xl p-5 flex flex-col justify-between relative transition-all ${
                  pkg.isFeatured
                    ? 'border-2 border-[#2563EB] bg-[#F8FAFC] shadow-md'
                    : 'border border-[#DBEAFE] bg-white hover:border-[#93C5FD]'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-[15px] font-extrabold text-[#0F172A] leading-snug">
                        {pkg.title}
                      </h3>
                      <p className="text-[11px] text-[#64748B]">
                        {pkg.subtitle || pkg.description}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[13px] font-extrabold text-[#1E40AF] tabular-nums shrink-0">
                      +{pkg.totalCredits} cr
                    </span>
                  </div>

                  <div className="py-2.5 border-y border-[#E2E8F0]">
                    <div className="text-[11px] text-[#94A3B8] line-through tabular-nums">
                      De {formatPriceBRL(pkg.originalPrice)}
                    </div>
                    <div className="text-[24px] font-extrabold text-[#0F172A] tabular-nums leading-tight">
                      {formatPriceBRL(pkg.price)}
                    </div>
                    <div className="text-[11px] font-semibold text-[#059669] tabular-nums">
                      {formatPriceBRL(pkg.costPerCredit)} por crédito
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {pkg.features.slice(0, 3).map((feat, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-1.5 text-[11px] text-[#334155] leading-snug"
                      >
                        <Check className="w-3.5 h-3.5 text-[#2563EB] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleChoosePackage(pkg)}
                  className={`mt-4 w-full min-h-[42px] px-3 py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    pkg.isFeatured
                      ? 'bg-[#1E40AF] hover:bg-[#1E3A8A] text-white'
                      : 'bg-[#EFF6FF] hover:bg-[#DBEAFE] text-[#1E40AF]'
                  }`}
                >
                  <span>Escolher +{pkg.totalCredits} cr</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>Checkout Oficial Mercado Pago · Pix Instantâneo ou Cartão em até 12x</span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                Candidatar-se: {APPLY_JOB_CREDIT_COST} cr · Currículo IA: {RESUME_PDF_CREDIT_COST} cr · Publicar: {POST_JOB_CREDIT_COST} cr · Destacar: {BOOST_JOB_CREDIT_COST} cr
              </span>
              {onOpenPlansView && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenPlansView();
                  }}
                  className="font-bold text-[#1E40AF] hover:underline cursor-pointer"
                >
                  Ver Central de Créditos
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
