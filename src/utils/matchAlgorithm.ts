import { Job, ScreeningQuestion, UserProfile, MatchBreakdown } from '../types';

export interface JobMatchInput {
  title?: string;
  category?: string;
  location?: string;
  workModel?: string;
  contract?: string;
  experience?: string;
  acceptsFirstJob?: boolean;
  skills?: string[];
  description?: string;
}

export interface CandidateMatchInput {
  role?: string;
  city?: string;
  experienceLevel?: string;
  education?: string;
  skills?: string[];
  experiences?: Array<{ role?: string; company?: string; description?: string }>;
  educationHistory?: Array<{ degree?: string; institution?: string }>;
}

export interface DetailedMatchAnalysis {
  matchScore: number;
  matchBreakdown: MatchBreakdown;
  matchingSkills: string[];
  missingSkills: string[];
  matchStrengths: string[];
  matchWeaknesses: string[];
}

export const REGIONAL_CITIES: string[] = [
  'Presidente Prudente, SP',
  'Álvares Machado, SP',
  'Pirapozinho, SP',
  'Regente Feijó, SP',
  'Martinópolis, SP',
  'Santo Anastácio, SP',
  'Presidente Bernardes, SP',
  'Presidente Venceslau, SP',
  'Presidente Epitácio, SP',
  'Rancharia, SP',
  'Dracena, SP',
];

export const BENEFIT_OPTIONS: string[] = [
  'Vale-Alimentação',
  'Vale-Transporte',
  'Auxílio Combustível',
  'Plano de Saúde',
  'Plano Odontológico',
  'Comissão',
  'Seguro de Vida',
  'Horário Flexível',
];

export const SUGGESTED_SCREENING_QUESTIONS: string[] = [
  'Tem disponibilidade para início imediato?',
  'Reside em Presidente Prudente ou região próxima?',
  'Possui experiência anterior na função?',
  'Possui CNH e condução própria?',
];

const EXP_LEVELS: Record<string, number> = {
  'Primeiro Emprego': 1,
  'Estágio': 2,
  'Júnior': 3,
  'Pleno': 4,
  'Sênior': 5,
};

const EDU_LEVELS: Record<string, number> = {
  'Ensino Fundamental': 1,
  'Ensino Médio': 2,
  'Ensino Técnico': 3,
  'Superior Incompleto': 3,
  'Superior Completo': 4,
  'Pós-Graduação / Especialização': 5,
};

