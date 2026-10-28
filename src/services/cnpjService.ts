import { isValidCNPJ, normalizeCNPJ } from '../utils/validation';

export interface CnpjReceitaFederalData {
  valid: boolean;
  active: boolean;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  situacaoCadastral: string;
  municipio: string;
  uf: string;
  cityFormatted: string;
  cityState: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  source?: string;
}

export type CnpjLookupData = CnpjReceitaFederalData;

export interface CnpjLookupResult {
  success: boolean;
  active: boolean;
  data?: CnpjReceitaFederalData;
  error?: string;
  errorCode?: 'INVALID_CNPJ' | 'CNPJ_NOT_FOUND' | 'CNPJ_INACTIVE' | 'SERVICE_UNAVAILABLE';
}

const clientCnpjCache = new Map<string, CnpjLookupResult>();

/**
 * Consulta os dados públicos da Receita Federal via proxy seguro (/api/cnpj/:cnpj -> BrasilAPI),
 * validando se o CNPJ existe e se a situação cadastral está ATIVA.
 */
export async function lookupCompanyByCnpj(rawCnpj: string): Promise<CnpjLookupResult> {
  const clean = normalizeCNPJ(rawCnpj);

  if (!isValidCNPJ(clean)) {
    return {
      success: false,
      active: false,
      error: 'CNPJ inválido. Verifique os 14 dígitos e os dígitos verificadores.',
      errorCode: 'INVALID_CNPJ',
    };
  }

  if (clientCnpjCache.has(clean)) {
    return clientCnpjCache.get(clean)!;
  }

  try {
    const res = await fetch(`/api/cnpj/${clean}`);
    const contentType = res.headers.get('content-type') || '';
    const body = contentType.includes('application/json')
      ? await res.json().catch(() => null)
      : null;

    if (body && body.cnpj) {
      if (!res.ok) {
        const failResult: CnpjLookupResult = {
          success: false,
          active: false,
          data: body || undefined,
          error:
            body?.error ||
            'Não foi possível validar o CNPJ na base da Receita Federal.',
          errorCode: body?.errorCode || 'CNPJ_NOT_FOUND',
        };
        if (res.status === 422 || res.status === 404) {
          clientCnpjCache.set(clean, failResult);
        }
        return failResult;
      }

      const formattedCity = body.cityFormatted || 'Presidente Prudente, SP';
      const data: CnpjReceitaFederalData = {
        valid: true,
        active: Boolean(body.active),
        cnpj: clean,
        razaoSocial: body.razaoSocial || '',
        nomeFantasia: body.nomeFantasia || body.razaoSocial || '',
        situacaoCadastral: body.situacaoCadastral || 'ATIVA',
        municipio: body.municipio || 'Presidente Prudente',
        uf: body.uf || 'SP',
        cityFormatted: formattedCity,
        cityState: formattedCity,
        cep: body.cep || '',
        logradouro: body.logradouro || '',
        numero: body.numero || '',
        bairro: body.bairro || '',
        source: body.source || 'receita_federal',
      };

      const okResult: CnpjLookupResult = {
        success: data.active,
        active: data.active,
        data,
        ...(data.active
          ? {}
          : {
              error: `Cadastro bloqueado: CNPJ com situação "${data.situacaoCadastral}" na Receita Federal.`,
              errorCode: 'CNPJ_INACTIVE',
            }),
      };

      clientCnpjCache.set(clean, okResult);
      return okResult;
    }

    // Fallback direto para BrasilAPI quando hospedado em CDN estática (ex: Netlify)
    const brasilRes = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
    if (brasilRes.ok) {
      const bData: any = await brasilRes.json();
      const situacaoStr = String(bData.descricao_situacao_cadastral || 'ATIVA').toUpperCase();
      const situacaoCod = Number(bData.situacao_cadastral ?? 2);
      const isActive = situacaoStr === 'ATIVA' || situacaoCod === 2;
      const rawMun = String(bData.municipio || 'Presidente Prudente').trim();
      const formattedMun = rawMun
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
      const uf = String(bData.uf || 'SP').toUpperCase();
      const cityFormatted = `${formattedMun}, ${uf}`;

      const data: CnpjReceitaFederalData = {
        valid: true,
        active: isActive,
        cnpj: clean,
        razaoSocial: bData.razao_social || '',
        nomeFantasia: bData.nome_fantasia || bData.razao_social || '',
        situacaoCadastral: situacaoStr,
        municipio: formattedMun,
        uf,
        cityFormatted,
        cityState: cityFormatted,
        cep: bData.cep ? String(bData.cep) : '',
        logradouro: bData.logradouro || '',
        numero: bData.numero || '',
        bairro: bData.bairro || '',
        source: 'brasilapi_direct',
      };

      const directResult: CnpjLookupResult = {
        success: isActive,
        active: isActive,
        data,
        ...(isActive
          ? {}
          : {
              error: `Cadastro bloqueado: CNPJ com situação "${situacaoStr}" na Receita Federal.`,
              errorCode: 'CNPJ_INACTIVE',
            }),
      };
      clientCnpjCache.set(clean, directResult);
      return directResult;
    }

    if (brasilRes.status === 404) {
      return {
        success: false,
        active: false,
        error: 'CNPJ não encontrado na base de dados da Receita Federal.',
        errorCode: 'CNPJ_NOT_FOUND',
      };
    }

    return {
      success: false,
      active: false,
      error: 'Não foi possível validar o CNPJ na Receita Federal no momento.',
      errorCode: 'SERVICE_UNAVAILABLE',
    };
  } catch {
    return {
      success: false,
      active: false,
      error: 'Falha de conexão ao consultar a Receita Federal. Tente novamente em instantes.',
      errorCode: 'SERVICE_UNAVAILABLE',
    };
  }
}
