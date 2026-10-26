import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { UserProfile } from '../types';
import { isCandidate, isCompany } from '../utils/matchAlgorithm';

interface NavbarProps {
  currentUser: UserProfile | null;
  isAdmin: boolean;
  currentView: string;
  candidateSubTab?: 'applications' | 'resume' | 'saved';
  companySubTab?: 'jobs' | 'candidates' | 'post' | 'credits';
  onNavigate: (view: string, subTab?: string) => void;
  onOpenAuth: (type: 'candidate' | 'company', mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onOpenLgpd: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isAdmin,
  currentView,
  candidateSubTab = 'applications',
  companySubTab = 'jobs',
  onNavigate,
  onOpenAuth,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userIsCandidate = isCandidate(currentUser);
  const userIsCompany = isCompany(currentUser);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleMobileNav = (view: string, subTab?: string) => {
    onNavigate(view, subTab);
    setMobileMenuOpen(false);
  };

  const userPanelView =
    currentUser?.type === 'admin'
      ? 'admin'
      : userIsCompany
      ? 'company'
      : 'candidate';

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-[#EAECEF] sticky top-0 z-40">
      <div className="container-app">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single-Element Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-[18px] font-bold tracking-tight text-[#0F172A] cursor-pointer shrink-0 whitespace-nowrap"
            aria-label="Ir para a página inicial do PrudenEmpregos"
          >
            PrudenEmpregos
          </button>

          {/* Zone 2: Minimalist Single-Line Navigation Links */}
          <nav
            aria-label="Navegação principal"
            className="hidden md:flex items-center gap-6 text-[14px]"
          >
            {!currentUser && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'home'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Vagas
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('plans')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'plans'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Planos & Vantagens
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('candidate', 'register')}
                  className="text-[#64748B] hover:text-[#0F172A] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Candidatos
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('company', 'register')}
                  className="text-[#64748B] hover:text-[#0F172A] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Empresas
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('candidate', 'login')}
                  className="text-[#64748B] hover:text-[#0F172A] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Entrar
                </button>
              </>
            )}

            {currentUser && userIsCandidate && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'home'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Buscar Vagas
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('candidate', candidateSubTab)}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'candidate'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Meu Painel
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('plans')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'plans'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Pacotes de Créditos
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[#64748B] hover:text-[#0F172A] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Sair
                </button>
              </>
            )}

            {currentUser && userIsCompany && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('company', 'candidates')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'company' && companySubTab === 'candidates'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Candidatos
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('company', 'jobs')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'company' && companySubTab === 'jobs'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Minhas vagas
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('company', 'post')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'company' && companySubTab === 'post'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Publicar vaga
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('plans')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'plans'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Planos
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'home'
                      ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                      : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                  }`}
                >
                  Mural
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[#64748B] hover:text-[#0F172A] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Sair
                </button>
              </>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin')}
                className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  currentView === 'admin'
                    ? 'text-[#0F172A] font-semibold underline underline-offset-8 decoration-2 decoration-[#0F172A]'
                    : 'text-[#64748B] hover:text-[#0F172A] font-medium'
                }`}
              >
                Admin
              </button>
            )}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="hidden md:flex items-center shrink-0">
            {!currentUser ? (
              <button
                type="button"
                onClick={() => onOpenAuth('candidate', 'register')}
                className="btn-base btn-sm btn-primary whitespace-nowrap shrink-0"
              >
                Criar conta grátis
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(userPanelView)}
                className="btn-base btn-sm btn-secondary whitespace-nowrap shrink-0"
              >
                <span className="truncate max-w-[140px] font-medium text-[#0F172A]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[12px] text-[#64748B] font-normal">
                  · {userIsCompany ? 'Painel CNPJ' : isAdmin ? 'Admin' : 'Meu Painel'}
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 inline-flex items-center justify-center text-[#0F172A] hover:bg-[#F4F4F5] rounded-lg cursor-pointer"
              aria-label={mobileMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Minimalist Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="md:hidden bg-white border-t border-[#EAECEF] px-4 py-4 space-y-3"
        >
          <nav className="flex flex-col space-y-1" aria-label="Menu móvel">
            {!currentUser && (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav('home')}
                  className={`w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] ${
                    currentView === 'home'
                      ? 'bg-[#F4F4F5] text-[#0F172A] font-semibold'
                      : 'text-[#64748B]'
                  }`}
                >
                  Vagas
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('plans')}
                  className={`w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] ${
                    currentView === 'plans'
                      ? 'bg-[#F4F4F5] text-[#0F172A] font-semibold'
                      : 'text-[#64748B]'
                  }`}
                >
                  Planos & Vantagens
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('candidate', 'login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Para candidatos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('company', 'register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Para empresas
                </button>
              </>
            )}

            {currentUser && userIsCandidate && (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav('home')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#0F172A] font-medium"
                >
                  Vagas
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('candidate', 'applications')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Minhas candidaturas
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('candidate', 'resume')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Meu currículo
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('candidate', 'saved')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Vagas salvas
                </button>
              </>
            )}

            {currentUser && userIsCompany && (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav('company', 'candidates')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#0F172A] font-medium"
                >
                  Painel da empresa
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('company', 'jobs')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Minhas vagas
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('company', 'post')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#64748B]"
                >
                  Publicar vaga
                </button>
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-[#EAECEF] flex gap-2">
            {!currentUser ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('candidate', 'login');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 btn-base btn-md btn-secondary"
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('candidate', 'register');
                    setMobileMenuOpen(false);
                  }}
                  className="flex-1 btn-base btn-md btn-primary"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full btn-base btn-md btn-secondary text-[#DC2626]"
              >
                Sair ({currentUser.name.split(' ')[0]})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
