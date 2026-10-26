import React from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  show: boolean;
  message: string;
  type?: 'success' | 'error';
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ show, message, type = 'success', onClose }) => {
  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-md w-[calc(100vw-2rem)] sm:w-auto"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-[12px] shadow-lg border bg-[#FFFFFF] ${
          type === 'error'
            ? 'border-[#C0393B]/30 text-[#C0393B]'
            : 'border-[#E2E8F0] text-[#202938]'
        }`}
      >
        {type === 'error' ? (
          <AlertCircle className="w-4 h-4 text-[#C0393B] shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-[#16835D] shrink-0" />
        )}
        <span className="font-medium text-[14px] flex-1 leading-snug">{message}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar notificação"
          className="text-[#64748B] hover:text-[#202938] p-1 rounded-[6px] hover:bg-[#F3F5F8] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
