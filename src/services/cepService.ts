import { formatCEP, isValidCEP, normalizeCEP } from '../utils/validation';

export interface CepLookupResult {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  cityFormatted: string;
  source?: string;
}

export interface CepLookupResponse {
  success: boolean;
  data?: CepLookupResult;
  error?: string;
  errorCode?: 'INVALID_FORMAT' | 'NOT_FOUND' | 'SERVICE_UNAVAILABLE';
}

// Cache em memória para evitar requisições duplicadas para o mesmo CEP
const cepMemoryCache = new Map<string, CepLookupResponse>();
const inFlightRequests = new Map<string, Promise<CepLookupResponse>>();

/**
 * Consulta automática de endereço por CEP com validação, cache de desduplicação
 * e tratamento de erros (CEP inexistente, incompleto ou serviço indisponível).
 */
export async function lookupAddressByCep(rawCep: string): Promise<CepLookupResponse> {
  const clean = normalizeCEP(rawCep);

  if (clean.length < 8) {
    return {
      success: false,
      error: 'Informe os 8 números do CEP para buscar o endereço.',
      errorCode: 'INVALID_FORMAT',
    };
  }

  if (!isValidCEP(clean)) {
    return {
      success: false,
      error: 'Formato de CEP inválido. Digite um CEP válido com 8 dígitos (ex: 19010-000).',
      errorCode: 'INVALID_FORMAT',
    };
  }

  // Retorna do cache se já consultado nesta sessão
  if (cepMemoryCache.has(clean)) {
    return cepMemoryCache.get(clean)!;
  }

  // Evita chamadas simultâneas repetidas para o mesmo CEP
  if (inFlightRequests.has(clean)) {
    return inFlightRequests.get(clean)!;
  }

  const requestPromise = (async (): Promise<CepLookupResponse> => {
    try {
      // 1. Consulta o endpoint do backend (que integra BrasilAPI + ViaCEP + base regional)
      const res = await fetch(`/api/cep/${clean}`);
      const payload = await res.json().catch(() => null);

      if (res.ok && payload && payload.city) {
        const result: CepLookupResponse = {
          success: true,
          data: {
            cep: formatCEP(clean),
            street: payload.street || '',
            neighborhood: payload.neighborhood || '',
            city: payload.city || '',
            state: payload.state || 'SP',
            cityFormatted: `${payload.city}, ${payload.state || 'SP'}`,
            source: payload.source || 'backend',
          },
        };
        cepMemoryCache.set(clean, result);
        return result;
      }

      if (res.status === 404 || payload?.errorCode === 'NOT_FOUND') {
        const notFoundRes: CepLookupResponse = {
          success: false,
          error:
            payload?.error ||
            'CEP não encontrado. Verifique os números digitados ou preencha o endereço manualmente.',
          errorCode: 'NOT_FOUND',
        };
        cepMemoryCache.set(clean, notFoundRes);
        return notFoundRes;
      }

      // 2. Fallback direto no navegador via BrasilAPI caso o servidor esteja ocupado
      const brasilApiRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`);
      if (brasilApiRes.ok) {
        const bData = await brasilApiRes.json();
        const result: CepLookupResponse = {
          success: true,
          data: {
            cep: formatCEP(clean),
            street: bData.street || '',
            neighborhood: bData.neighborhood || '',
            city: bData.city || '',
            state: bData.state || 'SP',
            cityFormatted: `${bData.city}, ${bData.state || 'SP'}`,
            source: 'brasilapi',
          },
        };
        cepMemoryCache.set(clean, result);
        return result;
      }

      if (brasilApiRes.status === 404) {
        const notFoundRes: CepLookupResponse = {
          success: false,
          error:
            'CEP não encontrado na base dos Correios. Você pode preencher o endereço manualmente.',
          errorCode: 'NOT_FOUND',
        };
        cepMemoryCache.set(clean, notFoundRes);
        return notFoundRes;
      }

      return {
        success: false,
        error:
          'Serviço de CEP temporariamente indisponível. Preencha os campos de endereço manualmente.',
        errorCode: 'SERVICE_UNAVAILABLE',
      };
    } catch {
      return {
        success: false,
        error:
          'Não foi possível conectar ao serviço de CEP. Preencha os campos de endereço manualmente.',
        errorCode: 'SERVICE_UNAVAILABLE',
      };
    } finally {
      inFlightRequests.delete(clean);
    }
  })();

  inFlightRequests.set(clean, requestPromise);
  return requestPromise;
}

export function clearCepCache(): void {
  cepMemoryCache.clear();
}
