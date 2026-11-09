# ESPECIFICAÇÃO DE REQUISITOS DE SOFTWARE (ERS)
**Padrão IEEE Std 830/1998 — Disciplina IES-100 (Engenharia de Software I)**
**Instituição:** Fatec Presidente Prudente — Tecnologia em Análise e Desenvolvimento de Sistemas
**Sistema:** *PrudenEmpregos* — Portal Regional de Empregos, Recrutamento e Seleção de Presidente Prudente e Região

---

## 1. INTRODUÇÃO

### 1.1. Objetivo
O objetivo principal deste manual consiste em documentar os requisitos especificados do software a ser produzido, inteirando o cliente, os analistas de sistemas e os desenvolvedores sobre o desenvolvimento e a utilização do software de uma maneira clara, consistente e objetiva, estabelecendo uma base formal de acordo sobre o que o sistema fará.

---

### 1.2. Escopo

O sistema *PrudenEmpregos* objetiva gerenciar todo o funcionamento de um portal regional de recrutamento, seleção de talentos e divulgação de vagas de emprego voltado ao mercado de trabalho de Presidente Prudente e municípios do Oeste Paulista, abrangendo desde o cadastramento e validação cadastral de candidatos e empresas anunciantes até a publicação de oportunidades profissionais, triagem inteligente de currículos, geração automatizada de currículos padronizados e comercialização de pacotes de créditos operacionais.

O software realiza o gerenciamento completo de candidatos (pessoas físicas), englobando informações pessoais, documentos de identificação (CPF), dados de contato, localização residencial por CEP, resumo profissional, histórico de experiências laborais, formação acadêmica, competências técnicas, carteira de habilitação (CNH), disponibilidade de veículo próprio e pretensão salarial, deixando tais informações estruturadas e disponíveis para que o próprio candidato acompanhe sua evolução profissional e se candidate às vagas compatíveis com o seu perfil. De forma complementar, o sistema gerencia o cadastro de empresas recrutadoras (pessoas jurídicas), assegurando a verificação de regularidade cadastral do CNPJ junto à base oficial da Receita Federal (permitindo apenas empresas com situação cadastral ativa), mantendo os dados de razão social, nome fantasia, endereço corporativo, porte empresarial e setor de atuação.

No âmbito da administração do portal e organização do catálogo de oportunidades, o *PrudenEmpregos* permite o gerenciamento das categorias e áreas de atuação profissional (tais como Administrativo, Comércio, Tecnologia, Saúde, Logística, Engenharia e Primeiro Emprego), bem como o gerenciamento dos planos e pacotes de créditos pré-pagos oferecidos na plataforma. O sistema também realiza o gerenciamento integral das vagas de emprego disponibilizadas pelas empresas, contemplando título do cargo, descrição detalhada das atribuições, requisitos obrigatórios e desejáveis, modalidade de trabalho (presencial, híbrido ou remoto), regime de contratação (CLT, Estágio, Jovem Aprendiz, PJ ou Temporário), faixa salarial ou remuneração a combinar, benefícios ofertados, nível de experiência exigido, quantidade de vagas abertas e prazo de vigência do anúncio.

Para viabilizar as transações de negócio cotidianas do ecossistema de empregabilidade, o sistema *PrudenEmpregos* executa a movimentação de publicação e impulsionamento (destaque no topo) de vagas de emprego por parte das empresas anunciantes, realizando a validação e o débito automático do saldo de créditos da organização recrutadora. Na ponta do profissional em busca de colocação, o software processa o registro de candidaturas às vagas abertas, vinculando o currículo atualizado do candidato à oportunidade desejada, debitando a cota correspondente de créditos (ou utilizando o bônus gratuito de boas-vindas concedido no primeiro cadastro) e encaminhando os dados diretamente ao painel de seleção da empresa responsável.

Adicionalmente, o software realiza o processamento da geração de Currículos Profissionais em formato PDF compatível com sistemas de rastreamento de candidatos (padrão ATS), estruturando automaticamente as qualificações do usuário em modelos visuais corporativos prontos para impressão ou envio digital, aplicando regras de proteção de dados pessoais (LGPD) que ocultam informações sensíveis como número de CPF e logradouro completo quando não autorizados explicitamente. O sistema também processa a análise automatizada de compatibilidade (*Match* Profissional de 0% a 100%) entre o perfil do candidato e os requisitos da vaga pretendida, além de executar a transação de aquisição e recarga de pacotes de créditos e assinaturas por meio de pagamentos eletrônicos instantâneos (Pix com QR Code e código Copia e Cola) e cartão de crédito, liberando o saldo adquirido imediatamente após a confirmação financeira.

Durante o ciclo de recrutamento e seleção, o software permite que a empresa anunciante realize a movimentação e atualização do status das candidaturas recebidas (classificando os participantes em etapas como Novo, Em Análise, Entrevista, Aprovado ou Recusado) e acione o contato rápido com o candidato selecionado via integração externa de mensagens instantâneas. Para apoiar a tomada de decisão dos usuários e gestores, o sistema disponibiliza consultas dinâmicas e relatórios gerenciais com cruzamento de informações, incluindo a consulta pública de vagas com filtros combinados (por palavra-chave, cidade da região de Presidente Prudente, área profissional, modalidade, tipo de contrato, exigência de CNH/veículo e faixa salarial), o relatório de candidatos inscritos por vaga ordenado pelo índice de aderência (*Match*), o extrato detalhado de consumo e recarga de créditos por período, o relatório de currículos gerados pelo candidato e o painel estatístico consolidado de indicadores da plataforma para a administração.

