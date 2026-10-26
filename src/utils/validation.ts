import { UserProfile, ResumeExperience, ResumeEducation } from '../types';

/**
 * Remove todos os caracteres não numéricos de uma string.
 */
export function normalizeDigits(value?: string | null): string {
  if (!value) return '';
  return String(value).replace(/\D/g, '');
}

/**
 * Normaliza CPF (retorna até 11 dígitos apenas numéricos).
 */
export function normalizeCPF(value?: string | null): string {
  return normalizeDigits(value).slice(0, 11);
}

/**
 * Normaliza CNPJ (retorna até 14 dígitos apenas numéricos).
 */
export function normalizeCNPJ(value?: string | null): string {
  return normalizeDigits(value).slice(0, 14);
}

/**
 * Normaliza CEP (retorna até 8 dígitos apenas numéricos).
 */
export function normalizeCEP(value?: string | null): string {
  return normalizeDigits(value).slice(0, 8);
}

/**
 * Formata CEP no padrão 00000-000.
 */
export function formatCEP(value?: string | null): string {
  const digits = normalizeCEP(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

/**
 * Valida se o CEP possui exatamente 8 dígitos numéricos válidos.
 */
export function isValidCEP(cep?: string | null): boolean {
  const clean = normalizeDigits(cep);
  if (clean.length !== 8) return false;
  if (/^0{8}$/.test(clean)) return false;
  return true;
}

/**
 * Formata CPF no padrão 000.000.000-00.
 */
export function formatCPF(value?: string | null): string {
  const digits = normalizeCPF(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Validação rigorosa de CPF com cálculo oficial dos 2 dígitos verificadores (Módulo 11).
 */
export function isValidCPF(cpf?: string | null): boolean {
  const clean = normalizeDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  const digits = clean.split('').map(Number);

  // Cálculo do 1º dígito verificador
  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += digits[i] * (10 - i);
  }
  let dv1 = (sum1 * 10) % 11;
  if (dv1 === 10 || dv1 === 11) dv1 = 0;
  if (dv1 !== digits[9]) return false;

  // Cálculo do 2º dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += digits[i] * (11 - i);
  }
  let dv2 = (sum2 * 10) % 11;
  if (dv2 === 10 || dv2 === 11) dv2 = 0;
  if (dv2 !== digits[10]) return false;

  return true;
}

/**
 * Formata CNPJ no padrão 00.000.000/0000-00.
 */
export function formatCNPJ(value?: string | null): string {
  const digits = normalizeCNPJ(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Validação rigorosa de CNPJ com cálculo oficial dos 2 dígitos verificadores (Módulo 11).
 */
export function isValidCNPJ(cnpj?: string | null): boolean {
  const clean = normalizeDigits(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const digits = clean.split('').map(Number);
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum1 = 0;
  for (let i = 0; i < 12; i++) {
    sum1 += digits[i] * weights1[i];
  }
  const rem1 = sum1 % 11;
  const dv1 = rem1 < 2 ? 0 : 11 - rem1;
  if (dv1 !== digits[12]) return false;

  let sum2 = 0;
  for (let i = 0; i < 13; i++) {
    sum2 += digits[i] * weights2[i];
  }
  const rem2 = sum2 % 11;
  const dv2 = rem2 < 2 ? 0 : 11 - rem2;
  if (dv2 !== digits[13]) return false;

  return true;
}

/**
 * Gera chave única normalizada para restrição de unicidade no banco de dados.
 */
export function getDocumentRegistryKey(documentType: 'CPF' | 'CNPJ', rawDoc: string): string {
  const clean = documentType === 'CPF' ? normalizeCPF(rawDoc) : normalizeCNPJ(rawDoc);
  return `${documentType.toLowerCase()}_${clean}`;
}

/**
 * Valida telefone brasileiro (fixo 10 dígitos ou celular/WhatsApp 11 dígitos).
 */
export function isValidPhone(phone?: string | null): boolean {
  const clean = normalizeDigits(phone);
  if (clean.length < 10 || clean.length > 11) return false;
  if (/^(\d)\1+$/.test(clean)) return false;
  const ddd = parseInt(clean.slice(0, 2), 10);
  if (isNaN(ddd) || ddd < 11 || ddd > 99) return false;
  return true;
}

/**
 * Valida formato de e-mail.
 */
export function isValidEmail(email?: string | null): boolean {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export interface RegistrationValidationInput {
  role: 'candidate' | 'company';
  name?: string;
  email?: string;
  document?: string;
  phone?: string;
  cep?: string;
  street?: string;
  addressNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  password?: string;
  requirePassword?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  firstError: string;
  normalized: {
    name: string;
    email: string;
    documentType: 'CPF' | 'CNPJ';
    normalizedDocument: string;
    formattedDocument: string;
    phone: string;
    cep: string;
    street: string;
    addressNumber: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

/**
 * Valida todos os campos obrigatórios de cadastro (Candidato PF com CPF ou Empresa PJ com CNPJ),
 * utilizada tanto no Frontend quanto no Backend.
 */
export function validateRegistrationInput(input: RegistrationValidationInput): ValidationResult {
  const errors: Record<string, string> = {};
  const role = input.role === 'company' ? 'company' : 'candidate';
  const documentType: 'CPF' | 'CNPJ' = role === 'company' ? 'CNPJ' : 'CPF';

  const cleanName = (input.name || '').trim();
  if (!cleanName || cleanName.length < 3) {
    errors.name =
      role === 'company'
        ? 'Informe a Razão Social ou Nome Fantasia da empresa (mín. 3 caracteres).'
        : 'Informe seu nome completo (mín. 3 caracteres).';
  } else if (role === 'candidate' && !cleanName.includes(' ')) {
    errors.name = 'Informe seu nome e sobrenome completos.';
  }

  const cleanEmail = (input.email || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    errors.email = 'Informe um endereço de e-mail válido.';
  }

  const rawDoc = input.document || '';
  const cleanDoc = documentType === 'CPF' ? normalizeCPF(rawDoc) : normalizeCNPJ(rawDoc);
  if (!cleanDoc) {
    errors.document =
      documentType === 'CPF'
        ? 'O CPF é obrigatório para cadastro de candidato (pessoa física).'
        : 'O CNPJ é obrigatório para cadastro de empresa (pessoa jurídica).';
  } else if (documentType === 'CPF' && !isValidCPF(cleanDoc)) {
    errors.document = 'CPF inválido. Verifique os 11 números e os dígitos verificadores.';
  } else if (documentType === 'CNPJ' && !isValidCNPJ(cleanDoc)) {
    errors.document = 'CNPJ inválido. Verifique os 14 números e os dígitos verificadores.';
  }

  const cleanPhone = normalizeDigits(input.phone);
  if (!cleanPhone) {
    errors.phone = 'Informe um telefone ou WhatsApp para contato.';
  } else if (!isValidPhone(cleanPhone)) {
    errors.phone = 'Informe um telefone válido com DDD (ex: (18) 99999-9999).';
  }

  const cleanCep = normalizeCEP(input.cep);
  if (!cleanCep) {
    errors.cep = 'O CEP é obrigatório para preenchimento do endereço.';
  } else if (!isValidCEP(cleanCep)) {
    errors.cep = 'Informe um CEP válido com 8 dígitos (ex: 19010-000).';
  }

  const cleanCity = (input.city || '').trim() || 'Presidente Prudente, SP';
  const cleanState = (input.state || '').trim().toUpperCase() || 'SP';
  const cleanStreet = (input.street || '').trim();
  const cleanNeighborhood = (input.neighborhood || '').trim();
  const cleanAddressNumber = (input.addressNumber || '').trim();

  if (input.requirePassword !== false) {
    const pwd = input.password || '';
    if (pwd.length < 6) {
      errors.password = 'A senha deve ter no mínimo 6 caracteres.';
    }
  }

  const errorKeys = Object.keys(errors);
  return {
    valid: errorKeys.length === 0,
    errors,
    firstError: errorKeys.length > 0 ? errors[errorKeys[0]] : '',
    normalized: {
      name: cleanName,
      email: cleanEmail,
      documentType,
      normalizedDocument: cleanDoc,
      formattedDocument: documentType === 'CPF' ? formatCPF(cleanDoc) : formatCNPJ(cleanDoc),
      phone: cleanPhone,
      cep: cleanCep ? formatCEP(cleanCep) : '',
      street: cleanStreet,
      addressNumber: cleanAddressNumber,
      neighborhood: cleanNeighborhood,
      city: cleanCity,
      state: cleanState,
    },
  };
}

/**
 * Valida a atualização de perfil do candidato (Frontend + Backend).
 */
export function validateCandidateProfileUpdate(profile: Partial<UserProfile>): {
  valid: boolean;
  errors: Record<string, string>;
  firstError: string;
} {
  const errors: Record<string, string> = {};

  if (profile.name !== undefined) {
    const cleanName = profile.name.trim();
    if (cleanName.length < 3) {
      errors.name = 'Informe seu nome completo (mín. 3 caracteres).';
    }
  }

  const rawCpf = profile.cpf ?? (profile.documentType === 'CPF' ? profile.documentNumber : undefined);
  if (rawCpf !== undefined && rawCpf.trim() !== '') {
    if (!isValidCPF(rawCpf)) {
      errors.cpf = 'CPF inválido. Verifique os 11 dígitos e os dígitos verificadores.';
    }
  } else if (profile.type === 'candidate' && rawCpf === '') {
    errors.cpf = 'O CPF é obrigatório no perfil do candidato.';
  }

  if (profile.phone !== undefined && profile.phone.trim() !== '') {
    if (!isValidPhone(profile.phone)) {
      errors.phone = 'Informe um telefone/WhatsApp válido com DDD.';
    }
  }

  if (profile.cep !== undefined && profile.cep.trim() !== '') {
    if (!isValidCEP(profile.cep)) {
      errors.cep = 'Informe um CEP válido com 8 dígitos.';
    }
  }

  const keys = Object.keys(errors);
  return {
    valid: keys.length === 0,
    errors,
    firstError: keys.length > 0 ? errors[keys[0]] : '',
  };
}

export interface ResumeReadinessCheck {
  ready: boolean;
  missingFields: Array<{ key: string; label: string; description: string }>;
  completenessScore: number;
}

/**
 * Verifica se o candidato possui as informações essenciais para gerar um currículo profissional ATS.
 */
export function checkResumeGenerationReadiness(profile: {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  role?: string;
  about?: string;
  education?: string;
  skills?: string[];
  experiences?: ResumeExperience[];
  educationHistory?: ResumeEducation[];
}): ResumeReadinessCheck {
  const missing: Array<{ key: string; label: string; description: string }> = [];

  if (!profile.name || profile.name.trim().length < 3) {
    missing.push({
      key: 'name',
      label: 'Nome Completo',
      description: 'Necessário para o cabeçalho oficial do currículo.',
    });
  }

  if ((!profile.phone || !isValidPhone(profile.phone)) && (!profile.email || !isValidEmail(profile.email))) {
    missing.push({
      key: 'contact',
      label: 'Telefone/WhatsApp ou E-mail de Contato',
      description: 'Essencial para que os recrutadores possam entrar em contato.',
    });
  }

  if (!profile.role || profile.role.trim().length < 2) {
    missing.push({
      key: 'role',
      label: 'Objetivo Profissional / Cargo Desejado',
      description: 'Define o foco da sua candidatura logo no topo do currículo ATS.',
    });
  }

  const hasSummary = Boolean(profile.about && profile.about.trim().length >= 20);
  const hasStructuredExp = Boolean(profile.experiences && profile.experiences.length > 0);
  if (!hasSummary && !hasStructuredExp) {
    missing.push({
      key: 'experience_or_summary',
      label: 'Resumo Profissional ou Experiência',
      description: 'Informe um resumo de carreira ou adicione ao menos uma experiência/qualificação.',
    });
  }

  const hasEdu = Boolean(
    (profile.education && profile.education.trim().length > 0) ||
      (profile.educationHistory && profile.educationHistory.length > 0)
  );
  if (!hasEdu) {
    missing.push({
      key: 'education',
      label: 'Escolaridade / Formação Acadêmica',
      description: 'Informe seu grau de escolaridade ou curso.',
    });
  }

  const skillsCount = (profile.skills || []).filter((s) => s.trim().length > 0).length;
  if (skillsCount === 0) {
    missing.push({
      key: 'skills',
      label: 'Competências Técnicas ou Comportamentais',
      description: 'Adicione pelo menos 1 competência para leitura por sistemas ATS.',
    });
  }

  const totalChecks = 6;
  const passedChecks = totalChecks - missing.length;
  const completenessScore = Math.round((passedChecks / totalChecks) * 100);

  return {
    ready: missing.length === 0,
    missingFields: missing,
    completenessScore,
  };
}
