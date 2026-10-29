import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Bookmark,
  MapPin,
  ArrowUpRight,
  Zap,
  Rocket,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Job, UserProfile } from '../types';
import {
  formatRelativeTime,
  REGIONAL_CITIES,
  formatJobSalary,
  isCandidate,
  isCompany,
} from '../utils/matchAlgorithm';
import { APPLY_JOB_CREDIT_COST } from '../utils/creditsData';
import { EXPANDED_JOB_CATEGORIES, CONTRACT_FILTER_PILLS } from '../constants/credits';

interface HomeViewProps {
  jobs: Job[];
  currentUser: UserProfile | null;
  appliedJobIds: string[];
  savedJobIds?: string[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onApply: (job: Job) => void;
  onToggleSaveJob?: (jobId: string) => void;
  onViewJobDetails: (job: Job) => void;
  onNavigate: (view: string, subTab?: string) => void;
  onOpenAuth: (type: 'candidate' | 'company', mode?: 'login' | 'register') => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const DEFAULT_CITY_LABEL = 'Presidente Prudente e Região';

const QUICK_SUGGESTION_CHIPS = [
  { label: 'Administrativo', value: 'Administrativo' },
  { label: 'Comércio', value: 'Comércio' },
  { label: 'Tecnologia', value: 'Tecnologia' },
  { label: 'Primeiro Emprego', value: 'Primeiro Emprego' },
];

export const HomeView: React.FC<HomeViewProps> = ({
  jobs,
  currentUser,
  appliedJobIds,
  savedJobIds = [],
  searchTerm,
  setSearchTerm,
  onApply,
  onToggleSaveJob,
  onViewJobDetails,
  onNavigate,
  onOpenAuth,
  showToast,
}) => {
  const [filterCity, setFilterCity] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get('city');
    if (!cityParam || cityParam === 'Todas as Cidades') {
      return DEFAULT_CITY_LABEL;
    }
    return cityParam;
  });
  const [filterCategory, setFilterCategory] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'Todas as Áreas';
  });
  const [filterContract, setFilterContract] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('contract') || 'Todos os Contratos';
  });
  const [filterWorkModel, setFilterWorkModel] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('model') || 'Todos os Modelos';
  });
  const [filterExperience, setFilterExperience] = useState('Qualquer Nível');
  const [filterWithSalary, setFilterWithSalary] = useState(false);
  const [filterFirstJob, setFilterFirstJob] = useState(false);
  const [filterCnh, setFilterCnh] = useState('Todas');
  const [filterVehicle, setFilterVehicle] = useState('Todos');
  const [sortBy, setSortBy] = useState<'recent' | 'salary'>('recent');
  const [visibleCount, setVisibleCount] = useState(12);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setDebouncedSearchTerm('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  const userIsCandidate = isCandidate(currentUser);
  const userIsCompany = isCompany(currentUser);

  const activeJobs = useMemo(() => {
    return jobs.filter((job) => !job.status || job.status === 'active');
  }, [jobs]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q && !searchTerm) {
      setSearchTerm(q);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (filterCity !== DEFAULT_CITY_LABEL && filterCity !== 'Todas as Cidades') {
      params.set('city', filterCity);
    }
    if (filterCategory !== 'Todas as Áreas') params.set('category', filterCategory);
    if (filterContract !== 'Todos os Contratos') params.set('contract', filterContract);
    if (filterWorkModel !== 'Todos os Modelos') params.set('model', filterWorkModel);

    const queryString = params.toString();
    const newUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [searchTerm, filterCity, filterCategory, filterContract, filterWorkModel]);

  useEffect(() => {
    if (!moreFiltersOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreFiltersOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moreFiltersOpen]);

  const categories = useMemo(() => {
    const defaultCats = [
      ...EXPANDED_JOB_CATEGORIES,
      'Administrativo',
      'Comércio',
      'Comercial',
      'Tecnologia',
      'Primeiro Emprego',
      'Saúde',
      'Agronegócio',
      'Indústria',
      'Financeiro',
      'Educação',
      'Serviços',
    ];
    const set = new Set<string>(defaultCats);
    activeJobs.forEach((j) => {
      if (j.category) set.add(j.category);
    });
    return ['Todas as Áreas', ...Array.from(set)];
  }, [activeJobs]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>(REGIONAL_CITIES);
    activeJobs.forEach((j) => {
      if (j.location && j.location.trim()) {
        set.add(j.location.trim());
      }
    });
    return [DEFAULT_CITY_LABEL, ...Array.from(set)];
  }, [activeJobs]);

  const filteredAndSortedJobs = useMemo(() => {
    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const filtered = activeJobs.filter((job) => {
      const searchStr = norm(debouncedSearchTerm.trim());
      const firstJobTokens =
        job.acceptsFirstJob || job.experience === 'Primeiro Emprego' || job.category === 'Primeiro Emprego'
          ? 'primeiro emprego jovem aprendiz estagio iniciante'
          : '';
      const comercioTokens =
        job.category === 'Comércio' || job.category === 'Comercial'
          ? 'comercio comercial vendas'
          : '';
      const jobStr = norm(
        `${job.title} ${job.companyName} ${job.category ?? ''} ${job.contract ?? ''} ${job.experience ?? ''} ${firstJobTokens} ${comercioTokens} ${job.skills?.join(' ') ?? ''} ${job.location} ${job.description}`
      );
      const matchesSearch = !searchStr || jobStr.includes(searchStr);

      const isAllRegionalCities =
        filterCity === DEFAULT_CITY_LABEL || filterCity === 'Todas as Cidades';
      const matchesCity =
        isAllRegionalCities ||
        norm(job.location ?? '').includes(norm(filterCity.replace(', SP', '')));

      const matchesCategory =
        filterCategory === 'Todas as Áreas' ||
        job.category === filterCategory ||
        (filterCategory === 'Comércio' && job.category === 'Comercial') ||
        (filterCategory === 'Comercial' && job.category === 'Comércio') ||
        (filterCategory === 'Primeiro Emprego' &&
          (job.category === 'Primeiro Emprego' ||
            Boolean(job.acceptsFirstJob) ||
            job.experience === 'Primeiro Emprego'));

      const matchesContract =
        filterContract === 'Todos os Contratos' || job.contract === filterContract;

      const matchesModel =
        filterWorkModel === 'Todos os Modelos' || job.workModel === filterWorkModel;

      const matchesExperience =
        filterExperience === 'Qualquer Nível' || job.experience === filterExperience;

      const hasSalaryDefined =
        (job.salaryType && job.salaryType !== 'negotiable') ||
        Boolean(job.salaryMin) ||
        Boolean(job.salaryMax) ||
        Boolean(
          job.salaryRange &&
            job.salaryRange.trim() &&
            !norm(job.salaryRange).includes('combinar')
        );
      const matchesSalary = !filterWithSalary || hasSalaryDefined;

      const matchesFirstJob =
        !filterFirstJob ||
        Boolean(job.acceptsFirstJob) ||
        job.experience === 'Primeiro Emprego' ||
        job.category === 'Primeiro Emprego';

      const jobCnh = job.requiresCnh ?? 'nao';
      const matchesCnh =
        filterCnh === 'Todas' ||
        (filterCnh === 'nao' ? jobCnh === 'nao' : jobCnh === filterCnh);

      const jobVehicle = job.requiresVehicle ?? 'nao';
      const matchesVehicle =
        filterVehicle === 'Todos' ||
        (filterVehicle === 'nao' ? jobVehicle === 'nao' : jobVehicle === filterVehicle);

      return (
        matchesSearch &&
        matchesCity &&
        matchesCategory &&
        matchesContract &&
        matchesModel &&
        matchesExperience &&
        matchesSalary &&
        matchesFirstJob &&
        matchesCnh &&
        matchesVehicle
      );
    });

    return [...filtered].sort((a, b) => {
      // Vagas destacadas sempre no topo
      if (Boolean(b.featured) !== Boolean(a.featured)) {
        return b.featured ? 1 : -1;
      }
      if (sortBy === 'salary') {
        const salA = a.salaryMax || a.salaryMin || 0;
        const salB = b.salaryMax || b.salaryMin || 0;
        if (salB !== salA) return salB - salA;
      }
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [
    activeJobs,
    debouncedSearchTerm,
    filterCity,
    filterCategory,
    filterContract,
    filterWorkModel,
    filterExperience,
    filterWithSalary,
    filterFirstJob,
    filterCnh,
    filterVehicle,
    sortBy,
  ]);

  const displayedJobs = useMemo(
    () => filteredAndSortedJobs.slice(0, visibleCount),
    [filteredAndSortedJobs, visibleCount]
  );

  const secondaryFilterCount =
    (filterExperience !== 'Qualquer Nível' ? 1 : 0) +
    (filterWithSalary ? 1 : 0) +
    (filterFirstJob ? 1 : 0) +
    (filterCnh !== 'Todas' ? 1 : 0) +
    (filterVehicle !== 'Todos' ? 1 : 0);

  const activeFilterCount =
    (filterCity !== DEFAULT_CITY_LABEL && filterCity !== 'Todas as Cidades' ? 1 : 0) +
    (filterCategory !== 'Todas as Áreas' ? 1 : 0) +
    (filterContract !== 'Todos os Contratos' ? 1 : 0) +
    (filterWorkModel !== 'Todos os Modelos' ? 1 : 0) +
    secondaryFilterCount;

  const hasActiveFilters = activeFilterCount > 0 || searchTerm.trim().length > 0;

  const clearFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
    setFilterCity(DEFAULT_CITY_LABEL);
    setFilterCategory('Todas as Áreas');
    setFilterContract('Todos os Contratos');
    setFilterWorkModel('Todos os Modelos');
    setFilterExperience('Qualquer Nível');
    setFilterWithSalary(false);
    setFilterFirstJob(false);
    setFilterCnh('Todas');
    setFilterVehicle('Todos');
    setVisibleCount(12);
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const el = document.getElementById('oportunidades-mural');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleQuickChipClick = (chipValue: string) => {
    if (searchTerm.toLowerCase() === chipValue.toLowerCase()) {
      setSearchTerm('');
      setDebouncedSearchTerm('');
    } else {
      setSearchTerm(chipValue);
      setDebouncedSearchTerm(chipValue);
    }
  };

  const handleCandidatePriorityCta = () => {
    if (userIsCandidate && currentUser) {
      onNavigate('candidate', 'resume');
      return;
    }
    onOpenAuth('candidate', 'register');
  };

  const handleJobAlertCta = () => {
    if (userIsCandidate && currentUser) {
      onNavigate('candidate', 'alerts');
      return;
    }
    showToast?.(
      'Crie sua conta de candidato para receber alertas de novas vagas em Presidente Prudente.'
    );
    onOpenAuth('candidate', 'register');
  };

  return (
    <main className="min-h-screen bg-[#F4F7FE]">
      {/* 1. HERO EM AZUL COM TRANSIÇÃO SUAVE E FOLGA CONTRA HEADER FIXO */}
      <section
        id="hero-section"
        className="bg-gradient-to-b from-[#1E40AF] to-[#2563EB] text-white border-b border-[#1D4ED8] scroll-mt-24"
      >
        <div className="container-app pt-14 pb-10 md:pt-20 md:pb-12">
          <div className="max-w-2xl mb-6">
            <h1 className="text-[28px] sm:text-[34px] md:text-[38px] font-bold text-white leading-[1.18] tracking-[-0.03em] [text-wrap:balance]">
              Encontre sua próxima vaga em Presidente Prudente.
            </h1>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-start sm:items-center gap-2.5 p-2.5 sm:px-3.5 sm:py-2 rounded-xl bg-white/12 border border-white/20 text-blue-50">
                <span className="w-6 h-6 rounded-lg bg-white/15 text-sky-300 inline-flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <Zap className="w-3.5 h-3.5" />
                </span>
                <p className="text-[13px] sm:text-[14px] text-blue-50 font-medium leading-snug">
                  Candidatura rápida com 1 clique direto para as empresas da região.
                </p>
              </div>

              {!currentUser && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('candidate', 'register')}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-[#1E40AF] hover:bg-blue-50 font-semibold text-[13px] shadow-xs transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                  <span>Novo cadastro: ganhe 30 créditos grátis para usar sem custo</span>
                </button>
              )}
            </div>
          </div>

          {/* 2. CAMPO DE BUSCA E SELETOR DE CIDADE */}
          <form
            role="search"
            aria-label="Buscar vagas de emprego"
            onSubmit={handleSearchSubmit}
            className="bg-white p-1.5 rounded-2xl border border-[#DBEAFE] shadow-md flex flex-col md:flex-row items-stretch md:items-center gap-1.5"
          >
            <div className="flex-1 flex items-center px-3.5 min-h-[44px]">
              <Search className="w-4 h-4 text-[#2563EB] mr-2.5 shrink-0" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Cargo, área ou habilidade"
                placeholder="Cargo, área ou habilidade..."
                className="w-full bg-transparent border-none outline-none text-[#0F172A] placeholder-[#64748B] text-[15px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    if (searchInputRef.current) searchInputRef.current.value = '';
                  }}
                  aria-label="Limpar termo de busca"
                  className="w-7 h-7 inline-flex items-center justify-center text-[#64748B] hover:text-[#1D4ED8] rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="hidden md:block w-px h-6 bg-[#DBEAFE]" aria-hidden="true" />

            <div className="flex items-center md:w-[295px] min-h-[44px] px-3 border-t md:border-t-0 border-[#EFF6FF]">
              <MapPin className="w-4 h-4 text-[#2563EB] mr-2 shrink-0" />
              <select
                aria-label="Selecionar localização"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-[#0F172A] text-[14px] font-medium cursor-pointer truncate"
              >
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="min-h-[44px] px-6 rounded-xl font-semibold text-[14px] bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Buscar vagas
            </button>
          </form>

          {/* 3. CHIPS LEVES DE SUGESTÃO RÁPIDA ("Áreas rápidas") SEMPRE DISPONÍVEIS */}
          <div className="mt-3.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            <span className="text-[12px] font-medium text-blue-100 shrink-0">
              Áreas rápidas:
            </span>
            {QUICK_SUGGESTION_CHIPS.map((chip) => {
              const isSelected = searchTerm.trim().toLowerCase() === chip.value.toLowerCase();
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleQuickChipClick(chip.value)}
                  aria-pressed={isSelected}
                  className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-white text-[#1E40AF] border-white font-semibold'
                      : 'bg-white/10 text-blue-50 border-white/20 hover:bg-white/20'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* FILTROS RÁPIDOS UNIFICADOS */}
          {activeJobs.length > 0 && (
            <div
              aria-label="Filtros rápidos"
              className="mt-3 flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <select
                aria-label="Filtrar por área profissional"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterCategory !== 'Todas as Áreas'
                    ? 'bg-white text-[#1E40AF] border-white font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-white text-[#0F172A]">
                    {cat}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por modalidade"
                value={filterWorkModel}
                onChange={(e) => setFilterWorkModel(e.target.value)}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterWorkModel !== 'Todos os Modelos'
                    ? 'bg-white text-[#1E40AF] border-white font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                <option value="Todos os Modelos" className="bg-white text-[#0F172A]">
                  Modalidade
                </option>
                <option value="Presencial" className="bg-white text-[#0F172A]">
                  Presencial
                </option>
                <option value="Híbrido" className="bg-white text-[#0F172A]">
                  Híbrido
                </option>
                <option value="Remoto" className="bg-white text-[#0F172A]">
                  Remoto
                </option>
              </select>

              <select
                aria-label="Filtrar por tipo de contrato"
                value={filterContract}
                onChange={(e) => setFilterContract(e.target.value)}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterContract !== 'Todos os Contratos'
                    ? 'bg-white text-[#1E40AF] border-white font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                <option value="Todos os Contratos" className="bg-white text-[#0F172A]">
                  Contrato
                </option>
                <option value="CLT" className="bg-white text-[#0F172A]">
                  CLT
                </option>
                <option value="PJ" className="bg-white text-[#0F172A]">
                  PJ
                </option>
                <option value="Estágio" className="bg-white text-[#0F172A]">
                  Estágio
                </option>
                <option value="Temporário" className="bg-white text-[#0F172A]">
                  Temporário
                </option>
                <option value="Freelancer" className="bg-white text-[#0F172A]">
                  Freelancer
                </option>
                <option value="Jovem Aprendiz" className="bg-white text-[#0F172A]">
                  Jovem Aprendiz
                </option>
              </select>

              <button
                type="button"
                onClick={() => setFilterWithSalary(!filterWithSalary)}
                aria-pressed={filterWithSalary}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterWithSalary
                    ? 'bg-white text-[#1E40AF] border-white font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                Com salário informado
              </button>

              <button
                type="button"
                onClick={() => setFilterFirstJob(!filterFirstJob)}
                aria-pressed={filterFirstJob}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterFirstJob
                    ? 'bg-white text-[#1E40AF] border-white font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                Primeiro emprego
              </button>

              <button
                type="button"
                onClick={() => setMoreFiltersOpen(true)}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  secondaryFilterCount > 0
                    ? 'bg-white text-[#1E40AF] border-white font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Mais filtros</span>
                {secondaryFilterCount > 0 && (
                  <span className="tabular-nums font-semibold">({secondaryFilterCount})</span>
                )}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="h-9 px-2.5 text-[13px] font-medium text-blue-100 hover:text-white inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar filtros</span>
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Secondary Filters Modal */}
      {moreFiltersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-[1px]"
            onClick={() => setMoreFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros adicionais"
            className="modal-surface w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative z-10 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EAECEF]">
              <h2 className="text-[16px] font-bold text-[#0F172A]">Filtros adicionais</h2>
              <button
                type="button"
                onClick={() => setMoreFiltersOpen(false)}
                aria-label="Fechar filtros"
                className="w-8 h-8 inline-flex items-center justify-center text-[#64748B] hover:text-[#0F172A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="filter-experience" className="form-label">
                  Nível de experiência
                </label>
                <select
                  id="filter-experience"
                  value={filterExperience}
                  onChange={(e) => setFilterExperience(e.target.value)}
                  className="form-control cursor-pointer"
                >
                  <option value="Qualquer Nível">Qualquer nível</option>
                  <option value="Primeiro Emprego">Primeiro Emprego</option>
                  <option value="Estágio">Estágio</option>
                  <option value="Júnior">Júnior</option>
                  <option value="Pleno">Pleno</option>
                  <option value="Sênior">Sênior</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-cnh" className="form-label">
                  Exigência de CNH
                </label>
                <select
                  id="filter-cnh"
                  value={filterCnh}
                  onChange={(e) => setFilterCnh(e.target.value)}
                  className="form-control cursor-pointer"
                >
                  <option value="Todas">Qualquer exigência</option>
                  <option value="nao">Sem exigência de CNH</option>
                  <option value="A">CNH A (Moto)</option>
                  <option value="B">CNH B (Carro)</option>
                  <option value="AB">CNH AB</option>
                  <option value="C">CNH C</option>
                  <option value="D">CNH D</option>
                  <option value="E">CNH E</option>
                </select>
              </div>

              <div>
                <label htmlFor="filter-vehicle" className="form-label">
                  Veículo próprio
                </label>
                <select
                  id="filter-vehicle"
                  value={filterVehicle}
                  onChange={(e) => setFilterVehicle(e.target.value)}
                  className="form-control cursor-pointer"
                >
                  <option value="Todos">Qualquer exigência</option>
                  <option value="nao">Sem veículo próprio</option>
                  <option value="moto">Exige Moto</option>
                  <option value="carro">Exige Carro</option>
                </select>
              </div>

              <div className="pt-2 space-y-2.5">
                <label className="flex items-center gap-2.5 text-[14px] text-[#0F172A] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterWithSalary}
                    onChange={(e) => setFilterWithSalary(e.target.checked)}
                    className="w-4 h-4 accent-[#0F172A] rounded cursor-pointer"
                  />
                  <span>Apenas com salário informado</span>
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#EAECEF] flex items-center gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="btn-base btn-md btn-secondary flex-1"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={() => setMoreFiltersOpen(false)}
                className="btn-base btn-md btn-primary flex-1"
              >
                Ver resultados ({filteredAndSortedJobs.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Single-Column Job Feed */}
      <section id="oportunidades-mural" className="container-app py-8 md:py-10 scroll-mt-24">
        {/* Pills Rápidas de Tipo de Contrato / Modalidade (Módulo 5.4) */}
        {activeJobs.length > 0 && (
          <div className="mb-5 flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-1">
            {CONTRACT_FILTER_PILLS.map((pill) => {
              const isSelected =
                pill.value === 'Todos os Contratos'
                  ? filterContract === 'Todos os Contratos' && !filterFirstJob
                  : pill.value === 'Primeiro Emprego'
                  ? filterFirstJob
                  : filterContract === pill.value;
              return (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => {
                    if (pill.value === 'Todos os Contratos') {
                      setFilterContract('Todos os Contratos');
                      setFilterFirstJob(false);
                    } else if (pill.value === 'Primeiro Emprego') {
                      setFilterFirstJob((prev) => !prev);
                      setFilterContract('Todos os Contratos');
                    } else {
                      setFilterFirstJob(false);
                      setFilterContract((prev) =>
                        prev === pill.value ? 'Todos os Contratos' : pill.value
                      );
                    }
                  }}
                  className={`h-8 px-3.5 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#1D4ED8] text-white border-[#1D4ED8] shadow-xs'
                      : 'bg-white text-[#475569] border-[#E2E8F0] hover:border-[#93C5FD] hover:text-[#1E40AF]'
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        )}

        <div id="vagas" className="scroll-mt-24 flex items-center justify-between gap-4 mb-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[16px] font-semibold text-[#0F172A]">
              Vagas disponíveis
            </h2>
            {filteredAndSortedJobs.length > 0 && (
              <span className="text-[13px] text-[#64748B] tabular-nums">
                ({filteredAndSortedJobs.length})
              </span>
            )}
          </div>

          {filteredAndSortedJobs.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="jobs-sort" className="text-[13px] text-[#64748B] hidden sm:inline">
                Ordenar por:
              </label>
              <select
                id="jobs-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'recent' | 'salary')}
                className="bg-transparent text-[13px] font-medium text-[#0F172A] cursor-pointer border-none outline-none"
              >
                <option value="recent">Mais recentes</option>
                <option value="salary">Maior salário</option>
              </select>
            </div>
          )}
        </div>

        {filteredAndSortedJobs.length === 0 ? (
          <div className="bg-white border border-[#EAECEF] rounded-2xl p-7 sm:p-10 text-center shadow-[0_2px_12px_rgba(15,23,42,0.03)]">
            {activeJobs.length === 0 ? (
              <div className="max-w-lg mx-auto">
                <div className="w-12 h-12 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] text-[#2563EB] flex items-center justify-center mx-auto mb-4">
                  <Rocket className="w-5 h-5" />
                </div>

                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#0F172A] mb-2 [text-wrap:balance]">
                  Saia na frente nas próximas vagas de Presidente Prudente
                </h3>

                <p className="text-[14px] sm:text-[15px] text-[#64748B] mb-6 leading-relaxed">
                  Novas oportunidades reais da região podem surgir a qualquer momento. Realize seu primeiro cadastro agora e <strong>ganhe 30 créditos gratuitos</strong> sem nenhum custo para se candidatar às vagas ou gerar seu currículo em PDF ATS.
                </p>

                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCandidatePriorityCta}
                    className="btn-base btn-md btn-primary w-full sm:w-auto min-h-[46px] px-6 font-semibold shadow-xs cursor-pointer"
                  >
                    {currentUser
                      ? 'Completar meu currículo com prioridade'
                      : 'Criar conta e ganhar 30 créditos grátis'}
                  </button>

                  <button
                    type="button"
                    onClick={handleJobAlertCta}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 text-[13px] font-medium text-[#475569] hover:text-[#0F172A] transition-colors cursor-pointer"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span className="underline underline-offset-4">
                      Receber alerta de novas vagas
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <h3 className="text-[16px] font-semibold text-[#0F172A] mb-1">
                  Nenhuma vaga encontrada para estes filtros.
                </h3>
                <p className="text-[14px] text-[#64748B] mb-5">
                  Reduza os filtros ativos ou pesquise por outro termo para ampliar suas opções.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-base btn-sm btn-secondary"
                >
                  Limpar todos os filtros
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedJobs.map((job) => {
              const isApplied = appliedJobIds.includes(job.id);
              const isSaved = savedJobIds.includes(job.id);
              const isOwnCompanyJob =
                userIsCompany && currentUser && job.companyId === currentUser.uid;
              const formattedSalary = formatJobSalary(job);
              const canOneClickApply =
                userIsCandidate &&
                !isApplied &&
                (!job.screeningQuestions || job.screeningQuestions.length === 0);

              const metadataParts = [
                job.companyName,
                job.category,
                job.location,
                job.workModel,
                job.contract,
              ].filter(Boolean);

              return (
                <article
                  key={job.id}
                  onClick={() => onViewJobDetails(job)}
                  className={`job-card group cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    job.featured
                      ? 'border-amber-300 bg-amber-50/20'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {job.companyLogoDataUrl ? (
                      <img
                        src={job.companyLogoDataUrl}
                        alt={job.companyName}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200 bg-white shrink-0 mt-0.5"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">
                        {(job.companyName || 'E').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <h3 className="text-[16px] sm:text-[17px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors truncate">
                          {job.title}
                        </h3>
                        {job.featured && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                            <Sparkles className="w-3 h-3" /> ★ Vaga Destacada
                          </span>
                        )}
                        {isApplied && (
                          <span className="text-[12px] font-semibold text-[#059669] shrink-0">
                            · Candidatura enviada ✓
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-[13px] sm:text-[14px] text-[#64748B] flex flex-wrap items-center gap-y-0.5">
                        {metadataParts.map((part, index) => (
                          <React.Fragment key={index}>
                            {index > 0 && <span className="mx-1.5 text-[#CBD5E1]">·</span>}
                            <span className={index === 0 ? 'font-medium text-[#334155]' : ''}>
                              {part}
                            </span>
                          </React.Fragment>
                        ))}
                        <span className="mx-1.5 text-[#CBD5E1]">·</span>
                        <span className="font-semibold text-[#059669] tabular-nums">
                          {formattedSalary}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#F4F4F5]">
                    <span className="text-[12px] text-[#94A3B8] tabular-nums">
                      {formatRelativeTime(job.createdAt)}
                    </span>

                    {userIsCandidate && onToggleSaveJob && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSaveJob(job.id);
                        }}
                        aria-label={isSaved ? 'Remover das vagas salvas' : 'Salvar vaga'}
                        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                          isSaved
                            ? 'text-[#2563EB] bg-[#EFF6FF]'
                            : 'text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F4F4F5]'
                        }`}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    )}

                    {canOneClickApply && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply(job);
                        }}
                        className="btn-base btn-sm btn-primary"
                      >
                        Candidatar ({APPLY_JOB_CREDIT_COST} cr)
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isOwnCompanyJob) {
                          onNavigate('company', 'candidates');
                        } else {
                          onViewJobDetails(job);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#0F172A] group-hover:text-[#2563EB] transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <span>{isOwnCompanyJob ? 'Gerenciar' : 'Ver detalhes'}</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </article>
              );
            })}

            {filteredAndSortedJobs.length > visibleCount && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 12)}
                  className="btn-base btn-md btn-secondary"
                >
                  Carregar mais ({filteredAndSortedJobs.length - visibleCount})
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
};