Quanto às delimitações de escopo (requisitos inversos — o que o software **não** fará), o sistema *PrudenEmpregos* **não** realizará o processamento de folha de pagamento, cálculo de encargos trabalhistas, recolhimento de FGTS/INSS ou envio de eventos ao eSocial; **não** efetuará a assinatura jurídica de contratos de trabalho ou termos de estágio; **não** realizará exames admissionais ou testes psicotécnicos clínicos; e **não** atuará como instituição bancária custodiante, delegando a liquidação financeira das transações de pagamento ao gateway externo homologado.

A aplicação do software *PrudenEmpregos* proporciona benefícios diretos e mensuráveis para todo o arranjo produtivo local de Presidente Prudente e região:
1. **Para os candidatos:** elimina o custo e o deslocamento físico para entrega de currículos impressos no comércio e na indústria local, oferece bônus inicial de créditos gratuitos para candidaturas imediatas, eleva a qualidade da apresentação profissional por meio do gerador de currículo padrão ATS e indica com transparência os pontos fortes e lacunas de competência frente a cada vaga;
2. **Para as empresas recrutadoras:** reduz drasticamente o tempo de fechamento de vagas e o custo operacional de triagem, garante segurança jurídica e confiabilidade ao restringir anúncios a empresas com CNPJ ativo verificado, organiza todos os concorrentes em um funil visual classificado por compatibilidade técnica e agiliza o agendamento de entrevistas;
3. **Para o processo de negócio regional:** centraliza a oferta e a demanda de mão de obra qualificada e de primeiro emprego do Oeste Paulista em um ambiente digital auditável, seguro, em conformidade com a Lei Geral de Proteção de Dados (LGPD) e acessível 24 horas por dia em dispositivos móveis e computadores.

---

### 1.3. Definições, Siglas e Abreviações

Para a correta interpretação desta Especificação de Requisitos de Software (ERS), aplicam-se as seguintes definições, siglas e abreviações:

* **ATS (*Applicant Tracking System*):** Sistema de Rastreamento de Candidatos utilizado por setores de Recursos Humanos para leitura e filtragem automatizada de currículos estruturados.
* **Backup:** Cópia de segurança dos dados armazenados pelo sistema para fins de recuperação em caso de falhas.
* **Bônus de Boas-Vindas:** Cota inicial gratuita de 30 (trinta) créditos concedida automaticamente pelo sistema a cada novo usuário (candidato ou empresa) no ato do seu primeiro cadastro.
* **CEP:** Código de Endereçamento Postal mantido pelos Correios, utilizado pelo sistema para preenchimento automatizado de logradouro, bairro, município e unidade federativa.
* **CLT:** Consolidação das Leis do Trabalho, regime de contratação formal com vínculo empregatício.
* **CNH:** Carteira Nacional de Habilitação (categorias A, B, AB, C, D ou E).
* **CNPJ:** Cadastro Nacional da Pessoa Jurídica, documento de 14 dígitos obrigatório para validação de empresas recrutadoras na Receita Federal.
* **CPF:** Cadastro de Pessoas Físicas, documento de 11 dígitos utilizado para identificação única de candidatos.
* **CRUD (*Create, Read, Update, Delete*):** Conjunto das quatro operações básicas de persistência de dados (Incluir, Consultar/Pesquisar, Alterar e Excluir), denominado nesta ERS como *Gerenciar* ou *Manter*.
* **ERS / SRS (*Software Requirements Specification*):** Especificação de Requisitos de Software elaborada segundo a norma IEEE Std 830/1998.
* **LGPD:** Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018), que regulamenta o tratamento e a privacidade de dados pessoais de candidatos e representantes empresariais.
* **Match Profissional:** Índice percentual (de 0% a 100%) calculado pelo sistema a partir do cruzamento entre as competências, experiência, localização e formação do candidato em relação aos requisitos exigidos pela vaga.
* **PCD:** Pessoa com Deficiência.
* **PDF (*Portable Document Format*):** Formato portátil de documento eletrônico utilizado na exportação de currículos com texto selecionável.
* **Pix (EMV BRCode):** Meio de pagamento eletrônico instantâneo instituído pelo Banco Central do Brasil, operado via leitura de QR Code ou código Copia e Cola.
* **RF_B:** Identificador de Requisito Funcional classificado como Função Básica (operações cadastrais CRUD).
* **RF_F:** Identificador de Requisito Funcional classificado como Função Fundamental (transações e movimentações de negócio).
* **RF_S:** Identificador de Requisito Funcional classificado como Função de Saída (consultas parametrizadas, relatórios e gráficos com cruzamento de informações).

---

### 1.4. Referências

A tabela a seguir relaciona os documentos normativos, legais e técnicos referenciados na elaboração desta ERS:

| Nº | Título do Documento | Data de Aquisição | Responsável pelo Fornecimento |
| :--- | :--- | :--- | :--- |
| **1** | Norma IEEE Std 830-1998 — *Recommended Practice for Software Requirements Specifications* | 29/10/2026 | Prof. Dione Ferrari / Prof. Álvaro d'Arce (Fatec Presidente Prudente — IES-100) |
| **2** | Lei Federal nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD) | 29/10/2026 | Administração do Portal PrudenEmpregos (Jurídico / Compliance) |
| **3** | Documentação Oficial de Integração — API de Pagamentos e Checkout Mercado Pago | 29/10/2026 | Equipe de Engenharia e Pagamentos PrudenEmpregos |
| **4** | Especificação de Consulta Pública de CNPJ (Receita Federal / BrasilAPI) e CEP (ViaCEP) | 29/10/2026 | Equipe de Arquitetura de Sistemas PrudenEmpregos |
| **5** | Diretrizes de Acessibilidade para Conteúdo Web — WCAG 2.2 (W3C) | 29/10/2026 | Equipe de UX/UI e Qualidade de Software |

