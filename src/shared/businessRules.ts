/**
 * Catálogo Central e Funções Autoritativas de Regras de Negócio (RN)
 * Portal PrudenEmpregos (Presidente Prudente e Oeste Paulista - SP)
 * Em conformidade com o padrão IEEE Std 830/1998 e LGPD (Lei nº 13.709/2018)
 */

import { INITIAL_WELCOME_CREDITS, CREDIT_COSTS } from './creditPackages';
import { formatSalaryBRL } from '../utils/formatters';
import { calculateDeterministicMatch } from '../utils/matchEngine';
import { validateCPF, validateCNPJMath } from '../services/cnpjService';

export { INITIAL_WELCOME_CREDITS, CREDIT_COSTS };

/**
 * Constantes Globais das Regras de Negócio
 */
export const BUSINESS_RULES_CONSTANTS = {
  // Autenticação e Segurança (RN-001, RN-003)
  MIN_PASSWORD_LENGTH: 6,
  BRUTE_FORCE_MAX_FAILED_ATTEMPTS: 5,
  BRUTE_FORCE_LOCKOUT_MINUTES: 15,

  // Validação Cadastral e Documentos (RN-005, RN-006, RN-008)
  CPF_DIGITS_COUNT: 11,
  CNPJ_DIGITS_COUNT: 14,
  CEP_DIGITS_COUNT: 8,

  // Economia de Créditos (RN-010, RN-011, RN-013)
  INITIAL_WELCOME_CREDITS,
  CREDIT_COST_APPLY_JOB: CREDIT_COSTS.APPLY_JOB, // 10
  CREDIT_COST_PUBLISH_JOB: CREDIT_COSTS.PUBLISH_JOB, // 10
  CREDIT_COST_FEATURE_JOB: CREDIT_COSTS.FEATURE_JOB, // 15
  CREDIT_COST_GENERATE_ATS_RESUME: CREDIT_COSTS.GENERATE_ATS_RESUME, // 15
  CREDITS_EXPIRE: false,

  // Gestão de Vagas (RN-016, RN-017)
  JOB_EXPIRATION_DAYS: 30,
  DEFAULT_LOCATION: 'Presidente Prudente, SP',

  // Motor de Match Ponderado (RN-025)
  MATCH_WEIGHTS: {
    SKILLS_MAX: 40,
    EXPERIENCE_MAX: 25,
    KEYWORDS_MAX: 20,
    LOCATION_MAX: 15,
    TOTAL_MAX: 100,
  },

  // Recrutamento às Cegas (RN-033)
  BLIND_HIRING_HIDDEN_FIELDS: ['name', 'photoDataUrl', 'photoUrl', 'age', 'birthDate', 'educationYear', 'initials'],
} as const;

export type BusinessRuleDomain =
  | 'IDENTIDADE_E_ACESSO'
  | 'VALIDACAO_E_LGPD'
  | 'ECONOMIA_DE_CREDITOS'
  | 'GESTAO_DE_VAGAS'
  | 'CANDIDATURAS_E_FUNIL'
  | 'MOTOR_DE_MATCH'
  | 'CURRICULO_ATS_PDF'
  | 'PAGAMENTOS_MERCADO_PAGO'
  | 'INCLUSAO_E_RECRUTAMENTO_CEGO'
  | 'AUDITORIA_E_INTEGRIDADE';

export interface BusinessRuleDefinition {
  id: string;
  domain: BusinessRuleDomain;
  name: string;
  description: string;
  trigger: string;
  condition: string;
  effect: string;
  errorMessage?: string;
  relatedRF: string;
  sourceFiles: string[];
}

/**
 * Catálogo Completo de Regras de Negócio do PrudenEmpregos
 */
