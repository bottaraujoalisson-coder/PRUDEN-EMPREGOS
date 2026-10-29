import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getApplicationStatusDisplay,
  isInitialSentStatus,
  calculateScreeningCompatibility,
  isJobNew,
  getDaysUntilExpiration,
  calculateRenewedExpiresAt,
  formatJobSalary,
  formatWhatsAppJobShareMessage,
  getWhatsAppJobShareUrl,
  formatCPF,
  isValidCPF,
  maskCPF,
  formatCNPJ,
  isValidCNPJ,
  resolveAccountRoleFromDocument,
  isCandidate,
  isCompany,
} from './matchAlgorithm';

test('Módulo 1: getApplicationStatusDisplay maps both new and legacy statuses accurately', () => {
  assert.equal(getApplicationStatusDisplay('enviado').label, 'Currículo enviado');
  assert.equal(getApplicationStatusDisplay('Enviado').label, 'Currículo enviado');
  assert.equal(getApplicationStatusDisplay(undefined).label, 'Currículo enviado');

  assert.equal(getApplicationStatusDisplay('visualizado').label, 'Visualizado pela empresa');

  assert.equal(getApplicationStatusDisplay('em_analise').label, 'Perfil em análise');
  assert.equal(getApplicationStatusDisplay('Em Análise').label, 'Perfil em análise');

  assert.equal(getApplicationStatusDisplay('convocado').label, 'Selecionado para contato');
  assert.equal(getApplicationStatusDisplay('Entrevista').label, 'Selecionado para contato');
  assert.equal(getApplicationStatusDisplay('Aprovado').label, 'Selecionado para contato');

  assert.equal(getApplicationStatusDisplay('encerrado').label, 'Processo finalizado');
  assert.equal(getApplicationStatusDisplay('Rejeitado').label, 'Processo finalizado');

  assert.equal(isInitialSentStatus('enviado'), true);
  assert.equal(isInitialSentStatus('Enviado'), true);
  assert.equal(isInitialSentStatus('visualizado'), false);
});

test('Módulo 2: calculateScreeningCompatibility scores answers against expectedAnswer', () => {
  const questions = [
    { id: 'q1', question: 'Tem disponibilidade para início imediato?', expectedAnswer: 'sim' as const },
    { id: 'q2', question: 'Reside em Presidente Prudente ou região próxima?', expectedAnswer: 'sim' as const },
    { id: 'q3', question: 'Possui CNH e condução própria?', expectedAnswer: 'sim' as const },
  ];

  const fullMatch = calculateScreeningCompatibility(questions, {
    q1: 'sim',
    q2: 'sim',
    q3: 'sim',
  });
  assert.deepEqual(fullMatch, { score: 3, total: 3 });

  const partialMatch = calculateScreeningCompatibility(questions, {
    q1: 'sim',
    q2: 'nao',
    q3: 'sim',
  });
  assert.deepEqual(partialMatch, { score: 2, total: 3 });
});

test('Módulo 4: isJobNew detects jobs < 48h and expiration helpers compute renewal', () => {
  const now = new Date('2026-05-10T12:00:00.000Z').getTime();
  const recentIso = new Date('2026-05-09T15:00:00.000Z').toISOString(); // 21h ago
  const oldIso = new Date('2026-05-05T12:00:00.000Z').toISOString(); // 5 days ago

  assert.equal(isJobNew(recentIso, now), true);
  assert.equal(isJobNew(oldIso, now), false);

  const daysRemaining = getDaysUntilExpiration({ createdAt: oldIso }, now);
  assert.equal(daysRemaining, 25);

  const renewedIso = calculateRenewedExpiresAt({ createdAt: oldIso }, 15, now);
  const daysAfterRenewal = getDaysUntilExpiration({ expiresAt: renewedIso }, now);
  assert.equal(daysAfterRenewal, 40);
});

test('Módulo 5: formatJobSalary and formatSalaryBRL handle range, exact, negotiable, raw numeric strings, and legacy salaryRange', async () => {
  const { formatSalaryBRL } = await import('./matchAlgorithm');

  assert.equal(formatSalaryBRL(2500), 'R$ 2.500,00');
  assert.equal(formatSalaryBRL('2500'), 'R$ 2.500,00');
  assert.equal(formatSalaryBRL('4200'), 'R$ 4.200,00');
  assert.equal(formatSalaryBRL('2200 + comissão'), 'R$ 2.200,00 + comissão');
  assert.equal(formatSalaryBRL(''), 'Salário a combinar');
  assert.equal(formatSalaryBRL(null), 'Salário a combinar');

  assert.equal(
    formatJobSalary({ salaryType: 'range', salaryMin: 2000, salaryMax: 2500 }),
    'R$ 2.000 - R$ 2.500'
  );
  assert.equal(
    formatJobSalary({ salaryType: 'exact', salaryMin: 2200 }),
    'R$ 2.200,00'
  );
  assert.equal(
    formatJobSalary({ salaryRange: '2500' }),
    'R$ 2.500,00'
  );
  assert.equal(
    formatJobSalary({ salaryType: 'negotiable' }),
    'Salário a combinar'
  );
  assert.equal(
    formatJobSalary({ salaryRange: 'R$ 3.000,00 + Comissão' }),
    'R$ 3.000,00 + Comissão'
  );
});