---

### 1.5. Visão Geral

Esta Especificação de Requisitos de Software (ERS) está organizada em capítulos conforme o padrão IEEE Std 830/1998. O **Capítulo 1** apresenta a introdução do documento, delineando seu objetivo, o escopo completo do sistema *PrudenEmpregos*, o glossário de definições, siglas e abreviações, as referências bibliográficas e documentais e esta visão geral.

O **Capítulo 2** fornece uma descrição geral do produto de software, abordando a perspectiva do produto e suas interfaces de sistema, usuário, hardware, software, comunicação, limites de memória e operações (Seção 2.1), a relação completa das funções do produto classificadas em Funções Básicas (`RF_B`), Funções Fundamentais (`RF_F`) e Funções de Saída (`RF_S`) com seus respectivos itens de entrada, saída e regras de negócio (Seção 2.2), as características educacionais e de experiência dos usuários (Seção 2.3), as restrições, suposições e dependências do projeto (Seção 2.4) e os requisitos adiados para versões futuras (Seção 2.5).

O **Capítulo 3** detalha os requisitos específicos funcionais, de interfaces externas, de desempenho, atributos de qualidade (segurança, portabilidade, manutenibilidade e confiabilidade) e matriz de rastreabilidade para orientar os projetistas e desenvolvedores na construção e manutenção do software.

---

## 2. DESCRIÇÃO GERAL DO PRODUTO

### 2.1. Perspectiva do Produto

O sistema *PrudenEmpregos* é um produto de software autônomo orientado para ambiente Web responsivo (acessível em computadores desktop, notebooks, tablets e smartphones), concebido para substituir processos manuais e descentralizados de divulgação de vagas e entrega de currículos em Presidente Prudente e região. O produto interage com serviços governamentais e financeiros externos por meio de interfaces padronizadas, sendo suas características gerais de operação e ambiente resumidas a seguir:

* **Interfaces do Sistema:** O software interage com quatro sistemas externos principais:
  1. *Gateway de Pagamentos Mercado Pago*, para geração de cobranças Pix (QR Code e Copia e Cola), processamento de cartões de crédito e confirmação automática de pedidos via *webhooks*;
  2. *Base de Consulta de CNPJ da Receita Federal (BrasilAPI)*, para validação da existência e situação cadastral ativa de empresas anunciantes;
  3. *Serviços de Endereçamento Postal (BrasilAPI / ViaCEP)*, para preenchimento automático de endereço a partir do CEP informado;
  4. *Provedor de Autenticação Federada Google OAuth 2.0* e *API pública do WhatsApp*, para login social com um clique e comunicação rápida entre recrutadores e candidatos.
* **Interfaces do Usuário:** A interface gráfica segue o padrão visual corporativo em tons de azul e alto contraste (conformidade WCAG 2.2 AA), oferecendo controle de escala tipográfica (100%, 112% e 125%), telas responsivas e acesso segmentado por quatro níveis de perfil de usuário:
  1. *Visitante Público* (consulta ao mural de vagas, filtros de pesquisa e visualização de planos);
  2. *Candidato — Pessoa Física* (painel de candidaturas, edição de currículo, simulador de competências, gerador de PDF ATS e carteira de créditos);
  3. *Empresa Recrutadora — Pessoa Jurídica* (publicação e destaque de vagas, funil de avaliação de candidatos com filtro de recrutamento às cegas e aquisição de créditos);
  4. *Administrador do Sistema* (moderação global de usuários, vagas, transações financeiras e métricas operacionais).
* **Interfaces de Hardware:** O sistema opera sobre servidores em nuvem e, no lado do cliente, requer apenas um dispositivo de computação pessoal (computador ou smartphone) equipado com placa de rede (conexão Wi-Fi, 4G/5G ou Ethernet), monitor/tela com resolução mínima de 360px de largura, teclado/tela sensível ao toque e, opcionalmente, microfone para utilização do recurso de preenchimento de currículo guiado por voz.
* **Interfaces de Software:**
  * *No Servidor / Nuvem:* Sistema Operacional Linux, ambiente de execução Node.js e Sistema Gerenciador de Banco de Dados NoSQL orientado a documentos (Google Cloud Firestore) para persistência transacional em tempo real.
  * *No Cliente:* Sistema Operacional Windows, macOS, Linux, Android ou iOS, utilizando navegador Web moderno compatível com HTML5, CSS3 e ECMAScript 2020+ (Google Chrome, Mozilla Firefox, Microsoft Edge ou Apple Safari), além de leitor de arquivos PDF nativo do navegador para visualização dos currículos exportados.
* **Interfaces de Comunicação:** A comunicação entre os clientes Web e o servidor de aplicação/banco de dados ocorre exclusivamente sobre protocolo seguro **HTTPS (TLS 1.2 / TLS 1.3)** em arquitetura multicamadas, utilizando requisições REST com carga útil no formato JSON e canais de sincronização em tempo real via WebSockets / Long-Polling.
* **Limites de Memória:**
  * *Estação Cliente:* Mínimo de 2 GB de memória RAM primária e 100 MB de espaço livre em armazenamento secundário para cache temporário do navegador.
  * *Servidor de Aplicação:* Mínimo de 512 MB de memória RAM primária alocada ao processo de execução e 1 GB de armazenamento secundário para artefatos de compilação e registros operacionais.
