export interface CreditPackage {
  id: string;
  name: string;
  title: string;
  subtitle?: string;
  credits: number;
  bonus: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  priceBRL: number;
  originalPrice: number;
  pricePerCreditBRL: number;
  unitPriceBRL: number;
  costPerCredit: number;
  unitCostLabel: string;
  ctaLabel: string;
  badge?: string;
  badgeVariant?: 'featured' | 'neutral';
  description: string;
  features: string[];
  popular?: boolean;
  isFeatured?: boolean;
}

export const INITIAL_WELCOME_CREDITS = 30;

export const CREDIT_COSTS = {
  JOB_APPLICATION: 10,
  JOB_POSTING: 10,
  JOB_HIGHLIGHT: 15,
  RESUME_GENERATION_ATS: 15,
  APPLY_JOB: 10,
  PUBLISH_JOB: 10,
  FEATURE_JOB: 15,
  GENERATE_ATS_RESUME: 15,
} as const;

export const CREDIT_PACKAGES: Record<string, CreditPackage> = {
  pkg_10: {
    id: 'pkg_10',
    name: 'Pacote Básico (10 Créditos)',
    title: 'Pacote Básico (10 Créditos)',
    subtitle: 'Ideal para 1 candidatura ou 1 publicação de vaga avulsa',
    credits: 10,
    bonus: 0,
    bonusCredits: 0,
    totalCredits: 10,
    price: 14.9,
    priceBRL: 14.9,
    originalPrice: 19.9,
    pricePerCreditBRL: 1.49,
    unitPriceBRL: 1.49,
    costPerCredit: 1.49,
    unitCostLabel: 'R$ 1,49/cr',
    ctaLabel: 'Liberar +10 Créditos Agora',
    description: 'Ideal para 1 candidatura ou 1 publicação de vaga avulsa.',
    features: [
      '10 créditos liberados imediatamente',
      'Equivale a 1 candidatura ou 1 vaga publicada por 30 dias',
      'Créditos sem prazo de validade',
    ],
  },
  pkg_15: {
    id: 'pkg_15',
    name: 'Pacote Essencial (15 Créditos)',
    title: 'Pacote Essencial (15 Créditos)',
    subtitle: 'Suficiente para gerar 1 Currículo PDF ATS com IA ou destacar 1 vaga',
    credits: 15,
    bonus: 0,
    bonusCredits: 0,
    totalCredits: 15,
    price: 19.9,
    priceBRL: 19.9,
    originalPrice: 29.9,
    pricePerCreditBRL: 1.33,
    unitPriceBRL: 1.33,
    costPerCredit: 1.33,
    unitCostLabel: 'R$ 1,33/cr',
    ctaLabel: 'Adquirir +15 Créditos via Pix',
    badge: 'Ideal para Currículo IA',
    badgeVariant: 'neutral',
    description: 'Suficiente para gerar 1 Currículo PDF ATS com IA ou destacar 1 vaga.',
    features: [
      '15 créditos liberados na hora via Pix ou Cartão',
      'Gera 1 Currículo PDF ATS (3 modelos) ou destaca 1 vaga no topo',
      'Créditos nunca expiram',
    ],
  },
  pkg_30: {
    id: 'pkg_30',
    name: 'Pacote Profissional (30 Créditos)',
    title: 'Pacote Profissional (30 Créditos)',
    subtitle: 'Excelente custo-benefício para até 3 candidaturas/vagas ou 2 currículos IA',
    credits: 30,
    bonus: 0,
    bonusCredits: 0,
    totalCredits: 30,
    price: 34.9,
    priceBRL: 34.9,
    originalPrice: 44.7,
    pricePerCreditBRL: 1.16,
    unitPriceBRL: 1.16,
    costPerCredit: 1.16,
    unitCostLabel: 'R$ 1,16/cr',
    ctaLabel: 'Garantir +30 Créditos Agora',
    badge: 'Mais Popular',
    badgeVariant: 'featured',
    popular: true,
    isFeatured: true,
    description: 'Excelente custo-benefício para até 3 candidaturas/vagas ou 2 currículos IA.',
    features: [
      '30 créditos liberados imediatamente',
      'Permite 3 candidaturas/vagas ou 2 currículos PDF ATS com IA',
      'Economia de 22% no custo por crédito',
    ],
  },
  pkg_50: {
    id: 'pkg_50',
    name: 'Pacote Avançado (50 Créditos)',
    title: 'Pacote Avançado (50 Créditos)',
    subtitle: 'Para candidatos ativos ou empresas com múltiplas vagas em Prudente',
    credits: 50,
    bonus: 0,
    bonusCredits: 0,
    totalCredits: 50,
    price: 49.9,
    priceBRL: 49.9,
    originalPrice: 74.5,
    pricePerCreditBRL: 1.0,
    unitPriceBRL: 1.0,
    costPerCredit: 1.0,
    unitCostLabel: 'R$ 1,00/cr',
    ctaLabel: 'Garantir +50 Créditos Agora',
    description: 'Para candidatos ativos ou empresas com múltiplas vagas abertas em Prudente.',
    features: [
      '50 créditos liberados imediatamente',
      'Equivale a 5 vagas publicadas ou 5 candidaturas',
      'Custo exato de R$ 1,00 por crédito',
    ],
  },
  pkg_100: {
    id: 'pkg_100',
    name: 'Pacote Corporativo (100 Créditos)',
    title: 'Pacote Corporativo (100 Créditos)',
    subtitle: 'Pacote completo para recrutamento recorrente e múltiplos destaques',
    credits: 100,
    bonus: 0,
    bonusCredits: 0,
    totalCredits: 100,
    price: 89.9,
    priceBRL: 89.9,
    originalPrice: 149.0,
    pricePerCreditBRL: 0.9,
    unitPriceBRL: 0.9,
    costPerCredit: 0.9,
    unitCostLabel: 'R$ 0,90/cr',
    ctaLabel: 'Liberar +100 Créditos Agora',
    badge: 'Maior Economia (-40%)',
    badgeVariant: 'neutral',
    description: 'Pacote completo para recrutamento recorrente e múltiplos destaques.',
    features: [
      '100 créditos para uso livre sem prazo de expiração',
      'Menor custo por crédito da plataforma (R$ 0,90/cr)',
      'Suporte prioritário para empresas de Presidente Prudente e região',
    ],
  },
};

export const CREDIT_PACKAGE_LIST: CreditPackage[] = Object.values(CREDIT_PACKAGES);

