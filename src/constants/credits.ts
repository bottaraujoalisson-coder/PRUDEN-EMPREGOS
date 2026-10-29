export const INITIAL_WELCOME_CREDITS = 30;
export const INITIAL_FREE_CREDITS = INITIAL_WELCOME_CREDITS;

// Custos oficiais padronizados (RF-015, RF-019, RF-020, RF-023)
export const APPLICATION_CREDIT_COST = 10;
export const APPLY_JOB_CREDIT_COST = APPLICATION_CREDIT_COST;

export const JOB_POSTING_CREDIT_COST = 10;
export const POST_JOB_CREDIT_COST = JOB_POSTING_CREDIT_COST;

export const JOB_HIGHLIGHT_CREDIT_COST = 15;
export const BOOST_JOB_CREDIT_COST = JOB_HIGHLIGHT_CREDIT_COST;

export const RESUME_GENERATION_COST = 15;
export const RESUME_GENERATION_CREDIT_COST = RESUME_GENERATION_COST;
export const RESUME_PDF_CREDIT_COST = RESUME_GENERATION_COST;

export interface CreditPackage {
  id: string;
  title: string;
  subtitle?: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  originalPrice: number;
  description: string;
  badge?: string;
  badgeVariant?: 'featured' | 'neutral';
  isFeatured?: boolean;
  costPerCredit: number;
  ctaLabel: string;
  features: string[];
}

export const EXPANDED_JOB_CATEGORIES = [
  'Tecnologia da Informação',
  'Administração e Finanças',
  'Comercial e Vendas',
  'Engenharia e Obras',
  'Saúde e Bem-Estar',
  'Educação e Ensino',
  'Logística e Transporte',
  'Marketing e Comunicação',
  'Jurídico e Contábil',
  'Atendimento e Operacional',
] as const;

export const CONTRACT_FILTER_PILLS = [
  { label: 'Todas', value: 'Todos os Contratos' },
  { label: 'Primeiro Emprego', value: 'Primeiro Emprego' },
  { label: 'Estágio', value: 'Estágio' },
  { label: 'CLT', value: 'CLT' },
  { label: 'PJ', value: 'PJ' },
  { label: 'Freelancer', value: 'Freelancer' },
] as const;

export const OFFICIAL_CREDIT_PACKAGES: Record<string, CreditPackage> = {
  pack_starter: {
    id: 'pack_starter',
    title: 'Pacote Inicial / Candidatura Rápida',
    credits: 10,
    bonusCredits: 0,
    totalCredits: 10,
    price: 14.9,
    originalPrice: 19.9,
    description: 'Ideal para 1 candidatura a vaga ou 1 publicação de vaga por 30 dias.',
    costPerCredit: 1.49,
    ctaLabel: 'Liberar +10 Créditos Agora',
    features: [
      '10 créditos para uso imediato (sem expiração)',
      'Suficiente para 1 candidatura ou 1 publicação de vaga (10 cr)',
      'Liberação instantânea via Pix ou Cartão no Mercado Pago',
    ],
  },
  pack_resume_15: {
    id: 'pack_resume_15',
    title: 'Pacote Currículo ATS & Destaque',
    credits: 15,
    bonusCredits: 0,
    totalCredits: 15,
    price: 19.9,
    originalPrice: 29.9,
    description:
      'Exato para gerar 1 Currículo PDF Padrão ATS com IA ou destacar 1 vaga no topo das buscas.',
    costPerCredit: 1.32,
    ctaLabel: 'Adquirir +15 Créditos via Pix',
    features: [
      '15 créditos liberados imediatamente após confirmação Pix',
      'Exato para 1 Currículo Profissional PDF ATS (15 cr) ou 1 Destaque de Vaga (15 cr)',
      'Créditos nunca expiram na sua carteira',
    ],
  },
  pack_pro: {
    id: 'pack_pro',
    title: 'Pacote Crescimento Pro',
    credits: 30,
    bonusCredits: 5,
    totalCredits: 35,
    price: 44.9,
    originalPrice: 69.9,
    badge: 'MAIS ESCOLHIDO EM PRESIDENTE PRUDENTE • +5 BÔNUS',
    badgeVariant: 'featured',
    isFeatured: true,
    description:
      'Mais popular para candidatos ativos e PMEs em expansão em Presidente Prudente e região.',
    costPerCredit: 1.28,
    ctaLabel: 'Garantir +35 Créditos (Com Bônus)',
    features: [
      '35 créditos no total (30 + 5 créditos grátis de bônus)',
      'Economia imediata de R$ 25,00 sobre o valor avulso',
      'Permite publicar e destacar vaga (25 cr) + 1 nova vaga (10 cr)',
      'Desbloqueio com 1 clique e créditos sem expiração',
    ],
  },
  pack_business: {
    id: 'pack_business',
    title: 'Pacote Corporativo Max',
    credits: 80,
    bonusCredits: 20,
    totalCredits: 100,
    price: 109.9,
    originalPrice: 149.9,
    badge: 'MENOR CUSTO POR CRÉDITO • +20 BÔNUS',
    badgeVariant: 'neutral',
    isFeatured: false,
    description:
      'Melhor custo-benefício (R$ 1,09/cr) para indústrias, comércios e recrutamento contínuo.',
    costPerCredit: 1.09,
    ctaLabel: 'Liberar +100 Créditos Agora',
    features: [
      '100 créditos no total (80 + 20 créditos grátis de bônus)',
      'Menor custo da plataforma: apenas R$ 1,09 por crédito',
      'Suporte prioritário via WhatsApp direto da equipe local',
      'Relatório de desempenho e ranking de Match nas vagas',
    ],
  },
};