* **Operações:**
  * *Inicialização e Controle de Acesso:* O sistema realiza autenticação por E-mail e Senha (com derivação criptográfica PBKDF2-HMAC-SHA256 de 100.000 iterações e bloqueio temporário contra força bruta após 5 tentativas inválidas) ou login federado com o Google, atribuindo automaticamente o nível de acesso correspondente ao perfil (`candidate`, `company` ou `admin`).
  * *Processamento Transacional:* Todas as operações que envolvem movimentação de saldo de créditos ou verificação de unicidade de CPF/CNPJ são executadas de maneira atômica e idempotente no banco de dados, impedindo duplicidades ou saldos negativos.
  * *Backup e Restauração:* O banco de dados em nuvem mantém replicação automática multi-zona e rotinas diárias de cópia de segurança (*backup*) e exportação de dados, permitindo a restauração íntegra das coleções em caso de incidente operacional.
* **Requisitos para Adaptação de Situação:** Na inicialização em um novo ambiente ou domínio de publicação Web, o software verifica automaticamente a existência da estrutura inicial de vagas demonstrativas regionais de Presidente Prudente e sincroniza os parâmetros de configuração do projeto em nuvem sem necessidade de intervenção manual do usuário final.

---

### 2.2. Funções do Produto

Em conformidade com o padrão IEEE Std 830/1998, todas as funções do sistema *PrudenEmpregos* coincidem rigorosamente com o Escopo definido na Seção 1.2 e estão classificadas em **Funções Básicas (`RF_B`)**, **Funções Fundamentais (`RF_F`)** e **Funções de Saída (`RF_S`)**. *(Nota: As funções de autenticação/gerenciamento de sessão de acesso, backup e restauração já foram descritas na Seção 2.1 — Perspectiva do Produto).*

#### 2.2.1. Funções Básicas (Operações Cadastrais CRUD — *Gerenciar / Manter*)

* **RF_B01: Gerenciar Candidatos.** Permite que perfis de candidatos (pessoas físicas) sejam incluídos, pesquisados, alterados e excluídos no sistema.
  * **Itens de entrada:** nome completo, e-mail, senha de acesso, CPF, telefone/WhatsApp, CEP, logradouro, número, bairro, cidade, estado (UF), cargo desejado, nível de experiência (Estágio, Júnior, Pleno, Sênior ou Especialista), resumo profissional, lista de habilidades técnicas, experiências profissionais anteriores (empresa, cargo, período e descrição), formação acadêmica (instituição, curso, grau e ano de conclusão), categoria de CNH, posse de veículo próprio, disponibilidade para viagem e pretensão salarial.
  * **Itens de saída:** confirmação de cadastro/atualização do perfil do candidato, percentual de preenchimento do perfil e saldo atual de créditos.
  * **Regras de negócio:** O sistema permite o cadastro rápido informando apenas e-mail e senha (ou conta Google), podendo o candidato complementar os demais dados posteriormente; caso o CPF seja informado, deve possuir 11 dígitos matematicamente válidos e ser único em toda a plataforma; ao concluir o primeiro cadastro, o candidato recebe automaticamente um bônus de boas-vindas de 30 créditos gratuitos.

* **RF_B02: Manter Empresas Recrutadoras.** Permite que cadastros de empresas anunciantes (pessoas jurídicas) sejam incluídos, pesquisados, alterados e excluídos.
  * **Itens de entrada:** CNPJ, razão social, nome fantasia, e-mail corporativo, senha de acesso, telefone comercial/WhatsApp, CEP, logradouro, número, bairro, município, estado (UF), descrição institucional da empresa, setor de atuação e endereço do site corporativo.
  * **Itens de saída:** dados empresariais validados, situação cadastral na Receita Federal, selo de empresa verificada e saldo de créditos corporativos.
  * **Regras de negócio:** Na modalidade de cadastro empresarial completo, o CNPJ informado (14 dígitos) deve ser validado quanto aos dígitos verificadores, ser único na plataforma e constar com situação cadastral **"ATIVA"** na consulta à Receita Federal (empresas baixadas, inaptas ou suspensas têm o cadastro bloqueado); a empresa recebe 30 créditos gratuitos de boas-vindas no primeiro cadastro.

* **RF_B03: Gerenciar Vagas de Emprego.** Permite que oportunidades de emprego sejam incluídas, pesquisadas, alteradas, pausadas/encerradas e excluídas pelas empresas recrutadoras e pela administração.
  * **Itens de entrada:** título do cargo, nome da empresa anunciante, área/categoria profissional, modalidade de trabalho (Presencial, Híbrido ou Remoto), tipo de contrato (CLT, Estágio, Jovem Aprendiz, PJ ou Temporário), nível de experiência exigido, descrição detalhada das atividades, lista de competências/habilidades requeridas, valor de remuneração (salário fixo, faixa salarial ou salário a combinar), benefícios oferecidos, exigência de CNH, exigência de veículo próprio, cidade/UF da vaga e indicador de vaga inclusiva (50+, Primeiro Emprego ou Horário Flexível).
  * **Itens de saída:** registro da vaga publicada no mural regional, código identificador da vaga, data de publicação, data de expiração do anúncio e status da vaga (Ativa, Pausada ou Encerrada).
  * **Regras de negócio:** Apenas usuários com perfil de Empresa ou Administrador podem cadastrar vagas; toda vaga salarial informada em valor numérico deve ser formatada no padrão monetário brasileiro (`R$ BRL`) ou exibir "Salário a combinar" quando não informada.

