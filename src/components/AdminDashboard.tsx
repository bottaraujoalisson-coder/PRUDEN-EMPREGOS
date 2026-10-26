import React, { useState, useEffect } from 'react';
import { Job, UserProfile, ModerationReport } from '../types';
import { getReports, updateReportStatus } from '../services/reportsService';
import {
  getAllUsersForAdmin,
  saveUserProfile,
  deleteUserByAdmin,
  clearAllDatabaseData,
  ADMIN_EMAIL,
} from '../services/usersService';
import {
  formatDate,
  SALARY_REFERENCE_ANCHORS,
  CATEGORY_SKILL_ANCHORS,
} from '../utils/matchAlgorithm';
import { requestJobOptimization } from '../services/aiService';

interface AdminDashboardProps {
  currentUser: UserProfile;
  jobs: Job[];
  onPostJob: (jobData: Omit<Job, 'id' | 'createdAt' | 'applicantCount'>) => Promise<void>;
  onUpdateJob: (jobId: string, updates: Partial<Job>) => Promise<void>;
  onDeleteJob: (jobId: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  jobs,
  onPostJob,
  onUpdateJob,
  onDeleteJob,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'moderation' | 'publish' | 'users' | 'reports'>(
    'moderation'
  );
  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearingDb, setClearingDb] = useState(false);

