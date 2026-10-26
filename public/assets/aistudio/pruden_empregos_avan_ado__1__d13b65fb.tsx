import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Briefcase, MapPin, Clock, User, Building2, 
  CheckCircle2, Filter, Menu, X, LogOut, PlusCircle,
  FileText, Award, Sparkles, Laptop, Check,
  LayoutDashboard, Users, FileSignature, GraduationCap, Calendar,
  Eye, UserCheck, AlertCircle, ChevronRight, XCircle, Brain, Target, Activity, DollarSign
} from 'lucide-react';

const INITIAL_USERS = [
  { 
    id: 'c1', type: 'candidate', name: 'Danilo Oliveira', email: 'danilo@email.com', 
    phone: '(18) 99999-9999', role: 'Desenvolvedor Front-end', experienceLevel: 'Sênior',
    about: 'Desenvolvedor apaixonado por criar interfaces ricas e acessíveis usando React e Tailwind.',
    profileCompleteness: 85,
    skills: ['React', 'JavaScript', 'Tailwind', 'UI/UX', 'Git'],
    education: 'Superior Completo em Ciência da Computação',
    salaryExpectation: 'R$ 6.000,00'
  },
  { 
    id: 'c2', type: 'candidate', name: 'Mariana Souza', email: 'mariana@email.com', 
    phone: '(18) 98888-8888', role: 'Analista Administrativo', experienceLevel: 'Pleno',
    about: 'Profissional focada em resultados com experiência em rotinas administrativas e financeiras.',
    profileCompleteness: 70,
    skills: ['Excel', 'Power BI', 'Gestão Financeira', 'Atendimento'],
    education: 'Superior Completo em Administração',
    salaryExpectation: 'R$ 3.500,00'
  },
  { 
    id: 'e1', type: 'company', name: 'Tech Prudente Solutions', email: 'rh@techprudente.com', 
    cnpj: '12.345.678/0001-90', credits: 5 
  },
  { 
    id: 'e2', type: 'company', name: 'Comércio Central Prudente', email: 'vagas@comerciocentral.com', 
    cnpj: '98.765.432/0001-10', credits: 1 
  }
];

const INITIAL_JOBS = [
  {
    id: 'j1', companyId: 'e1', title: 'Desenvolvedor Front-end Sênior', company: 'Tech Prudente Solutions',
    location: 'Presidente Prudente, SP', experience: 'Sênior', category: 'Tecnologia',
    workModel: 'Remoto', contract: 'PJ', postedAt: 'Há 30 minutos', premium: true,
    description: 'Buscamos desenvolvedor com ampla experiência em React, Next.js e Tailwind para arquitetar e liderar projetos escaláveis.',
    skills: ['React', 'Next.js', 'Tailwind', 'TypeScript', 'Git']
  },
  {
    id: 'j2', companyId: 'e2', title: 'Analista Administrativo', company: 'Comércio Central Prudente',
    location: 'Presidente Prudente, SP', experience: 'Júnior', category: 'Administrativo',
    workModel: 'Presencial', contract: 'CLT', postedAt: 'Há 2 horas', premium: false,
    description: 'Atuação no setor administrativo e financeiro. Emissão de notas, controle de fluxo de caixa e suporte à diretoria.',
    skills: ['Excel', 'Rotinas Administrativas', 'Organização']
  },
  {
    id: 'j3', companyId: 'e1', title: 'Estagiário de UI/UX Design', company: 'Tech Prudente Solutions',
    location: 'Presidente Prudente, SP', experience: 'Estágio', category: 'Tecnologia',
    workModel: 'Híbrido', contract: 'Estágio', postedAt: 'Ontem', premium: false,
    description: 'Apoio na prototipagem de interfaces no Figma e condução de pesquisas básicas de experiência do usuário.',
    skills: ['Figma', 'Prototipagem', 'Design Thinking']
  }
];

// Algoritmo que calcula a afinidade do candidato com a vaga baseado em Experiência e Habilidades
const calculateIntelligentMatch = (job, candidate) => {
  if (!candidate || !job) return 0;
  let score = 0;

  // 1. Match de Experiência (Peso: 40%)
  const expLevels = { 'Primeiro Emprego': 1, 'Estágio': 2, 'Júnior': 3, 'Pleno': 4, 'Sênior': 5 };
  const candExp = expLevels[candidate.experienceLevel] || 0;
  const jobExp = expLevels[job.experience] || 0;
  
  const diff = candExp - jobExp;
  if (diff === 0) score += 40; // Exato
  else if (diff > 0) score += 30; // Overqualified (mas serve)
  else if (diff === -1) score += 20; // Quase lá (ex: Vaga Pleno, Cand Jr)
  else score += 5; // Muito abaixo

  // 2. Match de Habilidades / Skills (Peso: 60%)
  if (job.skills && job.skills.length > 0 && candidate.skills && candidate.skills.length > 0) {
    const candSkillsLower = candidate.skills.map(s => s.trim().toLowerCase());
    const matchedSkills = job.skills.filter(s => candSkillsLower.includes(s.trim().toLowerCase()));
    
    const skillScore = (matchedSkills.length / job.skills.length) * 60;
    score += skillScore;
  } else {
    // Se a vaga não cadastrou skills ou o candidato não tem, dá um peso neutro para não prejudicar
    score += 30;
  }

  return Math.min(100, Math.round(score));
};

