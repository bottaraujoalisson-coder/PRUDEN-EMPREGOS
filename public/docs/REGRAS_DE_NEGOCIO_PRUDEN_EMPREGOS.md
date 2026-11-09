# CATÁLOGO DE REGRAS DE NEGÓCIO DO SISTEMA PRUDENEMPREGOS

**Sistema:** *PrudenEmpregos* — Portal Regional de Empregos, Recrutamento e Seleção de Presidente Prudente e Região  
**Instituição:** Fatec Presidente Prudente — Tecnologia em Análise e Desenvolvimento de Sistemas  
**Disciplina:** IES-100 (Engenharia de Software I) / Projeto PrudenEmpregos  
**Documento Complementar à Especificação de Requisitos de Software (ERS — Padrão IEEE Std 830/1998)**  
**Conformidade Legal:** Lei Geral de Proteção de Dados Pessoais (LGPD — Lei Federal nº 13.709/2018)  
**Versão:** 2.0 (Consolidada)  

---

## 1. INTRODUÇÃO E ESTRUTURA DO DOCUMENTO

Este documento formaliza todas as **Regras de Negócio (RN)** que regem o funcionamento, os cálculos econômicos, as validações cadastrais, o controle de acesso (RBAC), o motor de compatibilidade (*Match*), a proteção da privacidade (LGPD) e o fluxo financeiro do portal *PrudenEmpregos*.

Uma Regra de Negócio define diretrizes, restrições e comportamentos que o software deve assegurar de forma mandatória, servindo como elo inquebrável entre os objetivos institucionais e a implementação técnica nas camadas de front-end, back-end transacional e regras de segurança do banco de dados (Cloud Firestore).

### Classificação dos Domínios de Negócio
As regras estão organizadas em 10 macro-domínios funcionais:
1. **Domínio 1:** Gestão de Identidade, Autenticação e Perfis (RBAC) — `RN-001` a `RN-004`
2. **Domínio 2:** Validação Cadastral, Regularidade Fiscal e Privacidade LGPD — `RN-005` a `RN-009`
3. **Domínio 3:** Economia de Créditos, Saldos e Carteira Digital — `RN-010` a `RN-014`
4. **Domínio 4:** Gestão e Ciclo de Vida de Vagas de Emprego — `RN-015` a `RN-019`
5. **Domínio 5:** Candidaturas e Funil do Processo Seletivo — `RN-020` a `RN-024`
6. **Domínio 6:** Motor de Compatibilidade (*Match* Ponderado) — `RN-025` a `RN-026`
7. **Domínio 7:** Currículo Profissional em PDF Padrão ATS — `RN-027` a `RN-029`
8. **Domínio 8:** Pagamentos, Webhooks e Liquidação Financeira (Mercado Pago) — `RN-030` a `RN-032`
9. **Domínio 9:** Inclusão Social e Recrutamento às Cegas (*Blind Hiring*) — `RN-033` a `RN-034`
10. **Domínio 10:** Auditoria, Moderação e Integridade do Sistema — `RN-035` a `RN-036`

---

## 2. DETALHAMENTO DAS REGRAS DE NEGÓCIO

### DOMÍNIO 1: GESTÃO DE IDENTIDADE, AUTENTICAÇÃO E PERFIS (RBAC)

#### RN-001: Unicidade e Validação de Credenciais de Acesso
* **Descrição:** Todo usuário cadastrado no sistema deve possuir um endereço de e-mail exclusivo e sintaticamente válido, além de uma senha de acesso com comprimento mínimo obrigatório de 6 caracteres.
* **Entidades Envolvidas:** `User`, `AuthAccount`, `UserProfile`.
* **Atributos Afetados:** `email`, `passwordHash`, `uid`.
* **Gatilho:** Formulário de cadastro de usuário ou alteração de senha.
* **Condição de Validação:**
  * O e-mail deve estar em conformidade com o formato padrão (RFC 5322);
  * O e-mail não pode existir previamente cadastrado na base de autenticação;
  * A senha deve conter pelo menos 6 caracteres (mínimo exigido pelo Firebase Authentication e PBKDF2).
* **Efeito no Sistema:** Criação segura da conta no Firebase Auth com derivação criptográfica; caso o e-mail já exista, o sistema exibe mensagem genérica anti-enumeração de contas.
* **Mensagem de Erro:** *"Informe um e-mail válido e uma senha com no mínimo 6 caracteres."* ou *"Credenciais incorretas ou não foi possível concluir a operação."*
* **Requisitos Associados:** `RF_B01`, `RF_B02`.
* **Implementação Técnica:** `src/services/directCloudAuth.ts`, `src/components/AuthModal.tsx`, `src/shared/businessRules.ts`.

---

#### RN-002: Perfis de Acesso e Segregação de Funções (RBAC Estrito)
* **Descrição:** O sistema opera sob três papéis (*roles*) mutualmente exclusivos: **Candidato (`candidate`)**, **Empresa (`company`)** e **Administrador (`admin`)**. O cliente Web é estritamente proibido de alterar seu próprio papel.
* **Entidades Envolvidas:** `User`, `UserProfile`.
* **Atributos Afetados:** `role`, `type`.
* **Gatilho:** Requisições de gravação no banco de dados e navegação em rotas restritas.
* **Condição de Validação:** A regra de segurança do Firestore (`firestore.rules`) bloqueia qualquer mutação direta dos campos `role` ou `type` iniciada pelo cliente: `!request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'type'])`.
* **Efeito no Sistema:** Garantia de que candidatos não publiquem vagas em nome de empresas e que usuários comuns não assumam prerrogativas de administração.
* **Mensagem de Erro:** *"Permissão negada. Você não possui autorização para alterar seu nível de acesso."*
* **Requisitos Associados:** `RF_B01`, `RF_B02`, `RF_S05`.
* **Implementação Técnica:** `firestore.rules`, `src/types.ts`, `src/services/usersService.ts`.

---

