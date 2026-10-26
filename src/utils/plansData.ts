import { PricingPlan, CompanyPlanId, CandidatePlanId, PlanPeriod } from '../types';

export const COMPANY_PLANS: PricingPlan[] = [
  {
    id: 'company_free',
    targetRole: 'company',
    title: 'Básico Local',
    description: 'Para comércios e empresas que desejam divulgar contratações pontuais sem nenhum custo.',
    monthlyPrice: 0,
    yearlyPriceMonthly: 0,
    yearlyTotal: 0,
    features: [
      { text: 'Até 2 vagas ativas simultâneas' },
      { text: 'Validade de 15 dias por vaga' },
      { text: 'Triagem rápida com perguntas de Sim/Não' },
      { text: 'Recebimento de currículos em PDF (até 800 KB)' },
      { text: 'Painel básico de acompanhamento de candidatos' },
    ],
    notIncluded: [
      'Vagas em destaque fixo no topo',
      'Acesso direto com 1 clique ao WhatsApp dos inscritos',
      'Notificações instantâneas de novos inscritos',
      'Selo Empresa Verificada com prioridade',
    ],
    ctaText: 'Começar Gratuitamente',
  },
  {
    id: 'company_pro',
    targetRole: 'company',
    title: 'Empresa Pro',
    badge: 'Mais Escolhido em Presidente Prudente',
    isFeatured: true,
    description: 'Ideal para recrutadores e empresas em expansão que precisam fechar vagas com rapidez e precisão.',
    originalMonthlyPrice: 149.0,
    monthlyPrice: 89.9,
    yearlyPriceMonthly: 69.9,
    yearlyTotal: 838.8,
    features: [
      { text: 'Vagas ativas ilimitadas durante o período', highlight: true },
      { text: 'Até 3 vagas simultâneas em Destaque no topo do mural', highlight: true },
      { text: 'Acesso imediato com 1 clique ao WhatsApp e telefone dos candidatos', highlight: true },
      { text: 'Selo oficial de "Empresa Verificada" nas publicações', highlight: true },
      { text: 'Notificação instantânea por WhatsApp e e-mail a cada inscrição compatível' },
      { text: 'Gerador inteligente de descrições de vagas com IA ilimitado' },
      { text: 'Compartilhamento formatado direto no WhatsApp regional' },
      { text: 'Renovação facilitada de vagas expiradas com 1 clique' },
    ],
    ctaText: 'Assinar Empresa Pro com Mercado Pago',
  },
  {
    id: 'company_vip',
    targetRole: 'company',
    title: 'Corporativo VIP',
    badge: 'Máxima Visibilidade e Recrutamento Ativo',
    description: 'Solução completa para médias e grandes empresas, indústrias, redes varejistas e consultorias de RH.',
    monthlyPrice: 199.9,
    yearlyPriceMonthly: 159.9,
    yearlyTotal: 1918.8,
    features: [
      { text: 'Todas as vantagens do plano Empresa Pro inclusas', highlight: true },
      { text: 'Destaque Ouro fixo permanente em todas as vagas abertas', highlight: true },
      { text: 'Acesso ilimitado ao Banco de Talentos com busca ativa por competências', highlight: true },
      { text: 'Multi-recrutadores: até 5 acessos para sua equipe de RH', highlight: true },
      { text: 'Disparo prioritário das vagas para candidatos compatíveis' },
      { text: 'Suporte VIP via WhatsApp direto com nosso time local de atendimento' },
      { text: 'Relatórios gerenciais mensais de atratividade e visualizações' },
    ],
    ctaText: 'Contratar Corporativo VIP',
  },
];

