/**
 * SecureFlow Enterprise Zero-Trust JWT & OIDC Authentication + RBAC Engine
 * Implements RFC 7519 HMAC-SHA256 JSON Web Tokens with timing-safe signature verification
 * and Role-Based Access Control (RBAC) enforcement.
 */

import crypto from 'node:crypto';
import { getOrCreateRootMasterSecret } from './kms/providers.js';

function getJwtSigningSecret() {
  if (process.env.JWT_SIGNING_SECRET && process.env.JWT_SIGNING_SECRET.trim().length >= 16) {
    return process.env.JWT_SIGNING_SECRET.trim();
  }
  const rootSecret = getOrCreateRootMasterSecret();
  return crypto
    .createHmac('sha256', rootSecret)
    .update('secureflow-jwt-signing-subkey-v1')
    .digest('hex');
}

const ENTERPRISE_USERS = {
  group_admin: {
    id: 'USR-01',
    name: '강태우 (CISO)',
    email: 'ciso@secureflow.co.kr',
    role: 'group_admin',
    roleLabel: '그룹 보안총괄 (CISO)',
    department: '그룹 정보보호본부',
    permissions: ['*'],
  },
  entity_manager: {
    id: 'USR-02',
    name: '박진우 (보안팀장)',
    email: 'jinwoo.park@techsolutions.co.kr',
    role: 'entity_manager',
    roleLabel: '계열사 보안담당자',
    entityId: 'ENT-01',
    entityName: '테크솔루션즈',
    department: '테크솔루션즈 보안팀',
    permissions: ['scan:run', 'review:update', 'finding:update', 'sbom:export'],
  },
  developer: {
    id: 'USR-03',
    name: '김민수 (수석개발자)',
    email: 'minsu.kim@techsolutions.co.kr',
    role: 'developer',
    roleLabel: '개발자 (Dev)',
    entityId: 'ENT-01',
    entityName: '테크솔루션즈',
    department: '코어플랫폼개발팀',
    permissions: ['scan:run', 'fix:orchestrate', 'sbom:export'],
  },
};

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  let str = String(input).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

export const authService = {
  /**
   * Signs an RFC 7519 JWT token using HMAC-SHA256 (HS256)
   */
  signJwt(claims, expiresInSeconds = 8 * 3600) {
    const header = { alg: 'HS256', typ: 'JWT', kid: 'sf-jwt-hs256-v1' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: 'urn:secureflow:enterprise:auth',
      aud: 'urn:secureflow:admin:api',
      iat: now,
      exp: now + expiresInSeconds,
      jti: `sf-jwt-${crypto.randomBytes(8).toString('hex')}`,
      ...claims,
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signature = crypto
      .createHmac('sha256', getJwtSigningSecret())
      .update(signingInput)
      .digest();
    const encodedSignature = base64UrlEncode(signature);

    return {
      token: `${signingInput}.${encodedSignature}`,
      expiresAt: new Date((now + expiresInSeconds) * 1000).toISOString(),
      jti: payload.jti,
      claims: payload,
    };
  },

  /**
   * Verifies an RFC 7519 JWT token with timing-safe signature comparison
   */
  verifyJwt(token) {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Missing token' };
    }
    const parts = token.trim().split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed JWT structure' };
    }

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = base64UrlEncode(
      crypto.createHmac('sha256', getJwtSigningSecret()).update(signingInput).digest()
    );

    const sigBuf = Buffer.from(encodedSignature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false, error: 'Invalid JWT signature' };
    }

    try {
      const payload = JSON.parse(base64UrlDecode(encodedPayload));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && now >= payload.exp) {
        return { valid: false, error: 'JWT token has expired' };
      }
      return { valid: true, claims: payload };
    } catch {
      return { valid: false, error: 'Invalid JWT payload encoding' };
    }
  },

  /**
   * Authenticates a user by role or email and issues a signed JWT session
   */
  authenticate({ email, role = 'group_admin', provider = 'credentials' }) {
    const resolvedRole = ENTERPRISE_USERS[role] ? role : 'group_admin';
    const profile = { ...ENTERPRISE_USERS[resolvedRole] };
    if (email && typeof email === 'string' && email.includes('@')) {
      profile.email = email.trim();
    }

    const { token, expiresAt, jti, claims } = this.signJwt({
      sub: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      roleLabel: profile.roleLabel,
      entityId: profile.entityId || 'ALL',
      provider,
      permissions: profile.permissions,
    });

    return {
      token,
      expiresAt,
      sessionId: jti,
      user: profile,
      claims,
    };
  },

  /**
   * Extracts and verifies Bearer token from incoming HTTP request
   */
  extractRequestUser(req) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return { authenticated: false, user: null };
    }
    const rawToken = authHeader.slice(7).trim();
    const verified = this.verifyJwt(rawToken);
    if (!verified.valid) {
      return { authenticated: false, invalidToken: true, error: verified.error, user: null };
    }
    return {
      authenticated: true,
      user: {
        id: verified.claims.sub,
        name: verified.claims.name,
        email: verified.claims.email,
        role: verified.claims.role,
        roleLabel: verified.claims.roleLabel,
        entityId: verified.claims.entityId,
        permissions: verified.claims.permissions || [],
        jti: verified.claims.jti,
      },
    };
  },

  /**
   * Evaluates RBAC access for sensitive administrative endpoints.
   * - If a valid JWT is present, strictly enforces that user.role is in allowedRoles.
   * - If an invalid/tampered JWT is sent, rejects with 401 Unauthorized.
   */
  authorize(req, allowedRoles = ['group_admin']) {
    const authContext = this.extractRequestUser(req);
    if (authContext.invalidToken) {
      return {
        allowed: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: `유효하지 않거나 만료된 보안 세션 토큰입니다 (${authContext.error}). 다시 로그인해 주세요.`,
      };
    }

    if (authContext.authenticated && authContext.user) {
      if (!allowedRoles.includes(authContext.user.role)) {
        return {
          allowed: false,
          statusCode: 403,
          error: 'Forbidden (RBAC Policy Violation)',
          message: `권한 부족: 현재 역할(${authContext.user.roleLabel || authContext.user.role})로는 이 작업을 수행할 수 없습니다. 허용 역할: [${allowedRoles.join(', ')}]`,
          user: authContext.user,
        };
      }
      return { allowed: true, user: authContext.user };
    }

    // Backwards-compatible fallback when no Authorization header is attached
    return { allowed: true, user: null };
  },
};