#### RN-003: Proteção contra Ataques de Força Bruta
* **Descrição:** O sistema deve bloquear temporariamente novas tentativas de autenticação para um mesmo endereço de e-mail após 5 (cinco) tentativas consecutivas com credenciais incorretas.
* **Entidades Envolvidas:** `AuthAttemptLog`, `User`.
* **Atributos Afetados:** `failedLoginAttempts`, `lockedUntil`.
* **Gatilho:** Tentativa de login com senha incorreta.
* **Condição de Validação:** Contador de tentativas falhas consecutivas $\ge 5$ dentro de uma janela móvel de 15 minutos.
* **Efeito no Sistema:** A conta é bloqueada temporariamente para novas tentativas durante o intervalo de 15 minutos.
* **Mensagem de Erro:** *"Muitas tentativas inválidas consecutivas. Por motivos de segurança, o acesso para este e-mail foi bloqueado temporariamente por 15 minutos."*
* **Requisitos Associados:** `RNF_04`.
* **Implementação Técnica:** `src/services/directCloudAuth.ts`, `src/utils/securityAudit.test.ts`.

---

#### RN-004: Onboarding Obrigatório para Login Social e Liberação de Recursos
* **Descrição:** Usuários que autenticam pela primeira vez via provedor federado (Google OAuth) sem documento civil/fiscal vinculado devem obrigatoriamente preencher o formulário de Onboarding (informando CPF para Candidatos ou CNPJ para Empresas) para desbloquear a carteira de créditos e as funcionalidades operacionais.
* **Entidades Envolvidas:** `User`, `UserProfile`.
* **Atributos Afetados:** `onboardingCompleted`, `documentNumber`, `cpf`, `cnpj`, `credits`.
* **Gatilho:** Abertura da aplicação com usuário autenticado possuindo `onboardingCompleted == false`.
* **Condição de Validação:** Ausência de registro validado em `/document_registry` para o UID logado.
* **Efeito no Sistema:** Modal de onboarding é renderizado de forma bloqueante; até a conclusão com documento válido, o usuário não pode publicar vagas nem enviar candidaturas.
* **Mensagem de Erro:** *"Complete seu cadastro informando seu CPF ou CNPJ para ativar sua conta e liberar seus 30 créditos gratuitos."*
* **Requisitos Associados:** `RF_B01`, `RF_B02`.
* **Implementação Técnica:** `src/components/CompleteOnboardingModal.tsx`, `src/App.tsx`.

---

### DOMÍNIO 2: VALIDAÇÃO CADASTRAL, REGULARIDADE FISCAL E PRIVACIDADE LGPD

#### RN-005: Validação Algorítmica de CPF (Módulo 11)
* **Descrição:** O CPF informado pelo candidato deve possuir exatamente 11 dígitos numéricos com dígitos verificadores matematicamente válidos calculados pelo algoritmo oficial Módulo 11 da Receita Federal.
* **Entidades Envolvidas:** `UserProfile`, `PrivateProfile`.
* **Atributos Afetados:** `cpf`, `documentNumber`.
* **Gatilho:** Digitação ou submissão do formulário de cadastro de candidato.
* **Condição de Validação:**
  * O número deve conter 11 dígitos;
  * Sequências com todos os dígitos iguais (ex.: `000.000.000-00`, `111.111.111-11`, ..., `999.999.999-99`) são rejeitadas;
  * O primeiro dígito verificador $\text{DV}_1$ e o segundo dígito verificador $\text{DV}_2$ devem satisfazer a fórmula ponderada oficial.
* **Efeito no Sistema:** Permissão para prosseguir com o cadastro de candidato.
* **Mensagem de Erro:** *"CPF inválido. Verifique os 11 dígitos informados."*
* **Requisitos Associados:** `RF_B01`.
* **Implementação Técnica:** `src/services/cnpjService.ts`, `src/utils/validation.ts`, `src/utils/matchAlgorithm.ts`.

---

#### RN-006: Validação de CNPJ e Regularidade Cadastral na Receita Federal
* **Descrição:** Cadastros empresariais exigem CNPJ de 14 dígitos matematicamente válido e com situação cadastral estritamente **"ATIVA"** verificada na base de dados da Receita Federal (via BrasilAPI).
* **Entidades Envolvidas:** `CompanyProfile`, `UserProfile`.
* **Atributos Afetados:** `cnpj`, `cnpjVerified`, `isVerifiedCompany`, `razaoSocial`, `nomeFantasia`.
* **Gatilho:** Inserção do 14º dígito do CNPJ no cadastro de empresa ou conclusão de onboarding.
* **Condição de Validação:**
  * Validação matemática dos dois dígitos verificadores do CNPJ;
  * Consulta em tempo real à API oficial da Receita Federal retornando código de situação cadastral ativo (`status == "ATIVA"`). Empresas com situação "INAPTA", "BAIXADA", "SUSPENSA" ou "NULA" têm o cadastro bloqueado.
* **Efeito no Sistema:** Concessão do selo de Empresa Verificada, autopreenchimento de Razão Social, Nome Fantasia e Endereço fiscal, habilitando a publicação de vagas.
* **Mensagem de Erro:** *"Este CNPJ encontra-se em situação inapta ou baixada na Receita Federal e não pode cadastrar vagas no portal."*
* **Requisitos Associados:** `RF_B02`.
* **Implementação Técnica:** `src/services/cnpjService.ts`, `server.ts`.

---

#### RN-007: Unicidade Global de Documentos Civis e Fiscais
* **Descrição:** Cada CPF ou CNPJ só pode ser vinculado a uma única conta em toda a plataforma *PrudenEmpregos*.
* **Entidades Envolvidas:** `DocumentRegistry`, `User`.
* **Atributos Afetados:** `documentRegistry/{docHash}`.
* **Gatilho:** Conclusão de onboarding ou salvamento de perfil com documento.
* **Condição de Validação:** A chave `docHash = sha256(cleanDoc)` é consultada na coleção `/document_registry`: se já existir e apontar para outro `uid`, a transação é cancelada.
* **Efeito no Sistema:** Prevenção contra criação de contas duplicadas e exploração indevida de múltiplos bônus de boas-vindas pelo mesmo titular.
* **Mensagem de Erro:** *"Este documento (CPF/CNPJ) já está cadastrado em outra conta da plataforma."*
* **Requisitos Associados:** `RF_B01`, `RF_B02`.
* **Implementação Técnica:** `firestore.rules`, `server.ts`, `src/services/usersService.ts`.

---

