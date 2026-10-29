import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  UserProfile,
  Job,
  Application,
  ResumeExperience,
  ResumeEducation,
} from '../types';
import {
  formatDate,
  formatPhone,
  formatCPF,
  isValidCPF,
  isCompany,
  getApplicationStatusDisplay,
  REGIONAL_CITIES,
  CATEGORY_SKILL_ANCHORS,
  calculateCandidateProgressCoach,
  getMatchColor,
} from '../utils/matchAlgorithm';
import {
  formatCEP,
  normalizeCEP,
  isValidCEP,
  validateCandidateProfileUpdate,
  validateSafeUploadDataUrl,
  sanitizeText,
} from '../utils/validation';
import { lookupAddressByCep } from '../services/cepService';
import {
  formatCandidateHeaderSubtitle,
  formatCandidateTabLabel,
  SKILLS_MOBILE_PLACEHOLDER,
  SAVED_JOBS_EMPTY_DESCRIPTION,
} from '../utils/candidateDashboard';
import { requestCvOptimization } from '../services/aiService';
import { RESUME_GENERATION_COST } from '../utils/pdfResumeGenerator';
import {
  CANDIDATE_RESUME_CREDIT_PACKAGE,
  CreditPackage,
  APPLY_JOB_CREDIT_COST,
} from '../utils/creditsData';
import { ResumeGeneratorModal } from './ResumeGeneratorModal';
import {
  Bookmark,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Briefcase,
  Coins,
  FileText,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  Camera,
  Check,
  Bell,
  Printer,
  Eye,
} from 'lucide-react';
import { CnhCategory, VehicleRequirement } from '../types';

export type CandidateDashboardTab = 'applications' | 'resume' | 'saved' | 'alerts';

