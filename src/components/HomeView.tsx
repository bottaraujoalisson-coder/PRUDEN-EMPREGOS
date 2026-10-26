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
    window.history.replaceState(null, '', newUrl);
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
      'Administrativo',
      'Comercial',
      'Tecnologia',
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
      const searchStr = norm(searchTerm);
      const jobStr = norm(
        `${job.title} ${job.companyName} ${job.category ?? ''} ${job.skills?.join(' ') ?? ''} ${job.location} ${job.description}`
      );
      const matchesSearch = !searchStr || jobStr.includes(searchStr);

      const isAllRegionalCities =
        filterCity === DEFAULT_CITY_LABEL || filterCity === 'Todas as Cidades';
      const matchesCity =
        isAllRegionalCities ||
        norm(job.location ?? '').includes(norm(filterCity.replace(', SP', '')));

      const matchesCategory =
        filterCategory === 'Todas as Áreas' || job.category === filterCategory;

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
        job.experience === 'Primeiro Emprego';

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
    searchTerm,
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
    setFilterCity(DEFAULT_CITY_LABEL);
    setFilterCategory('Todas as Áreas');
    setFilterContract('Todos os Contratos');
    setFilterWorkModel('Todos os Modelos');
    setFilterExperience('Qualquer Nível');
    setFilterWithSalary(false);
    setFilterFirstJob(false);
    setFilterCnh('Todas');
    setFilterVehicle('Todos');
    setSearchTerm('');
    setVisibleCount(12);
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
    } else {
      setSearchTerm(chipValue);
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
      showToast?.(
        'Alerta ativo! Você será avisado assim que novas vagas em Presidente Prudente forem publicadas.'
      );
      return;
    }
    showToast?.(
      'Crie sua conta de candidato para receber alertas de novas vagas em Presidente Prudente.'
    );
    onOpenAuth('candidate', 'register');
  };

  const handleB2bCtaClick = () => {
    if (userIsCandidate) {
      showToast?.(
        'Você está conectado como Candidato (CPF). Para anunciar vagas, acesse com conta empresarial (CNPJ).',
        'error'
      );
      return;
    }
    if (userIsCompany) {
      onNavigate('company', 'post');
      return;
    }
    onOpenAuth('company', 'register');
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA]">
      {/* 1. HERO E PROPOSTA DE VALOR */}
      <section className="bg-white border-b border-[#EAECEF]">
        <div className="container-app pt-8 pb-7 md:pt-14 md:pb-10">
          <div className="max-w-2xl mb-6">
            <h1 className="text-[28px] sm:text-[34px] md:text-[38px] font-bold text-[#0F172A] leading-[1.15] tracking-[-0.03em] [text-wrap:balance]">
              Encontre sua próxima vaga em Presidente Prudente.
            </h1>

            <div className="mt-3 inline-flex items-start sm:items-center gap-2.5 p-3 sm:px-3.5 sm:py-2 rounded-xl bg-[#ECFDF5]/80 border border-[#A7F3D0] text-[#065F46]">
              <span className="w-6 h-6 rounded-lg bg-[#10B981]/15 text-[#059669] inline-flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Zap className="w-3.5 h-3.5" />
              </span>
              <p className="text-[14px] sm:text-[15px] text-[#065F46] font-medium leading-snug">
                Candidatura rápida com 1 clique direto para as empresas contratantes da região, com análise automática do seu perfil no envio.
              </p>
            </div>
          </div>

          {/* 2. CAMPO DE BUSCA E SELETOR DE CIDADE */}
          <form
            role="search"
            aria-label="Buscar vagas de emprego"
            onSubmit={handleSearchSubmit}
            className="bg-white p-1.5 rounded-2xl border border-[#E4E4E7] shadow-[0_2px_12px_rgba(15,23,42,0.04)] flex flex-col md:flex-row items-stretch md:items-center gap-1.5"
          >
            <div className="flex-1 flex items-center px-3.5 min-h-[44px]">
              <Search className="w-4 h-4 text-[#94A3B8] mr-2.5 shrink-0" />
              <input
                type="search"
                aria-label="Cargo, área ou habilidade"
                placeholder="Cargo, área ou habilidade..."
                className="w-full bg-transparent border-none outline-none text-[#0F172A] placeholder-[#94A3B8] text-[15px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Limpar termo de busca"
                  className="w-7 h-7 inline-flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="hidden md:block w-px h-6 bg-[#EAECEF]" aria-hidden="true" />

            <div className="flex items-center md:w-[295px] min-h-[44px] px-3 border-t md:border-t-0 border-[#F4F4F5]">
              <MapPin className="w-4 h-4 text-[#64748B] mr-2 shrink-0" />
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
              className="min-h-[44px] px-6 rounded-xl font-semibold text-[14px] bg-[#0F172A] hover:bg-[#1E293B] text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Buscar vagas
            </button>
          </form>

          {/* 3. CHIPS LEVES DE SUGESTÃO RÁPIDA */}
          <div className="mt-3.5 flex items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5">
            <span className="text-[12px] font-medium text-[#64748B] shrink-0">
              Populares:
            </span>
            {QUICK_SUGGESTION_CHIPS.map((chip) => {
              const isSelected = searchTerm.toLowerCase() === chip.value.toLowerCase();
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => handleQuickChipClick(chip.value)}
                  aria-pressed={isSelected}
                  className={`h-8 px-3 rounded-lg text-[12px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#E2E8F0] hover:border-[#CBD5E1] hover:text-[#0F172A]'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          {/* FILTROS SECUNDÁRIOS */}
          {activeJobs.length > 0 && (
            <div
              aria-label="Filtros rápidos"
              className="mt-3 pt-3 border-t border-[#F1F5F9] flex flex-nowrap md:flex-wrap items-center gap-2 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <select
                aria-label="Filtrar por área profissional"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  filterCategory !== 'Todas as Áreas'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#FAFAFA] text-[#334155] border-[#E4E4E7] hover:border-[#CBD5E1]'
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
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#FAFAFA] text-[#334155] border-[#E4E4E7] hover:border-[#CBD5E1]'
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
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#FAFAFA] text-[#334155] border-[#E4E4E7] hover:border-[#CBD5E1]'
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
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#FAFAFA] text-[#334155] border-[#E4E4E7] hover:border-[#CBD5E1]'
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
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#FAFAFA] text-[#334155] border-[#E4E4E7] hover:border-[#CBD5E1]'
                }`}
              >
                Primeiro emprego
              </button>

              <button
                type="button"
                onClick={() => setMoreFiltersOpen(true)}
                className={`h-9 px-3 rounded-lg text-[13px] font-medium border inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  secondaryFilterCount > 0
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-[#FAFAFA] text-[#334155] border-[#E4E4E7] hover:border-[#CBD5E1]'
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
                  className="h-9 px-2.5 text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar</span>
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
                Limpar
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
      <section id="oportunidades-mural" className="container-app py-8 md:py-10">
        <div className="flex items-center justify-between gap-4 mb-4">
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
                  Novas oportunidades reais da região podem surgir a qualquer momento. Cadastre seu currículo agora para garantir prioridade máxima e se candidatar com 1 clique assim que as empresas publicarem.
                </p>

                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCandidatePriorityCta}
                    className="btn-base btn-md btn-primary w-full sm:w-auto min-h-[46px] px-6 font-semibold shadow-xs cursor-pointer"
                  >
                    Cadastrar meu currículo com prioridade
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
                  Nenhuma vaga encontrada para estes filtros
                </h3>
                <p className="text-[14px] text-[#64748B] mb-5">
                  Reduza os filtros ativos ou pesquise por outro termo para ampliar suas opções.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-base btn-sm btn-secondary"
                >
                  Limpar filtros
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
              const rawRange = (job.salaryRange || '').trim().toLowerCase();
              const hasSalary =
                Boolean(job.salaryMin) ||
                Boolean(job.salaryMax) ||
                (Boolean(rawRange) &&
                  !rawRange.includes('combinar') &&
                  job.salaryType !== 'negotiable');
              const formattedSalary = hasSalary ? formatJobSalary(job) : null;
              const canOneClickApply =
                userIsCandidate &&
                !isApplied &&
                (!job.screeningQuestions || job.screeningQuestions.length === 0);

              const metadataParts = [
                job.companyName,
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
                            <Sparkles className="w-3 h-3" /> Vaga Destacada
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
                        {formattedSalary && (
                          <>
                            <span className="mx-1.5 text-[#CBD5E1]">·</span>
                            <span className="font-semibold text-[#059669] tabular-nums">
                              {formattedSalary}
                            </span>
                          </>
                        )}
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

        {/* SEÇÃO DE EMPRESAS */}
        {!userIsCompany && (
          <div className="mt-10 bg-slate-50 border border-slate-200/90 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#0F172A]">
                Sua empresa está contratando em Presidente Prudente?
              </h3>
              <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">
                Cadastre sua empresa com validação automática na Receita Federal (CNPJ) e receba currículos analisados com inteligência.
              </p>
            </div>
            <button
              type="button"
              onClick={handleB2bCtaClick}
              className="btn-base btn-md btn-secondary bg-white hover:bg-slate-100 w-full sm:w-auto shrink-0 cursor-pointer"
            >
              <span>Publicar vaga corporativa</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
};