test('Módulo 6: WhatsApp share message and URL builder', () => {
  const job = {
    title: 'Analista Comercial',
    companyName: 'PrudenTech',
    location: 'Presidente Prudente, SP',
    salaryType: 'range' as const,
    salaryMin: 2000,
    salaryMax: 2500,
  };
  const msg = formatWhatsAppJobShareMessage(job, 'https://prudenempregos.com.br');
  assert.ok(msg.includes('*Vaga aberta no PrudenEmpregos*'));
  assert.ok(msg.includes('Cargo: Analista Comercial'));
  assert.ok(msg.includes('Remuneração: R$ 2.000 - R$ 2.500'));

  const url = getWhatsAppJobShareUrl(job, 'https://prudenempregos.com.br');
  assert.ok(url.startsWith('https://api.whatsapp.com/send?text='));
});

test('RBAC CPF vs CNPJ: masks, validation, automatic binding, and permission helpers', () => {
  assert.equal(formatCPF('12345678909'), '123.456.789-09');
  assert.equal(maskCPF('123.456.789-09'), '***.456.789-**');
  assert.equal(isValidCPF('123.456.789-09'), true);
  assert.equal(isValidCPF('529.982.247-25'), true);
  assert.equal(isValidCPF('123.456.789-01'), false); // dígito verificador incorreto
  assert.equal(isValidCPF('111.111.111-11'), false);
  assert.equal(isValidCPF('123.456'), false);

  assert.equal(formatCNPJ('12345678000195'), '12.345.678/0001-95');
  assert.equal(isValidCNPJ('12.345.678/0001-95'), true);
  assert.equal(isValidCNPJ('11.222.333/0001-81'), true);
  assert.equal(isValidCNPJ('12.345.678/0001-99'), false); // dígito verificador incorreto
  assert.equal(isValidCNPJ('00.000.000/0000-00'), false);
  assert.equal(isValidCNPJ('12.345.678'), false);

  const cpfResolved = resolveAccountRoleFromDocument('123.456.789-09');
  assert.equal(cpfResolved.valid, true);
  assert.equal(cpfResolved.documentType, 'CPF');
  assert.equal(cpfResolved.role, 'candidate');

  const cnpjResolved = resolveAccountRoleFromDocument('12.345.678/0001-95');
  assert.equal(cnpjResolved.valid, true);
  assert.equal(cnpjResolved.documentType, 'CNPJ');
  assert.equal(cnpjResolved.role, 'company');

  // Strict RBAC checks including backward compatibility
  assert.equal(isCandidate({ documentType: 'CPF', type: 'company' }), true);
  assert.equal(isCompany({ documentType: 'CPF', type: 'company' }), false);

  assert.equal(isCompany({ documentType: 'CNPJ', type: 'candidate' }), true);
  assert.equal(isCandidate({ documentType: 'CNPJ', type: 'candidate' }), false);

  assert.equal(isCandidate({ type: 'candidate' }), true);
  assert.equal(isCompany({ type: 'company' }), true);
});

test('HX Design (Enviesados): calculateCandidateProgressCoach and getPositiveFramingMatchSummary', async () => {
  const {
    calculateCandidateProgressCoach,
    getPositiveFramingMatchSummary,
    SALARY_REFERENCE_ANCHORS,
    CATEGORY_SKILL_ANCHORS,
  } = await import('./matchAlgorithm');

  assert.ok(SALARY_REFERENCE_ANCHORS.length >= 4);
  assert.ok(CATEGORY_SKILL_ANCHORS.Administrativo.length >= 3);

  const partialCoach = calculateCandidateProgressCoach(
    {
      name: 'Mariana Silva',
      phone: '(18) 99999-1111',
      city: 'Presidente Prudente, SP',
      role: 'Analista Administrativo',
      education: 'Superior Completo',
      skills: ['Excel', 'Atendimento'],
    },
    false
  );
  assert.equal(partialCoach.percentage, 45);
  assert.equal(partialCoach.completedCount, 2);
  assert.equal(partialCoach.totalCount, 5);
  assert.ok(partialCoach.nextStepHint.includes('3 ou mais competências'));

  const fullCoach = calculateCandidateProgressCoach(
    {
      name: 'Mariana Silva',
      phone: '(18) 99999-1111',
      city: 'Presidente Prudente, SP',
      role: 'Analista Administrativo',
      education: 'Superior Completo',
      skills: ['Excel', 'Atendimento', 'Organização'],
      about: 'Profissional com 4 anos de atuação administrativa e atendimento em Presidente Prudente.',
    },
    true
  );
  assert.equal(fullCoach.percentage, 100);
  assert.equal(fullCoach.completedCount, 5);

  const framing = getPositiveFramingMatchSummary(
    ['Excel', 'Atendimento', 'Faturamento'],
    ['Excel', 'Atendimento'],
    80
  );
  assert.equal(framing.matchedCount, 2);
  assert.equal(framing.totalCount, 3);
  assert.ok(framing.headline.includes('Você já possui 2 de 3 competências'));
});

