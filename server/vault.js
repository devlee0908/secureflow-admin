import crypto from 'node:crypto';
import { kmsManager } from './kms/index.js';

// Legacy fallback secret for backward-compatible migration
const LEGACY_VAULT_SECRET = process.env.SECUREFLOW_VAULT_SECRET || 'secureflow-master-vault-encryption-key-2026';
const LEGACY_KEY = crypto.createHash('sha256').update(LEGACY_VAULT_SECRET).digest();

export const vaultService = {
  /**
   * Envelope Encryption (DEK + KEK)
   * 1. Generate random 256-bit ephemeral DEK
   * 2. Encrypt plaintext using DEK (AES-256-GCM)
   * 3. Wrap DEK using Master KEK via KMS Provider
   * 4. Zeroize DEK memory buffer
   */
  encrypt(plaintext) {
    // 1. Generate high-entropy DEK
    const dek = crypto.randomBytes(32);
    const iv = crypto.randomBytes(12);

    // 2. Encrypt data with DEK
    const cipher = crypto.createCipheriv('aes-256-gcm', dek, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // 3. Wrap DEK with KMS KEK
    const wrapResult = kmsManager.wrapKey(dek);

    // 4. Zeroize plaintext DEK buffer for memory safety
    dek.fill(0);

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag,
      wrappedDek: wrapResult.wrappedDekHex,
      kekId: wrapResult.kekId,
      kmsProvider: kmsManager.activeProviderType,
    };
  },

  /**
   * Envelope Decryption
   * 1. Unwrap DEK from KMS using KEK
   * 2. Decrypt data using DEK with AES-256-GCM
   * 3. Zeroize DEK buffer
   * 4. Fallback to legacy decryption if record was created before envelope encryption
   */
  decrypt(encryptedHex, ivHex, authTagHex, wrappedDekHex, kekId, kmsProvider) {
    try {
      let dek;

      if (wrappedDekHex) {
        // Modern Envelope Encryption path
        dek = kmsManager.unwrapKey(wrappedDekHex, kekId, kmsProvider);
      } else {
        // Legacy single-key fallback
        dek = LEGACY_KEY;
      }

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', dek, iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      if (wrappedDekHex && Buffer.isBuffer(dek)) {
        dek.fill(0);
      }

      return decrypted;
    } catch (err) {
      console.warn('[Vault Envelope] Decryption failed:', err.message);
      return null;
    }
  },

  /**
   * Zero-Downtime Re-wrapping of DEK during KEK rotation
   * Unwraps the DEK using the old KEK, then wraps it with the new active KEK.
   * Note: The underlying plaintext payload is NEVER decrypted or touched!
   */
  reWrapDek(wrappedDekHex, oldKekId, oldProvider) {
    const dek = kmsManager.unwrapKey(wrappedDekHex, oldKekId, oldProvider);
    const wrapResult = kmsManager.wrapKey(dek);
    dek.fill(0);
    return {
      newWrappedDek: wrapResult.wrappedDekHex,
      newKekId: wrapResult.kekId,
      newProvider: kmsManager.activeProviderType,
    };
  },

  maskToken(token) {
    if (!token || token.length < 8) return '****';
    const prefix = token.substring(0, 4);
    const suffix = token.substring(token.length - 4);
    return `${prefix}****...${suffix}`;
  },

  getKmsInfo() {
    return kmsManager.getProviderInfo();
  },

  rotateKmsMasterKey() {
    return kmsManager.rotateActiveKey();
  },

  setKmsProvider(type) {
    return kmsManager.setProvider(type);
  },
};