* **RF_B04: Manter Categorias e Áreas Profissionais.** Permite que as áreas de atuação e filtros rápidos de empregabilidade do portal (como Administrativo, Comércio, Tecnologia, Primeiro Emprego, Logística e Saúde) sejam incluídos, pesquisados, alterados e excluídos.
  * **Itens de entrada:** nome da categoria profissional, descrição da área, palavras-chave associadas e status de exibição no mural rápido.
  * **Itens de saída:** relação atualizada de categorias disponíveis para classificação de vagas e filtragem pelos candidatos.
  * **Regras de negócio:** Uma categoria vinculada a vagas ativas não pode ser excluída sem a prévia reclassificação das respectivas vagas.

* **RF_B05: Gerenciar Pacotes de Créditos e Planos.** Permite manter o catálogo oficial de pacotes de créditos avulsos e planos de assinatura comercializados no portal.
  * **Itens de entrada:** título do pacote/plano, quantidade base de créditos, créditos de bônus promocional, preço em reais (R$), público-alvo recomendado (Candidato ou Empresa), descrição de benefícios e selo de destaque ("Mais Popular / Melhor Custo-Benefício").
  * **Itens de saída:** tabela comercial de pacotes ativa para contratação (ex.: Pacote Essencial +10 créditos por R$ 29,90; Pacote Crescimento Pro +35 créditos por R$ 69,90; Pacote Empresarial +100 créditos por R$ 149,90).
  * **Regras de negócio:** Os preços e quantidades de créditos aplicados no checkout são validados exclusivamente a partir do catálogo autoritativo do servidor, impedindo adulteração de valores pelo navegador do cliente.

---

#### 2.2.2. Funções Fundamentais (Transações e Movimentações de Negócio)

* **RF_F01: Candidatura a Vaga de Emprego.** O sistema realiza o registro da inscrição de um candidato em uma vaga de emprego aberta, vinculando seu currículo ao processo seletivo da empresa anunciante e atualizando automaticamente o saldo de créditos do candidato.
  * **Itens de entrada:** identificação do candidato autenticado, identificação da vaga selecionada, dados curriculares do candidato e mensagem/carta de apresentação opcional.
  * **Itens de saída:** comprovante de candidatura registrada, data/hora da inscrição, status inicial da candidatura ("Novo"), pontuação de compatibilidade (*Match*) calculada e novo saldo de créditos do candidato.
  * **Regras de negócio:** Cada candidatura consome **10 (dez) créditos** do saldo do candidato; o sistema impede candidaturas duplicadas do mesmo profissional para a mesma vaga; caso um visitante deslogado acione o botão "Candidatar-se agora", o sistema preserva a vaga selecionada em memória temporária, abre o modal de autenticação/cadastro e, imediatamente após o login, reabre a vaga para conclusão da inscrição com um clique.

* **RF_F02: Publicação e Impulsionamento (Destaque) de Vaga.** O sistema processa a ativação de um novo anúncio de vaga ou o seu impulsionamento para o topo do mural regional mediante validação e débito de créditos da empresa anunciante.
  * **Itens de entrada:** dados da vaga a ser publicada ou identificação da vaga já existente para destaque, identificação da empresa anunciante e opção de impulsionamento selecionada.
  * **Itens de saída:** vaga publicada/destacada com selo visual "Vaga Destacada", registro da transação de consumo no extrato e saldo atualizado de créditos da empresa.
  * **Regras de negócio:** A publicação padrão de uma vaga debita **10 (dez) créditos** da conta da empresa; a aplicação de destaque no topo do mural (*Boost*) debita **15 (quinze) créditos** adicionais; caso o saldo seja inferior ao custo da operação, o sistema bloqueia a transação e direciona o usuário para a recarga de créditos.

* **RF_F03: Compra e Liquidação de Créditos / Assinaturas (Pagamento Mercado Pago).** O sistema realiza a venda de pacotes de créditos e assinaturas empresariais via Pix (QR Code e Copia e Cola) ou Cartão de Crédito (Checkout Pro), creditando automaticamente o saldo na conta do comprador após a aprovação do pagamento.
  * **Itens de entrada:** pacote de créditos ou plano selecionado, modalidade de pagamento escolhida (Pix Instantâneo ou Cartão de Crédito), identificação do usuário comprador, nome e e-mail do pagador.
  * **Itens de saída:** número do pedido gerado, imagem do QR Code Pix em alta definição, código Pix Copia e Cola (padrão EMVCo BRCode com CRC16 válido), link de Checkout seguro do Mercado Pago, comprovante de aprovação, quantidade de créditos adicionada e novo saldo total do usuário.
  * **Regras de negócio:** O processamento de aprovação financeira é estritamente **idempotente** (um mesmo pedido ou notificação de pagamento jamais credita o saldo mais de uma vez); o pedido inicia com status "Pendente" e, ao mudar para "Aprovado", gera um lançamento imutável de entrada no livro-razão de transações de créditos.

