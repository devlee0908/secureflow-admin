/**
 * SecureFlow Enterprise Zero-Trust API Security Guard & Sliding-Window Rate Limiter
 * Provides DDoS / Brute-force rate limiting, OWASP HTTP Security Headers, and telemetry.
 */

class EnterpriseSecurityGuard {
  constructor() {
    this.windows = new Map(); // key: `${ip}:${bucket}` -> array of timestamps
    this.limits = {
      webhook: { windowMs: 60000, max: 60 },
      vault: { windowMs: 60000, max: 30 },
      general: { windowMs: 60000, max: 300 },
    };
    this.stats = {
      totalRequestsChecked: 0,
      throttledRequests: 0,
      invalidSignaturesBlocked: 0,
      vaultAuthenticatedCalls: 0,
      sbomAttestationsGenerated: 0,
      startedAt: new Date().toISOString(),
    };
  }

  resolveBucket(pathname) {
    if (pathname.startsWith('/api/webhooks')) return 'webhook';
    if (pathname.startsWith('/api/vault') || pathname.startsWith('/api/credentials') || pathname.startsWith('/api/github')) {
      return 'vault';
    }
    return 'general';
  }

  evaluateRateLimit(ip = '127.0.0.1', pathname = '/api') {
    this.stats.totalRequestsChecked++;
    const bucket = this.resolveBucket(pathname);
    const config = this.limits[bucket] || this.limits.general;
    const key = `${ip}:${bucket}`;
    const now = Date.now();
    const cutoff = now - config.windowMs;

    let timestamps = this.windows.get(key) || [];
    timestamps = timestamps.filter((t) => t > cutoff);

    if (timestamps.length >= config.max) {
      this.stats.throttledRequests++;
      const oldest = timestamps[0] || now;
      const retryAfterSec = Math.max(1, Math.ceil((oldest + config.windowMs - now) / 1000));
      return {
        allowed: false,
        bucket,
        limit: config.max,
        remaining: 0,
        retryAfterSec,
        resetAt: new Date(oldest + config.windowMs).toISOString(),
      };
    }

    timestamps.push(now);
    this.windows.set(key, timestamps);

    return {
      allowed: true,
      bucket,
      limit: config.max,
      remaining: Math.max(0, config.max - timestamps.length),
      retryAfterSec: 0,
      resetAt: new Date(now + config.windowMs).toISOString(),
    };
  }

  getSecurityHeaders(rateLimitResult) {
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-SecureFlow-ZeroTrust': 'Enforced-v2.4',
    };

    if (rateLimitResult) {
      headers['X-RateLimit-Bucket'] = rateLimitResult.bucket;
      headers['X-RateLimit-Limit'] = String(rateLimitResult.limit);
      headers['X-RateLimit-Remaining'] = String(rateLimitResult.remaining);
      headers['X-RateLimit-Reset'] = rateLimitResult.resetAt;
      if (!rateLimitResult.allowed) {
        headers['Retry-After'] = String(rateLimitResult.retryAfterSec);
      }
    }

    return headers;
  }

  recordSignatureBlock() {
    this.stats.invalidSignaturesBlocked++;
  }

  recordVaultCall() {
    this.stats.vaultAuthenticatedCalls++;
  }

  recordSbomGenerated() {
    this.stats.sbomAttestationsGenerated++;
  }

  getStats() {
    return {
      ...this.stats,
      activeClientsTracked: this.windows.size,
      policies: {
        webhookLimit: `${this.limits.webhook.max} req/min`,
        vaultLimit: `${this.limits.vault.max} req/min`,
        generalLimit: `${this.limits.general.max} req/min`,
        owaspHeaders: ['HSTS', 'X-Frame-Options: DENY', 'X-Content-Type-Options: nosniff', 'Referrer-Policy'],
      },
    };
  }
}

export const securityGuard = new EnterpriseSecurityGuard();
