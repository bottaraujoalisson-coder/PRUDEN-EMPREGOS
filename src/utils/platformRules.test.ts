import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_WELCOME_CREDITS,
  APPLY_JOB_CREDIT_COST,
  POST_JOB_CREDIT_COST,
  BOOST_JOB_CREDIT_COST,
  RESUME_GENERATION_CREDIT_COST,
} from './creditsData';
import {
  calculateDetailedMatchAnalysis,
  isValidCPF,
  isValidCNPJ,
} from './matchAlgorithm';
import {
  RESUME_TEMPLATES,
  buildStructuredResumeFromProfile,
  generateSelectableResumePdfBytes,
} from './pdfResumeGenerator';
import { Job, UserProfile } from '../types';

describe('PrudenEmpregos Platform Rules & Architecture', () => {
  it('1. Enforces exact credit costs and 30 free welcome credits on new registration', () => {
    assert.equal(
      INITIAL_WELCOME_CREDITS,
      30,
      'New registrations must receive 30 free welcome credits'
    );
    assert.equal(APPLY_JOB_CREDIT_COST, 10, 'Candidate job application must cost 10 credits');
    assert.equal(POST_JOB_CREDIT_COST, 10, 'Company job publication must cost 10 credits');
    assert.equal(BOOST_JOB_CREDIT_COST, 15, 'Company job highlight/boost must cost 15 credits');
    assert.equal(
      RESUME_GENERATION_CREDIT_COST,
      15,
      'Candidate ATS PDF resume generation must cost 15 credits'
    );
    // 30 welcome credits allow 3 applications OR 1 ATS resume + 1 application (25 cr)
    assert.ok(INITIAL_WELCOME_CREDITS >= APPLY_JOB_CREDIT_COST * 3);
    assert.ok(INITIAL_WELCOME_CREDITS >= RESUME_GENERATION_CREDIT_COST + APPLY_JOB_CREDIT_COST);
    // 30 welcome credits allow 3 job posts OR 1 job post + 1 boost (25 cr)
    assert.ok(INITIAL_WELCOME_CREDITS >= POST_JOB_CREDIT_COST + BOOST_JOB_CREDIT_COST);
    assert.equal(RESUME_TEMPLATES.length, 3, 'Must provide 3 ATS-optimized resume templates');
  });

  it('2. Calculates weighted match analysis (0-100%) with breakdown, strengths, and weaknesses', () => {
    const job: Job = {
      id: 'job-1',
      title: 'Analista Financeiro Pleno',
      companyId: 'comp-1',
      companyName: 'Supermercados Estrela',
      category: 'Financeiro',
      workModel: 'Presencial',
      experience: 'Pleno',
      contract: 'CLT',
      location: 'Presidente Prudente, SP',
      skills: ['Excel Avançado', 'Fluxo de Caixa', 'Conciliação Bancária', 'Power BI'],
      description: 'Atuação no setor financeiro com ensino superior completo.',
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    const strongCandidate: UserProfile = {
      uid: 'cand-1',
      name: 'Mariana Santos',
      email: 'mariana@email.com',
      type: 'candidate',
      city: 'Presidente Prudente, SP',
      role: 'Analista Financeiro',
      experienceLevel: 'Pleno',
      education: 'Superior Completo',
      skills: ['Excel Avançado', 'Fluxo de Caixa', 'Conciliação Bancária'],
      about: 'Experiência sólida com Power BI e rotinas financeiras.',
    };

    const analysis = calculateDetailedMatchAnalysis(job, strongCandidate);
    assert.ok(analysis.matchScore >= 85 && analysis.matchScore <= 100);
    assert.equal(analysis.matchBreakdown.skillsScore, 75);
    assert.equal(analysis.matchBreakdown.experienceScore, 100);
    assert.equal(analysis.matchBreakdown.educationScore, 100);
    assert.equal(analysis.matchBreakdown.locationScore, 100);
    assert.ok(analysis.matchStrengths.length >= 2);
    assert.equal(analysis.missingSkills.length, 1);
  });

  it('3. Protects sensitive data (CPF, street address, CEP, salary expectation) in exported ATS PDF resumes', () => {
    const candidateWithSensitiveData: UserProfile = {
      uid: 'cand-2',
      name: 'Carlos Eduardo',
      email: 'carlos@email.com',
      type: 'candidate',
      cpf: '529.982.247-25',
      documentNumber: '529.982.247-25',
      cep: '19010-000',
      street: 'Rua Tenente Nicolau Maffei',
      addressNumber: '450',
      neighborhood: 'Centro',
      city: 'Presidente Prudente, SP',
      state: 'SP',
      phone: '(18) 99777-8888',
      role: 'Assistente Administrativo',
      education: 'Superior Completo',
      salaryExpectation: 'R$ 3.500,00',
      skills: ['Excel', 'Atendimento', 'ERP'],
      about: 'Profissional organizado com 4 anos de atuação administrativa.',
    };

    const structured = buildStructuredResumeFromProfile(candidateWithSensitiveData, {
      templateId: 'ats_classic',
      includeCpfInPdf: true, // Even if true is passed, privacy rule must strip CPF
    });

    assert.ok(!structured.cpfDisplay, 'CPF display must be stripped/undefined');
    assert.ok(!structured.locationLine.includes('Nicolau Maffei'));
    assert.ok(!structured.locationLine.includes('19010-000'));
    assert.ok(structured.locationLine.includes('Presidente Prudente'));

    const pdfBytes = generateSelectableResumePdfBytes(structured);
    const pdfContentString = Buffer.from(pdfBytes).toString('latin1');
    assert.ok(!pdfContentString.includes('529.982.247-25'), 'PDF must never contain raw CPF');
    assert.ok(
      !pdfContentString.includes('Nicolau Maffei'),
      'PDF must never contain residential street address'
    );
  });

  it('4. Validates CPF and CNPJ check digits accurately', () => {
    assert.equal(isValidCPF('52998224725'), true);
    assert.equal(isValidCPF('11111111111'), false);
    assert.equal(isValidCNPJ('11222333000181'), true);
    assert.equal(isValidCNPJ('00000000000191'), true);
    assert.equal(isValidCNPJ('11222333000199'), false);
  });
});
