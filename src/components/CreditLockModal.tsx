import React from 'react';
import { X, Coins, AlertTriangle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { CREDIT_PACKAGES, CANDIDATE_RESUME_CREDIT_PACKAGE, CreditPackage } from '../utils/creditsData';
import { UserProfile } from '../types';

interface CreditLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  requiredCredits: number;
  actionTitle: string;
  actionDescription: string;
  onBuyCredits: (planId: string) => void;
  onOpenPlansView?: () => void;
}

export const CreditLockModal: React.FC<CreditLockModalProps> = ({
  isOpen,
  onClose,
  user,
  requiredCredits,
  actionTitle,
  actionDescription,
  onBuyCredits,
  onOpenPlansView,
}) => {
  if (!isOpen || !user) return null;

  const currentCredits = Number(user.credits || 0);
  const missingCredits = Math.max(0, requiredCredits - currentCredits);
  const isCompany = user.type === 'company' || user.role === 'company' || user.role === 'admin';
  const plans: CreditPackage[] = isCompany
    ? CREDIT_PACKAGES
    : [CANDIDATE_RESUME_CREDIT_PACKAGE, ...CREDIT_PACKAGES.slice(0, 2)];

  return (
    <div
      className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-slate-900 text-white px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 block">
                Saldo Insuficiente para Prosseguir
              </span>
              <h3 className="text-lg font-extrabold text-white leading-tight">
                {actionTitle}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar alerta de créditos"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            {actionDescription}
          </p>

          <div className="grid grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Seu saldo atual</span>
              <span className="text-base font-extrabold text-slate-900">{currentCredits} cr</span>
            </div>
            <div className="border-x border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block">Custo da ação</span>
              <span className="text-base font-extrabold text-blue-700">{requiredCredits} cr</span>
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Faltam</span>
              <span className="text-base font-extrabold text-rose-600">+{missingCredits} cr</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-blue-600" />
              Escolha um pacote com liberação imediata:
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    plan.isFeatured
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{plan.title}</span>
                      <span className="text-xs font-extrabold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                        +{plan.totalCredits} créditos
                      </span>
                      {plan.isFeatured && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Mais escolhido
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      R$ {plan.price.toFixed(2).replace('.', ',')} • Não expira
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onBuyCredits(plan.id);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
                      plan.isFeatured
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Coins size={14} />
                    Recarregar
                    <ArrowRight size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              Checkout seguro via Pix ou Cartão
            </span>
            {onOpenPlansView && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlansView();
                }}
                className="font-bold text-blue-600 hover:text-blue-800"
              >
                Ver todos os pacotes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