#### RN-008: Autopreenchimento Postal por CEP com Contingência Manual
* **Descrição:** Ao informar um CEP válido de 8 dígitos, o sistema consulta a base postal (ViaCEP / BrasilAPI) para preencher automaticamente logradouro, bairro, cidade e UF.
* **Entidades Envolvidas:** `UserProfile`, `PrivateProfile`, `CompanyProfile`.
* **Atributos Afetados:** `cep`, `street`, `neighborhood`, `city`, `state`.
* **Gatilho:** Informação de 8 dígitos numéricos no campo CEP.
* **Condição de Validação:** CEP existente na base postal brasileira. Em caso de falha de conexão com a API externa, o sistema não bloqueia o usuário, liberando os campos para digitação manual assistida.
* **Efeito no Sistema:** Padronização e agilidade no preenchimento de endereços de empresas e candidatos.
* **Requisitos Associados:** `RF_B01`, `RF_B02`.
* **Implementação Técnica:** `src/services/cepService.ts`, `src/utils/validation.ts`.

---

#### RN-009: Segregação de Dados e Privacidade em Conformidade com a LGPD
* **Descrição:** Dados pessoais sensíveis e fiscais (número de CPF, CNPJ, telefone residencial, rua, número da residência e CEP) devem ser persistidos exclusivamente na sub-coleção privada `/private_profiles/{userId}` (com acesso restrito ao titular ou Admin) e são terminantemente proibidos na vitrine pública `/profiles/{userId}`.
* **Entidades Envolvidas:** `Profile` (público), `PrivateProfile` (privado).
* **Atributos Afetados:** `cpf`, `cnpj`, `phone`, `street`, `addressNumber`, `cep`.
* **Gatilho:** Escrita em `/profiles/{userId}`.
* **Condição de Validação:** As regras de segurança do Firestore rejeitam qualquer gravação em `/profiles/{userId}` que contenha campos de PII sensível: `!request.resource.data.keys().hasAny(['cpf', 'cnpj', 'phone', 'whatsapp', 'street', 'addressNumber', 'cep'])`.
* **Efeito no Sistema:** Impossibilidade de vazamento de dados residenciais ou fiscais em consultas públicas.
* **Mensagem de Erro:** *"Tentativa de inclusão de dados sensíveis protegidos pela LGPD em documento de perfil público bloqueada."*
* **Requisitos Associados:** `RNF_LGPD`, `RF_B01`.
* **Implementação Técnica:** `firestore.rules`, `src/services/usersService.ts`.

---

### DOMÍNIO 3: ECONOMIA DE CRÉDITOS, SALDOS E CARTEIRA DIGITAL

#### RN-010: Concessão de Bônus de Boas-Vindas de 30 Créditos Gratuitos
* **Descrição:** Todo novo usuário (Candidato ou Empresa) que conclui com sucesso seu cadastro inicial e valida seu respectivo documento (CPF ou CNPJ) recebe automaticamente uma bonificação de **+30 créditos gratuitos**.
* **Entidades Envolvidas:** `User`, `CreditTransaction`.
* **Atributos Afetados:** `credits`, `welcomeCreditsGranted`.
* **Gatilho:** Conclusão do onboarding ou registro inicial validado.
* **Condição de Validação:** O usuário deve possuir a flag `welcomeCreditsGranted == false` e documento único verificado.
* **Efeito no Sistema:** O saldo da carteira é creditado em 30 unidades e a flag `welcomeCreditsGranted` é marcada como `true` de forma indelével. Permite ao candidato realizar até 3 candidaturas gratuitas ou gerar 1 currículo ATS (15 cr) + 1 candidatura (10 cr) sem custo. Permite à empresa publicar até 3 vagas gratuitas ou 1 vaga com destaque no topo (25 cr).
* **Requisitos Associados:** `RF_B01`, `RF_B02`, `RF_B05`.
* **Implementação Técnica:** `src/shared/creditPackages.ts`, `server.ts`, `src/services/usersService.ts`.

---

#### RN-011: Tabela Oficial e Imutável de Custos Operacionais em Créditos
* **Descrição:** As operações tarifadas do portal possuem valores estritamente padronizados em créditos:
  1. **Candidatar-se a uma vaga:** `10 créditos`;
  2. **Publicar uma vaga:** `10 créditos`;
  3. **Destacar vaga no topo do mural (Boost):** `15 créditos`;
  4. **Gerar Currículo Profissional em PDF Padrão ATS:** `15 créditos`.
* **Entidades Envolvidas:** `Application`, `Job`, `ResumeExport`, `CreditTransaction`.
* **Atributos Afetados:** `user.credits`.
* **Gatilho:** Solicitação de qualquer uma das 4 operações tarifadas.
* **Condição de Validação:** `saldo_atual >= custo_da_operacao`.
* **Efeito no Sistema:** Débito exato dos créditos correspondentes e emissão de comprovante no extrato do usuário.
* **Mensagem de Erro:** *"Saldo insuficiente de créditos. Esta operação requer X créditos, mas seu saldo atual é de Y créditos."*
* **Requisitos Associados:** `RF_F01`, `RF_F02`, `RF_F04`.
* **Implementação Técnica:** `src/shared/creditPackages.ts`, `src/constants/credits.ts`, `src/services/jobsService.ts`, `src/services/applicationsService.ts`.

---

#### RN-012: Bloqueio de Saldo Negativo e Débito Transacional Atômico
* **Descrição:** Nenhuma operação no sistema pode produzir saldo de créditos negativo. Todas as deduções de créditos devem ser executadas em transação atômica do banco de dados (`runTransaction`) no servidor.
* **Entidades Envolvidas:** `User`, `CreditTransaction`.
* **Atributos Afetados:** `credits`.
* **Gatilho:** Processamento de débito de créditos.
* **Condição de Validação:** A leitura do saldo e a escrita do novo saldo ocorrem sob bloqueio transacional: se `credits < valor_debito`, a transação é abortada e revertida.
* **Efeito no Sistema:** Integridade contábil matemática absoluta da carteira digital.
* **Requisitos Associados:** `RF_F01`, `RF_F02`, `RF_F04`.
* **Implementação Técnica:** `firestore.rules`, `server.ts`, `src/services/usersService.ts`.

---

