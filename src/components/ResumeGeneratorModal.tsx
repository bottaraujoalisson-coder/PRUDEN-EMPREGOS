import React, { useState, useMemo, useEffect } from 'react';
import {
  UserProfile,
  ResumeTemplateId,
  ResumeExperience,
  ResumeEducation,
} from '../types';
import {
  RESUME_GENERATION_COST,
  RESUME_TEMPLATES,
  buildStructuredResumeFromProfile,
} from '../utils/pdfResumeGenerator';
import { checkResumeGenerationReadiness } from '../utils/validation';
import { formatPhone } from '../utils/matchAlgorithm';
import { generateResumeWithCredits } from '../services/usersService';
import { CANDIDATE_RESUME_CREDIT_PACKAGE, CreditPackage } from '../utils/creditsData';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Coins,
  X,
  Plus,
  Trash2,
  ShieldCheck,
  Eye,
  Edit3,
  CreditCard,
} from 'lucide-react';

interface ResumeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  draftProfile: Partial<UserProfile>;
  onUpdateProfile: (updatedData: Partial<UserProfile>) => Promise<void>;
  onCreditsUpdated?: (newBalance: number) => void;
  onSelectCreditPackage?: (pkg: CreditPackage) => void;
  onNavigateToPlans?: () => void;
  onResumeAttached?: (file: { name: string; dataUrl: string }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ResumeGeneratorModal: React.FC<ResumeGeneratorModalProps> = ({
  isOpen,
  onClose,
  user,
  draftProfile,
  onUpdateProfile,
  onCreditsUpdated,
  onSelectCreditPackage,
  onNavigateToPlans,
  onResumeAttached,
  showToast,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplateId>('ats_classic');
  const [activeMobilePane, setActiveMobilePane] = useState<'config' | 'preview'>('config');
  const [confirmDebitChecked, setConfirmDebitChecked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `cv_gen_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  );

  // Editable local state pre-populated from user + draftProfile so missing fields can be completed inline
  const [localRole, setLocalRole] = useState(draftProfile.role || user.role || '');
  const [localPhone, setLocalPhone] = useState(draftProfile.phone || user.phone || '');
  const [localAbout, setLocalAbout] = useState(draftProfile.about || user.about || '');
  const [localEducation, setLocalEducation] = useState(draftProfile.education || user.education || '');
  const [localLinkedin, setLocalLinkedin] = useState(draftProfile.linkedinUrl || user.linkedinUrl || '');
  const [localSkillsStr, setLocalSkillsStr] = useState(
    (draftProfile.skills && draftProfile.skills.length > 0
      ? draftProfile.skills
      : user.skills || []
    ).join(', ')
  );
  const [localCertificationsStr, setLocalCertificationsStr] = useState(
    (draftProfile.certifications && draftProfile.certifications.length > 0
      ? draftProfile.certifications
      : user.certifications || []
    ).join(', ')
  );
  const [localLanguagesStr, setLocalLanguagesStr] = useState(
    (draftProfile.languages && draftProfile.languages.length > 0
      ? draftProfile.languages
      : user.languages || ['Português (Nativo)']
    ).join(', ')
  );
  const [localExperiences, setLocalExperiences] = useState<ResumeExperience[]>(
    draftProfile.experiences && draftProfile.experiences.length > 0
      ? draftProfile.experiences
      : user.experiences || []
  );
  const [localEducationHistory, setLocalEducationHistory] = useState<ResumeEducation[]>(
    draftProfile.educationHistory && draftProfile.educationHistory.length > 0
      ? draftProfile.educationHistory
      : user.educationHistory || []
  );

  const [generatedResult, setGeneratedResult] = useState<{
    resumeId: string;
    fileName: string;
    pdfDataUrl: string;
    downloadUrl?: string;
    creditsDebited: number;
    newBalance: number;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLocalRole(draftProfile.role || user.role || '');
      setLocalPhone(draftProfile.phone || user.phone || '');
      setLocalAbout(draftProfile.about || user.about || '');
      setLocalEducation(draftProfile.education || user.education || '');
      setLocalLinkedin(draftProfile.linkedinUrl || user.linkedinUrl || '');
      setLocalSkillsStr(
        (draftProfile.skills && draftProfile.skills.length > 0
          ? draftProfile.skills
          : user.skills || []
        ).join(', ')
      );
      setLocalCertificationsStr(
        (draftProfile.certifications && draftProfile.certifications.length > 0
          ? draftProfile.certifications
          : user.certifications || []
        ).join(', ')
      );
      setLocalLanguagesStr(
        (draftProfile.languages && draftProfile.languages.length > 0
          ? draftProfile.languages
          : user.languages || ['Português (Nativo)']
        ).join(', ')
      );
      setLocalExperiences(
        draftProfile.experiences && draftProfile.experiences.length > 0
          ? draftProfile.experiences
          : user.experiences || []
      );
      setLocalEducationHistory(
        draftProfile.educationHistory && draftProfile.educationHistory.length > 0
          ? draftProfile.educationHistory
          : user.educationHistory || []
      );
      setConfirmDebitChecked(false);
      setGeneratedResult(null);
      setIdempotencyKey(
        `cv_gen_${user.uid}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      );
    }
  }, [isOpen, user, draftProfile]);

  const mergedProfile: UserProfile = useMemo(() => {
    const parsedSkills = localSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedCerts = localCertificationsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedLangs = localLanguagesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      ...user,
      ...draftProfile,
      role: localRole.trim(),
      phone: localPhone.trim(),
      about: localAbout.trim(),
      education: localEducation.trim(),
      linkedinUrl: localLinkedin.trim(),
      skills: parsedSkills,
      certifications: parsedCerts,
      languages: parsedLangs,
      experiences: localExperiences,
      educationHistory: localEducationHistory,
    };
  }, [
    user,
    draftProfile,
    localRole,
    localPhone,
    localAbout,
    localEducation,
    localLinkedin,
    localSkillsStr,
    localCertificationsStr,
    localLanguagesStr,
    localExperiences,
    localEducationHistory,
  ]);

  const readiness = useMemo(() => {
    return checkResumeGenerationReadiness(mergedProfile);
  }, [mergedProfile]);

  const structuredPreview = useMemo(() => {
    return buildStructuredResumeFromProfile(mergedProfile, {
      templateId: selectedTemplate,
    });
  }, [mergedProfile, selectedTemplate]);

  const currentCredits = Number(user.credits || 0);
  const hasEnoughCredits = currentCredits >= RESUME_GENERATION_COST;
  const remainingCreditsAfter = Math.max(0, currentCredits - RESUME_GENERATION_COST);

  if (!isOpen) return null;

  const handleAddExperience = () => {
    setLocalExperiences((prev) => [
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
    setLocalExperiences((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveExperience = (index: number) => {
    setLocalExperiences((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddEducation = () => {
    setLocalEducationHistory((prev) => [
      ...prev,
      {
        id: `edu_${Date.now()}_${prev.length}`,
        degree: localEducation || 'Superior Completo',
        institution: '',
        completionYear: '',
        status: 'Concluído',
      },
    ]);
  };

  const handleUpdateEducation = (index: number, field: keyof ResumeEducation, value: string) => {
    setLocalEducationHistory((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveEducation = (index: number) => {
    setLocalEducationHistory((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleGenerateResume = async () => {
    if (!readiness.ready) {
      showToast(
        `Complete os campos pendentes antes de gerar: ${readiness.missingFields
          .map((f) => f.label)
          .join(', ')}.`,
        'error'
      );
      return;
    }

    if (!hasEnoughCredits) {
      showToast(
        `Saldo insuficiente (${currentCredits} créditos). São necessários ${RESUME_GENERATION_COST} créditos.`,
        'error'
      );
      return;
    }

    if (!confirmDebitChecked) {
      showToast(
        `Confirme a autorização de débito de ${RESUME_GENERATION_COST} créditos antes de prosseguir.`,
        'error'
      );
      return;
    }

    setGenerating(true);
    try {
      const result = await generateResumeWithCredits(mergedProfile, {
        templateId: selectedTemplate,
        includeCpfInPdf: false,
        idempotencyKey,
      });

      setGeneratedResult({
        resumeId: result.resumeId,
        fileName: result.fileName,
        pdfDataUrl: result.pdfDataUrl,
        downloadUrl: result.downloadUrl,
        creditsDebited: result.creditsDebited,
        newBalance: result.newBalance,
      });

      onCreditsUpdated?.(result.newBalance);

      // Salva também os dados enriquecidos e o currículo gerado no perfil do candidato
      await onUpdateProfile({
        role: mergedProfile.role,
        phone: mergedProfile.phone,
        about: mergedProfile.about,
        education: mergedProfile.education,
        linkedinUrl: mergedProfile.linkedinUrl,
        skills: mergedProfile.skills,
        certifications: mergedProfile.certifications,
        languages: mergedProfile.languages,
        experiences: mergedProfile.experiences,
        educationHistory: mergedProfile.educationHistory,
        resumeFileName: result.fileName,
        resumeDataUrl: result.pdfDataUrl,
        credits: result.newBalance,
      });

      onResumeAttached?.({
        name: result.fileName,
        dataUrl: result.pdfDataUrl,
      });

      showToast(
        result.alreadyProcessed
          ? 'Currículo recuperado sem nova cobrança de créditos!'
          : `Currículo Profissional gerado com sucesso! (-${result.creditsDebited} créditos)`
      );
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar currículo profissional.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const activeTemplateMeta =
    RESUME_TEMPLATES.find((t) => t.id === selectedTemplate) || RESUME_TEMPLATES[0];

  const contactItems = [
    structuredPreview.phone ? `Tel/WhatsApp: ${structuredPreview.phone}` : '',
    structuredPreview.email ? `E-mail: ${structuredPreview.email}` : '',
    structuredPreview.linkedinUrl ? `LinkedIn: ${structuredPreview.linkedinUrl}` : '',
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-generator-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl max-w-6xl w-full shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col">
        {/* Top Header */}
        <div className="bg-[#0B1F3A] text-white px-5 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-200 border border-blue-400/30">
                <Sparkles className="w-3 h-3" /> Padrão RH & ATS
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-400/20 text-amber-200 border border-amber-300/30 tabular-nums">
                <Coins className="w-3 h-3" /> Custo: {RESUME_GENERATION_COST} créditos
              </span>
            </div>
            <h2 id="resume-generator-title" className="text-lg sm:text-xl font-bold text-white mt-1">
              Gerador de Currículo Profissional em PDF (Texto Selecionável)
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/15 px-3 py-1.5 rounded-lg">
              <Coins className="w-4 h-4 text-amber-300" />
              <div className="text-left">
                <span className="block text-[10px] uppercase tracking-wider text-slate-300">
                  Seu Saldo
                </span>
                <span className="text-xs font-bold text-white tabular-nums">
                  {currentCredits} créditos
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar gerador de currículo"
              className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Switcher Tabs (Config vs Preview) */}
        <div className="flex lg:hidden border-b border-slate-200 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveMobilePane('config')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeMobilePane === 'config'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            1. Dados, Modelo e Créditos
          </button>
          <button
            type="button"
            onClick={() => setActiveMobilePane('preview')}
            className={`flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
              activeMobilePane === 'preview'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            2. Pré-visualização A4 ao Vivo
          </button>
        </div>

        {/* Main Body: Two Columns on Desktop */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Template Selection, Missing Fields & Credit Confirmation */}
          <div
            className={`lg:col-span-6 p-5 sm:p-6 space-y-6 overflow-y-auto ${
              activeMobilePane === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Success Banner if Already Generated */}
            {generatedResult && (
              <div
                data-testid="resume-generated-success"
                className="p-5 rounded-xl bg-emerald-50 border-2 border-emerald-500/40 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-base font-bold text-emerald-950">
                      Currículo PDF Gerado e Anexado ao Seu Perfil!
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Arquivo <strong>{generatedResult.fileName}</strong> formatado com texto selecionável compatível com ATS e sistemas de RH.
                    </p>
                    <p className="text-xs font-semibold text-emerald-900 mt-1 tabular-nums">
                      Créditos debitados: {generatedResult.creditsDebited} • Saldo atualizado:{' '}
                      {generatedResult.newBalance} créditos
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <a
                    href={generatedResult.pdfDataUrl}
                    download={generatedResult.fileName}
                    data-testid="download-generated-resume-btn"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Currículo em PDF
                  </a>
                  {generatedResult.downloadUrl && (
                    <a
                      href={generatedResult.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Abrir link direto do PDF
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Step 1: Choose Visual Template */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Escolha o Modelo Visual (Compatível com RH / ATS)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {RESUME_TEMPLATES.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplate;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.id)}
                      data-testid={`template-option-${tpl.id}`}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {tpl.badge}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                        <p className="text-xs font-bold text-slate-900">{tpl.name}</p>
                        <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                          {tpl.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Proteção LGPD ativa: CPF, RG e endereço residencial completo ficam ocultos no currículo exportado.</span>
              </div>
            </div>

            {/* Step 2: Review & Complete Required Resume Information */}
            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    2. Revisão e Preenchimento Rápido do Currículo
                  </h3>
                  <p className="text-xs text-slate-600">
                    Seus dados do perfil já foram importados. Complete ou refine qualquer campo abaixo:
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                    readiness.ready
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {readiness.ready ? 'Dados completos' : `${readiness.missingFields.length} pendência(s)`}
                </span>
              </div>

              {!readiness.ready && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Preencha antes de gerar o PDF: </span>
                    {readiness.missingFields.map((f) => f.label).join(', ')}.
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Objetivo Profissional / Cargo Almejado *
                  </label>
                  <input
                    type="text"
                    value={localRole}
                    onChange={(e) => setLocalRole(e.target.value)}
                    placeholder="Ex: Analista Administrativo, Vendedor..."
                    className="form-control text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp de Contato *
                  </label>
                  <input
                    type="tel"
                    value={localPhone}
                    onChange={(e) => setLocalPhone(formatPhone(e.target.value))}
                    placeholder="(18) 99999-9999"
                    className="form-control text-xs py-2 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Escolaridade Principal *
                  </label>
                  <select
                    value={localEducation}
                    onChange={(e) => setLocalEducation(e.target.value)}
                    className="form-control text-xs py-2 cursor-pointer"
                  >
                    <option value="">Selecione...</option>
                    <option>Ensino Médio</option>
                    <option>Ensino Técnico</option>
                    <option>Superior Incompleto</option>
                    <option>Superior Completo</option>
                    <option>Pós-Graduação / Especialização</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    LinkedIn / Portfólio (Opcional)
                  </label>
                  <input
                    type="text"
                    value={localLinkedin}
                    onChange={(e) => setLocalLinkedin(e.target.value)}
                    placeholder="linkedin.com/in/seu-perfil"
                    className="form-control text-xs py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resumo Profissional / Qualificações *
                </label>
                <textarea
                  rows={3}
                  value={localAbout}
                  onChange={(e) => setLocalAbout(e.target.value)}
                  placeholder="Descreva sua trajetória, principais resultados, domínio de ferramentas e objetivos..."
                  className="form-control text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Habilidades Técnicas * (vírgula)
                  </label>
                  <input
                    type="text"
                    value={localSkillsStr}
                    onChange={(e) => setLocalSkillsStr(e.target.value)}
                    placeholder="Excel, Atendimento, ERP..."
                    className="form-control text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cursos e Certificações (vírgula)
                  </label>
                  <input
                    type="text"
                    value={localCertificationsStr}
                    onChange={(e) => setLocalCertificationsStr(e.target.value)}
                    placeholder="Pacote Office, Gestão..."
                    className="form-control text-xs py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Idiomas (vírgula)
                  </label>
                  <input
                    type="text"
                    value={localLanguagesStr}
                    onChange={(e) => setLocalLanguagesStr(e.target.value)}
                    placeholder="Português (Nativo), Inglês Básico"
                    className="form-control text-xs py-2"
                  />
                </div>
              </div>

              {/* Structured Professional Experiences */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Experiências Profissionais ({localExperiences.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar experiência
                  </button>
                </div>

                {localExperiences.map((exp, idx) => (
                  <div
                    key={exp.id || idx}
                    className="p-3 bg-white rounded-lg border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">
                        Experiência #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(idx)}
                        className="text-red-600 hover:text-red-700 text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Remover
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={exp.role}
                        onChange={(e) => handleUpdateExperience(idx, 'role', e.target.value)}
                        placeholder="Cargo (Ex: Auxiliar Administrativo)"
                        className="form-control text-xs py-1.5"
                      />
                      <input
                        type="text"
                        value={exp.company}
                        onChange={(e) => handleUpdateExperience(idx, 'company', e.target.value)}
                        placeholder="Empresa"
                        className="form-control text-xs py-1.5"
                      />
                      <input
                        type="text"
                        value={exp.period}
                        onChange={(e) => handleUpdateExperience(idx, 'period', e.target.value)}
                        placeholder="Período (Ex: 2022 - Atual)"
                        className="form-control text-xs py-1.5"
                      />
                    </div>
                    <textarea
                      rows={2}
                      value={exp.description}
                      onChange={(e) => handleUpdateExperience(idx, 'description', e.target.value)}
                      placeholder="Principais atividades e conquistas no cargo..."
                      className="form-control text-xs py-1.5"
                    />
                  </div>
                ))}
              </div>

              {/* Structured Academic Education */}
              <div className="pt-2 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Formação Acadêmica Detalhada ({localEducationHistory.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar instituição
                  </button>
                </div>

                {localEducationHistory.map((edu, idx) => (
                  <div
                    key={edu.id || idx}
                    className="p-3 bg-white rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-2 items-center"
                  >
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => handleUpdateEducation(idx, 'degree', e.target.value)}
                      placeholder="Curso / Formação"
                      className="form-control text-xs py-1.5"
                    />
                    <input
                      type="text"
                      value={edu.institution}
                      onChange={(e) => handleUpdateEducation(idx, 'institution', e.target.value)}
                      placeholder="Instituição (Ex: Toledo, Unoeste, ETEC)"
                      className="form-control text-xs py-1.5"
                    />
                    <input
                      type="text"
                      value={edu.completionYear}
                      onChange={(e) =>
                        handleUpdateEducation(idx, 'completionYear', e.target.value)
                      }
                      placeholder="Ano / Previsão (Ex: 2025)"
                      className="form-control text-xs py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="text-red-600 hover:text-red-700 text-xs inline-flex items-center justify-end gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 3: Credit Balance & Explicit Debit Confirmation */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    3. Resumo de Créditos da Operação
                  </span>
                  <p className="text-xs text-slate-600 mt-0.5">
                    O débito ocorre somente após a geração válida do arquivo PDF.
                  </p>
                </div>
                <div className="text-right tabular-nums">
                  <span className="text-xs text-slate-500 block">Custo da emissão</span>
                  <span className="text-sm font-extrabold text-blue-700">
                    {RESUME_GENERATION_COST} créditos
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center bg-slate-50 p-3 rounded-lg border border-slate-200/80 tabular-nums">
                <div>
                  <span className="block text-[11px] text-slate-500">Saldo Atual</span>
                  <span
                    data-testid="resume-modal-current-credits"
                    className="text-sm font-bold text-slate-900"
                  >
                    {currentCredits} cr
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">Custo do PDF</span>
                  <span className="text-sm font-bold text-amber-700">
                    -{RESUME_GENERATION_COST} cr
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-500">Saldo Final</span>
                  <span
                    className={`text-sm font-bold ${
                      hasEnoughCredits ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {hasEnoughCredits ? `${remainingCreditsAfter} cr` : 'Insuficiente'}
                  </span>
                </div>
              </div>

              {hasEnoughCredits ? (
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none p-2.5 rounded-lg bg-blue-50/60 border border-blue-200/80">
                    <input
                      type="checkbox"
                      checked={confirmDebitChecked}
                      onChange={(e) => setConfirmDebitChecked(e.target.checked)}
                      data-testid="confirm-debit-checkbox"
                      className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs text-slate-800 leading-snug">
                      Autorizo o débito de <strong>{RESUME_GENERATION_COST} créditos</strong> da minha carteira para gerar meu Currículo Profissional em PDF com texto selecionável.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleGenerateResume}
                    disabled={generating || !readiness.ready || !confirmDebitChecked}
                    data-testid="confirm-generate-resume-btn"
                    className="w-full py-3.5 px-5 rounded-xl bg-[#2457D6] hover:bg-[#1E40AF] text-white font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {generating
                        ? 'Gerando PDF Profissional e validando créditos...'
                        : `Confirmar e Gerar Currículo (${RESUME_GENERATION_COST} Créditos)`}
                    </span>
                  </button>
                </div>
              ) : (
                <div
                  data-testid="insufficient-credits-banner"
                  className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-950">
                        Saldo insuficiente para gerar o Currículo Profissional
                      </h4>
                      <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                        Você possui <strong>{currentCredits} créditos</strong> e a geração requer{' '}
                        <strong>{RESUME_GENERATION_COST} créditos</strong> (faltam{' '}
                        <strong>{RESUME_GENERATION_COST - currentCredits} créditos</strong>). Adquira créditos com liberação imediata via Pix pelo Mercado Pago.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {onSelectCreditPackage && (
                      <button
                        type="button"
                        data-testid="buy-15-credits-btn"
                        onClick={() => {
                          onClose();
                          onSelectCreditPackage(CANDIDATE_RESUME_CREDIT_PACKAGE);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-lg bg-[#16835D] hover:bg-[#116949] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <CreditCard className="w-4 h-4" />
                        Adquirir +15 Créditos via Pix (R$ 19,90)
                      </button>
                    )}
                    {onNavigateToPlans && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateToPlans();
                        }}
                        className="py-2.5 px-4 rounded-lg bg-white hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-semibold cursor-pointer"
                      >
                        Ver Pacotes de Créditos
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live A4 Structured Preview */}
          <div
            className={`lg:col-span-6 bg-slate-100 p-5 sm:p-6 overflow-y-auto ${
              activeMobilePane === 'config' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Pré-visualização A4 em Tempo Real ({activeTemplateMeta.name})
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> Texto 100% Selecionável (ATS)
              </span>
            </div>

            {/* Simulated A4 Sheet */}
            <div
              data-testid="resume-live-preview"
              className="bg-white border border-slate-300 shadow-md rounded-lg p-6 sm:p-8 space-y-4 text-slate-900 font-sans min-h-[640px]"
            >
              {/* Header */}
              <div
                className={`pb-3 border-b-2 ${
                  selectedTemplate === 'modern_corporate'
                    ? 'border-blue-700'
                    : selectedTemplate === 'first_job_focus'
                      ? 'border-emerald-700'
                      : 'border-slate-800'
                }`}
              >
                <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-900">
                  {structuredPreview.name}
                </h1>
                <p
                  className={`text-sm font-bold mt-0.5 ${
                    selectedTemplate === 'modern_corporate'
                      ? 'text-blue-700'
                      : selectedTemplate === 'first_job_focus'
                        ? 'text-emerald-700'
                        : 'text-slate-700'
                  }`}
                >
                  OBJETIVO: {structuredPreview.role}
                </p>
                {contactItems.length > 0 && (
                  <p className="text-xs text-slate-600 mt-1">{contactItems.join(' | ')}</p>
                )}
                <p className="text-xs text-slate-500">{structuredPreview.locationLine}</p>
              </div>

              {/* Summary */}
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                  Resumo Profissional
                </h2>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  {structuredPreview.summary || 'Descreva seu resumo profissional no painel ao lado.'}
                </p>
              </div>

              {/* Experiences */}
              {structuredPreview.experiences.length > 0 && (
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-2">
                    Experiência Profissional
                  </h2>
                  <div className="space-y-2.5">
                    {structuredPreview.experiences.map((exp, idx) => (
                      <div key={idx}>
                        <div className="flex flex-wrap items-baseline justify-between gap-1">
                          <span className="text-xs font-bold text-slate-900">
                            {exp.role} — {exp.company}
                          </span>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            {exp.period}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">
                          • {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                  Formação Acadêmica
                </h2>
                {structuredPreview.educationLevel && (
                  <p className="text-xs font-semibold text-slate-800 mb-1">
                    Escolaridade: {structuredPreview.educationLevel}
                  </p>
                )}
                {structuredPreview.educationHistory.length > 0 && (
                  <ul className="space-y-1">
                    {structuredPreview.educationHistory.map((edu, idx) => (
                      <li key={idx} className="text-xs text-slate-700">
                        <strong className="text-slate-900">{edu.degree}</strong> — {edu.institution}{' '}
                        ({edu.completionYear || edu.status})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Skills */}
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-1.5">
                  Habilidades e Competências Técnicas
                </h2>
                <p className="text-xs text-slate-700">
                  {structuredPreview.skills.join(' • ') || 'Adicione suas competências ao lado.'}
                </p>
              </div>

              {/* Certifications & Languages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {structuredPreview.certifications.length > 0 && (
                  <div>
                    <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-1">
                      Cursos e Certificações
                    </h2>
                    <ul className="text-xs text-slate-700 space-y-0.5">
                      {structuredPreview.certifications.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 mb-1">
                    Idiomas
                  </h2>
                  <p className="text-xs text-slate-700">
                    {structuredPreview.languages.join(' • ')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
