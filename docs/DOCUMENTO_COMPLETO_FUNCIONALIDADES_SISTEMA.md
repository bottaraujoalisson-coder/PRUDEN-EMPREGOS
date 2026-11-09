# DOCUMENTO DE ESPECIFICAÇÃO COMPLETA DAS FUNCIONALIDADES DO SISTEMA

**Sistema:** *PrudenEmpregos* — Portal Regional de Empregos, Recrutamento e Seleção de Presidente Prudente e Região  
**Instituição:** Fatec Presidente Prudente — Tecnologia em Análise e Desenvolvimento de Sistemas  
**Disciplina:** IES-100 (Engenharia de Software I)  
**Norma de Referência:** Padrão IEEE Std 830/1998  
**Conformidade Legal:** Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)  
**Ambiente de Produção:** [https://prudenempregos.netlify.app](https://prudenempregos.netlify.app) | [https://prudenempregos.com.br](https://prudenempregos.com.br)  
**Versão:** 2.0 (Completa e Consolidada)  

---

## SUMÁRIO GERAL

1. [Módulo 1: Mural Regional de Vagas e Navegação Pública](#1-módulo-1-mural-regional-de-vagas-e-navegação-pública)
2. [Módulo 2: Autenticação, Perfis (RBAC) e Onboarding Seguro](#2-módulo-2-autenticação-perfis-rbac-e-onboarding-seguro)
3. [Módulo 3: Painel do Candidato (Candidate Dashboard)](#3-módulo-3-painel-do-candidato-candidate-dashboard)
4. [Módulo 4: Gerador de Currículo Profissional em PDF Padrão ATS](#4-módulo-4-gerador-de-currículo-profissional-em-pdf-padrão-ats)
5. [Módulo 5: Painel da Empresa Recrutadora (Company Dashboard)](#5-módulo-5-painel-da-empresa-recrutadora-company-dashboard)
6. [Módulo 6: Motor de Match e Compatibilidade Determinística (100 Pontos)](#6-módulo-6-motor-de-match-e-compatibilidade-determinística-100-pontos)
7. [Módulo 7: Gestão de Créditos, Planos e Pagamentos (Mercado Pago)](#7-módulo-7-gestão-de-créditos-planos-e-pagamentos-mercado-pago)
8. [Módulo 8: Painel Administrativo e Moderação Global](#8-módulo-8-painel-administrativo-e-moderação-global)
9. [Módulo 9: Acessibilidade WCAG 2.2, SEO e Otimizações de Desempenho](#9-módulo-9-acessibilidade-wcag-22-seo-e-otimizações-de-desempenho)
10. [Módulo 10: Segurança da Informação, LGPD e Banco de Dados Firestore](#10-módulo-10-segurança-da-informação-lgpd-e-banco-de-dados-firestore)

---

## 1. MÓDULO 1: MURAL REGIONAL DE VAGAS E NAVEGAÇÃO PÚBLICA

### 1.1. Barra de Busca com Debounce (300ms) e Sincronização de URL
* **Objetivo:** Permitir ao visitante e ao candidato localizar vagas por cargo, competência técnica, nome da empresa ou atribuição com resposta instantânea e URL compartilhável.
* **Comportamento:**
  * O input textual implementa temporizador de *debounce* de **300 milissegundos**, evitando consultas desnecessárias a cada tecla digitada;
  * Os parâmetros de busca são sincronizados em tempo real com a barra de endereços do navegador (`/?q=termo`), permitindo que links de busca sejam compartilhados e que os botões "Avançar" e "Voltar" do navegador funcionem nativamente;
  * O placeholder orienta o usuário: *"Cargo, área, empresa ou competência..."*.

### 1.2. Barra de Filtros Rápidos (Categorias, Modalidades e Contratos)
* **Categorias Profissionais Expandidas:**
  * Chips de seleção rápida: *Todas*, *Administração e Finanças*, *Comercial e Vendas*, *Tecnologia da Informação*, *Saúde e Bem-Estar*, *Engenharia e Obras*, *Logística e Transporte*, *Educação e Ensino*, *Marketing e Comunicação*, *Jurídico e Contábil*, *Atendimento e Operacional*.
* **Modalidade de Trabalho:**
  * Seletor triplo: *Todas*, *Presencial* (Presidente Prudente e região), *Híbrido*, *Remoto*.
* **Regime de Contratação:**
  * Chips com opções: *Todas*, *Primeiro Emprego*, *Estágio*, *CLT*, *PJ*, *Freelancer*.

### 1.3. Modal "Mais Filtros" (Filtros Avançados)
* **Funcionalidade:** Modal complementar acionado pelo botão "Mais filtros (X ativos)":
  * **Nível de Experiência:** Primeiro Emprego, Estágio, Júnior, Pleno, Sênior, Especialista;
  * **Exigência de CNH:** Qualquer, Sim (Exige CNH), Não exige;
  * **Veículo Próprio:** Qualquer, Sim (Exige veículo próprio);
  * **Apenas vagas com salário informado:** Filtro booleano que oculta oportunidades marcadas como "Salário a combinar".

### 1.4. Botão "Limpar Filtros" e Estado Vazio Inteligente
* **Funcionalidade:** Quando nenhum resultado for localizado para a combinação de filtros:
  * Exibe alerta visual com ícone amigável e texto explicativo: *"Nenhuma vaga encontrada para estes filtros em Presidente Prudente e região."*;
  * O botão **"Limpar filtros"** executa a restauração completa em 1 clique:
    1. Reseta o input textual de busca (`query = ''`);
    2. Reseta a categoria selecionada para 'Todas';
    3. Reseta a modalidade para 'Todas' e o contrato para 'Todas';
    4. Reseta todos os 4 seletores do modal "Mais filtros";
    5. Limpa a querystring da URL (`window.history.replaceState({}, '', '/')`), restaurando o mural completo imediatamente.

### 1.5. Listagem de Vagas com Priorização de Destaque (*Boost*)
* **Algoritmo de Ordenação:**
  1. **Vagas Destacadas no Topo:** Vagas com `isFeatured === true` e vigência de destaque ativa (`featuredExpiresAt > agora`) são posicionadas no topo absoluto da lista, identificadas com selo dourado/azul escuro em gradiente *"Vaga Destacada"*;
  2. **Vagas Recentes:** Demais oportunidades ordenadas por data de publicação decrescente;
  3. **Vagas de Teste:** Registros marcados como "Empresa Teste" ou `isTestRecord === true` são automaticamente filtrados e omitidos do público.

### 1.6. Card de Vaga Informativo com Formatação Salarial BRL
* **Dados Exibidos no Card:**
  * Título da oportunidade;
  * Nome da empresa anunciante com selo de Empresa Verificada (quando validada na Receita Federal);
  * Cidade e Estado (ex.: *"Presidente Prudente, SP"*, *"Álvares Machado, SP"*);
  * Modalidade e Regime (ex.: *"Presencial • CLT"*);
  * **Remuneração formatada rigorosamente em moeda nacional:** Utiliza `formatSalaryBRL(valor)` exibindo `R$ 2.500,00` ou `R$ 2.200,00 + comissão`; quando não preenchido, exibe *"Salário a combinar"*;
  * Tags visuais com as primeiras competências exigidas;
  * Indicador de publicação recente (ex.: *"Há 3 horas"*);
  * Botão de ação rápida *"Ver detalhes ↗"*.

### 1.7. Modal Completo de Detalhes da Vaga
* **Conteúdo e Recursos:**
  * Informações institucionais completas da empresa;
  * Descrição minuciosa das atribuições do cargo;
  * Lista de requisitos obrigatórios e desejáveis;
  * Pacote de benefícios (Vale Alimentação, Convênio Médico, VT, etc.);
  * Botão *"Compartilhar no WhatsApp"*;
  * **Injeção Dinâmica de Schema.org (`JobPosting` JSON-LD):** Cria dinamicamente a tag `<script type="application/ld+json">` no `document.head` com metadados estruturados para que o Google indexe a vaga automaticamente no Google Vagas / Google Jobs;
  * Botão de conversão principal: **"Candidatar-se agora"**.

### 1.8. Compartilhamento Instantâneo via WhatsApp
* **Funcionalidade:** Ao clicar em compartilhar vaga, gera uma mensagem pré-formatada e abre diretamente a API do WhatsApp:
  ```text
  *Vaga aberta no PrudenEmpregos*
  Cargo: Analista Financeiro Pleno
  Empresa: Supermercados Estrela
  Local: Presidente Prudente, SP
  Remuneração: R$ 3.500,00 • CLT
  Veja detalhes e candidate-se: https://prudenempregos.com.br/?vaga=ID_DA_VAGA
  ```

---

## 2. MÓDULO 2: AUTENTICAÇÃO, PERFIS (RBAC) E ONBOARDING SEGURO

### 2.1. Modal de Autenticação Unificada
* **Abas de Acesso:**
  * **Aba Candidato (CPF):** Formulário voltado à pessoa física, com campo de CPF pré-formatado (`000.000.000-00`), e-mail e senha;
  * **Aba Empresa (CNPJ):** Formulário voltado à pessoa jurídica, com campo de CNPJ pré-formatado (`00.000.000/0000-00`), razão social/nome fantasia, e-mail corporativo e senha;
* **Políticas de Senha:** Exige comprimento mínimo de 6 caracteres;
* **Anti-Enumeração de Contas:** Mensagens de erro genéricas para evitar descoberta de contas existentes por invasores.

### 2.2. Login Social Federado com Google OAuth 2.0
* **Funcionalidade:** Permite autenticação instantânea com 1 clique utilizando a conta Google do usuário via Firebase Authentication (`signInWithPopup`).
* **Segurança:** O token JWT de ID retornado pelo Google é validado no servidor para autenticação de requisições de API.

### 2.3. Modal de Onboarding Obrigatório pós-Google
* **Gatilho:** Quando um usuário realiza login com Google pela primeira vez, ele é autenticado sem CPF ou CNPJ; o sistema identifica `onboardingCompleted === false` e abre automaticamente o `CompleteOnboardingModal`.
* **Fluxo do Modal de Onboarding:**
  1. O usuário escolhe se deseja atuar como **Candidato** ou **Empresa**;
  2. Digita seu documento:
     * Se 11 dígitos $\to$ sistema formata como CPF e valida matematicamente;
     * Se 14 dígitos $\to$ sistema formata como CNPJ, valida matematicamente e dispara consulta assíncrona na Receita Federal;
  3. Informa telefone com DDD e CEP (com preenchimento automático de endereço);
  4. Aceita o termo de consentimento LGPD;
  5. Ao submeter, a rota `POST /api/auth/complete-onboarding` valida os dados, vincula a chave em `/document_registry` e concede automaticamente os **+30 créditos de boas-vindas**.

### 2.4. Validação Cadastral em Tempo Real
* **CPF (Módulo 11):** Validação matemática instantânea dos dois dígitos verificadores; rejeição automática de números com dígitos repetidos;
* **CNPJ (Receita Federal via BrasilAPI):**
  * Consulta a situação cadastral do CNPJ no momento da digitação;
  * Se a empresa constar como **"ATIVA"**, preenche automaticamente Razão Social, Nome Fantasia, Logradouro, Bairro e Município;
  * Se o CNPJ constar como **"BAIXADA"**, **"INAPTA"** ou **"SUSPENSA"**, exibe alerta impeditivo em vermelho e bloqueia a criação do perfil.

### 2.5. Preservação de Intenção de Candidatura pós-Login com 1 Clique
* **Fluxo Inteligente:**
  1. Visitante deslogado navega no mural, abre o modal de uma vaga e clica em *"Candidatar-se agora"*;
  2. O sistema armazena o ID da vaga em `sessionStorage.setItem('pendingJobId', job.id)`;
  3. Abre o modal de login/cadastro posicionado na aba "Candidato (CPF)";
  4. O usuário realiza o login ou conclui o onboarding;
  5. A aplicação detecta o `pendingJobId`, recupera a vaga e reabre imediatamente o modal de detalhes para que o candidato finalize sua inscrição com 1 clique, sem precisar buscar a oportunidade novamente.

---

## 3. MÓDULO 3: PAINEL DO CANDIDATO (CANDIDATE DASHBOARD)

### 3.1. Cabeçalho Informativo e Carteira de Créditos
* **Exibição:**
  * Foto de perfil ou iniciais estilizadas;
  * Nome do candidato, cargo desejado e localização regional;
  * **Saldo Atual de Créditos:** Exibição destacada com atalho para a aba de planos/recarga;
  * Aviso de privacidade: *"🔒 Seus dados sensíveis (CPF e endereço) são protegidos e jamais expostos publicamente."*.

### 3.2. Termômetro de Força do Perfil (Coach de Preenchimento)
* **Funcionalidade:** Barra de progresso dinâmica que avalia o nível de completude do perfil (0% a 100%):
  * Dados básicos (Nome, Telefone, Cidade);
  * Cargo pretendido e nível de escolaridade;
  * Mínimo de 3 habilidades técnicas cadastradas;
  * Resumo profissional preenchido ($\ge$ 50 caracteres);
  * Currículo PDF anexado ou gerado;
* **Recompensa Comportamental:** Alerta orientativo informando que perfis 100% completos ganham prioridade de exibição para as empresas contratantes de Presidente Prudente.

### 3.3. Aba "Minhas Candidaturas" (Acompanhamento do Funil)
* **Funcionalidade:** Relação completa de vagas às quais o candidato se inscreveu:
  * Nome da vaga e empresa anunciante;
  * Data e hora da inscrição;
  * **Etapa Atual do Processo Seletivo em Tempo Real:**
    * 🟡 *Currículo enviado / Novo*
    * 🔵 *Perfil em análise*
    * 🟣 *Selecionado para contato / Entrevista*
    * 🟢 *Processo finalizado / Aprovado*
    * ⚪ *Encerrado*
  * Índice percentual de *Match* alcançado na candidatura.

### 3.4. Aba "Vagas Salvas" (Favoritos)
* **Funcionalidade:** Armazena oportunidades favoritadas pelo candidato durante a navegação para comparação e candidatura posterior.

### 3.5. Aba "Meu Currículo" com Wizard e Rascunho Automático
* **Stepper Estruturado em 4 Etapas:**
  * **Passo 1: Dados Pessoais e Contato:** Telefone/WhatsApp, CEP, endereço residencial e pretensão salarial;
  * **Passo 2: Perfil Profissional e Competências:** Cargo desejado, nível de experiência, resumo profissional e adição de tags de competências;
  * **Passo 3: Histórico de Experiências e Formação:** Adição dinâmica de experiências anteriores (empresa, cargo, período e atividades) e formação acadêmica;
  * **Passo 4: Anexos e Revisão:** Upload de currículo em PDF externo ou atalho para o Gerador de Currículo ATS com IA.
* **Salvamento Automático de Rascunho (`localStorage`):** Cada caractere digitado é salvo sob a chave `pruden_cv_draft_{uid}`, evitando que o candidato perca suas informações caso o navegador seja fechado acidentalmente.

### 3.6. Microdesafio de Competências Técnicas
* **Funcionalidade:** Módulo gamificado opcional com perguntas técnicas de múltipla escolha para comprovação de conhecimentos práticos em áreas como Vendas, Atendimento, Excel e Logística, atribuindo selo de competência comprovada no perfil.

---

## 4. MÓDULO 4: GERADOR DE CURRÍCULO PROFISSIONAL EM PDF PADRÃO ATS

### 4.1. Modal do Gerador de Currículo ATS
* **Propósito:** Transformar o perfil do candidato em um currículo profissional diagramado segundo as melhores práticas mundiais de Recursos Humanos e sistemas ATS (*Applicant Tracking Systems*).
* **Custo da Operação:** **15 créditos** por emissão (com bônus de boas-vindas de 30 cr, o candidato pode emitir sem custo algum).

### 4.2. Escolha entre 3 Modelos Visuais Lineares
* **Modelo 1: Clássico Executivo (Padrão Harvard):** Tipografia serifada/sem serifa elegante, cabeçalho centralizado, divisores horizontais sutis e máxima densidade de conteúdo;
* **Modelo 2: Moderno Tecnológico:** Detalhes em Azul Royal `#2563EB`, cabeçalho lateral alinhado e destaque para competências técnicas e certificações;
* **Modelo 3: Compacto Objetivo:** Diagramação condensada ideal para jovens em busca do primeiro emprego, estágio ou profissionais com histórico focado.

### 4.3. Verificador de Prontidão Curricular
* **Funcionalidade:** Antes de debitar os créditos, o sistema valida se os dados essenciais estão preenchidos (Nome, Contato, Cidade, Resumo, Experiência ou Formação e Competências);
* Caso faltem informações, o modal exibe a lista de pendências e impede a cobrança indevida.

### 4.4. Blindagem de Privacidade no PDF (LGPD)
* **Regra de Ouro:** Por conformidade estrita com a LGPD, o endereço residencial do candidato (rua, número e CEP) e sua pretensão salarial **são omitidos da exportação** (exibindo apenas *"Presidente Prudente, SP"*);
* O número do CPF só é impresso se o candidato marcar explicitamente a caixa de seleção *"Incluir meu número de CPF no cabeçalho do documento"*.

### 4.5. Motor Vetorial PDF 1.4 de Alta Performance
* **Tecnologia:** Gerador nativo que cria os bytes do PDF diretamente no navegador do cliente em menos de 1 segundo;
* Utiliza operadores de texto vetorial `BT` e `ET` com codificação `WinAnsiEncoding`, garantindo que robôs de triagem de RH consigam selecionar, copiar e indexar cada caractere perfeitamente.

---

## 5. MÓDULO 5: PAINEL DA EMPRESA RECRUTADORA (COMPANY DASHBOARD)

### 5.1. Cabeçalho Corporativo e Selo de Verificação
* **Exibição:**
  * Razão Social e Nome Fantasia da organização;
  * Número de CNPJ com selo de **"Empresa Verificada na Receita Federal"**;
  * Saldo corporativo de créditos com botão de recarga instantânea via Pix.

### 5.2. Wizard de Publicação e Edição de Vagas em 4 Etapas
* **Passo 1: Identificação do Cargo:** Título da vaga, área profissional, modalidade (Presencial, Híbrido, Remoto) e cidade/UF da vaga;
* **Passo 2: Contratação e Remuneração:** Regime de contratação (CLT, Estágio, Jovem Aprendiz, PJ), nível de experiência exigido, faixa salarial em Reais (com cálculo automático de `formatSalaryBRL`) ou remuneração a combinar;
* **Passo 3: Atribuições e Competências:** Descrição detalhada das atividades, lista de requisitos obrigatórios e desejáveis, e cadastro de tags de competências para o motor de Match;
* **Passo 4: Benefícios e Revisão:** Seleção de benefícios oferecidos, opção de destaque no topo (*Boost* por +15 cr) e revisão final antes da publicação (10 cr).
* **Salvamento Automático de Rascunho (`localStorage`):** Salva o progresso sob a chave `pruden_job_draft_{uid}` para retomada a qualquer momento.

### 5.3. Impulsionamento e Destaque no Topo (*Boost*)
* **Funcionalidade:** Permite impulsionar qualquer vaga ativa para o topo do mural pelo custo de **15 créditos**, garantindo até 4x mais visualizações e candidaturas.

### 5.4. Ciclo de Vida e Vigência de 30 Dias da Vaga
* **Funcionalidades de Gestão:**
  * Pausar vaga (interrompe temporariamente novas candidaturas mantendo as já recebidas);
  * Reativar vaga;
  * Encerrar processo seletivo;
  * Renovar vigência por mais 30 dias mediante nova cota de créditos.

### 5.5. Funil Seletivo de Candidatos Inscritos
* **Visualização:** Lista organizada de candidatos por vaga com alternância de status em 1 clique:
  1. *Novo / Não Visualizado*
  2. *Em Análise*
  3. *Entrevista Agendada*
  4. *Aprovado*
  5. *Recusado*

### 5.6. Modo de Recrutamento às Cegas (*Blind Hiring*)
* **Funcionalidade Exclusiva:** Switch que ativa a triagem técnica sem preconceitos:
  * Oculta temporariamente foto, nome completo, idade e ano de formatura dos candidatos;
  * Substitui o nome por um código neutro (ex.: *"Candidato #7B3F"*);
  * Permite ao recrutador avaliar estritamente as competências técnicas, projetos e experiências antes de visualizar a identidade civil.

### 5.7. Exibição Analítica do *Match* Ponderado (40/25/20/15)
* **Funcionalidade:** Cada candidato possui sua pontuação detalhada em 4 pilares:
  * **Habilidades:** X / 40 pts;
  * **Experiência:** X / 25 pts;
  * **Palavras-chave:** X / 20 pts;
  * **Localização Regional:** X / 15 pts;
  * Lista de competências em comum e competências a desenvolver.

### 5.8. Disparo de Contato via WhatsApp com 1 Clique
* **Funcionalidade:** Botão ao lado de cada candidato que abre o WhatsApp com mensagem corporativa pronta, agilizando o agendamento de entrevistas.

---

## 6. MÓDULO 6: MOTOR DE MATCH E COMPATIBILIDADE DETERMINÍSTICA (100 PONTOS)

### 6.1. Fórmula Matemática e Critérios de Avaliação
O sistema calcula o índice percentual de aderência (0% a 100%) através da função `calculateDeterministicMatch(candidato, vaga)`:

$$\text{Score Total} = \text{Score}_{\text{Habilidades}} + \text{Score}_{\text{Experiência}} + \text{Score}_{\text{Palavras-Chave}} + \text{Score}_{\text{Localização}}$$

| Dimensão | Pontuação Máxima | Critério de Avaliação |
| :--- | :---: | :--- |
| **1. Habilidades Técnicas** | **40 pontos** | Proporção de competências exigidas na vaga que coincidem com as competências declaradas no perfil ou no resumo do candidato. |
| **2. Experiência Profissional** | **25 pontos** | Avaliação do histórico de atuação profissional; vagas declaradas como Estágio ou Primeiro Emprego concedem automaticamente pontuação máxima (25 pts). |
| **3. Palavras-Chave do Cargo** | **20 pontos** | Cruzamento textual de tokens e termos técnicos entre o título/descrição da vaga e o histórico profissional do candidato. |
| **4. Localização Regional** | **15 pontos** | 15 pontos para residentes em Presidente Prudente ou vagas remotas; 10 pontos para cidades da região metropolitana (Álvares Machado, Pirapozinho, Regente Feijó, Martinópolis, etc.). |

---

## 7. MÓDULO 7: GESTÃO DE CRÉDITOS, PLANOS E PAGAMENTOS (MERCADO PAGO)

### 7.1. Catálogo Oficial dos 5 Pacotes Progressivos
Preços estritamente autoritativos e validados no servidor em `src/shared/creditPackages.ts`:

1. **Pacote Básico (10 Créditos):** `R$ 14,90` (R$ 1,49 por crédito) — Ideal para 1 candidatura ou 1 publicação de vaga avulsa;
2. **Pacote Essencial (15 Créditos):** `R$ 19,90` (R$ 1,33 por crédito) — Exato para gerar 1 Currículo PDF ATS com IA ou destacar 1 vaga no topo;
3. **Pacote Profissional / Crescimento Pro (30 Créditos):** `R$ 34,90` (R$ 1,16 por crédito) — **Mais Popular / Melhor Custo-Benefício**;
4. **Pacote Avançado (50 Créditos):** `R$ 49,90` (R$ 1,00 por crédito) — Para candidatos ativos ou empresas com múltiplas vagas;
5. **Pacote Corporativo (100 Créditos):** `R$ 89,90` (R$ 0,90 por crédito) — **Maior Economia (-40%)** para indústrias e recrutamento contínuo.

### 7.2. Abas Segmentadas de Planos (Candidato vs. Empresa)
* **Visão Candidato:** Destaque para o bônus de boas-vindas (+30 cr grátis), custo de 10 cr por candidatura e 15 cr para emissão de currículo ATS;
* **Visão Empresa:** Destaque para publicação de vagas (10 cr), destaque no topo (15 cr) e economia nos pacotes de 50 e 100 créditos.

### 7.3. Modal de Pagamento via Pix com Liberação Imediata
* **Funcionalidade:** Ao escolher Pix, o sistema comunica-se com a API do Mercado Pago e gera:
  * Imagem gráfica do QR Code Pix em alta resolução;
  * Linha digitável Pix Copia e Cola (padrão EMVCo BRCode com CRC16 válido) com botão de cópia com 1 clique;
  * Aviso tranquilizador: *"Assim que o Pix for aprovado no seu banco, seus créditos entram automaticamente na sua conta."*;
  * Escuta em tempo real (`onSnapshot`) e botão para verificação manual imediata.

### 7.4. Webhook Transacional Idempotente
* **Endpoint:** `POST /api/mercadopago/webhook`
* **Segurança e Confiabilidade:**
  * Valida a assinatura HMAC-SHA256 (`x-signature`) enviada pelo Mercado Pago;
  * **Idempotência Estrita:** Se o pedido já estiver marcado como `approved`, a requisição é encerrada sem duplicar a adição de créditos;
  * Gravação do crédito no usuário e inserção do lançamento no livro-razão `/credit_transactions` via Admin SDK.

### 7.5. Livro-Razão Imutável de Transações (Ledger de Créditos)
* **Coleção:** `/credit_transactions`
* **Atributos Registrados:** Identificador do usuário, tipo da operação (`bonus_welcome`, `purchase_approved`, `job_apply`, `job_post`, `job_feature`, `resume_ats`), quantidade movimentada, saldo anterior, novo saldo e data/hora ISO;
* **Segurança:** O cliente não possui permissão de escrita ou exclusão nesta coleção.

---

## 8. MÓDULO 8: PAINEL ADMINISTRATIVO E MODERAÇÃO GLOBAL

### 8.1. Métricas Consolidadas da Plataforma
* **Indicadores em Tempo Real:**
  * Total de usuários cadastrados (segmentados por Candidatos e Empresas);
  * Total de empresas com CNPJ verificado na Receita Federal;
  * Total de vagas ativas e vagas com destaque ativo na região;
  * Volume total de candidaturas intermediadas;
  * Faturamento bruto em créditos e receita financeira acumulada.

### 8.2. Moderação e Auditoria de Conteúdo
* **Funcionalidades:**
  * Consulta e pesquisa de vagas com possibilidade de pausar ou excluir anúncios que violem diretrizes éticas ou legais;
  * Consulta de perfis de empresas e candidatos com histórico de documentos cadastrados;
  * Extrato global de pedidos de crédito com filtro por status (Aprovado, Pendente, Cancelado).

---

## 9. MÓDULO 9: ACESSIBILIDADE WCAG 2.2, SEO E DESEMPENHO

### 9.1. Acessibilidade Visual e Controle Tipográfico (WCAG 2.2 AA)
* **Escala Tipográfica no Header:**
  * **100%:** Escala normal (16px base);
  * **112%:** Escala ampliada para leitura confortável (18px base);
  * **125%:** Escala máxima para baixa visão ou idosos (20px base);
* **Alto Contraste:** Cores de fundo `#F8FAFC`, texto `#0F172A` e botões em Azul Royal `#1D4ED8` com contraste superior a 4.5:1.

### 9.2. SEO Regional e Metadados Sociais
* **Tag Title Otimizada:** `<title>Pruden Empregos | Vagas de Emprego e Currículos em Presidente Prudente e Região</title>`;
* **Meta Tags OpenGraph e Twitter Cards:** Miniaturas e títulos dinâmicos para compartilhamento em redes sociais e WhatsApp;
* **Microdados Schema.org:** Dados estruturados `JobPosting` e `EmploymentAgency` em formato JSON-LD.

### 9.3. Desempenho e Code-Splitting
* Carregamento assíncrono via `React.lazy` e `Suspense` para os painéis do Candidato, Empresa, Administrador e Planos, garantindo carregamento inicial da página em menos de 1 segundo sob conexões móveis 4G.

---

## 10. MÓDULO 10: SEGURANÇA DA INFORMAÇÃO, LGPD E BANCO DE DADOS FIRESTORE

### 10.1. Regras de Segurança Zero-Trust do Firestore (`firestore.rules`)
* **Bloqueio de Sessões Inseguras:** Proibição de IDs de sessão locais legados (`usr_...`);
* **Imutabilidade de Campos Críticos:** O cliente não pode alterar diretamente `credits`, `role`, `type`, `plan`, `welcomeCreditsGranted`, `isVerifiedCompany`, `cnpjVerified`, `cpf` ou `cnpj`;
* **Acesso Restrito a Candidaturas:** Somente o candidato titular, a empresa dona da vaga ou o Admin podem ler inscrições;
* **Bloqueio de Escrita Direta em Pedidos:** Clientes não podem criar ou alterar pedidos em `/credit_orders` ou `/credit_transactions` diretamente.

### 10.2. Segregação de Dados Pessoais (LGPD)
* `/profiles/{userId}`: Contém apenas nome, foto, cargo, resumo, competências, experiências e formação acadêmica pública;
* `/private_profiles/{userId}`: Armazena número de CPF, CNPJ, telefone residencial, logradouro, número predial e CEP, com leitura restrita exclusivamente ao próprio usuário ou Admin;
* `/document_registry/{hash}`: Armazena apenas o hash criptográfico SHA-256 do CPF ou CNPJ para controle de unicidade, impedindo que documentos fiquem expostos na base.

---

## CONCLUSÃO E HOMOLOGAÇÃO

O presente documento abrange **100% das funcionalidades, regras de interface, integrações e transações** do portal *PrudenEmpregos*, estando homologado e em plena conformidade com as diretrizes da disciplina **IES-100 (Engenharia de Software I)** da **Fatec Presidente Prudente** e com a legislação brasileira de proteção de dados (**LGPD**).