export const BUSINESS_RULES_CATALOG: Record<string, BusinessRuleDefinition> = {
  // DOMÍNIO 1: IDENTIDADE E ACESSO (RBAC)
  'RN-001': {
    id: 'RN-001',
    domain: 'IDENTIDADE_E_ACESSO',
    name: 'Unicidade e Validação de Credenciais',
    description: 'Todo usuário deve possuir endereço de e-mail exclusivo e senha com mínimo de 6 caracteres.',
    trigger: 'Cadastro ou alteração de credenciais de login.',
    condition: 'E-mail em formato RFC 5322 válido e não previamente cadastrado; senha >= 6 caracteres.',
    effect: 'Criação do registro no Firebase Authentication e geração de hash criptográfico seguro.',
    errorMessage: 'Informe um e-mail válido e uma senha com pelo menos 6 caracteres.',
    relatedRF: 'RF_B01 / RF_B02',
    sourceFiles: ['src/services/directCloudAuth.ts', 'src/components/AuthModal.tsx'],
  },
  'RN-002': {
    id: 'RN-002',
    domain: 'IDENTIDADE_E_ACESSO',
    name: 'Perfis de Acesso e Segregação de Funções (RBAC)',
    description: 'O sistema possui três papéis estritos: Candidato (candidate), Empresa (company) e Administrador (admin).',
    trigger: 'Autenticação e autorização de operações protegidas.',
    condition: 'O cliente não pode alterar diretamente o campo "role" ou "type" no Firestore.',
    effect: 'Bloqueio de elevação indevida de privilégios nas regras de segurança do banco.',
    errorMessage: 'Você não tem permissão para realizar esta operação.',
    relatedRF: 'RF_B01 / RF_B02 / RF_S05',
    sourceFiles: ['firestore.rules', 'src/types.ts', 'src/services/usersService.ts'],
  },
  'RN-003': {
    id: 'RN-003',
    domain: 'IDENTIDADE_E_ACESSO',
    name: 'Proteção contra Ataques de Força Bruta',
    description: 'Bloqueia temporariamente novas tentativas de login após 5 falhas consecutivas de senha.',
    trigger: 'Tentativa de login com senha incorreta.',
    condition: 'Contador de falhas consecutivas para o mesmo e-mail >= 5 dentro da janela de observação.',
    effect: 'Bloqueio temporário da conta pelo período de 15 minutos.',
    errorMessage: 'Muitas tentativas inválidas. Conta bloqueada temporariamente por 15 minutos.',
    relatedRF: 'RNF_04',
    sourceFiles: ['src/services/directCloudAuth.ts', 'src/utils/securityAudit.test.ts'],
  },
  'RN-004': {
    id: 'RN-004',
    domain: 'IDENTIDADE_E_ACESSO',
    name: 'Onboarding Obrigatório para Login Social',
    description: 'Usuários cadastrados via Google OAuth sem CPF/CNPJ devem concluir o onboarding para liberar o bônus de créditos e recursos protegidos.',
    trigger: 'Acesso do usuário pós-login Google com onboardingCompleted == false.',
    condition: 'Perfil não possui CPF ou CNPJ registrado.',
    effect: 'Exibição do modal de onboarding obrigatório; bloqueio de publicação de vagas e candidaturas.',
    errorMessage: 'Complete seu cadastro com CPF ou CNPJ para ativar sua conta e receber seus créditos.',
    relatedRF: 'RF_B01 / RF_B02',
    sourceFiles: ['src/components/CompleteOnboardingModal.tsx', 'src/App.tsx'],
  },

  // DOMÍNIO 2: VALIDAÇÃO E LGPD
  'RN-005': {
    id: 'RN-005',
    domain: 'VALIDACAO_E_LGPD',
    name: 'Validação Algorítmica de CPF (Módulo 11)',
    description: 'O CPF do candidato deve conter 11 dígitos numéricos com dígitos verificadores matematicamente exatos.',
    trigger: 'Cadastro ou atualização de dados de candidato.',
    condition: '11 dígitos, cálculo dos 2 dígitos verificadores pelo Módulo 11 correto, rejeição de sequências repetidas (ex: 111.111.111-11).',
    effect: 'Liberação do perfil de candidato.',
    errorMessage: 'CPF inválido. Verifique os 11 dígitos informados.',
    relatedRF: 'RF_B01',
    sourceFiles: ['src/services/cnpjService.ts', 'src/utils/validation.ts'],
  },
  'RN-006': {
    id: 'RN-006',
    domain: 'VALIDACAO_E_LGPD',
    name: 'Validação de CNPJ e Regularidade na Receita Federal',
    description: 'Empresas recrutadoras devem possuir CNPJ matematicamente válido (14 dígitos) e com situação cadastral estritamente ATIVA na Receita Federal.',
    trigger: 'Cadastro ou alteração de dados de empresa.',
    condition: 'Validação matemática de 14 dígitos e consulta à BrasilAPI/Receita Federal com status == "ATIVA".',
    effect: 'Concessão do selo de Empresa Verificada e permissão para publicação de vagas.',
    errorMessage: 'Este CNPJ não possui situação ativa na Receita Federal ou é inválido.',
    relatedRF: 'RF_B02',
    sourceFiles: ['src/services/cnpjService.ts', 'server.ts'],
  },
  'RN-007': {
    id: 'RN-007',
    domain: 'VALIDACAO_E_LGPD',
    name: 'Unicidade Global de CPF e CNPJ',
    description: 'Um documento civil (CPF) ou fiscal (CNPJ) só pode ser associado a uma única conta em toda a plataforma.',
    trigger: 'Conclusão de onboarding ou salvamento de perfil.',
    condition: 'A chave hash do documento em /document_registry/{hash} não pode pertencer a outro UID.',
    effect: 'Registro atômico do hash em /document_registry;',
    errorMessage: 'Este CPF ou CNPJ já está cadastrado em outra conta da plataforma.',
    relatedRF: 'RF_B01 / RF_B02',
    sourceFiles: ['firestore.rules', 'server.ts', 'src/services/usersService.ts'],
  },
  'RN-008': {
    id: 'RN-008',
    domain: 'VALIDACAO_E_LGPD',
    name: 'Autopreenchimento Postal por CEP',
    description: 'O CEP informado (8 dígitos) realiza busca automática de endereço (logradouro, bairro, município e UF).',
    trigger: 'Preenchimento do campo CEP com 8 dígitos válidos.',
    condition: 'Consulta à API ViaCEP / BrasilAPI com retorno de endereço correspondente.',
    effect: 'Preenchimento automático dos campos de localização com tolerância para edição manual em caso de indisponibilidade.',
    errorMessage: 'CEP não encontrado. Por favor, preencha o endereço manualmente.',
    relatedRF: 'RF_B01 / RF_B02',
    sourceFiles: ['src/services/cepService.ts', 'src/utils/validation.ts'],
  },
  'RN-009': {
    id: 'RN-009',
    domain: 'VALIDACAO_E_LGPD',
    name: 'Segregação de Dados e Privacidade LGPD',
    description: 'Dados pessoais sensíveis (CPF, CNPJ, telefone residencial, logradouro e CEP) são segregados em /private_profiles e proibidos em /profiles públicos.',
    trigger: 'Escrita ou leitura de dados de perfil.',
    condition: 'Coleção /profiles/{uid} contém apenas dados profissionais públicos; /private_profiles/{uid} contém dados fiscais protegidos.',
    effect: 'Garantia de conformidade estrita com a LGPD.',
    errorMessage: 'Tentativa de salvar dados privados em perfil público bloqueada pelas regras de segurança.',
    relatedRF: 'RNF_LGPD',
    sourceFiles: ['firestore.rules', 'src/services/usersService.ts'],
  },

  // DOMÍNIO 3: ECONOMIA DE CRÉDITOS
  'RN-010': {
    id: 'RN-010',
    domain: 'ECONOMIA_DE_CREDITOS',
    name: 'Bônus de Boas-Vindas de 30 Créditos',
    description: 'Todo novo usuário que conclui o cadastro com documento válido recebe automaticamente 30 créditos gratuitos uma única vez.',
    trigger: 'Conclusão com sucesso do cadastro ou onboarding.',
    condition: 'Usuário possui welcomeCreditsGranted == false.',
    effect: 'Saldo inicial definido como 30 créditos e flag welcomeCreditsGranted marcada como true.',
    errorMessage: 'Bônus de boas-vindas já concedido para este usuário.',
    relatedRF: 'RF_B01 / RF_B02',
    sourceFiles: ['src/shared/creditPackages.ts', 'server.ts', 'src/services/usersService.ts'],
  },
  'RN-011': {
    id: 'RN-011',
    domain: 'ECONOMIA_DE_CREDITOS',
    name: 'Tabela Oficial de Consumo de Créditos',
    description: 'Valores oficiais de débito de créditos: Candidatar-se = 10 cr; Publicar vaga = 10 cr; Destacar vaga = 15 cr; Gerar Currículo PDF ATS = 15 cr.',
    trigger: 'Execução de transações de negócio na plataforma.',
    condition: 'Saldo do usuário >= custo da operação pretendida.',
    effect: 'Débito exato do saldo conforme a tabela oficial.',
    errorMessage: 'Saldo de créditos insuficiente para realizar esta operação.',
    relatedRF: 'RF_F01 / RF_F02 / RF_F04',
    sourceFiles: ['src/shared/creditPackages.ts', 'src/services/jobsService.ts', 'src/services/applicationsService.ts'],
  },
  'RN-012': {
    id: 'RN-012',
    domain: 'ECONOMIA_DE_CREDITOS',
    name: 'Bloqueio de Saldo Negativo e Débito Atômico',
    description: 'Nenhuma dedução de créditos pode resultar em saldo negativo; as transações devem ser atômicas e idempotentes.',
    trigger: 'Débito de créditos no Firestore ou backend.',
    condition: 'Verificação em transação segura (RunTransaction): se saldo < custo, operação é abortada.',
    effect: 'Impossibilidade matemática de saldo negativo.',
    errorMessage: 'Saldo insuficiente. Adquira um pacote de créditos para continuar.',
    relatedRF: 'RF_F01 / RF_F02 / RF_F04',
    sourceFiles: ['firestore.rules', 'server.ts', 'src/services/usersService.ts'],
  },
  'RN-013': {
    id: 'RN-013',
    domain: 'ECONOMIA_DE_CREDITOS',
    name: 'Créditos Cumulativos sem Expiração',
    description: 'Os créditos adquiridos ou recebidos em bônus nunca expiram na carteira do usuário.',
    trigger: 'Verificação periódica ou consulta de saldo.',
    condition: 'Nenhum cronjob ou gatilho expira créditos por tempo.',
    effect: 'Permanência perpétua do saldo até o consumo pelo titular.',
    relatedRF: 'RF_B05 / RF_S03',
    sourceFiles: ['src/shared/creditPackages.ts', 'src/components/PlansView.tsx'],
  },
  'RN-014': {
    id: 'RN-014',
    domain: 'ECONOMIA_DE_CREDITOS',
    name: 'Catálogo de Pacotes com Preço Unitário Decrescente',
    description: 'Cinco pacotes oficiais onde quanto maior o volume, menor o custo por crédito: 10 cr (R$ 1,49/cr), 15 cr (R$ 1,33/cr), 30 cr (R$ 1,16/cr), 50 cr (R$ 1,00/cr), 100 cr (R$ 0,90/cr).',
    trigger: 'Abertura da tela de planos ou checkout.',
    condition: 'Preços validados pelo catálogo estático do servidor, impedindo modificação pelo cliente.',
    effect: 'Exibição e cobrança dos valores autoritativos.',
    errorMessage: 'Pacote de créditos inválido ou não localizado.',
    relatedRF: 'RF_B05 / RF_F03',
    sourceFiles: ['src/shared/creditPackages.ts', 'server.ts', 'src/components/PlansView.tsx'],
  },

  // DOMÍNIO 4: GESTÃO DE VAGAS
  'RN-015': {
    id: 'RN-015',
    domain: 'GESTAO_DE_VAGAS',
    name: 'Restrição de Publicação Exclusiva para Empresas e Administradores',
    description: 'Apenas usuários autenticados com papel "company" com CNPJ ativo verificado ou "admin" têm permissão para publicar vagas.',
    trigger: 'Tentativa de criar ou publicar uma vaga.',
    condition: 'user.role === "company" && user.isVerifiedCompany === true (ou user.role === "admin").',
    effect: 'Autorização do formulário e inserção na coleção /jobs.',
    errorMessage: 'Apenas empresas com cadastro verificado na Receita Federal podem publicar vagas.',
    relatedRF: 'RF_B03 / RF_F02',
    sourceFiles: ['firestore.rules', 'src/components/CompanyDashboard.tsx'],
  },
  'RN-016': {
    id: 'RN-016',
    domain: 'GESTAO_DE_VAGAS',
    name: 'Formatação Monetária Obrigatória em Real (R$ BRL)',
    description: 'Todo valor salarial informado numericamente deve ser formatado no padrão da moeda brasileira (R$ X.XXX,XX) ou exibir "Salário a combinar" se omitido.',
    trigger: 'Exibição de card, modal ou relatório de vaga.',
    condition: 'Utilização da função utilitária formatSalaryBRL(valor).',
    effect: 'Apresentação padronizada em todos os componentes visuais.',
    relatedRF: 'RF_B03 / RF_S01',
    sourceFiles: ['src/utils/formatters.ts', 'src/components/HomeView.tsx', 'src/components/JobDetailsModal.tsx'],
  },
  'RN-017': {
    id: 'RN-017',
    domain: 'GESTAO_DE_VAGAS',
    name: 'Ciclo de Vigência de 30 Dias por Vaga',
    description: 'Vagas publicadas possuem prazo padrão de vigência de 30 dias contados a partir da data de criação.',
    trigger: 'Publicação ou renovação de vaga.',
    condition: 'expiresAt calculado como dataAtual + 30 dias.',
    effect: 'Após 30 dias, a vaga passa para o status "Encerrada" se não for renovada com créditos.',
    relatedRF: 'RF_B03',
    sourceFiles: ['src/utils/matchAlgorithm.ts', 'src/services/jobsService.ts'],
  },
  'RN-018': {
    id: 'RN-018',
    domain: 'GESTAO_DE_VAGAS',
    name: 'Prioridade e Selo de Destaque de Vagas (Boost)',
    description: 'Vagas com destaque ativo recebem selo visual de alta visibilidade e são posicionadas no topo do mural regional.',
    trigger: 'Contratação do destaque (15 cr) ou consulta ao mural.',
    condition: 'isFeatured === true && featuredExpiresAt > dataAtual.',
    effect: 'Ordenação prioritária na listagem pública de vagas.',
    relatedRF: 'RF_F02 / RF_S01',
    sourceFiles: ['src/components/HomeView.tsx', 'src/services/jobsService.ts'],
  },
  'RN-019': {
    id: 'RN-019',
    domain: 'GESTAO_DE_VAGAS',
    name: 'Ocultação de Registros de Teste do Mural Público',
    description: 'Vagas marcadas com empresa "Empresa Teste" ou flag isTestRecord == true são filtradas da visão de visitantes e candidatos.',
    trigger: 'Consulta e listagem pública de vagas.',
    condition: '!/^empresa teste$/i.test(companyName) && !job.isTestRecord.',
    effect: 'Exibição exclusiva de vagas corporativas reais de Presidente Prudente e região.',
    relatedRF: 'RF_S01',
    sourceFiles: ['src/services/jobsService.ts', 'src/components/HomeView.tsx'],
  },

  // DOMÍNIO 5: CANDIDATURAS E FUNIL
  'RN-020': {
    id: 'RN-020',
    domain: 'CANDIDATURAS_E_FUNIL',
    name: 'Bloqueio de Candidatura Duplicada',
    description: 'Um candidato não pode se candidatar mais de uma vez à mesma vaga de emprego.',
    trigger: 'Clique no botão "Candidatar-se".',
    condition: 'Verificação em /applications: não existe registro com mesmo candidateId e jobId.',
    effect: 'Se já inscrito, o botão exibe o estado desabilitado "Candidatura Já Realizada".',
    errorMessage: 'Você já se candidatou a esta vaga anteriormente.',
    relatedRF: 'RF_F01',
    sourceFiles: ['src/services/applicationsService.ts', 'src/components/JobDetailsModal.tsx'],
  },
  'RN-021': {
    id: 'RN-021',
    domain: 'CANDIDATURAS_E_FUNIL',
    name: 'Preservação de Intenção de Candidatura pós-Login',
    description: 'Visitantes deslogados que clicam em candidatar-se têm o ID da vaga salvo temporariamente em sessionStorage para reabertura automática pós-autenticação.',
    trigger: 'Tentativa de candidatura por usuário não autenticado.',
    condition: 'currentUser === null; salvamento em sessionStorage.setItem("pendingJobId", job.id).',
    effect: 'Reabertura imediata do modal da vaga com 1 clique assim que o login for concluído.',
    relatedRF: 'RF_F01',
    sourceFiles: ['src/components/JobDetailsModal.tsx', 'src/App.tsx'],
  },
  'RN-022': {
    id: 'RN-022',
    domain: 'CANDIDATURAS_E_FUNIL',
    name: 'Privacidade e Acesso Restrito a Candidaturas',
    description: 'Dados de uma candidatura só podem ser lidos pelo candidato titular, pela empresa anunciante ou por um Administrador.',
    trigger: 'Consulta ou listagem de candidaturas.',
    condition: 'request.auth.uid in [candidateId, companyId] || isAdmin().',
    effect: 'Bloqueio de acesso por terceiros não autorizados.',
    errorMessage: 'Permissão negada para visualizar esta candidatura.',
    relatedRF: 'RF_F01 / RF_S02 / RF_S04',
    sourceFiles: ['firestore.rules', 'src/services/applicationsService.ts'],
  },
  'RN-023': {
    id: 'RN-023',
    domain: 'CANDIDATURAS_E_FUNIL',
    name: 'Etapas Oficiais do Funil de Recrutamento',
    description: 'Uma candidatura transita exclusivamente pelos estados: Novo -> Em Análise -> Entrevista -> Aprovado ou Recusado.',
    trigger: 'Ação do recrutador no painel da empresa.',
    condition: 'Novo status pertence ao conjunto oficial de etapas permitidas.',
    effect: 'Atualização do status no Firestore e notificação em tempo real no painel do candidato.',
    relatedRF: 'RF_F06 / RF_S02',
    sourceFiles: ['src/utils/matchAlgorithm.ts', 'src/components/CompanyDashboard.tsx'],
  },
  'RN-024': {
    id: 'RN-024',
    domain: 'CANDIDATURAS_E_FUNIL',
    name: 'Contato Direto via WhatsApp com Mensagem Parametrizada',
    description: 'A empresa pode iniciar conversa com o candidato no WhatsApp através de link direto pré-formatado com cargo, nome da empresa e portal.',
    trigger: 'Clique no botão "Chamar no WhatsApp" da candidatura.',
    condition: 'Candidato possui telefone celular preenchido no perfil.',
    effect: 'Abertura da API do WhatsApp (https://api.whatsapp.com/send?phone=...) com texto estruturado.',
    relatedRF: 'RF_F06',
    sourceFiles: ['src/utils/matchAlgorithm.ts', 'src/components/CompanyDashboard.tsx'],
  },

  // DOMÍNIO 6: MOTOR DE MATCH
  'RN-025': {
    id: 'RN-025',
    domain: 'MOTOR_DE_MATCH',
    name: 'Cálculo Determinístico de Match Ponderado (100 Pontos)',
    description: 'O índice de Match (0% a 100%) é decomposto estritamente em: Habilidades técnicas (40 pts) + Nível de experiência (25 pts) + Palavras-chave do cargo (20 pts) + Localização regional (15 pts).',
    trigger: 'Envio de candidatura ou visualização de inscritos.',
    condition: 'Cálculo via função determinística calculateDeterministicMatch(candidato, vaga).',
    effect: 'Armazenamento da pontuação total e do breakdown analítico no registro da candidatura.',
    relatedRF: 'RF_F05 / RF_S02',
    sourceFiles: ['src/utils/matchEngine.ts', 'src/services/applicationsService.ts'],
  },
  'RN-026': {
    id: 'RN-026',
    domain: 'MOTOR_DE_MATCH',
    name: 'Enquadramento Positivo e Orientação Profissional',
    description: 'O resultado de Match apresenta pontos fortes e competências adquiridas primeiro, orientando competências faltantes de forma construtiva.',
    trigger: 'Visualização da análise de compatibilidade pelo candidato.',
    condition: 'Exibição de mensagens estruturadas com foco em desenvolvimento e qualificação.',
    effect: 'Aumento da confiança e incentivo à qualificação profissional.',
    relatedRF: 'RF_F05',
    sourceFiles: ['src/utils/matchAlgorithm.ts', 'src/components/CandidateDashboard.tsx'],
  },

  // DOMÍNIO 7: CURRÍCULO ATS PDF
  'RN-027': {
    id: 'RN-027',
    domain: 'CURRICULO_ATS_PDF',
    name: 'Texto Selecionável em Formato PDF 1.4 Padrão ATS',
    description: 'O currículo gerado deve ser um arquivo PDF 1.4 autêntico com blocos de texto vetorial selecionável (BT/ET e WinAnsiEncoding), legível por robôs de RH.',
    trigger: 'Geração de currículo no modal ATS.',
    condition: 'Candidato possui saldo de 15 créditos e dados curriculares básicos preenchidos.',
    effect: 'Geração imediata dos bytes PDF para download sem depender de servidores externos lentos.',
    relatedRF: 'RF_F04',
    sourceFiles: ['src/utils/pdfResumeGenerator.ts', 'src/components/ResumeGeneratorModal.tsx'],
  },
  'RN-028': {
    id: 'RN-028',
    domain: 'CURRICULO_ATS_PDF',
    name: 'Proteção de Dados Residenciais e CPF no PDF Exportado',
    description: 'Endereço residencial completo (rua, número, bairro e CEP) e pretensão salarial nunca são exportados no PDF; o CPF só é incluído se o usuário autorizar explicitamente.',
    trigger: 'Estruturação dos dados para renderização do PDF.',
    condition: 'Filtro de privacidade obrigatório na função buildStructuredResumeFromProfile.',
    effect: 'Conformidade irrestrita com a LGPD e proteção contra vazamento de residência física.',
    relatedRF: 'RF_F04 / RNF_LGPD',
    sourceFiles: ['src/utils/pdfResumeGenerator.ts', 'src/utils/platformRules.test.ts'],
  },
  'RN-029': {
    id: 'RN-029',
    domain: 'CURRICULO_ATS_PDF',
    name: 'Três Modelos Visuais Lineares para Triagem ATS',
    description: 'O candidato pode escolher entre 3 modelos: Clássico Executivo, Moderno Tecnológico e Compacto Objetivo, todos com diagramação linear mono-coluna.',
    trigger: 'Seleção de modelo visual no modal de geração.',
    condition: 'templateId em ["ats_classic", "ats_modern", "ats_compact"].',
    effect: 'Aplicação do layout correspondente mantendo 100% de compatibilidade com sistemas ATS.',
    relatedRF: 'RF_F04',
    sourceFiles: ['src/utils/pdfResumeGenerator.ts', 'src/components/ResumeGeneratorModal.tsx'],
  },

  // DOMÍNIO 8: PAGAMENTOS MERCADO PAGO
  'RN-030': {
    id: 'RN-030',
    domain: 'PAGAMENTOS_MERCADO_PAGO',
    name: 'Geração de Cobrança Pix e EMVCo BRCode',
    description: 'A cobrança Pix deve gerar imagem de QR Code e código Copia e Cola compatível com o padrão EMVCo do Banco Central via API oficial do Mercado Pago.',
    trigger: 'Seleção da opção de pagamento Pix.',
    condition: 'Chamada à rota POST /api/mercadopago/create-pix com pacote válido.',
    effect: 'Exibição imediata do QR Code e código Copia e Cola com botão de cópia com 1 toque.',
    errorMessage: 'Não foi possível gerar a cobrança Pix no momento.',
    relatedRF: 'RF_F03',
    sourceFiles: ['server.ts', 'src/services/mercadopagoService.ts', 'src/components/MercadoPagoModal.tsx'],
  },
  'RN-031': {
    id: 'RN-031',
    domain: 'PAGAMENTOS_MERCADO_PAGO',
    name: 'Idempotência Estrita no Crédito de Pagamentos',
    description: 'O webhook de confirmação do Mercado Pago verifica o status do pedido antes de creditar, impedindo duplicidade de créditos em caso de retentativas de rede.',
    trigger: 'Recebimento de notificação no webhook POST /api/mercadopago/webhook.',
    condition: 'Se order.status === "approved", o pedido é ignorado para não creditar duas vezes.',
    effect: 'Garantia de exatidão e consistência contábil.',
    relatedRF: 'RF_F03',
    sourceFiles: ['server.ts'],
  },
  'RN-032': {
    id: 'RN-032',
    domain: 'PAGAMENTOS_MERCADO_PAGO',
    name: 'Validação de Assinatura Criptográfica HMAC no Webhook',
    description: 'Notificações de pagamento recebidas no webhook têm sua assinatura (x-signature) validada contra o segredo de webhook do Mercado Pago.',
    trigger: 'Requisição externa ao endpoint do webhook.',
    condition: 'Assinatura HMAC-SHA256 coincide com o corpo da mensagem.',
    effect: 'Processamento apenas de mensagens genuínas enviadas pelos servidores do Mercado Pago.',
    errorMessage: 'Assinatura de webhook inválida.',
    relatedRF: 'RF_F03',
    sourceFiles: ['server.ts'],
  },

  // DOMÍNIO 9: INCLUSÃO E RECRUTAMENTO CEGO
  'RN-033': {
    id: 'RN-033',
    domain: 'INCLUSAO_E_RECRUTAMENTO_CEGO',
    name: 'Modo de Recrutamento às Cegas (Blind Hiring)',
    description: 'Ao ativar o modo de recrutamento às cegas, a empresa visualiza candidatos com nome, foto, idade e ano de formatura ocultos durante a triagem inicial.',
    trigger: 'Toggle do switch "Recrutamento às Cegas" no painel da empresa.',
    condition: 'isBlindMode === true.',
    effect: 'Substituição do nome por identificador neutro (ex: "Candidato #4A8B") para mitigação de vieses inconscientes.',
    relatedRF: 'RF_F06 / RF_S02',
    sourceFiles: ['src/utils/ponteTalentosLogic.ts', 'src/components/CompanyDashboard.tsx'],
  },
  'RN-034': {
    id: 'RN-034',
    domain: 'INCLUSAO_E_RECRUTAMENTO_CEGO',
    name: 'Filtros Inclusivos de Vagas Regionais',
    description: 'O mural regional disponibiliza filtros específicos para Primeiro Emprego, Estágio, PCD e profissionais 50+ em Presidente Prudente e região.',
    trigger: 'Seleção dos chips rápidos de filtro no mural.',
    condition: 'Filtros combináveis aplicados à listagem de vagas.',
    effect: 'Inclusão de jovens e profissionais seniores no mercado de trabalho regional.',
    relatedRF: 'RF_S01',
    sourceFiles: ['src/components/HomeView.tsx', 'src/constants/credits.ts'],
  },

  // DOMÍNIO 10: AUDITORIA E INTEGRIDADE
  'RN-035': {
    id: 'RN-035',
    domain: 'AUDITORIA_E_INTEGRIDADE',
    name: 'Livro-Razão Imutável de Transações de Créditos',
    description: 'Toda movimentação de créditos gera um lançamento histórico indelével com data/hora, tipo de operação, quantidade e saldo resultante.',
    trigger: 'Qualquer transação de adição, bônus ou dedução de créditos.',
    condition: 'Registro inserido em /credit_transactions exclusivamente via servidor.',
    effect: 'Rastreabilidade contábil total auditável pelo usuário e pela administração.',
    relatedRF: 'RF_S03',
    sourceFiles: ['firestore.rules', 'server.ts', 'src/services/usersService.ts'],
  },
  'RN-036': {
    id: 'RN-036',
    domain: 'AUDITORIA_E_INTEGRIDADE',
    name: 'Sanitização Automática de Entradas contra XSS e Injeção',
    description: 'Todo texto inserido por usuários em títulos de vaga, descrições, currículos ou campos livres é sanitizado contra tags HTML maliciosas.',
    trigger: 'Envio de qualquer formulário pelo cliente ou recebimento no backend.',
    condition: 'Execução de rotina de sanitização que remove scripts e tags perigosas.',
    effect: 'Armazenamento de conteúdo textual limpo e seguro.',
    relatedRF: 'RNF_SEGURANCA',
    sourceFiles: ['src/utils/validation.ts', 'src/utils/securityAudit.test.ts'],
  },
};

