import React, { useState, useMemo, useEffect } from 'react';
import {
  Job,
  Application,
  UserProfile,
  ApplicationStatus,
  ScreeningQuestion,
  CnhCategory,
  VehicleRequirement,
  CreditOrder,
  CreditTransaction,
} from '../types';
import {
  formatDate,
  formatCNPJ,
  isValidCNPJ,
  isCandidate,
  REGIONAL_CITIES,
  BENEFIT_OPTIONS,
  SUGGESTED_SCREENING_QUESTIONS,
  getApplicationStatusDisplay,
  isInitialSentStatus,
  getDaysUntilExpiration,
  calculateRenewedExpiresAt,
  formatJobSalary,
  getWhatsAppJobShareUrl,
  SALARY_REFERENCE_ANCHORS,
  CATEGORY_SKILL_ANCHORS,
} from '../utils/matchAlgorithm';
import { requestJobOptimization } from '../services/aiService';
import { lookupCompanyByCnpj } from '../services/cnpjService';
import {
  cancelUserPlanSubscription,
  getUserCreditsHistory,
  checkCreditOrderStatus,
} from '../services/mercadopagoService';
import {
  CREDIT_PACKAGES,
  CreditPackage,
  POST_JOB_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
} from '../utils/creditsData';
import { formatPriceBRL } from '../utils/plansData';
import {
  CheckCircle2,
  MessageCircle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Sparkles,
  ShieldCheck,
  Coins,
  Check,
  Clock,
  Camera,
  Building2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface CompanyDashboardProps {
  user: UserProfile;
  jobs: Job[];
  applications: Application[];
  activeSubTab?: 'jobs' | 'candidates' | 'post' | 'credits';
  onSubTabChange?: (tab: 'jobs' | 'candidates' | 'post' | 'credits') => void;
  onNavigate?: (view: string, subTab?: string) => void;
  onUpdateProfile?: (updatedData: Partial<UserProfile>) => Promise<void>;
  onSelectCreditPackage?: (pkg: CreditPackage) => void;
  onCreditsUpdated?: (newBalance: number) => void;
  onPostJob: (jobData: Omit<Job, 'id' | 'createdAt' | 'applicantCount'>) => Promise<void>;
  onBoostJob?: (job: Job) => Promise<void>;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  onUpdateAppStatus: (
    appId: string,
    newStatus: ApplicationStatus,
    notes?: string,
    viewedAt?: string
  ) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const JOB_WIZARD_STEPS = [
  { id: 1, title: 'Informações Básicas' },
  { id: 2, title: 'Requisitos' },
  { id: 3, title: 'Competências' },
  { id: 4, title: 'Revisão e Conclusão' },
] as const;

export const CompanyDashboard: React.FC<CompanyDashboardProps> = ({
  user,
  jobs,
  applications,
  activeSubTab = 'jobs',
  onSubTabChange,
  onNavigate,
  onUpdateProfile,
  onSelectCreditPackage,
  onCreditsUpdated,
  onPostJob,
  onBoostJob,
  onUpdateJob,
  onDeleteJob,
  onUpdateAppStatus,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'jobs' | 'candidates' | 'post' | 'credits'>(
    activeSubTab
  );
  const [jobWizardStep, setJobWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [cancellingPlan, setCancellingPlan] = useState(false);

  // Dados cadastrais internos da empresa (Receita Federal CNPJ + Logo)
  const [showCompanySettings, setShowCompanySettings] = useState(false);
  const [companyLogoDataUrl, setCompanyLogoDataUrl] = useState<string>(user.logoDataUrl || '');
  const [companyCnpjInput, setCompanyCnpjInput] = useState<string>(
    formatCNPJ(user.cnpj || user.documentNumber || '')
  );
  const [companyNameInput, setCompanyNameInput] = useState<string>(user.name || '');
  const [companyRazaoSocial, setCompanyRazaoSocial] = useState<string>(
    user.razaoSocial || user.name || ''
  );
  const [companyCityInput, setCompanyCityInput] = useState<string>(
    user.city || 'Presidente Prudente, SP'
  );
  const [companySituacao, setCompanySituacao] = useState<string>(user.cnpjSituacao || 'ATIVA');
  const [checkingCnpj, setCheckingCnpj] = useState(false);
  const [cnpjVerifyError, setCnpjVerifyError] = useState('');
  const [savingCompanyProfile, setSavingCompanyProfile] = useState(false);

  // Carteira de Créditos & Pedidos
  const [creditOrders, setCreditOrders] = useState<CreditOrder[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<CreditTransaction[]>([]);
  const [loadingCreditsHistory, setLoadingCreditsHistory] = useState(false);
  const [checkingOrderId, setCheckingOrderId] = useState<string | null>(null);
  const [boostingJobId, setBoostingJobId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);

  const loadCreditsData = async () => {
    setLoadingCreditsHistory(true);
    try {
      const history = await getUserCreditsHistory(user.uid);
      setCreditOrders(history.orders);
      setCreditTransactions(history.transactions);
    } finally {
      setLoadingCreditsHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'credits') {
      loadCreditsData();
    }
  }, [activeTab, user.uid, user.credits]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Selecione uma imagem válida (PNG, JPG ou WebP) para a logo.', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('A logo deve ter no máximo 2 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setCompanyLogoDataUrl(dataUrl);
      if (onUpdateProfile) {
        await onUpdateProfile({ logoDataUrl: dataUrl });
      }
      showToast('Logo da empresa atualizada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleValidateCnpjReceitaFederal = async (rawVal: string) => {
    setCnpjVerifyError('');
    const digits = rawVal.replace(/\D/g, '').slice(0, 14);
    const formatted = formatCNPJ(digits);
    setCompanyCnpjInput(formatted);

    if (digits.length === 14) {
      if (!isValidCNPJ(digits)) {
        setCnpjVerifyError('CNPJ inválido. Verifique os 14 dígitos e os dígitos verificadores.');
        return;
      }
      setCheckingCnpj(true);
      const res = await lookupCompanyByCnpj(digits);
      setCheckingCnpj(false);

      if (!res.success || !res.data) {
        setCnpjVerifyError(
          res.error ||
            'CNPJ inexistente ou com situação inativa na Receita Federal. Atualização bloqueada.'
        );
        return;
      }

      setCompanyRazaoSocial(res.data.razaoSocial);
      setCompanyNameInput(res.data.nomeFantasia || res.data.razaoSocial);
      setCompanyCityInput(res.data.cityState || companyCityInput);
      setCompanySituacao(res.data.situacaoCadastral || 'ATIVA');
      showToast(`CNPJ validado na Receita Federal: ${res.data.razaoSocial} (ATIVA).`);
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setCnpjVerifyError('');
    const digits = companyCnpjInput.replace(/\D/g, '');
    if (digits.length !== 14 || !isValidCNPJ(digits)) {
      setCnpjVerifyError('Informe um CNPJ válido de 14 dígitos.');
      return;
    }

    setSavingCompanyProfile(true);
    try {
      const rfRes = await lookupCompanyByCnpj(digits);
      if (!rfRes.success || !rfRes.data) {
        const msg =
          rfRes.error ||
          'CNPJ inexistente ou inativo na Receita Federal. Não é permitido salvar.';
        setCnpjVerifyError(msg);
        showToast(msg, 'error');
        return;
      }

      if (onUpdateProfile) {
        await onUpdateProfile({
          name: companyNameInput.trim() || rfRes.data.nomeFantasia || rfRes.data.razaoSocial,
          razaoSocial: rfRes.data.razaoSocial,
          nomeFantasia: rfRes.data.nomeFantasia || companyNameInput.trim(),
          cnpj: formatCNPJ(digits),
          documentNumber: formatCNPJ(digits),
          normalizedDocument: digits,
          cnpjSituacao: rfRes.data.situacaoCadastral,
          city: rfRes.data.cityState || companyCityInput,
          logoDataUrl: companyLogoDataUrl,
        });
      }
      setShowCompanySettings(false);
      showToast('Dados empresariais validados na Receita Federal e salvos!');
    } finally {
      setSavingCompanyProfile(false);
    }
  };

  const handleVerifyOrder = async (orderId: string) => {
    try {
      setCheckingOrderId(orderId);
      const res = await checkCreditOrderStatus(user, orderId);
      if (res.approved && typeof res.newBalance === 'number') {
        onCreditsUpdated?.(res.newBalance);
        showToast('Pagamento confirmado e créditos creditados na sua carteira!');
      } else {
        showToast('Status verificado: aguardando confirmação do pagamento no Mercado Pago.');
      }
      await loadCreditsData();
    } catch {
      showToast('Erro ao verificar status do pedido.', 'error');
    } finally {
      setCheckingOrderId(null);
    }
  };

  const handleCancelPlan = async () => {
    try {
      setCancellingPlan(true);
      const updates = await cancelUserPlanSubscription(user.uid);
      if (updates) {
        setConfirmCancelModal(false);
        showToast('Renovação cancelada. Seus benefícios continuam ativos até o fim do ciclo pago.');
      }
    } catch {
      showToast('Erro ao cancelar renovação.', 'error');
    } finally {
      setCancellingPlan(false);
    }
  };

  // Core Form states for new/edited job
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('Tecnologia');
  const [jobWorkModel, setJobWorkModel] = useState<'Presencial' | 'Remoto' | 'Híbrido'>(
    'Presencial'
  );
  const [jobExperience, setJobExperience] = useState<
    'Qualquer Nível' | 'Primeiro Emprego' | 'Estágio' | 'Júnior' | 'Pleno' | 'Sênior'
  >('Pleno');
  const [jobContract, setJobContract] = useState<
    'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Jovem Aprendiz' | 'Freelancer'
  >('CLT');
  const [jobLocation, setJobLocation] = useState('Presidente Prudente, SP');
  const [jobSkillsStr, setJobSkillsStr] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPremium, setJobPremium] = useState(false);
  const [roughNotes, setRoughNotes] = useState('');

  const [acceptsFirstJob, setAcceptsFirstJob] = useState(false);
  const [requiresCnh, setRequiresCnh] = useState<CnhCategory>('nao');
  const [requiresVehicle, setRequiresVehicle] = useState<VehicleRequirement>('nao');

  const [salaryType, setSalaryType] = useState<'range' | 'exact' | 'negotiable'>('negotiable');
  const [salaryMinStr, setSalaryMinStr] = useState('');
  const [salaryMaxStr, setSalaryMaxStr] = useState('');
  const [jobSalaryRange, setJobSalaryRange] = useState('');
  const [selectedBenefits, setSelectedBenefits] = useState<string[]>([]);

  const [screeningQuestions, setScreeningQuestions] = useState<ScreeningQuestion[]>([]);
  const [customQuestionText, setCustomQuestionText] = useState('');

  const [submittingJob, setSubmittingJob] = useState(false);
  const [optimizingWithAi, setOptimizingWithAi] = useState(false);

  const JOB_DRAFT_STORAGE_KEY = `pruden_job_draft_${user.uid}`;

  // Restaura rascunho automático da vaga ao abrir o painel (quando não está editando vaga existente)
  useEffect(() => {
    if (editingJob) return;
    try {
      const savedDraft = localStorage.getItem(JOB_DRAFT_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.jobTitle) setJobTitle(parsed.jobTitle);
        if (parsed.jobCategory) setJobCategory(parsed.jobCategory);
        if (parsed.jobWorkModel) setJobWorkModel(parsed.jobWorkModel);
        if (parsed.jobExperience) setJobExperience(parsed.jobExperience);
        if (parsed.jobContract) setJobContract(parsed.jobContract);
        if (parsed.jobLocation) setJobLocation(parsed.jobLocation);
        if (parsed.jobSkillsStr) setJobSkillsStr(parsed.jobSkillsStr);
        if (parsed.jobDescription) setJobDescription(parsed.jobDescription);
      }
    } catch {
      // ignore storage errors
    }
  }, [JOB_DRAFT_STORAGE_KEY]);

  // Salva rascunho automaticamente em localStorage enquanto a empresa preenche os 4 passos
  useEffect(() => {
    if (editingJob) return;
    if (!jobTitle.trim() && !jobDescription.trim() && !jobSkillsStr.trim()) return;
    try {
      localStorage.setItem(
        JOB_DRAFT_STORAGE_KEY,
        JSON.stringify({
          jobTitle,
          jobCategory,
          jobWorkModel,
          jobExperience,
          jobContract,
          jobLocation,
          jobSkillsStr,
          jobDescription,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [
    editingJob,
    JOB_DRAFT_STORAGE_KEY,
    jobTitle,
    jobCategory,
    jobWorkModel,
    jobExperience,
    jobContract,
    jobLocation,
    jobSkillsStr,
    jobDescription,
  ]);

  // Candidate Pipeline states
  const [sortByScreening, setSortByScreening] = useState(false);
  const [expandedCandidateIds, setExpandedCandidateIds] = useState<Record<string, boolean>>({});
  const [selectedCandidateForNotes, setSelectedCandidateForNotes] = useState<Application | null>(
    null
  );
  const [recruiterNoteText, setRecruiterNoteText] = useState('');

  const handleSelectTab = (tab: 'jobs' | 'candidates' | 'post' | 'credits') => {
    setActiveTab(tab);
    onSubTabChange?.(tab);
  };

  if (isCandidate(user)) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] py-12">
        <div className="container-app max-w-lg">
          <div className="surface-card p-6 sm:p-8 space-y-4">
            <div
              role="alert"
              className="text-[#C0393B] bg-[#FEF2F2] border border-[#C0393B]/20 rounded-lg p-3 text-sm font-medium"
            >
              Acesso restrito a empresas cadastradas com CNPJ
            </div>
            <p className="text-[14px] text-[#64748B]">
              Você está conectado com uma conta de Candidato (CPF). Para publicar vagas e gerenciar candidatos, acesse com uma conta empresarial (CNPJ).
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onNavigate?.('candidate', 'applications')}
                className="btn-base btn-md btn-primary"
              >
                Ir para Área do Candidato
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.('home')}
                className="btn-base btn-md btn-secondary"
              >
                Buscar Vagas
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const myJobs = useMemo(() => {
    return jobs.filter((j) => j.companyId === user.uid);
  }, [jobs, user.uid]);

  const myJobIds = useMemo(() => myJobs.map((j) => j.id), [myJobs]);

  const myApplications = useMemo(() => {
    const filtered = applications.filter(
      (app) => app.companyId === user.uid || myJobIds.includes(app.jobId)
    );
    return [...filtered].sort((a, b) => {
      if (sortByScreening) {
        const aRatio =
          typeof a.screeningTotal === 'number' && a.screeningTotal > 0
            ? (a.screeningScore ?? 0) / a.screeningTotal
            : -1;
        const bRatio =
          typeof b.screeningTotal === 'number' && b.screeningTotal > 0
            ? (b.screeningScore ?? 0) / b.screeningTotal
            : -1;
        if (bRatio !== aRatio) {
          return bRatio - aRatio;
        }
      }
      return b.matchScore - a.matchScore;
    });
  }, [applications, user.uid, myJobIds, sortByScreening]);

  const resetJobForm = () => {
    setEditingJob(null);
    setJobWizardStep(1);
    setJobTitle('');
    setJobCategory('Tecnologia');
    setJobWorkModel('Presencial');
    setJobExperience('Pleno');
    setJobContract('CLT');
    setJobLocation('Presidente Prudente, SP');
    setJobSalaryRange('');
    setSalaryType('negotiable');
    setSalaryMinStr('');
    setSalaryMaxStr('');
    setSelectedBenefits([]);
    setAcceptsFirstJob(false);
    setRequiresCnh('nao');
    setRequiresVehicle('nao');
    setScreeningQuestions([]);
    setCustomQuestionText('');
    setJobSkillsStr('');
    setJobDescription('');
    setJobPremium(false);
    setRoughNotes('');
    try {
      localStorage.removeItem(JOB_DRAFT_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleStartEditJob = (job: Job) => {
    setEditingJob(job);
    setJobWizardStep(1);
    setJobTitle(job.title);
    setJobCategory(job.category);
    setJobWorkModel(job.workModel);
    setJobExperience(job.experience);
    setJobContract(job.contract);
    setJobLocation(job.location || 'Presidente Prudente, SP');
    setJobSalaryRange(job.salaryRange || '');
    setSalaryType(job.salaryType || (job.salaryRange ? 'exact' : 'negotiable'));
    setSalaryMinStr(job.salaryMin ? String(job.salaryMin) : '');
    setSalaryMaxStr(job.salaryMax ? String(job.salaryMax) : '');
    setSelectedBenefits(job.benefits ?? []);
    setAcceptsFirstJob(Boolean(job.acceptsFirstJob));
    setRequiresCnh(job.requiresCnh ?? 'nao');
    setRequiresVehicle(job.requiresVehicle ?? 'nao');
    setScreeningQuestions(job.screeningQuestions ?? []);
    setJobSkillsStr((job.skills ?? []).join(', '));
    setJobDescription(job.description);
    setJobPremium(Boolean(job.featured || job.premium));
    handleSelectTab('post');
  };

  const toggleBenefit = (benefit: string) => {
    setSelectedBenefits((prev) =>
      prev.includes(benefit) ? prev.filter((b) => b !== benefit) : [...prev, benefit]
    );
  };

  const addScreeningQuestion = (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    if (screeningQuestions.length >= 3) {
      showToast('Limite máximo de 3 perguntas rápidas atingido.', 'error');
      return;
    }
    if (screeningQuestions.some((q) => q.question.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Esta pergunta já foi adicionada.', 'error');
      return;
    }
    setScreeningQuestions((prev) => [
      ...prev,
      {
        id: `sq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        question: trimmed,
        expectedAnswer: 'sim',
      },
    ]);
    setCustomQuestionText('');
  };

  const removeScreeningQuestion = (id: string) => {
    setScreeningQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const toggleExpectedAnswer = (id: string) => {
    setScreeningQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? { ...q, expectedAnswer: q.expectedAnswer === 'nao' ? 'sim' : 'nao' }
          : q
      )
    );
  };

  const handleRenewJob = async (job: Job) => {
    try {
      const newExpiresAt = calculateRenewedExpiresAt(job, 15);
      await onUpdateJob(job.id, {
        expiresAt: newExpiresAt,
        status: 'active',
      });
      showToast('Validade da vaga renovada por +15 dias.');
    } catch {
      showToast('Erro ao renovar validade da vaga.', 'error');
    }
  };

  const handleBoostExistingJob = async (job: Job) => {
    if (!onBoostJob) return;
    setBoostingJobId(job.id);
    try {
      await onBoostJob(job);
    } finally {
      setBoostingJobId(null);
    }
  };

  const handleViewCandidateDetails = async (app: Application) => {
    setExpandedCandidateIds((prev) => ({
      ...prev,
      [app.id]: !prev[app.id],
    }));

    if (isInitialSentStatus(app.status)) {
      try {
        await onUpdateAppStatus(
          app.id,
          'visualizado',
          app.recruiterNotes,
          new Date().toISOString()
        );
      } catch {
        // Silent fallback
      }
    }
  };

  const handleOpenCandidateResume = async (app: Application) => {
    if (isInitialSentStatus(app.status)) {
      try {
        await onUpdateAppStatus(
          app.id,
          'visualizado',
          app.recruiterNotes,
          new Date().toISOString()
        );
      } catch {
        // Silent fallback
      }
    }
  };

  const handleAiOptimizeJob = async () => {
    if (!jobTitle.trim()) {
      showToast('Digite o título do cargo na Etapa 1 para gerar a descrição.', 'error');
      return;
    }

    try {
      setOptimizingWithAi(true);
      const skills = jobSkillsStr
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await requestJobOptimization({
        title: jobTitle,
        category: jobCategory,
        workModel: jobWorkModel,
        experience: jobExperience,
        skills,
        roughNotes,
      });

      setJobDescription(res.description);
      if (res.suggestedSkills && res.suggestedSkills.length > 0) {
        const merged = Array.from(new Set([...skills, ...res.suggestedSkills]));
        setJobSkillsStr(merged.join(', '));
      }

      showToast('Descrição da vaga gerada.');
    } catch (err: any) {
      showToast(err.message || 'Falha ao gerar descrição.', 'error');
    } finally {
      setOptimizingWithAi(false);
    }
  };

  const parsedJobSkills = useMemo(() => {
    return jobSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [jobSkillsStr]);

  const validateJobWizardStep = (step: 1 | 2 | 3 | 4): boolean => {
    if (step === 1) {
      if (!jobTitle.trim()) {
        showToast('Informe o título do cargo antes de avançar.', 'error');
        return false;
      }
      return true;
    }
    if (step === 2) {
      return true;
    }
    if (step === 3) {
      if (parsedJobSkills.length === 0) {
        showToast('Informe pelo menos uma habilidade necessária antes de avançar.', 'error');
        return false;
      }
      if (!jobDescription.trim()) {
        showToast('Preencha a descrição da vaga antes de avançar.', 'error');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextJobStep = () => {
    if (!validateJobWizardStep(jobWizardStep)) return;
    if (jobWizardStep < 4) {
      setJobWizardStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      const el = document.getElementById('company-job-wizard');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrevJobStep = () => {
    if (jobWizardStep > 1) {
      setJobWizardStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      const el = document.getElementById('company-job-wizard');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSubmitJobForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim()) {
      setJobWizardStep(1);
      showToast('Informe o título do cargo.', 'error');
      return;
    }

    if (parsedJobSkills.length === 0 || !jobDescription.trim()) {
      setJobWizardStep(3);
      showToast('Informe as competências e a descrição da vaga.', 'error');
      return;
    }

    const parsedMin = salaryMinStr ? Number(salaryMinStr) : undefined;
    const parsedMax = salaryMaxStr ? Number(salaryMaxStr) : undefined;

    const computedSalaryRange =
      jobSalaryRange.trim() ||
      formatJobSalary({
        salaryType,
        salaryMin: parsedMin,
        salaryMax: parsedMax,
      });

    const commonPayload: Partial<Job> = {
      title: jobTitle.trim(),
      companyLogoDataUrl: companyLogoDataUrl || user.logoDataUrl || '',
      category: jobCategory,
      workModel: jobWorkModel,
      experience: jobExperience,
      contract: jobContract,
      location: jobLocation,
      salaryType,
      salaryMin: parsedMin,
      salaryMax: parsedMax,
      salaryRange: computedSalaryRange,
      benefits: selectedBenefits,
      acceptsFirstJob,
      requiresCnh,
      requiresVehicle,
      screeningQuestions,
      companyVerified: Boolean(user.isVerified ?? true),
      skills: parsedJobSkills,
      description: jobDescription,
      premium: jobPremium,
      featured: jobPremium,
    };

    try {
      setSubmittingJob(true);
      if (editingJob) {
        await onUpdateJob(editingJob.id, commonPayload);
        showToast('Vaga atualizada com sucesso.');
        resetJobForm();
        handleSelectTab('jobs');
      } else {
        await onPostJob({
          companyId: user.uid,
          companyName: user.name,
          ...(commonPayload as any),
          status: 'active',
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        resetJobForm();
        handleSelectTab('jobs');
      }
    } catch (err: any) {
      if (err?.message !== 'INSUFFICIENT_CREDITS') {
        showToast(err?.message || 'Erro ao salvar vaga.', 'error');
      }
    } finally {
      setSubmittingJob(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedCandidateForNotes) return;
    try {
      await onUpdateAppStatus(
        selectedCandidateForNotes.id,
        selectedCandidateForNotes.status,
        recruiterNoteText
      );
      showToast('Observação salva.');
      setSelectedCandidateForNotes(null);
    } catch {
      showToast('Erro ao salvar observação.', 'error');
    }
  };

  const jobWizardPercent = jobWizardStep * 25;
  const totalPublishCreditsCost = editingJob
    ? jobPremium && !editingJob.featured
      ? BOOST_JOB_CREDIT_COST
      : 0
    : POST_JOB_CREDIT_COST + (jobPremium ? BOOST_JOB_CREDIT_COST : 0);

  return (
    <div className="min-h-screen bg-[#F4F7FE] pb-12">
      {/* Corporate Employer Workspace Header */}
      <div className="bg-gradient-to-b from-[#1E40AF] to-[#2563EB] text-white border-b border-[#1D4ED8] py-6">
        <div className="container-app flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              {companyLogoDataUrl ? (
                <img
                  src={companyLogoDataUrl}
                  alt={user.name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 bg-white"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/15 border-2 border-white/25 text-white font-bold text-lg flex items-center justify-center">
                  {(user.name || 'E').charAt(0).toUpperCase()}
                </div>
              )}
              <label
                htmlFor="company-header-logo-upload"
                title="Enviar ou trocar logo da empresa"
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-[#1E40AF] hover:bg-blue-50 flex items-center justify-center border border-[#93C5FD] cursor-pointer shadow-xs"
              >
                <Camera className="w-3 h-3" />
                <input
                  id="company-header-logo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] md:text-[26px] font-bold text-white truncate">
                  {user.name}
                </h1>
                <span className="text-xs font-semibold text-blue-100">
                  · Empresa Verificada ({companySituacao})
                </span>
              </div>
              <p className="text-[13px] text-blue-100 mt-1 tabular-nums">
                {user.email}
                {user.city ? ` · ${user.city}` : ''} · Créditos disponíveis:{' '}
                <strong data-testid="company-header-credits" className="text-white">
                  {user.credits ?? 0}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setShowCompanySettings(!showCompanySettings)}
              className="px-3.5 py-2 rounded-lg font-semibold text-[13px] bg-white/12 hover:bg-white/20 text-white border border-white/20 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-blue-200" />
              <span>Dados & CNPJ</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('credits')}
              className="px-4 py-2 rounded-lg font-semibold text-[13px] bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <Coins className="w-4 h-4 text-amber-300" />
              <span>Créditos ({user.credits ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                resetJobForm();
                handleSelectTab('post');
              }}
              className="px-4 py-2 rounded-lg font-bold text-[13px] bg-white text-[#1E40AF] hover:bg-blue-50 transition-colors self-start sm:self-center cursor-pointer whitespace-nowrap shadow-xs"
            >
              + Publicar Vaga ({POST_JOB_CREDIT_COST} cr)
            </button>
          </div>
        </div>
      </div>

      {/* Painel Interno de Validação Receita Federal (CNPJ) e Upload de Logo */}
      {showCompanySettings && (
        <div className="container-app pt-6">
          <form
            onSubmit={handleSaveCompanySettings}
            className="surface-card p-6 bg-white border border-[#93C5FD] rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#DBEAFE] pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Registro Interno · Receita Federal (BrasilAPI)
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Validação Cadastral de CNPJ e Identidade da Empresa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCompanySettings(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="form-label text-xs">
                  CNPJ (Consulta automática na Receita Federal) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={companyCnpjInput}
                    onChange={(e) => handleValidateCnpjReceitaFederal(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="form-control tabular-nums text-sm pr-8"
                  />
                  {checkingCnpj && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-2.5 top-3" />
                  )}
                </div>
                {cnpjVerifyError && (
                  <p className="text-xs font-medium text-red-600 mt-1">{cnpjVerifyError}</p>
                )}
              </div>

              <div>
                <label className="form-label text-xs">
                  Razão Social (Receita Federal)
                </label>
                <input
                  type="text"
                  value={companyRazaoSocial}
                  onChange={(e) => setCompanyRazaoSocial(e.target.value)}
                  className="form-control text-sm bg-slate-50"
                />
              </div>

              <div>
                <label className="form-label text-xs">
                  Nome Fantasia / Exibição Pública *
                </label>
                <input
                  type="text"
                  value={companyNameInput}
                  onChange={(e) => setCompanyNameInput(e.target.value)}
                  className="form-control text-sm"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={savingCompanyProfile || checkingCnpj}
                className="btn-base btn-sm btn-primary"
              >
                {savingCompanyProfile
                  ? 'Validando e salvando...'
                  : 'Validar na Receita Federal e Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sub-Navigation Bar */}
      <div className="bg-white border-b border-[#DBEAFE] mb-8">
        <div className="container-app flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setEditingJob(null);
              handleSelectTab('jobs');
            }}
            className={`py-4 text-[14px] sm:text-[15px] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'jobs'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-[#475569] hover:text-[#1D4ED8] font-medium'
            }`}
          >
            Minhas Vagas ({myJobs.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingJob(null);
              handleSelectTab('candidates');
            }}
            className={`py-4 text-[14px] sm:text-[15px] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'candidates'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-[#475569] hover:text-[#1D4ED8] font-medium'
            }`}
          >
            Candidatos Inscritos ({myApplications.length})
          </button>
          <button
            type="button"
            onClick={() => handleSelectTab('post')}
            className={`py-4 text-[14px] sm:text-[15px] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'post'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-[#475569] hover:text-[#1D4ED8] font-medium'
            }`}
          >
            {editingJob ? 'Editar Vaga' : 'Publicar Nova Vaga'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingJob(null);
              handleSelectTab('credits');
            }}
            className={`py-4 text-[14px] sm:text-[15px] border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'credits'
                ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                : 'border-transparent text-[#475569] hover:text-[#1D4ED8] font-medium'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>Carteira de Créditos ({user.credits ?? 0})</span>
          </button>
        </div>
      </div>

      <div className="container-app space-y-6">

        {/* TAB 1: STRUCTURED COMPANY JOBS TABLE WITH 15-CREDIT BOOST ACTION */}
        {activeTab === 'jobs' && (
          <div>
            {myJobs.length === 0 ? (
              <div className="surface-card p-8 md:p-12 text-center">
                <h2 className="text-[18px] font-semibold text-[#202938] mb-2">
                  Sua empresa ainda não possui vagas publicadas
                </h2>
                <p className="text-[14px] text-[#64748B] mb-6 max-w-md mx-auto">
                  Publique sua primeira oportunidade ({POST_JOB_CREDIT_COST} créditos) para receber currículos analisados de Presidente Prudente e região.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetJobForm();
                    handleSelectTab('post');
                  }}
                  className="btn-base btn-md btn-primary"
                >
                  Publicar primeira vaga ({POST_JOB_CREDIT_COST} créditos)
                </button>
              </div>
            ) : (
              <div className="surface-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[12px] font-semibold text-[#64748B] uppercase tracking-wider">
                        <th className="py-3.5 px-5">Cargo</th>
                        <th className="py-3.5 px-4">Status e Destaque</th>
                        <th className="py-3.5 px-4">Candidatos</th>
                        <th className="py-3.5 px-5 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-[14px]">
                      {myJobs.map((job) => {
                        const count = applications.filter((a) => a.jobId === job.id).length;
                        const daysLeft = getDaysUntilExpiration(job);
                        const isFeatured = Boolean(job.featured || job.premium);

                        return (
                          <tr
                            key={job.id}
                            className="hover:bg-[#F8FAFC] transition-colors"
                          >
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#202938]">{job.title}</span>
                                {isFeatured && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    <Sparkles className="w-3 h-3" /> Destacada
                                  </span>
                                )}
                              </div>
                              <div className="text-[12px] text-[#64748B] mt-0.5">
                                {job.location} · {job.workModel} · {formatJobSalary(job)}
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div>
                                  <span
                                    className={
                                      job.status === 'active' ? 'badge-success' : 'badge-meta'
                                    }
                                  >
                                    {job.status === 'active' ? 'Ativa' : 'Encerrada'}
                                  </span>
                                </div>
                                <span className="text-[12px] text-[#64748B] tabular-nums">
                                  {daysLeft > 0
                                    ? `Expira em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`
                                    : 'Prazo expirado'}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap tabular-nums font-medium text-[#202938]">
                              {count} {count === 1 ? 'inscrito' : 'inscritos'}
                            </td>
                            <td className="py-4 px-5 whitespace-nowrap text-right">
                              <div className="inline-flex flex-wrap items-center justify-end gap-2">
                                {!isFeatured && onBoostJob && (
                                  <button
                                    type="button"
                                    data-testid={`boost-job-btn-${job.id}`}
                                    disabled={boostingJobId === job.id}
                                    onClick={() => handleBoostExistingJob(job)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>
                                      {boostingJobId === job.id
                                        ? 'Destacando...'
                                        : `Destacar Vaga (${BOOST_JOB_CREDIT_COST} cr)`}
                                    </span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleSelectTab('candidates')}
                                  className="btn-base btn-sm btn-secondary text-[#173B70] font-semibold"
                                >
                                  Ver Candidatos
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRenewJob(job)}
                                  title="Estender validade da vaga por mais 15 dias"
                                  className="btn-base btn-sm btn-secondary text-[#173B70]"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Renovar +15d</span>
                                </button>

                                <a
                                  href={getWhatsAppJobShareUrl(job)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Compartilhar no WhatsApp"
                                  className="btn-base btn-sm btn-secondary text-[#16835D] border-[#16835D]/30 hover:bg-[#ECFDF5]"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => handleStartEditJob(job)}
                                  className="btn-base btn-sm btn-ghost"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateJob(job.id, {
                                      status: job.status === 'active' ? 'closed' : 'active',
                                    })
                                  }
                                  className="btn-base btn-sm btn-ghost"
                                >
                                  {job.status === 'active' ? 'Encerrar' : 'Reativar'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteJob(job.id);
                                  }}
                                  className="btn-base btn-sm btn-danger-ghost"
                                >
                                  Excluir
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CANDIDATES PIPELINE WITH WEIGHTED MATCH ENGINE BREAKDOWN */}
        {activeTab === 'candidates' && (
          <div>
            {myApplications.length === 0 ? (
              <div className="surface-card p-8 md:p-12 text-center">
                <h2 className="text-[18px] font-semibold text-[#202938] mb-2">
                  Nenhuma candidatura recebida até o momento
                </h2>
                <p className="text-[14px] text-[#64748B]">
                  Quando os candidatos confirmarem suas candidaturas, o Motor de Match cruzará automaticamente habilidades, experiência, formação e localização para exibir o relatório completo aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E2E8F0]">
                  <span className="text-[14px] text-[#64748B]">
                    Análise ponderada de compatibilidade calculada exclusivamente no momento da candidatura.
                  </span>
                  <label className="flex items-center gap-2 text-[13px] font-medium text-[#202938] cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={sortByScreening}
                      onChange={(e) => setSortByScreening(e.target.checked)}
                      className="w-4 h-4 accent-[#173B70] rounded border-[#CBD5E1]"
                    />
                    <span>Ordenar mais compatíveis no topo</span>
                  </label>
                </div>

                {myApplications.map((app) => {
                  const statusBadge = getApplicationStatusDisplay(app.status);
                  const hasScreening =
                    typeof app.screeningTotal === 'number' && app.screeningTotal > 0;
                  const isFullScreeningMatch =
                    hasScreening && app.screeningScore === app.screeningTotal;
                  const isExpanded = Boolean(expandedCandidateIds[app.id]);
                  const relatedJob = jobs.find((j) => j.id === app.jobId);

                  return (
                    <article key={app.id} className="surface-card p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          {app.candidatePhotoDataUrl ? (
                            <img
                              src={app.candidatePhotoDataUrl}
                              alt={app.candidateName}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 mt-0.5"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-800 font-bold text-base flex items-center justify-center shrink-0 mt-0.5">
                              {(app.candidateName || 'C').charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="badge-meta">Vaga: {app.jobTitle}</span>
                              <span className={statusBadge.className}>{statusBadge.label}</span>
                              {hasScreening && (
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-semibold tabular-nums ${
                                    isFullScreeningMatch
                                      ? 'bg-[#ECFDF5] text-[#16835D]'
                                      : 'bg-[#EFF4FF] text-[#173B70]'
                                  }`}
                                >
                                  Triagem: {app.screeningScore ?? 0}/{app.screeningTotal}
                                </span>
                              )}
                              <span
                                data-testid={`candidate-match-score-${app.id}`}
                                className="badge-brand tabular-nums font-bold"
                              >
                                Match Ponderado: {app.matchScore}%
                              </span>
                              <span className="text-[12px] text-[#64748B] tabular-nums">
                                Inscrito em {formatDate(app.appliedAt)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-[18px] font-semibold text-[#202938]">
                                {app.candidateName}
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleViewCandidateDetails(app)}
                                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#173B70] hover:underline cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                                <span>
                                  {isExpanded
                                    ? 'Ocultar análise de Match'
                                    : 'Ver análise detalhada de Match / Currículo'}
                                </span>
                              </button>
                            </div>

                            <p className="text-[14px] text-[#64748B] mt-0.5">
                              {app.candidateRole || 'Profissional'} ·{' '}
                              {app.candidateExperienceLevel || 'Experiência não informada'}
                              {app.candidateEducation ? ` · ${app.candidateEducation}` : ''}
                              {app.candidateCity ? ` · ${app.candidateCity}` : ''}
                            </p>

                            <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[13px]">
                              {app.candidateEmail && (
                                <a
                                  href={`mailto:${app.candidateEmail}`}
                                  onClick={() => handleOpenCandidateResume(app)}
                                  className="font-medium text-[#173B70] hover:underline"
                                >
                                  {app.candidateEmail}
                                </a>
                              )}
                              {app.candidatePhone && (
                                <span className="text-[#202938] tabular-nums">
                                  {app.candidatePhone}
                                </span>
                              )}
                              {app.candidateResumeDataUrl && (
                                <a
                                  href={app.candidateResumeDataUrl}
                                  onClick={() => handleOpenCandidateResume(app)}
                                  download={
                                    app.candidateResumeName ||
                                    `curriculo-${app.candidateName}.pdf`
                                  }
                                  className="font-semibold text-[#16835D] hover:underline"
                                >
                                  Baixar currículo PDF
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Controles Rápidos de Status */}
                        <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAppStatus(app.id, 'em_analise', app.recruiterNotes)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                statusBadge.normalized === 'em_analise'
                                  ? 'bg-[#173B70] text-white'
                                  : 'bg-[#EFF4FF] text-[#173B70] hover:bg-[#173B70] hover:text-white'
                              }`}
                            >
                              Em Análise
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAppStatus(app.id, 'convocado', app.recruiterNotes)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                statusBadge.normalized === 'convocado'
                                  ? 'bg-[#16835D] text-white'
                                  : 'bg-[#ECFDF5] text-[#16835D] hover:bg-[#16835D] hover:text-white'
                              }`}
                            >
                              Selecionar p/ Contato
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateAppStatus(app.id, 'encerrado', app.recruiterNotes)
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                statusBadge.normalized === 'encerrado'
                                  ? 'bg-[#64748B] text-white'
                                  : 'bg-[#F3F5F8] text-[#64748B] hover:bg-slate-200'
                              }`}
                            >
                              Finalizar
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCandidateForNotes(app);
                              setRecruiterNoteText(app.recruiterNotes || '');
                            }}
                            className="text-[13px] font-medium text-[#173B70] hover:underline cursor-pointer"
                          >
                            {app.recruiterNotes ? 'Editar observação' : 'Enviar observação'}
                          </button>
                        </div>
                      </div>

                      {/* Painel Ponderado de Match (Habilidades, Experiência, Formação, Localização + Pontos Fortes e Fracos) */}
                      {(app.matchBreakdown ||
                        (app.matchStrengths && app.matchStrengths.length > 0) ||
                        (app.matchWeaknesses && app.matchWeaknesses.length > 0)) && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                          {app.matchBreakdown && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-slate-500 block">
                                  Habilidades (40 pts)
                                </span>
                                <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                                  {app.matchBreakdown.skillsScore}/40 pts
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-slate-500 block">
                                  Experiência (25 pts)
                                </span>
                                <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                                  {app.matchBreakdown.experienceScore}/25 pts
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-slate-500 block">
                                  Palavras-chave (20 pts)
                                </span>
                                <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                                  {app.matchBreakdown.keywordsScore ?? app.matchBreakdown.educationScore}/20 pts
                                </span>
                              </div>
                              <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                                <span className="text-slate-500 block">
                                  Localização (15 pts)
                                </span>
                                <span className="font-extrabold text-slate-900 text-sm tabular-nums">
                                  {app.matchBreakdown.locationScore}/15 pts
                                </span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {app.matchStrengths && app.matchStrengths.length > 0 && (
                              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                                <span className="font-bold text-emerald-900 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Pontos Fortes identificados:
                                </span>
                                <ul className="space-y-0.5 text-emerald-800">
                                  {app.matchStrengths.map((str, i) => (
                                    <li key={i}>• {str}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {app.matchWeaknesses && app.matchWeaknesses.length > 0 && (
                              <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 space-y-1">
                                <span className="font-bold text-amber-900 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                  Pontos de Atenção / Lacunas:
                                </span>
                                <ul className="space-y-0.5 text-amber-800">
                                  {app.matchWeaknesses.map((wk, i) => (
                                    <li key={i}>• {wk}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Detalhes Expandidos do Candidato */}
                      {(isExpanded || app.candidateAbout) && (
                        <div className="space-y-3 pt-2 border-t border-[#E2E8F0]">
                          {app.candidateAbout && (
                            <p className="text-[14px] text-[#202938] leading-[1.6] bg-[#F8FAFC] p-3.5 rounded-[8px] border border-[#E2E8F0]">
                              {app.candidateAbout}
                            </p>
                          )}

                          {hasScreening &&
                            app.screeningAnswers &&
                            relatedJob?.screeningQuestions && (
                              <div className="p-3.5 bg-[#F3F5F8] rounded-xl border border-[#E2E8F0] space-y-2">
                                <p className="text-xs font-semibold text-[#202938] uppercase tracking-wider">
                                  Respostas da Triagem Rápida
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  {relatedJob.screeningQuestions.map((q) => {
                                    const ans = app.screeningAnswers?.[q.id];
                                    const matched = ans === (q.expectedAnswer ?? 'sim');
                                    return (
                                      <div
                                        key={q.id}
                                        className="p-2.5 bg-white rounded-lg border border-[#E2E8F0] text-xs"
                                      >
                                        <p className="text-[#202938] font-medium">{q.question}</p>
                                        <p
                                          className={`mt-1 font-semibold ${
                                            matched ? 'text-[#16835D]' : 'text-[#64748B]'
                                          }`}
                                        >
                                          Resposta: {ans === 'sim' ? 'Sim' : 'Não'}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                        </div>
                      )}

                      {app.candidateSkills && app.candidateSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {app.candidateSkills.map((sk, idx) => (
                            <span key={idx} className="badge-meta">
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {selectedCandidateForNotes?.id === app.id && (
                        <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row gap-2.5">
                          <input
                            type="text"
                            value={recruiterNoteText}
                            onChange={(e) => setRecruiterNoteText(e.target.value)}
                            placeholder="Mensagem ou agendamento para o candidato..."
                            className="form-control flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleSaveNotes}
                              className="btn-base btn-sm btn-primary"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedCandidateForNotes(null)}
                              className="btn-base btn-sm btn-secondary"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: 4-STEP WIZARD STEPPER FOR POSTING / EDITING JOB */}
        {activeTab === 'post' && (
          <form
            id="company-job-wizard"
            onSubmit={handleSubmitJobForm}
            className="space-y-6"
          >
            {/* Wizard Stepper Header */}
            <div className="surface-card p-5 sm:p-6 bg-white border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#059669]">
                    {editingJob ? 'Edição de Vaga em Etapas' : 'Publicação de Vaga em Etapas'} · Passo {jobWizardStep} de 4
                  </span>
                  <h2 className="text-[18px] font-bold text-[#0F172A] mt-0.5">
                    {JOB_WIZARD_STEPS[jobWizardStep - 1].title}
                  </h2>
                </div>
                <span
                  data-testid="company-wizard-progress-pct"
                  className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums"
                >
                  {jobWizardPercent}% concluído
                </span>
              </div>

              {/* Animated Progress Bar */}
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#2457D6] to-[#059669] transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${jobWizardPercent}%` }}
                />
              </div>

              {/* Stepper Pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {JOB_WIZARD_STEPS.map((st) => {
                  const isActive = jobWizardStep === st.id;
                  const isCompleted = jobWizardStep > st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      data-testid={`company-wizard-step-${st.id}`}
                      onClick={() => setJobWizardStep(st.id)}
                      className={`px-3 py-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'border-[#059669] bg-emerald-50/80 text-emerald-900 font-bold shadow-2xs'
                          : isCompleted
                          ? 'border-blue-200 bg-blue-50/50 text-blue-900 font-semibold'
                          : 'border-slate-200 bg-slate-50/70 text-slate-600 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-[#059669] text-white'
                            : isCompleted
                            ? 'bg-[#2457D6] text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : st.id}
                      </span>
                      <span className="text-xs truncate">{st.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PASSO 1: INFORMAÇÕES BÁSICAS & REMUNERAÇÃO */}
            {jobWizardStep === 1 && (
              <div className="surface-card p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2457D6]">
                    Passo 1 de 4 · Informações Básicas
                  </span>
                  <h3 className="text-[18px] font-semibold text-[#202938] mt-0.5">
                    Identificação da Vaga, Modalidade e Faixa Salarial
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label htmlFor="job-title" className="form-label">
                      Título do cargo *
                    </label>
                    <input
                      id="job-title"
                      type="text"
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="Ex: Analista Financeiro, Vendedor Interno, Motorista Entregador..."
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label htmlFor="job-cat" className="form-label">
                      Área de atuação
                    </label>
                    <select
                      id="job-cat"
                      value={jobCategory}
                      onChange={(e) => setJobCategory(e.target.value)}
                      className="form-control cursor-pointer"
                    >
                      <option>Tecnologia</option>
                      <option>Administrativo</option>
                      <option>Comercial</option>
                      <option>Saúde</option>
                      <option>Financeiro</option>
                      <option>Educação</option>
                      <option>Indústria</option>
                      <option>Agronegócio</option>
                      <option>Serviços</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-loc" className="form-label">
                      Cidade / Localização na Região
                    </label>
                    <select
                      id="job-loc"
                      value={jobLocation}
                      onChange={(e) => setJobLocation(e.target.value)}
                      className="form-control cursor-pointer"
                    >
                      {REGIONAL_CITIES.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                      {!REGIONAL_CITIES.includes(jobLocation) && jobLocation && (
                        <option value={jobLocation}>{jobLocation}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-model" className="form-label">
                      Modalidade de trabalho
                    </label>
                    <select
                      id="job-model"
                      value={jobWorkModel}
                      onChange={(e) => setJobWorkModel(e.target.value as any)}
                      className="form-control cursor-pointer"
                    >
                      <option>Presencial</option>
                      <option>Remoto</option>
                      <option>Híbrido</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-contract" className="form-label">
                      Tipo de contrato
                    </label>
                    <select
                      id="job-contract"
                      value={jobContract}
                      onChange={(e) => setJobContract(e.target.value as any)}
                      className="form-control cursor-pointer"
                    >
                      <option>CLT</option>
                      <option>PJ</option>
                      <option>Estágio</option>
                      <option>Temporário</option>
                      <option>Jovem Aprendiz</option>
                    </select>
                  </div>
                </div>

                {/* Remuneração e Benefícios */}
                <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-[#202938]">
                      Faixa Salarial e Pacote de Benefícios
                    </h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SALARY_REFERENCE_ANCHORS.map((anchor) => (
                        <button
                          key={anchor.label}
                          type="button"
                          onClick={() => {
                            setSalaryType('range');
                            setSalaryMinStr(String(anchor.min));
                            setSalaryMaxStr(String(anchor.max));
                            setJobSalaryRange(anchor.display);
                          }}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-white hover:bg-[#EFF4FF] text-[#173B70] border border-[#E2E8F0] transition-colors cursor-pointer tabular-nums"
                        >
                          {anchor.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      { id: 'range', label: 'Faixa Salarial (Mín - Máx)' },
                      { id: 'exact', label: 'Valor Fixo' },
                      { id: 'negotiable', label: 'Salário a Combinar' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSalaryType(opt.id as any)}
                        className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                          salaryType === opt.id
                            ? 'bg-[#173B70] text-white'
                            : 'bg-white text-[#202938] border border-[#E2E8F0]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {salaryType === 'range' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sal-min" className="form-label">
                          Valor Mínimo (R$)
                        </label>
                        <input
                          id="sal-min"
                          type="number"
                          min="0"
                          value={salaryMinStr}
                          onChange={(e) => setSalaryMinStr(e.target.value)}
                          placeholder="Ex: 2000"
                          className="form-control bg-white tabular-nums"
                        />
                      </div>
                      <div>
                        <label htmlFor="sal-max" className="form-label">
                          Valor Máximo (R$)
                        </label>
                        <input
                          id="sal-max"
                          type="number"
                          min="0"
                          value={salaryMaxStr}
                          onChange={(e) => setSalaryMaxStr(e.target.value)}
                          placeholder="Ex: 2500"
                          className="form-control bg-white tabular-nums"
                        />
                      </div>
                    </div>
                  )}

                  {salaryType === 'exact' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="sal-exact" className="form-label">
                          Valor Fixo Mensal (R$)
                        </label>
                        <input
                          id="sal-exact"
                          type="number"
                          min="0"
                          value={salaryMinStr}
                          onChange={(e) => setSalaryMinStr(e.target.value)}
                          placeholder="Ex: 2200"
                          className="form-control bg-white tabular-nums"
                        />
                      </div>
                      <div>
                        <label htmlFor="job-sal" className="form-label">
                          Observação salarial (opcional)
                        </label>
                        <input
                          id="job-sal"
                          type="text"
                          value={jobSalaryRange}
                          onChange={(e) => setJobSalaryRange(e.target.value)}
                          placeholder="Ex: R$ 2.200,00 + Comissão"
                          className="form-control bg-white"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="form-label">Benefícios oferecidos</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {BENEFIT_OPTIONS.map((benefit) => {
                        const isSelected = selectedBenefits.includes(benefit);
                        return (
                          <button
                            key={benefit}
                            type="button"
                            onClick={() => toggleBenefit(benefit)}
                            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#173B70] text-white'
                                : 'bg-white text-[#202938] border border-[#E2E8F0]'
                            }`}
                          >
                            {isSelected ? `✓ ${benefit}` : `+ ${benefit}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PASSO 2: REQUISITOS E TRIAGEM RÁPIDA */}
            {jobWizardStep === 2 && (
              <div className="surface-card p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2457D6]">
                    Passo 2 de 4 · Requisitos
                  </span>
                  <h3 className="text-[18px] font-semibold text-[#202938] mt-0.5">
                    Nível de Experiência, Mobilidade e Perguntas Rápidas de Triagem
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label htmlFor="job-exp" className="form-label">
                      Experiência exigida
                    </label>
                    <select
                      id="job-exp"
                      value={jobExperience}
                      onChange={(e) => setJobExperience(e.target.value as any)}
                      className="form-control cursor-pointer"
                    >
                      <option>Qualquer Nível</option>
                      <option>Primeiro Emprego</option>
                      <option>Estágio</option>
                      <option>Júnior</option>
                      <option>Pleno</option>
                      <option>Sênior</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-cnh" className="form-label">
                      Exige CNH
                    </label>
                    <select
                      id="job-cnh"
                      value={requiresCnh}
                      onChange={(e) => setRequiresCnh(e.target.value as CnhCategory)}
                      className="form-control bg-white cursor-pointer"
                    >
                      <option value="nao">Não exige</option>
                      <option value="A">CNH A</option>
                      <option value="B">CNH B</option>
                      <option value="AB">CNH AB</option>
                      <option value="C">CNH C</option>
                      <option value="D">CNH D</option>
                      <option value="E">CNH E</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="job-vehicle" className="form-label">
                      Veículo Próprio
                    </label>
                    <select
                      id="job-vehicle"
                      value={requiresVehicle}
                      onChange={(e) => setRequiresVehicle(e.target.value as VehicleRequirement)}
                      className="form-control bg-white cursor-pointer"
                    >
                      <option value="nao">Não exige</option>
                      <option value="moto">Exige Moto</option>
                      <option value="carro">Exige Carro</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 h-[42px] px-3 bg-slate-50 border border-[#E2E8F0] rounded-lg cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptsFirstJob}
                    onChange={(e) => setAcceptsFirstJob(e.target.checked)}
                    className="w-4 h-4 accent-[#173B70] rounded border-[#CBD5E1]"
                  />
                  <span className="text-[13px] font-medium text-[#202938]">
                    Aceita candidatos em busca do 1º Emprego / Sem Experiência anterior
                  </span>
                </label>

                {/* Perguntas Rápidas de Triagem */}
                <div className="p-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-[15px] font-semibold text-[#202938]">
                        Perguntas Rápidas de Sim/Não (Máx. 3 · Opcional)
                      </h4>
                      <p className="text-[12px] text-[#64748B]">
                        Se não adicionar perguntas, os candidatos poderão se candidatar com 1 único clique.
                      </p>
                    </div>
                    <span className="badge-brand tabular-nums shrink-0">
                      {screeningQuestions.length}/3 selecionadas
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_SCREENING_QUESTIONS.map((suggestion) => {
                      const alreadyAdded = screeningQuestions.some(
                        (q) => q.question === suggestion
                      );
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          disabled={alreadyAdded || screeningQuestions.length >= 3}
                          onClick={() => addScreeningQuestion(suggestion)}
                          className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                            alreadyAdded
                              ? 'bg-[#EFF4FF] text-[#173B70] border border-[#173B70]/20'
                              : 'bg-white text-[#202938] border border-[#E2E8F0] hover:border-[#173B70] disabled:opacity-50'
                          }`}
                        >
                          {alreadyAdded ? `✓ ${suggestion}` : `+ ${suggestion}`}
                        </button>
                      );
                    })}
                  </div>

                  {screeningQuestions.length < 3 && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={customQuestionText}
                        onChange={(e) => setCustomQuestionText(e.target.value)}
                        placeholder="Ou digite uma pergunta personalizada de Sim/Não..."
                        className="form-control bg-white flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => addScreeningQuestion(customQuestionText)}
                        className="btn-base btn-md btn-secondary bg-white shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar pergunta</span>
                      </button>
                    </div>
                  )}

                  {screeningQuestions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {screeningQuestions.map((q, idx) => (
                        <div
                          key={q.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white border border-[#E2E8F0] rounded-lg"
                        >
                          <span className="text-[14px] font-medium text-[#202938]">
                            {idx + 1}. {q.question}
                          </span>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => toggleExpectedAnswer(q.id)}
                              className="text-xs font-semibold px-2.5 py-1 rounded bg-[#EFF4FF] text-[#173B70] cursor-pointer"
                            >
                              Resposta esperada: {q.expectedAnswer === 'nao' ? 'Não' : 'Sim'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeScreeningQuestion(q.id)}
                              className="p-1.5 text-[#64748B] hover:text-[#C0393B] cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PASSO 3: COMPETÊNCIAS E DESCRIÇÃO */}
            {jobWizardStep === 3 && (
              <div className="surface-card p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#2457D6]">
                      Passo 3 de 4 · Competências
                    </span>
                    <h3 className="text-[18px] font-semibold text-[#202938] mt-0.5">
                      Habilidades Técnicas e Descrição da Oportunidade
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleAiOptimizeJob}
                    disabled={optimizingWithAi}
                    className="btn-base btn-sm btn-secondary text-[#173B70] self-start sm:self-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{optimizingWithAi ? 'Gerando texto...' : 'Gerar descrição com IA'}</span>
                  </button>
                </div>

                <div>
                  <label htmlFor="job-skills" className="form-label">
                    Habilidades necessárias (separadas por vírgula) *
                  </label>
                  <input
                    id="job-skills"
                    type="text"
                    required
                    value={jobSkillsStr}
                    onChange={(e) => setJobSkillsStr(e.target.value)}
                    placeholder="Ex: Excel, Atendimento, Vendas"
                    className="form-control"
                  />
                  {CATEGORY_SKILL_ANCHORS[jobCategory] && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[#64748B]">
                        Sugestões para {jobCategory} (1 clique):
                      </span>
                      {CATEGORY_SKILL_ANCHORS[jobCategory].map((skill) => (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => {
                            const current = jobSkillsStr
                              .split(',')
                              .map((s) => s.trim().toLowerCase())
                              .filter(Boolean);
                            if (!current.includes(skill.toLowerCase())) {
                              setJobSkillsStr((prev) =>
                                prev.trim() ? `${prev.trim()}, ${skill}` : skill
                              );
                            }
                          }}
                          className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#F4F6FA] hover:bg-[#EFF4FF] text-[#173B70] border border-[#E2E8F0] transition-colors cursor-pointer"
                        >
                          + {skill}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="job-desc" className="form-label">
                    Descrição detalhada da vaga *
                  </label>
                  <textarea
                    id="job-desc"
                    rows={6}
                    required
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Descreva as responsabilidades, requisitos e informações sobre a vaga..."
                    className="form-control"
                  />
                </div>
              </div>
            )}

            {/* PASSO 4: REVISÃO, IMPULSIONAMENTO E CONCLUSÃO */}
            {jobWizardStep === 4 && (
              <div className="surface-card p-6 sm:p-8 space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-[#E2E8F0] pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#059669]">
                    Passo 4 de 4 · Revisão e Conclusão
                  </span>
                  <h3 className="text-[18px] font-semibold text-[#202938] mt-0.5">
                    Conferência da Vaga, Impulsionamento e Resumo de Créditos
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold uppercase text-slate-400 block">
                      1. Cargo e Localização
                    </span>
                    <p className="font-bold text-slate-900 text-sm">{jobTitle || 'Não definido'}</p>
                    <p className="text-slate-600">{jobCategory} · {jobWorkModel}</p>
                    <p className="text-slate-500">{jobLocation} · {jobContract}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold uppercase text-slate-400 block">
                      2. Requisitos
                    </span>
                    <p className="font-semibold text-slate-800">Nível: {jobExperience}</p>
                    <p className="text-slate-600">
                      CNH: {requiresCnh === 'nao' ? 'Não exige' : requiresCnh} · Veículo: {requiresVehicle}
                    </p>
                    <p className="text-slate-500">
                      {screeningQuestions.length} pergunta(s) rápida(s)
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold uppercase text-slate-400 block">
                      3. Competências ({parsedJobSkills.length})
                    </span>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {parsedJobSkills.slice(0, 6).map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold text-[11px]"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Opção de Destacar / Impulsionar Vaga (+15 créditos) */}
                <label className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-300 bg-amber-50/60 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={jobPremium}
                    onChange={(e) => setJobPremium(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-amber-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Destacar e Impulsionar esta vaga no topo do mural
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-amber-200 text-amber-950">
                        +{BOOST_JOB_CREDIT_COST} créditos
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Sua vaga recebe selo de destaque e fica posicionada no topo das buscas em Presidente Prudente para atrair mais candidatos.
                    </p>
                  </div>
                </label>

                {/* Resumo de Créditos da Publicação */}
                {!editingJob && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-[#1E40AF] to-[#2563EB] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200 block">
                        Resumo de Créditos da Operação
                      </span>
                      <p className="text-sm font-semibold mt-0.5">
                        Publicação de nova vaga ({POST_JOB_CREDIT_COST} cr)
                        {jobPremium ? ` + Destaque no topo (${BOOST_JOB_CREDIT_COST} cr)` : ''}
                      </p>
                      <p className="text-xs text-blue-100 mt-0.5">
                        Seu saldo atual: <strong>{user.credits ?? 0} créditos</strong>
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-xs text-blue-100 block">Total a debitar</span>
                      <span className="text-xl font-extrabold text-amber-300 tabular-nums">
                        {totalPublishCreditsCost} créditos
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="surface-card p-4 sm:p-5 bg-white border border-[#DBEAFE] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  resetJobForm();
                  handleSelectTab('jobs');
                }}
                className="btn-base btn-md btn-ghost"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2.5">
                {jobWizardStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevJobStep}
                    className="btn-base btn-md btn-secondary inline-flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Etapa Anterior</span>
                  </button>
                )}

                {jobWizardStep < 4 ? (
                  <button
                    type="button"
                    data-testid="company-wizard-next-btn"
                    onClick={handleNextJobStep}
                    className="btn-base btn-md btn-primary inline-flex items-center gap-1.5"
                  >
                    <span>Próxima Etapa</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submittingJob}
                    data-testid="company-publish-job-btn"
                    className="btn-base btn-md btn-primary font-bold inline-flex items-center gap-2"
                  >
                    <Coins className="w-4 h-4" />
                    <span>
                      {submittingJob
                        ? 'Processando...'
                        : editingJob
                        ? 'Salvar alterações'
                        : `Confirmar e Publicar Vaga (${totalPublishCreditsCost} cr)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* TAB 4: CARTEIRA DE CRÉDITOS & HISTÓRICO MERCADO PAGO */}
        {activeTab === 'credits' && (
          <div className="space-y-8">
            <div className="surface-card p-6 md:p-8 bg-white border border-[#CBD5E1] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] text-[#009EE3] flex items-center justify-center shrink-0">
                  <Coins className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#009EE3]">
                    Carteira Corporativa · Mercado Pago Integrado
                  </span>
                  <h2 className="text-[24px] md:text-[28px] font-extrabold text-[#0F172A] tabular-nums mt-0.5">
                    {user.credits ?? 0} créditos disponíveis
                  </h2>
                  <p className="text-[13px] text-[#64748B] mt-1 max-w-xl">
                    Publicar nova vaga: {POST_JOB_CREDIT_COST} créditos · Destacar vaga: {BOOST_JOB_CREDIT_COST} créditos. Seus créditos são cumulativos e não têm data de validade.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={loadCreditsData}
                  disabled={loadingCreditsHistory}
                  className="btn-base btn-md btn-secondary font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingCreditsHistory ? 'animate-spin' : ''}`} />
                  <span>Atualizar Status e Saldo</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-[18px] font-bold text-[#0F172A]">
                  Escolha um pacote de créditos para recarregar
                </h3>
                <p className="text-[13px] text-[#64748B]">
                  Valores e quantidades validados diretamente no servidor via Mercado Pago (Pix ou Cartão em até 12x).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {CREDIT_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`surface-card p-6 flex flex-col justify-between relative rounded-2xl ${
                      pkg.isFeatured
                        ? 'order-first lg:order-none border-2 border-[#009EE3] shadow-lg'
                        : 'border border-[#CBD5E1]'
                    }`}
                  >
                    {pkg.badge && (
                      <div
                        className={`absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider py-0.5 px-3 rounded-full whitespace-nowrap ${
                          pkg.badgeVariant === 'featured'
                            ? 'bg-[#009EE3] text-white'
                            : 'bg-slate-800 text-white'
                        }`}
                      >
                        {pkg.badge}
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-[18px] font-bold text-[#0F172A]">{pkg.title}</h4>
                          <p className="text-[12px] text-[#64748B] mt-0.5">{pkg.description}</p>
                        </div>
                        <div className="px-3 py-1.5 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] text-center shrink-0">
                          <span className="text-[18px] font-extrabold text-[#009EE3] block leading-none tabular-nums">
                            +{pkg.totalCredits}
                          </span>
                          <span className="text-[10px] font-bold uppercase text-[#1E40AF]">
                            Créditos
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 pb-3 border-b border-[#E2E8F0]">
                        <div className="text-[12px] text-[#94A3B8] line-through tabular-nums">
                          De {formatPriceBRL(pkg.originalPrice)}
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-[28px] font-extrabold text-[#0F172A] tabular-nums">
                            {formatPriceBRL(pkg.price)}
                          </span>
                          <span className="text-[12px] text-[#64748B]">/ único</span>
                        </div>
                        <div className="text-[12px] font-bold text-[#16835D] mt-0.5 tabular-nums">
                          Apenas {formatPriceBRL(pkg.costPerCredit)} por crédito
                        </div>
                      </div>

                      <ul className="space-y-2">
                        {pkg.features.map((feat, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#334155]">
                            <Check className="w-4 h-4 text-[#16835D] shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-5 mt-5 border-t border-[#E2E8F0]">
                      <button
                        type="button"
                        onClick={() => onSelectCreditPackage?.(pkg)}
                        className={`w-full min-h-[48px] btn-base btn-md font-bold cursor-pointer ${
                          pkg.isFeatured
                            ? 'bg-[#009EE3] hover:bg-[#0086C3] text-white shadow-sm'
                            : 'btn-primary'
                        }`}
                      >
                        {pkg.ctaLabel}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Histórico de Pedidos */}
            <div className="surface-card overflow-hidden border border-[#CBD5E1] rounded-2xl">
              <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-[17px] font-bold text-[#0F172A]">
                    Status dos Pedidos de Créditos (Mercado Pago)
                  </h3>
                  <p className="text-[13px] text-[#64748B]">
                    Acompanhe seus pedidos vinculados à sua conta e consulte o status de aprovação.
                  </p>
                </div>
                <span className="text-[12px] font-semibold text-[#16835D] bg-[#ECFDF5] px-3 py-1 rounded-full border border-[#BBF7D0] self-start sm:self-center">
                  Proteção Idempotente Ativa (Zero Duplicidade)
                </span>
              </div>

              {creditOrders.length === 0 ? (
                <div className="p-8 text-center text-[14px] text-[#64748B]">
                  Nenhum pedido de compra de créditos registrado ainda. Escolha um pacote acima para iniciar.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                        <th className="py-3 px-5">ID do Pedido</th>
                        <th className="py-3 px-4">Pacote</th>
                        <th className="py-3 px-4">Créditos</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Status Mercado Pago</th>
                        <th className="py-3 px-5 text-right">Data / Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {creditOrders.map((ord) => (
                        <tr key={ord.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3.5 px-5 font-mono text-xs text-[#334155]">
                            {ord.id}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                            {ord.packageName}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#009EE3] tabular-nums">
                            +{ord.credits} créditos
                          </td>
                          <td className="py-3.5 px-4 tabular-nums text-[#0F172A]">
                            {formatPriceBRL(ord.amount)}
                          </td>
                          <td className="py-3.5 px-4">
                            {ord.status === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#16835D] border border-[#BBF7D0]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Aprovado e Creditado
                              </span>
                            ) : ord.status === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#B45309]">
                                <Clock className="w-3.5 h-3.5" />
                                Aguardando Confirmação
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#DC2626]">
                                {ord.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-right tabular-nums text-[#64748B]">
                            {ord.status === 'pending' ? (
                              <button
                                type="button"
                                onClick={() => handleVerifyOrder(ord.id)}
                                disabled={checkingOrderId === ord.id}
                                className="btn-base btn-sm btn-secondary text-xs font-semibold cursor-pointer"
                              >
                                {checkingOrderId === ord.id
                                  ? 'Consultando...'
                                  : 'Verificar Status'}
                              </button>
                            ) : (
                              <span>{formatDate(ord.processedAt || ord.createdAt)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {creditTransactions.length > 0 && (
              <div className="surface-card overflow-hidden border border-[#CBD5E1] rounded-2xl">
                <div className="p-5 border-b border-[#E2E8F0]">
                  <h3 className="text-[17px] font-bold text-[#0F172A]">
                    Extrato Auditável da Carteira de Créditos
                  </h3>
                  <p className="text-[13px] text-[#64748B]">
                    Registro imutável de todas as movimentações de créditos da sua conta.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-bold">
                        <th className="py-3 px-5">Descrição</th>
                        <th className="py-3 px-4">Movimentação</th>
                        <th className="py-3 px-4">Saldo Após</th>
                        <th className="py-3 px-5 text-right">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {creditTransactions.map((tx) => {
                        const isDebit = tx.type === 'debit' || tx.type === 'usage' || tx.amount < 0;
                        const absAmount = Math.abs(tx.amount);
                        return (
                        <tr key={tx.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3.5 px-5 text-[#0F172A] font-medium">
                            {tx.description}
                          </td>
                          <td
                            className={`py-3.5 px-4 font-bold tabular-nums ${
                              isDebit ? 'text-[#475569]' : 'text-[#16835D]'
                            }`}
                          >
                            {isDebit ? `-${absAmount}` : `+${absAmount}`} créditos
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#0F172A] tabular-nums">
                            {tx.balanceAfter} créditos
                          </td>
                          <td className="py-3.5 px-5 text-right text-[#64748B] tabular-nums">
                            {formatDate(tx.createdAt)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
