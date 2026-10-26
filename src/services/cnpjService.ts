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
    const body = await res.json().catch(() => null);

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
  } catch {
    return {
      success: false,
      active: false,
      error: 'Falha de conexão ao consultar a Receita Federal. Tente novamente em instantes.',
      errorCode: 'SERVICE_UNAVAILABLE',
    };
  }
}