export const CANDIDATE_PLANS: PricingPlan[] = [
  {
    id: 'candidate_free',
    targetRole: 'candidate',
    title: 'Gratuito Essencial',
    description: 'Acesso completo às oportunidades abertas para todos os profissionais de Presidente Prudente e região.',
    monthlyPrice: 0,
    yearlyPriceMonthly: 0,
    yearlyTotal: 0,
    features: [
      { text: 'Cadastro completo de perfil com CPF seguro' },
      { text: 'Candidaturas ilimitadas com 1 clique' },
      { text: 'Cálculo de compatibilidade inteligente em todas as vagas' },
      { text: 'Anexo de currículo em PDF (até 800 KB)' },
      { text: 'Acompanhamento do status da candidatura (Visualizado / Em Análise)' },
      { text: 'Opção de salvar vagas de interesse' },
    ],
    notIncluded: [
      'Currículo posicionado no topo da lista das empresas',
      'Selo de Candidato em Destaque nas candidaturas',
      'Notificações instantâneas de vagas compatíveis no WhatsApp',
      'Acesso antecipado de 24h a novas vagas',
    ],
    ctaText: 'Continuar no Plano Gratuito',
  },
  {
    id: 'candidate_highlight',
    targetRole: 'candidate',
    title: 'Candidato Destaque',
    badge: 'Mais Recomendado para Recolocação',
    isFeatured: true,
    description: 'Coloque seu currículo na frente dos recrutadores e seja chamado para entrevistas até 3x mais rápido.',
    originalMonthlyPrice: 39.9,
    monthlyPrice: 19.9,
    yearlyPriceMonthly: 14.9,
    yearlyTotal: 178.8,
    features: [
      { text: 'Currículo exibido no topo da lista dos recrutadores', highlight: true },
      { text: 'Selo visual de "Candidato em Destaque" nas inscrições', highlight: true },
      { text: 'Aviso em tempo real quando sua candidatura for visualizada pela empresa', highlight: true },
      { text: 'Otimização profissional do resumo com IA ilimitada', highlight: true },
      { text: 'Alertas prioritários no WhatsApp quando abrir vaga 70%+ compatível' },
      { text: 'Dicas práticas de preparação específicas para o mercado de Prudente' },
    ],
    ctaText: 'Ativar Destaque com Mercado Pago',
  },
  {
    id: 'candidate_vip',
    targetRole: 'candidate',
    title: 'Acelera Carreira VIP',
    badge: 'Acesso Antecipado e Assessoria Local',
    description: 'Aceleração máxima para profissionais que buscam os melhores salários e recolocação imediata.',
    monthlyPrice: 39.9,
    yearlyPriceMonthly: 29.9,
    yearlyTotal: 358.8,
    features: [
      { text: 'Todas as vantagens do Candidato Destaque inclusas', highlight: true },
      { text: 'Acesso antecipado exclusivo de 24h a novas vagas antes da divulgação pública', highlight: true },
      { text: 'Selo Destaque Ouro com recomendação prioritária no algoritmo', highlight: true },
      { text: 'Revisão humana e estruturação do currículo pela equipe de RH local', highlight: true },
      { text: 'Simulação e orientações para entrevistas em empresas da região' },
      { text: 'Canal direto de suporte e dúvidas via WhatsApp' },
    ],
    ctaText: 'Acelerar Carreira com Mercado Pago',
  },
];

export interface ComparisonRow {
  featureName: string;
  category: 'company' | 'candidate';
  free: string | boolean;
  pro: string | boolean;
  vip: string | boolean;
}

export const COMPANY_COMPARISON_MATRIX: ComparisonRow[] = [
  {
    featureName: 'Vagas ativas simultâneas',
    category: 'company',
    free: 'Até 2 vagas',
    pro: 'Ilimitadas',
    vip: 'Ilimitadas',
  },
  {
    featureName: 'Destaque fixo no topo do mural',
    category: 'company',
    free: false,
    pro: 'Até 3 vagas',
    vip: 'Todas as vagas (Ouro)',
  },
  {
    featureName: 'WhatsApp e telefone dos candidatos',
    category: 'company',
    free: 'Apenas após seleção',
    pro: 'Acesso imediato com 1 clique',
    vip: 'Acesso imediato com 1 clique',
  },
  {
    featureName: 'Busca ativa no Banco de Talentos',
    category: 'company',
    free: false,
    pro: 'Visualização sob demanda',
    vip: 'Acesso irrestrito e direto',
  },
  {
    featureName: 'Selo Empresa Verificada',
    category: 'company',
    free: 'Básico',
    pro: 'Pro Verificada',
    vip: 'VIP Premium Verificada',
  },
  {
    featureName: 'Gerador de descrições com IA',
    category: 'company',
    free: 'Limitado',
    pro: 'Ilimitado',
    vip: 'Ilimitado + revisão',
  },
  {
    featureName: 'Multi-recrutadores da equipe',
    category: 'company',
    free: '1 usuário',
    pro: '1 usuário',
    vip: 'Até 5 recrutadores',
  },
  {
    featureName: 'Canal de suporte dedicado',
    category: 'company',
    free: 'E-mail',
    pro: 'WhatsApp e e-mail prioritário',
    vip: 'Consultor local dedicado no WhatsApp',
  },
];

