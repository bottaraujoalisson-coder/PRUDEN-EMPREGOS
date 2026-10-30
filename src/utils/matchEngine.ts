export interface MatchBreakdown {
  skillsScore: number;      // Máx: 40
  experienceScore: number;  // Máx: 25
  keywordsScore: number;    // Máx: 20
  locationScore: number;    // Máx: 15
  totalScore: number;       // 0 a 100
  matchedSkills: string[];
  missingSkills: string[];
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    keywordsScore: number;
    locationScore: number;
  };
}

const PRUDENTE_REGION_CITIES = [
  'presidente prudente',
  'alvares machado',
  'regente feijo',
  'pirapozinho',
  'martinopolis',
  'presidente bernardes',
  'santo anastacio',
  'anhandui',
  'indiana',
  'tarabai',
];

function normalizeText(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function calculateDeterministicMatch(candidateProfile: any, job: any): MatchBreakdown {
  // 1. Habilidades / Competências (40 pontos)
  const rawJobSkills = Array.isArray(job?.skills) && job.skills.length > 0
    ? job.skills
    : Array.isArray(job?.requiredSkills)
    ? job.requiredSkills
    : [];
  const jobSkills: string[] = rawJobSkills.map((s: string) => normalizeText(s)).filter(Boolean);
  const candidateSkills: string[] = Array.isArray(candidateProfile?.skills)
    ? candidateProfile.skills.map((s: string) => normalizeText(s)).filter(Boolean)
    : [];
  const candidateFullText = normalizeText(
    `${candidateProfile?.desiredRole || candidateProfile?.role || ''} ${
      candidateProfile?.bio || candidateProfile?.about || candidateProfile?.summary || ''
    } ${candidateSkills.join(' ')} ${JSON.stringify(candidateProfile?.experiences || [])}`
  );

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  let skillsScore = 0;
  if (jobSkills.length === 0) {
    skillsScore = candidateSkills.length > 0 ? 32 : 20;
  } else {
    for (const reqSkill of jobSkills) {
      if (
        candidateSkills.some((cs) => cs.includes(reqSkill) || reqSkill.includes(cs)) ||
        candidateFullText.includes(reqSkill)
      ) {
        matchedSkills.push(reqSkill);
      } else {
        missingSkills.push(reqSkill);
      }
    }
    skillsScore = Math.round((matchedSkills.length / jobSkills.length) * 40);
  }

  // 2. Experiência Profissional (25 pontos)
  const experiences = Array.isArray(candidateProfile?.experiences)
    ? candidateProfile.experiences
    : [];
  const isFirstJobOrIntern =
    Boolean(job?.acceptsFirstJob) ||
    job?.experience === 'Primeiro Emprego' ||
    job?.experience === 'Estágio' ||
    job?.contract === 'Estágio' ||
    job?.contract === 'Jovem Aprendiz';

  const candExpLevel = normalizeText(candidateProfile?.experienceLevel || '');
  const jobExpLevel = normalizeText(job?.experienceLevel || job?.experience || '');

  let experienceScore = 0;
  if (isFirstJobOrIntern) {
    experienceScore = 25;
  } else if (experiences.length >= 3 || (candExpLevel && jobExpLevel && candExpLevel === jobExpLevel)) {
    experienceScore = 25;
  } else if (experiences.length === 2) {
    experienceScore = 20;
  } else if (experiences.length === 1) {
    experienceScore = 15;
  } else if ((candidateProfile?.bio || candidateProfile?.about || candidateProfile?.summary || '').length > 60) {
    experienceScore = 10;
  } else {
    experienceScore = 5;
  }

  // 3. Palavras-Chave do Cargo e Descrição (20 pontos)
  const rawJobTokens = normalizeText(
    `${job?.title || ''} ${job?.description || ''} ${job?.requirements || ''}`
  )
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  const uniqueJobKeywords = Array.from(new Set(rawJobTokens)).slice(0, 25);

  let keywordsScore = 0;
  if (uniqueJobKeywords.length > 0) {
    const matchedKeywords = uniqueJobKeywords.filter((kw) => candidateFullText.includes(kw));
    keywordsScore = Math.min(
      20,
      Math.round((matchedKeywords.length / Math.min(uniqueJobKeywords.length, 12)) * 20)
    );
  } else {
    keywordsScore = 12;
  }

  // 4. Localização e Modalidade (15 pontos)
  const modality = normalizeText(job?.modality || job?.workModel || 'presencial');
  const candidateCity = normalizeText(candidateProfile?.city || '');
  const jobCity = normalizeText(job?.city || job?.location || 'presidente prudente');

  let locationScore = 0;
  if (modality.includes('remot')) {
    locationScore = 15;
  } else if (
    candidateCity &&
    jobCity &&
    (candidateCity.includes(jobCity) || jobCity.includes(candidateCity))
  ) {
    locationScore = 15;
  } else if (
    PRUDENTE_REGION_CITIES.some((c) => candidateCity.includes(c)) &&
    PRUDENTE_REGION_CITIES.some((c) => jobCity.includes(c))
  ) {
    locationScore = 10;
  } else if (candidateCity) {
    locationScore = 5;
  }

  const totalScore = Math.min(100, skillsScore + experienceScore + keywordsScore + locationScore);

  return {
    skillsScore,
    experienceScore,
    keywordsScore,
    locationScore,
    totalScore,
    matchedSkills,
    missingSkills,
    breakdown: {
      skillsScore,
      experienceScore,
      keywordsScore,
      locationScore,
    },
  };
}