/**
 * Funções Executoras e Validadoras das Regras de Negócio
 */

/**
 * RN-011 / RN-012: Verifica suficiência de saldo de créditos para uma dada operação.
 */
export function checkCreditSufficiency(
  currentBalance: number,
  operation: keyof typeof CREDIT_COSTS
): { allowed: boolean; cost: number; missingCredits: number; message?: string } {
  const cost = CREDIT_COSTS[operation];
  if (typeof cost !== 'number') {
    throw new Error(`Operação inválida de crédito: ${String(operation)}`);
  }
  const allowed = currentBalance >= cost;
  return {
    allowed,
    cost,
    missingCredits: allowed ? 0 : cost - currentBalance,
    message: allowed
      ? undefined
      : `Saldo insuficiente (${currentBalance} cr). Esta operação custa ${cost} cr. Faltam ${cost - currentBalance} cr.`,
  };
}

/**
 * RN-015: Verifica se um usuário possui permissão para publicar vagas.
 */
export function canUserPublishJob(user: {
  role?: string;
  type?: string;
  isVerifiedCompany?: boolean;
  cnpjVerified?: boolean;
}): { allowed: boolean; reason?: string } {
  const role = user.role || user.type;
  if (role === 'admin') return { allowed: true };
  if (role !== 'company') {
    return {
      allowed: false,
      reason: 'Apenas usuários cadastrados como Empresa (CNPJ) podem publicar vagas de emprego.',
    };
  }
  const isVerified = Boolean(user.isVerifiedCompany || user.cnpjVerified);
  if (!isVerified) {
    return {
      allowed: false,
      reason: 'Seu CNPJ precisa estar ativo e verificado na Receita Federal para publicar vagas.',
    };
  }
  return { allowed: true };
}

