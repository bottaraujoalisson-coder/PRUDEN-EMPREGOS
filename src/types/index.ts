export type UserRole = 'candidate' | 'company' | 'admin';

export type PlanPeriod = 'monthly' | 'yearly';
export type CompanyPlanId = 'company_free' | 'company_pro' | 'company_vip';
export type CandidatePlanId = 'candidate_free' | 'candidate_highlight' | 'candidate_vip';
export type PlanId = CompanyPlanId | CandidatePlanId;

export interface PlanFeature {
  text: string;
  highlight?: boolean;
}

export interface PricingPlan {
  id: PlanId;
  targetRole: 'company' | 'candidate';
  title: string;
  badge?: string;
  isFeatured?: boolean;
  monthlyPrice: number;
  yearlyPriceMonthly: number; // Price per month when billed annually
  yearlyTotal: number;
  originalMonthlyPrice?: number;
  description: string;
  features: PlanFeature[];
  notIncluded?: string[];
  ctaText: string;
}

export interface ResumeExperience {
  id: string;
  company: string;
  role: string;
  period: string;
  current?: boolean;
  description: string;
}

export interface ResumeEducation {
  id: string;
  degree: string;
  institution: string;
  completionYear: string;
  status: 'Concluído' | 'Cursando' | 'Incompleto';
}

export type ResumeTemplateId = 'ats_classic' | 'modern_corporate' | 'first_job_focus';

export interface GeneratedResumeRecord {
  id: string;
  userId: string;
  templateId: ResumeTemplateId;
  fileName: string;
  pdfDataUrl?: string;
  downloadUrl?: string;
  creditsCharged: number;
  transactionId: string;
  createdAt: string;
}

export interface UserAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  type: UserRole;
  phone?: string;
  city?: string;
  state?: string;
  cep?: string;
  street?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  address?: UserAddress;

  role?: string;
  experienceLevel?: string;
  education?: string;
  salaryExpectation?: string;
  about?: string;
  skills?: string[];
  experiences?: ResumeExperience[];
  educationHistory?: ResumeEducation[];
  certifications?: string[];
  languages?: string[];
  linkedinUrl?: string;

  profileCompleteness?: number;
  resumeFileName?: string;
  resumeDataUrl?: string; // Base64 PDF storage
  photoDataUrl?: string; // Candidate profile photo (Base64/DataURL)
  logoDataUrl?: string; // Company logo (Base64/DataURL)

  // --- DADOS EMPRESARIAIS RECEITA FEDERAL (USO INTERNO / CADASTRO) ---
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpjSituacao?: string;

  // --- CAMPOS DE DOCUMENTO E RBAC ESTRITO (CPF vs CNPJ - USO INTERNO) ---
  documentType?: 'CPF' | 'CNPJ';
  documentNumber?: string;
  normalizedDocument?: string;
  cpf?: string;
  cnpj?: string;
  savedJobIds?: string[];

  credits?: number;
  isVerified?: boolean;

  // --- PLANOS & ASSINATURA MERCADO PAGO ---
  planId?: PlanId;
  planName?: string;
  planPeriod?: PlanPeriod;
  planExpiresAt?: string;
  planPurchasedAt?: string;
  planCancelledAt?: string;
  planAutoRenew?: boolean;
  planPaymentMethod?: 'pix' | 'credit_card' | 'free';

  createdAt?: string;
  updatedAt?: string;
}

export interface CreditOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  packageId: string;
  packageName: string;
  credits: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  paymentMethod: 'pix' | 'credit_card';
  mpPreferenceId?: string;
  mpPaymentId?: string;
  qrCode?: string;
  ticketUrl?: string;
  initPoint?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  orderId?: string;
  type: 'purchase' | 'usage' | 'debit' | 'refund' | 'bonus' | 'admin_adjustment';
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface ScreeningQuestion {
  id: string;
  question: string;
  expectedAnswer?: 'sim' | 'nao';
}

export type CnhCategory = 'nao' | 'A' | 'B' | 'AB' | 'C' | 'D' | 'E';
export type VehicleRequirement = 'nao' | 'moto' | 'carro';

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  companyLogoDataUrl?: string;
  title: string;
  location: string;
  category: string;
  workModel: 'Presencial' | 'Remoto' | 'Híbrido';
  contract: 'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Jovem Aprendiz';
  experience: 'Qualquer Nível' | 'Primeiro Emprego' | 'Estágio' | 'Júnior' | 'Pleno' | 'Sênior';
  description: string;
  skills: string[];
  salaryRange?: string;
  premium?: boolean;
  featured?: boolean;
  status: 'active' | 'closed' | 'paused';
  applicantCount?: number;
  createdAt: string;
  updatedAt?: string;

  // --- NOVOS CAMPOS OPCIONAIS (Módulos 2, 3, 4, 5) ---
  salaryType?: 'exact' | 'range' | 'negotiable';
  salaryMin?: number;
  salaryMax?: number;
  benefits?: string[];
  acceptsFirstJob?: boolean;
  requiresCnh?: CnhCategory;
  requiresVehicle?: VehicleRequirement;
  screeningQuestions?: ScreeningQuestion[];
  companyVerified?: boolean;
  expiresAt?: string; // ISO Date (ex: +30 dias após criação)
}

export type ApplicationStatus =
  | 'enviado'
  | 'visualizado'
  | 'em_analise'
  | 'convocado'
  | 'encerrado'
  | 'Enviado'
  | 'Em Análise'
  | 'Entrevista'
  | 'Aprovado'
  | 'Rejeitado'
  | string;

export interface MatchBreakdown {
  skillsScore: number; // 0-100
  experienceScore: number; // 0-100
  educationScore: number; // 0-100
  locationScore: number; // 0-100
}

export interface Application {
  id: string;
  jobId: string;
  companyId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  candidateCity?: string;
  candidatePhotoDataUrl?: string;
  candidateRole?: string;
  candidateExperienceLevel?: string;
  candidateEducation?: string;
  candidateSkills?: string[];
  candidateAbout?: string;
  candidateResumeName?: string;
  candidateResumeDataUrl?: string;
  jobTitle: string;
  companyName: string;
  jobLocation: string;
  matchScore: number;
  matchBreakdown?: MatchBreakdown;
  matchStrengths?: string[];
  matchWeaknesses?: string[];
  matchingSkills?: string[];
  missingSkills?: string[];
  status: ApplicationStatus;
  recruiterNotes?: string;
  appliedAt: string;
  updatedAt?: string;

  // --- NOVOS CAMPOS OPCIONAIS (Módulos 1 e 2) ---
  viewedAt?: string;
  screeningAnswers?: Record<string, 'sim' | 'nao'>;
  screeningScore?: number; // Quantidade de respostas compatíveis
  screeningTotal?: number; // Total de perguntas da vaga
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  targetType: 'job' | 'company' | 'user';
  targetId: string;
  targetTitle: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'dismissed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminEmail: string;
  action: string;
  targetId: string;
  details: string;
  timestamp: string;
}
