import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Job } from '../types';
import { stripUndefined } from '../utils/matchAlgorithm';

const NOW_MS = Date.now();
const PLUS_30_DAYS_ISO = new Date(NOW_MS + 30 * 24 * 60 * 60 * 1000).toISOString();
export const JOBS_PAGE_SIZE = 24;

export const INITIAL_PRUDENTE_DEMO_JOBS: Job[] = [
  {
    id: 'job-prudente-demo-1',
    companyId: 'comp-prudente-tech',
    companyName: 'PrudenTech Sistemas & Inovação',
    title: 'Desenvolvedor Front-End React/TypeScript',
    location: 'Presidente Prudente, SP',
    category: 'Tecnologia',
    workModel: 'Híbrido',
    contract: 'CLT',
    experience: 'Pleno',
    salaryType: 'exact',
    salaryMin: 4200,
    salaryRange: 'R$ 4.200,00',
    featured: true,
    premium: true,
    companyVerified: true,
    acceptsFirstJob: false,
    requiresCnh: 'nao',
    requiresVehicle: 'nao',
    benefits: ['Vale-Alimentação', 'Plano de Saúde', 'Plano Odontológico', 'Horário Flexível'],
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'APIs REST', 'Git'],
    description:
      'Atuação no desenvolvimento e evolução de aplicações web modernas em React e TypeScript para empresas de Presidente Prudente e Oeste Paulista.\n\nPrincipais atribuições:\n• Construir interfaces responsivas, acessíveis e de alta performance;\n• Integrar sistemas front-end com APIs REST e serviços em nuvem;\n• Participar de revisões de código e ritos ágeis junto ao time de produto;\n• Garantir qualidade visual, usabilidade e boas práticas de engenharia.',
    status: 'active',
    applicantCount: 4,
    createdAt: new Date(NOW_MS - 3 * 60 * 60 * 1000).toISOString(),
    expiresAt: PLUS_30_DAYS_ISO,
  },
  {
    id: 'job-prudente-demo-2',
    companyId: 'comp-prudente-adm',
    companyName: 'Grupo Oeste Paulista Gestão & Negócios',
    title: 'Assistente Administrativo Financeiro',
    location: 'Presidente Prudente, SP',
    category: 'Administrativo',
    workModel: 'Presencial',
    contract: 'CLT',
    experience: 'Júnior',
    salaryType: 'exact',
    salaryMin: 2450,
    salaryRange: 'R$ 2.450,00',
    featured: false,
    companyVerified: true,
    acceptsFirstJob: false,
    requiresCnh: 'B',
    requiresVehicle: 'nao',
    benefits: ['Vale-Alimentação', 'Vale-Transporte', 'Seguro de Vida'],
    skills: ['Contas a Pagar e Receber', 'Conciliação Bancária', 'Emissão de Notas', 'Pacote Office', 'Organização'],
    description:
      'Oportunidade para atuar no setor administrativo e financeiro no centro de Presidente Prudente.\n\nPrincipais atribuições:\n• Controle diário de contas a pagar e a receber e fluxo de caixa;\n• Emissão de notas fiscais (NF-e / NFS-e) e boletos bancários;\n• Conciliação bancária e organização de documentos para contabilidade;\n• Atendimento a fornecedores e suporte às rotinas administrativas.',
    status: 'active',
    applicantCount: 7,
    createdAt: new Date(NOW_MS - 6 * 60 * 60 * 1000).toISOString(),
    expiresAt: PLUS_30_DAYS_ISO,
  },
  {
    id: 'job-prudente-demo-3',
    companyId: 'comp-prudente-comercio',
    companyName: 'PrudenMais Comercial & Distribuidora',
    title: 'Consultor(a) de Vendas Internas',
    location: 'Presidente Prudente, SP',
    category: 'Comércio',
    workModel: 'Presencial',
    contract: 'CLT',
    experience: 'Júnior',
    salaryType: 'exact',
    salaryMin: 2200,
    salaryRange: 'R$ 2.200,00 + comissão',
    featured: true,
    companyVerified: true,
    acceptsFirstJob: true,
    requiresCnh: 'nao',
    requiresVehicle: 'nao',
    benefits: ['Comissão', 'Vale-Alimentação', 'Vale-Transporte', 'Plano Odontológico'],
    skills: ['Vendas Consultivas', 'Atendimento WhatsApp', 'Negociação', 'CRM', 'Metas'],
    description:
      'Buscamos profissional comunicativo(a) e focado(a) em resultados para integrar nosso time comercial em Presidente Prudente.\n\nPrincipais atribuições:\n• Atendimento consultivo a clientes via WhatsApp, telefone e presencial;\n• Elaboração de orçamentos, acompanhamento de propostas e fechamento de pedidos;\n• Gestão ativa da carteira de clientes no CRM e pós-venda;\n• Alcance de metas mensais com comissionamento atrativo.',
    status: 'active',
    applicantCount: 9,
    createdAt: new Date(NOW_MS - 10 * 60 * 60 * 1000).toISOString(),
    expiresAt: PLUS_30_DAYS_ISO,
  },
  {
    id: 'job-prudente-demo-4',
    companyId: 'comp-prudente-aprendiz',
    companyName: 'Santa Casa & Rede Saúde Prudente',
    title: 'Jovem Aprendiz — Atendimento e Rotinas de Escritório',
    location: 'Presidente Prudente, SP',
    category: 'Primeiro Emprego',
    workModel: 'Presencial',
    contract: 'Jovem Aprendiz',
    experience: 'Primeiro Emprego',
    salaryType: 'exact',
    salaryMin: 1150,
    salaryRange: 'R$ 1.150,00',
    featured: false,
    companyVerified: true,
    acceptsFirstJob: true,
    requiresCnh: 'nao',
    requiresVehicle: 'nao',
    benefits: ['Vale-Transporte', 'Vale-Alimentação', 'Seguro de Vida'],
    skills: ['Atendimento ao Cliente', 'Pacote Office', 'Organização', 'Comunicação Clara'],
    description:
      'Excelente oportunidade de primeiro emprego para jovens de Presidente Prudente iniciarem sua trajetória profissional com acompanhamento e capacitação.\n\nPrincipais atribuições:\n• Apoio na recepção, triagem de atendimento e orientação ao público;\n• Organização e digitalização de documentos e prontuários administrativos;\n• Preenchimento de planilhas e auxílio nas rotinas diárias de escritório.',
    status: 'active',
    applicantCount: 14,
    createdAt: new Date(NOW_MS - 14 * 60 * 60 * 1000).toISOString(),
    expiresAt: PLUS_30_DAYS_ISO,
  },
  {
    id: 'job-prudente-demo-5',
    companyId: 'comp-prudente-ti',
    companyName: 'NetOeste Telecom & Soluções TI',
    title: 'Estagiário(a) de Suporte Técnico e TI',
    location: 'Presidente Prudente, SP',
    category: 'Tecnologia',
    workModel: 'Presencial',
    contract: 'Estágio',
    experience: 'Estágio',
    salaryType: 'exact',
    salaryMin: 1500,
    salaryRange: 'R$ 1.500,00',
    featured: false,
    companyVerified: true,
    acceptsFirstJob: true,
    requiresCnh: 'nao',
    requiresVehicle: 'nao',
    benefits: ['Vale-Transporte', 'Auxílio Combustível', 'Horário Flexível'],
    skills: ['Suporte Técnico', 'Redes', 'Manutenção de Computadores', 'Windows', 'Atendimento ao Usuário'],
    description:
      'Vaga de estágio para estudantes de Ciência da Computação, Sistemas de Informação, Análise e Desenvolvimento de Sistemas ou cursos técnicos em TI em Presidente Prudente.\n\nPrincipais atribuições:\n• Atendimento de chamados de suporte técnico N1 (presencial e remoto);\n• Instalação e configuração de softwares, impressoras e estações de trabalho;\n• Verificação básica de redes cabeamento/Wi-Fi e apoio à equipe de infraestrutura.',
    status: 'active',
    applicantCount: 6,
    createdAt: new Date(NOW_MS - 18 * 60 * 60 * 1000).toISOString(),
    expiresAt: PLUS_30_DAYS_ISO,
  },
  {
    id: 'job-prudente-demo-6',
    companyId: 'comp-prudente-rh',
    companyName: 'AgroPrudente Indústria & Logística',
    title: 'Analista de Recursos Humanos e Departamento Pessoal',
    location: 'Presidente Prudente, SP',
    category: 'Administrativo',
    workModel: 'Presencial',
    contract: 'CLT',
    experience: 'Pleno',
    salaryType: 'exact',
    salaryMin: 3600,
    salaryRange: 'R$ 3.600,00',
    featured: false,
    companyVerified: true,
    acceptsFirstJob: false,
    requiresCnh: 'B',
    requiresVehicle: 'nao',
    benefits: ['Vale-Alimentação', 'Plano de Saúde', 'Plano Odontológico', 'Seguro de Vida'],
    skills: ['Recrutamento e Seleção', 'Departamento Pessoal', 'eSocial', 'Folha de Pagamento', 'Treinamento'],
    description:
      'Atuação generalista em Recursos Humanos e Departamento Pessoal em indústria de médio porte localizada em Presidente Prudente.\n\nPrincipais atribuições:\n• Condução completa de processos de recrutamento, seleção e integração (onboarding);\n• Conferência de ponto eletrônico, admissões, férias, rescisões e rotinas do eSocial;\n• Gestão de benefícios corporativos e ações de clima organizacional.',
    status: 'active',
    applicantCount: 5,
    createdAt: new Date(NOW_MS - 22 * 60 * 60 * 1000).toISOString(),
    expiresAt: PLUS_30_DAYS_ISO,
  },
];