/**
 * RN-020: Verifica se o candidato já se inscreveu na vaga.
 */
export function hasAlreadyApplied(
  candidateId: string,
  existingApplications: Array<{ candidateId: string; jobId?: string }>,
  jobId?: string
): boolean {
  if (!candidateId || !existingApplications) return false;
  return existingApplications.some(
    (app) => app.candidateId === candidateId && (!jobId || app.jobId === jobId)
  );
}

/**
 * RN-022: Verifica se o usuário tem permissão para visualizar uma candidatura.
 */
export function canViewApplication(
  userUid: string,
  userRole: string,
  application: { candidateId: string; companyId: string }
): boolean {
  if (!userUid || !application) return false;
  if (userRole === 'admin') return true;
  return application.candidateId === userUid || application.companyId === userUid;
}

/**
 * RN-017: Verifica se a vaga expirou (vigência de 30 dias).
 */
export function isJobExpired(
  createdAtIso: string,
  expiresAtIso?: string,
  referenceNowMs: number = Date.now()
): boolean {
  if (expiresAtIso) {
    const expMs = new Date(expiresAtIso).getTime();
    if (!isNaN(expMs)) return referenceNowMs > expMs;
  }
  const createdMs = new Date(createdAtIso).getTime();
  if (isNaN(createdMs)) return false;
  const thirtyDaysMs = BUSINESS_RULES_CONSTANTS.JOB_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
  return referenceNowMs > createdMs + thirtyDaysMs;
}

/**
 * RN-033: Verifica se um campo do candidato deve ser ocultado no modo de recrutamento às cegas.
 */
export function isBlindHiringField(fieldName: string): boolean {
  return (BUSINESS_RULES_CONSTANTS.BLIND_HIRING_HIDDEN_FIELDS as readonly string[]).includes(fieldName);
}

/**
 * RN-001: Valida política de força de senha.
 */
export function validatePasswordRule(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < BUSINESS_RULES_CONSTANTS.MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      message: `A senha deve conter no mínimo ${BUSINESS_RULES_CONSTANTS.MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }
  return { valid: true };
}

/**
 * RN-016: Executa a regra de formatação salarial.
 */
export { formatSalaryBRL };

/**
 * RN-025: Executa o motor de Match determinístico.
 */
export { calculateDeterministicMatch };

/**
 * RN-005 e RN-006: Validações matemáticas de documentos.
 */
export { validateCPF, validateCNPJMath };
