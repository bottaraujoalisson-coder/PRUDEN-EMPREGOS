import React, { useState } from 'react';
import { X } from 'lucide-react';
import { submitReport } from '../services/reportsService';

interface ReportModalProps {
  isOpen: boolean;
  targetType: 'job' | 'company' | 'user';
  targetId: string;
  targetTitle: string;
  reporterId?: string;
  onClose: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  targetType,
  targetId,
  targetTitle,
  reporterId,
  onClose,
  showToast,
}) => {
  const [reasonCategory, setReasonCategory] = useState('Cobrança indevida para participar');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterId) {
      showToast('Entre na sua conta para reportar uma vaga.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const fullReason = `[${reasonCategory}] ${details.trim()}`;
      await submitReport(reporterId, targetType, targetId, targetTitle, fullReason);
      showToast('Relato enviado para análise da moderação.');
      onClose();
    } catch {
      showToast('Erro ao registrar relato. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#202938]/55"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        className="modal-surface w-full max-w-[440px] overflow-hidden relative z-10 p-6"
      >
        <div className="flex justify-between items-start gap-3 mb-4 pb-3 border-b border-[#E2E8F0]">
          <div>
            <h3 id="report-modal-title" className="text-[18px] font-semibold text-[#202938]">
              Reportar vaga
            </h3>
            <p className="text-[13px] text-[#64748B] line-clamp-1 mt-0.5">{targetTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal de denúncia"
            className="w-[40px] h-[40px] inline-flex items-center justify-center text-[#64748B] hover:text-[#202938] rounded-[8px] hover:bg-[#F3F5F8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="report-reason" className="form-label">
              Motivo
            </label>
            <select
              id="report-reason"
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="form-control cursor-pointer"
            >
              <option>Cobrança indevida para participar</option>
              <option>Vaga enganosa / Anúncio suspeito</option>
              <option>Solicitação indevida de dados pessoais</option>
              <option>Conteúdo inadequado</option>
              <option>Outro motivo</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-details" className="form-label">
              Observações (opcional)
            </label>
            <textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Descreva brevemente o problema..."
              className="form-control"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-base btn-md btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-base btn-md btn-danger-solid"
            >
              {submitting ? 'Enviando...' : 'Enviar relato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
