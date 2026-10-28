import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeText,
  isValidCPF,
  isValidCNPJ,
  isValidCEP,
  isValidEmail,
  isValidPhone,
  validatePasswordStrength,
  validateSafeUploadDataUrl,
  isSafeAllowedHostname,
  validateRegistrationInput,
} from './validation';
import {
  derivePbkdf2Hash,
  verifyAccountPassword,
  constantTimeEqual,
  checkLoginRateLimit,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  sha256Hex,
} from '../services/directCloudAuth';

describe('Auditoria de Segurança, Validação Cadastral e Criptografia (ETAPAS 2, 3, 4 e 6)', () => {
  it('bloqueia payloads de XSS armazenado e refletido em sanitizeText', () => {
    const malicious =
      'João <script>alert("xss")</script><img src=x onerror=alert(1)> javascript:evil() Silva';
    const clean = sanitizeText(malicious);
    assert.equal(clean.includes('<script>'), false);
    assert.equal(clean.includes('onerror='), false);
    assert.equal(clean.includes('javascript:'), false);
    assert.equal(clean, 'João  evil() Silva');
  });

  it('valida rigorosamente CPF, CNPJ, CEP, E-mail e Telefone (ETAPA 3)', () => {
    // CPF
    assert.equal(isValidCPF('52998224725'), true);
    assert.equal(isValidCPF('111.111.111-11'), false);
    assert.equal(isValidCPF('52998224720'), false);

    // CNPJ
    assert.equal(isValidCNPJ('11.222.333/0001-81'), true);
    assert.equal(isValidCNPJ('00.000.000/0000-00'), false);
    assert.equal(isValidCNPJ('11.222.333/0001-80'), false);

    // CEP
    assert.equal(isValidCEP('19010-000'), true);
    assert.equal(isValidCEP('00000-000'), false);
    assert.equal(isValidCEP('11111-111'), false);

    // E-mail (bloqueia caracteres de injeção)
    assert.equal(isValidEmail('candidato@prudenempregos.com.br'), true);
    assert.equal(isValidEmail('admin"<script>@pruden.com'), false);

    // Telefone
    assert.equal(isValidPhone('(18) 99712-3456'), true);
    assert.equal(isValidPhone('(00) 99712-3456'), false);
  });

  it('aplica política de força de senha e bloqueia senhas triviais (ETAPA 2.1 e 4)', () => {
    assert.equal(validatePasswordStrength('12345').valid, false);
    assert.equal(validatePasswordStrength('11111111').valid, false);
    assert.equal(validatePasswordStrength('123456').valid, false);
    assert.equal(validatePasswordStrength('senha123').valid, false);

    const strong = validatePasswordStrength('Pruden@2026#Sec');
    assert.equal(strong.valid, true);
    assert.equal(strong.score, 4);
  });

  it('deriva hash PBKDF2-HMAC-SHA256 (100.000 iterações) e faz upgrade transparente de hash legado', async () => {
    const email = 'teste.seguranca@prudenempregos.com.br';
    const password = 'Pruden#2026!Login';

    const hash = await derivePbkdf2Hash(email, password);
    assert.equal(hash.startsWith('pbkdf2$'), true);

    const checkOk = await verifyAccountPassword(email, password, hash);
    assert.equal(checkOk.valid, true);
    assert.equal(checkOk.needsUpgrade, false);

    const checkWrong = await verifyAccountPassword(email, 'SenhaErrada#1', hash);
    assert.equal(checkWrong.valid, false);

    // Simula hash legado v1 SHA-256 e confirma migração automática para PBKDF2
    const legacyV1 = await sha256Hex(`pruden_pw_v1_${email}::${password}`);
    const legacyVerify = await verifyAccountPassword(email, password, legacyV1);
    assert.equal(legacyVerify.valid, true);
    assert.equal(legacyVerify.needsUpgrade, true);
    assert.equal(legacyVerify.upgradedHash?.startsWith('pbkdf2$'), true);
  });

  it('protege contra ataques de força bruta bloqueando após 5 tentativas falhas (ETAPA 2.1)', () => {
    const targetEmail = 'bruteforce.test@prudenempregos.com.br';
    resetLoginAttempts(targetEmail);

    for (let i = 1; i <= 4; i++) {
      const res = recordFailedLoginAttempt(targetEmail);
      assert.equal(res.locked, false);
      assert.equal(checkLoginRateLimit(targetEmail).allowed, true);
    }

    const fifth = recordFailedLoginAttempt(targetEmail);
    assert.equal(fifth.locked, true);

    const limitAfter5 = checkLoginRateLimit(targetEmail);
    assert.equal(limitAfter5.allowed, false);
    assert.equal(limitAfter5.remainingAttempts, 0);
    assert.ok(limitAfter5.retryAfterSeconds > 0);

    resetLoginAttempts(targetEmail);
    assert.equal(checkLoginRateLimit(targetEmail).allowed, true);
  });

  it('inspeciona Magic Bytes reais de uploads em Base64 (PDF e Imagens) e bloqueia arquivos falsificados (ETAPA 2.8)', () => {
    // PDF autêntico (%PDF-1.4 ...)
    const validPdfBase64 = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n').toString('base64');
    const validPdfUrl = `data:application/pdf;base64,${validPdfBase64}`;
    const pdfCheck = validateSafeUploadDataUrl(validPdfUrl, ['application/pdf'], 800 * 1024);
    assert.equal(pdfCheck.valid, true);

    // Script HTML malicioso disfarçado com cabeçalho data:application/pdf
    const fakePdfBase64 = Buffer.from('<html><script>alert(1)</script></html>').toString('base64');
    const fakePdfUrl = `data:application/pdf;base64,${fakePdfBase64}`;
    const fakeCheck = validateSafeUploadDataUrl(fakePdfUrl, ['application/pdf'], 800 * 1024);
    assert.equal(fakeCheck.valid, false);
    assert.ok(fakeCheck.error?.includes('PDF autêntico'));

    // PNG autêntico (\x89PNG\r\n\x1a\n)
    const validPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const validPngUrl = `data:image/png;base64,${validPngBytes.toString('base64')}`;
    assert.equal(
      validateSafeUploadDataUrl(validPngUrl, ['image/png'], 2 * 1024 * 1024).valid,
      true
    );
  });

  it('valida hostnames permitidos e bloqueia vetores de SSRF / rede interna (ETAPA 2.2)', () => {
    assert.equal(isSafeAllowedHostname('prudenempregos.com.br'), true);
    assert.equal(isSafeAllowedHostname('prudenempregos.netlify.app'), true);
    assert.equal(isSafeAllowedHostname('localhost'), false);
    assert.equal(isSafeAllowedHostname('127.0.0.1'), false);
    assert.equal(isSafeAllowedHostname('169.254.169.254'), false);
    assert.equal(isSafeAllowedHostname('metadata.google.internal'), false);
    assert.equal(isSafeAllowedHostname('http://prudenempregos.com.br/path'), false);
  });

  it('compara strings sensíveis em tempo constante', () => {
    assert.equal(constantTimeEqual('abc123xyz', 'abc123xyz'), true);
    assert.equal(constantTimeEqual('abc123xyz', 'abc123xy0'), false);
    assert.equal(constantTimeEqual('short', 'longer_string'), false);
  });

  it('sanitiza automaticamente XSS no fluxo completo de validateRegistrationInput', () => {
    const result = validateRegistrationInput({
      role: 'candidate',
      name: 'Maria <script>evil()</script> Oliveira',
      email: 'maria.oliveira@exemplo.com.br',
      document: '52998224725',
      phone: '(18) 99711-2233',
      cep: '19010-000',
      city: 'Presidente Prudente, SP',
      password: 'Pruden@2026',
    });
    assert.equal(result.valid, true);
    assert.equal(result.normalized.name, 'Maria  Oliveira');
  });
});
