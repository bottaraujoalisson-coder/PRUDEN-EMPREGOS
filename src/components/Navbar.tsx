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
    <header className="bg-white/95 backdrop-blur-md border-b border-[#DBEAFE] sticky top-0 z-40">
      <div className="container-app">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single-Element Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="text-[18px] font-extrabold tracking-tight text-[#1E40AF] hover:text-[#1D4ED8] transition-colors cursor-pointer shrink-0 whitespace-nowrap"
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
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Vagas
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('plans')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'plans'
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Créditos
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('company', 'register')}
                  className="text-[#475569] hover:text-[#1D4ED8] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Para Empresas
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuth('candidate', 'login')}
                  className="text-[#475569] hover:text-[#1D4ED8] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Buscar Vagas
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('candidate', candidateSubTab)}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'candidate'
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Meu Painel
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('plans')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'plans'
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Pacotes de Créditos
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[#475569] hover:text-[#1D4ED8] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Sair
                </button>
              </>
            )}

            {currentUser && userIsCompany && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate('company', 'jobs')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'company'
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Painel da Empresa
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('plans')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'plans'
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Créditos
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className={`transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    currentView === 'home'
                      ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                      : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
                  }`}
                >
                  Mural
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="text-[#475569] hover:text-[#1D4ED8] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
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
                    ? 'text-[#1D4ED8] font-semibold underline underline-offset-8 decoration-2 decoration-[#2563EB]'
                    : 'text-[#475569] hover:text-[#1D4ED8] font-medium'
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
                Criar conta (+30 cr grátis)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate(userPanelView)}
                className="btn-base btn-sm btn-secondary whitespace-nowrap shrink-0"
              >
                <span className="truncate max-w-[140px] font-semibold text-[#1E40AF]">
                  {currentUser.name.split(' ')[0]}
                </span>
                <span className="text-[12px] text-[#475569] font-normal">
                  · {userIsCompany ? 'Empresa' : isAdmin ? 'Admin' : 'Meu Painel'}
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-10 h-10 inline-flex items-center justify-center text-[#1E40AF] hover:bg-[#EFF6FF] rounded-lg cursor-pointer"
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
          className="md:hidden bg-white border-t border-[#DBEAFE] px-4 py-4 space-y-3"
        >
          <nav className="flex flex-col space-y-1" aria-label="Menu móvel">
            {!currentUser && (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav('home')}
                  className={`w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] ${
                    currentView === 'home'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                      : 'text-[#475569]'
                  }`}
                >
                  Vagas
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('plans')}
                  className={`w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] ${
                    currentView === 'plans'
                      ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                      : 'text-[#475569]'
                  }`}
                >
                  Pacotes de Créditos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAuth('company', 'register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#475569]"
                >
                  Para Empresas
                </button>
              </>
            )}

            {currentUser && userIsCandidate && (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav('home')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#1E40AF] font-medium"
                >
                  Buscar Vagas
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('candidate', candidateSubTab)}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#475569]"
                >
                  Meu Painel
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('plans')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#475569]"
                >
                  Pacotes de Créditos
                </button>
              </>
            )}

            {currentUser && userIsCompany && (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav('company', 'jobs')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#1E40AF] font-medium"
                >
                  Painel da Empresa
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('plans')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#475569]"
                >
                  Pacotes de Créditos
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav('home')}
                  className="w-full min-h-[42px] text-left px-3 py-2 rounded-lg text-[14px] text-[#475569]"
                >
                  Mural de Vagas
                </button>
              </>
            )}
          </nav>

          <div className="pt-3 border-t border-[#DBEAFE] flex gap-2">
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
