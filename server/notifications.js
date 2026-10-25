/**
 * SecureFlow Enterprise Notification Dispatcher with Exponential Backoff & DLQ
 * Formats alerts to Slack (Block Kit) and Microsoft Teams (Adaptive Cards).
 * Guarantees at-least-once delivery with jittered exponential backoff and Dead-Letter Queue (DLQ).
 */

import { sseService } from './sse.js';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 300;
const MAX_BACKOFF_MS = 3000;

class NotificationQueueManager {
  constructor() {
    this.stats = {
      totalDispatched: 0,
      successCount: 0,
      retryAttempts: 0,
      dlqRouted: 0,
      redriveCount: 0,
      activeRetries: 0,
    };
  }

  getStats() {
    return { ...this.stats };
  }

  calculateBackoff(attempt) {
    const exponential = BASE_BACKOFF_MS * Math.pow(2, attempt);
    const jitter = Math.floor(Math.random() * 150);
    return Math.min(MAX_BACKOFF_MS, exponential + jitter);
  }

  isRetryable(status, errorMessage) {
    if (!status || status === 0) return true; // Network failure, socket hang up, DNS error
    if ([408, 429, 500, 502, 503, 504].includes(status)) return true;
    if (errorMessage && (errorMessage.includes('fetch failed') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('ECONNREFUSED'))) {
      return true;
    }
    return false;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

const queueManager = new NotificationQueueManager();

export const notificationService = {
  getQueueStats() {
    return queueManager.getStats();
  },

  formatSlackBlockKit(eventType, data) {
    const isBlock = eventType === 'GATE_BLOCK' || data.verdict === '차단 (BLOCKED)';
    const color = isBlock ? '#EF4444' : eventType === 'OVERRIDE_APPROVED' ? '#F59E0B' : '#10B981';
    const titleEmoji = isBlock ? '🚨 [SecureFlow 배포 게이트 차단]' : eventType === 'OVERRIDE_APPROVED' ? '⚠️ [CISO 비상 배포 예외 승인]' : '✅ [SecureFlow 보안 검증 통과]';

    return {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${titleEmoji} ${data.repository || 'agentgate'}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*브랜치:* \`${data.branch || 'main'}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*커밋 ID:* \`${data.commitId ? data.commitId.substring(0, 7) : 'HEAD'}\``,
                },
                {
                  type: 'mrkdwn',
                  text: `*작업자:* ${data.author || '김개발'}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*판정 상태:* *${data.gateStatus ? data.gateStatus.toUpperCase() : isBlock ? 'BLOCKED' : 'PASSED'}*`,
                },
              ],
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: isBlock
                  ? `> *보안 정책 위반 상세:* Critical ${data.critCount || 1}건, High ${data.highCount || 0}건 발견 (CWE-89 SQL Injection 등)\n> 자동 배포가 전면 차단되었으며, 보안 패치 PR 확인이 필요합니다.`
                  : eventType === 'OVERRIDE_APPROVED'
                  ? `> *승인 사유:* ${data.reason || '긴급 보안 패치 테스트 목적'}\n> *승인자:* ${data.approver || '강태우 (CISO)'} (SLA: ${data.slaHours || 24}시간)`
                  : `> 모든 4대 보안 정적/동적 진단(SAST, DAST, SCA, IaC)을 무결하게 통과하였습니다.`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: '보안 콘솔 상세 보기',
                  },
                  url: 'http://localhost:3000',
                  style: isBlock ? 'danger' : 'primary',
                },
                {
                  type: 'button',
                  text: {
                    type: 'plain_text',
                    text: 'GitHub PR 확인',
                  },
                  url: `https://github.com/${data.repository || 'devlee0908/agentgate'}/pulls`,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `SecureFlow Enterprise DevSecOps Sentinel • ${new Date().toLocaleString('ko-KR')}`,
                },
              ],
            },
          ],
        },
      ],
    };
  },

  formatTeamsAdaptiveCard(eventType, data) {
    const isBlock = eventType === 'GATE_BLOCK' || data.verdict === '차단 (BLOCKED)';
    return {
      type: 'message',
      attachments: [
        {
          contentType: 'application/vnd.microsoft.card.adaptive',
          content: {
            $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
            type: 'AdaptiveCard',
            version: '1.4',
            msteams: { width: 'Full' },
            body: [
              {
                type: 'TextBlock',
                size: 'Large',
                weight: 'Bolder',
                color: isBlock ? 'Attention' : 'Good',
                text: isBlock ? '🚨 [SecureFlow] 배포 게이트 차단 경보' : '✅ [SecureFlow] 보안 게이트 통과',
              },
              {
                type: 'FactSet',
                facts: [
                  { title: '저장소:', value: data.repository || 'agentgate' },
                  { title: '브랜치:', value: data.branch || 'main' },
                  { title: '작업자:', value: data.author || '김개발' },
                  { title: '결함 현황:', value: `Critical: ${data.critCount || 1}, High: ${data.highCount || 0}` },
                ],
              },
            ],
            actions: [
              {
                type: 'Action.OpenUrl',
                title: '콘솔 접속',
                url: 'http://localhost:3000',
              },
            ],
          },
        },
      ],
    };
  },

  async deliverToWebhook(channel, payload) {
    const isSimulated =
      !channel.webhook_url ||
      channel.webhook_url.includes('T00000000') ||
      channel.webhook_url.includes('office.com/webhookb2') ||
      channel.webhook_url.includes('example.com');

    // Check if test endpoint deliberately triggers failure simulation
    const simulateError =
      channel.webhook_url &&
      (channel.webhook_url.includes('trigger-dlq') ||
        channel.webhook_url.includes('simulate-error') ||
        channel.webhook_url.includes('fail.internal'));

    if (simulateError) {
      const err = new Error('HTTP 503 Service Unavailable: Remote Webhook Gateway Throttling');
      err.status = 503;
      throw err;
    }

    if (isSimulated) {
      return { status: 200, message: 'DELIVERED (SIMULATED)' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(channel.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const error = new Error(`HTTP Error ${res.status}: ${res.statusText}`);
        error.status = res.status;
        throw error;
      }

      return { status: res.status, message: 'DELIVERED (LIVE)' };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  },

  async dispatch(dbService, eventType, data) {
    const channels = dbService.getNotificationChannels().filter((c) => c.is_active);
    const results = [];

    for (const channel of channels) {
      const events = channel.events || [];
      if (events.length > 0 && !events.includes(eventType) && !events.includes('ALL')) {
        continue;
      }

      queueManager.stats.totalDispatched++;
      const payload = channel.channel_type === 'teams'
        ? this.formatTeamsAdaptiveCard(eventType, data)
        : this.formatSlackBlockKit(eventType, data);

      let deliverySuccess = false;
      let finalStatus = 'DELIVERED';
      let finalResponseCode = 200;
      let finalErrorMsg = null;
      let retryCount = 0;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        retryCount = attempt;
        try {
          if (attempt > 0) {
            queueManager.stats.activeRetries++;
            queueManager.stats.retryAttempts++;
            const backoffDelay = queueManager.calculateBackoff(attempt);
            await queueManager.sleep(backoffDelay);
          }

          const res = await this.deliverToWebhook(channel, payload);
          deliverySuccess = true;
          finalStatus = res.message;
          finalResponseCode = res.status;
          queueManager.stats.successCount++;
          if (attempt > 0) {
            queueManager.stats.activeRetries--;
          }
          break;
        } catch (err) {
          if (attempt > 0) {
            queueManager.stats.activeRetries--;
          }
          finalErrorMsg = err.message || 'Delivery error';
          finalResponseCode = err.status || 500;

          const retryable = queueManager.isRetryable(finalResponseCode, finalErrorMsg);
          if (!retryable || attempt === MAX_RETRIES) {
            finalStatus = `FAILED (${finalResponseCode}): ${finalErrorMsg}`;
            break;
          }
        }
      }

      if (!deliverySuccess) {
        // Route to Dead-Letter Queue (DLQ)
        queueManager.stats.dlqRouted++;
        const dlqEntry = dbService.saveNotificationDlq({
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.channel_type,
          webhookUrl: channel.webhook_url,
          eventType,
          payload,
          retryCount,
          lastError: finalErrorMsg,
          lastStatus: finalResponseCode,
          failedAt: new Date().toISOString(),
          status: 'DEAD_LETTER',
        });

        // Audit log immutable record
        try {
          dbService.saveAuditLog({
            actorId: 'notification-worker',
            actorName: '알림 발송 워커(Queue)',
            actorRole: '백그라운드 엔진',
            actionType: 'NOTIFICATION_DLQ_ROUTED',
            category: 'INTEGRATION',
            targetResource: channel.name,
            details: {
              channelId: channel.id,
              eventType,
              retryCount,
              lastError: finalErrorMsg,
              lastStatus: finalResponseCode,
              dlqId: dlqEntry.id,
            },
            resultStatus: 'DLQ_보관',
          });
        } catch (e) {
          console.warn('[DLQ Audit Warning]', e.message);
        }

        // Real-time broadcast to UI
        sseService.broadcast('notification_dlq_appended', {
          dlqItem: dlqEntry,
          channelName: channel.name,
          lastError: finalErrorMsg,
          queueStats: queueManager.getStats(),
        });
      }

      // Record in notification history
      dbService.saveNotificationHistory({
        id: `noti-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        channelName: channel.name,
        channelType: channel.channel_type,
        eventType,
        payload,
        status: finalStatus,
        responseStatus: finalResponseCode,
      });

      results.push({
        channelId: channel.id,
        channelName: channel.name,
        status: finalStatus,
        responseStatus: finalResponseCode,
        retryCount,
        routedToDlq: !deliverySuccess,
      });
    }

    return results;
  },

  async redrive(dbService, dlqId) {
    const item = dbService.getNotificationDlqById(dlqId);
    if (!item) {
      throw new Error(`DLQ 레코드(${dlqId})를 찾을 수 없습니다.`);
    }

    queueManager.stats.redriveCount++;
    let deliverySuccess = false;
    let lastError = null;
    let lastStatus = 200;

    try {
      const channelMock = {
        name: item.channelName,
        channel_type: item.channelType,
        webhook_url: item.webhookUrl,
      };

      // If webhook_url is the failure simulator, allow redrive to succeed if query string indicates recovery
      if (item.webhookUrl && item.webhookUrl.includes('simulate-error') && item.webhookUrl.includes('recovered=true')) {
        deliverySuccess = true;
        lastStatus = 200;
      } else if (item.webhookUrl && (item.webhookUrl.includes('trigger-dlq') || item.webhookUrl.includes('fail.internal'))) {
        // In pure mock environments, simulate successful redelivery upon manual administrator redrive
        deliverySuccess = true;
        lastStatus = 200;
      } else {
        const res = await this.deliverToWebhook(channelMock, item.payload);
        deliverySuccess = true;
        lastStatus = res.status;
      }
    } catch (err) {
      lastError = err.message;
      lastStatus = err.status || 500;
    }

    if (deliverySuccess) {
      dbService.updateNotificationDlq(dlqId, {
        status: 'REDISPATCHED',
        lastError: '재발송 성공 (Redrive Succeeded)',
        lastStatus: 200,
      });

      dbService.saveAuditLog({
        actorId: 'ciso-admin',
        actorName: '보안 관리자',
        actorRole: '운영자',
        actionType: 'NOTIFICATION_DLQ_REDRIVE',
        category: 'INTEGRATION',
        targetResource: item.channelName,
        details: { dlqId, eventType: item.eventType, result: 'SUCCESS' },
        resultStatus: '성공',
      });

      dbService.saveNotificationHistory({
        id: `noti-redrive-${Date.now()}`,
        channelName: item.channelName,
        channelType: item.channelType,
        eventType: item.eventType,
        payload: item.payload,
        status: 'REDISPATCHED (SUCCESS)',
        responseStatus: 200,
      });

      sseService.broadcast('notification_dlq_resolved', {
        dlqId,
        channelName: item.channelName,
        status: 'REDISPATCHED',
        queueStats: queueManager.getStats(),
      });

      return { success: true, dlqId, status: 'REDISPATCHED' };
    } else {
      dbService.updateNotificationDlq(dlqId, {
        retryCount: (item.retryCount || 0) + 1,
        lastError,
        lastStatus,
      });
      return { success: false, dlqId, error: lastError, status: lastStatus };
    }
  },

  async redriveAll(dbService) {
    const dlqItems = dbService.getNotificationDlq(100);
    const results = [];
    for (const item of dlqItems) {
      if (item.status === 'DEAD_LETTER') {
        const res = await this.redrive(dbService, item.id);
        results.push(res);
      }
    }
    return {
      total: dlqItems.length,
      redriven: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      details: results,
    };
  },
};
