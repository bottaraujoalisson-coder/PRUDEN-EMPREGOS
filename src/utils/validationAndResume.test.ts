import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCPF,
  normalizeCNPJ,
  normalizeCEP,
  formatCPF,
  formatCNPJ,
  formatCEP,
  isValidCPF,
  isValidCNPJ,
  isValidCEP,
  isValidPhone,
  getDocumentRegistryKey,
  validateRegistrationInput,
  checkResumeGenerationReadiness,
} from './validation';
import {
  RESUME_GENERATION_COST,
  RESUME_TEMPLATES,
  buildStructuredResumeFromProfile,
  generateSelectableResumePdfBytes,
  generateSelectableResumePdfDataUrl,
} from './pdfResumeGenerator';
import { CANDIDATE_RESUME_CREDIT_PACKAGE } from './creditsData';
import { UserProfile } from '../types';

describe('Validação de CPF, CNPJ, CEP e Cadastros (Módulo 11)', () => {
  it('valida CPFs autênticos com dígitos verificadores corretos e rejeita CPFs inválidos', () => {
    assert.equal(isValidCPF('52998224725'), true);
    assert.equal(isValidCPF('529.982.247-25'), true);
    assert.equal(isValidCPF('11144477735'), true);

    // Sequências repetidas devem ser rejeitadas
    assert.equal(isValidCPF('111.111.111-11'), false);
    assert.equal(isValidCPF('000.000.000-00'), false);
    assert.equal(isValidCPF('99999999999'), false);

    // Dígitos verificadores incorretos devem ser rejeitados
    assert.equal(isValidCPF('529.982.247-20'), false);
    assert.equal(isValidCPF('123.456.789-00'), false);
    assert.equal(isValidCPF('12345'), false);
  });

  it('valida CNPJs autênticos com dígitos verificadores corretos e rejeita CNPJs inválidos', () => {
    assert.equal(isValidCNPJ('11222333000181'), true);
    assert.equal(isValidCNPJ('11.222.333/0001-81'), true);
    assert.equal(isValidCNPJ('45.997.418/0001-53'), true);

    // Sequências repetidas devem ser rejeitadas
    assert.equal(isValidCNPJ('00.000.000/0000-00'), false);
    assert.equal(isValidCNPJ('11111111111111'), false);

    // Dígitos verificadores incorretos devem ser rejeitados
    assert.equal(isValidCNPJ('11.222.333/0001-80'), false);
    assert.equal(isValidCNPJ('12.345.678/0001-00'), false);
  });

  it('normaliza e formata CPF, CNPJ e CEP corretamente', () => {
    assert.equal(normalizeCPF('529.982.247-25'), '52998224725');
    assert.equal(formatCPF('52998224725'), '529.982.247-25');

    assert.equal(normalizeCNPJ('11.222.333/0001-81'), '11222333000181');
    assert.equal(formatCNPJ('11222333000181'), '11.222.333/0001-81');

    assert.equal(normalizeCEP('19010-000'), '19010000');
    assert.equal(formatCEP('19010000'), '19010-000');

    assert.equal(isValidCEP('19010-000'), true);
    assert.equal(isValidCEP('00000-000'), false);
    assert.equal(isValidCEP('1234'), false);

    assert.equal(getDocumentRegistryKey('CPF', '529.982.247-25'), 'cpf_52998224725');
    assert.equal(getDocumentRegistryKey('CNPJ', '11.222.333/0001-81'), 'cnpj_11222333000181');
  });

  it('valida cadastro de pessoa física (CPF) e pessoa jurídica (CNPJ) com regras obrigatórias', () => {
    const validCandidate = validateRegistrationInput({
      role: 'candidate',
      name: 'Maria Oliveira',
      email: 'maria@exemplo.com',
      password: 'password123',
      document: '529.982.247-25',
      phone: '(18) 99777-8888',
      cep: '19010-000',
      city: 'Presidente Prudente, SP',
    });
    assert.equal(validCandidate.valid, true);

    const invalidCandidate = validateRegistrationInput({
      role: 'candidate',
      name: 'M',
      email: 'invalido',
      password: '123',
      document: '111.111.111-11',
      phone: '123',
      cep: '123',
      city: '',
    });
    assert.equal(invalidCandidate.valid, false);
    assert.ok(invalidCandidate.errors.document);
    assert.ok(invalidCandidate.errors.email);
    assert.ok(invalidCandidate.errors.password);
    assert.ok(invalidCandidate.errors.cep);

    const validCompany = validateRegistrationInput({
      role: 'company',
      name: 'Comércio Prudente LTDA',
      email: 'rh@comercioprudente.com.br',
      password: 'password123',
      document: '11.222.333/0001-81',
      phone: '(18) 3222-3344',
      cep: '19015-000',
      city: 'Presidente Prudente, SP',
    });
    assert.equal(validCompany.valid, true);
    assert.equal(isValidPhone('(18) 99777-8888'), true);
  });
});

