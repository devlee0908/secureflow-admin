/**
 * SecureFlow Unified KMS Manager
 * Dispatches key wrapping, unwrapping, and rotation across active KMS providers.
 */

import {
  LocalSoftwareHsmProvider,
  HashiCorpVaultKmsProvider,
  AwsCloudKmsProvider,
} from './providers.js';

class KmsManager {
  constructor() {
    this.providers = {
      'software-hsm': new LocalSoftwareHsmProvider(),
      'hashicorp-vault': new HashiCorpVaultKmsProvider(),
      'aws-kms': new AwsCloudKmsProvider(),
    };

    const initialType = process.env.KMS_PROVIDER || 'software-hsm';
    this.activeProviderType = this.providers[initialType] ? initialType : 'software-hsm';
  }

  getActiveProvider() {
    return this.providers[this.activeProviderType];
  }

  setProvider(providerType) {
    if (!this.providers[providerType]) {
      throw new Error(`지원하지 않는 KMS 제공자 유형입니다: ${providerType}`);
    }
    this.activeProviderType = providerType;
    return this.getProviderInfo();
  }

  wrapKey(dekBuffer) {
    return this.getActiveProvider().wrapKey(dekBuffer);
  }

  unwrapKey(wrappedPayload, kekId, providerType) {
    const targetProvider = providerType && this.providers[providerType]
      ? this.providers[providerType]
      : this.getActiveProvider();
    return targetProvider.unwrapKey(wrappedPayload, kekId);
  }

  rotateActiveKey() {
    return this.getActiveProvider().rotateKey();
  }

  getProviderInfo() {
    const active = this.getActiveProvider().getProviderInfo();
    return {
      ...active,
      activeProviderType: this.activeProviderType,
      availableProviders: Object.keys(this.providers).map((key) => ({
        id: key,
        name: this.providers[key].name,
        type: this.providers[key].type,
        isActive: key === this.activeProviderType,
      })),
    };
  }
}

export const kmsManager = new KmsManager();
