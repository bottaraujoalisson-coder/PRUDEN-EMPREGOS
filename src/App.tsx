import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { CandidateDashboard } from './components/CandidateDashboard';
import { CompanyDashboard } from './components/CompanyDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { JobDetailsModal } from './components/JobDetailsModal';
import { ReportModal } from './components/ReportModal';
import { LgpdModal } from './components/LgpdModal';
import { PlansView } from './components/PlansView';
import { MercadoPagoModal } from './components/MercadoPagoModal';
import { CreditLockModal } from './components/CreditLockModal';
import { Toast } from './components/Toast';
import {
  subscribeJobs,
  createJob,
  updateJob,
  deleteJob,
} from './services/jobsService';
import {
  subscribeCandidateApplications,
  subscribeCompanyApplications,
  applyToJob,
  updateApplicationStatus,
  withdrawApplication,
} from './services/applicationsService';
import {
  getUserProfile,
  saveUserProfile,
  checkIsAdmin,
  consumeUserCredits,
} from './services/usersService';
import { Job, Application, UserProfile, PricingPlan, PlanPeriod } from './types';
import {
  CreditPackage,
  CREDIT_PACKAGES,
  CANDIDATE_RESUME_CREDIT_PACKAGE,
  APPLY_JOB_CREDIT_COST,
  POST_JOB_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
} from './utils/creditsData';
import { isCandidate, isCompany } from './utils/matchAlgorithm';