interface CandidateDashboardProps {
  user: UserProfile;
  jobs: Job[];
  applications: Application[];
  activeSubTab?: CandidateDashboardTab;
  onSubTabChange?: (tab: CandidateDashboardTab) => void;
  onUpdateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  onWithdrawApplication: (appId: string) => Promise<void>;
  onToggleSaveJob?: (jobId: string) => void;
  onSelectCreditPackage?: (pkg: CreditPackage) => void;
  onCreditsUpdated?: (newBalance: number) => void;
  onRequireCredits?: (requiredCredits: number, title: string, description: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onNavigate: (view: string, subTab?: string) => void;
  onViewJobDetails: (job: Job) => void;
}

const WIZARD_STEPS = [
  { id: 1, title: 'Dados Pessoais', shortLabel: '1. Pessoais' },
  { id: 2, title: 'Experiências e Formação', shortLabel: '2. Experiências' },
  { id: 3, title: 'Habilidades e CNH', shortLabel: '3. Habilidades' },
  { id: 4, title: 'Preview e Currículo ATS', shortLabel: '4. Currículo ATS' },
] as const;

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  user,
  jobs,
  applications,
  activeSubTab = 'applications',
  onSubTabChange,
  onUpdateProfile,
  onWithdrawApplication,
  onToggleSaveJob,
  onSelectCreditPackage,
  onCreditsUpdated,
  onRequireCredits,
  showToast,
  onNavigate,
  onViewJobDetails,
}) => {
  const [activeTab, setActiveTab] = useState<CandidateDashboardTab>(activeSubTab);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);

  useEffect(() => {
    if (isCompany(user)) {
      onNavigate('company');
    }
  }, [user, onNavigate]);

  const [photoDataUrl, setPhotoDataUrl] = useState<string>(user.photoDataUrl || '');

  const [formData, setFormData] = useState({
    name: user.name || '',
    cpf: user.cpf || (user.documentType === 'CPF' ? user.documentNumber || '' : ''),
    cep: user.cep || '',
    street: user.street || '',
    addressNumber: user.addressNumber || '',
    addressComplement: user.addressComplement || '',
    neighborhood: user.neighborhood || '',
    city: user.city || 'Presidente Prudente, SP',
    state: user.state || 'SP',
    role: user.role || '',
    experienceLevel: user.experienceLevel || '',
    education: user.education || '',
    salaryExpectation: user.salaryExpectation || '',
    phone: user.phone || '',
    linkedinUrl: user.linkedinUrl || '',
    videoPitchUrl: user.videoPitchUrl || '',
    about: user.about || '',
    skillsStr: user.skills ? user.skills.join(', ') : '',
    certificationsStr: user.certifications ? user.certifications.join(', ') : '',
    languagesStr: user.languages ? user.languages.join(', ') : 'Português (Nativo)',
    cnhCategory: (user.cnhCategory || 'nao') as CnhCategory,
    ownVehicle: (user.ownVehicle || 'nao') as VehicleRequirement,
  });

  const [jobAlertsEnabled, setJobAlertsEnabled] = useState<boolean>(
    user.jobAlertsEnabled ?? true
  );
  const [jobAlertAreas, setJobAlertAreas] = useState<string[]>(
    user.jobAlertAreas && user.jobAlertAreas.length > 0
      ? user.jobAlertAreas
      : ['Administrativo', 'Comércio', 'Tecnologia', 'Primeiro Emprego']
  );
  const [jobAlertWorkModels, setJobAlertWorkModels] = useState<string[]>(
    user.jobAlertWorkModels && user.jobAlertWorkModels.length > 0
      ? user.jobAlertWorkModels
      : ['Presencial', 'Híbrido']
  );
  const [savingAlerts, setSavingAlerts] = useState(false);

  const [experiences, setExperiences] = useState<ResumeExperience[]>(user.experiences || []);
  const [educationHistory, setEducationHistory] = useState<ResumeEducation[]>(
    user.educationHistory || []
  );

  const [resumeFile, setResumeFile] = useState<{
    name: string;
    dataUrl: string;
  } | null>(
    user.resumeFileName && user.resumeDataUrl
      ? { name: user.resumeFileName, dataUrl: user.resumeDataUrl }
      : null
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cepLoading, setCepLoading] = useState(false);
  const [cepFeedback, setCepFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const lastFetchedCepRef = useRef<string>('');

  const [saving, setSaving] = useState(false);
  const [optimizingAi, setOptimizingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    enhancedSummary?: string;
    suggestedSkills?: string[];
    tips?: string[];
  } | null>(null);

  const [isResumeGeneratorOpen, setIsResumeGeneratorOpen] = useState(false);

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Selecione uma imagem válida (JPG, PNG ou WebP).', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem de perfil deve ter no máximo 2 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const check = validateSafeUploadDataUrl(
        result,
        ['image/jpeg', 'image/png', 'image/webp'],
        2 * 1024 * 1024
      );
      if (!check.valid) {
        showToast(check.error || 'Arquivo de imagem inválido ou corrompido.', 'error');
        return;
      }
      setPhotoDataUrl(result);
      showToast('Foto de perfil atualizada! Salve seu currículo para confirmar.');
    };
    reader.readAsDataURL(file);
  };

  const handleCepLookup = async (rawCep: string) => {
    const clean = normalizeCEP(rawCep);
    if (clean.length !== 8) return;
    if (lastFetchedCepRef.current === clean && formData.street) return;

    setCepLoading(true);
    setCepFeedback(null);
    clearFieldError('cep');

    try {
      const result = await lookupAddressByCep(clean);
      lastFetchedCepRef.current = clean;

      if (!result.success || !result.data) {
        setCepFeedback({
          type: 'error',
          message:
            result.error ||
            'Não foi possível localizar o CEP. Você pode preencher o endereço manualmente.',
        });
        return;
      }

      const addr = result.data;
      const formattedCity = `${addr.city}, ${addr.state}`;

      setFormData((prev) => ({
        ...prev,
        cep: addr.cep,
        street: addr.street || prev.street,
        neighborhood: addr.neighborhood || prev.neighborhood,
        city: formattedCity,
        state: addr.state || prev.state,
      }));

      setCepFeedback({
        type: 'success',
        message: `Endereço preenchido automaticamente (${addr.city}/${addr.state}).`,
      });
    } catch {
      setCepFeedback({
        type: 'error',
        message: 'Serviço de CEP indisponível no momento. Preencha os campos manualmente.',
      });
    } finally {
      setCepLoading(false);
    }
  };

  if (isCompany(user)) {
    return (
      <div className="min-h-screen bg-[#F3F5F8] py-12">
        <div className="container-app max-w-lg">
          <div className="surface-card p-6 space-y-4">
            <div className="text-[#C0393B] bg-[#FEF2F2] border border-[#C0393B]/20 rounded-lg p-3 text-sm font-medium">
              Conta Empresarial (CNPJ) — Redirecionando para o Painel da Empresa.
            </div>
            <button
              type="button"
              onClick={() => onNavigate('company')}
              className="btn-base btn-md btn-primary w-full"
            >
              Ir para o Painel da Empresa
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSelectTab = (tab: CandidateDashboardTab) => {
    setActiveTab(tab);
    onSubTabChange?.(tab);
  };

  const handleToggleAlertArea = (area: string) => {
    setJobAlertAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleToggleAlertWorkModel = (model: string) => {
    setJobAlertWorkModels((prev) =>
      prev.includes(model) ? prev.filter((m) => m !== model) : [...prev, model]
    );
  };

  const handleSaveJobAlerts = async () => {
    setSavingAlerts(true);
    try {
      await onUpdateProfile({
        jobAlertsEnabled,
        jobAlertAreas,
        jobAlertWorkModels,
      });
      showToast(
        jobAlertsEnabled
          ? 'Alertas de vagas em Presidente Prudente atualizados e ativados!'
          : 'Notificações de vagas pausadas.'
      );
    } catch {
      showToast('Não foi possível salvar os alertas de vagas.', 'error');
    } finally {
      setSavingAlerts(false);
    }
  };

  const myApplications = useMemo(() => {
    return applications.filter((a) => a.candidateId === user.uid);
  }, [applications, user.uid]);

  const savedJobsList = useMemo(() => {
    const savedIds = user.savedJobIds ?? [];
    return jobs.filter((j) => savedIds.includes(j.id));
  }, [jobs, user.savedJobIds]);

  const parsedSkillsList = useMemo(() => {
    return formData.skillsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [formData.skillsStr]);

  const parsedCertificationsList = useMemo(() => {
    return formData.certificationsStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [formData.certificationsStr]);

  const parsedLanguagesList = useMemo(() => {
    return formData.languagesStr
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, [formData.languagesStr]);

  const liveProgressCoach = useMemo(() => {
    return calculateCandidateProgressCoach({
      ...user,
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      role: formData.role,
      experienceLevel: formData.experienceLevel,
      education: formData.education,
      skills: parsedSkillsList,
      about: formData.about,
      resumeDataUrl: resumeFile?.dataUrl || '',
    });
  }, [user, formData, parsedSkillsList, resumeFile]);

  const quickSkillAnchors = useMemo(() => {
    const roleLower = formData.role.toLowerCase();
    if (roleLower.includes('vend') || roleLower.includes('comerc')) {
      return CATEGORY_SKILL_ANCHORS['Comercial'];
    }
    if (roleLower.includes('dev') || roleLower.includes('ti') || roleLower.includes('sistem')) {
      return CATEGORY_SKILL_ANCHORS['Tecnologia'];
    }
    if (roleLower.includes('finan') || roleLower.includes('contab')) {
      return CATEGORY_SKILL_ANCHORS['Financeiro'];
    }
    return [
      'Atendimento ao Cliente',
      'Pacote Office',
      'Comunicação Interpessoal',
      'Organização',
      'Vendas Consultivas',
      'Rotinas Administrativas',
    ];
  }, [formData.role]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      showToast('Selecione exclusivamente um arquivo no formato PDF.', 'error');
      return;
    }

    if (file.size > 800 * 1024) {
      showToast('O arquivo PDF deve ter até 800 KB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const check = validateSafeUploadDataUrl(result, ['application/pdf'], 800 * 1024);
      if (!check.valid) {
        showToast(check.error || 'O arquivo enviado não é um documento PDF autêntico.', 'error');
        return;
      }
      const safeFileName = sanitizeText(file.name, 120).replace(/[^a-zA-Z0-9._\-\s()]/g, '_');
      setResumeFile({
        name: safeFileName || 'curriculo.pdf',
        dataUrl: result,
      });
      showToast(`Currículo "${safeFileName}" carregado. Clique em "Salvar currículo" para confirmar.`);
    };
    reader.onerror = () => {
      showToast('Erro ao ler arquivo PDF.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePdf = () => {
    setResumeFile(null);
    showToast('Currículo em PDF removido. Salve o formulário para confirmar.');
  };

  const handleAddExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        id: `exp_${Date.now()}_${prev.length}`,
        company: '',
        role: '',
        period: '',
        current: false,
        description: '',
      },
    ]);
  };

  const handleUpdateExperience = (index: number, field: keyof ResumeExperience, value: any) => {
    setExperiences((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddEducationItem = () => {
    setEducationHistory((prev) => [
      ...prev,
      {
        id: `edu_${Date.now()}_${prev.length}`,
        institution: '',
        degree: formData.education || 'Ensino Médio / Superior',
        completionYear: '',
        status: 'Concluído',
      },
    ]);
  };

  const handleUpdateEducationItem = (
    index: number,
    field: keyof ResumeEducation,
    value: string
  ) => {
    setEducationHistory((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveEducationItem = (index: number) => {
    setEducationHistory((prev) => prev.filter((_, idx) => idx !== index));
  };

  const validateCurrentWizardStep = (step: 1 | 2 | 3 | 4): boolean => {
    if (step === 1) {
      const validation = validateCandidateProfileUpdate({
        name: formData.name,
        cpf: formData.cpf,
        phone: formData.phone,
        cep: formData.cep,
        city: formData.city,
        role: formData.role,
      });
      if (!validation.valid) {
        setFieldErrors(validation.errors);
        const firstMsg = Object.values(validation.errors)[0];
        showToast(firstMsg || 'Preencha os dados básicos obrigatórios antes de avançar.', 'error');
        return false;
      }
      setFieldErrors({});
      return true;
    }
    if (step === 2) {
      if (!formData.education) {
        showToast('Selecione sua escolaridade principal antes de avançar.', 'error');
        return false;
      }
      return true;
    }
    if (step === 3) {
      if (parsedSkillsList.length === 0) {
        showToast('Adicione pelo menos 1 competência ou habilidade antes de avançar.', 'error');
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNextStep = () => {
    if (!validateCurrentWizardStep(wizardStep)) return;
    if (wizardStep < 4) {
      setWizardStep((prev) => (prev + 1) as 1 | 2 | 3 | 4);
      const el = document.getElementById('candidate-wizard-container');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrevStep = () => {
    if (wizardStep > 1) {
      setWizardStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
      const el = document.getElementById('candidate-wizard-container');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateCandidateProfileUpdate({
      name: formData.name,
      cpf: formData.cpf,
      phone: formData.phone,
      cep: formData.cep,
      city: formData.city,
      role: formData.role,
    });

    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setWizardStep(1);
      const firstMsg = Object.values(validation.errors)[0];
      showToast(firstMsg || 'Verifique os campos obrigatórios destacados.', 'error');
      return;
    }

    setSaving(true);
    setFieldErrors({});

    try {
      const formattedCpf = formData.cpf ? formatCPF(formData.cpf) : user.cpf;

      await onUpdateProfile({
        name: formData.name.trim(),
        photoDataUrl: photoDataUrl || '',
        documentType: 'CPF',
        documentNumber: formattedCpf,
        cpf: formattedCpf,
        cep: formData.cep ? formatCEP(formData.cep) : '',
        street: formData.street.trim(),
        addressNumber: formData.addressNumber.trim(),
        addressComplement: formData.addressComplement.trim(),
        neighborhood: formData.neighborhood.trim(),
        city: formData.city,
        state: formData.state || 'SP',
        role: formData.role.trim(),
        experienceLevel: formData.experienceLevel,
        education: formData.education,
        salaryExpectation: formData.salaryExpectation.trim(),
        phone: formData.phone ? formatPhone(formData.phone) : '',
        linkedinUrl: formData.linkedinUrl.trim(),
        videoPitchUrl: formData.videoPitchUrl.trim(),
        about: formData.about.trim(),
        skills: parsedSkillsList,
        certifications: parsedCertificationsList,
        languages: parsedLanguagesList,
        cnhCategory: formData.cnhCategory,
        ownVehicle: formData.ownVehicle,
        experiences,
        educationHistory,
        profileCompleteness: liveProgressCoach.percentage,
        resumeFileName: resumeFile?.name || '',
        resumeDataUrl: resumeFile?.dataUrl || '',
      });

      showToast('Currículo salvo com sucesso.');
    } catch (err: any) {
      const msg = err?.message || 'Erro ao atualizar currículo.';
      if (msg.toLowerCase().includes('cpf')) {
        setFieldErrors((prev) => ({ ...prev, cpf: msg }));
        setWizardStep(1);
      }
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAiOptimizeCv = async () => {
    if (!formData.role && !formData.about && parsedSkillsList.length === 0) {
      showToast('Preencha o cargo desejado ou habilidades antes de usar a sugestão.', 'error');
      return;
    }

    try {
      setOptimizingAi(true);
      const res = await requestCvOptimization({
        role: formData.role,
        skills: parsedSkillsList,
        about: formData.about,
        experienceLevel: formData.experienceLevel,
      });

      setAiSuggestions(res);
      showToast('Sugestão de texto gerada.');
    } catch (err: any) {
      showToast(err.message || 'Falha ao gerar sugestão.', 'error');
    } finally {
      setOptimizingAi(false);
    }
  };

  const applyAiSummary = () => {
    if (aiSuggestions?.enhancedSummary) {
      setFormData((prev) => ({ ...prev, about: aiSuggestions.enhancedSummary || '' }));
      showToast('Resumo inserido no currículo.');
    }
  };

  const addQuickSkill = (skill: string) => {
    const existing = formData.skillsStr
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!existing.includes(skill.trim().toLowerCase())) {
      const updated = formData.skillsStr.trim() ? `${formData.skillsStr.trim()}, ${skill}` : skill;
      setFormData((prev) => ({ ...prev, skillsStr: updated }));
      showToast(`Competência "${skill}" adicionada.`);
    }
  };

  const handleOpenResumeGeneratorClick = () => {
    const currentCredits = Number(user.credits || 0);
    if (currentCredits < RESUME_GENERATION_COST && onRequireCredits) {
      onRequireCredits(
        RESUME_GENERATION_COST,
        'Gerar Currículo em PDF Padrão ATS',
        `Para gerar e baixar seu Currículo Profissional em PDF com escolha entre os 3 modelos otimizados para leitura ATS, é necessário possuir pelo menos ${RESUME_GENERATION_COST} créditos.`
      );
      return;
    }
    setIsResumeGeneratorOpen(true);
  };

  const headerSubtitle = formatCandidateHeaderSubtitle(user.email, formData.city || user.city);

  const tabApplicationsLabel = formatCandidateTabLabel('applications', {
    applicationsCount: myApplications.length,
  });
  const tabResumeLabel = formatCandidateTabLabel('resume', {
    profilePercentage: liveProgressCoach.percentage,
  });
  const tabSavedLabel = formatCandidateTabLabel('saved', {
    savedCount: savedJobsList.length,
  });

  const currentCredits = Number(user.credits || 0);
  const wizardProgressPercent = wizardStep * 25;

  const getColoredStatusBadge = (status?: string) => {
    const raw = (status ?? 'enviado').trim().toLowerCase();
    if (raw === 'visualizado') {
      return {
        label: 'Visualizado pela Empresa',
        className: 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
      };
    }
    if (raw === 'convocado' || raw === 'entrevista' || raw === 'aprovado' || raw === 'em_analise' || raw === 'em análise') {
      return {
        label: 'Em Entrevista',
        className: 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]',
      };
    }
    if (raw === 'encerrado' || raw === 'rejeitado') {
      return {
        label: 'Encerrado',
        className: 'bg-slate-100 text-slate-600 border border-slate-200',
      };
    }
    const base = getApplicationStatusDisplay(status);
    return {
      label: base.normalized === 'enviado' ? 'Currículo Enviado' : base.label,
      className: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
    };
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] pb-16">
      {/* Centered Blue Candidate Header with Greeting, Credit Balance & Profile Progress Bar */}
      <div className="bg-gradient-to-b from-[#1E40AF] to-[#2563EB] text-white border-b border-[#1D4ED8] py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                {photoDataUrl ? (
                  <img
                    src={photoDataUrl}
                    alt={user.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-white/30 bg-[#1E3A8A]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/25 text-white font-bold text-lg flex items-center justify-center">
                    {(user.name || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
                <label
                  htmlFor="cand-header-photo-upload"
                  title="Alterar foto de perfil"
                  className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-white text-[#1E40AF] hover:bg-blue-50 flex items-center justify-center border border-[#93C5FD] cursor-pointer shadow-xs"
                >
                  <Camera className="w-3 h-3" />
                  <input
                    id="cand-header-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="min-w-0">
                <h1 className="text-[20px] sm:text-[24px] font-bold text-white truncate">
                  Olá, {user.name}
                </h1>
                <p className="text-[13px] text-blue-100 mt-0.5 truncate">
                  {headerSubtitle}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 px-3.5 py-2 rounded-xl">
                <Coins className="w-4 h-4 text-amber-300 shrink-0" />
                <span
                  data-testid="candidate-header-credits"
                  className="text-[13px] font-semibold text-white tabular-nums whitespace-nowrap"
                >
                  {currentCredits} cr disponíveis
                </span>
                {onSelectCreditPackage ? (
                  <button
                    type="button"
                    onClick={() => onSelectCreditPackage(CANDIDATE_RESUME_CREDIT_PACKAGE)}
                    data-testid="candidate-add-credits-btn"
                    className="ml-1 px-2.5 py-1 rounded-lg bg-white text-[#1E40AF] hover:bg-blue-50 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Recarregar créditos
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigate('plans')}
                    className="ml-1 px-2.5 py-1 rounded-lg bg-white text-[#1E40AF] hover:bg-blue-50 text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Recarregar créditos
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Progresso do Perfil no Cabeçalho */}
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[12px] sm:text-[13px] font-semibold text-white">
                <span>
                  Perfil {liveProgressCoach.percentage}% completo — complete para aumentar suas chances
                </span>
                <span className="tabular-nums text-amber-200 font-bold">
                  {liveProgressCoach.percentage}%
                </span>
              </div>
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-300 transition-all duration-300 rounded-full"
                  style={{ width: `${liveProgressCoach.percentage}%` }}
                />
              </div>
            </div>
            {activeTab !== 'resume' && (
              <button
                type="button"
                onClick={() => handleSelectTab('resume')}
                className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[12px] font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                Completar perfil →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Centered Sub-Navigation Bar */}
      <div className="bg-white border-b border-[#DBEAFE] mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div
            role="tablist"
            aria-label="Navegação do painel do candidato"
            className="flex items-center justify-between sm:justify-center gap-2 sm:gap-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'applications'}
              onClick={() => handleSelectTab('applications')}
              className={`py-3.5 px-2 text-center text-[13px] sm:text-[14px] border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'applications'
                  ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A] font-medium'
              }`}
            >
              Minhas {tabApplicationsLabel}
            </button>
            <button
              type="button"
              role="tab"
              title={tabResumeLabel}
              aria-selected={activeTab === 'resume'}
              onClick={() => handleSelectTab('resume')}
              className={`py-3.5 px-2 text-center text-[13px] sm:text-[14px] border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeTab === 'resume'
                  ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A] font-medium'
              }`}
            >
              Meu Perfil e Currículo ATS ({liveProgressCoach.percentage}%)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'alerts'}
              onClick={() => handleSelectTab('alerts')}
              className={`py-3.5 px-2 text-center text-[13px] sm:text-[14px] border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                activeTab === 'alerts'
                  ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A] font-medium'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Alertas de Vagas</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'saved'}
              onClick={() => handleSelectTab('saved')}
              className={`py-3.5 px-2 text-center text-[13px] sm:text-[14px] border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'saved'
                  ? 'border-[#1D4ED8] text-[#1D4ED8] font-bold'
                  : 'border-transparent text-[#64748B] hover:text-[#0F172A] font-medium'
              }`}
            >
              {tabSavedLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Main Centered Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* TAB 1: MINHAS CANDIDATURAS */}
        {activeTab === 'applications' && (
          <section className="space-y-4">
            {myApplications.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 sm:p-10 text-center max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-full bg-[#EFF4FF] text-[#2457D6] flex items-center justify-center mx-auto mb-3">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h2 className="text-[18px] font-semibold text-[#0F172A] mb-1.5">
                  Nenhuma candidatura enviada
                </h2>
                <p className="text-[14px] text-[#64748B] mb-6 max-w-md mx-auto leading-relaxed">
                  Explore as vagas abertas em Presidente Prudente e envie seu currículo diretamente para as empresas ({APPLY_JOB_CREDIT_COST} créditos por candidatura).
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="btn-base btn-md btn-primary px-6 py-2.5 text-[14px] font-semibold"
                >
                  Explorar vagas abertas
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myApplications.map((app) => {
                  const coloredBadge = getColoredStatusBadge(app.status);
                  const hasScreening =
                    typeof app.screeningTotal === 'number' && app.screeningTotal > 0;
                  const matchedJob =
                    jobs.find((j) => j.id === app.jobId) ||
                    ({
                      id: app.jobId,
                      companyId: app.companyId,
                      companyName: app.companyName,
                      title: app.jobTitle,
                      location: app.jobLocation || 'Presidente Prudente, SP',
                      category: 'Geral',
                      workModel: 'Presencial',
                      contract: 'CLT',
                      experience: 'Qualquer Nível',
                      description: 'Vaga aplicada através do portal PrudenEmpregos.',
                      skills: app.matchingSkills || [],
                      status: 'active',
                      createdAt: app.appliedAt,
                    } as Job);

                  return (
                    <article
                      key={app.id}
                      className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-[16px] font-semibold text-[#0F172A]">
                            {app.jobTitle}
                          </h3>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${coloredBadge.className}`}
                          >
                            {coloredBadge.label}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border tabular-nums ${getMatchColor(
                              app.matchScore
                            )}`}
                          >
                            Match: {app.matchScore}%
                          </span>
                          {hasScreening && (
                            <span className="text-[12px] font-medium text-[#16835D] tabular-nums">
                              · Triagem: {app.screeningScore ?? 0}/{app.screeningTotal}
                            </span>
                          )}
                        </div>

                        <p className="text-[13px] text-[#64748B] mt-1">
                          {app.companyName} · {app.jobLocation} · Enviada em{' '}
                          <span className="tabular-nums">{formatDate(app.appliedAt)}</span>
                          {app.viewedAt ? (
                            <span className="tabular-nums text-[#16835D] font-medium">
                              {' '}
                              · Visualizado em {formatDate(app.viewedAt)}
                            </span>
                          ) : null}
                        </p>

                        {app.recruiterNotes && (
                          <div className="mt-3 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#1E293B]">
                            <strong className="text-[#0F172A] font-semibold">
                              Recrutador:
                            </strong>{' '}
                            {app.recruiterNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F1F5F9]">
                        <button
                          type="button"
                          onClick={() => onViewJobDetails(matchedJob)}
                          className="btn-base btn-sm btn-secondary inline-flex items-center gap-1.5 text-[12px] font-semibold"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#2563EB]" />
                          <span>Ver detalhes da vaga</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onWithdrawApplication(app.id)}
                          className="text-[12px] font-medium text-[#C0393B] hover:underline cursor-pointer whitespace-nowrap px-2"
                        >
                          Retirar
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* TAB 2: UNIFIED, CENTERED 4-STEP RESUME WIZARD */}
        {activeTab === 'resume' && (
          <form
            id="candidate-wizard-container"
            onSubmit={handleSaveProfile}
            noValidate
            className="space-y-5 scroll-mt-4"
          >
            {/* Unified Stepper & Profile Completeness Header */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-[16px] font-bold text-[#0F172A]">
                    Meu Currículo Profissional
                  </h2>
                  <p className="text-[12px] text-[#64748B] mt-0.5">
                    Passo {wizardStep} de 4 — {WIZARD_STEPS[wizardStep - 1].title}
                  </p>
                </div>
                <span
                  data-testid="candidate-wizard-progress-pct"
                  className="text-[12px] font-semibold text-[#1D4ED8] tabular-nums whitespace-nowrap"
                >
                  Perfil {liveProgressCoach.percentage}% completo
                </span>
              </div>

              {/* Clean Progress Bar */}
              <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2457D6] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(wizardProgressPercent, liveProgressCoach.percentage)}%` }}
                />
              </div>

              {/* Centered 4-Step Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WIZARD_STEPS.map((st) => {
                  const isActive = wizardStep === st.id;
                  const isCompleted = wizardStep > st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      data-testid={`candidate-wizard-step-${st.id}`}
                      onClick={() => setWizardStep(st.id)}
                      className={`px-3 py-2 rounded-lg border text-left transition-colors flex items-center gap-2 cursor-pointer ${
                        isActive
                          ? 'border-[#2457D6] bg-[#EFF4FF] text-[#1D4ED8] font-semibold'
                          : isCompleted
                          ? 'border-[#E2E8F0] bg-[#F8FAFC] text-[#16835D] font-medium'
                          : 'border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC] font-medium'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 tabular-nums ${
                          isActive
                            ? 'bg-[#2457D6] text-white'
                            : isCompleted
                            ? 'bg-[#16835D] text-white'
                            : 'bg-[#F1F5F9] text-[#64748B]'
                        }`}
                      >
                        {isCompleted ? <Check className="w-3 h-3" /> : st.id}
                      </span>
                      <span className="text-[12px] truncate">{st.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PASSO 1: INFORMAÇÕES BÁSICAS */}
            {wizardStep === 1 && (
              <section
                id="resume-step-1"
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5"
              >
                <div className="pb-3 border-b border-[#F1F5F9]">
                  <h3 className="text-[16px] font-semibold text-[#0F172A]">
                    1. Dados Pessoais e Contato
                  </h3>
                  <p className="text-[12px] text-[#64748B] mt-0.5">
                    Preencha seus dados principais de contato e localização.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cand-name" className="form-label">
                      Nome completo <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="cand-name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        clearFieldError('name');
                      }}
                      className={`form-control ${fieldErrors.name ? 'border-red-500 bg-red-50/30' : ''}`}
                    />
                    {fieldErrors.name && (
                      <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="cand-cpf" className="form-label">
                      CPF <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="cand-cpf"
                      type="text"
                      inputMode="numeric"
                      value={formData.cpf}
                      onChange={(e) => {
                        setFormData({ ...formData, cpf: formatCPF(e.target.value) });
                        clearFieldError('cpf');
                      }}
                      onBlur={() => {
                        if (formData.cpf && !isValidCPF(formData.cpf)) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            cpf: 'CPF inválido. Verifique os 11 dígitos.',
                          }));
                        }
                      }}
                      placeholder="000.000.000-00"
                      className={`form-control tabular-nums ${
                        fieldErrors.cpf ? 'border-red-500 bg-red-50/30' : ''
                      }`}
                    />
                    {fieldErrors.cpf && (
                      <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.cpf}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="cand-role" className="form-label">
                      Cargo desejado ou área <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="cand-role"
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Ex: Administrativo, Vendas..."
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label htmlFor="cand-phone" className="form-label">
                      WhatsApp / Telefone <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="cand-phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: formatPhone(e.target.value) });
                        clearFieldError('phone');
                      }}
                      placeholder="(18) 99999-9999"
                      className={`form-control tabular-nums ${
                        fieldErrors.phone ? 'border-red-500 bg-red-50/30' : ''
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="mt-1 text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {fieldErrors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Localização simplificada */}
                <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#0F172A]">
                      Localização
                    </span>
                    {cepLoading && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2457D6]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Consultando CEP...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <label htmlFor="cand-cep" className="form-label text-xs">
                        CEP
                      </label>
                      <input
                        id="cand-cep"
                        type="text"
                        inputMode="numeric"
                        value={formData.cep}
                        onChange={(e) => {
                          const formatted = formatCEP(e.target.value);
                          setFormData((prev) => ({ ...prev, cep: formatted }));
                          clearFieldError('cep');
                          if (normalizeCEP(formatted).length === 8) {
                            handleCepLookup(formatted);
                          }
                        }}
                        onBlur={() => {
                          if (formData.cep && !isValidCEP(formData.cep)) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              cep: 'CEP inválido (Ex: 19010-000).',
                            }));
                          } else if (normalizeCEP(formData.cep).length === 8) {
                            handleCepLookup(formData.cep);
                          }
                        }}
                        placeholder="19010-000"
                        className={`form-control tabular-nums ${
                          fieldErrors.cep ? 'border-red-500 bg-red-50/30' : ''
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-8">
                      <label htmlFor="cand-city" className="form-label text-xs">
                        Cidade <span className="text-red-600">*</span>
                      </label>
                      <select
                        id="cand-city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="form-control cursor-pointer"
                      >
                        {!REGIONAL_CITIES.includes(formData.city) && formData.city && (
                          <option value={formData.city}>{formData.city}</option>
                        )}
                        {REGIONAL_CITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <label htmlFor="cand-street" className="form-label text-xs">
                        Rua / Logradouro
                      </label>
                      <input
                        id="cand-street"
                        type="text"
                        value={formData.street}
                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                        placeholder="Rua ou avenida"
                        className="form-control"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="cand-number" className="form-label text-xs">
                        Nº
                      </label>
                      <input
                        id="cand-number"
                        type="text"
                        value={formData.addressNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, addressNumber: e.target.value })
                        }
                        placeholder="120"
                        className="form-control"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label htmlFor="cand-neighborhood" className="form-label text-xs">
                        Bairro
                      </label>
                      <input
                        id="cand-neighborhood"
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) =>
                          setFormData({ ...formData, neighborhood: e.target.value })
                        }
                        placeholder="Centro..."
                        className="form-control"
                      />
                    </div>
                  </div>

                  {fieldErrors.cep && (
                    <p className="text-xs font-medium text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {fieldErrors.cep}
                    </p>
                  )}

                  {cepFeedback && (
                    <p
                      data-testid="candidate-cep-feedback"
                      className={`text-xs font-medium ${
                        cepFeedback.type === 'success' ? 'text-[#16835D]' : 'text-amber-700'
                      }`}
                    >
                      {cepFeedback.message}
                    </p>
                  )}
                </div>

                {/* Pretensão e LinkedIn */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F1F5F9]">
                  <div>
                    <label htmlFor="cand-salary" className="form-label">
                      Pretensão salarial (opcional)
                    </label>
                    <input
                      id="cand-salary"
                      type="text"
                      value={formData.salaryExpectation}
                      onChange={(e) =>
                        setFormData({ ...formData, salaryExpectation: e.target.value })
                      }
                      placeholder="Ex: R$ 2.500 ou A combinar"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label htmlFor="cand-linkedin" className="form-label">
                      LinkedIn ou Portfólio (opcional)
                    </label>
                    <input
                      id="cand-linkedin"
                      type="text"
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      placeholder="linkedin.com/in/seu-perfil"
                      className="form-control"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="cand-video-pitch" className="form-label">
                      Link de Vídeo-Apresentação (YouTube / Loom — opcional)
                    </label>
                    <input
                      id="cand-video-pitch"
                      type="url"
                      value={formData.videoPitchUrl}
                      onChange={(e) => setFormData({ ...formData, videoPitchUrl: e.target.value })}
                      placeholder="https://www.youtube.com/watch?v=... ou https://www.loom.com/share/..."
                      className="form-control"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* PASSO 2: EXPERIÊNCIAS E FORMAÇÃO */}
            {wizardStep === 2 && (
              <section
                id="resume-step-2"
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5"
              >
                <div className="pb-3 border-b border-[#F1F5F9]">
                  <h3 className="text-[16px] font-semibold text-[#0F172A]">
                    2. Experiências e Escolaridade
                  </h3>
                  <p className="text-[12px] text-[#64748B] mt-0.5">
                    Informe sua formação acadêmica, resumo e histórico profissional.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cand-exp" className="form-label">
                      Nível de experiência
                    </label>
                    <select
                      id="cand-exp"
                      value={formData.experienceLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, experienceLevel: e.target.value })
                      }
                      className="form-control cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      <option>Primeiro Emprego</option>
                      <option>Estágio</option>
                      <option>Júnior</option>
                      <option>Pleno</option>
                      <option>Sênior</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cand-edu" className="form-label">
                      Escolaridade principal <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="cand-edu"
                      value={formData.education}
                      onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                      className="form-control cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      <option>Ensino Médio</option>
                      <option>Ensino Técnico</option>
                      <option>Superior Incompleto</option>
                      <option>Superior Completo</option>
                      <option>Pós-Graduação / Especialização</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label htmlFor="cand-about" className="form-label mb-0">
                      Resumo profissional
                    </label>
                    <button
                      type="button"
                      onClick={handleAiOptimizeCv}
                      disabled={optimizingAi}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-semibold bg-[#EFF4FF] hover:bg-[#DBEAFE] text-[#1D4ED8] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{optimizingAi ? 'Gerando...' : 'Melhorar com IA'}</span>
                    </button>
                  </div>
                  <textarea
                    id="cand-about"
                    rows={4}
                    value={formData.about}
                    onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                    placeholder="Resuma suas principais experiências, habilidades e objetivos..."
                    className="form-control"
                  />

                  {aiSuggestions && (
                    <div className="mt-3 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#173B70]">
                          Sugestão gerada
                        </span>
                        <button
                          type="button"
                          onClick={applyAiSummary}
                          className="btn-base btn-sm btn-secondary text-[#173B70]"
                        >
                          Usar este texto
                        </button>
                      </div>
                      <p className="text-[13px] text-[#334155] leading-relaxed">
                        {aiSuggestions.enhancedSummary}
                      </p>
                    </div>
                  )}
                </div>

                {/* Experiências Profissionais */}
                <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#0F172A]">
                      Experiências anteriores ({experiences.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] hover:bg-[#EFF4FF] text-[#1D4ED8] border border-[#E2E8F0] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {experiences.map((exp, idx) => (
                    <div
                      key={exp.id || idx}
                      className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#475569]">
                          Experiência {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(idx)}
                          className="text-xs font-medium text-[#C0393B] hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remover
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => handleUpdateExperience(idx, 'role', e.target.value)}
                          placeholder="Cargo"
                          className="form-control text-xs"
                        />
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => handleUpdateExperience(idx, 'company', e.target.value)}
                          placeholder="Empresa"
                          className="form-control text-xs"
                        />
                        <input
                          type="text"
                          value={exp.period}
                          onChange={(e) => handleUpdateExperience(idx, 'period', e.target.value)}
                          placeholder="Período (Ex: 2022 - Atual)"
                          className="form-control text-xs"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={exp.description}
                        onChange={(e) => handleUpdateExperience(idx, 'description', e.target.value)}
                        placeholder="Principais atividades..."
                        className="form-control text-xs"
                      />
                    </div>
                  ))}
                </div>

                {/* Instituições de Ensino */}
                <div className="pt-3 border-t border-[#F1F5F9] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#0F172A]">
                      Instituições de ensino ({educationHistory.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddEducationItem}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F8FAFC] hover:bg-[#EFF4FF] text-[#1D4ED8] border border-[#E2E8F0] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                  </div>

                  {educationHistory.map((edu, idx) => (
                    <div
                      key={edu.id || idx}
                      className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center"
                    >
                      <input
                        type="text"
                        value={edu.degree}
                        onChange={(e) => handleUpdateEducationItem(idx, 'degree', e.target.value)}
                        placeholder="Curso"
                        className="form-control text-xs"
                      />
                      <input
                        type="text"
                        value={edu.institution}
                        onChange={(e) =>
                          handleUpdateEducationItem(idx, 'institution', e.target.value)
                        }
                        placeholder="Instituição"
                        className="form-control text-xs"
                      />
                      <input
                        type="text"
                        value={edu.completionYear}
                        onChange={(e) =>
                          handleUpdateEducationItem(idx, 'completionYear', e.target.value)
                        }
                        placeholder="Ano (Ex: 2024)"
                        className="form-control text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveEducationItem(idx)}
                        className="text-xs font-medium text-[#C0393B] hover:underline inline-flex items-center justify-end gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remover
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* PASSO 3: COMPETÊNCIAS E IDIOMAS */}
            {wizardStep === 3 && (
              <section
                id="resume-step-3"
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5"
              >
                <div className="pb-3 border-b border-[#F1F5F9]">
                  <h3 className="text-[16px] font-semibold text-[#0F172A]">
                    3. Competências e Idiomas
                  </h3>
                  <p className="text-[12px] text-[#64748B] mt-0.5">
                    Adicione suas principais habilidades técnicas, cursos e idiomas.
                  </p>
                </div>

                <div>
                  <label htmlFor="cand-skills" className="form-label">
                    Habilidades técnicas (separadas por vírgula) <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="cand-skills"
                    type="text"
                    value={formData.skillsStr}
                    onChange={(e) => setFormData({ ...formData, skillsStr: e.target.value })}
                    placeholder={SKILLS_MOBILE_PLACEHOLDER}
                    className="form-control"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#64748B]">Sugestões:</span>
                    {quickSkillAnchors.map((sk) => (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => addQuickSkill(sk)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#F8FAFC] hover:bg-[#EFF4FF] text-[#173B70] border border-[#E2E8F0] transition-colors cursor-pointer"
                      >
                        + {sk}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cand-certs" className="form-label">
                      Cursos e certificações
                    </label>
                    <input
                      id="cand-certs"
                      type="text"
                      value={formData.certificationsStr}
                      onChange={(e) =>
                        setFormData({ ...formData, certificationsStr: e.target.value })
                      }
                      placeholder="Ex: Excel Avançado, Gestão..."
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label htmlFor="cand-langs" className="form-label">
                      Idiomas
                    </label>
                    <input
                      id="cand-langs"
                      type="text"
                      value={formData.languagesStr}
                      onChange={(e) => setFormData({ ...formData, languagesStr: e.target.value })}
                      placeholder="Ex: Português (Nativo), Inglês"
                      className="form-control"
                    />
                  </div>

                  <div>
                    <label htmlFor="cand-cnh" className="form-label">
                      Carteira de Habilitação (CNH)
                    </label>
                    <select
                      id="cand-cnh"
                      value={formData.cnhCategory}
                      onChange={(e) =>
                        setFormData({ ...formData, cnhCategory: e.target.value as CnhCategory })
                      }
                      className="form-control cursor-pointer"
                    >
                      <option value="nao">Não possuo CNH</option>
                      <option value="A">CNH A (Moto)</option>
                      <option value="B">CNH B (Carro)</option>
                      <option value="AB">CNH AB (Moto e Carro)</option>
                      <option value="C">CNH C</option>
                      <option value="D">CNH D</option>
                      <option value="E">CNH E</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="cand-vehicle" className="form-label">
                      Veículo próprio
                    </label>
                    <select
                      id="cand-vehicle"
                      value={formData.ownVehicle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ownVehicle: e.target.value as VehicleRequirement,
                        })
                      }
                      className="form-control cursor-pointer"
                    >
                      <option value="nao">Não possuo veículo próprio</option>
                      <option value="moto">Possuo Moto própria</option>
                      <option value="carro">Possuo Carro próprio</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {/* PASSO 4: REVISÃO, PREVIEW ATS E CURRÍCULO EM PDF */}
            {wizardStep === 4 && (
              <section
                id="resume-step-4"
                className="bg-white border border-[#E2E8F0] rounded-xl p-5 sm:p-6 space-y-5"
              >
                <div className="pb-3 border-b border-[#F1F5F9] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#0F172A]">
                      4. Preview do Currículo ATS e Exportação em PDF
                    </h3>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      Visualize seu currículo formatado abaixo, imprima/baixe em PDF ou gere 3 modelos ATS otimizados.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-base btn-sm btn-secondary inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Printer className="w-4 h-4 text-[#2563EB]" />
                    <span>Baixar / Imprimir em PDF</span>
                  </button>
                </div>

                {/* Preview Limpo do Currículo ATS na Tela (Formatado para @media print) */}
                <div
                  id="ats-printable-resume"
                  className="bg-white border border-[#CBD5E1] rounded-xl p-6 sm:p-8 shadow-xs space-y-4 text-[#0F172A]"
                >
                  <div className="border-b-2 border-[#1E40AF] pb-3">
                    <h4 className="text-[20px] font-extrabold text-[#0F172A] tracking-tight">
                      {formData.name || user.name || 'Seu Nome Completo'}
                    </h4>
                    <p className="text-[14px] font-semibold text-[#1E40AF] mt-0.5">
                      {formData.role || 'Profissional em busca de oportunidades'}
                      {formData.experienceLevel ? ` · Nível ${formData.experienceLevel}` : ''}
                    </p>
                    <p className="text-[12px] text-[#475569] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>{formData.city || 'Presidente Prudente, SP'}</span>
                      {formData.phone && <span>· {formData.phone}</span>}
                      {user.email && <span>· {user.email}</span>}
                      {formData.cnhCategory && formData.cnhCategory !== 'nao' && (
                        <span>· CNH {formData.cnhCategory}</span>
                      )}
                      {formData.ownVehicle && formData.ownVehicle !== 'nao' && (
                        <span>
                          · Veículo próprio ({formData.ownVehicle === 'moto' ? 'Moto' : 'Carro'})
                        </span>
                      )}
                    </p>
                  </div>

                  {formData.about && (
                    <div>
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF] mb-1">
                        Resumo Profissional
                      </h5>
                      <p className="text-[13px] text-[#334155] leading-relaxed">
                        {formData.about}
                      </p>
                    </div>
                  )}

                  {experiences.length > 0 && (
                    <div>
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF] mb-2">
                        Experiência Profissional
                      </h5>
                      <div className="space-y-2.5">
                        {experiences.map((exp, idx) => (
                          <div key={exp.id || idx} className="text-[13px]">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <strong className="font-bold text-[#0F172A]">
                                {exp.role || 'Cargo'} — {exp.company || 'Empresa'}
                              </strong>
                              <span className="text-[12px] text-[#64748B]">{exp.period}</span>
                            </div>
                            {exp.description && (
                              <p className="text-[#475569] mt-0.5 leading-snug">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF] mb-1">
                      Formação Acadêmica
                    </h5>
                    <p className="text-[13px] font-semibold text-[#0F172A]">
                      {formData.education || 'Escolaridade não informada'}
                    </p>
                    {educationHistory.map((edu, idx) => (
                      <p key={edu.id || idx} className="text-[12px] text-[#475569] mt-0.5">
                        {edu.degree} · {edu.institution}{' '}
                        {edu.completionYear ? `(${edu.completionYear})` : ''}
                      </p>
                    ))}
                  </div>

                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-[#1E40AF] mb-1.5">
                      Habilidades e Competências ({parsedSkillsList.length})
                    </h5>
                    <p className="text-[13px] text-[#334155] leading-relaxed">
                      {parsedSkillsList.length > 0
                        ? parsedSkillsList.join(' · ')
                        : 'Adicione suas competências na etapa 3 para exibir aqui.'}
                    </p>
                  </div>
                </div>

                {/* Gerador de Currículo ATS */}
                <div className="p-5 rounded-xl bg-gradient-to-r from-[#1E40AF] to-[#2563EB] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-[15px] font-bold text-white">
                      Gerar / Otimizar Currículo ATS ({RESUME_GENERATION_COST} cr)
                    </h4>
                    <p className="text-[13px] text-blue-100 leading-relaxed max-w-md">
                      Escolha entre 3 modelos profissionais otimizados para recrutadores de Presidente Prudente ({RESUME_GENERATION_COST} créditos).
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid="open-resume-generator-btn"
                    onClick={handleOpenResumeGeneratorClick}
                    className="px-4 py-2.5 rounded-lg bg-white hover:bg-blue-50 text-[#1E40AF] font-bold text-[13px] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4 text-[#2563EB]" />
                    <span>Gerar / Otimizar Currículo ATS ({RESUME_GENERATION_COST} cr)</span>
                  </button>
                </div>

                {/* Anexo de PDF próprio */}
                {resumeFile ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#1E40AF] truncate">
                        {resumeFile.name}
                      </p>
                      <p className="text-[12px] text-[#475569]">
                        PDF anexado ao seu perfil
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={resumeFile.dataUrl}
                        download={resumeFile.name}
                        className="btn-base btn-sm btn-secondary"
                      >
                        Baixar
                      </a>
                      <button
                        type="button"
                        onClick={handleRemovePdf}
                        className="btn-base btn-sm btn-danger-ghost"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-dashed border-[#93C5FD] rounded-lg bg-[#F8FAFF]">
                    <span className="text-[13px] text-[#475569]">
                      Já possui um currículo em PDF? Anexe gratuitamente:
                    </span>
                    <label
                      htmlFor="cand-pdf-upload"
                      className="btn-base btn-sm btn-secondary self-start sm:self-center cursor-pointer whitespace-nowrap"
                    >
                      Anexar PDF
                      <input
                        id="cand-pdf-upload"
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </section>
            )}

            {/* Wizard Navigation Footer */}
            <div className="bg-white border border-[#DBEAFE] rounded-xl p-4 flex items-center justify-between gap-3">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="btn-base btn-md btn-secondary inline-flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Voltar</span>
                  </button>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 shrink-0">
                {wizardStep < 4 ? (
                  <button
                    type="button"
                    data-testid="candidate-wizard-next-btn"
                    onClick={handleNextStep}
                    className="btn-base btn-md btn-primary inline-flex items-center gap-1.5"
                  >
                    <span>Próxima Etapa</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving}
                    data-testid="candidate-save-profile-btn"
                    className="btn-base btn-md btn-primary font-bold"
                  >
                    {saving ? 'Salvando...' : 'Salvar Currículo'}
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        {/* TAB 3: ALERTAS DE VAGAS */}
        {activeTab === 'alerts' && (
          <section className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F1F5F9]">
              <div>
                <h2 className="text-[18px] font-bold text-[#0F172A]">
                  Alertas de Vagas em Presidente Prudente
                </h2>
                <p className="text-[13px] text-[#64748B] mt-0.5">
                  Escolha as áreas de interesse e modalidades para receber avisos prioritários quando novas vagas forem publicadas.
                </p>
              </div>
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={jobAlertsEnabled}
                  onChange={(e) => setJobAlertsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#1D4ED8] rounded cursor-pointer"
                />
                <span className="text-[13px] font-semibold text-[#0F172A]">
                  {jobAlertsEnabled ? 'Alertas Ativos' : 'Alertas Pausados'}
                </span>
              </label>
            </div>

            <div className="space-y-4">
              <div>
                <span className="block text-[13px] font-semibold text-[#0F172A] mb-2">
                  Áreas de interesse em Presidente Prudente e Região
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Administrativo',
                    'Comércio',
                    'Tecnologia',
                    'Primeiro Emprego',
                    'Financeiro',
                    'Saúde',
                    'Indústria',
                    'Agronegócio',
                    'Serviços',
                  ].map((area) => {
                    const selected = jobAlertAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => handleToggleAlertArea(area)}
                        className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1E40AF] font-semibold'
                            : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {selected ? `✓ ${area}` : area}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-[13px] font-semibold text-[#0F172A] mb-2">
                  Modalidades de trabalho desejadas
                </span>
                <div className="flex flex-wrap gap-2">
                  {['Presencial', 'Híbrido', 'Remoto'].map((model) => {
                    const selected = jobAlertWorkModels.includes(model);
                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => handleToggleAlertWorkModel(model)}
                        className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#EFF6FF] border-[#2563EB] text-[#1E40AF] font-semibold'
                            : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {selected ? `✓ ${model}` : model}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-between gap-3">
              <span className="text-[12px] text-[#64748B]">
                E-mail cadastrado para alertas: <strong className="text-[#0F172A]">{user.email}</strong>
              </span>
              <button
                type="button"
                disabled={savingAlerts}
                onClick={handleSaveJobAlerts}
                className="btn-base btn-md btn-primary font-semibold"
              >
                {savingAlerts ? 'Salvando...' : 'Salvar preferências de alerta'}
              </button>
            </div>
          </section>
        )}

        {/* TAB 4: SAVED JOBS */}
        {activeTab === 'saved' && (
          <section className="space-y-4">
            {savedJobsList.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 sm:p-10 text-center max-w-xl mx-auto">
                <div className="w-12 h-12 rounded-full bg-[#EFF4FF] text-[#2457D6] flex items-center justify-center mx-auto mb-3">
                  <Bookmark className="w-5 h-5" />
                </div>
                <h2 className="text-[18px] font-semibold text-[#0F172A] mb-1.5">
                  Nenhuma vaga salva
                </h2>
                <p className="text-[14px] text-[#64748B] mb-6 max-w-md mx-auto leading-relaxed">
                  {SAVED_JOBS_EMPTY_DESCRIPTION}
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="btn-base btn-md btn-primary px-6 py-2.5 text-[14px] font-semibold"
                >
                  Explorar vagas abertas
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {savedJobsList.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => onViewJobDetails(job)}
                    className="bg-white border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
                  >
                    <div className="min-w-0">
                      <h3 className="text-[16px] font-semibold text-[#0F172A]">
                        {job.title}
                      </h3>
                      <p className="text-[13px] text-[#64748B] mt-0.5">
                        {job.companyName} · {job.location} · {job.contract}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {onToggleSaveJob && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSaveJob(job.id);
                          }}
                          className="btn-base btn-sm btn-ghost text-[#C0393B]"
                        >
                          Remover
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewJobDetails(job);
                        }}
                        className="btn-base btn-sm btn-primary"
                      >
                        Ver vaga
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Modal do Gerador Profissional de Currículo (15 créditos, 3 modelos ATS) */}
      <ResumeGeneratorModal
        isOpen={isResumeGeneratorOpen}
        onClose={() => setIsResumeGeneratorOpen(false)}
        user={user}
        draftProfile={{
          name: formData.name,
          photoDataUrl,
          cpf: formData.cpf,
          cep: formData.cep,
          street: formData.street,
          addressNumber: formData.addressNumber,
          addressComplement: formData.addressComplement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          state: formData.state,
          role: formData.role,
          experienceLevel: formData.experienceLevel,
          education: formData.education,
          salaryExpectation: formData.salaryExpectation,
          phone: formData.phone,
          linkedinUrl: formData.linkedinUrl,
          about: formData.about,
          skills: parsedSkillsList,
          certifications: parsedCertificationsList,
          languages: parsedLanguagesList,
          experiences,
          educationHistory,
        }}
        onUpdateProfile={onUpdateProfile}
        onCreditsUpdated={onCreditsUpdated}
        onSelectCreditPackage={onSelectCreditPackage}
        onNavigateToPlans={() => onNavigate('plans')}
        onResumeAttached={(file) => {
          setResumeFile(file);
          setFormData((prev) => ({
            ...prev,
            role: prev.role || user.role || '',
          }));
        }}
        showToast={showToast}
      />
    </div>
  );
};
