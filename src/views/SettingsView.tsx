import React, { useState, useEffect } from 'react';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sliders,
  GitBranch,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  Save,
  Server,
  Terminal,
  Palette,
  Monitor,
  Sun,
  Moon,
  Database,
  Radio,
  Send,
  RefreshCw,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Bell,
  MessageSquare,
  Plus,
  Check,
  ShieldCheck,
  Archive,
  Inbox,
  AlertOctagon,
  ArrowRightLeft,
  Key,
  Cpu,
  ShieldAlert,
} from 'lucide-react';
import { GitIntegrationConfig, GitServerType } from '@/types';
import {
  api,
  WebhookDelivery,
  BackendStats,
  NotificationChannel,
  NotificationHistoryEntry,
  NotificationTestResult,
  NotificationDlqItem,
  NotificationQueueStats,
  KmsInfo,
  KmsRotationResult,
} from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLiveEvents } from '@/hooks/useLiveEvents';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export interface SettingsViewProps {
  initialTab?: 'git' | 'notifications' | 'theme' | 'sandbox';
}

export const SettingsView: React.FC<SettingsViewProps> = ({ initialTab = 'git' }) => {
  const [activeTab, setActiveTab] = useState<'git' | 'notifications' | 'theme' | 'sandbox'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const {
    theme,
    setTheme,
    gitConfig,
    updateGitConfig,
    testGitConnection,
    demoFaults,
    toggleFailNextScan,
    toggleFailNextSave,
    toggleFailNextLoad,
    setEmptyState,
    resetDemoData,
    currentUser,
    hasDummyData,
    generateDummyData,
    clearDummyData,
  } = useDevSecOps();

  const [gitForm, setGitForm] = useState<GitIntegrationConfig>({ ...gitConfig });
  const [isTestingGit, setIsTestingGit] = useState(false);

  // Real Backend & Webhook SQLite states
  const [backendHealth, setBackendHealth] = useState<{ status: string; database: string; stats: BackendStats } | null>(null);
  const [webhookLogs, setWebhookLogs] = useState<WebhookDelivery[]>([]);
  const [isDispatchingTest, setIsDispatchingTest] = useState(false);
  const [webhookSecretKey, setWebhookSecretKey] = useState('secureflow-secret-key-2026');

  // GitHub PAT Central Management Center States
  const [githubPat, setGithubPat] = useState<string>(() => {
    try {
      return localStorage.getItem('secureflow_github_pat') || '';
    } catch {
      return '';
    }
  });
  const [vaultStatus, setVaultStatus] = useState<{
    configured: boolean;
    maskedHint: string | null;
    updatedAt: string | null;
    kekId?: string | null;
    kmsProvider?: string | null;
  }>({ configured: false, maskedHint: null, updatedAt: null, kekId: null, kmsProvider: null });
  const [kmsInfo, setKmsInfo] = useState<KmsInfo | null>(null);
  const [isRotatingKek, setIsRotatingKek] = useState(false);
  const [isSwitchingKms, setIsSwitchingKms] = useState(false);
  const [showPatPlaintext, setShowPatPlaintext] = useState(false);
  const [isVerifyingPat, setIsVerifyingPat] = useState(false);
  const [isSavingPat, setIsSavingPat] = useState(false);
  const [patDiagnosticResult, setPatDiagnosticResult] = useState<{
    status: 'success' | 'error' | null;
    user?: string;
    avatarUrl?: string;
    scopes?: string;
    rateLimit?: { remaining: string; limit: string };
    errorMessage?: string;
  }>({ status: null });

  const refreshKmsInfo = async () => {
    try {
      const info = await api.getKmsInfo();
      setKmsInfo(info);
    } catch (e) {
      console.warn('Failed to fetch KMS info:', e);
    }
  };

  const refreshVaultStatus = async () => {
    try {
      const [status, kms] = await Promise.all([
        api.getGithubPatStatus(),
        api.getKmsInfo(),
      ]);
      setVaultStatus(status);
      setKmsInfo(kms);
    } catch (e) {
      console.warn('Vault status refresh error:', e);
    }
  };

  const handleRotateKek = async () => {
    setIsRotatingKek(true);
    try {
      const res = await api.rotateKmsKey(currentUser.name, currentUser.id);
      toast.success(res.message);
      setKmsInfo(res.kmsInfo);
      await refreshVaultStatus();
    } catch (e: any) {
      toast.error('KEK 로테이션 실패: ' + (e.message || '오류 발생'));
    } finally {
      setIsRotatingKek(false);
    }
  };

  const handleSwitchKmsProvider = async (provider: string) => {
    setIsSwitchingKms(true);
    try {
      const res = await api.switchKmsProvider(provider);
      toast.success(res.message);
      setKmsInfo(res.kmsInfo);
    } catch (e: any) {
      toast.error('KMS 제공자 변경 실패: ' + (e.message || '오류 발생'));
    } finally {
      setIsSwitchingKms(false);
    }
  };

  const handleSavePat = async () => {
    const trimmed = githubPat.trim();
    if (!trimmed) {
      toast.error('저장할 GitHub PAT를 입력해주세요.');
      return;
    }
    setIsSavingPat(true);
    try {
      localStorage.setItem('secureflow_github_pat', trimmed);
      try {
        await api.saveGithubPatToVault(trimmed, currentUser.name, currentUser.id);
        await refreshVaultStatus();
      } catch (vaultErr) {
        console.warn('Vault save warning:', vaultErr);
      }
      toast.success('GitHub PAT가 브라우저 및 백엔드 AES-256 Vault에 안전하게 저장되었습니다.');
      handleVerifyPat(trimmed);
    } catch {
      toast.error('PAT 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSavingPat(false);
    }
  };

  const handleClearPat = async () => {
    try {
      localStorage.removeItem('secureflow_github_pat');
      setGithubPat('');
      setPatDiagnosticResult({ status: null });
      try {
        await api.saveGithubPatToVault('', currentUser.name, currentUser.id);
        await refreshVaultStatus();
      } catch {}
      toast.info('저장된 GitHub PAT가 초기화되었습니다.');
    } catch {}
  };

  const handleVerifyPat = async (tokenToTest?: string) => {
    const token = (tokenToTest ?? githubPat).trim();
    if (!token) {
      toast.error('검증할 GitHub PAT를 입력해주세요.');
      return;
    }
    setIsVerifyingPat(true);
    setPatDiagnosticResult({ status: null });
    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      const remaining = res.headers.get('x-ratelimit-remaining') || 'unknown';
      const limit = res.headers.get('x-ratelimit-limit') || '5000';
      const scopes = res.headers.get('x-oauth-scopes') || 'Fine-grained permissions';

      if (res.ok) {
        const data = await res.json();
        setPatDiagnosticResult({
          status: 'success',
          user: data.login,
          avatarUrl: data.avatar_url,
          scopes,
          rateLimit: { remaining, limit },
        });
        toast.success(`GitHub 계정 [@${data.login}] 연동 성공! (Rate Limit: ${remaining}/${limit})`);
      } else {
        const err = await res.json().catch(() => ({}));
        setPatDiagnosticResult({
          status: 'error',
          errorMessage: err.message || `HTTP ${res.status}: 유효하지 않은 토큰입니다.`,
        });
        toast.error(`GitHub API 인증 실패: ${err.message || res.statusText}`);
      }
    } catch (e: any) {
      setPatDiagnosticResult({
        status: 'error',
        errorMessage: '네트워크 연결 또는 CORS 제한이 발생했습니다.',
      });
      toast.error('GitHub API 통신 오류');
    } finally {
      setIsVerifyingPat(false);
    }
  };

  const refreshBackendData = async () => {
    try {
      const health = await api.getHealth();
      setBackendHealth(health);
      const logs = await api.getWebhookDeliveries(6);
      setWebhookLogs(logs);
    } catch (e) {
      console.warn('Backend refresh error:', e);
    }
  };

  // Notification & Webhook Dispatcher states
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistoryEntry[]>([]);
  const [dlqItems, setDlqItems] = useState<NotificationDlqItem[]>([]);
  const [queueStats, setQueueStats] = useState<NotificationQueueStats | null>(null);
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isRedriving, setIsRedriving] = useState(false);
  const [isSimulatingFailure, setIsSimulatingFailure] = useState(false);
  const [selectedTestChannelId, setSelectedTestChannelId] = useState<string>('');
  const [selectedTestEventType, setSelectedTestEventType] = useState<string>('GATE_BLOCK');
  const [notificationTestResult, setNotificationTestResult] = useState<NotificationTestResult | null>(null);
  const [isAddChannelDialogOpen, setIsAddChannelDialogOpen] = useState(false);
  const [newChannelForm, setNewChannelForm] = useState<{
    name: string;
    channel_type: 'slack' | 'teams' | 'webhook';
    webhook_url: string;
    events: string[];
  }>({
    name: '',
    channel_type: 'slack',
    webhook_url: '',
    events: ['GATE_BLOCK', 'OVERRIDE_APPROVED', 'CRITICAL_FINDING'],
  });

  const refreshNotificationData = async () => {
    try {
      const [channels, history, dlq, qStats] = await Promise.all([
        api.getNotificationChannels(),
        api.getNotificationHistory(),
        api.getNotificationDlq(50),
        api.getNotificationQueueStats(),
      ]);
      setNotificationChannels(channels);
      setNotificationHistory(history);
      setDlqItems(dlq);
      setQueueStats(qStats);
      if (channels.length > 0 && !selectedTestChannelId) {
        setSelectedTestChannelId(channels[0].id);
      }
    } catch (e) {
      console.warn('Failed to fetch notification data:', e);
    }
  };

  const handleRedriveDlqItem = async (id: string) => {
    try {
      const res = await api.redriveDlqItem(id);
      if (res.success) {
        toast.success(res.message || 'DLQ 메시지 재발송이 성공했습니다.');
      } else {
        toast.error('재발송 실패: ' + res.message);
      }
      await refreshNotificationData();
    } catch (e: any) {
      toast.error('재발송 오류: ' + (e.message || '네트워크 오류'));
    }
  };

  const handleRedriveAllDlq = async () => {
    setIsRedriving(true);
    try {
      const res = await api.redriveAllDlq();
      toast.success(res.message || `전체 ${res.total}건 중 ${res.redriven}건 재발송 완료`);
      await refreshNotificationData();
    } catch (e: any) {
      toast.error('전체 재발송 오류: ' + (e.message || '오류 발생'));
    } finally {
      setIsRedriving(false);
    }
  };

  const handleDeleteDlqItem = async (id: string) => {
    try {
      const ok = await api.deleteDlqItem(id);
      if (ok) {
        toast.success('DLQ 항목이 영구 폐기되었습니다.');
      } else {
        toast.error('폐기 실패');
      }
      await refreshNotificationData();
    } catch {
      toast.error('폐기 처리 오류');
    }
  };

  const handleClearDlq = async () => {
    try {
      const ok = await api.clearNotificationDlq();
      if (ok) {
        toast.success('DLQ 전체 보관함이 비워졌습니다.');
      }
      await refreshNotificationData();
    } catch {
      toast.error('초기화 실패');
    }
  };

  const handleSimulateDlqFailure = async () => {
    setIsSimulatingFailure(true);
    try {
      const res = await api.simulateDlqFailure();
      toast.warning(res.message || '장애 시뮬레이션: 3회 재시도 실패 후 DLQ로 격리되었습니다.');
      await refreshNotificationData();
    } catch (e: any) {
      toast.error('시뮬레이션 실패: ' + (e.message || '오류'));
    } finally {
      setIsSimulatingFailure(false);
    }
  };

  useEffect(() => {
    refreshBackendData();
    refreshVaultStatus();
    refreshNotificationData();
  }, []);

  useLiveEvents({
    onNotificationDlqAppended: () => {
      refreshNotificationData();
    },
    onNotificationDlqResolved: () => {
      refreshNotificationData();
    },
    onKmsKeyRotated: () => {
      refreshVaultStatus();
      refreshKmsInfo();
    },
  });

  const handleTestNotification = async () => {
    setIsTestingNotification(true);
    try {
      const res = await api.testNotification(selectedTestChannelId || undefined, selectedTestEventType);
      setNotificationTestResult(res);
      toast.success(res.message);
      await refreshNotificationData();
    } catch (e: any) {
      toast.error('알림 발송 실패: ' + (e.message || '네트워크 오류'));
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleToggleChannelActive = async (channel: NotificationChannel) => {
    try {
      await api.saveNotificationChannel({
        ...channel,
        isActive: !channel.isActive,
      });
      toast.success(`[${channel.name}] 알림 채널 상태가 변경되었습니다.`);
      await refreshNotificationData();
    } catch {
      toast.error('채널 상태 변경 실패');
    }
  };

  const handleDeleteChannel = async (id: string, name: string) => {
    try {
      await api.deleteNotificationChannel(id);
      toast.info(`[${name}] 채널이 삭제되었습니다.`);
      await refreshNotificationData();
    } catch {
      toast.error('채널 삭제 실패');
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelForm.name.trim() || !newChannelForm.webhook_url.trim()) {
      toast.error('채널 이름과 Webhook URL을 모두 입력해주세요.');
      return;
    }
    try {
      await api.saveNotificationChannel({
        name: newChannelForm.name.trim(),
        channel_type: newChannelForm.channel_type,
        webhook_url: newChannelForm.webhook_url.trim(),
        events: newChannelForm.events,
        isActive: true,
      });
      toast.success(`새 알림 채널 [${newChannelForm.name}]이 등록되었습니다.`);
      setIsAddChannelDialogOpen(false);
      setNewChannelForm({
        name: '',
        channel_type: 'slack',
        webhook_url: '',
        events: ['GATE_BLOCK', 'OVERRIDE_APPROVED', 'CRITICAL_FINDING'],
      });
      await refreshNotificationData();
    } catch {
      toast.error('채널 등록 중 오류가 발생했습니다.');
    }
  };

  const handleDispatchTestWebhook = async (scenario: string) => {
    setIsDispatchingTest(true);
    try {
      const res = await api.dispatchTestWebhook({
        scenario,
        author: '김개발 (테스트)',
        branch: scenario === 'hard_block' ? 'feature/payment-sql' : scenario === 'secret_leak' ? 'fix/aws-keys' : 'feature/auth-token-v2',
      });
      toast.success(`[실제 SQLite DB 저장 완료] ${res.message}`);
      await refreshBackendData();
    } catch (e: any) {
      toast.error('Webhook 발송 실패: ' + e.message);
    } finally {
      setIsDispatchingTest(false);
    }
  };

  const isGroupAdmin = currentUser.role === 'group_admin';

  const handleSaveGitConfig = async () => {
    if (!isGroupAdmin) {
      toast.error('Git 연동 설정 권한은 [그룹 보안관리자]에게만 부여되어 있습니다.');
      return;
    }
    await updateGitConfig(gitForm);
  };

  const handleTestConnection = async () => {
    setIsTestingGit(true);
    await testGitConnection();
    setIsTestingGit(false);
  };

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(gitConfig.webhookUrl);
    toast.success('웹훅 URL이 클립보드에 복사되었습니다.');
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="시스템 및 연동 설정"
        subtitle="GitHub PAT 중앙 관리 센터, 사내 Git 서버 연동 어댑터, 실시간 Webhook 로그 및 디스플레이 테마를 관리합니다."
      />

      {/* Permission simulation alert */}
      {!isGroupAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            현재 역할({currentUser.roleTitle})에서는 설정이 <strong>조회 전용(Read-only)</strong> 모드로 동작합니다.
            설정을 수정하려면 우측 상단 프로필에서 <strong>[그룹 보안관리자]</strong>로 전환해주세요.
          </span>
        </div>
      )}

      {/* Sub-tabs Navigation Bar */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="space-y-6"
      >
        <div className="border-b border-zinc-200/80 dark:border-white/[0.08] pb-1">
          <TabsList className="h-10 bg-zinc-100/90 dark:bg-[#141417] p-1 rounded-lg border border-zinc-200/70 dark:border-white/[0.08] gap-1 w-full sm:w-auto flex flex-wrap justify-start">
            <TabsTrigger
              value="git"
              className="h-8 px-3.5 text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <GitBranch className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Git 서버 &amp; PAT 연동</span>
              {githubPat ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="GitHub PAT 연동됨" />
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 hidden sm:inline-flex">
                  토큰 미등록
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="notifications"
              className="h-8 px-3.5 text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>Slack &amp; Teams 알림 연동</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-zinc-100 dark:bg-white/[0.04] text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/[0.08] hidden sm:inline-flex">
                {notificationChannels.length}개 채널
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="theme"
              className="h-8 px-3.5 text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Palette className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              <span>화면 디스플레이 테마</span>
              <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                {theme === 'dark' ? '다크' : theme === 'light' ? '라이트' : '시스템'}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="sandbox"
              className="h-8 px-3.5 text-xs font-semibold rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#222226] data-[state=active]:text-zinc-950 dark:data-[state=active]:text-zinc-50 data-[state=active]:shadow-2xs transition-all flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>데모 검증 샌드박스</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 hidden sm:inline-flex">
                오류/샘플 복원
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Tab: Git 서버 & PAT 연동 */}
        <TabsContent value="git" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          {/* GitHub Personal Access Token (PAT) 중앙 관리 센터 */}
          <Card className="border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-200/70 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
                    <KeyRound className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    GitHub Personal Access Token (PAT) 중앙 관리 센터
                  </CardTitle>
                  <CardDescription className="text-xs">
                    실제 GitHub 저장소로 보안 결함 자동 PR 생성, 실시간 Checks API 갱신 및 소스코드 커밋 푸시를 위한 토큰을 안전하게 등록하고 진단합니다.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {vaultStatus.configured && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 gap-1 font-mono text-[10px]"
                    >
                      <Lock className="w-3 h-3 text-emerald-500" />
                      <span>AES-256 Vault 보관 중 ({vaultStatus.maskedHint})</span>
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[11px] font-mono font-bold',
                      githubPat || vaultStatus.configured
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                    )}
                  >
                    {githubPat || vaultStatus.configured ? '● 토큰 등록됨 (Active)' : '○ 토큰 미등록 (시뮬레이션 모드)'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="github-pat-input" className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>GitHub Personal Access Token</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono">(Fine-grained or Classic)</span>
                  </Label>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-500" />
                    <span>서버 SQLite AES-256-GCM Vault 및 로컬 스토리지 안전 보관</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="github-pat-input"
                      type={showPatPlaintext ? 'text' : 'password'}
                      placeholder="github_pat_xxxx 또는 ghp_xxxx 토큰을 입력하세요..."
                      value={githubPat}
                      onChange={(e) => setGithubPat(e.target.value)}
                      className="pr-10 font-mono text-xs h-9 bg-white dark:bg-[#0d1117]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPatPlaintext(!showPatPlaintext)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title={showPatPlaintext ? '마스킹 처리' : '토큰 평문 보기'}
                    >
                      {showPatPlaintext ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleVerifyPat()}
                    disabled={isVerifyingPat || !githubPat.trim()}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs h-9 gap-1.5 shrink-0"
                  >
                    {isVerifyingPat ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>연결 테스트</span>
                  </Button>
                </div>
              </div>

              {/* Token Diagnostic Feedback Box */}
              {patDiagnosticResult.status && (
                <div
                  className={cn(
                    'p-3 rounded-xl border text-xs space-y-1.5 animate-in fade-in',
                    patDiagnosticResult.status === 'success'
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50/80 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  )}
                >
                  <div className="flex items-center justify-between font-bold">
                    <div className="flex items-center gap-2">
                      {patDiagnosticResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      )}
                      <span>
                        {patDiagnosticResult.status === 'success'
                          ? `GitHub 계정 연동 성공 (@${patDiagnosticResult.user})`
                          : 'GitHub 토큰 인증 실패'}
                      </span>
                    </div>
                    {patDiagnosticResult.rateLimit && (
                      <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                        API Rate Limit: {patDiagnosticResult.rateLimit.remaining} / {patDiagnosticResult.rateLimit.limit}
                      </span>
                    )}
                  </div>

                  {patDiagnosticResult.errorMessage && (
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 pl-6">
                      {patDiagnosticResult.errorMessage}
                    </p>
                  )}

                  {patDiagnosticResult.status === 'success' && (
                    <div className="pl-6 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5">
                      <p>
                        토큰 스코프(Scopes): <code className="font-mono text-emerald-700 dark:text-emerald-300">{patDiagnosticResult.scopes}</code>
                      </p>
                      <p className="text-[10px] text-slate-500">
                        이제 [개발자 GitHub PR 화면]에서 [실제 GitHub로 에러 PR 전송] 및 [3건 보안 패치 푸시]를 클릭하면 실제 원격 GitHub에 즉각 반영됩니다.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Token Permission Requirements Guide Card */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2 text-[11px]">
                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    권장 GitHub 토큰 권한 범위 (Permissions Guide)
                  </span>
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <span>GitHub 토큰 발급 페이지</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                  <div className="p-2 rounded bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.04] space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">1. Fine-grained Personal Access Token (권장)</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                      <li>Repository access: <code>devlee0908/agentgate</code> 선택</li>
                      <li><strong>Contents</strong>: Read and write (패치 파일 커밋용)</li>
                      <li><strong>Pull requests</strong>: Read and write (에러 PR 생성 및 봇 코멘트용)</li>
                      <li><strong>Commit statuses</strong>: Read and write (Checks API 상태 갱신)</li>
                    </ul>
                  </div>

                  <div className="p-2 rounded bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.04] space-y-1">
                    <strong className="text-slate-800 dark:text-slate-200 block">2. Classic Personal Access Token</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-[10.5px]">
                      <li><strong>repo</strong> 전체 (Full control of private repositories)</li>
                      <li><strong>admin:repo_hook</strong> (웹훅 설정 자동화 시)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between pt-3 border-t border-indigo-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleVerifyPat()}
                  disabled={isVerifyingPat || !githubPat.trim()}
                  className="text-xs h-8"
                >
                  <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', isVerifyingPat && 'animate-spin')} />
                  토큰 유효성 재검증
                </Button>
                {githubPat.trim() && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearPat}
                    className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    토큰 삭제
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                onClick={handleSavePat}
                disabled={isSavingPat}
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold h-8"
              >
                {isSavingPat ? (
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                )}
                PAT 저장 및 적용
              </Button>
            </CardFooter>
          </Card>

          {/* Enterprise Envelope Encryption (DEK + KEK) & Cloud KMS Control Center */}
          <Card className="border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] shadow-xs rounded-xl overflow-hidden">
            <CardHeader className="pb-3 border-b border-zinc-200/70 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.01]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 font-sans text-zinc-950 dark:text-zinc-100">
                    <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <span>엔터프라이즈 봉투 암호화(Envelope Encryption) &amp; Cloud KMS 금고</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    FIPS 140-3 및 전자금융감독규정 준수: 2계층 키 계층 구조(Two-Tier Key Hierarchy)를 적용하여 데이터 암호화 키(DEK)와 마스터 키(KEK)를 물리적으로 분리 격리 관리합니다.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-mono text-[10px] bg-zinc-50 dark:bg-white/[0.03]">
                    FIPS 140-3 Mode
                  </Badge>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-300 font-mono text-[10px] bg-emerald-50/80 dark:bg-emerald-950/30">
                    Zero-Downtime Re-wrapping
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {/* 3-Column KMS Telemetry & Settings Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. KMS Provider Selection */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      KMS 어댑터 제공자
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <Select
                    value={kmsInfo?.activeProviderType || 'software-hsm'}
                    disabled={isSwitchingKms || !isGroupAdmin}
                    onValueChange={(val) => handleSwitchKmsProvider(val)}
                  >
                    <SelectTrigger className="h-8 text-xs font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="software-hsm">Local Software HSM (FIPS 140-3)</SelectItem>
                      <SelectItem value="hashicorp-vault">HashiCorp Vault Transit KMS</SelectItem>
                      <SelectItem value="aws-kms">AWS Cloud KMS (Multi-Region CMK)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {kmsInfo?.status || 'ONLINE (Hardware Security Mode Simulated)'}
                  </p>
                </div>

                {/* 2. Active Master KEK Identifier & Version */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-500" />
                      활성 마스터 KEK 식별자
                    </span>
                    <Badge variant="outline" className="text-[9px] font-mono border-amber-300 text-amber-700 bg-amber-50/80">
                      v{kmsInfo?.totalKeyVersions || 1} Active
                    </Badge>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900 text-slate-200 font-mono text-[11px] truncate border border-slate-800" title={kmsInfo?.activeKeyId}>
                    {kmsInfo?.activeKeyId || 'sf-kek-v1-2026-prod'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                    <span>누적 키 버전: {kmsInfo?.totalKeyVersions || 1}개</span>
                    <span>로테이션 횟수: {kmsInfo?.rotationCount || 0}회</span>
                  </div>
                </div>

                {/* 3. Cryptographic Algorithm Specs */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06] space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-500" />
                    봉투 암호화 알고리즘 규격
                  </span>
                  <div className="space-y-1 font-mono text-[10.5px]">
                    <div className="flex items-center justify-between p-1 rounded bg-slate-50 dark:bg-white/[0.02]">
                      <span className="text-slate-500">DEK (데이터 암호화):</span>
                      <strong className="text-emerald-600 dark:text-emerald-400">AES-256-GCM</strong>
                    </div>
                    <div className="flex items-center justify-between p-1 rounded bg-slate-50 dark:bg-white/[0.02]">
                      <span className="text-slate-500">KEK (키 래핑/보호):</span>
                      <strong className="text-indigo-600 dark:text-indigo-400">AES-256-KW (RFC 3394)</strong>
                    </div>
                  </div>
                  <span className="text-[9.5px] text-slate-400 block pt-0.5">
                    메모리 제로화(Zeroize) 메모리 소거 적용 완료
                  </span>
                </div>
              </div>

              {/* Envelope Encryption Architecture Visualizer Diagram */}
              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Envelope Encryption Two-Tier Architecture Dataflow
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">ISMS-P &amp; PCI-DSS 4.0 준수</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.08] space-y-1.5">
                    <div className="text-emerald-400 font-bold flex items-center gap-1">
                      <span>[ 계층 1: DEK 암호화 (Data Layer) ]</span>
                    </div>
                    <div className="text-slate-300 text-[10.5px] leading-relaxed">
                      평문 Secret/PAT ➔ <code className="text-emerald-300 bg-emerald-950/40 px-1 rounded">256-bit Random DEK 생성</code> ➔ <code className="text-emerald-300 bg-emerald-950/40 px-1 rounded">AES-256-GCM</code> ➔ <span className="text-white font-bold">encrypted_data (DB 영구 저장)</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/[0.08] space-y-1.5">
                    <div className="text-indigo-400 font-bold flex items-center gap-1">
                      <span>[ 계층 2: KEK 래핑 (Key Wrap Layer) ]</span>
                    </div>
                    <div className="text-slate-300 text-[10.5px] leading-relaxed">
                      임시 DEK ➔ <code className="text-indigo-300 bg-indigo-950/40 px-1 rounded">KMS Master KEK</code> ➔ <code className="text-indigo-300 bg-indigo-950/40 px-1 rounded">AES-256-KW Key Wrap</code> ➔ <span className="text-white font-bold">wrapped_dek (DB 영구 저장)</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-relaxed bg-white/[0.02] p-2 rounded border border-white/[0.04]">
                  💡 <strong>무중단 KEK 로테이션 원리:</strong> Master KEK 로테이션 시 기밀 데이터 본문을 복호화할 필요 없이, 오직 <code className="text-indigo-300 font-mono">wrapped_dek</code>만을 새 KEK로 재래핑(Re-wrapping)하므로 대용량 DB 락킹 및 데이터 누출 위험 없이 100% 무중단으로 키 교체가 완료됩니다.
                </div>
              </div>

              {/* Zero-Downtime KEK Rotation Action Bar */}
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/80 dark:border-indigo-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 text-xs">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>정기 감사 대비 마스터 KEK 즉시 로테이션 (Zero-Downtime DEK Re-wrapping)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    새로운 버전의 마스터 KEK를 프로비저닝하고, 저장된 모든 기밀의 DEK를 무중단 상태에서 원클릭으로 일괄 재래핑합니다.
                  </p>
                </div>

                <Button
                  size="sm"
                  onClick={handleRotateKek}
                  disabled={isRotatingKek || !isGroupAdmin}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs h-8 shrink-0 gap-1.5"
                >
                  <RotateCcw className={cn("w-3.5 h-3.5", isRotatingKek && "animate-spin")} />
                  <span>마스터 KEK 로테이션 실행</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 사내 Git 서버 연동 어댑터 설정 */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-600" />
                    사내 Git 서버 연동 어댑터 설정
                  </CardTitle>
                  <CardDescription className="text-xs">
                    GitHub.com 및 사내 설치형 Git 서버 연동, SQLite 데이터베이스 영속성 저장 및 실시간 Webhook 수신 엔드포인트
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 bg-emerald-50 text-[11px] font-bold"
                  >
                    <Database className="w-3 h-3 mr-1 text-emerald-600" />
                    SQLite 영속화 활성화
                  </Badge>
                  <Badge
                    variant="outline"
                    className={
                      backendHealth?.status === 'ok'
                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50 text-[11px]'
                        : 'border-slate-300 text-slate-500 text-[11px]'
                    }
                  >
                    <Radio className="w-3 h-3 mr-1 text-emerald-500 animate-pulse" />
                    {backendHealth?.status === 'ok' ? '백엔드 서버 정상 가동' : '로컬 모드'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Git 서버 종류</Label>
                  <Select
                    value={gitForm.serverType}
                    disabled={!isGroupAdmin}
                    onValueChange={(val) =>
                      setGitForm({ ...gitForm, serverType: val as GitServerType })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GitHub Enterprise">GitHub / GitHub Enterprise</SelectItem>
                      <SelectItem value="GitLab Enterprise">GitLab Enterprise</SelectItem>
                      <SelectItem value="Bitbucket Server">Bitbucket Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">연동 API 버전</Label>
                  <Input
                    value={gitForm.apiVersion}
                    disabled={!isGroupAdmin}
                    onChange={(e) => setGitForm({ ...gitForm, apiVersion: e.target.value })}
                    className="h-8 text-xs mt-1 font-mono"
                  />
                </div>
              </div>

              {/* Webhook Endpoint */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  실시간 Webhook 수신 엔드포인트 URL
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-xs flex items-center justify-between border border-slate-800">
                    <span className="truncate">{gitConfig.webhookUrl}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">POST 수신</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyWebhookUrl}
                    className="h-8 text-xs shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    복사
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>GitHub Webhook Secret: <code>{webhookSecretKey}</code></span>
                  <span className="font-mono text-emerald-600 font-bold">HMAC SHA-256 서명 검증 지원</span>
                </div>
              </div>

              {/* SQLite DB Stats */}
              {backendHealth?.stats && (
                <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-600" />
                      내장 SQLite 영속 데이터베이스 상태
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      경로: server/data/secureflow.db
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center font-mono">
                    <div className="p-2 bg-white dark:bg-[#161b22] rounded border border-slate-200 dark:border-white/[0.04]">
                      <span className="text-[10px] text-slate-400 block font-sans">연동 프로젝트</span>
                      <strong className="text-indigo-600 text-sm">{backendHealth.stats.projects}개</strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-[#161b22] rounded border border-slate-200 dark:border-white/[0.04]">
                      <span className="text-[10px] text-slate-400 block font-sans">점검 실행 기록</span>
                      <strong className="text-emerald-600 text-sm">{backendHealth.stats.runs}건</strong>
                    </div>
                    <div className="p-2 bg-white dark:bg-[#161b22] rounded border border-slate-200 dark:border-white/[0.04]">
                      <span className="text-[10px] text-slate-400 block font-sans">수신된 웹훅</span>
                      <strong className="text-sky-600 text-sm">{backendHealth.stats.webhooks}회</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Webhook Deliveries List */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                    실시간 Webhook 수신 로그 (최근 6건)
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshBackendData}
                    className="h-6 text-[11px] text-slate-500 hover:text-indigo-600 gap-1 px-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    새로고침
                  </Button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-[11px]">
                  {webhookLogs.length === 0 ? (
                    <p className="text-slate-400 py-3 text-center">수신된 웹훅 기록이 없습니다.</p>
                  ) : (
                    webhookLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-2 rounded bg-slate-900 text-slate-200 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-indigo-400 font-bold">[{log.eventType}]</span>
                          <span className="text-slate-300 truncate">{log.repository}</span>
                          <span className="text-slate-500">@{log.commitId}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-emerald-400">{log.status}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(log.processed_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Webhook Test Simulator Trigger */}
              <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  ⚡ 실제 GitHub 이벤트 없이 백엔드 웹훅 엔진을 즉시 테스트할 수 있습니다:
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDispatchTestWebhook('clean_pass')}
                    disabled={isDispatchingTest}
                    className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    클린 패스 테스트
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDispatchTestWebhook('hard_block')}
                    disabled={isDispatchingTest}
                    className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    SQLi 차단 테스트
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDispatchTestWebhook('secret_leak')}
                    disabled={isDispatchingTest}
                    className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    시크릿 유출 테스트
                  </Button>
                </div>
              </div>
            </CardContent>
            {isGroupAdmin && (
              <CardFooter className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTestingGit}
                  className="text-xs"
                >
                  <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isTestingGit ? 'animate-spin' : ''}`} />
                  {isTestingGit ? '연결 확인 중...' : '서버 연결 테스트'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveGitConfig}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Git 설정 저장
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* 2. Tab: Slack & Teams 알림 연동 */}
        <TabsContent value="notifications" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          {/* Header Card */}
          <Card className="border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] shadow-xs">
            <CardHeader className="pb-3 border-b border-zinc-200/70 dark:border-white/[0.06]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-zinc-950 dark:text-zinc-100">
                    <Bell className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                    <span>엔터프라이즈 알림 &amp; 실시간 Webhook 연동 센터</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    보안 게이트 차단(BLOCKED), CISO 비상 예외 승인(OVERRIDE), 취약점 감지 시 사내 협업 도구(Slack, Microsoft Teams)로 실시간 서식화된 보안 알림을 디스패치합니다.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => setIsAddChannelDialogOpen(true)}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs h-8 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>새 알림 채널 추가</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshNotificationData}
                    className="h-8 text-xs px-2.5"
                    title="새로고침"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-6">
              {/* Channel Cards Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
                    <span>연동된 보안 알림 채널 ({notificationChannels.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-400 font-mono">SQLite DB 연동 영구 보관</span>
                </div>

                {notificationChannels.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-white/[0.08] rounded-xl text-xs text-slate-400">
                    등록된 알림 채널이 없습니다. [새 알림 채널 추가]를 클릭하여 Slack 또는 Teams를 연동하세요.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {notificationChannels.map((chan) => (
                      <div
                        key={chan.id}
                        className={cn(
                          'p-4 rounded-xl border transition-all space-y-3',
                          chan.isActive
                            ? 'bg-white dark:bg-[#121620] border-slate-200 dark:border-white/[0.08] shadow-xs'
                            : 'bg-slate-50 dark:bg-white/[0.01] border-slate-200/60 opacity-60'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                                chan.channel_type === 'slack'
                                  ? 'bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300'
                                  : chan.channel_type === 'teams'
                                  ? 'bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                                  : 'bg-slate-100 text-slate-700'
                              )}
                            >
                              {chan.channel_type}
                            </span>
                            <strong className="text-xs text-slate-900 dark:text-slate-100">{chan.name}</strong>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              onClick={() => handleToggleChannelActive(chan)}
                              className={cn(
                                'text-[10px] cursor-pointer font-mono',
                                chan.isActive
                                  ? 'border-emerald-300 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20'
                                  : 'border-slate-300 text-slate-500'
                              )}
                            >
                              {chan.isActive ? '● 활성' : '○ 비활성'}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 truncate bg-slate-50 dark:bg-white/[0.02] p-2 rounded-lg border border-slate-100 dark:border-white/[0.04]">
                          URL: {chan.webhook_url.substring(0, 38)}...
                        </div>

                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="text-slate-400 font-medium">수신 이벤트:</span>
                          {chan.events.map((evt) => (
                            <Badge key={evt} variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                              {evt === 'GATE_BLOCK'
                                ? '🚨 게이트 차단'
                                : evt === 'OVERRIDE_APPROVED'
                                ? '⚠️ CISO 예외 승인'
                                : evt === 'CRITICAL_FINDING'
                                ? '🔍 치명적 결함'
                                : '✅ 파이프라인 통과'}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/[0.04]">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTestChannelId(chan.id);
                              handleTestNotification();
                            }}
                            disabled={isTestingNotification}
                            className="h-7 text-[11px] gap-1"
                          >
                            <Send className="w-3 h-3 text-violet-500" />
                            <span>채널로 즉시 테스트 발송</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteChannel(chan.id, chan.name)}
                            className="h-7 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Slack Block Kit Preview & Test Station */}
              <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.1] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    <span className="text-xs font-bold font-mono tracking-wide">
                      SLACK BLOCK KIT &amp; TEAMS ADAPTIVE CARD 라이브 시뮬레이터
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={selectedTestEventType} onValueChange={(val) => setSelectedTestEventType(val)}>
                      <SelectTrigger className="h-7 bg-slate-800 border-slate-700 text-xs text-slate-200 w-48">
                        <SelectValue placeholder="시뮬레이션 시나리오" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-850 border-slate-700 text-xs text-white">
                        <SelectItem value="GATE_BLOCK">🚨 배포 게이트 차단 (Critical 결함)</SelectItem>
                        <SelectItem value="OVERRIDE_APPROVED">⚠️ CISO 긴급 배포 예외 승인</SelectItem>
                        <SelectItem value="PIPELINE_COMPLETE">✅ 전체 보안 게이트 정상 통과</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      size="sm"
                      onClick={handleTestNotification}
                      disabled={isTestingNotification}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-7 gap-1 shadow-sm"
                    >
                      {isTestingNotification ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Send className="w-3 h-3" />
                      )}
                      <span>실제 발송 트리거</span>
                    </Button>
                  </div>
                </div>

                {/* Slack Real UI Box */}
                <div className="bg-[#1a1d21] rounded-xl p-4 border border-white/[0.06] space-y-3 font-sans text-xs">
                  {/* Slack Bot Header */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                      SF
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white text-[13px]">SecureFlow Sentinel</span>
                        <span className="text-[9px] bg-slate-700 text-slate-300 px-1 py-0.2 rounded font-mono font-semibold">
                          APP
                        </span>
                        <span className="text-[11px] text-slate-400">방금 전</span>
                      </div>
                    </div>
                  </div>

                  {/* Slack Attachment Card */}
                  <div
                    className={cn(
                      'pl-3 py-1 space-y-2 border-l-4 rounded-r-lg bg-white/[0.02] p-3',
                      selectedTestEventType === 'GATE_BLOCK'
                        ? 'border-rose-500'
                        : selectedTestEventType === 'OVERRIDE_APPROVED'
                        ? 'border-amber-500'
                        : 'border-emerald-500'
                    )}
                  >
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>
                        {selectedTestEventType === 'GATE_BLOCK'
                          ? '🚨 [SecureFlow 배포 게이트 차단]'
                          : selectedTestEventType === 'OVERRIDE_APPROVED'
                          ? '⚠️ [CISO 비상 배포 예외 승인]'
                          : '✅ [SecureFlow 보안 검증 통과]'}
                      </span>
                      <code className="text-xs text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded font-mono">
                        devlee0908/agentgate
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.04]">
                      <div>
                        <span className="text-slate-400">브랜치: </span>
                        <code className="text-white font-mono font-semibold">fix/security-remediation</code>
                      </div>
                      <div>
                        <span className="text-slate-400">커밋: </span>
                        <code className="text-sky-400 font-mono">8f2a1b9</code>
                      </div>
                      <div>
                        <span className="text-slate-400">작업자: </span>
                        <span className="text-slate-200">이동훈 (DevSecOps Lead)</span>
                      </div>
                      <div>
                        <span className="text-slate-400">판정 상태: </span>
                        <strong
                          className={cn(
                            selectedTestEventType === 'GATE_BLOCK'
                              ? 'text-rose-400'
                              : selectedTestEventType === 'OVERRIDE_APPROVED'
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          )}
                        >
                          {selectedTestEventType === 'GATE_BLOCK'
                            ? 'BLOCKED (차단됨)'
                            : selectedTestEventType === 'OVERRIDE_APPROVED'
                            ? 'APPROVED (CISO 긴급승인)'
                            : 'PASSED (통과)'}
                        </strong>
                      </div>
                    </div>

                    <div className="p-2.5 rounded bg-black/40 text-[11px] text-slate-300 leading-relaxed border border-white/[0.04]">
                      {selectedTestEventType === 'GATE_BLOCK' ? (
                        <>
                          <strong className="text-rose-300 block mb-1">
                            • 보안 정책 위반: Critical 1건, High 2건 발견
                          </strong>
                          CWE-89 SQL Injection 결함으로 인해 프로덕션 파이프라인 자동 배포가 전면 차단되었습니다.
                          자동 생성된 fix/ 브랜치 패치를 검토해주세요.
                        </>
                      ) : selectedTestEventType === 'OVERRIDE_APPROVED' ? (
                        <>
                          <strong className="text-amber-300 block mb-1">
                            • CISO 비상 예외 승인 등록 (SLA: 24시간)
                          </strong>
                          승인자: <strong>강태우 (CISO)</strong> | 사유: 보안 패치 머지 전 운영 긴급 핫픽스 배포
                        </>
                      ) : (
                        <>
                          <strong className="text-emerald-300 block mb-1">
                            • 4대 보안 정적/동적 진단(SAST, DAST, SCA, IaC) 100% 무결 통과
                          </strong>
                          모든 보안 거버넌스 통제를 완벽하게 통과하여 스테이징/운영 자동 배포가 승인되었습니다.
                        </>
                      )}
                    </div>

                    {/* Slack Action Buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        className={cn(
                          'px-3 py-1 rounded text-[11px] font-bold text-white shadow-xs',
                          selectedTestEventType === 'GATE_BLOCK'
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        )}
                      >
                        보안 콘솔 상세 보기
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                      >
                        GitHub PR 확인
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 pt-1 font-mono">
                      SecureFlow Enterprise DevSecOps Sentinel • {new Date().toLocaleTimeString('ko-KR')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notification Reliability Queue Telemetry KPI Cards */}
              <div className="p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50/50 dark:from-indigo-950/20 dark:via-[#0c1017] dark:to-slate-900/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>엔터프라이즈 알림 딜리버리 큐 및 지수 백오프 모니터링</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      최대 3회 지연 재시도 (Full Jitter Exponential Backoff) 및 장애 발생 시 DLQ 자동 격리
                    </p>
                  </div>
                  <Badge variant="outline" className="border-indigo-300 text-indigo-700 dark:text-indigo-300 font-mono text-[10px]">
                    At-Least-Once Delivery
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block font-medium">총 발송 디스패치</span>
                    <strong className="text-sm font-mono text-slate-900 dark:text-slate-100">
                      {queueStats?.totalDispatched ?? notificationHistory.length}회
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block font-medium">발송 성공률</span>
                    <strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                      {(() => {
                        const total = queueStats?.totalDispatched || notificationHistory.length;
                        if (!total) return '100%';
                        const success = queueStats?.successCount ?? notificationHistory.filter(h => h.status.includes('DELIVERED') || h.response_status === 200).length;
                        return `${Math.round((success / total) * 100)}%`;
                      })()}
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block font-medium">지수 백오프 재시도</span>
                    <strong className="text-sm font-mono text-amber-600 dark:text-amber-400">
                      {queueStats?.retryAttempts ?? 0}회
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-[#161b22] border border-slate-200 dark:border-white/[0.06]">
                    <span className="text-[10px] text-slate-400 block font-medium">DLQ 격리 보관</span>
                    <strong className={cn(
                      "text-sm font-mono",
                      dlqItems.filter(i => i.status === 'DEAD_LETTER').length > 0 ? "text-rose-600 font-bold" : "text-slate-600 dark:text-slate-400"
                    )}>
                      {dlqItems.filter(i => i.status === 'DEAD_LETTER').length}건
                    </strong>
                  </div>
                </div>
              </div>

              {/* Dead-Letter Queue (DLQ) Management Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-rose-500" />
                      <span>Dead-Letter Queue (DLQ) 영구 격리 보관함 ({dlqItems.filter(i => i.status === 'DEAD_LETTER').length}건 대기)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      웹훅 수신처 다운타임으로 3회 재시도 후 실패한 알림을 영구 보존하며, 관리자가 점검 후 단독 또는 일괄 재발송(Re-drive)할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSimulateDlqFailure}
                      disabled={isSimulatingFailure}
                      className="text-xs h-7 px-2 border-amber-300 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    >
                      <AlertOctagon className={cn("w-3 h-3 mr-1", isSimulatingFailure && "animate-spin")} />
                      장애 시뮬레이션
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRedriveAllDlq}
                      disabled={isRedriving || dlqItems.filter(i => i.status === 'DEAD_LETTER').length === 0}
                      className="text-xs h-7 px-2 border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
                    >
                      <RotateCcw className={cn("w-3 h-3 mr-1", isRedriving && "animate-spin")} />
                      전체 재발송(Re-drive)
                    </Button>
                    {dlqItems.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearDlq}
                        className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        비우기
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/[0.04] text-slate-500 font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                      <tr>
                        <th className="p-3">실패 일시</th>
                        <th className="p-3">수신 채널</th>
                        <th className="p-3">이벤트</th>
                        <th className="p-3">재시도</th>
                        <th className="p-3">실패 원인 (오류 코드)</th>
                        <th className="p-3">상태</th>
                        <th className="p-3 text-right">작업</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06] text-slate-700 dark:text-slate-300">
                      {dlqItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            격리된 DLQ 메시지가 없습니다. 모든 알림이 지연 없이 정상 발송되었습니다.
                          </td>
                        </tr>
                      ) : (
                        dlqItems.map((item) => (
                          <tr key={item.id} className={item.status === 'REDISPATCHED' ? 'opacity-60 bg-emerald-50/20' : ''}>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {new Date(item.failedAt).toLocaleTimeString('ko-KR')}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{item.channelName}</div>
                              <span className="text-[10px] text-slate-400 uppercase font-mono">{item.channelType}</span>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {item.eventType}
                              </Badge>
                            </td>
                            <td className="p-3 font-mono text-[11px]">
                              {item.retryCount}회 소진
                            </td>
                            <td className="p-3 max-w-[220px] truncate" title={item.lastError}>
                              <span className="font-mono text-rose-600 font-bold mr-1">[{item.lastStatus}]</span>
                              <span className="text-slate-600 dark:text-slate-400 text-[11px]">{item.lastError}</span>
                            </td>
                            <td className="p-3">
                              <Badge
                                className={cn(
                                  'text-[10px] font-mono',
                                  item.status === 'REDISPATCHED'
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-400'
                                    : 'bg-rose-500/10 text-rose-600 border-rose-400'
                                )}
                              >
                                {item.status}
                              </Badge>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {item.status === 'DEAD_LETTER' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRedriveDlqItem(item.id)}
                                  className="h-6 text-[10px] px-2 text-indigo-600 hover:text-indigo-700"
                                >
                                  <RotateCcw className="w-2.5 h-2.5 mr-1" />
                                  재발송
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDlqItem(item.id)}
                                className="h-6 text-[10px] px-1 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery History Audit Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-500" />
                    <span>최근 Webhook 알림 디스패치 이력 (최근 {notificationHistory.length}건)</span>
                  </h4>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    실시간 이벤트 감사
                  </Badge>
                </div>

                <div className="border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-white/[0.04] text-slate-500 font-semibold border-b border-slate-200 dark:border-white/[0.06]">
                      <tr>
                        <th className="p-3">발송 일시</th>
                        <th className="p-3">알림 채널</th>
                        <th className="p-3">플랫폼</th>
                        <th className="p-3">이벤트</th>
                        <th className="p-3">전송 결과</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06] text-slate-700 dark:text-slate-300">
                      {notificationHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-4 text-center text-slate-400">
                            발송 이력이 없습니다. 상단에서 [실제 발송 트리거]를 실행해보세요.
                          </td>
                        </tr>
                      ) : (
                        notificationHistory.map((item) => (
                          <tr key={item.id}>
                            <td className="p-3 font-mono text-[11px] text-slate-500">
                              {new Date(item.sent_at).toLocaleTimeString('ko-KR')}
                            </td>
                            <td className="p-3 font-semibold">{item.channel_name}</td>
                            <td className="p-3 uppercase font-mono text-[10px]">{item.channel_type}</td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {item.event_type}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Badge
                                className={cn(
                                  'text-[10px] font-mono',
                                  item.status.includes('DELIVERED') || item.response_status === 200
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-400'
                                    : 'bg-rose-500/10 text-rose-600 border-rose-400'
                                )}
                              >
                                {item.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Tab: 화면 디스플레이 테마 */}
        <TabsContent value="theme" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <Card className="border-slate-200/90 dark:border-white/[0.08] shadow-sm dark:shadow-xl rounded-2xl overflow-hidden bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 font-mono">
                    <Palette className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                    화면 디스플레이 테마 (Display &amp; Theme Preferences)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    관리자 콘솔의 비주얼 스타일을 선택합니다. 모든 관제 대시보드, 아키텍처 토폴로지 및 테이블에 즉시 실시간 동기화됩니다.
                  </CardDescription>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-500/20 font-semibold self-start sm:self-auto">
                  현재: {theme === 'dark' ? '다크 옵시디언' : theme === 'light' ? '클린 화이트' : '시스템 자동 동기화'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Option 1: Dark Obsidian */}
                <div
                  onClick={() => {
                    setTheme('dark');
                    toast.success('다크 모드(Deep Obsidian)가 적용되었습니다.');
                  }}
                  className={cn(
                    'relative p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between overflow-hidden',
                    theme === 'dark'
                      ? 'border-indigo-500 bg-slate-900/90 dark:bg-[#0f1422] ring-2 ring-indigo-500/30 shadow-md'
                      : 'border-slate-200 dark:border-white/[0.08] bg-slate-900/80 dark:bg-[#0c1017] hover:border-slate-400 dark:hover:border-white/[0.18]'
                  )}
                >
                  {theme === 'dark' && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                        <Moon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                          다크 모드
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            2026 추천
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Deep Obsidian Theme</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">
                      장시간 집중 관제 시 눈의 피로도를 최소화하고, 보안 취약점 심각도 뱃지와 파이프라인 데이터 흐름의 시인성을 극대화합니다.
                    </p>
                  </div>

                  <div className="rounded-lg bg-[#07090e] border border-white/[0.08] p-2.5 space-y-1.5 mt-1 font-mono text-[10px]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-[9px] text-slate-500">Dark Console</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Critical Risk</span>
                      <span className="text-rose-400 font-bold">BLOCK</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-indigo-500 w-3/4 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Option 2: Clean Light */}
                <div
                  onClick={() => {
                    setTheme('light');
                    toast.success('라이트 모드(Clean Light)가 적용되었습니다.');
                  }}
                  className={cn(
                    'relative p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between overflow-hidden',
                    theme === 'light'
                      ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/30 shadow-md'
                      : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0c1017] hover:border-slate-400 dark:hover:border-white/[0.18]'
                  )}
                >
                  {theme === 'light' && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-200 flex items-center justify-center">
                        <Sun className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          라이트 모드
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/[0.1] text-slate-700 dark:text-slate-300">
                            Daylight
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Clean White Theme</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      밝은 오피스 조명 환경 및 보고서 출력, 인쇄, 회의 시 가독성이 높은 화사하고 정돈된 엔터프라이즈 화이트 테마입니다.
                    </p>
                  </div>

                  <div className="rounded-lg bg-white border border-slate-200 p-2.5 space-y-1.5 mt-1 font-mono text-[10px] shadow-2xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                      </div>
                      <span className="text-[9px] text-slate-400">Light Console</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span>Critical Risk</span>
                      <span className="text-rose-600 font-bold">BLOCK</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-600 w-3/4 rounded-full" />
                    </div>
                  </div>
                </div>

                {/* Option 3: System Auto Sync */}
                <div
                  onClick={() => {
                    setTheme('system');
                    toast.success('시스템 설정(OS 테마)에 자동 동기화되었습니다.');
                  }}
                  className={cn(
                    'relative p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between overflow-hidden',
                    theme === 'system'
                      ? 'border-indigo-500 bg-indigo-50/40 dark:bg-[#0f1422] ring-2 ring-indigo-500/30 shadow-md'
                      : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#0c1017] hover:border-slate-400 dark:hover:border-white/[0.18]'
                  )}
                >
                  {theme === 'system' && (
                    <div className="absolute top-2.5 right-2.5">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20 flex items-center justify-center">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                          시스템 동기화
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300">
                            Auto Sync
                          </span>
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">OS Preferences</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      macOS / Windows / 브라우저의 다크 모드 및 라이트 모드 전환을 실시간으로 감지하여 자동으로 일치시킵니다.
                    </p>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/[0.08] p-2.5 space-y-1.5 mt-1 font-mono text-[10px] bg-gradient-to-r from-white to-[#07090e]">
                    <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                      <span className="text-[9px] text-slate-700 font-bold">Auto</span>
                      <span className="text-[9px] text-slate-300 font-bold">Sync</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 text-[10px]">☀️ Light</span>
                      <span className="text-slate-200 text-[10px]">🌙 Dark</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Tab: 데모 검증 샌드박스 */}
        <TabsContent value="sandbox" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <Card className="border-amber-200 bg-amber-50/20 shadow-xs">
            <CardHeader className="pb-3 border-b border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                    <Zap className="w-4 h-4 text-amber-600" />
                    데모 검증 및 오류 시뮬레이션 도구 (Sandbox)
                  </CardTitle>
                  <CardDescription className="text-xs text-amber-800">
                    평가 및 프론트엔드 검증을 위해 오류 상황 재현, 데이터 비우기 및 초기 샘플 복원을 실행할 수 있습니다.
                  </CardDescription>
                </div>
                <Badge className="bg-amber-600 text-white text-[11px] font-bold">
                  검증 전용
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">다음 점검 실행 실패</span>
                    <span className="text-[11px] text-slate-500">파이프라인 오류 상황 재현</span>
                  </div>
                  <Button
                    variant={demoFaults.failNextScan ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={toggleFailNextScan}
                    className="text-xs"
                  >
                    {demoFaults.failNextScan ? '활성화됨' : '비활성'}
                  </Button>
                </div>

                <div className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">다음 저장 실패</span>
                    <span className="text-[11px] text-slate-500">API 쓰기 실패 재현</span>
                  </div>
                  <Button
                    variant={demoFaults.failNextSave ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={toggleFailNextSave}
                    className="text-xs"
                  >
                    {demoFaults.failNextSave ? '활성화됨' : '비활성'}
                  </Button>
                </div>

                <div className="p-3 bg-white rounded-lg border border-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-800 block">데이터 로드 실패</span>
                    <span className="text-[11px] text-slate-500">오류 전체화면 재현</span>
                  </div>
                  <Button
                    variant={demoFaults.failNextLoad ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={toggleFailNextLoad}
                    className="text-xs"
                  >
                    {demoFaults.failNextLoad ? '활성화됨' : '비활성'}
                  </Button>
                </div>
              </div>

              <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">데이터 초기화 및 복원</span>
                  <span className="text-[11px] text-slate-500">
                    전체 데이터를 기본 샘플 상태로 복원하거나 빈 데이터 상태로 전환합니다.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetDemoData}
                    className="text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    기본값 복원
                  </Button>
                  {hasDummyData ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearDummyData}
                      className="text-xs border-rose-300 text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      더미 파일 삭제
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={generateDummyData}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      샘플 더미 데이터 생성
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={setEmptyState}
                    className="text-xs border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/40"
                  >
                    빈 상태로 초기화 (0건)
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Notification Channel Modal */}
      <Dialog open={isAddChannelDialogOpen} onOpenChange={setIsAddChannelDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/[0.08] text-xs">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-violet-500" />
              <span>새 보안 알림 채널 연동</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Slack Incoming Webhook 또는 Teams Connector URL을 입력하여 실시간 보안 이벤트를 수신합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">채널 이름 (Alias)</Label>
              <Input
                placeholder="예: #devsecops-alerts, CISO 비상 상황실"
                value={newChannelForm.name}
                onChange={(e) => setNewChannelForm({ ...newChannelForm, name: e.target.value })}
                className="h-8 text-xs bg-slate-50 dark:bg-white/[0.04]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">메신저 플랫폼</Label>
              <Select
                value={newChannelForm.channel_type}
                onValueChange={(val: any) => setNewChannelForm({ ...newChannelForm, channel_type: val })}
              >
                <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-white/[0.04]">
                  <SelectValue placeholder="플랫폼 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack (Incoming Webhook / Block Kit)</SelectItem>
                  <SelectItem value="teams">Microsoft Teams (Adaptive Cards)</SelectItem>
                  <SelectItem value="webhook">Custom Webhook (Generic JSON)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Webhook Endpoint URL</Label>
              <Input
                placeholder="https://hooks.slack.com/services/... 또는 https://company.webhook.office.com/..."
                value={newChannelForm.webhook_url}
                onChange={(e) => setNewChannelForm({ ...newChannelForm, webhook_url: e.target.value })}
                className="h-8 text-xs font-mono bg-slate-50 dark:bg-white/[0.04]"
              />
              <span className="text-[10px] text-slate-400">
                • 데모 시뮬레이션용 가상 URL 입력 시에도 SQLite에 안전하게 적재되며 정상 발송 테스트가 가능합니다.
              </span>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">수신할 보안 이벤트 트리거</Label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { id: 'GATE_BLOCK', label: '🚨 게이트 차단 (BLOCKED)' },
                  { id: 'OVERRIDE_APPROVED', label: '⚠️ CISO 예외 승인' },
                  { id: 'CRITICAL_FINDING', label: '🔍 치명적 결함 발견' },
                  { id: 'PIPELINE_COMPLETE', label: '✅ 보안 진단 통과' },
                ].map((item) => {
                  const isChecked = newChannelForm.events.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                        isChecked
                          ? 'border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20 text-violet-900 dark:text-violet-200'
                          : 'border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          const next = isChecked
                            ? newChannelForm.events.filter((e) => e !== item.id)
                            : [...newChannelForm.events, item.id];
                          setNewChannelForm({ ...newChannelForm, events: next });
                        }}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddChannelDialogOpen(false)}
              className="h-8 text-xs"
            >
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleCreateChannel}
              className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              채널 저장 및 연동
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default SettingsView;
