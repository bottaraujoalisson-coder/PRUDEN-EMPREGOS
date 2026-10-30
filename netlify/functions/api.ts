import { app } from '../../server';

/**
 * Netlify Serverless Function handler que encaminha requisições /api/* para a aplicação Express (`server.ts`).
 */
export async function handler(event: any, _context: any): Promise<any> {
  return new Promise((resolve) => {
    const method = event.httpMethod || 'GET';
    const rawPath = event.path || '/';
    const queryParams = event.rawQuery ? `?${event.rawQuery}` : '';
    const url = `${rawPath}${queryParams}`;

    const chunks: Buffer[] = [];
    let statusCode = 200;
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const reqMock: any = {
      method,
      url,
      originalUrl: url,
      path: rawPath,
      headers: event.headers || {},
      query: event.queryStringParameters || {},
      body: event.body ? safeParseBody(event.body) : {},
      ip: event.headers?.['x-nf-client-connection-ip'] || '127.0.0.1',
      socket: { remoteAddress: event.headers?.['x-nf-client-connection-ip'] || '127.0.0.1' },
      get(headerName: string) {
        return this.headers[headerName.toLowerCase()];
      },
    };

    const resMock: any = {
      statusCode: 200,
      setHeader(key: string, val: string) {
        responseHeaders[key] = String(val);
        return this;
      },
      getHeader(key: string) {
        return responseHeaders[key];
      },
      status(code: number) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(payload: any) {
        responseHeaders['Content-Type'] = 'application/json';
        resolve({
          statusCode,
          headers: responseHeaders,
          body: JSON.stringify(payload),
        });
        return this;
      },
      send(payload: any) {
        if (Buffer.isBuffer(payload)) {
          chunks.push(payload);
          resolve({
            statusCode,
            headers: responseHeaders,
            body: Buffer.concat(chunks).toString('base64'),
            isBase64Encoded: true,
          });
        } else if (typeof payload === 'object') {
          responseHeaders['Content-Type'] = 'application/json';
          resolve({
            statusCode,
            headers: responseHeaders,
            body: JSON.stringify(payload),
          });
        } else {
          resolve({
            statusCode,
            headers: responseHeaders,
            body: String(payload ?? ''),
          });
        }
        return this;
      },
      end(payload?: any) {
        resolve({
          statusCode,
          headers: responseHeaders,
          body: payload ? String(payload) : '',
        });
        return this;
      },
    };

    try {
      (app as any).handle(reqMock, resMock, () => {
        resolve({
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Rota não encontrada.' }),
        });
      });
    } catch (err: any) {
      resolve({
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: err?.message || 'Erro interno no servidor.' }),
      });
    }
  });
}

function safeParseBody(rawBody: string): any {
  try {
    return JSON.parse(rawBody);
  } catch {
    return {};
  }
}