* **RF_F04: Geração de Currículo Profissional em PDF Padrão ATS.** O sistema realiza a montagem, diagramação e exportação do currículo completo do candidato em arquivo PDF com texto selecionável otimizado para algoritmos de recrutamento (ATS), debitando os créditos correspondentes.
  * **Itens de entrada:** dados do perfil do candidato (nome, contato, cidade/UF, resumo profissional, experiências, formação acadêmica e habilidades), modelo visual escolhido (Clássico Executivo, Moderno Tecnológico ou Compacto Objetivo) e opção de autorização de exibição do CPF no documento.
  * **Itens de saída:** arquivo PDF 1.4 autêntico gerado para download imediato, registro no histórico de currículos gerados e saldo de créditos atualizado.
  * **Regras de negócio:** Cada geração de currículo debita **15 (quinze) créditos** da carteira do candidato (com chave de idempotência para evitar cobrança dupla em cliques repetidos); por conformidade com a LGPD, o endereço residencial completo (rua/número/CEP) e a pretensão salarial são omitidos do PDF público, e o CPF só é impresso se o titular marcar expressamente a opção de inclusão.

* **RF_F05: Avaliação de Compatibilidade (*Match* Profissional) e Otimização Curricular.** O sistema calcula automaticamente o percentual de aderência entre o perfil do candidato e os requisitos da vaga, bem como estrutura sugestões de aprimoramento de resumo profissional e descrição de vagas.
  * **Itens de entrada:** conjunto de habilidades, nível de experiência, localização e modalidade do candidato confrontados com os requisitos da vaga selecionada (ou rascunho de resumo/vaga informado pelo usuário).
  * **Itens de saída:** índice percentual global de *Match* (0% a 100%), detalhamento por dimensão (competências técnicas, nível de experiência, localização e modelo de trabalho), lista de pontos fortes atendidos, competências a desenvolver e texto profissional estruturado.
  * **Regras de negócio:** O cálculo pondera o cruzamento exato e semântico de competências (peso principal), senioridade e proximidade geográfica na região de Presidente Prudente, apresentando o resultado com enquadramento positivo para orientar a qualificação do candidato.

* **RF_F06: Triagem e Movimentação de Etapa do Processo Seletivo.** Permite que a empresa anunciante avalie os candidatos inscritos em suas vagas, altere a etapa de cada participante no funil de seleção e acione o contato para agendamento de entrevista.
  * **Itens de entrada:** identificação da candidatura, novo status de seleção escolhido ("Novo", "Em Análise", "Entrevista", "Aprovado" ou "Recusado"), modo de visualização (padrão ou "Recrutamento às Cegas") e acionamento de mensagem de contato.
  * **Itens de saída:** status atualizado da candidatura visível em tempo real para a empresa e para o candidato, e link parametrizado de comunicação direta via WhatsApp com mensagem pré-formatada sobre a vaga.
  * **Regras de negócio:** Somente a empresa proprietária da vaga (ou o Administrador) pode alterar o status das candidaturas daquela vaga; quando o modo de "Recrutamento às Cegas" (*Blind Hiring*) é ativado pelo recrutador, o sistema oculta temporariamente nome, foto, idade e ano de graduação dos candidatos para eliminar vieses inconscientes durante a triagem técnica.

---

#### 2.2.3. Funções de Saída (Consultas, Relatórios e Gráficos com Cruzamento de Dados)

* **RF_S01: Consulta Pública e Filtragem Avançada do Mural de Vagas.** Apresenta a listagem cruzada de oportunidades de emprego abertas em Presidente Prudente e região.
  * **Itens de entrada (Filtros):** termo textual livre (cargo, empresa ou habilidade), cidade da região, categoria/área profissional, modalidade de trabalho (Presencial, Híbrido, Remoto), tipo de contrato (CLT, Estágio, Jovem Aprendiz, PJ), nível de experiência, exigência de CNH, exigência de veículo próprio, apenas vagas com salário informado e critério de ordenação (Mais recentes ou Maior salário).
  * **Itens de saída:** cartões e janelas detalhadas das vagas correspondentes (priorizando as vagas destacadas no topo), exibindo título, empresa, localização, modalidade, regime de contratação, remuneração formatada em Reais (`R$`) e botão de compartilhamento rápido via WhatsApp.

* **RF_S02: Relatório de Candidatos Inscritos por Vaga e Ranking de *Match*.** Gera para a empresa recrutadora a relação analítica de profissionais que se candidataram às suas vagas, cruzando os dados curriculares com os requisitos de cada oportunidade.
  * **Itens de entrada (Filtros):** vaga específica selecionada, status da candidatura no funil seletivo, filtro de recrutamento às cegas ativo/inativo e ordenação por percentual de compatibilidade (*Match*).
  * **Itens de saída:** listagem classificada dos candidatos contendo nome (ou código anônimo no modo às cegas), cidade, resumo de experiência, percentual de *Match* (0% a 100%), competências em comum, data da inscrição, etapa atual do processo seletivo e atalho de contato direto.

* **RF_S03: Extrato Financeiro de Pedidos e Movimentação de Créditos.** Informa ao usuário (candidato ou empresa) todo o histórico cronológico de entradas (bônus e compras) e saídas (consumo em candidaturas, vagas, destaques e currículos) de créditos.
  * **Itens de entrada (Filtros):** identificador do usuário autenticado, tipo de lançamento (Bônus, Compra aprovada ou Uso/Consumo) e período de datas.
  * **Itens de saída:** data e hora da operação, descrição detalhada do evento, código do pedido/referência, quantidade de créditos movimentada (`+` ou `-`), saldo remanescente após a operação e status dos pedidos financeiros no Mercado Pago.

