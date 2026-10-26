import {
  UserProfile,
  ResumeExperience,
  ResumeEducation,
  ResumeTemplateId,
} from '../types';
import { formatCPF, formatPhone, maskCPF } from './matchAlgorithm';

export const RESUME_GENERATION_COST = 15;

export interface ResumeTemplateOption {
  id: ResumeTemplateId;
  name: string;
  badge: string;
  description: string;
  recommendedFor: string;
  accentColorHex: string;
}

export const RESUME_TEMPLATES: ResumeTemplateOption[] = [
  {
    id: 'ats_classic',
    name: 'Executivo ATS Clássico',
    badge: 'Padrão Ouro RH',
    description:
      'Layout tradicional de coluna única, sem elementos gráficos complexos, projetado para máxima precisão de leitura em sistemas ATS (Gupy, Kenoby, Solides, LinkedIn) e análise direta de recrutadores.',
    recommendedFor: 'Administrativo, Financeiro, Comercial, Indústria, Saúde e TI',
    accentColorHex: '#0F172A',
  },
  {
    id: 'modern_corporate',
    name: 'Moderno Corporativo',
    badge: 'Destaque Executivo',
    description:
      'Hierarquia corporativa com cabeçalho institucional estruturado, tipografia limpa e separadores discretos para leitura rápida em tela e impressão A4.',
    recommendedFor: 'Gestão, Analistas, Vendas Consultivas e Atendimento',
    accentColorHex: '#0B1F3A',
  },
  {
    id: 'first_job_focus',
    name: 'Essencial Qualificações & 1º Emprego',
    badge: 'Foco em Potencial',
    description:
      'Prioriza Objetivo Profissional, Formação Acadêmica, Cursos, Certificações e Competências Práticas logo no topo do documento.',
    recommendedFor: 'Primeiro Emprego, Estágio, Jovem Aprendiz e Transição de Carreira',
    accentColorHex: '#1D4ED8',
  },
];

export const ATS_HONEST_DISCLAIMER =
  'Estrutura desenvolvida segundo as boas práticas de RH e sistemas de triagem (ATS) para maximizar a legibilidade e clareza das suas informações. O formato não promete aprovação automática, que depende da análise de cada empresa.';

export interface StructuredResumePayload {
  templateId: ResumeTemplateId;
  name: string;
  role: string;
  email: string;
  phone: string;
  locationLine: string;
  cpfDisplay?: string;
  includeCpfInPdf?: boolean;
  linkedinUrl?: string;
  salaryExpectation?: string;
  experienceLevel?: string;
  summary: string;
  experiences: ResumeExperience[];
  educationLevel: string;
  educationHistory: ResumeEducation[];
  certifications: string[];
  skills: string[];
  languages: string[];
}

/**
 * Constrói o payload estruturado do currículo reaproveitando os dados profissionais do candidato.
 * PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD): Dados sensíveis de cadastro interno (CPF, RG, endereço residencial completo, CEP e dados financeiros)
 * NUNCA são expostos no currículo exportado em PDF (exibe apenas Cidade/UF e canais de contato autorizados).
 */
export function buildStructuredResumeFromProfile(
  user: Partial<UserProfile>,
  options?: {
    templateId?: ResumeTemplateId;
    includeCpfInPdf?: boolean;
  }
): StructuredResumePayload {
  const templateId = options?.templateId || 'ats_classic';

  // Exibir exclusivamente Cidade/UF (nunca rua, número ou CEP privado)
  const cityPart = (user.city || 'Presidente Prudente, SP').trim();
  const locationLine = cityPart;

  const experiences: ResumeExperience[] =
    Array.isArray(user.experiences) && user.experiences.length > 0
      ? user.experiences.filter((e) => e.company || e.role || e.description)
      : [];

  const educationHistory: ResumeEducation[] =
    Array.isArray(user.educationHistory) && user.educationHistory.length > 0
      ? user.educationHistory.filter((ed) => ed.degree || ed.institution)
      : [];

  const certifications = Array.isArray(user.certifications)
    ? user.certifications.map((c) => c.trim()).filter(Boolean)
    : [];

  const skills = Array.isArray(user.skills)
    ? user.skills.map((s) => s.trim()).filter(Boolean)
    : [];

  const languages =
    Array.isArray(user.languages) && user.languages.length > 0
      ? user.languages.map((l) => l.trim()).filter(Boolean)
      : ['Português (Nativo)'];

  return {
    templateId,
    name: (user.name || 'Candidato').trim(),
    role: (user.role || 'Profissional').trim(),
    email: (user.email || '').trim(),
    phone: user.phone ? formatPhone(user.phone) : '',
    locationLine,
    cpfDisplay: undefined,
    includeCpfInPdf: false,
    linkedinUrl: user.linkedinUrl?.trim() || '',
    salaryExpectation: '',
    experienceLevel: user.experienceLevel?.trim() || '',
    summary: (user.about || '').trim(),
    experiences,
    educationLevel: (user.education || '').trim(),
    educationHistory,
    certifications,
    skills,
    languages,
  };
}

