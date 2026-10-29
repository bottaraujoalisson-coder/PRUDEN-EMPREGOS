import { formatPriceBRL } from './plansData';
import {
  INITIAL_WELCOME_CREDITS,
  INITIAL_FREE_CREDITS,
  APPLICATION_CREDIT_COST,
  APPLY_JOB_CREDIT_COST,
  JOB_POSTING_CREDIT_COST,
  POST_JOB_CREDIT_COST,
  JOB_HIGHLIGHT_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
  RESUME_GENERATION_COST,
  RESUME_GENERATION_CREDIT_COST,
  RESUME_PDF_CREDIT_COST,
  OFFICIAL_CREDIT_PACKAGES,
  CreditPackage,
} from '../constants/credits';

export {
  INITIAL_WELCOME_CREDITS,
  INITIAL_FREE_CREDITS,
  APPLICATION_CREDIT_COST,
  APPLY_JOB_CREDIT_COST,
  JOB_POSTING_CREDIT_COST,
  POST_JOB_CREDIT_COST,
  JOB_HIGHLIGHT_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
  RESUME_GENERATION_COST,
  RESUME_GENERATION_CREDIT_COST,
  RESUME_PDF_CREDIT_COST,
};
export type { CreditPackage };

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
  OFFICIAL_CREDIT_PACKAGES.pack_starter,
  OFFICIAL_CREDIT_PACKAGES.pack_pro,
  OFFICIAL_CREDIT_PACKAGES.pack_business,
];

export const CANDIDATE_RESUME_CREDIT_PACKAGE: CreditPackage =
  OFFICIAL_CREDIT_PACKAGES.pack_resume_15;

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return OFFICIAL_CREDIT_PACKAGES[packageId];
}

export function formatCreditPackagePrice(pkg: CreditPackage): string {
  return formatPriceBRL(pkg.price);
}