function normalizeMatchToken(str?: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const calculateSkillDiff = (jobSkills?: string[], candidateSkills?: string[]) => {
  const matching: string[] = [];
  const missing: string[] = [];

  if (!jobSkills || jobSkills.length === 0) {
    return { matchingSkills: matching, missingSkills: missing };
  }

  const candTokens = (candidateSkills || []).map((s) => normalizeMatchToken(s)).filter(Boolean);

  jobSkills.forEach((skill) => {
    const normJobSkill = normalizeMatchToken(skill);
    if (!normJobSkill) return;
    const isMatched = candTokens.some(
      (candSkill) =>
        candSkill === normJobSkill ||
        (candSkill.length >= 4 && normJobSkill.includes(candSkill)) ||
        (normJobSkill.length >= 4 && candSkill.includes(normJobSkill))
    );
    if (isMatched) {
      matching.push(skill);
    } else {
      missing.push(skill);
    }
  });

  return { matchingSkills: matching, missingSkills: missing };
};

/**
 * Motor de Match Ponderado (Acionado exclusivamente no momento da confirmação da candidatura):
 * - Habilidades Técnicas: 45%
 * - Nível de Experiência e Histórico: 25%
 * - Formação Acadêmica: 15%
 * - Localização e Modalidade: 15%
 */
export function calculateDetailedMatchAnalysis(
  job?: JobMatchInput | null,
  candidate?: CandidateMatchInput | null
): DetailedMatchAnalysis {
  if (!candidate || !job) {
    return {
      matchScore: 0,
      matchBreakdown: {
        skillsScore: 0,
        experienceScore: 0,
        educationScore: 0,
        locationScore: 0,
      },
      matchingSkills: [],
      missingSkills: job?.skills ?? [],
      matchStrengths: [],
      matchWeaknesses: [],
    };
  }

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  // 1. Habilidades Técnicas (Peso: 45%)
  const { matchingSkills, missingSkills } = calculateSkillDiff(job.skills, candidate.skills);
  let skillsScore = 60;
  if (job.skills && job.skills.length > 0) {
    skillsScore = Math.round((matchingSkills.length / job.skills.length) * 100);
    if (matchingSkills.length > 0) {
      strengths.push(
        `Domínio de ${matchingSkills.length}/${job.skills.length} competências exigidas (${matchingSkills.slice(0, 4).join(', ')})`
      );
    }
    if (missingSkills.length > 0) {
      weaknesses.push(
        `Competências não listadas no perfil: ${missingSkills.slice(0, 4).join(', ')}`
      );
    }
  } else if (candidate.skills && candidate.skills.length >= 3) {
    skillsScore = 85;
    strengths.push(`Repertório técnico com ${candidate.skills.length} competências cadastradas`);
  }

  // 2. Experiência Profissional e Afinidade de Cargo (Peso: 25%)
  const candExp = (candidate.experienceLevel && EXP_LEVELS[candidate.experienceLevel]) || 0;
  const jobExp = (job.experience && EXP_LEVELS[job.experience]) || 0;
  let experienceScore = 70;

  if (
    job.experience === 'Qualquer Nível' ||
    job.experience === 'Primeiro Emprego' ||
    job.experience === 'Estágio' ||
    job.contract === 'Estágio' ||
    job.contract === 'Jovem Aprendiz' ||
    job.acceptsFirstJob
  ) {
    experienceScore = 100;
    strengths.push('Nível de senioridade 100% compatível com a oportunidade (Primeiro Emprego / Estágio)');
  } else if (candExp > 0 && jobExp > 0) {
    const diff = candExp - jobExp;
    if (diff === 0) {
      experienceScore = 100;
      strengths.push(`Senioridade exata solicitada pela vaga (${candidate.experienceLevel})`);
    } else if (diff > 0) {
      experienceScore = 90;
      strengths.push(`Experiência acima do mínimo exigido (${candidate.experienceLevel})`);
    } else if (diff === -1) {
      experienceScore = 65;
      weaknesses.push(
        `Nível atual (${candidate.experienceLevel}) imediatamente abaixo do desejado (${job.experience})`
      );
    } else {
      experienceScore = 35;
      weaknesses.push(
        `Vaga requer nível ${job.experience} (perfil atual: ${candidate.experienceLevel})`
      );
    }
  } else if (!candidate.experienceLevel) {
    experienceScore = 50;
    weaknesses.push('Nível de experiência não especificado no perfil do candidato');
  }

  // Bônus por alinhamento de cargo desejado
  const normRole = normalizeMatchToken(candidate.role);
  const normTitle = normalizeMatchToken(job.title);
  if (normRole && normTitle && (normTitle.includes(normRole) || normRole.includes(normTitle))) {
    experienceScore = Math.min(100, experienceScore + 10);
    strengths.push(`Objetivo profissional alinhado diretamente ao cargo (${candidate.role})`);
  }

  // 3. Formação Acadêmica (Peso: 15%)
  const candEduLevel = (candidate.education && EDU_LEVELS[candidate.education]) || 0;
  let educationScore = 70;
  const requiresHigherEdu =
    jobExp >= 4 ||
    normalizeMatchToken(job.description).includes('superior') ||
    normalizeMatchToken(job.title).includes('analista') ||
    normalizeMatchToken(job.title).includes('engenheir') ||
    normalizeMatchToken(job.title).includes('gerente');

  if (candEduLevel >= 4) {
    educationScore = 100;
    strengths.push(`Formação acadêmica consolidada (${candidate.education})`);
  } else if (candEduLevel === 3) {
    educationScore = requiresHigherEdu ? 80 : 95;
    strengths.push(`Formação técnica/universitária (${candidate.education})`);
  } else if (candEduLevel === 2) {
    if (requiresHigherEdu) {
      educationScore = 55;
      weaknesses.push('Cargo costuma valorizar ensino superior ou técnico na área');
    } else {
      educationScore = 90;
      strengths.push(`Escolaridade compatível (${candidate.education})`);
    }
  } else {
    educationScore = 50;
    weaknesses.push('Escolaridade não detalhada no currículo');
  }

  // 4. Localização e Modalidade (Peso: 15%)
  const normJobLoc = normalizeMatchToken(job.location?.split(',')[0]);
  const normCandCity = normalizeMatchToken(candidate.city?.split(',')[0]);
  let locationScore = 80;

  if (job.workModel === 'Remoto') {
    locationScore = 100;
    strengths.push('Disponibilidade total para modalidade remota');
  } else if (normJobLoc && normCandCity && normJobLoc === normCandCity) {
    locationScore = 100;
    strengths.push(`Reside na mesma cidade da vaga (${candidate.city})`);
  } else if (normCandCity) {
    locationScore = 75;
    weaknesses.push(
      `Candidato reside em ${candidate.city} (vaga localizada em ${job.location || 'Presidente Prudente, SP'})`
    );
  }

  const weightedTotal =
    skillsScore * 0.45 +
    experienceScore * 0.25 +
    educationScore * 0.15 +
    locationScore * 0.15;

  const matchScore = Math.min(100, Math.max(0, Math.round(weightedTotal)));

  return {
    matchScore,
    matchBreakdown: {
      skillsScore,
      experienceScore,
      educationScore,
      locationScore,
    },
    matchingSkills,
    missingSkills,
    matchStrengths: strengths,
    matchWeaknesses: weaknesses,
  };
}

export const calculateIntelligentMatch = (
  job?: JobMatchInput | null,
  candidate?: CandidateMatchInput | null
): number => {
  return calculateDetailedMatchAnalysis(job, candidate).matchScore;
};

export const getMatchColor = (score: number) => {
  if (score >= 75) return 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]';
  if (score >= 50) return 'text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]';
  return 'text-[#B45309] bg-[#FEF3C7] border-[#FDE68A]';
};