#### RN-013: Créditos Cumulativos sem Data de Expiração
* **Descrição:** Os créditos pertencentes à carteira do usuário (sejam oriundos de bônus de boas-vindas ou adquiridos em pacotes pagos) são cumulativos e **nunca expiram por decurso de prazo**.
* **Entidades Envolvidas:** `User`, `CreditWallet`.
* **Atributos Afetados:** `credits`.
* **Gatilho:** Avaliação periódica de saldos ou consulta de carteira.
* **Condição de Validação:** Inexistência de rotinas ou datas de expiração vinculadas ao saldo de créditos.
* **Efeito no Sistema:** O saldo permanece disponível para uso por tempo indeterminado enquanto a conta estiver ativa.
* **Requisitos Associados:** `RF_B05`, `RF_S03`.
* **Implementação Técnica:** `src/shared/creditPackages.ts`, `src/components/PlansView.tsx`.

---

#### RN-014: Catálogo Progressivo de Pacotes com Preço Unitário Decrescente
* **Descrição:** Os pacotes de créditos comercializados possuem precificação unitária estritamente decrescente para incentivar compras em maior escala, com validação de preços exclusivamente no servidor:
  * **Pacote Básico (10 cr):** `R$ 14,90` (R$ 1,49 por crédito);
  * **Pacote Currículo & Destaque (15 cr):** `R$ 19,90` (R$ 1,33 por crédito);
  * **Pacote Crescimento Pro (30 cr + 5 bônus = 35 cr):** `R$ 34,90` (R$ 1,16 por crédito) — *Mais Escolhido*;
  * **Pacote Avançado (50 cr):** `R$ 49,90` (R$ 1,00 por crédito);
  * **Pacote Corporativo Max (80 cr + 20 bônus = 100 cr):** `R$ 89,90` (R$ 0,90 por crédito) — *Melhor Custo-Benefício*.
* **Entidades Envolvidas:** `CreditPackage`, `CreditOrder`.
* **Atributos Afetados:** `priceBRL`, `unitPriceBRL`.
* **Gatilho:** Abertura da aba de planos ou checkout de compra.
* **Condição de Validação:** O valor a ser cobrado no checkout do Mercado Pago é determinado pelo arquivo autoritativo `src/shared/creditPackages.ts`, não podendo ser modificado pelo navegador.
* **Efeito no Sistema:** Segurança contra adulteração de preços via inspecionar elemento.
* **Requisitos Associados:** `RF_B05`, `RF_F03`.
* **Implementação Técnica:** `src/shared/creditPackages.ts`, `server.ts`, `src/components/PlansView.tsx`.

---

### DOMÍNIO 4: GESTÃO E CICLO DE VIDA DE VAGAS DE EMPREGO

#### RN-015: Permissão Exclusiva de Publicação para Empresas Verificadas e Administradores
* **Descrição:** Apenas usuários autenticados sob o perfil de Empresa (`company`) com CNPJ ativo e verificado na Receita Federal (ou usuários administradores `admin`) possuem permissão para cadastrar e publicar vagas de emprego.
* **Entidades Envolvidas:** `Job`, `UserProfile`.
* **Atributos Afetados:** `jobs/{jobId}`.
* **Gatilho:** Tentativa de criar ou publicar uma vaga.
* **Condição de Validação:** `(user.role == 'company' && user.isVerifiedCompany == true) || user.role == 'admin'`.
* **Efeito no Sistema:** Oportunidades fraudulentas de pessoas físicas não autorizadas são bloqueadas na origem.
* **Mensagem de Erro:** *"Apenas empresas com CNPJ ativo verificado na Receita Federal podem publicar vagas de emprego."*
* **Requisitos Associados:** `RF_B03`, `RF_F02`.
* **Implementação Técnica:** `firestore.rules`, `src/components/CompanyDashboard.tsx`.

---

#### RN-016: Formatação e Transparência Monetária Obrigatória em Real (R$ BRL)
* **Descrição:** Toda vaga de emprego que possua valor de remuneração preenchido numericamente deve ser formatada e exibida estritamente no padrão monetário brasileiro `R$ X.XXX,XX` (ex.: `R$ 2.500,00` ou `R$ 2.200,00 + comissão`). Caso o salário não tenha sido informado, deve exibir obrigatoriamente a expressão "Salário a combinar".
* **Entidades Envolvidas:** `Job`.
* **Atributos Afetados:** `salary`, `salaryRange`.
* **Gatilho:** Renderização de cards de vaga no mural, no modal de detalhes ou em relatórios.
* **Condição de Validação:** Execução mandatória da função utilitária `formatSalaryBRL(valor)`.
* **Efeito no Sistema:** Eliminação de valores brutos crus (ex.: `2500` sem formatação) e clareza visual para o candidato.
* **Requisitos Associados:** `RF_B03`, `RF_S01`.
* **Implementação Técnica:** `src/utils/formatters.ts`, `src/components/HomeView.tsx`, `src/components/JobDetailsModal.tsx`.

---

#### RN-017: Ciclo de Vigência de 30 Dias por Anúncio de Vaga
* **Descrição:** Cada vaga publicada no portal possui um prazo de vigência padrão de **30 (trinta) dias corridos** contados a partir da data de publicação.
* **Entidades Envolvidas:** `Job`.
* **Atributos Afetados:** `createdAt`, `expiresAt`, `status`.
* **Gatilho:** Publicação ou renovação de vaga.
* **Condição de Validação:** `expiresAt = createdAt + 30 dias`.
* **Efeito no Sistema:** Após o transcurso dos 30 dias, a vaga é classificada automaticamente com o status "Encerrada" nas consultas públicas, podendo ser renovada pela empresa mediante consumo de nova cota de créditos.
* **Requisitos Associados:** `RF_B03`.
* **Implementação Técnica:** `src/utils/matchAlgorithm.ts`, `src/services/jobsService.ts`.

---

#### RN-018: Prioridade e Selo de Destaque no Topo do Mural (Boost)
* **Descrição:** Vagas impulsionadas com o serviço de destaque (consumo de 15 créditos) recebem o selo visual de alta visibilidade "Vaga Destacada" e são posicionadas no topo absoluto do mural de oportunidades regional, à frente de todas as vagas convencionais.
* **Entidades Envolvidas:** `Job`.
* **Atributos Afetados:** `isFeatured`, `featuredExpiresAt`.
* **Gatilho:** Contratação de destaque ou ordenação de vagas no mural.
* **Condição de Validação:** `job.isFeatured == true && job.featuredExpiresAt > agora`.
* **Efeito no Sistema:** Prioridade algorítmica de exibição no mural público.
* **Requisitos Associados:** `RF_F02`, `RF_S01`.
* **Implementação Técnica:** `src/components/HomeView.tsx`, `src/services/jobsService.ts`.

