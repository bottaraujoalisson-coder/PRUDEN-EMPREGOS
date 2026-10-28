import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

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
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#EFF4FF] text-[#1D4ED8] flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="lgpd-title" className="text-[20px] font-semibold text-[#202938]">
                Privacidade e Proteção de Dados (LGPD)
              </h2>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
              </p>
            </div>
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
              1. Finalidade e Minimização de Dados (Art. 6º, I e III)
            </h3>
            <p>
              O PrudenEmpregos coleta estritamente os dados necessários para conectar candidatos (Pessoa Física - CPF) a vagas de emprego de empresas verificadas (Pessoa Jurídica - CNPJ) de Presidente Prudente e região, bem como para prevenção a fraudes e unicidade cadastral.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#202938] text-[15px] mb-1">
              2. Sigilo Cadastral e Acesso Restrito
            </h3>
            <p>
              Seu CPF e endereço residencial nunca são exibidos publicamente no portal. Dados de contato e currículo em PDF ficam visíveis somente para as empresas às quais você escolheu ativamente se candidatar, podendo optar por ocultar o CPF no PDF gerado.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#202938] text-[15px] mb-1">
              3. Direitos do Titular (Art. 18 da LGPD)
            </h3>
            <p>
              Você pode consultar, corrigir, exportar seu currículo em PDF, remover anexos ou retirar candidaturas a qualquer momento diretamente no Painel do Candidato.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#202938] text-[15px] mb-1">
              4. Segurança da Informação e Retenção
            </h3>
            <p>
              Senhas são protegidas com derivação criptográfica PBKDF2-HMAC-SHA256 (100.000 iterações), comunicações trafegam exclusivamente sob HTTPS/TLS e o controle de acesso é validado por regras de segurança em nível de documento.
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