export const formatDate = (isoString?: string) => {
  if (!isoString) return 'Data recente';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const formatRelativeTime = (isoString?: string) => {
  if (!isoString) return 'Hoje';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 5) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  } catch {
    return 'Hoje';
  }
};

// --- MÁSCARAS E VALIDAÇÃO DE DOCUMENTOS (CPF vs CNPJ) E RBAC ---
import {
  formatCPF as formatCPFStrict,
  isValidCPF as isValidCPFStrict,
  formatCNPJ as formatCNPJStrict,
  isValidCNPJ as isValidCNPJStrict,
  formatCEP as formatCEPStrict,
  isValidCEP as isValidCEPStrict,
  normalizeDigits,
} from './validation';

export const formatCPF = formatCPFStrict;
export const isValidCPF = isValidCPFStrict;
export const formatCNPJ = formatCNPJStrict;
export const isValidCNPJ = isValidCNPJStrict;
export const validateCNPJ = isValidCNPJStrict;
export const formatCEP = formatCEPStrict;
export const isValidCEP = isValidCEPStrict;
export { normalizeDigits };

export const maskCPF = (cpf?: string): string => {
  if (!cpf) return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return formatCPF(cpf);
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
};

/**
 * Determina obrigatoriamente o tipo de conta com base nos dígitos do documento:
 * - 11 dígitos válidos com dígito verificador -> Candidato (CPF)
 * - 14 dígitos válidos com dígito verificador -> Empresa (CNPJ)
 */
export function resolveAccountRoleFromDocument(rawDocument: string): {
  valid: boolean;
  documentType?: 'CPF' | 'CNPJ';
  role?: 'candidate' | 'company';
  formatted?: string;
  digits: string;
} {
  const digits = rawDocument.replace(/\D/g, '');
  if (digits.length === 11 && isValidCPF(digits)) {
    return {
      valid: true,
      documentType: 'CPF',
      role: 'candidate',
      formatted: formatCPF(digits),
      digits,
    };
  }
  if (digits.length === 14 && isValidCNPJ(digits)) {
    return {
      valid: true,
      documentType: 'CNPJ',
      role: 'company',
      formatted: formatCNPJ(digits),
      digits,
    };
  }
  return {
    valid: false,
    digits,
  };
}