---

#### RN-019: Moderação e Ocultação de Registros Demonstrativos e de Teste
* **Descrição:** Vagas cadastradas sob a denominação "Empresa Teste" ou sinalizadas com a flag `isTestRecord: true` devem ser filtradas e ocultadas das consultas de candidatos e visitantes públicos.
* **Entidades Envolvidas:** `Job`.
* **Atributos Afetados:** `isTestRecord`, `companyName`.
* **Gatilho:** Consulta de vagas no mural regional.
* **Condição de Validação:** Filtro `!/^empresa teste$/i.test(companyName) && !job.isTestRecord`.
* **Efeito no Sistema:** O mural regional exibe apenas oportunidades reais de empresas atuantes em Presidente Prudente e região.
* **Requisitos Associados:** `RF_S01`.
* **Implementação Técnica:** `src/services/jobsService.ts`, `src/components/HomeView.tsx`.

---

### DOMÍNIO 5: CANDIDATURAS E FUNIL DO PROCESSO SELETIVO

#### RN-020: Bloqueio de Candidatura Duplicada
* **Descrição:** Um candidato não pode se candidatar mais de uma vez para uma mesma vaga de emprego.
* **Entidades Envolvidas:** `Application`, `User`, `Job`.
* **Atributos Afetados:** `applications/{appId}`.
* **Gatilho:** Clique no botão "Candidatar-se agora".
* **Condição de Validação:** O sistema verifica se já existe registro em `/applications` onde `candidateId == user.uid && jobId == job.id`.
* **Efeito no Sistema:** Se o candidato já estiver inscrito, o botão é apresentado desabilitado com o rótulo "Candidatura Já Realizada", impedindo débito duplo de créditos.
* **Mensagem de Erro:** *"Você já se candidatou para esta vaga anteriormente."*
* **Requisitos Associados:** `RF_F01`.
* **Implementação Técnica:** `src/services/applicationsService.ts`, `src/components/JobDetailsModal.tsx`.

---

#### RN-021: Preservação de Intenção de Candidatura para Visitantes Deslogados
* **Descrição:** Quando um visitante não autenticado clica em "Candidatar-se agora" em uma vaga, o sistema preserva o ID da oportunidade em memória de sessão temporária (`sessionStorage.setItem('pendingJobId', job.id)`), abre o modal de login já na aba "Candidato (CPF)" e, imediatamente após a conclusão do login/cadastro, reabre a vaga para conclusão com 1 clique.
* **Entidades Envolvidas:** `Job`, `SessionState`.
* **Atributos Afetados:** `sessionStorage.pendingJobId`.
* **Gatilho:** Ação de candidatura por usuário com `currentUser == null`.
* **Condição de Validação:** Existência de `pendingJobId` em `sessionStorage` após evento de login com sucesso.
* **Efeito no Sistema:** Elimina o abandono de funil e a necessidade de o candidato procurar a vaga novamente após fazer login.
* **Requisitos Associados:** `RF_F01`.
* **Implementação Técnica:** `src/components/JobDetailsModal.tsx`, `src/App.tsx`.

---

#### RN-022: Restrição de Acesso e Sigilo de Candidaturas
* **Descrição:** Os dados completos de uma candidatura só podem ser visualizados pelo candidato titular da inscrição, pela empresa anunciante proprietária da vaga ou por um Administrador do sistema.
* **Entidades Envolvidas:** `Application`.
* **Atributos Afetados:** `applications/{appId}`.
* **Gatilho:** Consulta à coleção `/applications`.
* **Condição de Validação:** `request.auth.uid in [resource.data.candidateId, resource.data.companyId] || isAdmin()`.
* **Efeito no Sistema:** Nenhuma outra empresa ou candidato concorrente pode ver quem se candidatou à vaga.
* **Mensagem de Erro:** *"Acesso negado aos dados desta candidatura."*
* **Requisitos Associados:** `RF_F01`, `RF_S02`, `RF_S04`.
* **Implementação Técnica:** `firestore.rules`, `src/services/applicationsService.ts`.

---

#### RN-023: Máquina de Estados Oficial do Funil de Recrutamento
* **Descrição:** Toda candidatura transita estritamente pelo funil oficial de seleção:
  $$\text{Novo} \longrightarrow \text{Em Análise} \longrightarrow \text{Entrevista} \longrightarrow (\text{Aprovado} \mid \text{Recusado})$$
* **Entidades Envolvidas:** `Application`.
* **Atributos Afetados:** `status`, `updatedAt`.
* **Gatilho:** Ação da empresa recrutadora no painel da vaga.
* **Condição de Validação:** Apenas a empresa dona da vaga (ou Admin) pode alterar a etapa do candidato.
* **Efeito no Sistema:** Atualização imediata do funil visual da empresa e reflexo instantâneo no painel do candidato ("Minhas Candidaturas").
* **Requisitos Associados:** `RF_F06`, `RF_S02`, `RF_S04`.
* **Implementação Técnica:** `src/utils/matchAlgorithm.ts`, `src/components/CompanyDashboard.tsx`.

---

#### RN-024: Contato Direto via WhatsApp com Mensagem Parametrizada
* **Descrição:** A empresa recrutadora pode iniciar contato direto com o candidato via WhatsApp através de link gerado automaticamente contendo o título da vaga, nome da empresa e referência ao portal *PrudenEmpregos*.
* **Entidades Envolvidas:** `Application`, `UserProfile`.
* **Atributos Afetados:** `candidatePhone`.
* **Gatilho:** Clique no botão "Chamar no WhatsApp" na linha do candidato.
* **Condição de Validação:** Candidato com telefone/WhatsApp válido com DDD.
* **Efeito no Sistema:** Abertura da URL `https://api.whatsapp.com/send?phone=...&text=...` com a mensagem pré-formatada.
* **Requisitos Associados:** `RF_F06`.
* **Implementação Técnica:** `src/utils/matchAlgorithm.ts`, `src/components/CompanyDashboard.tsx`.

---

### DOMÍNIO 6: MOTOR DE COMPATIBILIDADE (MATCH PONDERADO)

