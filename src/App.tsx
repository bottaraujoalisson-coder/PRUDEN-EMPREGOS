import React, { useState, useEffect, Suspense } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase/config';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { AuthModal } from './components/AuthModal';
import { CompleteOnboardingModal } from './components/CompleteOnboardingModal';
import { JobDetailsModal } from './components/JobDetailsModal';
import { ReportModal } from './components/ReportModal';
import { LgpdModal } from './components/LgpdModal';
import { MercadoPagoModal } from './components/MercadoPagoModal';
import { CreditLockModal } from './components/CreditLockModal';
import { Toast } from './components/Toast';

const CandidateDashboard = React.lazy(() =>
  import('./components/CandidateDashboard').then((m) => ({ default: m.CandidateDashboard }))
);
const CompanyDashboard = React.lazy(() =>
  import('./components/CompanyDashboard').then((m) => ({ default: m.CompanyDashboard }))
);
const AdminDashboard = React.lazy(() =>
  import('./components/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const PlansView = React.lazy(() =>
  import('./components/PlansView').then((m) => ({ default: m.PlansView }))
);
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
import {
  getActiveSessionUid,
  setActiveSessionUid,
} from './services/directCloudAuth';
import { confirmAndCreditOrder } from './services/mercadopagoService';
import { Job, Application, UserProfile, PricingPlan, PlanPeriod } from './types';
import {
  CreditPackage,
  CREDIT_PACKAGES,
  CANDIDATE_RESUME_CREDIT_PACKAGE,
  INITIAL_WELCOME_CREDITS,
  APPLY_JOB_CREDIT_COST,
  POST_JOB_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
} from './utils/creditsData';
import { isCandidate, isCompany } from './utils/matchAlgorithm';

export default function App() {
  const isAutostartCandidate =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('autostart') === '1';

  const getInitialViewFromUrl = (): 'home' | 'candidate' | 'company' | 'admin' | 'plans' => {
    if (typeof window === 'undefined') return 'home';
    if (isAutostartCandidate) return 'candidate';
    const path = window.location.pathname.toLowerCase();
    if (path === '/planos' || path === '/creditos') return 'plans';
    if (path === '/candidato' || path === '/painel/candidato') return 'candidate';
    if (path === '/empresa' || path === '/painel/empresa') return 'company';
    if (path === '/admin') return 'admin';
    return 'home';
  };

  const [currentView, setCurrentView] = useState<'home' | 'candidate' | 'company' | 'admin' | 'plans'>(
    getInitialViewFromUrl
  );
  const [candidateSubTab, setCandidateSubTab] = useState<'applications' | 'resume' | 'saved' | 'alerts'>('applications');
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
          credits: INITIAL_WELCOME_CREDITS,
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
  const [institutionalModal, setInstitutionalModal] = useState<'about' | 'terms' | null>(null);

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
      if (
        subTab === 'applications' ||
        subTab === 'resume' ||
        subTab === 'saved' ||
        subTab === 'alerts'
      ) {
        setCandidateSubTab(subTab);
      }
    }

    if (view === 'company' && subTab) {
      if (subTab === 'jobs' || subTab === 'candidates' || subTab === 'post' || subTab === 'credits') {
        setCompanySubTab(subTab);
      }
    }

    setCurrentView(view as any);
    if (typeof window !== 'undefined') {
      const targetPath =
        view === 'plans'
          ? '/planos'
          : view === 'candidate'
          ? '/candidato'
          : view === 'company'
          ? '/empresa'
          : view === 'admin'
          ? '/admin'
          : '/';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({ view, subTab }, '', targetPath);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sincroniza botão Voltar / Avançar do navegador (popstate)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const vagaParam = params.get('vaga');
      const vagaPathMatch = window.location.pathname.match(/^\/vaga\/([^/]+)$/i);
      const targetJobId = vagaParam || (vagaPathMatch ? vagaPathMatch[1] : null);

      if (targetJobId && jobs.length > 0) {
        const found = jobs.find((j) => j.id === targetJobId);
        if (found) {
          setSelectedJobForDetails(found);
          setCurrentView('home');
          return;
        }
      } else {
        setSelectedJobForDetails(null);
      }

      if (path === '/planos' || path === '/creditos') {
        setCurrentView('plans');
      } else if (path === '/candidato' || path === '/painel/candidato') {
        setCurrentView('candidate');
      } else if (path === '/empresa' || path === '/painel/empresa') {
        setCurrentView('company');
      } else if (path === '/admin') {
        setCurrentView('admin');
      } else {
        setCurrentView('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [jobs]);

  // 1. Listen for Real-Time Jobs & Deep Link Opening (/vaga/:id or /?vaga=:id)
  useEffect(() => {
    const unsubscribe = subscribeJobs((loadedJobs) => {
      setJobs(loadedJobs);
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const vagaParam = params.get('vaga');
        const vagaPathMatch = window.location.pathname.match(/^\/vaga\/([^/]+)$/i);
        const targetJobId = vagaParam || (vagaPathMatch ? vagaPathMatch[1] : null);
        if (targetJobId) {
          const found = loadedJobs.find((j) => j.id === targetJobId);
          if (found) {
            setSelectedJobForDetails(found);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 1.1 Inject Dynamic Schema.org JobPosting JSON-LD for Google Jobs Local SEO
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeJobsList = jobs.filter((j) => !j.status || j.status === 'active').slice(0, 10);
    const employmentTypeMap: Record<string, string> = {
      CLT: 'FULL_TIME',
      PJ: 'CONTRACTOR',
      Estágio: 'INTERN',
      Temporário: 'TEMPORARY',
      'Jovem Aprendiz': 'PART_TIME',
    };

    const jobPostingsGraph = activeJobsList.map((job) => {
      const locality = (job.location || 'Presidente Prudente, SP').split(',')[0].trim();
      const item: Record<string, any> = {
        '@context': 'https://schema.org/',
        '@type': 'JobPosting',
        title: job.title,
        description: job.description,
        datePosted: job.createdAt || new Date().toISOString(),
        validThrough:
          job.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        employmentType: employmentTypeMap[job.contract] || 'FULL_TIME',
        hiringOrganization: {
          '@type': 'Organization',
          name: job.companyName,
          sameAs: 'https://prudenempregos.com.br',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: locality || 'Presidente Prudente',
            addressRegion: 'SP',
            addressCountry: 'BR',
          },
        },
      };
      if (job.workModel === 'Remoto') {
        item.jobLocationType = 'TELECOMMUTE';
      }
      if (job.salaryMin || job.salaryMax) {
        item.baseSalary = {
          '@type': 'MonetaryAmount',
          currency: 'BRL',
          value: {
            '@type': 'QuantitativeValue',
            value: job.salaryMin || job.salaryMax,
            minValue: job.salaryMin || job.salaryMax,
            maxValue: job.salaryMax || job.salaryMin,
            unitText: 'MONTH',
          },
        };
      }
      return item;
    });

    let scriptEl = document.getElementById('dynamic-jobs-jsonld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'dynamic-jobs-jsonld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': jobPostingsGraph,
    });
  }, [jobs]);

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
            const adminCheck = await checkIsAdmin(firebaseUser.uid, firebaseUser.email);
            const now = new Date().toISOString();
            const fallbackName =
              firebaseUser.displayName ||
              (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Usuário');
            const autoProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: fallbackName,
              type: adminCheck ? 'admin' : 'candidate',
              city: 'Presidente Prudente, SP',
              state: 'SP',
              skills: [],
              credits: INITIAL_WELCOME_CREDITS,
              profileCompleteness: 40,
              savedJobIds: [],
              isVerified: true,
              createdAt: now,
              updatedAt: now,
            };
            await saveUserProfile(firebaseUser.uid, autoProfile);
            setIsAdmin(adminCheck);
            setCurrentUser(autoProfile);
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      } else if (!isAutostartCandidate) {
        const storedUid = getActiveSessionUid();
        if (storedUid) {
          try {
            const profile = await getUserProfile(storedUid);
            if (profile) {
              const adminCheck = await checkIsAdmin(storedUid, profile.email);
              setIsAdmin(adminCheck);
              if (adminCheck && profile.type !== 'admin') {
                const promoted: UserProfile = { ...profile, type: 'admin' };
                await saveUserProfile(storedUid, { type: 'admin' });
                setCurrentUser(promoted);
              } else {
                setCurrentUser(profile);
              }
              setAuthLoading(false);
              return;
            } else {
              setActiveSessionUid(null);
            }
          } catch {
            // ignore
          }
        }
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

  // 4. Handle Mercado Pago Checkout Pro Return URL Callbacks (?mp_status=approved&order=...)
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get('mp_status');
    const orderId = params.get('order');
    const paymentId = params.get('payment_id') || params.get('collection_id') || undefined;

    if (!mpStatus) return;

    // Clean query params from URL to prevent re-triggering on refresh
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    if (mpStatus === 'approved' && orderId) {
      confirmAndCreditOrder(currentUser, orderId, paymentId)
        .then((res) => {
          setCurrentUser((prev) => (prev ? { ...prev, credits: res.newBalance } : null));
          setCurrentView('plans');
          showToast(
            res.alreadyProcessed
              ? `Pedido confirmado! Saldo disponível: ${res.newBalance} créditos.`
              : `Pagamento aprovado no Mercado Pago! +${res.creditsAdded} créditos liberados (Saldo: ${res.newBalance} cr).`
          );
        })
        .catch(() => {
          showToast('Não foi possível sincronizar o pedido automaticamente. Verifique na aba Créditos.', 'error');
        });
    } else if (mpStatus === 'pending') {
      setCurrentView('plans');
      showToast('Pagamento em processamento no Mercado Pago. Seus créditos serão liberados após confirmação.');
    } else if (mpStatus === 'failure') {
      setCurrentView('plans');
      showToast('O pagamento não foi concluído no Mercado Pago. Tente novamente via Pix ou Cartão.', 'error');
    }
  }, [currentUser]);

  // Apply to Job: Require >= 10 credits, debit 10 credits, and run weighted Match Engine exclusively on confirmation
  const handleApply = async (
    job: Job,
    screeningAnswers?: Record<string, 'sim' | 'nao'>
  ) => {
    if (!currentUser) {
      try {
        sessionStorage.setItem('pendingJobId', job.id);
      } catch {
        // ignore
      }
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
    setActiveSessionUid(null);
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    setIsAdmin(false);
    navigateTo('home');
    showToast('Você saiu da sua conta.');
  };

  const handleBuyCreditsFromLockModal = (planId: string) => {
    const allPkgs = [CANDIDATE_RESUME_CREDIT_PACKAGE, ...CREDIT_PACKAGES];
    const matchedPkg =
      allPkgs.find((p) => p.id === planId) ||
      (isCompany(currentUser) ? CREDIT_PACKAGES[0] : CANDIDATE_RESUME_CREDIT_PACKAGE);
    setSelectedPlanForCheckout(null);
    setSelectedCreditPackageForCheckout(matchedPkg);
  };

  const appliedJobIds = !isCompany(currentUser)
    ? applications.map((a) => a.jobId)
    : [];

  return (
    <div className="flex flex-col min-h-screen font-sans bg-[#F4F7FE] text-[#0F172A] selection:bg-[#1D4ED8] selection:text-white">
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
            onViewJobDetails={(job) => {
              setSelectedJobForDetails(job);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('vaga', job.id);
                window.history.pushState({ jobId: job.id }, '', `${url.pathname}?${url.searchParams.toString()}`);
              }
            }}
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

        <Suspense
          fallback={
            <div className="p-10 text-center text-slate-500 text-sm font-medium">
              Carregando módulo...
            </div>
          }
        >
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
              onCreditsUpdated={(newBalance) => {
                setCurrentUser((prev) => (prev ? { ...prev, credits: newBalance } : null));
              }}
              showToast={showToast}
              onNavigate={navigateTo}
              onOpenAuth={(type, mode) => {
                setAuthModalRole(type || 'candidate');
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
        </Suspense>
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
          let storedPendingId: string | null = null;
          try {
            storedPendingId = sessionStorage.getItem('pendingJobId');
            if (storedPendingId) sessionStorage.removeItem('pendingJobId');
          } catch {
            // ignore
          }
          const resolvedPendingJob =
            pendingJobForApply ||
            (storedPendingId ? jobs.find((j) => j.id === storedPendingId) || null : null);

          if (resolvedPendingJob && isCandidate(profile)) {
            setSelectedJobForDetails(resolvedPendingJob);
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

      {currentUser &&
        currentUser.onboardingCompleted === false &&
        !currentUser.cpf &&
        !currentUser.cnpj &&
        !currentUser.documentNumber && (
          <CompleteOnboardingModal
            userName={currentUser.name}
            userEmail={currentUser.email}
            onCompleted={async () => {
              const refreshed = await getUserProfile(currentUser.uid);
              if (refreshed) {
                setCurrentUser(refreshed);
              }
            }}
          />
        )}

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
        onClose={() => {
          setSelectedJobForDetails(null);
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (url.searchParams.has('vaga') || url.pathname.startsWith('/vaga/')) {
              url.searchParams.delete('vaga');
              const cleanSearch = url.searchParams.toString();
              const basePath = url.pathname.startsWith('/vaga/') ? '/' : url.pathname;
              window.history.replaceState({}, '', cleanSearch ? `${basePath}?${cleanSearch}` : basePath);
            }
          }
        }}
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
        onCreditsPurchased={(newBalance, creditsAdded, packageTitle) => {
          setCurrentUser((prev) => (prev ? { ...prev, credits: newBalance } : null));
          showToast(
            `Pagamento aprovado! +${creditsAdded} créditos do ${packageTitle} adicionados (Saldo: ${newBalance} cr).`
          );
        }}
        onRequireAuth={() => {
          const target =
            selectedCreditPackageForCheckout?.id === 'pack_resume_15'
              ? 'candidate'
              : selectedCreditPackageForCheckout
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

      {/* Modal Institucional: Sobre Nós / Termos de Uso */}
      {institutionalModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[1px]"
            onClick={() => setInstitutionalModal(null)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="institutional-modal-title"
            className="modal-surface w-full sm:max-w-xl max-h-[88vh] rounded-t-2xl sm:rounded-2xl p-6 relative z-10 overflow-y-auto bg-white space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECEF]">
              <h2 id="institutional-modal-title" className="text-[18px] font-bold text-[#0F172A]">
                {institutionalModal === 'about'
                  ? 'Sobre o PrudenEmpregos'
                  : 'Termos de Uso e Regras da Plataforma'}
              </h2>
              <button
                type="button"
                onClick={() => setInstitutionalModal(null)}
                className="px-2.5 py-1 rounded-lg text-[13px] font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                Fechar ✕
              </button>
            </div>

            {institutionalModal === 'about' ? (
              <div className="space-y-3 text-[14px] text-[#334155] leading-relaxed">
                <p>
                  O <strong>PrudenEmpregos</strong> nasceu com a missão de conectar talentos e empresas de <strong>Presidente Prudente e toda a região do Oeste Paulista</strong> com agilidade, transparência e segurança.
                </p>
                <p>
                  Diferente de plataformas genéricas nacionais, nosso portal foi projetado especificamente para a realidade do comércio, indústria, serviços, agronegócio e setor de tecnologia de Presidente Prudente, permitindo candidaturas diretas com 1 clique e geração de currículos no padrão ATS.
                </p>
                <p>
                  Todas as empresas anunciantes passam por validação cadastral de CNPJ junto à Receita Federal, e os candidatos contam com proteção integral de dados sensíveis conforme a LGPD (Lei nº 13.709/2018).
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-[14px] text-[#334155] leading-relaxed">
                <p>
                  <strong>1. Perfis de Acesso (CPF e CNPJ):</strong> Contas de candidatos são vinculadas exclusivamente a CPF válido e destinam-se à busca de vagas e envio de currículos. Contas corporativas exigem CNPJ ativo validado na Receita Federal para publicação de vagas.
                </p>
                <p>
                  <strong>2. Sistema de Créditos Transparente:</strong> Todo novo cadastro recebe gratuitamente <strong>+30 créditos de boas-vindas</strong>. Os créditos não possuem prazo de validade e são utilizados sob demanda: Candidatar-se a vaga (10 cr), Gerar Currículo ATS em PDF (15 cr), Publicar vaga por 30 dias (10 cr) e Destacar vaga no topo (15 cr).
                </p>
                <p>
                  <strong>3. Veracidade das Vagas:</strong> É estritamente proibida a publicação de vagas fictícias, cobrança de taxas de candidatos por processos seletivos ou solicitação de documentos bancários antes da contratação formal.
                </p>
                <p>
                  <strong>4. Pagamentos e Reembolsos:</strong> As recargas opcionais de pacotes de créditos são processadas via Checkout Oficial do Mercado Pago (Pix ou Cartão) com liberação imediata na carteira digital da conta.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-[#EAECEF] flex justify-end">
              <button
                type="button"
                onClick={() => setInstitutionalModal(null)}
                className="btn-base btn-md btn-primary"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé Institucional Completo em 4 Colunas */}
      <footer className="bg-[#EEF4FF] border-t border-[#DBEAFE] mt-auto text-[#475569]">
        <div className="container-app py-10 md:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Coluna 1: Marca e Propósito Regional */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => navigateTo('home')}
                className="text-[18px] font-extrabold tracking-tight text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer"
              >
                PrudenEmpregos
              </button>
              <p className="text-[13px] text-[#475569] leading-relaxed">
                Conectando talentos e empresas de Presidente Prudente e região com agilidade e transparência.
              </p>
              <p className="text-[12px] text-[#64748B] pt-1">
                Presidente Prudente · Oeste Paulista, SP
              </p>
            </div>

            {/* Coluna 2: Navegação */}
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#1E40AF]">
                Navegação
              </h3>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('home')}
                    className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Vagas em Presidente Prudente
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser && isCompany(currentUser)) {
                        navigateTo('company', 'jobs');
                      } else {
                        setAuthModalRole('company');
                        setAuthModalMode('register');
                        setIsAuthModalOpen(true);
                      }
                    }}
                    className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Para Empresas (Anunciar Vaga)
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => navigateTo('plans')}
                    className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Créditos e Planos
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthModalRole('candidate');
                      setAuthModalMode('register');
                      setIsAuthModalOpen(true);
                    }}
                    className="font-semibold text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Criar Conta (+30 cr grátis)
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Institucional e Legal */}
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#1E40AF]">
                Institucional e Legal
              </h3>
              <ul className="space-y-2 text-[13px]">
                <li>
                  <button
                    type="button"
                    onClick={() => setInstitutionalModal('about')}
                    className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Sobre Nós
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setInstitutionalModal('terms')}
                    className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Termos de Uso
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsLgpdModalOpen(true)}
                    className="hover:text-[#1D4ED8] transition-colors cursor-pointer"
                  >
                    Privacidade e LGPD
                  </button>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Suporte e Contato */}
            <div className="space-y-2.5">
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-[#1E40AF]">
                Suporte e Contato
              </h3>
              <div className="space-y-2 text-[13px]">
                <a
                  href="mailto:contato@prudenempregos.com.br"
                  className="block hover:text-[#1D4ED8] transition-colors break-all"
                >
                  contato@prudenempregos.com.br
                </a>
                <div>
                  <a
                    href="https://api.whatsapp.com/send?phone=5518999990000&text=Ol%C3%A1!%20Preciso%20de%20suporte%20no%20portal%20PrudenEmpregos."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[12px] font-semibold transition-colors"
                  >
                    <span>Suporte via WhatsApp</span>
                  </a>
                </div>
                <div className="flex items-center gap-3 pt-1 text-[12px] font-semibold text-[#1E40AF]">
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram do PrudenEmpregos"
                    className="hover:underline"
                  >
                    Instagram
                  </a>
                  <span className="text-[#93C5FD]">·</span>
                  <a
                    href="https://linkedin.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn do PrudenEmpregos"
                    className="hover:underline"
                  >
                    LinkedIn
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-[#DBEAFE] flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[#64748B]">
            <span>
              © {new Date().getFullYear()} PrudenEmpregos · Todos os direitos reservados.
            </span>
            <span>
              Portal Regional de Empregos · Presidente Prudente e Oeste Paulista, SP
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
