/**
 * SecureFlow Real Backend API Client
 * Interacts with /api endpoints powered by Node 22 + SQLite.
 */

export interface WebhookDelivery {
  id: string;
  eventType: string;
  repository: string;
  sender: string;
  branch: string;
  commitId: string;
  status: string;
  processed_at: string;
  payload?: any;
}

export interface BackendStats {
  projects: number;
  runs: number;
  webhooks: number;
  auditLogs?: number;
  dbPath: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  category: 'GOVERNANCE' | 'SECURITY_GATE' | 'INTEGRATION' | 'AUDIT' | 'ORCHESTRATION';
  targetResource: string;
  details: any;
  ipAddress?: string;
  resultStatus: '성공' | '차단' | '반려' | '오류';
  previousHash: string;
  hashSignature: string;
}

export interface AuditVerificationResult {
  verified: boolean;
  count: number;
  firstTimestamp?: string;
  latestTimestamp?: string;
  latestHash?: string;
  brokenIndex?: number;
  brokenId?: string;
  message: string;
}

export interface DatabaseEngineInfo {
  engine: string;
  engineType: 'sqlite' | 'postgres';
  supportsScaleOut: boolean;
  version: string;
  journalMode?: string;
  dbPath?: string;
  connection?: any;
  status: string;
}

export interface ScannerWorkerStats {
  poolSize: number;
  activeWorkers: number;
  idleWorkers: number;
  queueDepth: number;
  totalDispatched: number;
  totalCompleted: number;
  totalFailed: number;
  avgDurationMs: number;
  isDegraded: boolean;
  architecture: string;
}

export interface BackendHealth {
  status: string;
  service?: string;
  version?: string;
  database: string;
  engineInfo?: DatabaseEngineInfo;
  scannerWorkers?: ScannerWorkerStats;
  stats: BackendStats;
  uptime?: number;
  time?: string;
}