#### RN-025: Cálculo Determinístico do Índice de Match Ponderado (100 Pontos)
* **Descrição:** O cálculo de compatibilidade entre o candidato e a vaga deve ser executado no ato da candidatura de forma determinística e decomposto estritamente em quatro dimensões com peso total de 100 pontos:
  1. **Habilidades Técnicas e Competências:** até **40 pontos** ($\text{Score} = \frac{\text{skillsAtendidas}}{\text{skillsExigidas}} \times 40$);
  2. **Nível de Experiência Profissional:** até **25 pontos** (senioridade compatível ou vagas de Primeiro Emprego/Estágio);
  3. **Palavras-chave do Cargo e Descrição:** até **20 pontos** (aderência semântica com o histórico profissional);
  4. **Localização Regional e Modalidade:** até **15 pontos** (residência em Presidente Prudente e cidades da microrregião ou modalidade remota).
* **Entidades Envolvidas:** `Application`, `Job`, `UserProfile`.
* **Atributos Afetados:** `matchScore`, `matchBreakdown`.
* **Gatilho:** Registro da candidatura a uma vaga.
* **Condição de Validação:** Execução da função matemática `calculateDeterministicMatch(candidato, vaga)`.
* **Efeito no Sistema:** Armazenamento do percentual global (0% a 100%) e do detalhamento analítico na candidatura para exibição no ranking do recrutador.
* **Requisitos Associados:** `RF_F05`, `RF_S02`.
* **Implementação Técnica:** `src/utils/matchEngine.ts`, `src/services/applicationsService.ts`.

---

#### RN-026: Enquadramento Positivo e Orientação Construtiva
* **Descrição:** O resultado da análise de compatibilidade apresentado ao candidato deve evidenciar prioritariamente as competências que ele já domina (ex.: *"Você já possui 3 de 4 competências requeridas"*), apontando os requisitos adicionais como oportunidade de capacitação profissional e não como fator de exclusão.
* **Entidades Envolvidas:** `MatchAnalysis`, `UserProfile`.
* **Atributos Afetados:** `matchStrengths`, `missingSkills`.
* **Gatilho:** Visualização da análise de aderência no painel do candidato.
* **Efeito no Sistema:** Elevação do engajamento e incentivo ao aprendizado contínuo.
* **Requisitos Associados:** `RF_F05`.
* **Implementação Técnica:** `src/utils/matchAlgorithm.ts`, `src/components/CandidateDashboard.tsx`.

---

### DOMÍNIO 7: CURRÍCULO PROFISSIONAL EM PDF PADRÃO ATS

#### RN-027: Texto Selecionável em Arquivo PDF 1.4 Padrão ATS
* **Descrição:** O currículo exportado pelo candidato deve ser gerado como arquivo PDF versão 1.4 autêntico com blocos de texto vetorial selecionável (operadores `BT` e `ET` e fonte padrão com codificação `WinAnsiEncoding`), permitindo leitura por softwares e robôs de triagem automatizada (ATS).
* **Entidades Envolvidas:** `UserProfile`, `ResumeExport`.
* **Atributos Afetados:** `pdfBytes`, `dataUrl`.
* **Gatilho:** Solicitação de download no gerador de currículos.
* **Condição de Validação:** O documento PDF não pode conter imagens chapadas de texto ou fontes ilegíveis.
* **Efeito no Sistema:** Geração em menos de 1 segundo diretamente no cliente sem necessidade de bibliotecas externas pesadas ou serviços de renderização remotos lentos.
* **Requisitos Associados:** `RF_F04`, `RNF_02`.
* **Implementação Técnica:** `src/utils/pdfResumeGenerator.ts`, `src/components/ResumeGeneratorModal.tsx`.

---

#### RN-028: Supressão Obrigatória de PII Residencial e Proteção de CPF no PDF
* **Descrição:** Em estrita observância à LGPD, o endereço residencial do candidato (rua, número da residência, bairro e CEP) e sua pretensão salarial **nunca são incluídos no arquivo PDF exportado**. O número do CPF só é impresso se o candidato marcar expressamente a autorização de exibição.
* **Entidades Envolvidas:** `UserProfile`, `ResumeExport`.
* **Atributos Afetados:** `locationLine`, `cpfDisplay`.
* **Gatilho:** Função de montagem do currículo estruturado `buildStructuredResumeFromProfile`.
* **Condição de Validação:** A linha de localização deve conter exclusivamente `Cidade, UF` (ex.: *"Presidente Prudente, SP"*).
* **Efeito no Sistema:** Proteção contra vazamento da residência física do profissional em seleções externas.
* **Requisitos Associados:** `RF_F04`, `RNF_LGPD`.
* **Implementação Técnica:** `src/utils/pdfResumeGenerator.ts`, `src/utils/platformRules.test.ts`.

---

#### RN-029: Três Modelos Visuais Lineares para Compatibilidade com Algoritmos ATS
* **Descrição:** O gerador de currículo disponibiliza três modelos visuais com estrutura mono-coluna linear: **Clássico Executivo**, **Moderno Tecnológico** e **Compacto Objetivo**, evitando tabelas complexas ou layouts em múltiplas colunas que corrompem a ordem de leitura dos motores ATS.
* **Entidades Envolvidas:** `ResumeTemplate`.
* **Atributos Afetados:** `templateId`.
* **Gatilho:** Seleção do modelo visual pelo candidato.
* **Condição de Validação:** `templateId in ['ats_classic', 'ats_modern', 'ats_compact']`.
* **Efeito no Sistema:** Apresentação elegante e 100% legível por robôs de recrutamento.
* **Requisitos Associados:** `RF_F04`.
* **Implementação Técnica:** `src/utils/pdfResumeGenerator.ts`, `src/components/ResumeGeneratorModal.tsx`.

---

### DOMÍNIO 8: PAGAMENTOS, WEBHOOKS E INTEGRAÇÃO MERCADO PAGO

#### RN-030: Geração de Cobrança Pix e EMVCo BRCode em Tempo Real
* **Descrição:** Cobranças de créditos via Pix geram em tempo real o QR Code gráfico e o código alfanumérico Pix Copia e Cola em conformidade com as normas do Banco Central do Brasil e da API do Mercado Pago, com cálculo de dígito CRC16 válido.
* **Entidades Envolvidas:** `CreditOrder`, `PaymentPreference`.
* **Atributos Afetados:** `qrCodeBase64`, `qrCodeCopyPaste`, `orderId`.
* **Gatilho:** Seleção de pagamento via Pix no modal de recarga.
* **Condição de Validação:** Resposta de sucesso da API de pagamentos do Mercado Pago com `status == 'pending'`.
* **Efeito no Sistema:** Renderização imediata para escaneamento ou cópia com 1 clique pelo usuário.
* **Requisitos Associados:** `RF_F03`.
* **Implementação Técnica:** `server.ts`, `src/services/mercadopagoService.ts`, `src/components/MercadoPagoModal.tsx`.