/**
 * Verifica se o usuário logado possui permissão exclusiva de Candidato (CPF).
 * Mantém retrocompatibilidade com contas antigas sem documento salvo inferindo pelo type.
 */
export function isCandidate(user?: Partial<UserProfile> | null): boolean {
  if (!user) return false;
  if (user.documentType === 'CNPJ') return false;
  if (user.documentType === 'CPF') return true;
  if (user.cpf && isValidCPF(user.cpf)) return true;
  if (user.cnpj && isValidCNPJ(user.cnpj)) return false;
  return user.type === 'candidate';
}

/**
 * Verifica se o usuário logado possui permissão exclusiva de Empresa (CNPJ).
 * Mantém retrocompatibilidade com contas antigas sem documento salvo inferindo pelo type.
 */
export function isCompany(user?: Partial<UserProfile> | null): boolean {
  if (!user) return false;
  if (user.documentType === 'CPF') return false;
  if (user.documentType === 'CNPJ') return true;
  if (user.cnpj && isValidCNPJ(user.cnpj)) return true;
  if (user.cpf && isValidCPF(user.cpf)) return false;
  return user.type === 'company';
}

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

// --- MÓDULO 1: STATUS TRANSPARENTE DE CANDIDATURA ---
export interface StatusBadgeConfig {
  label: string;
  className: string;
  normalized: 'enviado' | 'visualizado' | 'em_analise' | 'convocado' | 'encerrado';
}

export function getApplicationStatusDisplay(status?: string): StatusBadgeConfig {
  const raw = (status ?? 'enviado').trim().toLowerCase();

  if (raw === 'visualizado') {
    return {
      label: 'Visualizado pela empresa',
      className: 'bg-[#EFF4FF] text-[#173B70] px-2.5 py-1 rounded-md text-xs font-medium',
      normalized: 'visualizado',
    };
  }

  if (raw === 'em_analise' || raw === 'em análise' || raw === 'em analise') {
    return {
      label: 'Perfil em análise',
      className: 'bg-[#EFF4FF] text-[#173B70] font-semibold px-2.5 py-1 rounded-md text-xs',
      normalized: 'em_analise',
    };
  }

  if (raw === 'convocado' || raw === 'entrevista' || raw === 'aprovado') {
    return {
      label: 'Selecionado para contato',
      className: 'bg-[#ECFDF5] text-[#16835D] font-semibold px-2.5 py-1 rounded-md text-xs',
      normalized: 'convocado',
    };
  }

  if (raw === 'encerrado' || raw === 'rejeitado') {
    return {
      label: 'Processo finalizado',
      className: 'bg-slate-100 text-[#64748B] px-2.5 py-1 rounded-md text-xs font-medium',
      normalized: 'encerrado',
    };
  }

  return {
    label: 'Currículo enviado',
    className: 'bg-[#F3F5F8] text-[#64748B] px-2.5 py-1 rounded-md text-xs font-medium',
    normalized: 'enviado',
  };
}

export function isInitialSentStatus(status?: string): boolean {
  const raw = (status ?? 'enviado').trim().toLowerCase();
  return raw === 'enviado' || raw === '';
}

// --- MÓDULO 2: TRIAGEM RÁPIDA DE 3 CLIQUES ---
export function calculateScreeningCompatibility(
  questions?: ScreeningQuestion[],
  answers?: Record<string, 'sim' | 'nao'>
): { score: number; total: number } {
  const list = questions ?? [];
  if (list.length === 0) {
    return { score: 0, total: 0 };
  }
  const ansMap = answers ?? {};
  let score = 0;
  for (const q of list) {
    const expected = q.expectedAnswer ?? 'sim';
    if (ansMap[q.id] === expected) {
      score += 1;
    }
  }
  return { score, total: list.length };
}

// --- MÓDULO 4: SELO DE CONFIANÇA ("NOVA" < 48H) E VALIDADE/RENOVAÇÃO ---
export function isJobNew(createdAt?: string, nowMs: number = Date.now()): boolean {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (isNaN(createdTime)) return false;
  const diffMs = nowMs - createdTime;
  return diffMs >= -60000 && diffMs <= 48 * 60 * 60 * 1000;
}