describe('Gerador Profissional de Currículo em PDF (15 Créditos & ATS)', () => {
  const sampleProfile: UserProfile = {
    uid: 'cand-test-1',
    name: 'Carlos Eduardo Santos',
    email: 'carlos.santos@exemplo.com.br',
    type: 'candidate',
    documentType: 'CPF',
    documentNumber: '529.982.247-25',
    cpf: '529.982.247-25',
    phone: '(18) 99811-2233',
    cep: '19010-000',
    street: 'Avenida Brasil',
    addressNumber: '500',
    neighborhood: 'Centro',
    city: 'Presidente Prudente, SP',
    state: 'SP',
    role: 'Analista Administrativo e Financeiro',
    education: 'Superior Completo',
    about:
      'Profissional com 5 anos de experiência em rotinas administrativas, conciliação bancária, faturamento e atendimento corporativo em Presidente Prudente.',
    skills: ['Excel Avançado', 'Gestão Financeira', 'Faturamento', 'Atendimento ao Cliente'],
    certifications: ['Gestão Empresarial - SENAC', 'Excel Especialista'],
    languages: ['Português (Nativo)', 'Inglês Intermediário'],
    experiences: [
      {
        id: 'exp-1',
        role: 'Assistente Administrativo Pleno',
        company: 'Grupo Comercial Oeste Paulista',
        period: '02/2022 - Atual',
        current: true,
        description:
          'Controle de contas a pagar e receber, emissão de notas fiscais e relatórios gerenciais.',
      },
    ],
    educationHistory: [
      {
        id: 'edu-1',
        degree: 'Bacharelado em Administração',
        institution: 'Unoeste - Presidente Prudente',
        completionYear: '2023',
        status: 'Concluído',
      },
    ],
    credits: 35,
  };

  it('define o custo oficial de 15 créditos para geração do currículo e pacote de 15 créditos', () => {
    assert.equal(RESUME_GENERATION_COST, 15);
    assert.equal(CANDIDATE_RESUME_CREDIT_PACKAGE.totalCredits, 15);
    assert.equal(RESUME_TEMPLATES.length, 3);
  });

  it('verifica prontidão dos dados do currículo e identifica campos faltantes quando incompleto', () => {
    const readyCheck = checkResumeGenerationReadiness(sampleProfile);
    assert.equal(readyCheck.ready, true);
    assert.equal(readyCheck.missingFields.length, 0);

    const incompleteCheck = checkResumeGenerationReadiness({
      name: 'João',
      email: 'joao@teste.com',
      city: 'Presidente Prudente, SP',
      skills: [],
    });
    assert.equal(incompleteCheck.ready, false);
    assert.ok(incompleteCheck.missingFields.length >= 3);
  });

  it('gera PDF 1.4 autêntico com texto selecionável (BT/ET e WinAnsiEncoding)', () => {
    const structured = buildStructuredResumeFromProfile(sampleProfile, {
      templateId: 'ats_classic',
      includeCpfInPdf: false,
    });
    assert.equal(structured.name, 'Carlos Eduardo Santos');
    assert.equal(structured.role, 'Analista Administrativo e Financeiro');

    const pdfBytes = generateSelectableResumePdfBytes(structured);
    assert.ok(pdfBytes.length > 800, 'PDF deve possuir tamanho válido');

    const rawPdfString = new TextDecoder('latin1').decode(pdfBytes);
    assert.ok(rawPdfString.startsWith('%PDF-1.4'), 'Deve iniciar com cabeçalho PDF 1.4');
    assert.ok(rawPdfString.includes('/Font'), 'Deve conter dicionário de fontes');
    assert.ok(rawPdfString.includes('/Helvetica'), 'Deve usar fonte padrão ATS Helvetica');
    assert.ok(rawPdfString.includes('/WinAnsiEncoding'), 'Deve suportar acentuação PT-BR');
    assert.ok(rawPdfString.includes('BT') && rawPdfString.includes('ET'), 'Deve conter blocos de texto selecionável BT/ET');
    assert.ok(rawPdfString.includes('CARLOS EDUARDO SANTOS'), 'Deve conter o nome do candidato em texto selecionável');
    assert.ok(rawPdfString.includes('RESUMO PROFISSIONAL'), 'Deve conter seções de RH estruturadas');

    const pdfResult = generateSelectableResumePdfDataUrl(structured);
    assert.ok(pdfResult.dataUrl.startsWith('data:application/pdf;base64,'));
    assert.ok(pdfResult.fileName.endsWith('.pdf'));
  });
});