function isLegacyTestJob(job: Partial<Job>, id: string): boolean {
  if (id.startsWith('job-seed-') || job.isTestRecord === true) return true;
  const companyNorm = (job.companyName || '').trim();
  const titleNorm = (job.title || '').trim().toLowerCase();
  if (
    /^empresa teste$/i.test(companyNorm) ||
    (companyNorm.toLowerCase().includes('empresa teste') && titleNorm === 'programador')
  ) {
    return true;
  }
  return false;
}

export function subscribeJobs(callback: (jobs: Job[]) => void): () => void {
  const jobsRef = collection(db, 'jobs');
  const q = query(jobsRef, orderBy('createdAt', 'desc'), limit(JOBS_PAGE_SIZE));

  return onSnapshot(
    q,
    (snapshot) => {
      const firestoreJobs: Job[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as Omit<Job, 'id'>;
        if (isLegacyTestJob(data, docSnap.id)) {
          deleteDoc(doc(db, 'jobs', docSnap.id)).catch(() => {});
          return;
        }
        firestoreJobs.push({ id: docSnap.id, ...data });
      });

      const byId = new Map<string, Job>();
      for (const job of firestoreJobs) {
        byId.set(job.id, job);
      }
      for (const demoJob of INITIAL_PRUDENTE_DEMO_JOBS) {
        if (!byId.has(demoJob.id)) {
          byId.set(demoJob.id, demoJob);
        }
      }

      callback(Array.from(byId.values()));
    },
    (error) => {
      console.error('Jobs snapshot listener error:', error);
      callback(INITIAL_PRUDENTE_DEMO_JOBS);
    }
  );
}

