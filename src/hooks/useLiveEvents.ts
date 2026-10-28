import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export interface WebhookEventPayload {
  deliveryId: string;
  eventType: string;
  repository: string;
  branch: string;
  commitId: string;
  commitMessage?: string;
  author?: string;
  gateStatus: string;
  runId: string;
  projectId?: string;
}

export function useLiveEvents(options?: {
  onWebhookReceived?: (data: WebhookEventPayload) => void;
  onAuditLogged?: (data: any) => void;
  onOverrideApproved?: (data: any) => void;
  onFindingUpdated?: (data: any) => void;
  onReviewUpdated?: (data: any) => void;
  onDatabaseEngineChanged?: (data: any) => void;
  onScannerJobCompleted?: (data: any) => void;
  onNotificationDlqAppended?: (data: any) => void;
  onNotificationDlqResolved?: (data: any) => void;
  onKmsKeyRotated?: (data: any) => void;
}) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    // Check if EventSource is supported
    if (typeof EventSource === 'undefined') return;

    let sse: EventSource;
    try {
      sse = new EventSource('/api/events');
      eventSourceRef.current = sse;
    } catch {
      return;
    }

    sse.addEventListener('connected', (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        console.log('[SSE] Connected to SecureFlow Real-time Event Bus:', payload);
      } catch {}
    });

    sse.addEventListener('webhook_received', (e: MessageEvent) => {
      try {
        const data: WebhookEventPayload = JSON.parse(e.data);
        toast.info(`⚡ [실시간 Webhook 감지] ${data.repository} (${data.branch})`, {
          description: `커밋 @${data.commitId} 수신 ➔ 보안 게이트 판정: ${data.gateStatus.toUpperCase()}`,
          duration: 6000,
        });
        if (optionsRef.current?.onWebhookReceived) {
          optionsRef.current.onWebhookReceived(data);
        }
      } catch (err) {
        console.warn('[SSE] Failed to parse webhook event:', err);
      }
    });

    sse.addEventListener('override_approved', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.warning(`🚨 [CISO 비상 배포 예외 승인 등록]`, {
          description: `${data.approver}에 의해 ${data.runId} 건의 배포 게이트가 승인되었습니다.`,
          duration: 6000,
        });
        if (optionsRef.current?.onOverrideApproved) {
          optionsRef.current.onOverrideApproved(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('audit_logged', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (optionsRef.current?.onAuditLogged) {
          optionsRef.current.onAuditLogged(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('finding_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (optionsRef.current?.onFindingUpdated) {
          optionsRef.current.onFindingUpdated(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('findings_batch_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (optionsRef.current?.onFindingUpdated) {
          optionsRef.current.onFindingUpdated(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('review_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (optionsRef.current?.onReviewUpdated) {
          optionsRef.current.onReviewUpdated(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('database_engine_changed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.info(`🔄 [데이터베이스 엔진 전환 감지]`, {
          description: data.engineInfo?.engine || '데이터베이스 엔진이 변경되었습니다.',
        });
        if (optionsRef.current?.onDatabaseEngineChanged) {
          optionsRef.current.onDatabaseEngineChanged(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('scanner_job_completed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (optionsRef.current?.onScannerJobCompleted) {
          optionsRef.current.onScannerJobCompleted(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('notification_dlq_appended', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.error(`⚠️ [알림 발송 실패 ➔ DLQ 격리 보관]`, {
          description: `${data.channelName} 채널 발송 3회 재시도 실패: ${data.lastError}`,
          duration: 6000,
        });
        if (optionsRef.current?.onNotificationDlqAppended) {
          optionsRef.current.onNotificationDlqAppended(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('notification_dlq_resolved', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.success(`✅ [DLQ 메시지 재발송 완료]`, {
          description: `${data.channelName} 채널로 알림이 성공적으로 재전송되었습니다.`,
        });
        if (optionsRef.current?.onNotificationDlqResolved) {
          optionsRef.current.onNotificationDlqResolved(data);
        }
      } catch (err) {}
    });

    sse.addEventListener('kms_key_rotated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        toast.info(`🔑 [KMS 마스터 KEK 키 로테이션 감지]`, {
          description: `버전 ${data.rotationResult?.version} 적용 (${data.rotationResult?.reWrappedCount}건 DEK 재래핑 완료)`,
        });
        if (optionsRef.current?.onKmsKeyRotated) {
          optionsRef.current.onKmsKeyRotated(data);
        }
      } catch (err) {}
    });

    sse.onerror = () => {
      // Browser EventSource automatically attempts reconnection
      console.debug('[SSE] EventSource reconnecting...');
    };

    return () => {
      sse.close();
      eventSourceRef.current = null;
    };
  }, []);
}
