import React from 'react';
import { X } from 'lucide-react';

interface LgpdModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LgpdModal: React.FC<LgpdModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

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
        aria-labelledby="lgpd-title"
        className="modal-surface w-full max-w-xl max-h-[88vh] overflow-y-auto relative z-10 p-6 sm:p-7"
      >
        <div className="flex justify-between items-start gap-4 mb-5 border-b border-[#E2E8F0] pb-4">
          <div>
            <h2 id="lgpd-title" className="text-[20px] font-semibold text-[#202938]">
              Privacidade e Proteção de Dados (LGPD)
            </h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Conformidade com a Lei nº 13.709/2018
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar termos de privacidade"
            className="w-[40px] h-[40px] inline-flex items-center justify-center text-[#64748B] hover:text-[#202938] rounded-[8px] hover:bg-[#F3F5F8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-[14px] text-[#64748B] leading-[1.6]">
          <div>
            <h3 className="font-semibold text-[#202938] text-[15px] mb-1">
              1. Finalidade do uso dos dados
            </h3>
            <p>
              O PrudenEmpregos utiliza apenas os dados necessários para conectar candidatos a vagas de emprego de empresas de Presidente Prudente e região.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#202938] text-[15px] mb-1">
              2. Acesso restrito às empresas escolhidas
            </h3>
            <p>
              Seus dados de contato e currículo em PDF ficam visíveis somente para as empresas às quais você escolheu se candidatar.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#202938] text-[15px] mb-1">
              3. Direitos do titular
            </h3>
            <p>
              Você pode editar seu currículo, remover documentos em PDF ou cancelar candidaturas a qualquer momento diretamente no seu painel.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-base btn-md btn-primary"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
