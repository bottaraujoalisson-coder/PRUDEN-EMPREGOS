export type CandidateSubTab = 'applications' | 'resume' | 'saved';

export interface MilestoneScrollTarget {
  sectionId: string;
  inputId: string;
  stepNumber: 1 | 2 | 3;
}

export const PROFILE_STRENGTH_REWARD_SUBTITLE =
  'Perfis 100% completos aparecem no topo da lista para as empresas de Presidente Prudente.';

export const CPF_TRUST_NOTICE =
  '🔒 Seu CPF é protegido e usado apenas para validar sua candidatura sem intermediários.';

export const RESUME_PRIVACY_NOTICE =
  '🔒 Seus dados são protegidos e enviados apenas às empresas das vagas escolhidas por você.';

export const SKILLS_MOBILE_PLACEHOLDER = 'Ex: Vendas, Pacote Office...';

export const SAVED_JOBS_EMPTY_DESCRIPTION =
  'Salve as vagas do seu interesse enquanto navega para comparar e se candidatar com 1 clique quando quiser.';

export function formatCandidateHeaderSubtitle(email?: string, city?: string): string {
  const cleanEmail = (email || '').trim();
  const cleanCity = (city || '').trim() || 'Presidente Prudente, SP';
  if (!cleanEmail) {
    return cleanCity;
  }
  return `${cleanEmail} • ${cleanCity}`;
}

export function formatCandidateTabLabel(
  tab: CandidateSubTab,
  options: {
    applicationsCount?: number;
    savedCount?: number;
    profilePercentage?: number;
  }
): string {
  if (tab === 'applications') {
    const count = options.applicationsCount ?? 0;
    return count > 0 ? `Candidaturas (${count})` : 'Candidaturas';
  }
  if (tab === 'resume') {
    const pct = Math.max(0, Math.min(100, Math.round(options.profilePercentage ?? 0)));
    return `Meu Currículo (${pct}%)`;
  }
  const savedCount = options.savedCount ?? 0;
  return savedCount > 0 ? `Vagas Salvas (${savedCount})` : 'Vagas Salvas';
}

export function formatCompactProfileStrengthText(percentage: number): string {
  const pct = Math.max(0, Math.min(100, Math.round(percentage)));
  return `Força do perfil: ${pct}% — Complete para ganhar destaque nas empresas`;
}

export function getMilestoneScrollTarget(milestoneId: string): MilestoneScrollTarget {
  switch (milestoneId) {
    case 'basic':
      return {
        sectionId: 'resume-step-1',
        inputId: 'cand-phone',
        stepNumber: 1,
      };
    case 'role':
      return {
        sectionId: 'resume-step-1',
        inputId: 'cand-role',
        stepNumber: 1,
      };
    case 'skills':
      return {
        sectionId: 'resume-step-2',
        inputId: 'cand-skills',
        stepNumber: 2,
      };
    case 'about':
      return {
        sectionId: 'resume-step-2',
        inputId: 'cand-about',
        stepNumber: 2,
      };
    case 'pdf':
      return {
        sectionId: 'resume-step-3',
        inputId: 'cand-pdf-upload',
        stepNumber: 3,
      };
    default:
      return {
        sectionId: 'resume-step-1',
        inputId: 'cand-name',
        stepNumber: 1,
      };
  }
}
