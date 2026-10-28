import { formatPriceBRL } from './plansData';

export const INITIAL_WELCOME_CREDITS = 30;
export const INITIAL_FREE_CREDITS = INITIAL_WELCOME_CREDITS;
export const APPLY_JOB_CREDIT_COST = 10;
export const POST_JOB_CREDIT_COST = 10;
export const BOOST_JOB_CREDIT_COST = 15;
export const RESUME_GENERATION_CREDIT_COST = 15;
export const RESUME_PDF_CREDIT_COST = RESUME_GENERATION_CREDIT_COST;

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

export const HERO_VALUE_PROPOSITION = {
  title: 'Pacotes de Créditos para Recrutamento em Presidente Prudente',
  subtitle:
    'Não perca bons profissionais pela demora na contratação. Chame candidatos direto no WhatsApp, destaque suas vagas no topo do mural e contrate mais rápido com liberação imediata via Pix.',
  transparencyPill:
    'Como funciona: Publicar Vaga (10 cr) • Destacar Vaga (15 cr) • Candidatar-se (10 cr) • Gerar Currículo ATS (15 cr) • Créditos nunca expiram',
  welcomeBonusPill:
    'Novo cadastro: ganhe 30 créditos gratuitos para usar pela 1ª vez sem nenhum custo',
};

export const CREDIT_TRUST_BAR_ITEMS = [
  'Mercado Pago Compra Garantida',
  'Liberação imediata via Pix',
  'Sem mensalidade',
  'Garantia de 7 dias',
];

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pack_starter',
    title: 'Pacote Inicial',
    credits: 10,
    bonusCredits: 0,
    totalCredits: 10,
    price: 29.9,
    originalPrice: 39.9,
    description: 'Ideal para empresas com contratações pontuais ou contatos rápidos com candidatos.',
    costPerCredit: 2.99,
    ctaLabel: 'Liberar +10 Créditos Agora',
    features: [
      '10 créditos para uso imediato (sem expiração)',
      'Desbloqueio direto de WhatsApp de candidatos',
      'Destaque Turbo para vagas por 7 dias',
    ],
  },
  {
    id: 'pack_pro',
    title: 'Pacote Crescimento Pro',
    credits: 30,
    bonusCredits: 5,
    totalCredits: 35,
    price: 69.9,
    originalPrice: 104.65,
    badge: 'MAIS ESCOLHIDO EM PRESIDENTE PRUDENTE • +5 BÔNUS',
    badgeVariant: 'featured',
    isFeatured: true,
    description: 'Excelente custo-benefício para empresas e comércios em expansão na região.',
    costPerCredit: 1.99,
    ctaLabel: 'Garantir +35 Créditos (Com Bônus)',
    features: [
      '35 créditos no total (30 + 5 créditos grátis de bônus)',
      'Economia imediata de R$ 34,75 sobre o valor avulso',
      'Acesso a filtros avançados no banco de talentos',
      'Desbloqueio com 1 clique e créditos sem expiração',
    ],
  },
  {
    id: 'pack_business',
    title: 'Pacote Corporativo Max',
    credits: 80,
    bonusCredits: 20,
    totalCredits: 100,
    price: 149.9,
    originalPrice: 220.0,
    badge: 'MENOR CUSTO POR CRÉDITO • +20 BÔNUS',
    badgeVariant: 'neutral',
    isFeatured: false,
    description: 'Máxima economia para indústrias, redes varejistas e consultorias com alto volume de contratações.',
    costPerCredit: 1.49,
    ctaLabel: 'Liberar +100 Créditos Agora',
    features: [
      '100 créditos no total (80 + 20 créditos grátis de bônus)',
      'Menor custo da plataforma: apenas R$ 1,49 por crédito',
      'Suporte prioritário via WhatsApp direto da equipe local',
      'Relatório de desempenho e visualizações das vagas',
    ],
  },
];

export const CANDIDATE_RESUME_CREDIT_PACKAGE: CreditPackage = {
  id: 'pack_resume_15',
  title: 'Pacote Currículo Profissional (15 Créditos)',
  credits: 15,
  bonusCredits: 0,
  totalCredits: 15,
  price: 19.9,
  originalPrice: 29.9,
  description: 'Pacote sob medida para gerar seu Currículo Profissional em PDF compatível com sistemas de RH (ATS).',
  costPerCredit: 1.33,
  ctaLabel: 'Adquirir 15 Créditos via Pix',
  features: [
    '15 créditos liberados imediatamente após confirmação Pix',
    'Suficiente para 1 geração completa de Currículo Profissional em PDF (ATS)',
    'Créditos não expiram na sua carteira',
  ],
};

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  if (packageId === CANDIDATE_RESUME_CREDIT_PACKAGE.id) {
    return CANDIDATE_RESUME_CREDIT_PACKAGE;
  }
  return CREDIT_PACKAGES.find((p) => p.id === packageId);
}

export function formatCreditPackagePrice(pkg: CreditPackage): string {
  return formatPriceBRL(pkg.price);
}

