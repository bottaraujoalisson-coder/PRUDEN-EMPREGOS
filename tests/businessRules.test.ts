import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUSINESS_RULES_CATALOG,
  BUSINESS_RULES_CONSTANTS,
  INITIAL_WELCOME_CREDITS,
  CREDIT_COSTS,
  checkCreditSufficiency,
  canUserPublishJob,
  hasAlreadyApplied,
  canViewApplication,
  isJobExpired,
  isBlindHiringField,
  validatePasswordRule,
  formatSalaryBRL,
  calculateDeterministicMatch,
  validateCPF,
  validateCNPJMath,
} from '../src/shared/businessRules';
import { CREDIT_PACKAGES, CREDIT_PACKAGE_LIST } from '../src/shared/creditPackages';

describe('Suíte de Verificação das Regras de Negócio — PrudenEmpregos (RN-001 a RN-036)', () => {
  it('RN-001 a RN-036: Catálogo de Regras de Negócio está completo e indexado', () => {
    assert.equal(Object.keys(BUSINESS_RULES_CATALOG).length, 36);
    for (let i = 1; i <= 36; i++) {
      const id = `RN-${String(i).padStart(3, '0')}`;
      const rule = BUSINESS_RULES_CATALOG[id];
      assert.ok(rule, `Regra de Negócio ${id} deve existir no catálogo`);
      assert.equal(rule.id, id);
      assert.ok(rule.name.length > 5);
      assert.ok(rule.description.length > 10);
      assert.ok(rule.trigger.length > 5);
      assert.ok(rule.condition.length > 5);
      assert.ok(rule.effect.length > 5);
      assert.ok(rule.sourceFiles.length > 0);
    }
  });

  it('RN-001: Validação de comprimento mínimo de senha (mínimo 6 caracteres)', () => {
    assert.equal(validatePasswordRule('12345').valid, false);
    assert.equal(validatePasswordRule('123456').valid, true);
    assert.equal(validatePasswordRule('senhaSegura@2026').valid, true);
  });

  it('RN-005: Validação algorítmica de CPF (Módulo 11)', () => {
    assert.equal(validateCPF('52998224725'), true);
    assert.equal(validateCPF('529.982.247-25'), true);
    assert.equal(validateCPF('11111111111'), false); // Repetidos
    assert.equal(validateCPF('12345678900'), false); // DV incorreto
    assert.equal(validateCPF('123'), false);
  });

  it('RN-006: Validação matemática de CNPJ (14 dígitos e DV exatos)', () => {
    assert.equal(validateCNPJMath('11222333000181'), true);
    assert.equal(validateCNPJMath('11.222.333/0001-81'), true);
    assert.equal(validateCNPJMath('00000000000000'), false); // Repetidos
    assert.equal(validateCNPJMath('11222333000199'), false); // DV incorreto
    assert.equal(validateCNPJMath('12345'), false);
  });

  it('RN-010 e RN-011: Bônus de boas-vindas e custos oficiais de créditos', () => {
    assert.equal(INITIAL_WELCOME_CREDITS, 30);
    assert.equal(CREDIT_COSTS.APPLY_JOB, 10);
    assert.equal(CREDIT_COSTS.PUBLISH_JOB, 10);
    assert.equal(CREDIT_COSTS.FEATURE_JOB, 15);
    assert.equal(CREDIT_COSTS.GENERATE_ATS_RESUME, 15);

    // O bônus permite 3 candidaturas OU 1 currículo ATS (15) + 1 candidatura (10)
    assert.ok(INITIAL_WELCOME_CREDITS >= CREDIT_COSTS.APPLY_JOB * 3);
    assert.ok(INITIAL_WELCOME_CREDITS >= CREDIT_COSTS.GENERATE_ATS_RESUME + CREDIT_COSTS.APPLY_JOB);
  });

  it('RN-012: Bloqueio de saldo negativo e cálculo exato de débitos de créditos', () => {
    const sufficient = checkCreditSufficiency(30, 'APPLY_JOB');
    assert.equal(sufficient.allowed, true);
    assert.equal(sufficient.cost, 10);
    assert.equal(sufficient.missingCredits, 0);

    const insufficient = checkCreditSufficiency(5, 'APPLY_JOB');
    assert.equal(insufficient.allowed, false);
    assert.equal(insufficient.cost, 10);
    assert.equal(insufficient.missingCredits, 5);
    assert.ok(insufficient.message?.includes('Saldo insuficiente'));

    const atsCheck = checkCreditSufficiency(10, 'GENERATE_ATS_RESUME');
    assert.equal(atsCheck.allowed, false);
    assert.equal(atsCheck.missingCredits, 5);
  });

  it('RN-014: Catálogo progressivo de pacotes de crédito com preço unitário decrescente', () => {
    assert.equal(CREDIT_PACKAGE_LIST.length, 5);
    const p10 = CREDIT_PACKAGES.pkg_10;
    const p15 = CREDIT_PACKAGES.pkg_15;
    const p30 = CREDIT_PACKAGES.pkg_30;
    const p50 = CREDIT_PACKAGES.pkg_50;
    const p100 = CREDIT_PACKAGES.pkg_100;

    assert.equal(p10.totalCredits, 10);
    assert.equal(p10.priceBRL, 14.9);
    assert.equal(p15.totalCredits, 15);
    assert.equal(p15.priceBRL, 19.9);
    assert.equal(p30.totalCredits, 30);
    assert.equal(p30.priceBRL, 34.9);
    assert.equal(p50.totalCredits, 50);
    assert.equal(p50.priceBRL, 49.9);
    assert.equal(p100.totalCredits, 100);
    assert.equal(p100.priceBRL, 89.9);

    // Preço por crédito estritamente decrescente
    assert.ok(p15.unitPriceBRL < p10.unitPriceBRL);
    assert.ok(p30.unitPriceBRL < p15.unitPriceBRL);
    assert.ok(p50.unitPriceBRL < p30.unitPriceBRL);
    assert.ok(p100.unitPriceBRL < p50.unitPriceBRL);
  });

  it('RN-015: Permissão estrita de publicação exclusiva para empresas verificadas e administradores', () => {
    const candidate = canUserPublishJob({ role: 'candidate' });
    assert.equal(candidate.allowed, false);
    assert.ok(candidate.reason?.includes('Empresa'));

    const unverifiedCompany = canUserPublishJob({ role: 'company', isVerifiedCompany: false });
    assert.equal(unverifiedCompany.allowed, false);
    assert.ok(unverifiedCompany.reason?.includes('verificado'));

    const verifiedCompany = canUserPublishJob({ role: 'company', isVerifiedCompany: true });
    assert.equal(verifiedCompany.allowed, true);

    const admin = canUserPublishJob({ role: 'admin' });
    assert.equal(admin.allowed, true);
  });

  it('RN-016: Formatação salarial em Real BRL e Salário a combinar', () => {
    assert.equal(formatSalaryBRL(undefined), 'Salário a combinar');
    assert.equal(formatSalaryBRL(null), 'Salário a combinar');
    assert.equal(formatSalaryBRL(''), 'Salário a combinar');
    assert.equal(formatSalaryBRL('a combinar'), 'Salário a combinar');
    assert.match(formatSalaryBRL(2500), /R\$\s*2\.500,00/);
    assert.match(formatSalaryBRL('4200'), /R\$\s*4\.200,00/);
    assert.match(formatSalaryBRL('2200 + comissão'), /R\$\s*2\.200,00 \+ comissão/);
  });

  it('RN-017: Vigência padrão de 30 dias por vaga', () => {
    const now = Date.now();
    const recentJobCreated = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 dias atrás
    const oldJobCreated = new Date(now - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 dias atrás

    assert.equal(isJobExpired(recentJobCreated, undefined, now), false);
    assert.equal(isJobExpired(oldJobCreated, undefined, now), true);
  });

  it('RN-020: Bloqueio de candidatura duplicada para a mesma vaga', () => {
    const existing = [
      { candidateId: 'cand-1', jobId: 'job-100' },
      { candidateId: 'cand-2', jobId: 'job-200' },
    ];
    assert.equal(hasAlreadyApplied('cand-1', existing, 'job-100'), true);
    assert.equal(hasAlreadyApplied('cand-1', existing, 'job-200'), false);
    assert.equal(hasAlreadyApplied('cand-3', existing, 'job-100'), false);
  });

  it('RN-022: Restrição de acesso a candidaturas para candidato, empresa e admin', () => {
    const app = { candidateId: 'cand-1', companyId: 'comp-1' };

    assert.equal(canViewApplication('cand-1', 'candidate', app), true);
    assert.equal(canViewApplication('comp-1', 'company', app), true);
    assert.equal(canViewApplication('admin-99', 'admin', app), true);
    assert.equal(canViewApplication('other-user', 'candidate', app), false);
    assert.equal(canViewApplication('other-company', 'company', app), false);
  });

  it('RN-025: Motor determinístico de Match calcula pesos 40/25/20/15 com precisão', () => {
    const match = calculateDeterministicMatch(
      {
        skills: ['React', 'TypeScript', 'Tailwind CSS'],
        experienceLevel: 'Pleno',
        summary: 'Desenvolvedor Front-End experiente em Presidente Prudente',
        city: 'Presidente Prudente, SP',
      },
      {
        skills: ['React', 'TypeScript', 'Tailwind CSS'],
        experienceLevel: 'Pleno',
        title: 'Desenvolvedor Front-End React',
        description: 'Vaga para desenvolvedor front-end em Presidente Prudente',
        city: 'Presidente Prudente, SP',
        workModel: 'Presencial',
      }
    );

    assert.equal(match.skillsScore, 40);
    assert.equal(match.experienceScore, 25);
    assert.equal(match.locationScore, 15);
    assert.ok(match.totalScore >= 85 && match.totalScore <= 100);
  });

  it('RN-033: Modo de Recrutamento às Cegas oculta dados pessoais identificáveis', () => {
    assert.equal(isBlindHiringField('name'), true);
    assert.equal(isBlindHiringField('photoDataUrl'), true);
    assert.equal(isBlindHiringField('age'), true);
    assert.equal(isBlindHiringField('birthDate'), true);
    assert.equal(isBlindHiringField('skills'), false);
    assert.equal(isBlindHiringField('experiences'), false);
  });
});
