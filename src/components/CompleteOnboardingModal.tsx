import React, { useState } from 'react';
import { Gift, ShieldCheck, Building2, Loader2, AlertCircle } from 'lucide-react';
import { UserProfile } from '../types';
import {
  formatCPF,
  formatCNPJ,
  formatPhone,
  REGIONAL_CITIES,
} from '../utils/matchAlgorithm';
import { formatCEP, isValidCEP, normalizeCEP } from '../utils/validation';
import {
  validateCPF,
  validateCNPJMath,
  normalizeDocument,
  verifyCNPJWithReceita,
  CnpjVerificationResult,
} from '../services/cnpjService';
import { completeUserOnboarding } from '../services/usersService';
import { lookupAddressByCep } from '../services/cepService';
import { INITIAL_WELCOME_CREDITS } from '../shared/creditPackages';

interface CompleteOnboardingModalProps {
  isOpen?: boolean;
  user?: {
    uid: string;
    email: string;
    name?: string;
    phone?: string;
  };
  userName?: string;
  userEmail?: string;
  onSuccess?: (updatedProfile: UserProfile) => void;
  onCompleted?: () => void | Promise<void>;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const CompleteOnboardingModal: React.FC<CompleteOnboardingModalProps> = ({
  isOpen = true,
  user,
  userName,
  userEmail,
  onSuccess,
  onCompleted,
  showToast,
}) => {
  const [role, setRole] = useState<'candidate' | 'company'>('candidate');
  const [documentInput, setDocumentInput] = useState('');
  const [name, setName] = useState(user?.name || userName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [city, setCity] = useState('Presidente Prudente, SP');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [cnpjInfo, setCnpjInfo] = useState<CnpjVerificationResult | null>(null);
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleDocumentChange = async (rawValue: string) => {
    setErrorMsg('');
    const digits = normalizeDocument(rawValue).slice(0, 14);
    if (digits.length > 11) {
      setRole('company');
      setDocumentInput(formatCNPJ(digits));
      if (digits.length === 14) {
        if (!validateCNPJMath(digits)) {
          setErrorMsg('CNPJ matematicamente inválido. Verifique os 14 dígitos.');
          setCnpjInfo(null);
          return;
        }
        setCheckingCnpj(true);
        const res = await verifyCNPJWithReceita(digits);
        setCheckingCnpj(false);
        setCnpjInfo(res);
        if (!res.active) {
          setErrorMsg(
            res.error ||
              'Este CNPJ encontra-se em situação cadastral inapta ou baixada na Receita Federal e não pode publicar vagas.'
          );
          return;
        }
        if (res.nomeFantasia || res.razaoSocial) {
          setName(res.nomeFantasia || res.razaoSocial);
        }
        if (res.cep) setCep(formatCEP(res.cep));
        if (res.logradouro) setStreet(res.logradouro);
        if (res.numero) setAddressNumber(res.numero);
        if (res.bairro) setNeighborhood(res.bairro);
        if (res.municipio) setCity(`${res.municipio}, ${res.uf || 'SP'}`);
      }
    } else {
      setRole('candidate');
      setCnpjInfo(null);
      setDocumentInput(formatCPF(digits));
    }
  };

  const handleCepChange = async (rawVal: string) => {
    const formatted = formatCEP(rawVal);
    setCep(formatted);
    const clean = normalizeCEP(formatted);
    if (clean.length === 8 && isValidCEP(clean)) {
      const addr = await lookupAddressByCep(clean);
      if (addr.success && addr.data) {
        setStreet(addr.data.street || street);
        setNeighborhood(addr.data.neighborhood || neighborhood);
        setCity(`${addr.data.city}, ${addr.data.state}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const digits = normalizeDocument(documentInput);

    if (role === 'candidate') {
      if (!validateCPF(digits)) {
        setErrorMsg('Informe um CPF válido (11 dígitos) para concluir seu cadastro.');
        return;
      }
    } else {
      if (!validateCNPJMath(digits)) {
        setErrorMsg('Informe um CNPJ válido (14 dígitos) para concluir seu cadastro empresarial.');
        return;
      }
      if (cnpjInfo && !cnpjInfo.active) {
        setErrorMsg(
          cnpjInfo.error ||
            'Este CNPJ encontra-se em situação cadastral inapta ou baixada na Receita Federal e não pode publicar vagas.'
        );
        return;
      }
    }

    if (phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Informe um telefone ou WhatsApp válido com DDD.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await completeUserOnboarding({
        uid: user?.uid,
        email: user?.email || userEmail,
        role,
        document: digits,
        name: name.trim() || user?.name || userName || 'Usuário PrudenEmpregos',
        phone: formatPhone(phone),
        city,
        lgpdAccepted: true,
        fiscalAddress: {
          cep: cep ? formatCEP(cep) : '',
          street: street.trim(),
          number: addressNumber.trim(),
          neighborhood: neighborhood.trim(),
          city,
          state: 'SP',
        },
        razaoSocial: cnpjInfo?.razaoSocial,
        nomeFantasia: cnpjInfo?.nomeFantasia,
      });

      showToast?.(
        updated.welcomeCreditsGranted
          ? `Cadastro concluído! Sua carteira foi ativada com +${INITIAL_WELCOME_CREDITS} créditos gratuitos.`
          : 'Cadastro concluído e carteira vinculada com sucesso!'
      );
      onSuccess?.(updated.profile);
      await onCompleted?.();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Não foi possível concluir o onboarding. Verifique os dados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-[2px]" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-onboarding-title"
        className="modal-surface w-full max-w-lg max-h-[92vh] overflow-y-auto relative z-10 bg-white rounded-2xl p-6 sm:p-7 shadow-xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#1D4ED8] text-white flex items-center justify-center shrink-0">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h2 id="complete-onboarding-title" className="text-[19px] font-bold text-[#0F172A]">
              Complete seu Cadastro e Libere +{INITIAL_WELCOME_CREDITS} Créditos
            </h2>
            <p className="text-[13px] text-[#475569] mt-0.5">
              Confirme seu CPF (Candidato) ou CNPJ ativo (Empresa) para ativar sua carteira gratuita.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#F4F7FE] rounded-xl border border-[#DBEAFE] mb-4">
          <button
            type="button"
            onClick={() => {
              setRole('candidate');
              setErrorMsg('');
            }}
            className={`min-h-[40px] px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
              role === 'candidate'
                ? 'bg-[#1D4ED8] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#1E40AF]'
            }`}
          >
            Sou Candidato (CPF)
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('company');
              setErrorMsg('');
            }}
            className={`min-h-[40px] px-3 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
              role === 'company'
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'text-[#475569] hover:text-[#1E40AF]'
            }`}
          >
            Sou Empresa (CNPJ)
          </button>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-[#FEF2F2] border border-[#D92D20]/20 text-[#D92D20] text-xs font-medium flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="onb-doc" className="form-label mb-0">
                {role === 'candidate' ? 'CPF (11 dígitos) *' : 'CNPJ (14 dígitos) *'}
              </label>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  role === 'company'
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {role === 'company'
                  ? 'Perfil Empresa identificado'
                  : 'Perfil Candidato identificado'}
              </span>
            </div>
            <div className="relative">
              <input
                id="onb-doc"
                type="text"
                inputMode="numeric"
                required
                value={documentInput}
                onChange={(e) => handleDocumentChange(e.target.value)}
                placeholder={role === 'candidate' ? '000.000.000-00' : '00.000.000/0001-00'}
                className="form-control tabular-nums"
              />
              {checkingCnpj && (
                <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin absolute right-3 top-3" />
              )}
            </div>
          </div>

          {role === 'company' && cnpjInfo && cnpjInfo.active && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1">
              <div className="flex items-center justify-between font-bold text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  Receita Federal: {cnpjInfo.situacaoCadastral}
                </span>
              </div>
              <p className="font-semibold">{cnpjInfo.razaoSocial}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="onb-name" className="form-label">
                {role === 'candidate' ? 'Nome completo *' : 'Nome Fantasia / Empresa *'}
              </label>
              <input
                id="onb-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-control"
              />
            </div>
            <div>
              <label htmlFor="onb-phone" className="form-label">
                WhatsApp / Telefone *
              </label>
              <input
                id="onb-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="(18) 99999-9999"
                className="form-control tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="onb-cep" className="form-label">
                CEP
              </label>
              <input
                id="onb-cep"
                type="text"
                inputMode="numeric"
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="19010-000"
                className="form-control tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="onb-city" className="form-label">
                Cidade / UF *
              </label>
              <select
                id="onb-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="form-control cursor-pointer"
              >
                {Array.from(new Set([city, ...REGIONAL_CITIES])).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || checkingCnpj}
            className="w-full btn-base btn-md btn-primary mt-2"
          >
            {submitting
              ? 'Validando documento e ativando carteira...'
              : `Concluir Cadastro e Liberar +${INITIAL_WELCOME_CREDITS} Créditos`}
          </button>

          <p className="text-[11px] text-[#64748B] text-center flex items-center justify-center gap-1 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Seus documentos são armazenados em cofre privado protegido pela LGPD.</span>
          </p>
        </form>
      </div>
    </div>
  );
};
