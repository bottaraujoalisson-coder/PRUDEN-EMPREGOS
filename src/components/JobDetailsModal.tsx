import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  CheckCircle2,
  MessageCircle,
  Bookmark,
  Sparkles,
  Coins,
} from 'lucide-react';
import { Job, UserProfile } from '../types';
import {
  formatRelativeTime,
  formatJobSalary,
  getWhatsAppJobShareUrl,
  getDaysUntilExpiration,
  isCandidate,
  isCompany,
} from '../utils/matchAlgorithm';
import { APPLY_JOB_CREDIT_COST } from '../utils/creditsData';

interface JobDetailsModalProps {
  job: Job | null;
  currentUser: UserProfile | null;
  isApplied: boolean;
  isSaved?: boolean;
  onClose: () => void;
  onApply: (job: Job, screeningAnswers?: Record<string, 'sim' | 'nao'>) => void;
  onToggleSaveJob?: (jobId: string) => void;
  onManageOwnJob?: (job: Job) => void;
  onReport: (job: Job) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = ({
  job,
  currentUser,
  isApplied,
  isSaved = false,
  onClose,
  onApply,
  onToggleSaveJob,
  onManageOwnJob,
  onReport,
  showToast,
}) => {
  const [showScreeningStep, setShowScreeningStep] = useState(false);
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, 'sim' | 'nao'>>({});

  useEffect(() => {
    setShowScreeningStep(false);
    setScreeningAnswers({});
  }, [job?.id]);

  useEffect(() => {
    if (!job) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job, onClose]);

  const jobPostingJsonLd = useMemo(() => {
    if (!job) return null;
    const employmentTypeMap: Record<string, string> = {
      CLT: 'FULL_TIME',
      PJ: 'CONTRACTOR',
      Estágio: 'INTERN',
      Temporário: 'TEMPORARY',
      Freelancer: 'PART_TIME',
    };
    const schema: Record<string, any> = {
      '@context': 'https://schema.org/',
      '@type': 'JobPosting',
      title: job.title,
      description: job.description,
      datePosted: job.createdAt || new Date().toISOString(),
      validThrough: job.expiresAt || undefined,
      employmentType: employmentTypeMap[job.contract] || 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: job.companyName,
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: (job.location || 'Presidente Prudente, SP').split(',')[0].trim(),
          addressRegion: 'SP',
          addressCountry: 'BR',
        },
      },
    };
    if (job.workModel === 'Remoto') {
      schema.jobLocationType = 'TELECOMMUTE';
    }
    if (job.salaryMin || job.salaryMax) {
      schema.baseSalary = {
        '@type': 'MonetaryAmount',
        currency: 'BRL',
        value: {
          '@type': 'QuantitativeValue',
          minValue: job.salaryMin || job.salaryMax,
          maxValue: job.salaryMax || job.salaryMin,
          unitText: 'MONTH',
        },
      };
    }
    return JSON.stringify(schema);
  }, [job]);

  if (!job) return null;

  const userIsCandidate = isCandidate(currentUser);
  const userIsCompany = isCompany(currentUser);
  const isOwnCompanyJob =
    userIsCompany && currentUser !== null && job.companyId === currentUser.uid;

  const screeningQuestions = job.screeningQuestions ?? [];
  const benefits = job.benefits ?? [];
  const formattedSalary = formatJobSalary(job);
  const daysLeft = getDaysUntilExpiration(job);
  const isFirstJobFriendly =
    Boolean(job.acceptsFirstJob) || job.experience === 'Primeiro Emprego';
  const cnhReq = job.requiresCnh && job.requiresCnh !== 'nao' ? `CNH ${job.requiresCnh}` : null;
  const vehicleReq =
    job.requiresVehicle && job.requiresVehicle !== 'nao'
      ? job.requiresVehicle === 'moto'
        ? 'Exige moto própria'
        : 'Exige carro próprio'
      : null;

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: `${job.title} - ${job.companyName}`,
          text: `Vaga de ${job.title} em ${job.location || 'Presidente Prudente'} no PrudenEmpregos`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast('Link da vaga copiado.');
    }
  };

  const handleInitiateApply = () => {
    if (!currentUser) {
      onApply(job);
      return;
    }

    if (userIsCompany) {
      showToast(
        'Conta Empresarial (CNPJ) — Candidaturas são exclusivas para perfis de candidatos (CPF).',
        'error'
      );
      return;
    }

    if (screeningQuestions.length > 0) {
      setShowScreeningStep(true);
    } else {
      onApply(job);
    }
  };

  const handleConfirmScreeningSubmit = () => {
    const unanswered = screeningQuestions.some((q) => !screeningAnswers[q.id]);
    if (unanswered) {
      showToast('Responda todas as perguntas rápidas antes de confirmar.', 'error');
      return;
    }
    onApply(job, screeningAnswers);
    setShowScreeningStep(false);
  };

  const metadataLine = [
    job.companyName,
    job.location,
    job.workModel,
    job.contract,
    job.experience ? `Nível ${job.experience}` : null,
  ].filter(Boolean);

  const requirementItems = [
    isFirstJobFriendly ? 'Aceita Primeiro Emprego' : null,
    cnhReq,
    vehicleReq,
    ...(job.skills ?? []),
  ].filter(Boolean) as string[];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {jobPostingJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jobPostingJsonLd }}
        />
      )}

      <div
        className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-details-title"
        className="modal-surface w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-2xl flex flex-col relative z-10 overflow-hidden"
      >
        {/* Minimalist Header */}
        <div className="px-6 py-5 border-b border-[#EAECEF] bg-white flex justify-between items-start gap-4">
          <div className="flex items-start gap-3.5 min-w-0 flex-1">
            {job.companyLogoDataUrl ? (
              <img
                src={job.companyLogoDataUrl}
                alt={job.companyName}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-base flex items-center justify-center shrink-0">
                {(job.companyName || 'E').charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  id="job-details-title"
                  className="text-[20px] sm:text-[22px] font-bold text-[#0F172A] leading-snug"
                >
                  {job.title}
                </h1>
                {job.featured && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Sparkles className="w-3 h-3" /> Vaga Destacada
                  </span>
                )}
              </div>

              <p className="text-[13px] sm:text-[14px] text-[#64748B] mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {metadataLine.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-[#CBD5E1]">·</span>}
                    <span className={idx === 0 ? 'font-medium text-[#0F172A]' : ''}>
                      {item}
                    </span>
                  </React.Fragment>
                ))}
                <span className="text-[#CBD5E1]">·</span>
                <span>{formatRelativeTime(job.createdAt)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleShare}
              title="Copiar link da vaga"
              aria-label="Copiar link da vaga"
              className="w-9 h-9 inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes da vaga"
              className="w-9 h-9 inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-lg hover:bg-[#F4F4F5] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {showScreeningStep && screeningQuestions.length > 0 ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
            <div>
              <h2 className="text-[17px] font-bold text-[#0F172A]">
                Perguntas rápidas do recrutador ({screeningQuestions.length})
              </h2>
              <p className="text-[13px] text-[#64748B] mt-0.5">
                Leva menos de 15 segundos. Suas respostas seguem junto com seu currículo para {job.companyName}.
              </p>
            </div>

            <div className="space-y-3">
              {screeningQuestions.map((q, index) => {
                const selected = screeningAnswers[q.id];
                return (
                  <div
                    key={q.id}
                    className="p-4 bg-[#FAFAFA] border border-[#EAECEF] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <p className="text-[14px] font-medium text-[#0F172A]">
                      {index + 1}. {q.question}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setScreeningAnswers((prev) => ({ ...prev, [q.id]: 'sim' }))
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                          selected === 'sim'
                            ? 'bg-[#0F172A] text-white'
                            : 'bg-white text-[#0F172A] border border-[#E4E4E7]'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setScreeningAnswers((prev) => ({ ...prev, [q.id]: 'nao' }))
                        }
                        className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer ${
                          selected === 'nao'
                            ? 'bg-[#0F172A] text-white'
                            : 'bg-white text-[#0F172A] border border-[#E4E4E7]'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowScreeningStep(false)}
                className="btn-base btn-md btn-secondary"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmScreeningSubmit}
                className="btn-base btn-md btn-primary"
              >
                Confirmar e enviar ({APPLY_JOB_CREDIT_COST} créditos)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5 border-b border-[#EAECEF]">
              <div>
                <span className="block text-[12px] text-[#64748B]">Remuneração</span>
                <span className="text-[15px] font-semibold text-[#059669] tabular-nums">
                  {formattedSalary}
                </span>
              </div>
              <div>
                <span className="block text-[12px] text-[#64748B]">Modalidade e Contrato</span>
                <span className="text-[14px] font-semibold text-[#0F172A]">
                  {job.workModel} · {job.contract}
                </span>
              </div>
              <div>
                <span className="block text-[12px] text-[#64748B]">Prazo da oportunidade</span>
                <span className="text-[14px] font-medium text-[#0F172A] tabular-nums">
                  {daysLeft > 0 ? `Ativa por mais ${daysLeft} dias` : 'Encerrando hoje'}
                </span>
              </div>
            </div>

            <section>
              <h2 className="text-[14px] font-semibold text-[#0F172A] mb-2">
                Descrição e atribuições
              </h2>
              <div className="text-[15px] leading-relaxed text-[#334155] whitespace-pre-line">
                {job.description}
              </div>
            </section>

            {requirementItems.length > 0 && (
              <section className="pt-5 border-t border-[#EAECEF]">
                <h2 className="text-[14px] font-semibold text-[#0F172A] mb-2">
                  Requisitos e competências valorizadas
                </h2>
                <p className="text-[14px] text-[#334155] leading-relaxed">
                  {requirementItems.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="mx-2 text-[#CBD5E1]">·</span>}
                      <span className="font-medium">{item}</span>
                    </React.Fragment>
                  ))}
                </p>
              </section>
            )}

            {benefits.length > 0 && (
              <section className="pt-5 border-t border-[#EAECEF]">
                <h2 className="text-[14px] font-semibold text-[#0F172A] mb-2.5">
                  Benefícios oferecidos
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {benefits.map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-center gap-2 text-[14px] text-[#334155]"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="pt-4 border-t border-[#EAECEF] flex items-center justify-between text-[12px] text-[#64748B]">
              <span>Empresa local verificada na Receita Federal · Análise de compatibilidade gerada na candidatura</span>
              <button
                type="button"
                onClick={() => onReport(job)}
                className="hover:text-[#DC2626] transition-colors cursor-pointer"
              >
                Reportar vaga
              </button>
            </div>
          </div>
        )}

        {/* Unified Clean Bottom Action Bar */}
        {!showScreeningStep && (
          <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#EAECEF] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {userIsCandidate && onToggleSaveJob && (
                  <button
                    type="button"
                    onClick={() => onToggleSaveJob(job.id)}
                    aria-label={isSaved ? 'Remover das vagas salvas' : 'Salvar vaga'}
                    className={`btn-base btn-md btn-secondary px-3 ${
                      isSaved ? 'text-[#2563EB] border-[#BFDBFE] bg-[#EFF6FF]' : ''
                    }`}
                  >
                    <Bookmark className="w-4 h-4" />
                    <span className="hidden sm:inline">{isSaved ? 'Salva' : 'Salvar'}</span>
                  </button>
                )}

                <a
                  href={getWhatsAppJobShareUrl(job)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-base btn-md btn-secondary text-[#059669]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Compartilhar</span>
                </a>
              </div>

              <div className="flex-1 sm:flex-none flex justify-end">
                {userIsCompany ? (
                  isOwnCompanyJob ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onManageOwnJob?.(job);
                      }}
                      className="w-full sm:w-auto btn-base btn-md btn-primary"
                    >
                      Gerenciar candidatos
                    </button>
                  ) : (
                    <span className="text-[12px] text-[#64748B]">
                      Candidatura exclusiva para perfil Candidato (CPF)
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={handleInitiateApply}
                    disabled={isApplied}
                    className={`w-full sm:w-auto btn-base btn-md ${
                      isApplied
                        ? 'bg-[#ECFDF5] text-[#059669] border border-[#059669]/20 cursor-default'
                        : 'btn-primary'
                    }`}
                  >
                    {isApplied ? (
                      'Candidatura enviada ✓'
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Coins className="w-4 h-4" />
                        {screeningQuestions.length > 0
                          ? `Responder e candidatar-se (${APPLY_JOB_CREDIT_COST} cr)`
                          : `Candidatar-se agora (${APPLY_JOB_CREDIT_COST} cr)`}
                      </span>
                    )}
                  </button>
                )}
              </div>
            </div>

            {!userIsCompany && !isApplied && (
              <p className="text-[12px] text-[#64748B] text-right">
                Envio direto para {job.companyName} ({APPLY_JOB_CREDIT_COST} créditos) · Seus dados sensíveis ficam protegidos
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