export const api = {
  async getHealth(): Promise<BackendHealth | null> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[API] Backend offline or unavailable:', err);
      return null;
    }
  },

  async getScannerWorkerStats(): Promise<ScannerWorkerStats | null> {
    try {
      const res = await fetch('/api/scanners/workers');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getDatabaseEngine(): Promise<DatabaseEngineInfo | null> {
    try {
      const res = await fetch('/api/database/engine');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async switchDatabaseEngine(engine: 'postgres' | 'sqlite'): Promise<{ success: boolean; message: string; engineInfo: DatabaseEngineInfo } | null> {
    try {
      const res = await fetch('/api/database/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine }),
      });
      if (!res.ok) throw new Error('Failed to switch database engine');
      return await res.json();
    } catch (e) {
      console.warn('Failed to switch database engine:', e);
      return null;
    }
  },

  async getProjects() {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) return [];
      const data = await res.json();
      return data.projects || [];
    } catch (err) {
      console.warn('[API] Failed to fetch projects:', err);
      return [];
    }
  },

  async getRuns(projectId?: string) {
    try {
      const url = projectId ? `/api/runs?projectId=${encodeURIComponent(projectId)}` : '/api/runs';
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.runs || [];
    } catch (err) {
      console.warn('[API] Failed to fetch runs:', err);
      return [];
    }
  },

  async saveRun(run: any) {
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(run),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.run;
    } catch (err) {
      console.warn('[API] Failed to save run:', err);
      return null;
    }
  },

  async triggerWorkerScan(payload: {
    scanId?: string;
    projectId: string;
    repository?: string;
    branch?: string;
    commitId?: string;
    commitMessage?: string;
    author?: string;
    trigger?: string;
    scanTypes?: string[];
    willFail?: boolean;
  }) {
    try {
      const res = await fetch('/api/scanners/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn('[API] Failed to trigger worker scan:', err);
      return null;
    }
  },

  async getWebhookDeliveries(limit = 10): Promise<WebhookDelivery[]> {
    try {
      const res = await fetch(`/api/webhooks/deliveries?limit=${limit}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.deliveries || [];
    } catch (err) {
      console.warn('[API] Failed to fetch webhook deliveries:', err);
      return [];
    }
  },

  async dispatchTestWebhook(options: { scenario: string; author: string; branch: string }) {
    const res = await fetch('/api/webhooks/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    if (!res.ok) throw new Error('Failed to dispatch test webhook');
    return await res.json();
  },

  async submitOverride(data: {
    runId: string;
    approver: string;
    reason: string;
    detail: string;
    slaHours: number;
  }) {
    const res = await fetch('/api/overrides', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to submit override');
    return await res.json();
  },

  async getAuditLogs(limit = 100, category?: string): Promise<AuditLogEntry[]> {
    try {
      const url = category && category !== 'ALL'
        ? `/api/audit-logs?limit=${limit}&category=${encodeURIComponent(category)}`
        : `/api/audit-logs?limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.logs || [];
    } catch (err) {
      console.warn('[API] Failed to fetch audit logs:', err);
      return [];
    }
  },

  async recordAuditLog(entry: Partial<AuditLogEntry>): Promise<AuditLogEntry | null> {
    try {
      const res = await fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.log;
    } catch (err) {
      console.warn('[API] Failed to record audit log:', err);
      return null;
    }
  },

  async verifyAuditChain(): Promise<AuditVerificationResult> {
    try {
      const res = await fetch('/api/audit-logs/verify');
      if (!res.ok) throw new Error('Failed to verify audit chain');
      return await res.json();
    } catch (err: any) {
      return {
        verified: false,
        count: 0,
        message: err.message || '서명 검증 요청 실패',
      };
    }
  },

  async getGithubPatStatus(): Promise<{ configured: boolean; maskedHint: string | null; updatedAt: string | null }> {
    try {
      const res = await fetch('/api/credentials/github');
      if (!res.ok) return { configured: false, maskedHint: null, updatedAt: null };
      return await res.json();
    } catch {
      return { configured: false, maskedHint: null, updatedAt: null };
    }
  },

  async saveGithubPatToVault(token: string, actorName?: string, actorId?: string) {
    const res = await fetch('/api/credentials/github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, actorName, actorId }),
    });
    if (!res.ok) throw new Error('Failed to save PAT to secure vault');
    return await res.json();
  },

  async getNotificationChannels(): Promise<NotificationChannel[]> {
    try {
      const res = await fetch('/api/notifications/channels');
      if (!res.ok) return [];
      const data = await res.json();
      return data.channels || [];
    } catch {
      return [];
    }
  },

  async saveNotificationChannel(channel: Partial<NotificationChannel>): Promise<NotificationChannel | null> {
    try {
      const res = await fetch('/api/notifications/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channel),
      });
      if (!res.ok) throw new Error('Failed to save notification channel');
      const data = await res.json();
      return data.channel;
    } catch (e) {
      console.warn('saveNotificationChannel error:', e);
      return null;
    }
  },

  async deleteNotificationChannel(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notifications/channels/${id}`, { method: 'DELETE' });
      return res.ok;
    } catch {
      return false;
    }
  },

  async getNotificationHistory(): Promise<NotificationHistoryEntry[]> {
    try {
      const res = await fetch('/api/notifications/history');
      if (!res.ok) return [];
      const data = await res.json();
      return data.history || [];
    } catch {
      return [];
    }
  },

  async testNotification(channelId?: string, eventType = 'GATE_BLOCK'): Promise<NotificationTestResult> {
    const res = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, eventType }),
    });
    if (!res.ok) throw new Error('Failed to send test notification');
    return await res.json();
  },

  async getSyncState(): Promise<{
    version: number;
    timestamp: string;
    projects: any[];
    runs: any[];
    findings: any[];
    reviews: any[];
    policy?: any;
    gitConfig?: any;
  } | null> {
    try {
      const res = await fetch('/api/sync/state');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getFindings(projectId?: string): Promise<any[]> {
    try {
      const url = projectId ? `/api/findings?projectId=${encodeURIComponent(projectId)}` : '/api/findings';
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.findings || [];
    } catch {
      return [];
    }
  },

  async updateFinding(id: string, updates: any, actor?: any): Promise<any | null> {
    const res = await fetch(`/api/findings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, actor }),
    });
    if (!res.ok) throw new Error('Failed to update finding');
    const data = await res.json();
    return data.finding;
  },

  async batchUpdateFindings(ids: string[], updates: any, actor?: any): Promise<boolean> {
    const res = await fetch('/api/findings/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, updates, actor }),
    });
    if (!res.ok) throw new Error('Failed to batch update findings');
    return true;
  },

  async getReviews(projectId?: string): Promise<any[]> {
    try {
      const url = projectId ? `/api/reviews?projectId=${encodeURIComponent(projectId)}` : '/api/reviews';
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      return data.reviews || [];
    } catch {
      return [];
    }
  },

  async updateReview(id: string, updates: any, actor?: any): Promise<any | null> {
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates, actor }),
    });
    if (!res.ok) throw new Error('Failed to update review');
    const data = await res.json();
    return data.review;
  },

  async getNotificationQueueStats(): Promise<NotificationQueueStats | null> {
    try {
      const res = await fetch('/api/notifications/queue/stats');
      if (!res.ok) return null;
      const data = await res.json();
      return data.stats;
    } catch {
      return null;
    }
  },

  async getNotificationDlq(limit = 50): Promise<NotificationDlqItem[]> {
    try {
      const res = await fetch(`/api/notifications/dlq?limit=${limit}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.dlq || [];
    } catch {
      return [];
    }
  },

  async redriveDlqItem(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/notifications/dlq/${id}/redrive`, {
      method: 'POST',
    });
    return await res.json();
  },

  async redriveAllDlq(): Promise<{ success: boolean; message: string; total: number; redriven: number; failed: number }> {
    const res = await fetch('/api/notifications/dlq/redrive-all', {
      method: 'POST',
    });
    return await res.json();
  },

  async deleteDlqItem(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notifications/dlq/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async clearNotificationDlq(): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/dlq', {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async simulateDlqFailure(): Promise<any> {
    const res = await fetch('/api/notifications/dlq/simulate-failure', {
      method: 'POST',
    });
    return await res.json();
  },

  async getKmsInfo(): Promise<KmsInfo | null> {
    try {
      const res = await fetch('/api/vault/kms/info');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async rotateKmsKey(actorName?: string, actorId?: string): Promise<KmsRotationResult> {
    const res = await fetch('/api/vault/kms/rotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actorName, actorId }),
    });
    if (!res.ok) throw new Error('KMS KEK Key Rotation Failed');
    return await res.json();
  },

  async switchKmsProvider(provider: string): Promise<any> {
    const res = await fetch('/api/vault/kms/provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    if (!res.ok) throw new Error('Failed to switch KMS Provider');
    return await res.json();
  },

  async getSbomBundle(projectId = 'PRJ-AGENTGATE', recordAudit = false): Promise<SbomBundle | null> {
    try {
      const res = await fetch(`/api/sbom/${encodeURIComponent(projectId)}?audit=${recordAudit}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async getSecurityGuardStats(): Promise<SecurityGuardStats | null> {
    try {
      const res = await fetch('/api/security/guard-stats');
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async orchestrateGitHubFix(payload: {
    action?: 'CREATE_FIX_BRANCH' | 'MERGE_PR';
    projectId?: string;
    repository?: string;
    branchName?: string;
    targetBranch?: string;
    commitMessage?: string;
    prTitle?: string;
    author?: string;
  }): Promise<any> {
    try {
      const res = await fetch('/api/github/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveProject(project: any): Promise<any> {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateProject(id: string, updates: any): Promise<any> {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async deleteProject(id: string): Promise<any> {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async commitAgentGateBaseline(projectId = 'PRJ-AGENTGATE'): Promise<any> {
    try {
      const res = await fetch('/api/agentgate/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async resetAgentGateBaseline(projectId = 'PRJ-AGENTGATE'): Promise<any> {
    try {
      const res = await fetch('/api/agentgate/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async savePolicy(policy: any, actor?: { id: string; name: string; role: string }): Promise<any> {
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy, actor }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async saveGitConfig(gitConfig: any, actor?: { id: string; name: string; role: string }): Promise<any> {
    try {
      const res = await fetch('/api/git-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitConfig, actor }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },
};

export interface SbomBundle {
  projectId: string;
  projectName: string;
  repository: string;
  commitId: string;
  generatedAt: string;
  summary: {
    totalComponents: number;
    licenses: Record<string, number>;
    totalVulnerabilities: number;
    openVulnerabilities: number;
    resolvedVulnerabilities: number;
    slsaLevel: string;
  };
  sbom: any;
  slsaProvenance: {
    _type: string;
    predicateType: string;
    subject: any[];
    predicate: any;
    attestation: {
      algorithm: string;
      keyId: string;
      kmsProvider: string;
      sbomDigestSha256: string;
      signature: string;
      verified: boolean;
    };
  };
}

export interface SecurityGuardStats {
  totalRequestsChecked: number;
  throttledRequests: number;
  invalidSignaturesBlocked: number;
  vaultAuthenticatedCalls: number;
  sbomAttestationsGenerated: number;
  activeClientsTracked: number;
  startedAt: string;
  policies: {
    webhookLimit: string;
    vaultLimit: string;
    generalLimit: string;
    owaspHeaders: string[];
  };
}

export interface KmsProviderItem {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

export interface KmsInfo {
  providerName: string;
  providerType: string;
  activeKeyId: string;
  totalKeyVersions: number;
  rotationCount: number;
  fipsCompliant: boolean;
  algorithm: string;
  status: string;
  lastRotatedAt?: string;
  activeProviderType: string;
  availableProviders: KmsProviderItem[];
  credentialStatus?: {
    configured: boolean;
    maskedHint: string | null;
    updatedAt: string | null;
    kekId?: string | null;
    kmsProvider?: string | null;
  };
}

export interface KmsRotationResult {
  success: boolean;
  message: string;
  newKeyId: string;
  previousKeyId?: string;
  version: number;
  reWrappedCount: number;
  totalCredentials: number;
  kmsInfo: KmsInfo;
}

export interface NotificationQueueStats {
  totalDispatched: number;
  successCount: number;
  retryAttempts: number;
  dlqRouted: number;
  redriveCount: number;
  activeRetries: number;
  dlqCount: number;
}

export interface NotificationDlqItem {
  id: string;
  channelId: string;
  channelName: string;
  channelType: string;
  webhookUrl: string;
  eventType: string;
  payload: any;
  retryCount: number;
  lastError: string;
  lastStatus: number;
  failedAt: string;
  status: 'DEAD_LETTER' | 'REDISPATCHED' | 'DISCARDED';
}

export interface NotificationChannel {
  id: string;
  name: string;
  channel_type: 'slack' | 'teams' | 'discord' | 'webhook';
  webhook_url: string;
  events: string[];
  isActive: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationHistoryEntry {
  id: string;
  channel_name: string;
  channel_type: string;
  event_type: string;
  payload: any;
  status: string;
  response_status: number;
  sent_at: string;
}

export interface NotificationTestResult {
  success: boolean;
  message: string;
  results: Array<{ channelId: string; channelName: string; status: string; responseStatus: number }>;
  slackPreview: any;
  teamsPreview: any;
}