---

#### RN-031: Idempotência Estrita no Webhook de Pagamentos
* **Descrição:** A liquidação financeira e a adição de créditos no saldo do comprador são estritamente idempotentes. Se uma notificação de webhook for reenviada pela rede do Mercado Pago para um pedido já aprovado, o sistema rejeita o crédito duplicado.
* **Entidades Envolvidas:** `CreditOrder`, `User`.
* **Atributos Afetados:** `order.status`, `user.credits`.
* **Gatilho:** Notificação recebida em `POST /api/mercadopago/webhook`.
* **Condição de Validação:** Se o registro do pedido no banco de dados já possuir `status == 'approved'`, a requisição é encerrada com sucesso HTTP 200 sem realizar nova adição de créditos.
* **Efeito no Sistema:** Impossibilidade contábil de creditar duas vezes o mesmo pagamento.
* **Requisitos Associados:** `RF_F03`.
* **Implementação Técnica:** `server.ts`.

---

#### RN-032: Validação de Assinatura Criptográfica HMAC no Webhook
* **Descrição:** Todas as requisições recebidas no endpoint do webhook do Mercado Pago têm seu cabeçalho `x-signature` validado com o algoritmo HMAC-SHA256 utilizando a chave secreta oficial de webhook.
* **Entidades Envolvidas:** `WebhookRequest`.
* **Atributos Afetados:** `headers['x-signature']`.
* **Gatilho:** Chegada de requisição externa em `POST /api/mercadopago/webhook`.
* **Condição de Validação:** O hash calculado no servidor com base no `ts` e `data.id` da mensagem deve coincidir exatamente com a assinatura enviada.
* **Efeito no Sistema:** Rejeição imediata de requisições forjadas por terceiros mal-intencionados.
* **Mensagem de Erro:** *"Assinatura de webhook inválida. Acesso não autorizado."*
* **Requisitos Associados:** `RF_F03`, `RNF_SEGURANCA`.
* **Implementação Técnica:** `server.ts`.

---

### DOMÍNIO 9: INCLUSÃO SOCIAL E RECRUTAMENTO ÀS CEGAS

#### RN-033: Modo de Recrutamento às Cegas (Blind Hiring)
* **Descrição:** A empresa recrutadora pode ativar o modo de "Recrutamento às Cegas" na triagem inicial de candidatos, instruindo o sistema a ocultar temporariamente nome completo, foto de perfil, idade, data de nascimento e ano de graduação dos candidatos.
* **Entidades Envolvidas:** `Application`, `CandidateView`.
* **Atributos Afetados:** `name`, `photoDataUrl`, `age`, `graduationYear`.
* **Gatilho:** Acionamento do botão seletor de Recrutamento às Cegas no painel corporativo.
* **Condição de Validação:** `isBlindMode == true`.
* **Efeito no Sistema:** O candidato é exibido sob um pseudônimo anônimo padronizado (ex.: *"Candidato #5E2A"*), permitindo que a avaliação técnica inicial ocorra livre de preconceitos de gênero, etnia, idade ou aparência física.
* **Requisitos Associados:** `RF_F06`, `RF_S02`.
* **Implementação Técnica:** `src/utils/ponteTalentosLogic.ts`, `src/components/CompanyDashboard.tsx`.

---

#### RN-034: Filtros e Incentivo a Vagas Inclusivas Regionais
* **Descrição:** O mural de vagas do portal disponibiliza filtros destacados e indexação para vagas inclusivas, contemplando Primeiro Emprego, Estágio, Jovem Aprendiz, PCD e profissionais com mais de 50 anos (50+).
* **Entidades Envolvidas:** `Job`.
* **Atributos Afetados:** `isInclusive50Plus`, `isFirstJob`, `contract`.
* **Gatilho:** Filtragem por chips rápidos na página inicial.
* **Efeito no Sistema:** Conexão direta entre públicos com maiores barreiras de entrada e empresas da região dispostas a contratar.
* **Requisitos Associados:** `RF_S01`.
* **Implementação Técnica:** `src/components/HomeView.tsx`, `src/constants/credits.ts`.

---

### DOMÍNIO 10: AUDITORIA, MODERAÇÃO E INTEGRIDADE DO SISTEMA

#### RN-035: Livro-Razão Imutável de Transações de Crédito (Ledger Auditável)
* **Descrição:** Toda movimentação de créditos (seja crédito de bônus, compra aprovada ou débito operacional em vagas/candidaturas/currículos) gera um registro histórico permanente e imutável na coleção `/credit_transactions`.
* **Entidades Envolvidas:** `CreditTransaction`.
* **Atributos Afetados:** `credit_transactions/{txId}` (`amount`, `operationType`, `previousBalance`, `newBalance`, `timestamp`).
* **Gatilho:** Qualquer acréscimo ou dedução de créditos na conta de um usuário.
* **Condição de Validação:** Escrita permitida exclusivamente via rotas de backend ou funções administrativas autenticadas. O cliente não pode editar nem excluir registros desta coleção.
* **Efeito no Sistema:** Rastreabilidade contábil total, permitindo ao usuário consultar seu extrato detalhado a qualquer momento.
* **Requisitos Associados:** `RF_S03`.
* **Implementação Técnica:** `firestore.rules`, `server.ts`, `src/services/usersService.ts`.

---

#### RN-036: Sanitização Automática contra Injeção de Scripts (XSS)
* **Descrição:** Todo texto submetido por usuários em títulos de vaga, descrições de cargo, experiências curriculares, cartas de apresentação ou mensagens deve passar por sanitização obrigatória que remove ou neutraliza tags HTML e scripts maliciosos.
* **Entidades Envolvidas:** Todas as entidades com campos textuais livres.
* **Gatilho:** Submissão de dados no cliente ou processamento no servidor.
* **Condição de Validação:** Execução de rotinas de higienização que eliminam padrões `<script>`, `onerror=`, `javascript:`, etc.
* **Efeito no Sistema:** Proteção integral contra ataques de XSS armazenado (*Stored XSS*) e reflexivo.
* **Requisitos Associados:** `RNF_SEGURANCA`.
* **Implementação Técnica:** `src/utils/validation.ts`, `src/utils/securityAudit.test.ts`.

