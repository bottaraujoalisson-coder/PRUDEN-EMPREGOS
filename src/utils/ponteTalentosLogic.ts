export type FontScaleMode = 'normal' | 'large' | 'xlarge';

export type JobCategoryFilter =
  | 'all'
  | 'jovem'
  | 'senior50'
  | 'tandem'
  | 'flexivel';

export interface PonteJob {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryRange: string;
  modality: string;
  workload: string;
  slaDays: number;
  slaReturnRate: number;
  category: 'jovem' | 'senior50' | 'tandem' | 'flexivel';
  generationTag: 'genz' | 'senior50' | 'tandem';
  acceptsTandem: boolean;
  practicalSkills: string[];
  summary: string;
  microChallengeQuestion: string;
  microChallengeOptions: {
    id: string;
    label: string;
    isBestPractice: boolean;
    feedback: string;
  }[];
}

export interface TalentPerson {
  id: string;
  anonymousCode: string;
  name: string;
  age: number;
  graduationYear: number;
  generation: 'genz' | 'senior50';
  roleTitle: string;
  avatarInitials: string;
  validatedSkills: string[];
  practicalAchievement: string;
}

export interface TandemPair {
  id: string;
  pairCode: string;
  synergyTitle: string;
  combinedImpact: string;
  compatibilityScore: number;
  targetArea: string;
  youngTalent: TalentPerson;
  seniorTalent: TalentPerson;
  appliedJobIds: string[];
}

export interface MentorshipSession {
  id: string;
  title: string;
  direction: 'senior_to_young' | 'young_to_senior';
  mentor: TalentPerson;
  topicTag: string;
  duration: string;
  availableSlot: string;
  badgeAwarded: string;
  spotsLeft: number;
}

export interface StructuredVoiceResume {
  candidateCode: string;
  generatedAt: string;
  headline: string;
  practicalExperienceSummary: string;
  dailySkillsSummary: string;
  availabilityAndGoal: string;
  extractedCompetencies: string[];
  completenessScore: number;
}

export function getFontScaleConfig(scale: FontScaleMode): {
  fontSizePx: string;
  label: string;
  scaleMultiplier: number;
} {
  switch (scale) {
    case 'large':
      return { fontSizePx: '18px', label: 'Grande (18px)', scaleMultiplier: 1.125 };
    case 'xlarge':
      return { fontSizePx: '20px', label: 'Extra Grande (20px)', scaleMultiplier: 1.25 };
    case 'normal':
    default:
      return { fontSizePx: '16px', label: 'Normal (16px)', scaleMultiplier: 1 };
  }
}

export function formatBlindProfile(
  person: TalentPerson,
  blindHiringActive: boolean
): {
  displayName: string;
  displaySubtitle: string;
  displayAvatar: string;
  isAnonymized: boolean;
} {
  if (blindHiringActive) {
    return {
      displayName: `Talento Anônimo #${person.anonymousCode}`,
      displaySubtitle: `${person.roleTitle} • Identidade, Idade e Formação Ocultadas (Sem Viés)`,
      displayAvatar: 'ID',
      isAnonymized: true,
    };
  }

  const genLabel =
    person.generation === 'genz'
      ? `${person.age} anos • Impulso Digital`
      : `${person.age} anos • Experiência 50+ (Formação ${person.graduationYear})`;

  return {
    displayName: person.name,
    displaySubtitle: `${person.roleTitle} • ${genLabel}`,
    displayAvatar: person.avatarInitials,
    isAnonymized: false,
  };
}

