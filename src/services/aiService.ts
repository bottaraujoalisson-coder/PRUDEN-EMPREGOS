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
  const res = await fetch('/api/ai/optimize-cv', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao otimizar currículo com IA');
  }

  return res.json();
}

export async function requestJobOptimization(params: {
  title: string;
  category?: string;
  workModel?: string;
  experience?: string;
  skills?: string[];
  roughNotes?: string;
}): Promise<JobOptimizeResponse> {
  const res = await fetch('/api/ai/optimize-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Falha ao estruturar vaga com IA');
  }

  return res.json();
}
