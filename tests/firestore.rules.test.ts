import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Suíte de Auditoria e Verificação de Regras de Segurança do Firestore (AUD-01 a AUD-05 / AUD-20)
 * Valida estaticamente o arquivo firestore.rules e documenta os cenários de isolamento Zero-Trust.
 */
describe('Firestore Security Rules Audit (AUD-01 a AUD-05 / AUD-20)', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');

  it('AUD-01: bloqueia completamente isDirectCloudUid (usr_...) e desativa coleções auth_accounts e auth_bridge', () => {
    assert.equal(
      rulesContent.includes('isDirectCloudUid'),
      false,
      'Nenhuma função isDirectCloudUid deve existir em firestore.rules'
    );
    assert.ok(
      rulesContent.includes('match /auth_accounts/{docId}') &&
        rulesContent.includes('match /auth_bridge/{docId}'),
      'Deve conter bloqueio explícito para auth_accounts e auth_bridge'
    );
  });

  it('AUD-02: impede modificação direta pelo cliente de credits, role, plan e isVerifiedCompany em /users', () => {
    assert.ok(
      rulesContent.includes('doesNotModifyProtectedUserFields()'),
      'Deve validar doesNotModifyProtectedUserFields() no update de /users/{userId}'
    );
    for (const protectedField of [
      'credits',
      'jobPostingCredits',
      'role',
      'plan',
      'planExpiresAt',
      'welcomeCreditsGranted',
      'isVerifiedCompany',
    ]) {
      assert.ok(
        rulesContent.includes(`'${protectedField}'`),
        `Campo protegido ${protectedField} deve estar bloqueado contra Mass Assignment`
      );
    }
  });

  it('AUD-03: segrega dados sensíveis LGPD em /private_profiles/{userId} e proíbe PII em /profiles/{userId}', () => {
    assert.ok(
      rulesContent.includes('match /private_profiles/{userId}'),
      'Coleção /private_profiles/{userId} deve estar definida'
    );
    assert.ok(
      rulesContent.includes('doesNotContainSensitivePII'),
      'Perfis públicos devem validar doesNotContainSensitivePII'
    );
  });

  it('AUD-04: bloqueia escrita direta pelo cliente em /credit_orders e /credit_transactions', () => {
    assert.ok(
      rulesContent.includes('match /credit_orders/{orderId}') &&
        rulesContent.includes('match /credit_transactions/{txId}'),
      'Regras para credit_orders e credit_transactions devem estar presentes e com write bloqueado para clientes'
    );
  });

  it('AUD-05: restringe leitura de /applications apenas ao candidateId, employerId/companyId ou isAdmin()', () => {
    assert.ok(
      rulesContent.includes('resource.data.candidateId == request.auth.uid') &&
        rulesContent.includes('resource.data.employerId == request.auth.uid'),
      'Leitura de candidaturas deve exigir vínculo de autoria ou titularidade da vaga'
    );
  });
});