* **RF_S04: Relatório de Acompanhamento de Candidaturas e Histórico de Currículos do Candidato.** Apresenta ao profissional todas as vagas às quais se candidatou e o repositório de currículos PDF gerados em sua conta.
  * **Itens de entrada (Filtros):** candidato autenticado e status da candidatura.
  * **Itens de saída:** relação de vagas aplicadas com empresa, cidade, data da inscrição e etapa atual informada pelo recrutador ("Novo", "Em Análise", "Entrevista", "Aprovado" ou "Recusado"), acompanhada da lista de arquivos PDF de currículos gerados com modelo utilizado, data de emissão e link para re-download gratuito.

* **RF_S05: Painel Gerencial e Estatístico da Administração.** Gera visões consolidadas e cruzamento de indicadores operacionais de todo o portal para o Administrador do sistema.
  * **Itens de entrada (Filtros):** busca por nome/e-mail/documento de usuário, tipo de perfil (Candidato, Empresa ou Admin), status de vaga e período de análise.
  * **Itens de saída:** totalizadores e listagens auditáveis de usuários cadastrados, empresas verificadas, vagas ativas e destacadas, total de candidaturas realizadas, volume financeiro de pedidos de créditos aprovados e distribuição de vagas por categoria profissional em Presidente Prudente e região.

---

### 2.3. Características do Usuário

O sistema *PrudenEmpregos* é utilizado por quatro perfis distintos de usuários, cujas características de escolaridade, experiência profissional e domínio de informática determinam o projeto de usabilidade da plataforma:

1. **Candidatos (Pessoas Físicas):** Possuem nível educacional variado, abrangendo desde estudantes do ensino médio e técnico em busca do primeiro emprego ou estágio até profissionais com ensino superior completo e pós-graduação. Apresentam conhecimento básico a intermediário em informática e forte hábito de navegação por smartphones e aplicativos de mensagens. Por essa razão, a interface do sistema deve ser autoexplicativa, contar com preenchimento guiado, ajuste de tamanho de fonte e exigir zero treinamento formal prévio.
2. **Recrutadores e Gestores de Empresas (Pessoas Jurídicas):** Profissionais de Recursos Humanos, proprietários de estabelecimentos comerciais e gestores administrativos de Presidente Prudente e região. Possuem, em geral, ensino médio técnico ou ensino superior completo e bom conhecimento em informática básica, navegação Web e rotinas administrativas. Necessitam de painéis objetivos que permitam publicar vagas e avaliar candidatos em poucos minutos, sem necessidade de treinamento técnico especializado.
3. **Visitantes Públicos:** Cidadãos em geral que acessam o portal para consultar vagas abertas ou compartilhar oportunidades em redes sociais, possuindo conhecimento elementar de navegação na Internet.
4. **Administradores do Sistema:** Profissionais com formação técnica ou superior na área de Tecnologia da Informação / Análise e Desenvolvimento de Sistemas, possuindo conhecimento avançado em informática, segurança da informação, banco de dados e regras de negócio do portal.

---

### 2.4. Restrições, Suposições e Dependências

#### 2.4.1. Restrições
* **Conformidade Legal (LGPD):** O sistema deve restringir a exposição pública de dados pessoais sensíveis ou identificadores civis (como número de CPF e endereço residencial completo dos candidatos), utilizando-os exclusivamente para validação interna de unicidade e prevenção a fraudes.
* **Validação Cadastral de Empresas:** Na modalidade de cadastro empresarial completo com documento, o sistema está restrito a aceitar apenas números de CNPJ matematicamente válidos e que não constem como baixados, inaptos ou suspensos na Receita Federal.
* **Segurança Criptográfica e Controle de Acesso:** Senhas de usuários nunca podem ser armazenadas em texto puro, exigindo derivação criptográfica irreversível (PBKDF2-HMAC-SHA256 com sal exclusivo), e todas as rotas e regras de banco de dados devem validar a titularidade do usuário autenticado.
* **Padrão Monetário e Idioma:** Toda a interface, mensagens de erro, relatórios e valores financeiros devem operar obrigatoriamente em língua portuguesa (pt-BR) e moeda Real Brasileiro (`R$ BRL`).

#### 2.4.2. Suposições
* Supõe-se que os candidatos e recrutadores disponham de um dispositivo (smartphone ou computador) com acesso ativo à Internet e um navegador Web atualizado.
* Supõe-se que os candidatos e empresas que realizarem recarga de créditos via Pix possuam aplicativo bancário habilitado para leitura de QR Code ou utilização do código Pix Copia e Cola.

#### 2.4.3. Dependências
* O preenchimento automático de razão social, nome fantasia e situação cadastral a partir do CNPJ, bem como o autopreenchimento de logradouro por CEP, dependem da disponibilidade das APIs públicas de consulta governamental/postal (BrasilAPI e ViaCEP). Caso esses serviços externos apresentem indisponibilidade temporária de rede, o desempenho do sistema depende da contingência local implementada, que permite o preenchimento manual assistido dos campos de endereço e validação algorítmica dos dígitos verificadores.
* A liquidação automática de pagamentos por cartão de crédito e Pix depende da comunicação HTTPS com a API do gateway Mercado Pago.

---

### 2.5. Requisitos Adiados

Dentre os requisitos vislumbrados para a evolução do ecossistema *PrudenEmpregos*, ficam adiados para versões futuras do sistema devido a questões de cronograma e priorização do escopo principal:

* **Aplicativo Móvel Nativo (Android / iOS nas lojas Google Play e App Store):** Será implementado em versão futura, visto que a versão Web responsiva atual já atende integralmente ao acesso por smartphones.
* **Módulo de Videoentrevista Ao Vivo Integrada:** A realização de chamadas de vídeo dentro do próprio navegador entre recrutador e candidato será implementada em versão futura, utilizando-se na versão atual o redirecionamento integrado para agendamento via WhatsApp e e-mail.
* **Integração com Sistemas de Folha de Pagamento e eSocial (ERP):** A exportação automatizada dos dados do candidato aprovado para softwares contábeis de admissão será contemplada em versões futuras do produto.

---

## 3. REQUISITOS ESPECÍFICOS (SÍNTESE DE QUALIDADE, DESEMPENHO E ATRIBUTOS — IEEE 830)

Para garantir que a ERS seja **correta, não ambígua, completa, consistente, classificada por importância/estabilidade, verificável, modificável e rastreável** (conforme diretrizes das páginas 8 a 11 do material IES-100):

### 3.1. Requisitos Não Funcionais e de Desempenho (Verificáveis e Mensuráveis)
* **RNF_01 (Tempo de Resposta de Consultas):** A listagem e a filtragem de vagas no mural principal (`RF_S01`) devem apresentar os resultados em tela em tempo inferior a **2,0 segundos** para até 1.000 vagas ativas sob conexão banda larga ou 4G padrão. *(Grau de necessidade: Essencial | Estabilidade: Alta)*
* **RNF_02 (Tempo de Geração do Currículo PDF):** A geração e disponibilização para download do currículo em PDF padrão ATS (`RF_F04`) deve ser concluída em no máximo **3,0 segundos** após a confirmação do candidato. *(Grau de necessidade: Essencial | Estabilidade: Alta)*
* **RNF_03 (Disponibilidade):** O portal Web e o banco de dados em nuvem devem operar em regime 24x7 com índice de disponibilidade mínima de **99,5%** ao mês. *(Grau de necessidade: Essencial | Estabilidade: Alta)*
* **RNF_04 (Segurança contra Força Bruta):** O mecanismo de login (`Perspectiva do Produto — Operações`) deve bloquear temporariamente por **15 minutos** novas tentativas de autenticação para um mesmo endereço de e-mail após **5 (cinco) tentativas consecutivas** com senha incorreta. *(Grau de necessidade: Essencial | Estabilidade: Alta)*
* **RNF_05 (Portabilidade e Responsividade):** Todas as telas públicas e privadas do sistema devem adaptar-se sem barra de rolagem horizontal em resoluções de largura entre **360px (smartphones)** e **1920px (monitores Full HD)**. *(Grau de necessidade: Essencial | Estabilidade: Alta)*

### 3.2. Matriz de Rastreabilidade e Grau de Necessidade (IEEE 830)

| Código | Nome da Função / Requisito | Classificação IEEE 830 | Grau de Necessidade | Seção do Escopo Relacionada |
| :--- | :--- | :--- | :--- | :--- |
| **RF_B01** | Gerenciar Candidatos | Função Básica (CRUD) | Essencial | Seção 1.2 (2º Parágrafo) |
| **RF_B02** | Manter Empresas Recrutadoras | Função Básica (CRUD) | Essencial | Seção 1.2 (2º Parágrafo) |
| **RF_B03** | Gerenciar Vagas de Emprego | Função Básica (CRUD) | Essencial | Seção 1.2 (3º Parágrafo) |
| **RF_B04** | Manter Categorias Profissionais | Função Básica (CRUD) | Condicional | Seção 1.2 (3º Parágrafo) |
| **RF_B05** | Gerenciar Pacotes de Créditos e Planos | Função Básica (CRUD) | Essencial | Seção 1.2 (3º Parágrafo) |
| **RF_F01** | Candidatura a Vaga de Emprego | Função Fundamental | Essencial | Seção 1.2 (4º Parágrafo) |
| **RF_F02** | Publicação e Impulsionamento de Vaga | Função Fundamental | Essencial | Seção 1.2 (4º Parágrafo) |
| **RF_F03** | Compra e Liquidação de Créditos (Pix/Cartão) | Função Fundamental | Essencial | Seção 1.2 (5º Parágrafo) |
| **RF_F04** | Geração de Currículo em PDF Padrão ATS | Função Fundamental | Essencial | Seção 1.2 (5º Parágrafo) |
| **RF_F05** | Avaliação de Compatibilidade (*Match*) | Função Fundamental | Condicional | Seção 1.2 (5º Parágrafo) |
| **RF_F06** | Triagem e Movimentação do Processo Seletivo | Função Fundamental | Essencial | Seção 1.2 (6º Parágrafo) |
| **RF_S01** | Consulta Pública e Filtragem de Vagas | Função de Saída | Essencial | Seção 1.2 (6º Parágrafo) |
| **RF_S02** | Relatório de Candidatos por Vaga e *Match* | Função de Saída | Essencial | Seção 1.2 (6º Parágrafo) |
| **RF_S03** | Extrato Financeiro e Movimentação de Créditos | Função de Saída | Essencial | Seção 1.2 (6º Parágrafo) |
| **RF_S04** | Relatório de Candidaturas e PDFs do Candidato | Função de Saída | Condicional | Seção 1.2 (6º Parágrafo) |
| **RF_S05** | Painel Gerencial e Estatístico Administrativo | Função de Saída | Condicional | Seção 1.2 (6º Parágrafo) |