/**
 * Converte caracteres Unicode / Português para string literal PDF compatível com /WinAnsiEncoding.
 * Mantém caracteres ASCII visíveis diretamente (ex: `(Mariana Silva) Tj`) e converte acentos
 * para sequências octais WinAnsi (`\341` etc.), garantindo texto 100% selecionável em qualquer leitor PDF.
 */
const UNICODE_TO_WINANSI: Record<number, number> = {
  0x2013: 0x96, // – en-dash
  0x2014: 0x97, // — em-dash
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201c: 0x93, // “
  0x201d: 0x94, // ”
  0x2022: 0x95, // • bullet
  0x2026: 0x85, // …
  0x00b7: 0xb7, // · middle dot
};

export function encodePdfWinAnsiLiteral(text: string): string {
  const sanitized = text.replace(/\r?\n/g, ' ').trim();
  let out = '(';
  for (let i = 0; i < sanitized.length; i++) {
    const code = sanitized.charCodeAt(i);
    if (code === 0x28) {
      out += '\\(';
    } else if (code === 0x29) {
      out += '\\)';
    } else if (code === 0x5c) {
      out += '\\\\';
    } else if (code >= 0x20 && code <= 0x7e) {
      out += sanitized[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else if (UNICODE_TO_WINANSI[code]) {
      out += '\\' + UNICODE_TO_WINANSI[code].toString(8).padStart(3, '0');
    } else {
      out += ' ';
    }
  }
  out += ')';
  return out;
}

/**
 * Quebra um parágrafo em linhas que cabem na largura útil da página A4.
 */
export function wrapTextLines(text: string, maxCharsPerLine: number): string[] {
  const paragraphs = text
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const lines: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

interface PdfLineItem {
  text: string;
  font: 'F1' | 'F2'; // F1 = Helvetica (Regular), F2 = Helvetica-Bold
  size: number;
  lineHeight: number;
  colorRgb?: [number, number, number];
  drawDividerBelow?: boolean;
  indent?: number;
}

/**
 * Gera um documento PDF 1.4 vetorial com texto real selecionável (compatível com ATS e impressão A4).
 */
export function generateSelectableResumePdfBytes(payload: StructuredResumePayload): Uint8Array {
  const items: PdfLineItem[] = [];

  const primaryColor: [number, number, number] =
    payload.templateId === 'modern_corporate'
      ? [0.04, 0.12, 0.23] // #0B1F3A
      : payload.templateId === 'first_job_focus'
      ? [0.11, 0.31, 0.85] // #1D4ED8
      : [0.06, 0.09, 0.16]; // #0F172A

  const mutedColor: [number, number, number] = [0.28, 0.33, 0.41];
  const bodyColor: [number, number, number] = [0.12, 0.16, 0.22];

  // 1. CABEÇALHO DO CANDIDATO
  items.push({
    text: payload.name.toUpperCase(),
    font: 'F2',
    size: 18,
    lineHeight: 24,
    colorRgb: primaryColor,
  });

  const roleHeader = [
    payload.role,
    payload.experienceLevel ? `Nível: ${payload.experienceLevel}` : '',
  ]
    .filter(Boolean)
    .join('  |  ');

  if (roleHeader) {
    items.push({
      text: roleHeader,
      font: 'F2',
      size: 11.5,
      lineHeight: 16,
      colorRgb: [0.14, 0.34, 0.84],
    });
  }

  const contactParts = [
    payload.phone ? `Tel/WhatsApp: ${payload.phone}` : '',
    payload.email ? `E-mail: ${payload.email}` : '',
    payload.linkedinUrl ? `LinkedIn: ${payload.linkedinUrl}` : '',
  ].filter(Boolean);

  if (contactParts.length > 0) {
    items.push({
      text: contactParts.join('  •  '),
      font: 'F1',
      size: 9.5,
      lineHeight: 14,
      colorRgb: mutedColor,
    });
  }

  const locAndDocParts = [payload.locationLine].filter(Boolean);

  if (locAndDocParts.length > 0) {
    items.push({
      text: locAndDocParts.join('  •  '),
      font: 'F1',
      size: 9.5,
      lineHeight: 16,
      colorRgb: mutedColor,
      drawDividerBelow: true,
    });
  }

  const addSectionHeader = (title: string) => {
    items.push({
      text: '',
      font: 'F1',
      size: 6,
      lineHeight: 6,
    });
    items.push({
      text: title.toUpperCase(),
      font: 'F2',
      size: 11,
      lineHeight: 17,
      colorRgb: primaryColor,
      drawDividerBelow: true,
    });
  };

  // 2. OBJETIVO E RESUMO PROFISSIONAL
  addSectionHeader('Objetivo e Resumo Profissional');
  items.push({
    text: `Objetivo: Atuar como ${payload.role}${
      payload.experienceLevel ? ` (${payload.experienceLevel})` : ''
    }.`,
    font: 'F2',
    size: 10,
    lineHeight: 15,
    colorRgb: bodyColor,
  });

  if (payload.summary) {
    const wrappedSummary = wrapTextLines(payload.summary, 88);
    for (const line of wrappedSummary) {
      items.push({
        text: line,
        font: 'F1',
        size: 10,
        lineHeight: 14.5,
        colorRgb: bodyColor,
      });
    }
  }

  const renderEducationSection = () => {
    if (!payload.educationLevel && payload.educationHistory.length === 0) return;
    addSectionHeader('Formação Acadêmica');
    if (payload.educationLevel) {
      items.push({
        text: `Escolaridade: ${payload.educationLevel}`,
        font: 'F2',
        size: 10,
        lineHeight: 15,
        colorRgb: bodyColor,
      });
    }
    for (const edu of payload.educationHistory) {
      const eduTitle = `${edu.degree || 'Curso'} — ${edu.institution || 'Instituição'}`;
      const eduMeta = [edu.status, edu.completionYear].filter(Boolean).join(' · ');
      items.push({
        text: `• ${eduTitle}${eduMeta ? ` (${eduMeta})` : ''}`,
        font: 'F1',
        size: 10,
        lineHeight: 14.5,
        colorRgb: bodyColor,
        indent: 8,
      });
    }
  };

  const renderExperienceSection = () => {
    if (payload.experiences.length === 0) return;
    addSectionHeader('Experiência Profissional');
    for (const exp of payload.experiences) {
      const titleLine = [exp.role || 'Cargo', exp.company ? `— ${exp.company}` : '']
        .filter(Boolean)
        .join(' ');
      const periodStr = exp.current ? `${exp.period || ''} (Atual)`.trim() : exp.period || '';
      items.push({
        text: `${titleLine}${periodStr ? `  |  ${periodStr}` : ''}`,
        font: 'F2',
        size: 10.5,
        lineHeight: 15.5,
        colorRgb: bodyColor,
      });

      if (exp.description) {
        const descLines = wrapTextLines(exp.description, 85);
        for (const line of descLines) {
          items.push({
            text: line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`,
            font: 'F1',
            size: 9.8,
            lineHeight: 14,
            colorRgb: bodyColor,
            indent: 8,
          });
        }
      }
      items.push({ text: '', font: 'F1', size: 4, lineHeight: 4 });
    }
  };

  // Se o modelo for focado em 1º emprego, exibe Formação antes de Experiência
  if (payload.templateId === 'first_job_focus') {
    renderEducationSection();
    renderExperienceSection();
  } else {
    renderExperienceSection();
    renderEducationSection();
  }

  // 5. COMPETÊNCIAS TÉCNICAS E COMPORTAMENTAIS
  if (payload.skills.length > 0) {
    addSectionHeader('Competências Técnicas e Habilidades');
    const skillsText = payload.skills.join('  •  ');
    const skillLines = wrapTextLines(skillsText, 88);
    for (const line of skillLines) {
      items.push({
        text: line,
        font: 'F1',
        size: 10,
        lineHeight: 14.5,
        colorRgb: bodyColor,
      });
    }
  }

  // 6. CURSOS, CERTIFICAÇÕES E QUALIFICAÇÕES
  if (payload.certifications.length > 0) {
    addSectionHeader('Cursos, Certificações e Qualificações');
    for (const cert of payload.certifications) {
      const certLines = wrapTextLines(cert, 85);
      for (let idx = 0; idx < certLines.length; idx++) {
        items.push({
          text: idx === 0 ? `• ${certLines[idx]}` : `  ${certLines[idx]}`,
          font: 'F1',
          size: 9.8,
          lineHeight: 14,
          colorRgb: bodyColor,
          indent: 8,
        });
      }
    }
  }

  // 7. IDIOMAS E INFORMAÇÕES COMPLEMENTARES
  if (payload.languages.length > 0) {
    addSectionHeader('Idiomas e Informações Adicionais');
    items.push({
      text: `Idiomas: ${payload.languages.join('  •  ')}`,
      font: 'F1',
      size: 10,
      lineHeight: 14.5,
      colorRgb: bodyColor,
    });
  }

  // PAGINAÇÃO A4 (595.28 x 841.89 pt)
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const marginX = 48;
  const topY = pageHeight - 50;
  const bottomY = 52;

  const pageStreams: string[] = [];
  let currentOps: string[] = [];
  let cursorY = topY;

  const flushPage = () => {
    if (currentOps.length > 0) {
      // Rodapé discreto ATS
      currentOps.push('BT');
      currentOps.push('/F1 8 Tf');
      currentOps.push('0.45 0.50 0.58 rg');
      currentOps.push(
        `1 0 0 1 ${marginX} 30 Tm ${encodePdfWinAnsiLiteral(
          `Currículo Profissional (Padrão RH/ATS) — ${payload.name} — Presidente Prudente e Região`
        )} Tj`
      );
      currentOps.push('ET');
      pageStreams.push(currentOps.join('\n'));
      currentOps = [];
    }
    cursorY = topY;
  };

  for (const item of items) {
    if (cursorY - item.lineHeight < bottomY) {
      flushPage();
    }

    cursorY -= item.lineHeight;

    if (item.text.trim().length > 0) {
      const [r, g, b] = item.colorRgb || [0.1, 0.1, 0.1];
      const xPos = marginX + (item.indent || 0);
      currentOps.push('BT');
      currentOps.push(`/${item.font} ${item.size} Tf`);
      currentOps.push(`${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg`);
      currentOps.push(`1 0 0 1 ${xPos.toFixed(2)} ${cursorY.toFixed(2)} Tm`);
      currentOps.push(`${encodePdfWinAnsiLiteral(item.text)} Tj`);
      currentOps.push('ET');
    }

    if (item.drawDividerBelow) {
      const lineY = cursorY - 4;
      currentOps.push('0.82 0.85 0.90 RG');
      currentOps.push('0.75 w');
      currentOps.push(`${marginX} ${lineY.toFixed(2)} m ${(pageWidth - marginX).toFixed(2)} ${lineY.toFixed(2)} l S`);
      cursorY -= 7;
    }
  }

  flushPage();
  if (pageStreams.length === 0) {
    pageStreams.push('BT /F1 12 Tf 50 780 Tm (Curriculo) Tj ET');
  }

  // Montagem da estrutura PDF 1.4 com tabela xref exata
  const objects: string[] = [];
  const addObject = (body: string): number => {
    objects.push(body);
    return objects.length; // 1-indexed object number
  };

  const catalogObjNum = addObject(''); // 1: Catalog placeholder
  const pagesObjNum = addObject(''); // 2: Pages placeholder
  const fontRegularObjNum = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  const fontBoldObjNum = addObject(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );

  const pageObjNums: number[] = [];
  for (const streamContent of pageStreams) {
    const streamBytesLen = streamContent.length;
    const contentObjNum = addObject(
      `<< /Length ${streamBytesLen} >>\nstream\n${streamContent}\nendstream`
    );
    const pageObjNum = addObject(
      `<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontRegularObjNum} 0 R /F2 ${fontBoldObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    );
    pageObjNums.push(pageObjNum);
  }

  objects[pagesObjNum - 1] = `<< /Type /Pages /Kids [${pageObjNums
    .map((n) => `${n} 0 R`)
    .join(' ')}] /Count ${pageObjNums.length} >>`;
  objects[catalogObjNum - 1] = `<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`;

  let pdfStr = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfStr.length);
    pdfStr += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdfStr.length;
  pdfStr += `xref\n0 ${objects.length + 1}\n`;
  pdfStr += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdfStr += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdfStr += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogObjNum} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const bytes = new Uint8Array(pdfStr.length);
  for (let i = 0; i < pdfStr.length; i++) {
    bytes[i] = pdfStr.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

/**
 * Gera Data URL (`data:application/pdf;base64,...`) a partir do currículo estruturado.
 */
export function generateSelectableResumePdfDataUrl(payload: StructuredResumePayload): {
  dataUrl: string;
  base64: string;
  byteLength: number;
  fileName: string;
} {
  const bytes = generateSelectableResumePdfBytes(payload);
  const base64 = uint8ArrayToBase64(bytes);
  const slugName = payload.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  const fileName = `curriculo-${slugName || 'profissional'}-ats.pdf`;

  return {
    dataUrl: `data:application/pdf;base64,${base64}`,
    base64,
    byteLength: bytes.byteLength,
    fileName,
  };
}
