export interface CvOptimizeResponse {
  enhancedSummary: string;
  suggestedSkills: string[];
  tips: string[];
}

export interface JobOptimizeResponse {
  description: string;
  suggestedSkills: string[];
}

export async function requestCvOptimization(params: {
  role?: string;
  skills?: string[];
  about?: string;
  experienceLevel?: string;
}): Promise<CvOptimizeResponse> {
  try {
    const res = await fetch('/api/ai/optimize-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Usa otimização local estruturada se hospedado em CDN estática
  }

  const skillsStr = Array.isArray(params.skills) ? params.skills.join(', ') : '';
  return {
    enhancedSummary: `Profissional dedicado com foco em ${params.role || 'desenvolvimento e resultados'}. Experiência sólida e conhecimentos práticos em ${skillsStr || 'processos da área'}. Perfil orientado a entregas de qualidade, aprendizado contínuo e colaboração em equipe em Presidente Prudente e região.`,
    suggestedSkills: ['Trabalho em Equipe', 'Comunicação Assertiva', 'Resolução de Problemas'],
    tips: [
      'Destaque métricas concretas e resultados obtidos em experiências anteriores.',
      'Mantenha as habilidades mais relevantes para o cargo almejado no topo do currículo.',
      'Adicione cursos e certificações recentes para valorizar sua formação.',
    ],
  };
}

export async function requestJobOptimization(params: {
  title: string;
  category?: string;
  workModel?: string;
  experience?: string;
  skills?: string[];
  roughNotes?: string;
}): Promise<JobOptimizeResponse> {
  try {
    const res = await fetch('/api/ai/optimize-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok && (res.headers.get('content-type') || '').includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Usa estruturação local se hospedado em CDN estática
  }

  return {
    description: `Buscamos um(a) ${params.title} comprometido(a) e proativo(a) para integrar nossa equipe em Presidente Prudente e região.\n\nPrincipais Responsabilidades:\n- Executar rotinas estratégicas e operacionais na área de ${params.category || 'atuação'}.\n- Colaborar com a equipe no cumprimento de metas de qualidade e atendimento.\n- Contribuir ativamente para a melhoria contínua dos processos internos.\n\nRequisitos Desejáveis:\n- Vivência compatível com o nível ${params.experience || 'solicitado'} na modalidade ${params.workModel || 'Presencial'}.\n- Conhecimento prático em ${Array.isArray(params.skills) && params.skills.length > 0 ? params.skills.join(', ') : 'ferramentas essenciais do setor'}.`,
    suggestedSkills: [
      'Comunicação Assertiva',
      'Proatividade',
      'Organização',
      'Trabalho em Equipe',
      'Foco em Resultados',
    ],
  };
}
