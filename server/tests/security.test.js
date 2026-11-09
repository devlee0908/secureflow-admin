import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { vaultService } from '../vault.js';
import { authService } from '../auth.js';
import { securityGuard } from '../securityGuard.js';
import { PostgresDatabaseAdapter } from '../db/postgresAdapter.js';
import { dbService } from '../db.js';
import { verifyGitHubSignature } from '../apiMiddleware.js';
import { scannerPool } from '../workers/scannerPool.js';

describe('SecureFlow Enterprise Security & Cryptographic Engine Suite', () => {
  after(() => {
    scannerPool.terminate();
  });
  it('1. Vault 2-Tier Envelope Encryption (AES-256-GCM DEK + AES-256-KW KEK) & Cross-KMS Re-Wrapping', () => {
    const initialProvider = vaultService.getKmsInfo().activeProviderType;
    try {
      vaultService.setKmsProvider('software-hsm');
      const secretPat = 'ghp_SecureFlowEnterpriseVaultToken2026XYZ987';

      const envelope = vaultService.encrypt(secretPat);
      assert.ok(envelope.encrypted, 'Ciphertext should be generated');
      assert.ok(envelope.iv, 'IV should be generated');
      assert.ok(envelope.authTag, 'GCM AuthTag should be generated');
      assert.ok(envelope.wrappedDek, 'Wrapped DEK should be generated');
      assert.equal(envelope.kmsProvider, 'software-hsm');

      // Verify decryption
      const decrypted = vaultService.decrypt(
        envelope.encrypted,
        envelope.iv,
        envelope.authTag,
        envelope.wrappedDek,
        envelope.kekId,
        envelope.kmsProvider
      );
      assert.equal(decrypted, secretPat);

      // Verify tamper detection on GCM authTag
      const tamperedTag = envelope.authTag.replace(/^./, (c) => (c === 'a' ? 'b' : 'a'));
      const tamperedResult = vaultService.decrypt(
        envelope.encrypted,
        envelope.iv,
        tamperedTag,
        envelope.wrappedDek,
        envelope.kekId,
        envelope.kmsProvider
      );
      assert.equal(tamperedResult, null, 'Tampered GCM authTag must fail decryption');

      // Verify cross-KMS DEK migration (software-hsm -> hashicorp-vault -> aws-kms)
      vaultService.setKmsProvider('hashicorp-vault');
      const reWrappedVault = vaultService.reWrapDek(
        envelope.wrappedDek,
        envelope.kekId,
        envelope.kmsProvider
      );
      assert.equal(reWrappedVault.newProvider, 'hashicorp-vault');

      const decryptedAfterVaultMigration = vaultService.decrypt(
        envelope.encrypted,
        envelope.iv,
        envelope.authTag,
        reWrappedVault.newWrappedDek,
        reWrappedVault.newKekId,
        reWrappedVault.newProvider
      );
      assert.equal(decryptedAfterVaultMigration, secretPat);
    } finally {
      vaultService.setKmsProvider(initialProvider);
    }
  });

  it('2. Immutable SHA-256 Audit Log Hash Chain & Payload Tamper Detection (PostgreSQL & SQLite)', () => {
    const pgAdapter = new PostgresDatabaseAdapter();
    pgAdapter.saveAuditLog({
      actorId: 'USR-01',
      actorName: '강태우 (CISO)',
      actionType: 'KMS_KEY_ROTATED',
      category: 'GOVERNANCE',
      targetResource: 'KMS_MASTER_KEK',
      details: { version: 2, provider: 'software-hsm' },
      resultStatus: '성공',
    });
    pgAdapter.saveAuditLog({
      actorId: 'USR-02',
      actorName: '박진우 (보안팀장)',
      actionType: 'GATE_VERDICT_EVALUATED',
      category: 'SECURITY_GATE',
      targetResource: 'PRJ-AGENTGATE',
      details: { verdict: 'BLOCKED', critCount: 1 },
      resultStatus: '차단',
    });

    const initialVerification = pgAdapter.verifyAuditChain();
    assert.equal(initialVerification.verified, true);
    assert.ok(initialVerification.count >= 3);

    // Tamper with middle record payload by 1 field without updating signature
    const targetRecord = pgAdapter.mockStore.auditLogs[1];
    const originalDetails = { ...targetRecord.details };
    targetRecord.details = { ...originalDetails, version: 999 };

    const tamperedVerification = pgAdapter.verifyAuditChain();
    assert.equal(tamperedVerification.verified, false, 'Modified audit payload must break SHA-256 chain');
    assert.equal(tamperedVerification.brokenIndex, 1);
    assert.equal(tamperedVerification.brokenId, targetRecord.id);

    // Restore and verify recovery
    targetRecord.details = originalDetails;
    assert.equal(pgAdapter.verifyAuditChain().verified, true);

    // Also verify active SQLite chain integrity
    const sqliteVerification = dbService.verifyAuditChain();
    assert.equal(sqliteVerification.verified, true);
  });

  it('3. Zero-Trust RFC 7519 JWT Authentication, Signature Forgery Prevention & RBAC Enforcement', () => {
    const adminSession = authService.authenticate({ role: 'group_admin', provider: 'oidc-sso' });
    assert.ok(adminSession.token);

    const verified = authService.verifyJwt(adminSession.token);
    assert.equal(verified.valid, true);
    assert.equal(verified.claims.role, 'group_admin');

    // Forged payload attack
    const [h, p, s] = adminSession.token.split('.');
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'hacker', role: 'group_admin', exp: 9999999999 })).toString('base64url');
    const forgedVerification = authService.verifyJwt(`${h}.${forgedPayload}.${s}`);
    assert.equal(forgedVerification.valid, false);
    assert.match(forgedVerification.error, /signature/i);

    // Expired token rejection
    const expiredJwt = authService.signJwt({ sub: 'USR-03', role: 'developer' }, -10);
    const expiredVerification = authService.verifyJwt(expiredJwt.token);
    assert.equal(expiredVerification.valid, false);
    assert.match(expiredVerification.error, /expired/i);

    // RBAC enforcement between CISO (group_admin) and Developer (developer)
    const devSession = authService.authenticate({ role: 'developer' });
    const mockDevReq = { headers: { authorization: `Bearer ${devSession.token}` } };
    const mockAdminReq = { headers: { authorization: `Bearer ${adminSession.token}` } };

    const devOnAdminRoute = authService.authorize(mockDevReq, ['group_admin']);
    assert.equal(devOnAdminRoute.allowed, false);
    assert.equal(devOnAdminRoute.statusCode, 403);

    const adminOnAdminRoute = authService.authorize(mockAdminReq, ['group_admin']);
    assert.equal(adminOnAdminRoute.allowed, true);
  });

  it('4. GitHub Webhook HMAC-SHA256 Strict Signature Verification (Anti-Bypass)', () => {
    const secret = 'test-webhook-hmac-secret-2026';
    const rawBody = JSON.stringify({ ref: 'refs/heads/main', repository: { full_name: 'corp/paycore' } });
    const validSig = `sha256=${crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;

    assert.equal(verifyGitHubSignature(rawBody, validSig, secret), true, 'Valid HMAC must pass');
    assert.equal(verifyGitHubSignature(rawBody, undefined, secret), false, 'Missing signature header must be blocked');
    assert.equal(verifyGitHubSignature(rawBody, '', secret), false, 'Empty signature header must be blocked');
    assert.equal(verifyGitHubSignature(rawBody, 'sha256=0000000000000000000000000000000000000000000000000000000000000000', secret), false, 'Forged HMAC must be blocked');
  });

  it('5. Sliding-Window Rate Limiter & OWASP Zero-Trust Security Headers', () => {
    const testIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
    let lastResult = null;
    for (let i = 0; i < 30; i++) {
      lastResult = securityGuard.evaluateRateLimit(testIp, '/api/vault/kms/rotate');
      assert.equal(lastResult.allowed, true);
    }
    const throttled = securityGuard.evaluateRateLimit(testIp, '/api/vault/kms/rotate');
    assert.equal(throttled.allowed, false, '31st request to vault bucket within 60s must be throttled');
    assert.equal(throttled.bucket, 'vault');
    assert.ok(throttled.retryAfterSec >= 1);

    const headers = securityGuard.getSecurityHeaders(throttled);
    assert.equal(headers['X-Frame-Options'], 'DENY');
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.ok(headers['Retry-After']);
  });
});
