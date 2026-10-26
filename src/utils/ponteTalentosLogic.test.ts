import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFontScaleConfig,
  formatBlindProfile,
  filterPonteJobs,
  generateStructuredVoiceResume,
  evaluateMicrochallenge,
  TalentPerson,
  PonteJob,
} from './ponteTalentosLogic';

const samplePerson: TalentPerson = {
  id: 't1',
  anonymousCode: '5082',
  name: 'Helena Vasconcelos',
  age: 58,
  graduationYear: 1991,
  generation: 'senior50',
  roleTitle: 'Especialista em Negociação B2B & Sucesso do Cliente',
  avatarInitials: 'HV',
  validatedSkills: ['Negociação Complexa', 'Gestão de Crises', 'Retenção de Contas'],
  practicalAchievement: 'Reduziu cancelamentos em 42% em contratos corporativos.',
};

const sampleJobs: PonteJob[] = [
  {
    id: 'j1',
    title: 'Dupla de Sucesso do Cliente & Automação IA',
    company: 'Grupo Elo Sênior-Jovem',
    location: 'Híbrido • São Paulo / Remoto',
    salaryRange: 'R$ 5.800 a R$ 7.400 / mês (por pessoa)',
    modality: 'Híbrido',
    workload: '30h semanais • Horário Flexível',
    slaDays: 3,
    slaReturnRate: 99,
    category: 'tandem',
    generationTag: 'tandem',
    acceptsTandem: true,
    practicalSkills: ['Atendimento Consultivo', 'Automação com IA', 'Escuta Ativa'],
    summary: 'Atuação em dupla intergeracional unindo empatia negocial e agilidade digital.',
    microChallengeQuestion: 'Um cliente antigo está frustrado com a nova plataforma digital. O que fazer nos primeiros 5 minutos?',
    microChallengeOptions: [
      {
        id: 'opt1',
        label: 'Acolher por telefone com escuta calma e guiar passo a passo com tela compartilhada.',
        isBestPractice: true,
        feedback: 'Excelente! Combina acolhimento humano sênior com resolução digital ágil.',
      },
      {
        id: 'opt2',
        label: 'Enviar apenas o link do manual em PDF por e-mail.',
        isBestPractice: false,
        feedback: 'Resolve parcialmente, mas perde a conexão empática que retém o cliente.',
      },
    ],
  },
  {
    id: 'j2',
    title: 'Consultor(a) Sênior de Operações & Mentoria Interna',
    company: 'Vanguarda Logística Humana',
    location: 'Presencial • Meio Período',
    salaryRange: 'R$ 6.200 a R$ 8.000 / mês',
    modality: 'Presencial',
    workload: '24h semanais • Meio Período',
    slaDays: 4,
    slaReturnRate: 98,
    category: 'senior50',
    generationTag: 'senior50',
    acceptsTandem: false,
    practicalSkills: ['Liderança Situacional', 'Controle de Qualidade', 'Treinamento de Jovens'],
    summary: 'Foco em maturidade emocional e formação da nova geração de operadores.',
    microChallengeQuestion: 'Como engajar jovens aprendizes no cumprimento de normas de segurança?',
    microChallengeOptions: [
      {
        id: 'optA',
        label: 'Demonstrar na prática o motivo de cada regra e criar checklists gamificados em dupla.',
        isBestPractice: true,
        feedback: 'Perfeito! Une sabedoria prática 50+ com linguagem visual jovem.',
      },
    ],
  },
];

test('WCAG 2.2 Font Scale: returns exact pixel sizes (16px, 18px, 20px)', () => {
  assert.equal(getFontScaleConfig('normal').fontSizePx, '16px');
  assert.equal(getFontScaleConfig('large').fontSizePx, '18px');
  assert.equal(getFontScaleConfig('xlarge').fontSizePx, '20px');
});

test('Blind Hiring Mode: hides name, age, graduation year, and initials when active', () => {
  const visible = formatBlindProfile(samplePerson, false);
  assert.equal(visible.isAnonymized, false);
  assert.ok(visible.displayName.includes('Helena Vasconcelos'));
  assert.ok(visible.displaySubtitle.includes('58 anos'));
  assert.ok(visible.displaySubtitle.includes('1991'));

  const blind = formatBlindProfile(samplePerson, true);
  assert.equal(blind.isAnonymized, true);
  assert.equal(blind.displayName, 'Talento Anônimo #5082');
  assert.ok(!blind.displaySubtitle.includes('58'));
  assert.ok(!blind.displaySubtitle.includes('1991'));
  assert.equal(blind.displayAvatar, 'ID');
});

test('Job Filtering: filters by category (tandem, senior50, flexivel) and voice/text query', () => {
  const all = filterPonteJobs(sampleJobs, '', 'all');
  assert.equal(all.length, 2);

  const tandemOnly = filterPonteJobs(sampleJobs, '', 'tandem');
  assert.equal(tandemOnly.length, 1);
  assert.equal(tandemOnly[0].id, 'j1');

  const flexOnly = filterPonteJobs(sampleJobs, '', 'flexivel');
  assert.equal(flexOnly.length, 2);

  const bySearch = filterPonteJobs(sampleJobs, 'Mentoria Interna', 'all');
  assert.equal(bySearch.length, 1);
  assert.equal(bySearch[0].id, 'j2');
});

test('Voice Resume Generator: extracts practical competencies from 3 guided answers', () => {
  const resume = generateStructuredVoiceResume({
    q1Experience: 'Trabalhei 20 anos liderando equipe de atendimento ao cliente e negociação comercial.',
    q2DailySkills: 'Hoje uso ferramentas de IA e Excel para organizar processos e metas.',
    q3GoalAndSchedule: 'Busco horário flexível ou atuação em dupla intergeracional.',
  });

  assert.equal(resume.completenessScore, 100);
  assert.ok(resume.extractedCompetencies.includes('Resolução Empática de Conflitos'));
  assert.ok(resume.extractedCompetencies.includes('Liderança & Mentoria de Equipes'));
  assert.ok(resume.extractedCompetencies.includes('Fluência em Ferramentas Digitais & IA'));
});

test('Microchallenge Evaluator: validates best practice option and awards 98% competency score', () => {
  const res = evaluateMicrochallenge(sampleJobs[0], 'opt1');
  assert.equal(res.passed, true);
  assert.equal(res.score, 98);
  assert.ok(res.badgeLabel.includes('Top 5%'));
});