const getMatchColor = (score) => {
  if (score >= 75) return 'text-green-600 bg-green-50 border-green-200';
  if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const INITIAL_APPLICATIONS = [
  { id: 'a1', jobId: 'j1', candidateId: 'c1', status: 'Em Análise', appliedAt: new Date(Date.now() - 86400000).toISOString(), matchScore: 88 },
  { id: 'a2', jobId: 'j2', candidateId: 'c2', status: 'Enviado', appliedAt: new Date().toISOString(), matchScore: 65 }
];

const STATUS_STYLES = {
  'Enviado': 'bg-slate-100 text-slate-700 border-slate-200',
  'Em Análise': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Entrevista': 'bg-blue-50 text-blue-700 border-blue-200',
  'Aprovado': 'bg-green-50 text-green-700 border-green-200',
  'Rejeitado': 'bg-red-50 text-red-700 border-red-200',
};

const formatDate = (isoString) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const HomeView = ({ jobs, onApply, currentUser, applications, searchTerm, setSearchTerm, navigateTo }) => {
  const [filterCategory, setFilterCategory] = useState('Todas as Áreas');
  const [filterWorkModel, setFilterWorkModel] = useState('Todos os Modelos');
  const [filterExperience, setFilterExperience] = useState('Qualquer Nível');

  const appliedJobIds = currentUser?.type === 'candidate' 
    ? applications.filter(a => a.candidateId === currentUser.id).map(a => a.jobId) 
    : [];

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const searchStr = searchTerm.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const jobStr = `${job.title} ${job.company} ${job.skills?.join(' ')}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchesSearch = jobStr.includes(searchStr);
      const matchesCategory = filterCategory === 'Todas as Áreas' || job.category === filterCategory;
      const matchesModel = filterWorkModel === 'Todos os Modelos' || job.workModel === filterWorkModel;
      const matchesExperience = filterExperience === 'Qualquer Nível' || job.experience === filterExperience;
      return matchesSearch && matchesCategory && matchesModel && matchesExperience;
    });
  }, [jobs, searchTerm, filterCategory, filterWorkModel, filterExperience]);

  return (
    <main className="min-h-screen pb-24 bg-slate-50">
      <div className="bg-indigo-900 text-white pt-20 pb-28 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight text-white">
            Conectando Talentos às <span className="text-blue-400">Melhores Empresas</span>
          </h1>
          <p className="text-lg text-indigo-200 mb-10 max-w-2xl mx-auto font-medium">
            O hub de empregabilidade mais inteligente de Presidente Prudente. Encontre vagas alinhadas às suas habilidades.
          </p>
          
          <div className="bg-white p-2 rounded-2xl flex flex-col md:flex-row gap-2 shadow-2xl max-w-3xl mx-auto transition-all focus-within:ring-4 focus-within:ring-blue-500/30">
            <div className="flex-1 flex items-center px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input 
                type="text" 
                placeholder="Cargo, empresa ou habilidades (ex: React, Excel)..." 
                className="w-full bg-transparent border-none outline-none text-slate-900 placeholder-slate-400 text-sm font-medium" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
              />
            </div>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center">
              Buscar Vagas
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-64 flex-shrink-0 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 mb-5">
                <Filter className="w-4 h-4 text-blue-600" /> Filtros Avançados
              </h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Área de Atuação</label>
                  <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer">
                    <option>Todas as Áreas</option><option>Tecnologia</option><option>Administrativo</option><option>Comercial</option><option>Marketing</option><option>Saúde</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Modelo</label>
                  <select value={filterWorkModel} onChange={(e) => setFilterWorkModel(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer">
                    <option>Todos os Modelos</option><option>Presencial</option><option>Remoto</option><option>Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Experiência</label>
                  <select value={filterExperience} onChange={(e) => setFilterExperience(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition-colors cursor-pointer">
                    <option>Qualquer Nível</option><option>Primeiro Emprego</option><option>Estágio</option><option>Júnior</option><option>Pleno</option><option>Sênior</option>
                  </select>
                </div>
              </div>
              
              <button onClick={() => { setFilterCategory('Todas as Áreas'); setFilterWorkModel('Todos os Modelos'); setFilterExperience('Qualquer Nível'); setSearchTerm(''); }} className="w-full mt-6 bg-slate-100 text-slate-600 font-bold text-xs py-3 rounded-xl hover:bg-slate-200 transition-colors">
                Limpar Filtros
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Vagas Recentes</h2>
              <span className="text-sm font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">{filteredJobs.length} encontradas</span>
            </div>

            {filteredJobs.length === 0 ? (
              <div className="bg-white p-16 text-center rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhuma vaga encontrada</h3>
                <p className="text-slate-500 text-sm max-w-md">Não encontramos vagas com esses filtros no momento. Tente buscar por outras palavras-chave ou remover filtros.</p>
              </div>
            ) : (
              filteredJobs.map(job => {
                const isApplied = appliedJobIds.includes(job.id);
                // Calcula Match Dinâmico na Home se logado como candidato
                const matchScore = currentUser?.type === 'candidate' ? calculateIntelligentMatch(job, currentUser) : null;

                return (
                  <div key={job.id} className={`bg-white p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col gap-4 ${job.premium ? 'border-amber-200 bg-gradient-to-r from-amber-50/40 to-transparent' : 'border-slate-200 hover:border-blue-300'}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="text-xs font-bold text-slate-500 flex items-center bg-slate-100 px-2 py-1 rounded-md"><Clock className="w-3.5 h-3.5 mr-1" /> {job.postedAt}</span>
                          {job.premium && <span className="bg-gradient-to-r from-amber-200 to-amber-100 text-amber-800 text-[10px] uppercase font-black px-2.5 py-1 rounded-md flex items-center tracking-wider shadow-sm border border-amber-200"><Sparkles className="w-3 h-3 mr-1" /> Destaque</span>}
                          
                          {/* Badge de Match para o Candidato */}
                          {matchScore !== null && (
                            <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-md flex items-center tracking-wider border ${getMatchColor(matchScore)}`}>
                              <Target className="w-3 h-3 mr-1" /> {matchScore}% de Match
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-extrabold text-slate-900 mb-1">{job.title}</h3>
                        <p className="text-sm font-semibold text-slate-500 mb-4 flex items-center"><Building2 className="w-4 h-4 mr-1.5 opacity-70"/> {job.company}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          <span className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> {job.location}</span>
                          <span className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center"><Laptop className="w-3.5 h-3.5 mr-1.5 text-indigo-500" /> {job.workModel}</span>
                          <span className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center"><Briefcase className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> {job.contract}</span>
                          <span className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center"><GraduationCap className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> {job.experience}</span>
                        </div>
                        
                        {job.skills && job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                             {job.skills.map(skill => (
                               <span key={skill} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                 {skill}
                               </span>
                             ))}
                          </div>
                        )}
                        
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{job.description}</p>
                      </div>
                      
                      <div className="flex items-center md:items-start justify-start md:justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-5 md:pt-0 md:pl-6 w-full md:w-auto">
                        <button 
                          onClick={() => onApply(job)} 
                          disabled={isApplied || currentUser?.type === 'company'} 
                          className={`w-full md:w-auto px-8 py-3.5 rounded-xl text-sm font-bold transition-all ${
                            isApplied 
                            ? 'bg-green-50 text-green-700 border-2 border-green-200 cursor-default' 
                            : currentUser?.type === 'company'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-100'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-blue-600/30'
                          }`}
                        >
                          {isApplied ? (
                            <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Aplicado</span>
                          ) : currentUser?.type === 'company' ? (
                            'Visão Empresa'
                          ) : 'Candidatar-se'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

const CandidateDashboard = ({ user, jobs, applications, onUpdateProfile, showNotification, navigateTo }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [formData, setFormData] = useState({
    ...user,
    skillsStr: user.skills ? user.skills.join(', ') : '' // String para facilitar a edição no input
  });

  const myApplications = applications.filter(a => a.candidateId === user.id).map(app => {
    const jobDetails = jobs.find(j => j.id === app.jobId);
    return { ...app, job: jobDetails };
  }).filter(app => app.job);

  // Recomendações baseadas no Match Inteligente
  const recommendedJobs = useMemo(() => {
    return jobs
      .filter(j => !myApplications.some(a => a.jobId === j.id))
      .map(job => ({ ...job, match: calculateIntelligentMatch(job, user) }))
      .sort((a, b) => b.match - a.match)
      .slice(0, 3);
  }, [jobs, myApplications, user]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const parsedSkills = formData.skillsStr.split(',').map(s => s.trim()).filter(s => s !== '');
    
    // Incrementa perfil se adicionou skills
    const newCompleteness = parsedSkills.length > 0 && formData.about && formData.education ? 100 : 70;

    onUpdateProfile({ 
      ...formData, 
      skills: parsedSkills,
      profileCompleteness: newCompleteness 
    });
    showNotification('Currículo atualizado com sucesso e salvo no banco de talentos!');
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-8 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-24 bg-indigo-600"></div>
              <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 flex items-center justify-center relative z-10 border-4 border-white shadow-lg">
                <User className="w-10 h-10 text-indigo-300" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{user.name}</h2>
              <p className="text-sm font-medium text-slate-500 mb-2">{user.role || 'Profissional'}</p>
              
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-left mt-4">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Força do Perfil</span>
                  <span className="text-sm font-black text-indigo-600">{user.profileCompleteness || 30}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000" style={{width: `${user.profileCompleteness || 30}%`}}></div>
                </div>
                {(user.profileCompleteness || 30) < 100 && (
                  <button onClick={() => setActiveTab('resume')} className="text-[10px] text-indigo-600 font-bold mt-2 text-center w-full hover:underline">Complete seu currículo (+Vantagem)</button>
                )}
              </div>
            </div>

            <nav className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm space-y-1">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Visão Geral' },
                { id: 'resume', icon: FileSignature, label: 'Meu Currículo' },
                { id: 'applications', icon: Briefcase, label: 'Minhas Vagas', badge: myApplications.length }
              ].map(item => (
                <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <div className="flex items-center gap-3"><item.icon className="w-5 h-5"/> {item.label}</div>
                  {item.badge !== undefined && <span className="bg-slate-200 text-slate-700 text-xs py-0.5 px-2 rounded-lg">{item.badge}</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex-1">
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estatísticas de Carreira</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600"><Briefcase className="w-6 h-6"/></div>
                    <div><p className="text-sm font-bold text-slate-500">Aplicações</p><p className="text-3xl font-black text-slate-900">{myApplications.length}</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600"><Activity className="w-6 h-6"/></div>
                    <div><p className="text-sm font-bold text-slate-500">Em Processo</p><p className="text-3xl font-black text-slate-900">{myApplications.filter(a => ['Em Análise', 'Entrevista'].includes(a.status)).length}</p></div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600"><CheckCircle2 className="w-6 h-6"/></div>
                    <div><p className="text-sm font-bold text-slate-500">Aprovações</p><p className="text-3xl font-black text-slate-900">{myApplications.filter(a => a.status === 'Aprovado').length}</p></div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500"/> Sugestões de Alto Match
                    </h3>
                    <button onClick={() => navigateTo('home')} className="text-sm font-bold text-indigo-600 hover:underline">Ver todas</button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {recommendedJobs.map(job => (
                      <div key={job.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-slate-50 transition-colors gap-4">
                         <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black flex-shrink-0 border ${getMatchColor(job.match)}`}>
                             {job.match}%
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-base">{job.title}</h4>
                            <p className="text-sm text-slate-500 font-medium">{job.company} • {job.location}</p>
                          </div>
                        </div>
                        <button onClick={() => navigateTo('home')} className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:border-indigo-600 hover:text-indigo-600 transition-colors">
                          Candidatar-se
                        </button>
                      </div>
                    ))}
                    {recommendedJobs.length === 0 && <div className="p-6 text-center text-slate-500">Atualize seu currículo com habilidades para receber recomendações.</div>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'resume' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Currículo Digital</h2>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  
                  {/* Bloco 1: Básicos */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2"><UserCheck className="w-5 h-5 text-indigo-600"/> Dados Principais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                      <div><label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" /></div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-2">Cargo Desejado</label><input type="text" value={formData.role || ''} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="Ex: Desenvolvedor, Vendedor..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                       <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nível de Experiência</label>
                        <select value={formData.experienceLevel || ''} onChange={e => setFormData({...formData, experienceLevel: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none">
                           <option value="">Selecione...</option><option>Primeiro Emprego</option><option>Estágio</option><option>Júnior</option><option>Pleno</option><option>Sênior</option>
                        </select>
                       </div>
                       <div>
                         <label className="block text-sm font-bold text-slate-700 mb-2">Escolaridade</label>
                         <select value={formData.education || ''} onChange={e => setFormData({...formData, education: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none">
                            <option value="">Selecione...</option><option>Ensino Médio</option><option>Técnico</option><option>Superior Incompleto</option><option>Superior Completo</option>
                         </select>
                       </div>
                       <div><label className="block text-sm font-bold text-slate-700 mb-2">Pretensão Salarial</label><input type="text" value={formData.salaryExpectation || ''} onChange={e => setFormData({...formData, salaryExpectation: e.target.value})} placeholder="Ex: R$ 3.000" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none" /></div>
                    </div>
                  </div>

                  {/* Bloco 2: Motor de Match (Skills) */}
                  <div className="bg-white p-6 rounded-3xl border border-amber-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4"><Brain className="w-16 h-16 text-amber-100 opacity-50"/></div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500"/> Habilidades & Conhecimentos (Skills)</h3>
                    <p className="text-sm text-slate-500 mb-4">Separe por vírgula. Isso ajuda nosso algoritmo a conectar você às melhores vagas.</p>
                    <input 
                      type="text" 
                      value={formData.skillsStr} 
                      onChange={e => setFormData({...formData, skillsStr: e.target.value})} 
                      placeholder="Ex: Pacote Office, React, Vendas, Atendimento ao Cliente..." 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all relative z-10" 
                    />
                    {formData.skillsStr && (
                      <div className="flex flex-wrap gap-2 mt-3 relative z-10">
                        {formData.skillsStr.split(',').filter(s=>s.trim()).map((s, i) => (
                           <span key={i} className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-1 rounded-md">{s.trim()}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Resumo Profissional</h3>
                    <textarea rows="4" value={formData.about || ''} onChange={e => setFormData({...formData, about: e.target.value})} placeholder="Conte um pouco sobre sua trajetória, conquistas e objetivos..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"></textarea>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button type="submit" className="bg-indigo-600 text-white text-base font-bold px-10 py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-1">
                      Salvar Currículo e Atualizar Perfil
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'applications' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Histórico de Aplicações</h2>
                
                {myApplications.length === 0 ? (
                  <div className="bg-white text-center py-20 rounded-3xl border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100"><Briefcase className="w-8 h-8 text-slate-300"/></div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Você ainda não se candidatou</h3>
                    <p className="text-slate-500 mb-6 max-w-sm mx-auto">Vá para a página inicial e encontre a oportunidade perfeita para o seu perfil.</p>
                    <button onClick={() => navigateTo('home')} className="bg-indigo-600 text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 shadow-md">Buscar Vagas</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myApplications.map((app) => (
                      <div key={app.id} className="bg-white p-6 border border-slate-200 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 border border-slate-200 flex-shrink-0">
                            <Building2 className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-lg mb-1">{app.job.title}</h4>
                            <div className="text-sm font-medium text-slate-500 flex flex-wrap items-center gap-2">
                              <span className="text-slate-700">{app.job.company}</span>
                              <span>•</span>
                              <span>{app.job.location}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-2 flex items-center">
                              <Clock className="w-3 h-3 mr-1"/> Aplicado em: {formatDate(app.appliedAt)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full md:w-auto flex flex-col items-start md:items-end pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Status do Processo</p>
                           <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold border ${STATUS_STYLES[app.status]}`}>
                             {app.status === 'Enviado' && <CheckCircle2 className="w-4 h-4 mr-2" />}
                             {app.status === 'Em Análise' && <Eye className="w-4 h-4 mr-2" />}
                             {app.status === 'Entrevista' && <Calendar className="w-4 h-4 mr-2" />}
                             {app.status === 'Aprovado' && <Check className="w-4 h-4 mr-2" />}
                             {app.status === 'Rejeitado' && <XCircle className="w-4 h-4 mr-2" />}
                             {app.status}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
};

const CompanyDashboard = ({ user, jobs, setJobs, users, applications, onUpdateAppStatus, showNotification }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [credits, setCredits] = useState(user.credits);

  const myJobs = jobs.filter(j => j.companyId === user.id);
  const myJobIds = myJobs.map(j => j.id);
  
  // Enriquecendo a lista de candidaturas com dados detalhados para a Empresa
  const candidatesApplied = applications
    .filter(app => myJobIds.includes(app.jobId))
    .map(app => {
       const candData = users.find(u => u.id === app.candidateId);
       const jobData = myJobs.find(j => j.id === app.jobId);
       // Recalcula o match real baseado nos dados atuais
       const realMatch = calculateIntelligentMatch(jobData, candData);
       
       // Lógica visual para mostrar quais skills deram match
       let matchingSkills = [];
       let missingSkills = [];
       if (jobData?.skills && candData?.skills) {
          const candLower = candData.skills.map(s => s.toLowerCase());
          matchingSkills = jobData.skills.filter(s => candLower.includes(s.toLowerCase()));
          missingSkills = jobData.skills.filter(s => !candLower.includes(s.toLowerCase()));
       }

       return { ...app, candidate: candData, job: jobData, realMatch, matchingSkills, missingSkills };
    })
    .sort((a,b) => b.realMatch - a.realMatch); // Ordena pelos melhores candidatos primeiro

  const handlePostJob = (e) => {
    e.preventDefault();
    if (credits <= 0) {
      showNotification("Limite atingido. Assine o plano Premium para postar mais vagas.", "error");
      return;
    }
    const formData = new FormData(e.target);
    const skillsArray = formData.get('skills').split(',').map(s=>s.trim()).filter(s=>s!=='');

    const newJob = {
      id: `j${Date.now()}`,
      companyId: user.id,
      title: formData.get('title'),
      company: user.name,
      location: 'Presidente Prudente, SP',
      category: formData.get('category'),
      workModel: formData.get('workModel'),
      experience: formData.get('experience'),
      contract: formData.get('contract'),
      postedAt: 'Agora mesmo',
      premium: formData.get('premium') === 'on',
      description: formData.get('description'),
      skills: skillsArray
    };
    setJobs([newJob, ...jobs]);
    setCredits(credits - 1);
    showNotification("Vaga publicada e visível para todos os candidatos!");
    setShowNewJobForm(false);
    e.target.reset();
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-8 pb-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          <div className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto mb-4 flex items-center justify-center border border-slate-200 shadow-inner">
                <Building2 className="w-8 h-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight mb-1">{user.name}</h2>
              <div className="inline-block mt-2 bg-slate-100 text-slate-500 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                CNPJ: {user.cnpj}
              </div>
              
              <div className="mt-6 pt-6 border-t border-slate-100 text-left">
                <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                  <div>
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-wider block mb-1">Seu Plano</span>
                    <span className="text-sm font-black text-indigo-800 flex items-center"><Award className="w-4 h-4 mr-1"/> Freemium</span>
                  </div>
                  <div className="text-center bg-white border border-indigo-100 rounded-xl px-3 py-2 shadow-sm">
                    <span className="block text-xl font-black text-indigo-600 leading-none">{credits}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Vagas Restantes</span>
                  </div>
                </div>
              </div>
            </div>

            <nav className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm space-y-1">
              {[
                { id: 'overview', icon: LayoutDashboard, label: 'Resumo Operacional' },
                { id: 'vagas', icon: Briefcase, label: 'Gerenciar Vagas', badge: myJobs.length },
                { id: 'candidatos', icon: Users, label: 'Caixa de Currículos', badge: candidatesApplied.length },
                { id: 'talentos', icon: Sparkles, label: 'Busca Ativa (Premium)', premium: true }
              ].map(item => (
                <button key={item.id} onClick={() => {setActiveTab(item.id); setShowNewJobForm(false);}} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === item.id && !showNewJobForm ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-3">
                    <item.icon className={`w-5 h-5 ${item.premium ? 'text-amber-500' : ''}`}/> 
                    <span className={item.premium ? 'text-slate-800' : ''}>{item.label}</span>
                  </div>
                  {item.badge !== undefined && <span className="bg-slate-100 text-slate-600 text-xs py-0.5 px-2 rounded-lg">{item.badge}</span>}
                </button>
              ))}
            </nav>
            
            <button onClick={() => {setShowNewJobForm(true); setActiveTab('vagas');}} className="w-full bg-indigo-600 text-white text-sm font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 hover:-translate-y-1">
              <PlusCircle className="w-5 h-5"/> Publicar Nova Vaga
            </button>
          </div>

          <div className="flex-1">
            {activeTab === 'overview' && !showNewJobForm && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Recrutamento em Números</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-bold text-slate-500 mb-1">Vagas Publicadas</p>
                    <p className="text-4xl font-black text-slate-900">{myJobs.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-bold text-slate-500 mb-1">Currículos Recebidos</p>
                    <p className="text-4xl font-black text-indigo-600">{candidatesApplied.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-sm font-bold text-slate-500 mb-1">Entrevistas Agendadas</p>
                    <p className="text-4xl font-black text-amber-500">
                      {candidatesApplied.filter(c => c.status === 'Entrevista').length}
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mt-8">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">Novos Candidatos (Ordenados por Match)</h3>
                    <button onClick={()=>setActiveTab('candidatos')} className="text-sm font-bold text-indigo-600 hover:underline">Ver Pipeline</button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {candidatesApplied.slice(0,4).map(app => (
                      <div key={app.id} className="p-5 flex justify-between items-center hover:bg-slate-50">
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border font-black ${getMatchColor(app.realMatch)}`}>
                              <span className="text-sm leading-none">{app.realMatch}%</span>
                              <span className="text-[8px] uppercase">Match</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{app.candidate?.name}</p>
                              <p className="text-xs text-slate-500">{app.job?.title}</p>
                            </div>
                         </div>
                         <button onClick={() => setActiveTab('candidatos')} className="text-slate-600 border border-slate-200 hover:bg-slate-100 px-4 py-2 rounded-lg font-bold text-xs">Avaliar</button>
                      </div>
                    ))}
                    {candidatesApplied.length === 0 && <div className="p-8 text-center text-slate-500">Nenhum candidato recebido ainda.</div>}
                  </div>
                </div>
              </div>
            )}

            {showNewJobForm ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Estruturar Nova Vaga</h2>
                <p className="text-slate-500 text-sm mb-8">Defina os requisitos claramente para que nosso algoritmo encontre os melhores candidatos.</p>
                
                <form onSubmit={handlePostJob} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Cargo/Título da Vaga</label>
                      <input name="title" required type="text" placeholder="Ex: Analista de Marketing Sênior" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Área de Atuação</label>
                      <select name="category" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none">
                        <option>Tecnologia</option><option>Administrativo</option><option>Comercial</option><option>Saúde</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Modelo de Trabalho</label>
                      <select name="workModel" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none">
                        <option>Presencial</option><option>Remoto</option><option>Híbrido</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Experiência Desejada</label>
                      <select name="experience" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none">
                        <option>Primeiro Emprego</option><option>Estágio</option><option>Júnior</option><option>Pleno</option><option>Sênior</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
                    <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2"><Target className="w-4 h-4"/> Habilidades Obrigatórias (Skills)</label>
                    <p className="text-xs text-indigo-600 mb-3">Separe as palavras por vírgula. Isso será usado para cruzar com o currículo dos candidatos.</p>
                    <input name="skills" required type="text" placeholder="Ex: Comunicação, Pacote Office, React, Vendas..." className="w-full bg-white border border-indigo-200 rounded-xl p-3.5 text-sm focus:border-indigo-500 outline-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Descrição Completa</label>
                    <textarea name="description" required rows="5" placeholder="Descreva responsabilidades, dia a dia e benefícios oferecidos..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:border-indigo-500 outline-none"></textarea>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                     <input type="checkbox" name="premium" id="premium" className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer" />
                     <label htmlFor="premium" className="text-sm cursor-pointer">
                       <span className="font-bold text-slate-900 block flex items-center gap-1"><Sparkles className="w-4 h-4 text-amber-500"/> Promover Vaga (Opcional)</span>
                       <span className="text-slate-500">Destaca a vaga com bordas amarelas no topo do mural para atrair mais talentos.</span>
                     </label>
                  </div>

                  <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                    <button type="button" onClick={() => setShowNewJobForm(false)} className="px-6 py-3.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                    <button type="submit" disabled={credits <= 0} className="bg-indigo-600 text-white text-sm font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-md">
                      Publicar e Abrir Captação ({credits > 0 ? 'Consome 1 Crédito' : 'Sem Créditos'})
                    </button>
                  </div>
                </form>
              </div>
            ) : activeTab === 'vagas' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Suas Vagas Ativas</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {myJobs.length === 0 ? (
                    <div className="p-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200"><Briefcase className="w-8 h-8 text-slate-300"/></div>
                      <h4 className="text-lg font-bold text-slate-900 mb-2">Operação Vazia</h4>
                      <p className="text-slate-500 mb-6">Publique sua primeira vaga e comece a receber currículos inteligentemente.</p>
                      <button onClick={() => setShowNewJobForm(true)} className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700">Postar Vaga</button>
                    </div>
                  ) : (
                    myJobs.map(job => (
                      <div key={job.id} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                             <h4 className="font-extrabold text-slate-900 text-lg">{job.title}</h4>
                             {job.premium && <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded uppercase">Promovida</span>}
                          </div>
                          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">{job.category} • {job.experience}</span>
                          {job.skills && (
                             <div className="text-xs text-slate-400 mt-2">Habilidades exigidas: {job.skills.join(', ')}</div>
                          )}
                        </div>
                        <div className="flex gap-3">
                           <div className="text-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                             <span className="block text-lg font-black text-indigo-700 leading-none">{applications.filter(a => a.jobId === job.id).length}</span>
                             <span className="text-[10px] font-bold text-indigo-500 uppercase">Na Fila</span>
                           </div>
                           <button onClick={() => setActiveTab('candidatos')} className="text-sm font-bold bg-white text-slate-700 border-2 border-slate-200 px-5 py-2.5 rounded-xl hover:border-slate-300">Processar</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'candidatos' && !showNewJobForm && (
               <div className="space-y-6 animate-in fade-in duration-300">
                 <div className="flex justify-between items-end mb-4">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">Caixa de Currículos (Pipeline)</h2>
                 </div>
                 
                 {candidatesApplied.length === 0 ? (
                    <div className="bg-white p-16 text-center rounded-3xl border border-slate-200 shadow-sm">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4"/>
                      <h4 className="text-lg font-bold text-slate-900">Aguardando Aplicações</h4>
                      <p className="text-slate-500">Os talentos aparecerão aqui e serão ordenados automaticamente pelo nível de Match com a sua vaga.</p>
                    </div>
                 ) : (
                   candidatesApplied.map(app => (
                     <div key={app.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                        
                        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 relative z-10">
                           <div className="flex items-start gap-4 flex-1">
                              {/* Bolha de Match em Destaque */}
                              <div className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-black flex-shrink-0 shadow-sm ${getMatchColor(app.realMatch)}`}>
                                <span className="text-xl leading-none">{app.realMatch}%</span>
                                <span className="text-[9px] uppercase tracking-wider mt-1">Match</span>
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="font-extrabold text-slate-900 text-lg">{app.candidate?.name}</h4>
                                <p className="text-sm font-bold text-slate-500 mb-2">{app.candidate?.role} • {app.candidate?.experienceLevel}</p>
                                
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-600 mb-3">
                                  <p className="mb-2 italic">"{app.candidate?.about}"</p>
                                  {(app.candidate?.education || app.candidate?.salaryExpectation) && (
                                     <div className="flex gap-4 mt-3 pt-3 border-t border-slate-200 text-xs font-bold text-slate-500">
                                       {app.candidate.education && <span><GraduationCap className="inline w-3 h-3 mr-1"/> {app.candidate.education}</span>}
                                       {app.candidate.salaryExpectation && <span><DollarSign className="inline w-3 h-3 mr-1"/> {app.candidate.salaryExpectation}</span>}
                                     </div>
                                  )}
                                </div>
                                
                                {/* Análise de Skills do Algoritmo */}
                                {(app.matchingSkills.length > 0 || app.missingSkills.length > 0) && (
                                  <div className="mb-4 space-y-2">
                                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Análise de Habilidades</p>
                                     <div className="flex flex-wrap gap-1">
                                       {app.matchingSkills.map(s => (
                                         <span key={s} className="bg-green-100 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center"><Check className="w-3 h-3 mr-1"/> {s}</span>
                                       ))}
                                       {app.missingSkills.map(s => (
                                         <span key={s} className="bg-red-50 text-red-500 border border-red-100 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center"><X className="w-3 h-3 mr-1"/> Falta {s}</span>
                                       ))}
                                     </div>
                                  </div>
                                )}
                                
                                <div className="text-xs font-bold text-slate-400">
                                  Aplicou para: <span className="text-slate-600">{app.job?.title}</span> • {formatDate(app.appliedAt)}
                                </div>
                              </div>
                           </div>
                           
                           {/* Gestor de Status Kanban */}
                           <div className="flex flex-col items-start lg:items-end w-full lg:w-48 gap-2 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 w-full lg:text-right">Mover no Pipeline</label>
                                <select 
                                  value={app.status}
                                  onChange={(e) => {
                                    onUpdateAppStatus(app.id, e.target.value);
                                    showNotification(`Candidato movido para: ${e.target.value}`);
                                  }}
                                  className={`w-full font-bold text-sm rounded-xl px-4 py-3 outline-none border cursor-pointer appearance-none shadow-sm ${STATUS_STYLES[app.status]}`}
                                >
                                  <option value="Enviado">Caixa de Entrada (Enviado)</option>
                                  <option value="Em Análise">Separado (Em Análise)</option>
                                  <option value="Entrevista">Convidar p/ Entrevista</option>
                                  <option value="Aprovado">Contratar (Aprovado)</option>
                                  <option value="Rejeitado">Descartar (Rejeitado)</option>
                                </select>
                           </div>
                        </div>
                     </div>
                   ))
                 )}
               </div>
            )}

            {activeTab === 'talentos' && !showNewJobForm && (
              <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden h-[500px]">
                {/* Simulated content behind blur */}
                <div className="absolute inset-0 p-8 grid grid-cols-2 gap-4 opacity-40 blur-[5px] pointer-events-none">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="bg-slate-100 rounded-2xl h-32 border border-slate-200 p-4">
                        <div className="w-10 h-10 bg-slate-300 rounded-full mb-2"></div>
                        <div className="h-4 bg-slate-300 rounded w-1/2 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
                     </div>
                   ))}
                </div>
                
                <div className="absolute inset-0 bg-slate-50/60 backdrop-blur-md z-10 flex flex-col items-center justify-center p-6">
                   <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-md text-center transform transition-all hover:scale-105">
                      <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                        <Award className="w-8 h-8"/>
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 mb-2">Busca Ativa Premium</h4>
                      <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
                        Não espere os candidatos aplicarem. Com o plano Premium, você busca profissionais na base por habilidades, cargo e nível de match instantâneo.
                      </p>
                      <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-amber-500/30">
                        Assinar Plataforma RH
                      </button>
                   </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default function PrudenEmpregosApp() {
  const [currentView, setCurrentView] = useState('home');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Banco de Dados Simulado
  const [users, setUsers] = useState(INITIAL_USERS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [applications, setApplications] = useState(INITIAL_APPLICATIONS);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginType, setLoginType] = useState('candidate');
  const [isRegistering, setIsRegistering] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3500);
  };

  const navigateTo = (view) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleApply = (job) => {
    if (!currentUser) {
      setLoginType('candidate');
      setIsLoginModalOpen(true);
      showNotification('Você precisa estar logado para se candidatar.', 'error');
      return;
    }
    
    if (applications.some(a => a.jobId === job.id && a.candidateId === currentUser.id)) return;

    // Calcula match real na hora de enviar
    const matchScore = calculateIntelligentMatch(job, currentUser);

    const newApp = {
      id: `a${Date.now()}`,
      jobId: job.id,
      candidateId: currentUser.id,
      status: 'Enviado',
      appliedAt: new Date().toISOString(),
      matchScore: matchScore
    };
    
    setApplications([...applications, newApp]);
    showNotification('Currículo enviado com sucesso! O recrutador foi notificado.');
  };

  const handleUpdateAppStatus = (appId, newStatus) => {
    setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: newStatus } : app));
  };

  const handleUpdateProfile = (updatedData) => {
    setUsers(users.map(u => u.id === currentUser.id ? { ...u, ...updatedData } : u));
    setCurrentUser({ ...currentUser, ...updatedData });
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const name = formData.get('name');

    if (isRegistering) {
      const newUser = {
        id: loginType === 'candidate' ? `c${Date.now()}` : `e${Date.now()}`,
        type: loginType,
        name: name,
        email: email,
        credits: loginType === 'company' ? 1 : undefined,
        profileCompleteness: loginType === 'candidate' ? 30 : undefined,
        skills: []
      };
      setUsers([...users, newUser]);
      setCurrentUser(newUser);
      showNotification('Conta criada com sucesso! Bem-vindo(a).');
    } else {
      const foundUser = users.find(u => u.email === email && u.type === loginType);
      if (foundUser) {
        setCurrentUser(foundUser);
        showNotification(`Bem-vindo de volta, ${foundUser.name.split(' ')[0]}!`);
      } else {
        const fallback = users.find(u => u.type === loginType);
        setCurrentUser(fallback);
        showNotification('Login realizado em modo de demonstração.');
      }
    }
    
    setIsLoginModalOpen(false);
    navigateTo(loginType === 'candidate' ? 'candidate' : 'company');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    navigateTo('home');
    showNotification('Você saiu da sua conta.');
  };

  return (
    <div className="flex flex-col min-h-screen font-sans bg-slate-50 text-slate-900 selection:bg-indigo-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center cursor-pointer group" onClick={() => navigateTo('home')}>
              <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-md group-hover:bg-indigo-700 transition-colors"><Briefcase className="h-5 w-5 text-white" /></div>
              <span className="text-xl font-extrabold text-slate-900 tracking-tight">Pruden<span className="text-indigo-600">Empregos</span></span>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <button onClick={() => navigateTo('home')} className={`text-sm font-bold px-4 py-2 rounded-xl transition-colors ${currentView === 'home' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-100'}`}>Vagas Abertas</button>
              
              {!currentUser ? (
                <div className="flex items-center ml-2 border-l border-slate-200 pl-4 gap-3">
                  <button onClick={() => { setLoginType('company'); setIsLoginModalOpen(true); }} className="text-sm font-bold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">Para Empresas</button>
                  <button onClick={() => { setLoginType('candidate'); setIsLoginModalOpen(true); }} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md transition-all hover:-translate-y-0.5">Entrar / Cadastrar</button>
                </div>
              ) : (
                <div className="flex items-center gap-3 ml-2 pl-4 border-l border-slate-200">
                  <div className="text-right mr-2 hidden lg:block">
                    <span className="block text-sm font-black leading-tight text-slate-900">{currentUser.name.split(' ')[0]}</span>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">{currentUser.type === 'company' ? 'Recrutador' : 'Candidato'}</span>
                  </div>
                  <button onClick={() => navigateTo(currentUser.type === 'candidate' ? 'candidate' : 'company')} className="text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-5 py-2.5 rounded-xl hover:bg-indigo-100 transition-all">Painel Administrativo</button>
                  <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-2.5 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"><LogOut className="w-4 h-4" /></button>
                </div>
              )}
            </div>
            
            <div className="md:hidden">
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 bg-slate-100 rounded-lg">{mobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}</button>
            </div>
          </div>
        </div>
        
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 p-4 space-y-2 shadow-xl absolute w-full z-50">
             <button onClick={() => { navigateTo('home'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50">Mural de Vagas</button>
             {!currentUser ? (
               <>
                 <button onClick={() => { setLoginType('company'); setIsLoginModalOpen(true); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50">Portal B2B (Empresas)</button>
                 <button onClick={() => { setLoginType('candidate'); setIsLoginModalOpen(true); setMobileMenuOpen(false); }} className="block w-full px-4 py-3 mt-2 bg-indigo-600 text-white rounded-xl font-bold text-center">Entrar / Cadastrar</button>
               </>
             ) : (
               <>
                 <button onClick={() => { navigateTo(currentUser.type === 'candidate' ? 'candidate' : 'company'); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 mt-2 rounded-xl font-bold text-indigo-700 bg-indigo-50">Acessar Meu Painel</button>
                 <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="block w-full text-left px-4 py-3 rounded-xl font-bold text-red-600 hover:bg-red-50 mt-1">Sair da Conta</button>
               </>
             )}
          </div>
        )}
      </header>

      <div className="flex-grow">
        {currentView === 'home' && (
          <HomeView 
            jobs={jobs} 
            applications={applications}
            currentUser={currentUser}
            onApply={handleApply} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm}
            navigateTo={navigateTo}
          />
        )}
        {currentView === 'candidate' && currentUser?.type === 'candidate' && (
          <CandidateDashboard 
            user={currentUser} 
            jobs={jobs} 
            applications={applications} 
            onUpdateProfile={handleUpdateProfile}
            showNotification={showNotification} 
            navigateTo={navigateTo}
          />
        )}
        {currentView === 'company' && currentUser?.type === 'company' && (
          <CompanyDashboard 
            user={currentUser} 
            jobs={jobs} 
            setJobs={setJobs} 
            users={users}
            applications={applications} 
            onUpdateAppStatus={handleUpdateAppStatus}
            showNotification={showNotification} 
          />
        )}
      </div>

      <footer className="bg-white border-t border-slate-200 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center">
            <div className="bg-slate-100 p-2 rounded-lg mr-3"><Briefcase className="h-4 w-4 text-indigo-600" /></div>
            <span className="text-lg font-extrabold text-slate-900 tracking-tight">Pruden<span className="text-indigo-600">Empregos</span></span>
          </div>
          <div className="text-sm font-semibold text-slate-500">© {new Date().getFullYear()} Plataforma Inteligente de Empregabilidade.</div>
        </div>
      </footer>

      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsLoginModalOpen(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                  {loginType === 'candidate' ? <User className="w-5 h-5 text-indigo-600"/> : <Building2 className="w-5 h-5 text-indigo-600"/>}
                </div>
                {loginType === 'candidate' ? 'Sou Profissional' : 'Sou Empresa'}
              </h2>
              <button onClick={() => setIsLoginModalOpen(false)} className="text-slate-400 bg-slate-50 p-2 rounded-full hover:text-slate-900 hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="mb-8 flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              <button onClick={() => setIsRegistering(false)} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isRegistering ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Já tenho conta</button>
              <button onClick={() => setIsRegistering(true)} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isRegistering ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Criar Conta</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {isRegistering && (
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{loginType === 'candidate' ? "Nome Completo" : "Razão Social"}</label>
                   <input name="name" required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" />
                 </div>
              )}
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail de Acesso</label>
                 <input name="email" required type="email" defaultValue={loginType === 'candidate' ? 'danilo@email.com' : 'rh@techprudente.com'} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" />
              </div>
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
                 <input name="password" required type="password" defaultValue="123456" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm outline-none focus:border-indigo-500 focus:bg-white" />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white text-base font-bold py-4 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 mt-2 transition-all hover:-translate-y-0.5">
                {isRegistering ? 'Finalizar Cadastro' : 'Entrar na Plataforma'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast.show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border bg-white ${toast.type === 'error' ? 'border-red-200' : 'border-green-200'}`}>
            {toast.type === 'error' ? <AlertCircle className="w-6 h-6 text-red-500" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
            <span className={`font-bold text-sm ${toast.type === 'error' ? 'text-red-900' : 'text-slate-800'}`}>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}