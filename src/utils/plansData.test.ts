import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePlanExpirationDate,
  formatPriceBRL,
  formatDailyEquivalent,
  calculateSavings,
  COMPANY_PLANS,
  getPlanProtectionReason,
} from './plansData';
import {
  CREDIT_PACKAGES,
  CREDIT_TRUST_BAR_ITEMS,
  HERO_VALUE_PROPOSITION,
  getCreditPackageById,
} from './creditsData';

test('Funções utilitárias: formatação em Real BRL, micro-ancoragem e cálculo de expiração', () => {
  const formatted = formatPriceBRL(89.9);
  assert.ok(formatted.includes('89,90'));

  const monthlyExp = new Date(calculatePlanExpirationDate('monthly'));
  const yearlyExp = new Date(calculatePlanExpirationDate('yearly'));
  const now = new Date();

  const diffMonthlyDays = (monthlyExp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  assert.ok(diffMonthlyDays >= 29 && diffMonthlyDays <= 31);

  const diffYearlyDays = (yearlyExp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  assert.ok(diffYearlyDays >= 364 && diffYearlyDays <= 367);

  const dailyCandidate = formatDailyEquivalent(19.9, 'monthly');
  assert.ok(dailyCandidate.includes('/dia'), 'Deve indicar periodicidade diária');

  const savingsYearly = calculateSavings(COMPANY_PLANS[1], 'yearly');
  assert.ok(savingsYearly.savingsTotal > 0, 'Plano anual deve demonstrar economia concreta');

  const companyProtection = getPlanProtectionReason('company_pro', 'company');
  assert.ok(companyProtection.headline.length > 10);
});

test('Catálogo Autoritativo de Pacotes de Créditos: validação de preços, bônus e CRO/HX Design', () => {
  assert.equal(CREDIT_PACKAGES.length, 3, 'Deve conter 3 pacotes de créditos');

  assert.equal(
    HERO_VALUE_PROPOSITION.title,
    'Pacotes de Créditos para Recrutamento em Presidente Prudente'
  );
  assert.ok(
    HERO_VALUE_PROPOSITION.subtitle.startsWith(
      'Não perca bons profissionais pela demora na contratação.'
    )
  );
  assert.equal(
    HERO_VALUE_PROPOSITION.transparencyPill,
    'Como funciona: Publicar Vaga (10 cr) • Destacar Vaga (15 cr) • Candidatar-se (10 cr) • Gerar Currículo ATS (15 cr) • Créditos nunca expiram'
  );

  assert.equal(CREDIT_TRUST_BAR_ITEMS.length, 4);
  assert.ok(CREDIT_TRUST_BAR_ITEMS.includes('Garantia de 7 dias'));

  const starter = getCreditPackageById('pack_starter');
  assert.ok(starter);
  assert.equal(starter.totalCredits, 10);
  assert.equal(starter.price, 14.9);
  assert.equal(starter.ctaLabel, 'Liberar +10 Créditos Agora');
  assert.equal(starter.features.length, 3);
  assert.equal(starter.badge, undefined);

  const resume15 = getCreditPackageById('pack_resume_15');
  assert.ok(resume15);
  assert.equal(resume15.totalCredits, 15);
  assert.equal(resume15.price, 19.9);

  const pro = getCreditPackageById('pack_pro');
  assert.ok(pro);
  assert.equal(pro.totalCredits, 35);
  assert.equal(pro.price, 44.9);
  assert.ok(pro.isFeatured);
  assert.equal(pro.badge, 'MAIS ESCOLHIDO EM PRESIDENTE PRUDENTE • +5 BÔNUS');
  assert.equal(pro.badgeVariant, 'featured');
  assert.equal(pro.ctaLabel, 'Garantir +35 Créditos (Com Bônus)');
  assert.equal(pro.features.length, 4);

  const business = getCreditPackageById('pack_business');
  assert.ok(business);
  assert.equal(business.totalCredits, 100);
  assert.equal(business.price, 109.9);
  assert.equal(business.isFeatured, false);
  assert.equal(business.badge, 'MENOR CUSTO POR CRÉDITO • +20 BÔNUS');
  assert.equal(business.badgeVariant, 'neutral');
  assert.equal(business.ctaLabel, 'Liberar +100 Créditos Agora');
  assert.equal(business.features.length, 4);
  assert.equal(getCreditPackageById('invalid_id'), undefined);
});