---

## 3. MATRIZ DE RASTREABILIDADE (REGRAS DE NEGÓCIO vs. REQUISITOS IEEE 830)

A tabela abaixo cruza cada Regra de Negócio com os Requisitos Funcionais (`RF_B`, `RF_F`, `RF_S`) e Requisitos Não Funcionais (`RNF`) especificados na ERS (Padrão IEEE Std 830/1998):

| Regra de Negócio | Domínio | Requisito Relacionado | Implementação Principal no Código |
| :--- | :--- | :--- | :--- |
| **RN-001** | Identidade e Acesso | `RF_B01`, `RF_B02` | `src/services/directCloudAuth.ts` |
| **RN-002** | Identidade e Acesso | `RF_B01`, `RF_B02`, `RF_S05` | `firestore.rules`, `src/types.ts` |
| **RN-003** | Identidade e Acesso | `RNF_04` | `src/services/directCloudAuth.ts` |
| **RN-004** | Identidade e Acesso | `RF_B01`, `RF_B02` | `src/components/CompleteOnboardingModal.tsx` |
| **RN-005** | Validação e LGPD | `RF_B01` | `src/services/cnpjService.ts`, `src/utils/validation.ts` |
| **RN-006** | Validação e LGPD | `RF_B02` | `src/services/cnpjService.ts`, `server.ts` |
| **RN-007** | Validação e LGPD | `RF_B01`, `RF_B02` | `firestore.rules`, `server.ts` |
| **RN-008** | Validação e LGPD | `RF_B01`, `RF_B02` | `src/services/cepService.ts` |
| **RN-009** | Validação e LGPD | `RNF_LGPD`, `RF_B01` | `firestore.rules`, `src/services/usersService.ts` |
| **RN-010** | Economia de Créditos | `RF_B01`, `RF_B02`, `RF_B05` | `src/shared/creditPackages.ts`, `server.ts` |
| **RN-011** | Economia de Créditos | `RF_F01`, `RF_F02`, `RF_F04` | `src/shared/creditPackages.ts`, `src/constants/credits.ts` |
| **RN-012** | Economia de Créditos | `RF_F01`, `RF_F02`, `RF_F04` | `firestore.rules`, `server.ts` |
| **RN-013** | Economia de Créditos | `RF_B05`, `RF_S03` | `src/shared/creditPackages.ts` |
| **RN-014** | Economia de Créditos | `RF_B05`, `RF_F03` | `src/shared/creditPackages.ts`, `server.ts` |
| **RN-015** | Gestão de Vagas | `RF_B03`, `RF_F02` | `firestore.rules`, `src/components/CompanyDashboard.tsx` |
| **RN-016** | Gestão de Vagas | `RF_B03`, `RF_S01` | `src/utils/formatters.ts` |
| **RN-017** | Gestão de Vagas | `RF_B03` | `src/utils/matchAlgorithm.ts` |
| **RN-018** | Gestão de Vagas | `RF_F02`, `RF_S01` | `src/components/HomeView.tsx`, `src/services/jobsService.ts` |
| **RN-019** | Gestão de Vagas | `RF_S01` | `src/services/jobsService.ts` |
| **RN-020** | Candidaturas e Funil | `RF_F01` | `src/services/applicationsService.ts` |
| **RN-021** | Candidaturas e Funil | `RF_F01` | `src/components/JobDetailsModal.tsx`, `src/App.tsx` |
| **RN-022** | Candidaturas e Funil | `RF_F01`, `RF_S02`, `RF_S04` | `firestore.rules`, `src/services/applicationsService.ts` |
| **RN-023** | Candidaturas e Funil | `RF_F06`, `RF_S02` | `src/utils/matchAlgorithm.ts` |
| **RN-024** | Candidaturas e Funil | `RF_F06` | `src/utils/matchAlgorithm.ts` |
| **RN-025** | Motor de Match | `RF_F05`, `RF_S02` | `src/utils/matchEngine.ts` |
| **RN-026** | Motor de Match | `RF_F05` | `src/utils/matchAlgorithm.ts` |
| **RN-027** | Currículo ATS PDF | `RF_F04`, `RNF_02` | `src/utils/pdfResumeGenerator.ts` |
| **RN-028** | Currículo ATS PDF | `RF_F04`, `RNF_LGPD` | `src/utils/pdfResumeGenerator.ts` |
| **RN-029** | Currículo ATS PDF | `RF_F04` | `src/utils/pdfResumeGenerator.ts` |
| **RN-030** | Pagamentos Mercado Pago | `RF_F03` | `server.ts`, `src/services/mercadopagoService.ts` |
| **RN-031** | Pagamentos Mercado Pago | `RF_F03` | `server.ts` |
| **RN-032** | Pagamentos Mercado Pago | `RF_F03`, `RNF_SEGURANCA` | `server.ts` |
| **RN-033** | Inclusão e Recrutamento Cego | `RF_F06`, `RF_S02` | `src/utils/ponteTalentosLogic.ts` |
| **RN-034** | Inclusão e Recrutamento Cego | `RF_S01` | `src/components/HomeView.tsx` |
| **RN-035** | Auditoria e Integridade | `RF_S03` | `firestore.rules`, `server.ts` |
| **RN-036** | Auditoria e Integridade | `RNF_SEGURANCA` | `src/utils/validation.ts` |

---

## 4. CONCLUSÃO

A especificação completa das **36 Regras de Negócio** consolidadas neste documento e implementadas no código-fonte assegura que o sistema *PrudenEmpregos*:
1. Mantém conformidade legal estrita com a **LGPD (Lei nº 13.709/2018)** e integridade fiscal com a **Receita Federal**;
2. Blinda a carteira de créditos e as transações de pagamento com **idempotência matemática**;
3. Oferece ao mercado de Presidente Prudente e região um ambiente profissional imparcial, acessível e auditável;
4. Atende integralmente às exigências acadêmicas e de engenharia de software do padrão **IEEE Std 830/1998**.