export const CANDIDATE_COMPARISON_MATRIX: ComparisonRow[] = [
  {
    featureName: 'Candidaturas ilimitadas com 1 clique',
    category: 'candidate',
    free: true,
    pro: true,
    vip: true,
  },
  {
    featureName: 'Posição na lista do recrutador',
    category: 'candidate',
    free: 'Ordem padrão',
    pro: 'Topo prioritário (3x mais visível)',
    vip: 'Topo Ouro absoluto',
  },
  {
    featureName: 'Selo visual na candidatura',
    category: 'candidate',
    free: false,
    pro: 'Selo Destaque',
    vip: 'Selo Destaque Ouro VIP',
  },
  {
    featureName: 'Confirmação de visualização do currículo',
    category: 'candidate',
    free: 'Status padrão',
    pro: 'Notificação imediata em tempo real',
    vip: 'Notificação imediata em tempo real',
  },
  {
    featureName: 'Acesso antecipado a novas vagas',
    category: 'candidate',
    free: false,
    pro: false,
    vip: '24h antes da publicação geral',
  },
  {
    featureName: 'Melhoria de resumo profissional com IA',
    category: 'candidate',
    free: 'Básica',
    pro: 'Ilimitada',
    vip: 'Ilimitada + revisão de especialista',
  },
  {
    featureName: 'Suporte e dúvidas de carreira',
    category: 'candidate',
    free: 'Central de ajuda',
    pro: 'WhatsApp prioritário',
    vip: 'Canal VIP exclusivo no WhatsApp',
  },
];

export const PLANS_FAQ = [
  {
    question: 'Quais formas de pagamento são aceitas pelo Mercado Pago?',
    answer:
      'Aceitamos Pix instantâneo com aprovação imediata e liberação automática dos benefícios em segundos, além de Cartão de Crédito (Visa, Mastercard, Elo, Hipercard) em até 12x através da infraestrutura segura do Mercado Pago.',
  },
  {
    question: 'Posso cancelar a assinatura quando eu quiser?',
    answer:
      'Sim, sem fidelidade e sem burocracia. Você pode cancelar sua assinatura com apenas 1 clique a qualquer momento no seu painel. Seus benefícios continuam ativos até o fim do período já pago.',
  },
  {
    question: 'Como funciona a Garantia Incondicional de 7 dias?',
    answer:
      'Se por qualquer motivo você não ficar satisfeito nos primeiros 7 dias após a contratação, devolvemos 100% do seu dinheiro através do Mercado Pago, sem perguntas e sem complicações.',
  },
  {
    question: 'Minha empresa recebe Nota Fiscal dos planos pagos?',
    answer:
      'Sim! Emitimos Nota Fiscal Eletrônica de Serviços (NFS-e) para todas as contratações empresariais cadastradas com CNPJ em Presidente Prudente.',
  },
  {
    question: 'Os planos pagos garantem contratação ou emprego?',
    answer:
      'Nenhum plano garante contratação, pois a decisão final é sempre das empresas empregadoras. No entanto, os planos aumentam significativamente a visibilidade, posicionando currículos no topo e permitindo contato imediato entre recrutadores e candidatos.',
  },
];

export function calculatePlanExpirationDate(period: PlanPeriod): string {
  const now = new Date();
  if (period === 'yearly') {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setDate(now.getDate() + 30);
  }
  return now.toISOString();
}