export async function fetchJobsPage(lastDoc?: QueryDocumentSnapshot): Promise<{
  jobs: Job[];
  lastVisible: QueryDocumentSnapshot | null;
}> {
  const jobsRef = collection(db, 'jobs');
  const q = lastDoc
    ? query(jobsRef, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(JOBS_PAGE_SIZE))
    : query(jobsRef, orderBy('createdAt', 'desc'), limit(JOBS_PAGE_SIZE));

  const snap = await getDocs(q);
  const jobs: Job[] = [];
  snap.docs.forEach((docSnap) => {
    const data = docSnap.data() as Omit<Job, 'id'>;
    if (!isLegacyTestJob(data, docSnap.id)) {
      jobs.push({ id: docSnap.id, ...data });
    }
  });
  const lastVisible = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { jobs, lastVisible };
}

export async function createJob(
  jobData: Omit<Job, 'id' | 'createdAt' | 'applicantCount'>
): Promise<string> {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const defaultExpiresAt = new Date(nowMs + 30 * 24 * 60 * 60 * 1000).toISOString();

  const fullJob: Job = stripUndefined({
    ...jobData,
    id: jobId,
    applicantCount: 0,
    createdAt: now,
    updatedAt: now,
    expiresAt: jobData.expiresAt || defaultExpiresAt,
  });

  try {
    await setDoc(doc(db, 'jobs', jobId), fullJob);
    return jobId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `jobs/${jobId}`);
  }
}

export async function updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
  try {
    const jobRef = doc(db, 'jobs', jobId);
    const payload = stripUndefined({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(jobRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `jobs/${jobId}`);
  }
}

export async function deleteJob(jobId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'jobs', jobId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `jobs/${jobId}`);
  }
}
