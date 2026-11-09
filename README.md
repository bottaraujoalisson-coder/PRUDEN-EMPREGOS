# PrudenEmpregos — Portal Regional de Empregos, Recrutamento e Seleção

> **Presidente Prudente e Oeste Paulista — SP**  
> **Instituição:** Fatec Presidente Prudente — Tecnologia em Análise e Desenvolvimento de Sistemas  
> **Disciplina:** IES-100 (Engenharia de Software I)  
> **Padrão Normativo:** IEEE Std 830/1998 (Especificação de Requisitos de Software)  
> **Conformidade Legal:** Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018)  
> **Produção Oficial:** [https://prudenempregos.netlify.app](https://prudenempregos.netlify.app) | [https://prudenempregos.com.br](https://prudenempregos.com.br)

---

## 📚 Índice da Documentação

1. [Visão Geral e Escopo do Sistema](#1-visão-geral-e-escopo-do-sistema)
2. [Arquitetura Tecnológica e Stack](#2-arquitetura-tecnológica-e-stack)
3. [Perfis de Acesso (RBAC)](#3-perfis-de-acesso-rbac)
4. [Especificação de Requisitos de Software (IEEE 830)](#4-especificação-de-requisitos-de-software-ieee-830)
5. [Catálogo de Regras de Negócio (RN-001 a RN-036)](#5-catálogo-de-regras-de-negócio-rn-001-a-rn-036)
6. [Modelo de Dados e Segurança Firestore (LGPD)](#6-modelo-de-dados-e-segurança-firestore-lgpd)
7. [Economia de Créditos e Pagamentos Mercado Pago](#7-economia-de-créditos-e-pagamentos-mercado-pago)
8. [Motor Determinístico de Match (100 Pontos)](#8-motor-determinístico-de-match-100-pontos)
9. [Gerador de Currículo PDF ATS e Recrutamento às Cegas](#9-gerador-de-currículo-pdf-ats-e-recrutamento-às-cegas)
10. [Instruções de Execução, Testes e Deploy](#10-instruções-de-execução-testes-e-deploy)

---

## 1. Visão Geral e Escopo do Sistema

O **PrudenEmpregos** é uma plataforma regional completa de empregabilidade e recrutamento que conecta candidatos e empresas de Presidente Prudente e municípios vizinhos do Oeste Paulista (Álvares Machado, Pirapozinho, Regente Feijó, Martinópolis, Presidente Bernardes, Santo Anastácio, etc.).

### O que o sistema faz:
* **Para Candidatos:** Criação de perfil profissional, upload/geração de currículo estruturado PDF compatível com robôs ATS (15 cr), busca parametrizada de vagas, candidatura rápida com 1 clique (10 cr), acompanhamento de status no funil de seleção e recebimento de bônus inicial de +30 créditos gratuitos no cadastro.
* **Para Empresas:** Validação de regularidade cadastral via CNPJ na Receita Federal (BrasilAPI), publicação de vagas (10 cr), impulsionamento/destaque no topo do mural (15 cr), triagem de candidatos em funil visual (Novo, Em Análise, Entrevista, Aprovado/Recusado), modo de Recrutamento às Cegas (*Blind Hiring*) para mitigação de vieses inconscientes e contato direto via WhatsApp pré-formatado.
* **Para a Gestão Regional:** Extrato contábil de movimentação de créditos, painel administrativo auditável e conformidade estrita com a LGPD.

### Delimitações de Escopo (O que o software NÃO faz):
* Não processa folha de pagamento, cálculo de encargos trabalhistas, FGTS ou INSS;
* Não efetua assinatura jurídica de contratos de trabalho;
* Não realiza exames admissionais ou testes clínicos;
* Não atua como banco ou custodiante (delega transações ao gateway Mercado Pago).

---

## 2. Arquitetura Tecnológica e Stack

* **Front-end SPA:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite 8.
* **Back-end Transacional & Serverless:** Node.js, Express, Netlify Serverless Functions (`netlify/functions/api.ts`).
* **Banco de Dados & Autenticação:** Google Cloud Firestore (regras de segurança Zero-Trust), Firebase Authentication (Google OAuth + E-mail/Senha com hash seguro).
* **Gateways e APIs Integradas:**
  * **Mercado Pago API:** Pagamentos instantâneos via Pix (QR Code EMVCo BRCode com CRC16) e Checkout Pro para cartão de crédito com webhook assinado via HMAC-SHA256 (`x-signature`).
  * **BrasilAPI & ViaCEP:** Validação de situação cadastral ativa de CNPJ na Receita Federal e preenchimento automático de logradouro, bairro, município e UF por CEP.
* **Segurança e Conformidade:** Criptografia PBKDF2-HMAC-SHA256 (100.000 iterações), proteção contra força bruta (bloqueio temporário de 15 min após 5 falhas), sanitização de inputs contra XSS e cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).

---

## 3. Perfis de Acesso (RBAC)

| Perfil | Identificador | Capacidades e Prerrogativas |
| :--- | :--- | :--- |
| **Visitante** | *Público* | Consulta e filtragem do mural de vagas, visualização da tabela de pacotes de créditos e compartilhamento de vagas via WhatsApp. |
| **Candidato** | `candidate` | Gestão de currículo, cálculo de aderência (*Match*), candidatura a vagas (10 cr), emissão de currículo PDF ATS (15 cr), extrato de créditos e bônus de boas-vindas (+30 cr). |
| **Empresa** | `company` | Publicação de vagas (10 cr), destaque no topo (15 cr), funil seletivo, triagem às cegas, contato via WhatsApp e recarga de créditos corporativos. Exige CNPJ ativo na Receita Federal. |
| **Administrador** | `admin` | Moderação global de usuários, empresas e vagas, auditoria do livro-razão financeiro e estatísticas de empregabilidade da região. |

---

## 4. Especificação de Requisitos de Software (IEEE 830)

Os requisitos estão documentados detalhadamente em [`docs/ERS_IEEE_830_PrudenEmpregos.md`](docs/ERS_IEEE_830_PrudenEmpregos.md), divididos nas categorias:

### 4.1. Funções Básicas (CRUD — Gerenciar / Manter)
* **RF_B01:** Gerenciar Candidatos (dados pessoais, formação, experiências, competências, CPF e CEP).
* **RF_B02:** Manter Empresas Recrutadoras (CNPJ validado na Receita Federal, razão social, endereço e dados de contato).
* **RF_B03:** Gerenciar Vagas de Emprego (título, remuneração formatada R$ BRL, modalidade, requisitos e vigência de 30 dias).
* **RF_B04:** Manter Categorias e Áreas Profissionais (classificação de áreas de atuação do Oeste Paulista).
* **RF_B05:** Gerenciar Pacotes de Créditos e Planos (catálogo autoritativo com preços e quantidades).

### 4.2. Funções Fundamentais (Transações de Negócio)
* **RF_F01:** Candidatura a Vaga de Emprego (débito de 10 créditos, bloqueio de duplicidade e vínculo do currículo).
* **RF_F02:** Publicação e Impulsionamento de Vaga (débito de 10 créditos para publicar e 15 créditos para destaque no topo).
* **RF_F03:** Compra e Liquidação de Créditos via Mercado Pago (Pix QR Code/Copia e Cola e cartão, com webhook idempotente).
* **RF_F04:** Geração de Currículo Profissional em PDF Padrão ATS (15 créditos, 3 modelos visuais e omissão de dados residenciais sensíveis).
* **RF_F05:** Avaliação de Compatibilidade (*Match* Profissional de 0% a 100%) com enquadramento positivo.
* **RF_F06:** Triagem e Movimentação de Etapa do Processo Seletivo (funil de 5 etapas, modo Recrutamento às Cegas e WhatsApp).

### 4.3. Funções de Saída (Consultas e Relatórios)
* **RF_S01:** Consulta Pública e Filtragem Avançada do Mural de Vagas (busca textual, filtros por modalidade, contrato, CNH e salário).
* **RF_S02:** Relatório de Candidatos Inscritos por Vaga e Ranking de *Match* para empresas.
* **RF_S03:** Extrato Financeiro de Pedidos e Movimentação de Créditos (livro-razão auditável).
* **RF_S04:** Relatório de Acompanhamento de Candidaturas e Histórico de Currículos do Candidato.
* **RF_S05:** Painel Gerencial e Estatístico da Administração.

---

## 5. Catálogo de Regras de Negócio (RN-001 a RN-036)

As regras de negócio completas estão especificadas em [`docs/REGRAS_DE_NEGOCIO_PRUDEN_EMPREGOS.md`](docs/REGRAS_DE_NEGOCIO_PRUDEN_EMPREGOS.md) e programadas em `src/shared/businessRules.ts`:

* **RN-001 a RN-004 (Identidade e Acesso):** Validação de e-mail e senha mínima de 6 caracteres; perfis RBAC invioláveis pelo cliente; bloqueio temporário contra força bruta após 5 tentativas; onboarding obrigatório pós-login social para coleta de documento civil/fiscal.
* **RN-005 a RN-009 (Validação e LGPD):** Validação de CPF por Módulo 11; validação de CNPJ ativo na Receita Federal; unicidade global de documentos em `/document_registry`; autopreenchimento por CEP; segregação estrita de PII em `/private_profiles/{uid}` (proibição de dados sensíveis na vitrine pública `/profiles/{uid}`).
* **RN-010 a RN-014 (Economia de Créditos):** Bônus inicial de +30 créditos gratuitos no cadastro; tabela oficial de consumo (10 cr para candidatura, 10 cr para vaga, 15 cr para destaque e 15 cr para currículo ATS); bloqueio de saldo negativo com débito atômico no servidor; créditos cumulativos sem expiração; 5 pacotes com preço unitário decrescente (R$ 1,49/cr a R$ 0,90/cr).
* **RN-015 a RN-019 (Gestão de Vagas):** Publicação exclusiva para empresas com CNPJ ativo verificado e administradores; formatação monetária obrigatória `R$ X.XXX,XX` (ou "Salário a combinar"); vigência padrão de 30 dias por vaga; prioridade máxima para vagas destacadas (Boost); ocultação de registros de teste do mural público.
* **RN-020 a RN-024 (Candidaturas e Funil):** Bloqueio de inscrição duplicada; preservação de vaga em `sessionStorage` pós-login; sigilo de candidaturas restrito a candidato, empresa e admin; máquina de estados oficial (`Novo` $\to$ `Em Análise` $\to$ `Entrevista` $\to$ `Aprovado`/`Recusado`); contato via WhatsApp estruturado.
* **RN-025 a RN-026 (Motor de Match):** Decomposição estrita de 100 pontos (Habilidades 40 pts, Experiência 25 pts, Palavras-chave 20 pts, Localização 15 pts); enquadramento positivo das competências.
* **RN-027 a RN-029 (Currículo ATS PDF):** Formato PDF 1.4 com texto selecionável (`BT`/`ET` e `WinAnsiEncoding`); supressão obrigatória de endereço residencial, CEP e pretensão salarial; 3 modelos lineares mono-coluna.
* **RN-030 a RN-032 (Pagamentos Mercado Pago):** Geração de Pix QR Code EMVCo BRCode; idempotência estrita no webhook; validação de assinatura HMAC-SHA256 (`x-signature`).
* **RN-033 a RN-034 (Inclusão e Recrutamento às Cegas):** Ocultação de nome, foto, idade e ano de formatura no modo *Blind Hiring*; filtros inclusivos (Primeiro Emprego, PCD e 50+).
* **RN-035 a RN-036 (Auditoria e Integridade):** Livro-razão imutável em `/credit_transactions`; sanitização de campos livres contra XSS.

---

## 6. Modelo de Dados e Segurança Firestore (LGPD)

O banco de dados utiliza a segregação recomendada pela LGPD implementada no `firestore.rules`:

```
/users/{userId}               -> Metadados de conta, saldo de créditos e status de verificação
/profiles/{userId}            -> Vitrine pública profissional (NÃO contém CPF, CNPJ, telefone ou endereço residencial)
/private_profiles/{userId}    -> Dados sensíveis protegidos (acesso exclusivo do titular ou Admin)
/document_registry/{docHash}  -> Hash SHA256 de CPF/CNPJ para garantia de unicidade global sem expor o documento
/jobs/{jobId}                 -> Vagas de emprego publicadas por empresas
/applications/{appId}         -> Inscrições (legíveis apenas pelo candidato autor, empresa da vaga ou Admin)
/credit_orders/{orderId}      -> Pedidos de recarga no Mercado Pago (escrita exclusiva do servidor)
/credit_transactions/{txId}   -> Livro-razão imutável de movimentação de créditos (escrita exclusiva do servidor)
```

---

## 7. Economia de Créditos e Pagamentos Mercado Pago

### Tabela de Consumo Operacional:
* **Candidatar-se a uma vaga:** `10 créditos`
* **Publicar uma vaga:** `10 créditos`
* **Destacar vaga no topo do mural (Boost):** `15 créditos`
* **Gerar Currículo Profissional PDF ATS com IA:** `15 créditos`

### Catálogo Oficial de Pacotes de Créditos:
1. **Pacote Básico (10 cr):** `R$ 14,90` (R$ 1,49 por crédito)
2. **Pacote Essencial / Currículo & Destaque (15 cr):** `R$ 19,90` (R$ 1,33 por crédito)
3. **Pacote Profissional / Crescimento Pro (30 cr):** `R$ 34,90` (R$ 1,16 por crédito) — *Mais Popular*
4. **Pacote Avançado (50 cr):** `R$ 49,90` (R$ 1,00 por crédito)
5. **Pacote Corporativo (100 cr):** `R$ 89,90` (R$ 0,90 por crédito) — *Maior Economia*

---

## 8. Motor Determinístico de Match (100 Pontos)

O algoritmo matemático implementado em `src/utils/matchEngine.ts` avalia a compatibilidade de forma transparente:

$$\text{Match Total} = \text{Score}_{\text{Habilidades}} (40) + \text{Score}_{\text{Experiência}} (25) + \text{Score}_{\text{Palavras-Chave}} (20) + \text{Score}_{\text{Localização}} (15)$$

* **Habilidades (40 pts):** Cruzamento exato e semântico entre competências exigidas na vaga e declaradas pelo candidato.
* **Experiência (25 pts):** Pontuação máxima para candidatos experientes ou vagas declaradas como Primeiro Emprego/Estágio.
* **Palavras-chave (20 pts):** Correspondência textual com título, atribuições e requisitos da oportunidade.
* **Localização (15 pts):** Pontuação máxima para residentes em Presidente Prudente ou vagas remotas; 10 pontos para cidades da região metropolitana.

---

## 9. Gerador de Currículo PDF ATS e Recrutamento às Cegas

* **Gerador PDF ATS (`src/utils/pdfResumeGenerator.ts`):** Produz PDFs 1.4 de alta qualidade vetorial diretamente no cliente em menos de 1 segundo, com texto selecionável e compatível com leitores ATS de RH, ocultando rua, número da residência, CEP e pretensão salarial por privacidade.
* **Recrutamento às Cegas (`src/utils/ponteTalentosLogic.ts`):** Modo ativável pela empresa que oculta nome, foto, idade e ano de formatura, gerando códigos anônimos (ex.: `Candidato #4E8A`) para eliminar vieses na triagem inicial.

---

## 10. Instruções de Execução, Testes e Deploy

### Pré-requisitos
* Node.js 20+ ou 22+
* npm ou bun

### Instalação e Execução Local
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (Porta 3000)
npm run dev
```

### Execução da Bateria de Testes Automatizados
```bash
# Executar todos os 62 testes automatizados
npx tsx --test src/utils/*.test.ts tests/*.test.ts

# Executar especificamente a suíte das 36 Regras de Negócio
npx tsx --test tests/businessRules.test.ts

# Executar a auditoria de regras de segurança do Firestore
npx tsx --test tests/firestore.rules.test.ts
```

### Validação de Tipagem e Build de Produção
```bash
# Checagem rigorosa de tipos TypeScript (0 erros)
npm run lint

# Build de produção otimizado com Rollup/Vite
npm run build
```

### Sincronização e Deploy Contínuo no Netlify
```bash
# Publicação automatizada na Netlify
NETLIFY_AUTH_TOKEN="<seu_token>" node scripts/sync-netlify.mjs --require
```

---

## 📄 Documentos de Referência na Pasta `/docs`

* [`docs/ERS_IEEE_830_PrudenEmpregos.md`](docs/ERS_IEEE_830_PrudenEmpregos.md): Especificação de Requisitos de Software completa no formato acadêmico IEEE Std 830/1998 (IES-100 / Fatec Presidente Prudente).
* [`docs/REGRAS_DE_NEGOCIO_PRUDEN_EMPREGOS.md`](docs/REGRAS_DE_NEGOCIO_PRUDEN_EMPREGOS.md): Especificação detalhada de cada uma das 36 regras de negócio com gatilhos, condições, efeitos e matriz de rastreabilidade.