export function formatPriceBRL(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

/**
 * Calcula o custo equivalente por dia para ancoragem de valor diário (menor fricção psicológica)
 */
export function formatDailyEquivalent(totalAmount: number, period: PlanPeriod): string {
  if (totalAmount <= 0) return 'Gratuito';
  const days = period === 'yearly' ? 365 : 30;
  const perDay = totalAmount / days;
  return `${formatPriceBRL(perDay)}/dia`;
}

/**
 * Ancoragem comparativa de economia no plano anual (Cap. 1 & 6 do HX Design)
 */
export function calculateSavings(
  plan: PricingPlan,
  period: PlanPeriod
): {
  originalTotal: number;
  currentTotal: number;
  savingsTotal: number;
  savingsPercent: number;
} {
  if (plan.monthlyPrice === 0) {
    return { originalTotal: 0, currentTotal: 0, savingsTotal: 0, savingsPercent: 0 };
  }

  if (period === 'yearly') {
    const monthlyAnchor = (plan.originalMonthlyPrice || plan.monthlyPrice) * 12;
    const current = plan.yearlyTotal;
    const savings = Math.max(0, monthlyAnchor - current);
    const percent = Math.round((savings / monthlyAnchor) * 100);
    return {
      originalTotal: monthlyAnchor,
      currentTotal: current,
      savingsTotal: savings,
      savingsPercent: percent,
    };
  }

  const original = (plan.originalMonthlyPrice || plan.monthlyPrice * 1.35);
  const current = plan.monthlyPrice;
  const savings = Math.max(0, original - current);
  const percent = Math.round((savings / original) * 100);
  return {
    originalTotal: original,
    currentTotal: current,
    savingsTotal: savings,
    savingsPercent: percent,
  };
}

/**
 * Razões de enquadramento positivo e prevenção de perdas (Cap. 2 e Cap. 6)
 */
export function getPlanProtectionReason(
  planId: string,
  role: 'company' | 'candidate'
): {
  headline: string;
  gainPoints: string[];
  lossPrevention: string;
} {
  if (role === 'company') {
    if (planId === 'company_vip') {
      return {
        headline: 'Recrutamento prioritário com máxima agilidade para sua equipe',
        gainPoints: [
          'Vagas com destaque Ouro permanente no topo de Presidente Prudente',
          'Acesso liberado a contatos diretos no WhatsApp de todos os talentos',
          'Multi-recrutadores para até 5 membros do seu departamento de RH',
        ],
        lossPrevention:
          'Evite perder os melhores candidatos da cidade para empresas concorrentes por demora no contato.',
      };
    }
    return {
      headline: 'Feche contratações locais até 3x mais rápido sem comissões',
      gainPoints: [
        'Vagas ilimitadas com destaque no topo do mural regional',
        'Botão direto para chamar candidatos no WhatsApp com 1 clique',
        'Selo oficial de Empresa Verificada transmitindo total credibilidade',
      ],
      lossPrevention:
        'Evite que seus anúncios passem despercebidos ou fiquem vagos sem profissionais qualificados.',
    };
  }

  if (planId === 'candidate_vip') {
    return {
      headline: 'Aceleração completa para conquistar os melhores salários',
      gainPoints: [
        'Acesso antecipado de 24h a novas oportunidades antes da divulgação pública',
        'Revisão especializada do currículo por recrutadores parceiros de Prudente',
        'Selo VIP nas candidaturas garantindo prioridade máxima no topo',
      ],
      lossPrevention:
        'Não concorra contra centenas de currículos atrasados: saiba das vagas antes de todo mundo.',
    };
  }

  return {
    headline: 'Destaque garantido para ser chamado primeiro para entrevistas',
    gainPoints: [
      'Currículo posicionado no topo da lista das empresas',
      'Selo visual de Candidato em Destaque chamando atenção imediata',
      'Avisos em tempo real quando sua candidatura for aberta pelo RH',
    ],
    lossPrevention:
      'Evite que seu currículo fique escondido no final da fila das vagas concorridas da região.',
  };
}