  // Admin job publishing state
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategory, setJobCategory] = useState('Tecnologia');
  const [jobWorkModel, setJobWorkModel] = useState<'Presencial' | 'Remoto' | 'Híbrido'>(
    'Presencial'
  );
  const [jobExperience, setJobExperience] = useState<
    'Qualquer Nível' | 'Primeiro Emprego' | 'Estágio' | 'Júnior' | 'Pleno' | 'Sênior'
  >('Pleno');
  const [jobContract, setJobContract] = useState<
    'CLT' | 'PJ' | 'Estágio' | 'Temporário' | 'Jovem Aprendiz'
  >('CLT');
  const [jobLocation, setJobLocation] = useState('Presidente Prudente, SP');
  const [jobSalaryRange, setJobSalaryRange] = useState('');
  const [jobSkillsStr, setJobSkillsStr] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobPremium, setJobPremium] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [optimizingAi, setOptimizingAi] = useState(false);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [reps, users] = await Promise.all([
        getReports().catch(() => []),
        getAllUsersForAdmin().catch(() => []),
      ]);
      setReports(reps);
      setUsersList(users);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleClearEntireDatabase = async () => {
    try {
      setClearingDb(true);
      const counts = await clearAllDatabaseData(currentUser.uid);
      setReports([]);
      setUsersList((prev) => prev.filter((u) => u.uid === currentUser.uid));
      setConfirmClearAll(false);
      showToast(
        `Banco de dados limpo (${counts.jobsDeleted} vagas, ${counts.applicationsDeleted} candidaturas, ${counts.usersDeleted} contas e ${counts.reportsDeleted} denúncias removidas).`
      );
    } catch {
      showToast('Erro ao apagar registros do banco de dados.', 'error');
    } finally {
      setClearingDb(false);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    try {
      await updateReportStatus(reportId, status);
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status } : r)));
      showToast(`Denúncia marcada como ${status === 'reviewed' ? 'resolvida' : 'arquivada'}.`);
    } catch {
      showToast('Erro ao atualizar denúncia.', 'error');
    }
  };

  const handleToggleVerifyCompany = async (userProfile: UserProfile) => {
    try {
      const newStatus = !userProfile.isVerified;
      await saveUserProfile(userProfile.uid, { isVerified: newStatus });
      setUsersList((prev) =>
        prev.map((u) => (u.uid === userProfile.uid ? { ...u, isVerified: newStatus } : u))
      );
      showToast(`Empresa ${userProfile.name} ${newStatus ? 'verificada' : 'desmarcada'}.`);
    } catch {
      showToast('Erro ao atualizar empresa.', 'error');
    }
  };

  const handleChangeUserRole = async (
    targetUser: UserProfile,
    newRole: 'candidate' | 'company' | 'admin'
  ) => {
    try {
      await saveUserProfile(targetUser.uid, {
        type: newRole,
        ...(newRole === 'company' && targetUser.credits === undefined ? { credits: 5 } : {}),
      });
      setUsersList((prev) =>
        prev.map((u) => (u.uid === targetUser.uid ? { ...u, type: newRole } : u))
      );
      showToast(`Perfil de ${targetUser.name} alterado para ${newRole}.`);
    } catch {
      showToast('Erro ao alterar função.', 'error');
    }
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (targetUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      showToast('O administrador principal não pode ser removido.', 'error');
      return;
    }
    try {
      await deleteUserByAdmin(targetUser.uid);
      setUsersList((prev) => prev.filter((u) => u.uid !== targetUser.uid));
      showToast(`Usuário ${targetUser.name} removido.`);
    } catch {
      showToast('Erro ao remover usuário.', 'error');
    }
  };

  const handleAiGenerateJob = async () => {
    if (!jobTitle.trim()) {
      showToast('Informe o título do cargo para gerar a descrição.', 'error');
      return;
    }
    try {
      setOptimizingAi(true);
      const skills = jobSkillsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await requestJobOptimization({
        title: jobTitle,
        category: jobCategory,
        workModel: jobWorkModel,
        experience: jobExperience,
        skills,
      });
      setJobDescription(res.description);
      if (res.suggestedSkills?.length) {
        const merged = Array.from(new Set([...skills, ...res.suggestedSkills]));
        setJobSkillsStr(merged.join(', '));
      }
      showToast('Descrição gerada.');
    } catch (err: any) {
      showToast(err.message || 'Falha ao gerar texto.', 'error');
    } finally {
      setOptimizingAi(false);
    }
  };

  const handleAdminPublishJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !companyName.trim()) {
      showToast('Informe o nome da empresa e o título do cargo.', 'error');
      return;
    }
    const skills = jobSkillsStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length === 0) {
      showToast('Informe ao menos uma habilidade.', 'error');
      return;
    }

    try {
      setPublishing(true);
      await onPostJob({
        companyId: currentUser.uid,
        companyName: companyName.trim(),
        title: jobTitle.trim(),
        category: jobCategory,
        workModel: jobWorkModel,
        experience: jobExperience,
        contract: jobContract,
        location: jobLocation.trim() || 'Presidente Prudente, SP',
        salaryRange: jobSalaryRange.trim(),
        skills,
        description: jobDescription.trim(),
        premium: jobPremium,
        status: 'active',
      });
      showToast('Vaga publicada no mural.');
      setCompanyName('');
      setJobTitle('');
      setJobSalaryRange('');
      setJobSkillsStr('');
      setJobDescription('');
      setJobPremium(false);
      setActiveTab('moderation');
    } catch {
      showToast('Erro ao publicar vaga.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#F3F5F8] py-8 md:py-10">
      <div className="container-app">
        {/* Clean Admin Header */}
        <header className="pb-6 mb-6 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-[24px] md:text-[28px] font-bold text-[#202938]">
              Administração · PrudenEmpregos
            </h1>
            <p className="text-[14px] text-[#64748B] mt-1 tabular-nums">
              {currentUser.email} · <strong className="text-[#202938]">{jobs.length}</strong> vagas
              · <strong className="text-[#202938]">{usersList.length}</strong> contas ·{' '}
              <strong className="text-[#202938]">{pendingReportsCount}</strong> denúncias pendentes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="btn-base btn-md btn-danger-ghost"
              >
                Apagar todos os dados
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#D92D20]/30 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-semibold text-[#D92D20]">
                  Confirmar limpeza total?
                </span>
                <button
                  type="button"
                  disabled={clearingDb}
                  onClick={handleClearEntireDatabase}
                  className="px-2.5 py-1 rounded bg-[#D92D20] text-white text-xs font-semibold cursor-pointer"
                >
                  {clearingDb ? 'Apagando...' : 'Sim, zerar banco'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2 py-1 text-xs font-medium text-[#64748B] hover:text-[#202938] cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={fetchAdminData}
              className="btn-base btn-md btn-secondary"
            >
              {loading ? 'Atualizando...' : 'Atualizar dados'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('publish')}
              className="btn-base btn-md btn-primary"
            >
              Publicar Vaga
            </button>
          </div>
        </header>

        {/* Horizontal Tabs */}
        <div className="flex items-center gap-6 border-b border-[#E2E8F0] mb-8 overflow-x-auto">
          {[
            { id: 'moderation', label: `Vagas (${jobs.length})` },
            { id: 'publish', label: 'Publicar Vaga' },
            { id: 'users', label: `Usuários e Empresas (${usersList.length})` },
            { id: 'reports', label: `Denúncias (${pendingReportsCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3.5 text-[15px] border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[#173B70] text-[#173B70] font-semibold'
                  : 'border-transparent text-[#64748B] hover:text-[#202938] font-medium'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: MODERATION */}
        {activeTab === 'moderation' && (
          <div className="surface-card divide-y divide-[#E2E8F0]">
            {jobs.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[16px] font-semibold text-[#202938] mb-1">
                  Nenhuma vaga cadastrada no momento
                </p>
                <p className="text-[14px] text-[#64748B] mb-5">
                  O banco de dados está limpo. Publique uma oportunidade para disponibilizá-la no mural.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('publish')}
                  className="btn-base btn-md btn-primary"
                >
                  Publicar primeira vaga
                </button>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={job.status === 'active' ? 'badge-success' : 'badge-meta'}
                      >
                        {job.status === 'active' ? 'Ativa' : 'Pausada'}
                      </span>
                      <span className="text-[13px] font-medium text-[#64748B]">
                        {job.companyName} · {job.location} · {formatDate(job.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-[18px] font-semibold text-[#202938]">{job.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onUpdateJob(job.id, { premium: !job.premium })}
                      className="btn-base btn-sm btn-secondary"
                    >
                      {job.premium ? 'Remover destaque' : 'Destacar'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateJob(job.id, {
                          status: job.status === 'active' ? 'paused' : 'active',
                        })
                      }
                      className="btn-base btn-sm btn-secondary"
                    >
                      {job.status === 'active' ? 'Pausar' : 'Reativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteJob(job.id)}
                      className="btn-base btn-sm btn-danger-ghost"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: PUBLISH JOB */}
        {activeTab === 'publish' && (
          <form
            onSubmit={handleAdminPublishJob}
            className="surface-card p-6 sm:p-8 space-y-5"
          >
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <h2 className="text-[20px] font-semibold text-[#202938]">Publicar vaga oficial</h2>
              <button
                type="button"
                onClick={handleAiGenerateJob}
                disabled={optimizingAi}
                className="btn-base btn-sm btn-secondary text-[#173B70]"
              >
                {optimizingAi ? 'Gerando...' : 'Gerar descrição com IA'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Empresa contratante *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Ex: Santa Casa de Presidente Prudente"
                  className="form-control"
                />
              </div>

              <div>
                <label className="form-label">Título do cargo *</label>
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Ex: Auxiliar Administrativo"
                  className="form-control"
                />
              </div>

              <div>
                <label className="form-label">Área de atuação</label>
                <select
                  value={jobCategory}
                  onChange={(e) => setJobCategory(e.target.value)}
                  className="form-control cursor-pointer"
                >
                  <option>Tecnologia</option>
                  <option>Administrativo</option>
                  <option>Comercial</option>
                  <option>Saúde</option>
                  <option>Financeiro</option>
                  <option>Educação</option>
                  <option>Indústria</option>
                  <option>Agronegócio</option>
                  <option>Serviços</option>
                </select>
              </div>

              <div>
                <label className="form-label">Modalidade</label>
                <select
                  value={jobWorkModel}
                  onChange={(e) => setJobWorkModel(e.target.value as any)}
                  className="form-control cursor-pointer"
                >
                  <option>Presencial</option>
                  <option>Híbrido</option>
                  <option>Remoto</option>
                </select>
              </div>

              <div>
                <label className="form-label">Experiência</label>
                <select
                  value={jobExperience}
                  onChange={(e) => setJobExperience(e.target.value as any)}
                  className="form-control cursor-pointer"
                >
                  <option>Qualquer Nível</option>
                  <option>Primeiro Emprego</option>
                  <option>Estágio</option>
                  <option>Júnior</option>
                  <option>Pleno</option>
                  <option>Sênior</option>
                </select>
              </div>

              <div>
                <label className="form-label">Contrato</label>
                <select
                  value={jobContract}
                  onChange={(e) => setJobContract(e.target.value as any)}
                  className="form-control cursor-pointer"
                >
                  <option>CLT</option>
                  <option>PJ</option>
                  <option>Estágio</option>
                  <option>Temporário</option>
                  <option>Jovem Aprendiz</option>
                </select>
              </div>

              <div>
                <label className="form-label">Localização</label>
                <input
                  type="text"
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  className="form-control"
                />
              </div>

              <div>
                <label className="form-label">Faixa salarial (opcional)</label>
                <input
                  type="text"
                  value={jobSalaryRange}
                  onChange={(e) => setJobSalaryRange(e.target.value)}
                  placeholder="Ex: R$ 2.500 - R$ 3.200"
                  className="form-control"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {SALARY_REFERENCE_ANCHORS.map((anchor) => (
                    <button
                      key={anchor.label}
                      type="button"
                      onClick={() => setJobSalaryRange(anchor.display)}
                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#F4F6FA] hover:bg-[#EFF4FF] text-[#173B70] border border-[#E2E8F0] transition-colors cursor-pointer tabular-nums"
                    >
                      {anchor.display}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">
                Competências exigidas (separadas por vírgula) *
              </label>
              <input
                type="text"
                required
                value={jobSkillsStr}
                onChange={(e) => setJobSkillsStr(e.target.value)}
                placeholder="Ex: Atendimento, Pacote Office"
                className="form-control"
              />
              {CATEGORY_SKILL_ANCHORS[jobCategory] && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CATEGORY_SKILL_ANCHORS[jobCategory].map((sk) => (
                    <button
                      key={sk}
                      type="button"
                      onClick={() => {
                        const existing = jobSkillsStr
                          .split(',')
                          .map((s) => s.trim().toLowerCase())
                          .filter(Boolean);
                        if (!existing.includes(sk.toLowerCase())) {
                          setJobSkillsStr((prev) =>
                            prev.trim() ? `${prev.trim()}, ${sk}` : sk
                          );
                        }
                      }}
                      className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#F4F6FA] hover:bg-[#EFF4FF] text-[#173B70] border border-[#E2E8F0] transition-colors cursor-pointer"
                    >
                      + {sk}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="form-label">Descrição da vaga *</label>
              <textarea
                rows={5}
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="form-control"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setActiveTab('moderation')}
                className="btn-base btn-md btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="btn-base btn-md btn-primary"
              >
                {publishing ? 'Publicando...' : 'Publicar vaga'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: USERS & COMPANIES */}
        {activeTab === 'users' && (
          <div className="surface-card divide-y divide-[#E2E8F0]">
            {usersList.length === 0 ? (
              <div className="p-10 text-center text-[14px] text-[#64748B]">
                Nenhum usuário registrado.
              </div>
            ) : (
              usersList.map((u) => (
                <div
                  key={u.uid}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold text-[#202938]">{u.name}</h3>
                    <p className="text-[13px] text-[#64748B] mt-0.5 tabular-nums">
                      {u.email}
                      {u.phone ? ` · ${u.phone}` : ''}
                      {u.cnpj ? ` · CNPJ: ${u.cnpj}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      aria-label={`Função de ${u.name}`}
                      value={u.type}
                      onChange={(e) =>
                        handleChangeUserRole(
                          u,
                          e.target.value as 'candidate' | 'company' | 'admin'
                        )
                      }
                      className="form-control min-h-[36px] py-1 px-2.5 text-[13px] w-auto cursor-pointer"
                    >
                      <option value="candidate">Candidato</option>
                      <option value="company">Empresa</option>
                      <option value="admin">Admin</option>
                    </select>

                    {u.type === 'company' && (
                      <button
                        type="button"
                        onClick={() => handleToggleVerifyCompany(u)}
                        className="btn-base btn-sm btn-secondary"
                      >
                        {u.isVerified ? 'Verificada ✓' : 'Verificar empresa'}
                      </button>
                    )}

                    {u.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        className="btn-base btn-sm btn-danger-ghost"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 4: REPORTS */}
        {activeTab === 'reports' && (
          <div className="surface-card divide-y divide-[#E2E8F0]">
            {reports.length === 0 ? (
              <div className="p-10 text-center text-[14px] text-[#64748B]">
                Nenhuma denúncia registrada.
              </div>
            ) : (
              reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={rep.status === 'pending' ? 'badge-danger' : 'badge-meta'}
                      >
                        {rep.status === 'pending' ? 'Pendente' : 'Revisada'}
                      </span>
                      <span className="text-[12px] text-[#64748B] tabular-nums">
                        {formatDate(rep.createdAt)}
                      </span>
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#202938]">
                      {rep.targetTitle}
                    </h3>
                    <p className="text-[14px] text-[#64748B]">{rep.reason}</p>
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep.id, 'reviewed')}
                        className="btn-base btn-sm btn-secondary text-[#16835D]"
                      >
                        Resolver
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReport(rep.id, 'dismissed')}
                        className="btn-base btn-sm btn-ghost"
                      >
                        Arquivar
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