export function filterPonteJobs(
  jobs: PonteJob[],
  searchQuery: string,
  category: JobCategoryFilter
): PonteJob[] {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return jobs.filter((job) => {
    const matchesCategory =
      category === 'all' ||
      job.category === category ||
      (category === 'tandem' && job.acceptsTandem) ||
      (category === 'flexivel' &&
        (job.category === 'flexivel' ||
          job.workload.toLowerCase().includes('flexível') ||
          job.workload.toLowerCase().includes('meio período') ||
          job.workload.toLowerCase().includes('20h') ||
          job.workload.toLowerCase().includes('30h')));

    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const searchableText = [
      job.title,
      job.company,
      job.location,
      job.modality,
      job.workload,
      job.summary,
      ...job.practicalSkills,
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export function generateStructuredVoiceResume(answers: {
  q1Experience: string;
  q2DailySkills: string;
  q3GoalAndSchedule: string;
}): StructuredVoiceResume {
  const q1 = answers.q1Experience.trim();
  const q2 = answers.q2DailySkills.trim();
  const q3 = answers.q3GoalAndSchedule.trim();

  const combined = `${q1} ${q2} ${q3}`.toLowerCase();
  const detectedSkills: string[] = [];

  const dictionary: Array<{ keywords: string[]; tag: string }> = [
    { keywords: ['cliente', 'atendimento', 'ouvir', 'conflito', 'público'], tag: 'Resolução Empática de Conflitos' },
    { keywords: ['equipe', 'lider', 'trein', 'pessoas', 'gestão'], tag: 'Liderança & Mentoria de Equipes' },
    { keywords: ['ia', 'inteligência artificial', 'digital', 'automação', 'sistema', 'excel'], tag: 'Fluência em Ferramentas Digitais & IA' },
    { keywords: ['venda', 'negocia', 'comercial', 'meta', 'b2b'], tag: 'Negociação Consultiva & Fechamento' },
    { keywords: ['organiza', 'prazo', 'processo', 'qualidade', 'logística', 'estoque'], tag: 'Gestão de Processos & Pontualidade' },
    { keywords: ['flexível', 'meio período', 'remoto', 'híbrido', 'manhã', 'tarde'], tag: 'Adaptabilidade de Rotina' },
  ];

  for (const entry of dictionary) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      detectedSkills.push(entry.tag);
    }
  }

  if (detectedSkills.length < 3) {
    const defaults = [
      'Comunicação Intergeracional Clara',
      'Foco em Resultados Práticos',
      'Colaboração em Dupla (Tandem)',
    ];
    for (const d of defaults) {
      if (!detectedSkills.includes(d) && detectedSkills.length < 4) {
        detectedSkills.push(d);
      }
    }
  }

  const filledCount = [q1, q2, q3].filter((s) => s.length >= 10).length;
  const completenessScore = Math.min(100, 40 + filledCount * 20);

  return {
    candidateCode: 'PT-VOZ-904',
    generatedAt: 'Gerado instantaneamente via Voz Guiada',
    headline: 'Perfil Estruturado por Competências Práticas (Sem Viés Etário)',
    practicalExperienceSummary:
      q1 || 'Experiência prática validada na resolução de problemas reais em equipe.',
    dailySkillsSummary:
      q2 || 'Domínio prático de atendimento humano, organização de fluxos e tecnologia.',
    availabilityAndGoal:
      q3 || 'Disponibilidade imediata para atuação individual ou em Dupla Intergeracional.',
    extractedCompetencies: detectedSkills,
    completenessScore,
  };
}

export function evaluateMicrochallenge(
  job: PonteJob,
  selectedOptionId: string
): {
  passed: boolean;
  score: number;
  feedback: string;
  badgeLabel: string;
} {
  const option = job.microChallengeOptions.find((o) => o.id === selectedOptionId);
  if (!option) {
    return {
      passed: false,
      score: 0,
      feedback: 'Selecione uma alternativa para validar sua resolução prática.',
      badgeLabel: 'Pendente',
    };
  }

  if (option.isBestPractice) {
    return {
      passed: true,
      score: 98,
      feedback: option.feedback,
      badgeLabel: 'Competência Prática Validada (Top 5%)',
    };
  }

  return {
    passed: true,
    score: 78,
    feedback: option.feedback,
    badgeLabel: 'Participação Prática Registrada (78% Aderência)',
  };
}
