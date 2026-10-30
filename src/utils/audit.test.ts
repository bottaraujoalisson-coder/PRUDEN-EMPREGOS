import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WELCOME_CREDITS,
  CREDIT_COSTS,
  CREDIT_PACKAGES,
  CREDIT_PACKAGE_LIST,
} from '../shared/creditPackages';
import { formatSalaryBRL } from './formatters';
import { calculateDeterministicMatch } from './matchEngine';
import { validateCPF, validateCNPJMath } from '../services/cnpjService';

describe('Pruden Empregos — Auditoria Completa (AUD-01 a AUD-20)', () => {
  it('AUD-10 / AUD-11: Catálogo de pacotes progressivos e custos de créditos consistentes', () => {
    assert.equal(INITIAL_WELCOME_CREDITS, 30);
    assert.equal(CREDIT_COSTS.APPLY_JOB, 10);
    assert.equal(CREDIT_COSTS.PUBLISH_JOB, 10);
    assert.equal(CREDIT_COSTS.FEATURE_JOB, 15);
    assert.equal(CREDIT_COSTS.GENERATE_ATS_RESUME, 15);

    assert.equal(CREDIT_PACKAGE_LIST.length, 5);
    assert.equal(CREDIT_PACKAGES.pkg_10.priceBRL, 14.9);
    assert.equal(CREDIT_PACKAGES.pkg_15.priceBRL, 19.9);
    assert.equal(CREDIT_PACKAGES.pkg_30.priceBRL, 34.9);
    assert.equal(CREDIT_PACKAGES.pkg_50.priceBRL, 49.9);
    assert.equal(CREDIT_PACKAGES.pkg_100.priceBRL, 89.9);

    // Preço por crédito estritamente decrescente
    assert.ok(CREDIT_PACKAGES.pkg_15.unitPriceBRL < CREDIT_PACKAGES.pkg_10.unitPriceBRL);
    assert.ok(CREDIT_PACKAGES.pkg_30.unitPriceBRL < CREDIT_PACKAGES.pkg_15.unitPriceBRL);
    assert.ok(CREDIT_PACKAGES.pkg_50.unitPriceBRL < CREDIT_PACKAGES.pkg_30.unitPriceBRL);
    assert.ok(CREDIT_PACKAGES.pkg_100.unitPriceBRL < CREDIT_PACKAGES.pkg_50.unitPriceBRL);
  });

  it('AUD-14: formatSalaryBRL formata valores numéricos e retorna Salário a combinar quando vazio', () => {
    assert.equal(formatSalaryBRL(undefined), 'Salário a combinar');
    assert.equal(formatSalaryBRL(''), 'Salário a combinar');
    assert.equal(formatSalaryBRL('a combinar'), 'Salário a combinar');
    assert.match(formatSalaryBRL(2500), /R\$\s*2\.500,00/);
    assert.match(formatSalaryBRL('3600'), /R\$\s*3\.600,00/);
  });

  it('AUD-13: Motor determinístico de Match calcula pesos 40/25/20/15 com precisão', () => {
    const perfectMatch = calculateDeterministicMatch(
      {
        skills: ['React', 'TypeScript', 'Tailwind CSS'],
        experienceLevel: 'Pleno',
        summary: 'Desenvolvedor Front-End React e TypeScript atuando em aplicações web modernas',
        city: 'Presidente Prudente, SP',
      },
      {
        requiredSkills: ['React', 'TypeScript', 'Tailwind CSS'],
        experienceLevel: 'Pleno',
        title: 'Desenvolvedor Front-End React',
        description: 'Desenvolvimento de aplicações web modernas em React e TypeScript',
        city: 'Presidente Prudente, SP',
        workModel: 'Presencial',
      }
    );

    assert.equal(perfectMatch.breakdown.skillsScore, 40);
    assert.equal(perfectMatch.breakdown.experienceScore, 25);
    assert.equal(perfectMatch.breakdown.locationScore, 15);
    assert.ok(perfectMatch.totalScore >= 85 && perfectMatch.totalScore <= 100);
  });

  it('AUD-07: Validação matemática de CPF e CNPJ (Módulo 11)', () => {
    assert.equal(validateCPF('52998224725'), true);
    assert.equal(validateCPF('11111111111'), false);
    assert.equal(validateCNPJMath('11222333000181'), true);
    assert.equal(validateCNPJMath('00000000000000'), false);
  });
});