export function getDaysUntilExpiration(
  job?: Partial<Job> | null,
  nowMs: number = Date.now()
): number {
  if (!job) return 30;
  let targetTime: number;
  if (job.expiresAt) {
    targetTime = new Date(job.expiresAt).getTime();
  } else if (job.createdAt) {
    targetTime = new Date(job.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  } else {
    targetTime = nowMs + 30 * 24 * 60 * 60 * 1000;
  }
  if (isNaN(targetTime)) return 30;
  const diffDays = Math.ceil((targetTime - nowMs) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

export function calculateRenewedExpiresAt(
  job?: Partial<Job> | null,
  extraDays: number = 15,
  nowMs: number = Date.now()
): string {
  let baseTime = nowMs;
  if (job?.expiresAt) {
    const parsed = new Date(job.expiresAt).getTime();
    if (!isNaN(parsed) && parsed > nowMs) {
      baseTime = parsed;
    }
  } else if (job?.createdAt) {
    const defaultExp = new Date(job.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000;
    if (!isNaN(defaultExp) && defaultExp > nowMs) {
      baseTime = defaultExp;
    }
  }
  const renewed = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000);
  return renewed.toISOString();
}

// --- MÓDULO 5: FAIXA SALARIAL FLEXÍVEL & FORMATAÇÃO MONETÁRIA BRL ---
const brlCurrencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatSalaryBRL(value?: string | number | null): string {
  if (value === null || value === undefined) return 'Salário a combinar';

  if (typeof value === 'number') {
    if (isNaN(value) || value <= 0) return 'Salário a combinar';
    return brlCurrencyFormatter.format(value).replace(/\u00a0/g, ' ');
  }

  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase().includes('combinar')) {
    return 'Salário a combinar';
  }

  // If raw numeric string like "2500" or "2500.50" or "2500,00"
  if (/^\d+([.,]\d{1,2})?$/.test(trimmed)) {
    const parsed = Number(trimmed.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      return brlCurrencyFormatter.format(parsed).replace(/\u00a0/g, ' ');
    }
  }

  // If string starts with raw number followed by suffix like "2200 + comissão"
  const rawPrefixMatch = trimmed.match(/^(\d{3,6})\s*(\+.*)$/);
  if (rawPrefixMatch) {
    const numPart = Number(rawPrefixMatch[1]);
    if (!isNaN(numPart) && numPart > 0) {
      return `${brlCurrencyFormatter.format(numPart).replace(/\u00a0/g, ' ')} ${rawPrefixMatch[2]}`;
    }
  }

  return trimmed;
}

export function formatCurrencyBRL(value: number, showDecimals: boolean = false): string {
  if (isNaN(value) || value <= 0) return '';
  if (showDecimals) {
    return brlCurrencyFormatter.format(value).replace(/\u00a0/g, ' ');
  }
  return `R$ ${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatJobSalary(job?: Partial<Job> | null): string {
  if (!job) return 'Salário a combinar';

  if (job.salaryType === 'negotiable') {
    return 'Salário a combinar';
  }

  if (job.salaryRange && job.salaryRange.trim().length > 0) {
    const formattedRange = formatSalaryBRL(job.salaryRange);
    // If salaryRange explicitly has suffix like "+ comissão" or if salaryType is not range/exact, return formattedRange
    if (
      formattedRange.toLowerCase().includes('comiss') ||
      (!job.salaryType && formattedRange !== 'Salário a combinar')
    ) {
      return formattedRange;
    }
  }

  if (job.salaryType === 'range') {
    const min = job.salaryMin ?? 0;
    const max = job.salaryMax ?? 0;
    if (min > 0 && max > 0) {
      return `${formatCurrencyBRL(min, false)} - ${formatCurrencyBRL(max, false)}`;
    }
    if (min > 0) {
      return `A partir de ${formatCurrencyBRL(min, false)}`;
    }
    if (max > 0) {
      return `Até ${formatCurrencyBRL(max, false)}`;
    }
  }

  if (job.salaryType === 'exact') {
    const exact = job.salaryMin ?? 0;
    if (exact > 0) {
      return formatSalaryBRL(exact);
    }
  }

  if (job.salaryRange && job.salaryRange.trim().length > 0) {
    return formatSalaryBRL(job.salaryRange);
  }

  if (job.salaryMin && job.salaryMin > 0) {
    return formatSalaryBRL(job.salaryMin);
  }

  return 'Salário a combinar';
}

// --- MÓDULO 6: COMPARTILHAMENTO FORMATADO PARA WHATSAPP ---
export function formatWhatsAppJobShareMessage(
  job: Partial<Job>,
  originUrl: string = 'https://prudenempregos.com.br'
): string {
  const remuneracaoFormatada = formatJobSalary(job);
  return `*Vaga aberta no PrudenEmpregos*
Cargo: ${job.title || 'Oportunidade'}
Empresa: ${job.companyName || 'Empresa Confidencial'}
Local: ${job.location || 'Presidente Prudente - SP'}
Remuneração: ${remuneracaoFormatada}

Candidate-se gratuitamente em: ${originUrl}`;
}

export function getWhatsAppJobShareUrl(job: Partial<Job>, originUrl?: string): string {
  const resolvedOrigin =
    originUrl ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://prudenempregos.com.br');
  const message = formatWhatsAppJobShareMessage(job, resolvedOrigin);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

// --- PSICOLOGIA APLICADA & DESIGN DE EXPERIÊNCIA HUMANA (HX DESIGN) ---

// Cap. 1 (Viés da Ancoragem): Pontos de referência salariais regionais para reduzir carga cognitiva
export const SALARY_REFERENCE_ANCHORS: Array<{
  label: string;
  min: number;
  max: number;
  display: string;
}> = [
  { label: 'Início / Operacional', min: 1850, max: 2200, display: 'R$ 1.850 - R$ 2.200' },
  { label: 'Técnico / Assistente', min: 2500, max: 3200, display: 'R$ 2.500 - R$ 3.200' },
  { label: 'Analista / Pleno', min: 3500, max: 4800, display: 'R$ 3.500 - R$ 4.800' },
  { label: 'Especialista / Gestão', min: 5500, max: 8000, display: 'R$ 5.500 - R$ 8.000' },
];

// Cap. 1 & Cap. 7 (Ancoragem e Redução da Fadiga de Decisão): Sugestões de competências por área
export const CATEGORY_SKILL_ANCHORS: Record<string, string[]> = {
  Tecnologia: ['Suporte Técnico', 'Desenvolvimento Web', 'Banco de Dados', 'Excel Avançado', 'Redes'],
  Administrativo: ['Atendimento ao Cliente', 'Pacote Office', 'Rotinas Administrativas', 'Organização', 'Emissão de Notas'],
  Comercial: ['Vendas Consultivas', 'Negociação', 'Prospecção de Clientes', 'Atendimento WhatsApp', 'Metas'],
  Saúde: ['Atendimento Humanizado', 'Enfermagem', 'Primeiros Socorros', 'Recepção Clínica', 'Biossegurança'],
  Financeiro: ['Contas a Pagar e Receber', 'Fluxo de Caixa', 'Conciliação Bancária', 'Excel', 'Faturamento'],
  Educação: ['Didática', 'Acompanhamento Pedagógico', 'Comunicação Clara', 'Planejamento de Aulas'],
  Indústria: ['Controle de Qualidade', 'Segurança do Trabalho', 'Operação de Máquinas', 'Logística', 'PCP'],
  Agronegócio: ['Gestão Rural', 'Insumos Agrícolas', 'Mecanização', 'Campo e Pecuária', 'CNH B'],
  Serviços: ['Atendimento ao Público', 'Pontualidade', 'Trabalho em Equipe', 'Resolução de Problemas', 'Organização'],
};

export interface CareerMilestone {
  id: string;
  label: string;
  completed: boolean;
  weight: number;
  actionHint: string;
}

export interface CandidateProgressCoach {
  percentage: number;
  completedCount: number;
  totalCount: number;
  milestones: CareerMilestone[];
  nextStepHint: string;
}

// Cap. 4 (Comprometimento e Progresso como Treinador): Checklist claro de evolução do currículo
export function calculateCandidateProgressCoach(
  user?: Partial<UserProfile> | null,
  hasResumePdf?: boolean
): CandidateProgressCoach {
  const hasBasicInfo = Boolean(user?.name && user.name.trim().length >= 3 && (user?.phone || user?.city));
  const hasRoleAndEdu = Boolean(user?.role && user.role.trim().length >= 2 && user?.education);
  const skillsCount = user?.skills?.filter((s) => s.trim().length > 0).length ?? 0;
  const hasSkills = skillsCount >= 3;
  const hasAbout = Boolean(user?.about && user.about.trim().length >= 30);
  const hasPdf = Boolean(hasResumePdf ?? (user?.resumeFileName && user?.resumeDataUrl));

  const milestones: CareerMilestone[] = [
    {
      id: 'basic',
      label: 'Dados pessoais e contato',
      completed: hasBasicInfo,
      weight: 25,
      actionHint: 'Preencha seu telefone e cidade em Presidente Prudente ou região (+25%).',
    },
    {
      id: 'role',
      label: 'Cargo desejado e escolaridade',
      completed: hasRoleAndEdu,
      weight: 20,
      actionHint: 'Defina seu cargo desejado e nível de escolaridade para recomendações precisas (+20%).',
    },
    {
      id: 'skills',
      label: 'Pelo menos 3 competências',
      completed: hasSkills,
      weight: 25,
      actionHint: 'Adicione 3 ou mais competências para calcular sua compatibilidade com as vagas (+25%).',
    },
    {
      id: 'about',
      label: 'Resumo profissional',
      completed: hasAbout,
      weight: 15,
      actionHint: 'Escreva um breve resumo ou use a sugestão inteligente para destacar sua trajetória (+15%).',
    },
    {
      id: 'pdf',
      label: 'Currículo em PDF anexado',
      completed: hasPdf,
      weight: 15,
      actionHint: 'Anexe seu currículo em PDF para envio imediato com 1 clique (+15%).',
    },
  ];

  const percentage = milestones.reduce((acc, m) => acc + (m.completed ? m.weight : 0), 0);
  const completedCount = milestones.filter((m) => m.completed).length;
  const firstIncomplete = milestones.find((m) => !m.completed);

  return {
    percentage,
    completedCount,
    totalCount: milestones.length,
    milestones,
    nextStepHint: firstIncomplete
      ? firstIncomplete.actionHint
      : 'Currículo 100% completo — pronto para candidatura imediata com 1 clique.',
  };
}

// Cap. 6 (Viés de Enquadramento Positivo): Destaca ganhos e pontos fortes em vez de focar em déficits
export function getPositiveFramingMatchSummary(
  jobSkills?: string[],
  candidateSkills?: string[],
  matchScore?: number | null
): {
  headline: string;
  subtext: string;
  matchedCount: number;
  totalCount: number;
} {
  const { matchingSkills, missingSkills } = calculateSkillDiff(jobSkills, candidateSkills);
  const totalCount = (jobSkills ?? []).length;
  const matchedCount = matchingSkills.length;
  const score = matchScore ?? 0;

  if (totalCount === 0) {
    return {
      headline: 'Perfil elegível para candidatura direta',
      subtext: 'Esta oportunidade valoriza disposição prática e alinhamento com a empresa.',
      matchedCount: 0,
      totalCount: 0,
    };
  }

  if (matchedCount === totalCount) {
    return {
      headline: `Você domina 100% das ${totalCount} competências pedidas`,
      subtext: 'Seu perfil atende integralmente aos requisitos técnicos informados pela empresa.',
      matchedCount,
      totalCount,
    };
  }

  if (matchedCount > 0) {
    return {
      headline: `Você já possui ${matchedCount} de ${totalCount} competências desta vaga (${score}% de afinidade)`,
      subtext:
        missingSkills.length > 0
          ? `Diferenciais que você pode desenvolver ou destacar na entrevista: ${missingSkills.join(' · ')}.`
          : 'Seu currículo apresenta boa aderência para avaliação do recrutador.',
      matchedCount,
      totalCount,
    };
  }

  return {
    headline: `Oportunidade aberta para novos perfis (${score}% de afinidade geral)`,
    subtext: `Adicione ao seu currículo competências que você conhece entre: ${missingSkills.slice(0, 3).join(' · ')}.`,
    matchedCount: 0,
    totalCount,
  };
}

