import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCandidateHeaderSubtitle,
  formatCandidateTabLabel,
  formatCompactProfileStrengthText,
  getMilestoneScrollTarget,
  PROFILE_STRENGTH_REWARD_SUBTITLE,
  CPF_TRUST_NOTICE,
  RESUME_PRIVACY_NOTICE,
  SKILLS_MOBILE_PLACEHOLDER,
  SAVED_JOBS_EMPTY_DESCRIPTION,
} from './candidateDashboard';

test('formatCandidateHeaderSubtitle removes city duplication and formats email + city cleanly', () => {
  assert.equal(
    formatCandidateHeaderSubtitle('alissonboyt7@gmail.com', 'Presidente Prudente, SP'),
    'alissonboyt7@gmail.com • Presidente Prudente, SP'
  );
  assert.equal(
    formatCandidateHeaderSubtitle('alissonboyt7@gmail.com', ''),
    'alissonboyt7@gmail.com • Presidente Prudente, SP'
  );
});

test('formatCandidateTabLabel applies conditional anchoring (hides 0, shows > 0)', () => {
  assert.equal(
    formatCandidateTabLabel('applications', { applicationsCount: 0 }),
    'Candidaturas'
  );
  assert.equal(
    formatCandidateTabLabel('applications', { applicationsCount: 2 }),
    'Candidaturas (2)'
  );
  assert.equal(
    formatCandidateTabLabel('saved', { savedCount: 0 }),
    'Vagas Salvas'
  );
  assert.equal(
    formatCandidateTabLabel('saved', { savedCount: 3 }),
    'Vagas Salvas (3)'
  );
  assert.equal(
    formatCandidateTabLabel('resume', { profilePercentage: 25 }),
    'Meu Currículo (25%)'
  );
});

test('formatCompactProfileStrengthText formats 1-line summary for non-resume tabs', () => {
  assert.equal(
    formatCompactProfileStrengthText(25),
    'Força do perfil: 25% — Complete para ganhar destaque nas empresas'
  );
});

test('getMilestoneScrollTarget maps all 5 checklist items to their corresponding form steps', () => {
  assert.deepEqual(getMilestoneScrollTarget('basic'), {
    sectionId: 'resume-step-1',
    inputId: 'cand-phone',
    stepNumber: 1,
  });
  assert.deepEqual(getMilestoneScrollTarget('role'), {
    sectionId: 'resume-step-1',
    inputId: 'cand-role',
    stepNumber: 1,
  });
  assert.deepEqual(getMilestoneScrollTarget('skills'), {
    sectionId: 'resume-step-2',
    inputId: 'cand-skills',
    stepNumber: 2,
  });
  assert.deepEqual(getMilestoneScrollTarget('about'), {
    sectionId: 'resume-step-2',
    inputId: 'cand-about',
    stepNumber: 2,
  });
  assert.deepEqual(getMilestoneScrollTarget('pdf'), {
    sectionId: 'resume-step-3',
    inputId: 'cand-pdf-upload',
    stepNumber: 3,
  });
});

test('UX copy constants match exact mobile CRO specifications', () => {
  assert.equal(
    PROFILE_STRENGTH_REWARD_SUBTITLE,
    'Perfis 100% completos aparecem no topo da lista para as empresas de Presidente Prudente.'
  );
  assert.equal(
    CPF_TRUST_NOTICE,
    '🔒 Seu CPF é protegido e usado apenas para validar sua candidatura sem intermediários.'
  );
  assert.equal(
    RESUME_PRIVACY_NOTICE,
    '🔒 Seus dados são protegidos e enviados apenas às empresas das vagas escolhidas por você.'
  );
  assert.equal(SKILLS_MOBILE_PLACEHOLDER, 'Ex: Vendas, Pacote Office...');
  assert.equal(
    SAVED_JOBS_EMPTY_DESCRIPTION,
    'Salve as vagas do seu interesse enquanto navega para comparar e se candidatar com 1 clique quando quiser.'
  );
});