export default function App() {
  const isAutostartCandidate =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const [currentView, setCurrentView] = useState<'home' | 'candidate' | 'company' | 'admin' | 'plans'>(
    isAutostartCandidate ? 'candidate' : 'home'
  );
  const [candidateSubTab, setCandidateSubTab] = useState<'applications' | 'resume' | 'saved'>('applications');
  const [companySubTab, setCompanySubTab] = useState<'jobs' | 'candidates' | 'post' | 'credits'>('jobs');
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<{ plan: PricingPlan; period: PlanPeriod } | null>(null);
  const [selectedCreditPackageForCheckout, setSelectedCreditPackageForCheckout] = useState<CreditPackage | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(
    isAutostartCandidate
      ? {
          uid: 'cand-preview-uid',
          name: 'Alisson',
          email: 'alissonboyt7@gmail.com',
          type: 'candidate',
          documentType: 'CPF',
          documentNumber: '',
          cpf: '',
          city: 'Presidente Prudente, SP',
          skills: [],
          savedJobIds: [],
          profileCompleteness: 25,
          credits: 5,
        }
      : null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setAuthLoading] = useState(true);

  // Real-time collections
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Popups
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const isAuthModalOpenRef = React.useRef(false);
  useEffect(() => {
    isAuthModalOpenRef.current = isAuthModalOpen;
  }, [isAuthModalOpen]);
  const [authModalRole, setAuthModalRole] = useState<'candidate' | 'company'>('candidate');
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [selectedJobForDetails, setSelectedJobForDetails] = useState<Job | null>(null);
  const [pendingJobForApply, setPendingJobForApply] = useState<Job | null>(null);

  // Credit Lock Modal state
  const [creditLockInfo, setCreditLockInfo] = useState<{
    isOpen: boolean;
    requiredCredits: number;
    actionTitle: string;
    actionDescription: string;
  }>({
    isOpen: false,
    requiredCredits: 10,
    actionTitle: '',
    actionDescription: '',
  });

  const [reportingTarget, setReportingTarget] = useState<{
    type: 'job' | 'company' | 'user';
    id: string;
    title: string;
  } | null>(null);
  const [isLgpdModalOpen, setIsLgpdModalOpen] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const openCreditLockAlert = (
    requiredCredits: number,
    actionTitle: string,
    actionDescription: string
  ) => {
    setCreditLockInfo({
      isOpen: true,
      requiredCredits,
      actionTitle,
      actionDescription,
    });
  };

  // Dynamic SEO document title per view / active job
  useEffect(() => {
    if (selectedJobForDetails) {
      document.title = `${selectedJobForDetails.title} em ${selectedJobForDetails.companyName} | PrudenEmpregos`;
      return;
    }
    if (currentView === 'candidate') {
      document.title = 'Área do Candidato | PrudenEmpregos';
    } else if (currentView === 'company') {
      document.title = 'Painel da Empresa | PrudenEmpregos';
    } else if (currentView === 'admin') {
      document.title = 'Administração | PrudenEmpregos';
    } else if (currentView === 'plans') {
      document.title = 'Planos e Vantagens | PrudenEmpregos';
    } else {
      document.title = 'PrudenEmpregos | Vagas de Emprego em Presidente Prudente e Região';
    }
  }, [currentView, selectedJobForDetails]);

  const navigateTo = (view: string, subTab?: string) => {
    if (view === 'company' && currentUser && isCandidate(currentUser) && !isAdmin) {
      showToast('Acesso restrito a empresas cadastradas com CNPJ.', 'error');
      setCurrentView('candidate');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'candidate' && currentUser && isCompany(currentUser) && !isAdmin) {
      setCurrentView('company');
      if (subTab === 'jobs' || subTab === 'candidates' || subTab === 'post' || subTab === 'credits') {
        setCompanySubTab(subTab);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (view === 'candidate' && subTab) {
      if (subTab === 'applications' || subTab === 'resume' || subTab === 'saved') {
        setCandidateSubTab(subTab);
      }
    }

    if (view === 'company' && subTab) {
      if (subTab === 'jobs' || subTab === 'candidates' || subTab === 'post' || subTab === 'credits') {
        setCompanySubTab(subTab);
      }
    }

    setCurrentView(view as any);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Listen for Real-Time Jobs
  useEffect(() => {
    const unsubscribe = subscribeJobs((loadedJobs) => {
      setJobs(loadedJobs);
    });
    return () => unsubscribe();
  }, []);

  // 2. Listen to Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          let profile = await getUserProfile(firebaseUser.uid);

          if (!profile) {
            await new Promise((resolve) => setTimeout(resolve, 450));
            profile = await getUserProfile(firebaseUser.uid);
          }

          if (profile) {
            const adminCheck = await checkIsAdmin(firebaseUser.uid, firebaseUser.email);
            setIsAdmin(adminCheck);
            if (adminCheck && profile.type !== 'admin') {
              const promoted: UserProfile = { ...profile, type: 'admin' };
              await saveUserProfile(firebaseUser.uid, { type: 'admin' });
              setCurrentUser(promoted);
            } else {
              setCurrentUser(profile);
            }
          } else if (!isAuthModalOpenRef.current) {
            await signOut(auth);
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else if (!isAutostartCandidate) {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Listen to User's Applications (Candidate or Company)
  useEffect(() => {
    if (!currentUser) {
      setApplications([]);
      return;
    }

    if (isCandidate(currentUser)) {
      const unsub = subscribeCandidateApplications(currentUser.uid, (apps) => {
        setApplications(apps);
      });
      return () => unsub();
    } else if (isCompany(currentUser) || currentUser.type === 'admin') {
      const unsub = subscribeCompanyApplications(currentUser.uid, (apps) => {
        setApplications(apps);
      });
      return () => unsub();
    }
  }, [currentUser]);

  // Apply to Job: Require >= 10 credits, debit 10 credits, and run weighted Match Engine exclusively on confirmation
  const handleApply = async (
    job: Job,
    screeningAnswers?: Record<string, 'sim' | 'nao'>
  ) => {
    if (!currentUser) {
      setPendingJobForApply(job);
      setAuthModalRole('candidate');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      showToast('Entre ou crie sua conta de candidato (CPF) para concluir sua candidatura.', 'error');
      return;
    }

    if (isCompany(currentUser)) {
      showToast(
        'Conta Empresarial (CNPJ) — Candidaturas são exclusivas para perfis de candidatos (CPF).',
        'error'
      );
      return;
    }

    const currentCredits = Number(currentUser.credits || 0);
    if (currentCredits < APPLY_JOB_CREDIT_COST) {
      openCreditLockAlert(
        APPLY_JOB_CREDIT_COST,
        `Candidatar-se à vaga: ${job.title}`,
        `Para confirmar sua candidatura e acionar a análise inteligente de compatibilidade para a empresa ${job.companyName}, é necessário saldo mínimo de ${APPLY_JOB_CREDIT_COST} créditos.`
      );
      return;
    }

    try {
      const debitRes = await consumeUserCredits(currentUser, {
        action: 'apply_job',
        targetId: job.id,
        description: `Candidatura enviada para a vaga: ${job.title} (${job.companyName})`,
      });

      setCurrentUser((prev) => (prev ? { ...prev, credits: debitRes.newBalance } : null));

      await applyToJob(job, { ...currentUser, credits: debitRes.newBalance }, screeningAnswers);
      showToast(
        `Candidatura enviada com sucesso! (-${debitRes.creditsDebited} créditos • Saldo: ${debitRes.newBalance} cr)`
      );
      setPendingJobForApply(null);
      if (selectedJobForDetails) {
        setSelectedJobForDetails(null);
      }
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_CREDITS') {
        openCreditLockAlert(
          APPLY_JOB_CREDIT_COST,
          `Candidatar-se à vaga: ${job.title}`,
          err.message || `Saldo insuficiente. São necessários ${APPLY_JOB_CREDIT_COST} créditos para confirmar a candidatura.`
        );
        return;
      }
      showToast(err.message || 'Erro ao enviar candidatura.', 'error');
    }
  };

  // Publish New Job (Company): Require >= 10 credits (or +15 if also featured) and debit upon publishing
  const handlePostCompanyJob = async (
    jobData: Omit<Job, 'id' | 'createdAt' | 'applicantCount'>
  ) => {
    if (!currentUser) return;
    const wantsFeatured = Boolean(jobData.featured || jobData.premium);
    const totalRequired =
      POST_JOB_CREDIT_COST + (wantsFeatured ? BOOST_JOB_CREDIT_COST : 0);
    const currentCredits = Number(currentUser.credits || 0);

    if (currentCredits < totalRequired) {
      openCreditLockAlert(
        totalRequired,
        wantsFeatured
          ? 'Publicar e Destacar Nova Vaga'
          : 'Publicar Nova Vaga Corporativa',
        wantsFeatured
          ? `Para publicar uma nova vaga (${POST_JOB_CREDIT_COST} cr) já destacada no topo do mural (+${BOOST_JOB_CREDIT_COST} cr), sua conta precisa de pelo menos ${totalRequired} créditos.`
          : `Para publicar uma nova oportunidade no mural de Presidente Prudente, é necessário saldo mínimo de ${POST_JOB_CREDIT_COST} créditos.`
      );
      throw new Error('INSUFFICIENT_CREDITS');
    }

    const postDebit = await consumeUserCredits(currentUser, {
      action: 'post_job',
      description: `Publicação da vaga: ${jobData.title}`,
    });

    let latestBalance = postDebit.newBalance;
    if (wantsFeatured) {
      const boostDebit = await consumeUserCredits(
        { ...currentUser, credits: latestBalance },
        {
          action: 'boost_job',
          description: `Destaque/Impulsionamento da vaga: ${jobData.title}`,
        }
      );
      latestBalance = boostDebit.newBalance;
    }

    setCurrentUser((prev) => (prev ? { ...prev, credits: latestBalance } : null));
    await createJob(jobData);
    showToast(
      `Vaga publicada com sucesso! (-${totalRequired} créditos • Saldo: ${latestBalance} cr)`
    );
  };

  // Highlight / Boost Existing Job (Company): Require >= 15 credits and debit 15 credits
  const handleBoostCompanyJob = async (job: Job) => {
    if (!currentUser) return;
    const currentCredits = Number(currentUser.credits || 0);
    if (currentCredits < BOOST_JOB_CREDIT_COST) {
      openCreditLockAlert(
        BOOST_JOB_CREDIT_COST,
        `Destacar Vaga: ${job.title}`,
        `Para destacar e impulsionar sua vaga no topo das buscas em Presidente Prudente, é necessário saldo mínimo de ${BOOST_JOB_CREDIT_COST} créditos.`
      );
      return;
    }

    try {
      const debitRes = await consumeUserCredits(currentUser, {
        action: 'boost_job',
        targetId: job.id,
        description: `Destaque/Impulsionamento da vaga: ${job.title}`,
      });
      setCurrentUser((prev) => (prev ? { ...prev, credits: debitRes.newBalance } : null));
      await updateJob(job.id, { featured: true, premium: true });
      showToast(
        `Vaga "${job.title}" destacada no topo do mural! (-${BOOST_JOB_CREDIT_COST} créditos)`
      );
    } catch (err: any) {
      if (err?.code === 'INSUFFICIENT_CREDITS') {
        openCreditLockAlert(
          BOOST_JOB_CREDIT_COST,
          `Destacar Vaga: ${job.title}`,
          err.message
        );
        return;
      }
      showToast(err.message || 'Erro ao destacar vaga.', 'error');
    }
  };

  const handleToggleSaveJob = async (jobId: string) => {
    if (!currentUser) {
      setAuthModalRole('candidate');
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      showToast('Entre com sua conta de candidato (CPF) para salvar vagas.', 'error');
      return;
    }

    if (isCompany(currentUser)) {
      showToast('Apenas perfis de candidato (CPF) podem favoritar vagas.', 'error');
      return;
    }

    const currentSaved = currentUser.savedJobIds ?? [];
    const exists = currentSaved.includes(jobId);
    const updatedSaved = exists
      ? currentSaved.filter((id) => id !== jobId)
      : [...currentSaved, jobId];

    try {
      await saveUserProfile(currentUser.uid, { savedJobIds: updatedSaved });
      setCurrentUser((prev) => (prev ? { ...prev, savedJobIds: updatedSaved } : null));
      showToast(
        exists
          ? 'Vaga removida das suas vagas salvas.'
          : 'Vaga salva no seu painel de candidato!'
      );
    } catch {
      showToast('Erro ao atualizar vagas salvas.', 'error');
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    if (!currentUser) return;
    await saveUserProfile(currentUser.uid, updatedData);
    setCurrentUser((prev) => (prev ? { ...prev, ...updatedData } : null));
  };

  const handleWithdrawApplication = async (appId: string) => {
    try {
      await withdrawApplication(appId);
      setApplications((prev) => prev.filter((a) => a.id !== appId));
      showToast('Candidatura cancelada com sucesso.');
    } catch {
      showToast('Erro ao cancelar candidatura.', 'error');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    navigateTo('home');
    showToast('Você saiu da sua conta.');
  };

  const handleBuyCreditsFromLockModal = (planId: string) => {
    const matchedPkg =
      CREDIT_PACKAGES.find((p) => p.id === planId) ||
      (isCompany(currentUser) ? CREDIT_PACKAGES[0] : CANDIDATE_RESUME_CREDIT_PACKAGE);
    setSelectedPlanForCheckout(null);
    setSelectedCreditPackageForCheckout(matchedPkg);
  };

  const appliedJobIds = !isCompany(currentUser)
    ? applications.map((a) => a.jobId)
    : [];

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#FAFAFA] text-[#0F172A] selection:bg-[#2563EB] selection:text-white">
      <Navbar
        currentUser={currentUser}
        isAdmin={isAdmin}
        currentView={currentView}
        candidateSubTab={candidateSubTab}
        companySubTab={companySubTab}
        onNavigate={navigateTo}
        onOpenAuth={(role, mode) => {
          setAuthModalRole(role);
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onOpenLgpd={() => setIsLgpdModalOpen(true)}
      />

      <div className="flex-grow">
        {currentView === 'home' && (
          <HomeView
            jobs={jobs}
            currentUser={currentUser}
            appliedJobIds={appliedJobIds}
            savedJobIds={currentUser?.savedJobIds ?? []}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onApply={handleApply}
            onViewJobDetails={(job) => setSelectedJobForDetails(job)}
            onNavigate={navigateTo}
            onOpenAuth={(role, mode) => {
              setAuthModalRole(role);
              setAuthModalMode(mode || 'register');
              setIsAuthModalOpen(true);
            }}
            onToggleSaveJob={handleToggleSaveJob}
            showToast={showToast}
          />
        )}

        {currentView === 'candidate' && currentUser && (
          <CandidateDashboard
            user={currentUser}
            jobs={jobs}
            applications={applications}
            onUpdateProfile={handleUpdateProfile}
            onWithdrawApplication={handleWithdrawApplication}
            onSelectCreditPackage={(pkg) => {
              setSelectedPlanForCheckout(null);
              setSelectedCreditPackageForCheckout(pkg);
            }}
            onCreditsUpdated={(newBalance) => {
              setCurrentUser((prev) => (prev ? { ...prev, credits: newBalance } : null));
            }}
            onRequireCredits={openCreditLockAlert}
            showToast={showToast}
            onNavigate={navigateTo}
            onViewJobDetails={(job) => setSelectedJobForDetails(job)}
            onToggleSaveJob={handleToggleSaveJob}
            activeSubTab={candidateSubTab}
            onSubTabChange={setCandidateSubTab}
          />
        )}

        {currentView === 'company' && currentUser && (
          <CompanyDashboard
            user={currentUser}
            jobs={jobs}
            applications={applications}
            onUpdateProfile={handleUpdateProfile}
            onPostJob={handlePostCompanyJob}
            onBoostJob={handleBoostCompanyJob}
            onUpdateJob={async (jobId, updates) => {
              await updateJob(jobId, updates);
            }}
            onDeleteJob={async (jobId) => {
              await deleteJob(jobId);
              showToast('Vaga excluída com sucesso.');
            }}
            onUpdateAppStatus={async (appId, newStatus, notes, viewedAt) => {
              await updateApplicationStatus(appId, newStatus, notes, viewedAt);
            }}
            onSelectCreditPackage={(pkg) => {
              setSelectedPlanForCheckout(null);
              setSelectedCreditPackageForCheckout(pkg);
            }}
            onCreditsUpdated={(newBalance) => {
              setCurrentUser((prev) => (prev ? { ...prev, credits: newBalance } : null));
            }}
            showToast={showToast}
            onNavigate={navigateTo}
            activeSubTab={companySubTab}
            onSubTabChange={setCompanySubTab}
          />
        )}

        {currentView === 'plans' && (
          <PlansView
            currentUser={currentUser}
            initialRole={currentUser && isCompany(currentUser) ? 'company' : 'candidate'}
            onSelectPlan={(plan, period) => {
              setSelectedCreditPackageForCheckout(null);
              setSelectedPlanForCheckout({ plan, period });
            }}
            onSelectCreditPackage={(pkg) => {
              setSelectedPlanForCheckout(null);
              setSelectedCreditPackageForCheckout(pkg);
            }}
            onNavigate={navigateTo}
            onOpenAuth={(type, mode) => {
              setAuthModalRole(type);
              setAuthModalMode(mode || 'register');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {currentView === 'admin' && isAdmin && currentUser && (
          <AdminDashboard
            currentUser={currentUser}
            jobs={jobs}
            onPostJob={async (jobData) => {
              await createJob(jobData);
            }}
            onUpdateJob={async (jobId, updates) => {
              await updateJob(jobId, updates);
              showToast('Vaga atualizada pelo Administrador.');
            }}
            onDeleteJob={async (jobId) => {
              await deleteJob(jobId);
              showToast('Vaga excluída pelo Administrador.');
            }}
            showToast={showToast}
          />
        )}
      </div>

      {/* Global Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialType={authModalRole}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(profile) => {
          setCurrentUser(profile);
          if (profile.type === 'admin') {
            setIsAdmin(true);
          }
          if (pendingJobForApply && isCandidate(profile)) {
            setSelectedJobForDetails(pendingJobForApply);
            setPendingJobForApply(null);
            return;
          }
          if (isCompany(profile)) {
            navigateTo('company', 'jobs');
          } else if (isCandidate(profile)) {
            navigateTo('candidate', 'applications');
          } else if (profile.type === 'admin') {
            navigateTo('admin');
          }
        }}
        showToast={showToast}
      />

      <JobDetailsModal
        job={selectedJobForDetails}
        currentUser={currentUser}
        isApplied={
          selectedJobForDetails ? appliedJobIds.includes(selectedJobForDetails.id) : false
        }
        isSaved={
          selectedJobForDetails
            ? (currentUser?.savedJobIds ?? []).includes(selectedJobForDetails.id)
            : false
        }
        onClose={() => setSelectedJobForDetails(null)}
        onApply={handleApply}
        onToggleSaveJob={handleToggleSaveJob}
        onManageOwnJob={() => {
          setSelectedJobForDetails(null);
          navigateTo('company', 'candidates');
        }}
        onReport={(job) => {
          setReportingTarget({
            type: 'job',
            id: job.id,
            title: `${job.title} (${job.companyName})`,
          });
          setSelectedJobForDetails(null);
        }}
        showToast={showToast}
      />

      <CreditLockModal
        isOpen={creditLockInfo.isOpen}
        onClose={() => setCreditLockInfo((prev) => ({ ...prev, isOpen: false }))}
        user={currentUser}
        requiredCredits={creditLockInfo.requiredCredits}
        actionTitle={creditLockInfo.actionTitle}
        actionDescription={creditLockInfo.actionDescription}
        onBuyCredits={handleBuyCreditsFromLockModal}
        onOpenPlansView={() => navigateTo('plans')}
      />

      {reportingTarget && (
        <ReportModal
          isOpen={Boolean(reportingTarget)}
          targetType={reportingTarget.type}
          targetId={reportingTarget.id}
          targetTitle={reportingTarget.title}
          reporterId={currentUser?.uid}
          onClose={() => setReportingTarget(null)}
          showToast={showToast}
        />
      )}

      <MercadoPagoModal
        isOpen={Boolean(selectedPlanForCheckout || selectedCreditPackageForCheckout)}
        plan={selectedPlanForCheckout?.plan || null}
        creditPackage={selectedCreditPackageForCheckout}
        period={selectedPlanForCheckout?.period || 'monthly'}
        currentUser={currentUser}
        onClose={() => {
          setSelectedPlanForCheckout(null);
          setSelectedCreditPackageForCheckout(null);
        }}
        onPlanActivated={(updatedUser) => {
          setCurrentUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
          if (updatedUser.planId && updatedUser.planId.startsWith('company')) {
            navigateTo('company', 'jobs');
          } else if (updatedUser.planId && updatedUser.planId.startsWith('candidate')) {
            navigateTo('candidate', 'applications');
          }
        }}
        onCreditsPurchased={(newBalance) => {
          setCurrentUser((prev) => (prev ? { ...prev, credits: newBalance } : null));
        }}
        onRequireAuth={() => {
          const target = selectedCreditPackageForCheckout
            ? 'company'
            : selectedPlanForCheckout?.plan.targetRole || 'candidate';
          setSelectedPlanForCheckout(null);
          setSelectedCreditPackageForCheckout(null);
          setAuthModalRole(target);
          setAuthModalMode('register');
          setIsAuthModalOpen(true);
        }}
        showToast={showToast}
      />

      <LgpdModal
        isOpen={isLgpdModalOpen}
        onClose={() => setIsLgpdModalOpen(false)}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      {/* Minimalist Single-Row Footer */}
      <footer className="bg-white border-t border-[#EAECEF] mt-auto">
        <div className="container-app py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#0F172A]">PrudenEmpregos</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} Presidente Prudente, SP</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Vagas
            </button>
            <button
              type="button"
              onClick={() => navigateTo('plans')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Planos & Vantagens
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentUser && isCandidate(currentUser)) {
                  navigateTo('candidate', 'resume');
                } else {
                  setAuthModalRole('candidate');
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }
              }}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Candidatos
            </button>
            <button
              type="button"
              onClick={() => {
                if (currentUser && isCompany(currentUser)) {
                  navigateTo('company', 'post');
                } else {
                  setAuthModalRole('company');
                  setAuthModalMode('register');
                  setIsAuthModalOpen(true);
                }
              }}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Empresas
            </button>
            <button
              type="button"
              onClick={() => setIsLgpdModalOpen(true)}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Privacidade
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
