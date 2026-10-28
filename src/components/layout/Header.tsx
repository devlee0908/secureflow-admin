import React, { useState, useEffect } from 'react';
import {
  Menu,
  Bell,
  Building2,
  ShieldCheck,
  UserCheck,
  CheckCheck,
  Info,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Search,
  LogOut,
  Sun,
  Moon,
  Globe,
  Shield,
  Trash2,
  Database,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api, BackendStats } from '@/services/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { EntityId, UserRole } from '@/types';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onNavigateMenu?: (menu: any) => void;
  onOpenCommandPalette?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onNavigateMenu,
  onOpenCommandPalette,
}) => {
  const {
    theme,
    setTheme,
    entities,
    selectedEntityId,
    setSelectedEntityId,
    currentUser,
    setCurrentUserRole,
    notifications,
    markNotificationAsRead,
    clearAllNotifications,
    logout,
    hasDummyData,
    generateDummyData,
    clearDummyData,
    isSyncing,
    lastSyncedAt,
    syncError,
    syncVersion,
    invalidateCache,
  } = useDevSecOps();

  const unreadCount = notifications.filter((n) => !n.read).length;
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Engine Health Heartbeat State
  const [engineHealth, setEngineHealth] = useState<{
    status: 'online' | 'offline' | 'checking';
    latencyMs: number;
    database?: string;
    engineInfo?: any;
    scannerWorkers?: any;
    securityGuard?: any;
    stats?: BackendStats;
    uptime?: number;
    lastChecked?: string;
  }>({
    status: 'checking',
    latencyMs: 0,
  });

  const checkHealth = async () => {
    const t0 = performance.now();
    try {
      const data = await api.getHealth();
      const t1 = performance.now();
      if (data && data.status === 'ok') {
        setEngineHealth({
          status: 'online',
          latencyMs: Math.round(t1 - t0),
          database: data.database,
          engineInfo: data.engineInfo,
          scannerWorkers: data.scannerWorkers,
          securityGuard: data.securityGuard || null,
          stats: data.stats,
          uptime: (data as any).uptime,
          lastChecked: new Date().toLocaleTimeString(),
        });
      } else {
        setEngineHealth((prev) => ({ ...prev, status: 'offline', lastChecked: new Date().toLocaleTimeString() }));
      }
    } catch {
      setEngineHealth((prev) => ({ ...prev, status: 'offline', lastChecked: new Date().toLocaleTimeString() }));
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200/70 dark:border-white/[0.06] bg-white/80 dark:bg-[#0c1017]/80 px-4 sm:px-6 backdrop-blur-xl text-slate-900 dark:text-white transition-colors duration-200">
      {/* Left section: mobile toggle + entity selector capsule */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white focus:outline-none"
          aria-label="모바일 메뉴 열기"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Entity Selector Capsule */}
        <div className="flex items-center gap-2">
          <div className="w-[170px] sm:w-[210px]">
            <Select
              value={selectedEntityId}
              onValueChange={(val) => setSelectedEntityId(val as EntityId | 'ALL')}
            >
              <SelectTrigger className="h-9 px-3.5 text-xs font-medium border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] hover:border-amber-400/40 rounded-full transition-all shadow-2xs">
                <div className="flex items-center gap-2 truncate">
                  <Building2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                  <SelectValue placeholder="법인 선택" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#0e121a] border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 rounded-2xl shadow-xl z-[9999]">
                <SelectItem value="ALL" className="font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5 text-sky-500" />
                    <span>전체 법인 통합 관제 (Global Group)</span>
                  </div>
                </SelectItem>
                {entities.map((ent) => (
                  <SelectItem key={ent.id} value={ent.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ent.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">({ent.code})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Interactive Engine Health & Compliance Capsule */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono shadow-2xs transition-all border cursor-pointer ${
                engineHealth.status === 'online'
                  ? 'bg-emerald-500/10 dark:bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                  : engineHealth.status === 'checking'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
              }`}
              title="클릭하여 엔진 상세 상태 확인"
            >
              <span className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    engineHealth.status === 'online'
                      ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]'
                      : engineHealth.status === 'checking'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                  }`}
                />
                <span>
                  {engineHealth.status === 'online'
                    ? `CORE ENGINE: LIVE (${engineHealth.latencyMs}ms)`
                    : engineHealth.status === 'checking'
                    ? 'CONNECTING ENGINE...'
                    : 'CORE ENGINE: OFFLINE'}
                </span>
              </span>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1 font-sans text-slate-600 dark:text-slate-300">
                <ShieldCheck className="w-3 h-3 text-sky-500 dark:text-sky-400" />
                <span>ISMS-P 준수</span>
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3.5 bg-white dark:bg-[#0e121a] border-slate-200 dark:border-white/[0.1] text-xs space-y-3 rounded-2xl shadow-xl z-[9999]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-slate-900 dark:text-white">SecureFlow 코어 엔진 상태</span>
              </div>
              <Badge
                variant={engineHealth.status === 'online' ? 'default' : 'destructive'}
                className="text-[10px] h-5"
              >
                {engineHealth.status === 'online' ? '정상 가동 중' : '로컬 폴백 모드'}
              </Badge>
            </div>
            <div className="space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">엔진 데이터베이스:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {engineHealth.database || 'SQLite (WAL Mode)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">아키텍처 확장성:</span>
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-indigo-400 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30">
                  Scale-Out Pluggable
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">네트워크 응답 속도:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{engineHealth.latencyMs} ms</span>
              </div>
              {engineHealth.stats && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">관리 대상 프로젝트:</span>
                    <span>{engineHealth.stats.projects}개</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">점검 파이프라인 런:</span>
                    <span>{engineHealth.stats.runs}회</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">누적 Webhook 수신:</span>
                    <span>{engineHealth.stats.webhooks}건</span>
                  </div>
                  {engineHealth.stats.auditLogs !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">불변 감사 로그:</span>
                      <span className="text-sky-600 dark:text-sky-400 font-bold">{engineHealth.stats.auditLogs}건</span>
                    </div>
                  )}
                </>
              )}
              {engineHealth.scannerWorkers && (
                <div className="pt-1.5 border-t border-slate-100 dark:border-white/[0.04] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">정적분석 워커 스레드:</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-emerald-400 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                      {engineHealth.scannerWorkers.poolSize} Threads Isolated
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">대기 큐 / 처리 완료:</span>
                    <span>
                      {engineHealth.scannerWorkers.queueDepth}건 대기 / {engineHealth.scannerWorkers.totalCompleted}건 완료
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">스캔 평균 연산 시간:</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">
                      {engineHealth.scannerWorkers.avgDurationMs}ms (이벤트루프 지연 0ms)
                    </span>
                  </div>
                </div>
              )}
              {engineHealth.securityGuard && (
                <div className="pt-1.5 border-t border-slate-100 dark:border-white/[0.04] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Zero-Trust Rate Guard:</span>
                    <Badge variant="outline" className="text-[9px] py-0 px-1 border-sky-400 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30">
                      Sliding Window Active
                    </Badge>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">누적 검사 / 차단(429):</span>
                    <span>
                      {engineHealth.securityGuard.totalRequestsChecked}건 허용 /{' '}
                      <span className={engineHealth.securityGuard.throttledRequests > 0 ? 'text-rose-500 font-bold' : 'text-emerald-500'}>
                        {engineHealth.securityGuard.throttledRequests}건 차단
                      </span>
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400">SWR 동기화 버전:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">v{syncVersion} (Dual-State Safe)</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                <span>최근 확인: {engineHealth.lastChecked || '방금 전'}</span>
                <span>SHA-256 서명 검증 활성</span>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={checkHealth}
              className="w-full h-7 text-xs gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              즉시 헬스체크 재조회
            </Button>
          </PopoverContent>
        </Popover>

        {/* Real-time SWR Sync Status Capsule */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono shadow-2xs border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/60 dark:bg-white/[0.03]">
          <span className="flex items-center gap-1.5 font-medium">
            <RefreshCw
              className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-500' : syncError ? 'text-rose-500' : 'text-emerald-500'}`}
            />
            <span
              className={
                isSyncing
                  ? 'text-amber-600 dark:text-amber-400 font-bold'
                  : syncError
                  ? 'text-rose-600 dark:text-rose-400 font-semibold'
                  : 'text-slate-700 dark:text-slate-300'
              }
            >
              {isSyncing
                ? 'SWR 동기화 중...'
                : syncError
                ? '롤백 복원됨 (Snapshot Safe)'
                : '실시간 동기화 완료 (Live Sync)'}
            </span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            onClick={() => invalidateCache('all')}
            disabled={isSyncing}
            className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer disabled:opacity-50"
            title="서버와 즉시 전체 재동기화"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Right section: search, notifications, theme toggle, demo role preview, user profile */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Quick Search Capsule */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 h-9 px-3 rounded-full border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs transition-all shadow-2xs font-mono"
            title="빠른 검색 (⌘K / Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline text-slate-500 dark:text-slate-400 text-[11px] font-sans">통합 검색</span>
            <kbd className="hidden sm:inline-flex items-center rounded-full border border-slate-300/80 dark:border-white/[0.1] bg-white dark:bg-white/[0.06] px-1.5 py-0.2 font-mono text-[9px] font-semibold text-slate-500 dark:text-slate-400">
              ⌘K
            </kbd>
          </button>
        )}

        {/* Role Preview Switcher Capsule */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] px-3 py-1 rounded-full border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
          <UserCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <Select
            value={currentUser.role}
            onValueChange={(val) => setCurrentUserRole(val as UserRole)}
          >
            <SelectTrigger className="h-6 border-0 bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white shadow-none focus:ring-0 p-0 pr-1 gap-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="bg-white dark:bg-[#0e121a] border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 rounded-2xl shadow-xl z-[9999]">
              <SelectItem value="group_admin" className="hover:bg-slate-50 dark:hover:bg-white/[0.06]">
                최고보안책임자 (CISO / Group Admin)
              </SelectItem>
              <SelectItem value="entity_manager" className="hover:bg-slate-50 dark:hover:bg-white/[0.06]">
                법인 보안 거버넌스 감사관 (SecOps Lead)
              </SelectItem>
              <SelectItem value="developer" className="hover:bg-slate-50 dark:hover:bg-white/[0.06]">
                선임 엔지니어링 리드 (Tech Lead)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dummy Data Generator / Cleaner Pill Button */}
        {hasDummyData ? (
          <Button
            variant="outline"
            size="sm"
            onClick={clearDummyData}
            className="h-9 px-3 text-xs font-semibold border-amber-300/80 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-full transition-all gap-1.5 shadow-2xs"
            title="기존 더미 파일들을 삭제하고 실제 연동된 프로젝트만 유지합니다"
          >
            <Trash2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="hidden lg:inline">더미 파일 제거</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={generateDummyData}
            className="h-9 px-3 text-xs font-semibold border-indigo-300/80 dark:border-indigo-700/60 bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-full transition-all gap-1.5 shadow-2xs"
            title="테스트 및 시뮬레이션을 위한 샘플 더미 데이터를 즉시 생성합니다"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="hidden lg:inline">더미 파일 생성</span>
          </Button>
        )}

        {/* Theme Toggle Button (Circular Glass Pill) */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            const nextTheme = theme === 'dark' ? 'light' : 'dark';
            setTheme(nextTheme);
            toast.info(nextTheme === 'dark' ? '다크 모드(Dark Obsidian)로 전환되었습니다.' : '라이트 모드(Clean Light)로 전환되었습니다.');
          }}
          className="h-9 w-9 rounded-full border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs"
          title={`화면 모드 전환 (현재: ${theme === 'dark' ? '다크 모드' : theme === 'light' ? '라이트 모드' : '시스템 연동'})`}
          aria-label="화면 테마 전환"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
          )}
        </Button>

        {/* Notification Bell Popover (Circular Glass Pill) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-9 w-9 rounded-full border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-2xs"
              aria-label="알림"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 sm:w-96 p-0 mr-2 bg-white dark:bg-[#0e121a] border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 rounded-3xl shadow-2xl overflow-hidden z-[9999]" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-slate-900 dark:text-white font-mono">알림 센터</span>
                {unreadCount > 0 && (
                  <span className="h-4.5 px-2 rounded-full bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 text-[9.5px] font-mono font-bold flex items-center">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-[11px] text-slate-400 hover:text-slate-200 font-mono"
                >
                  모두 지우기
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  수신된 알림이 없습니다.
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      if (notif.linkMenu && onNavigateMenu) {
                        onNavigateMenu(notif.linkMenu);
                      }
                    }}
                    className={`p-3.5 text-xs transition-colors cursor-pointer hover:bg-white/[0.03] ${
                      !notif.read ? 'bg-indigo-500/[0.08]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            notif.type === 'critical'
                              ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]'
                              : notif.type === 'warning'
                              ? 'bg-amber-500'
                              : notif.type === 'success'
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                          }`}
                        />
                        {notif.title}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                        {notif.timestamp.slice(11, 16)}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-400 leading-relaxed text-[11px]">
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* User Profile Avatar Popover (Capsule Pill) */}
        <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 h-9 p-1 pl-3 pr-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-all border border-slate-200/80 dark:border-white/[0.08] bg-slate-100/80 dark:bg-white/[0.04] shadow-2xs">
              <div className="flex flex-col text-right hidden sm:block">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 leading-tight font-mono">
                  {currentUser.roleTitle}
                </span>
              </div>
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.name[0]}
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 dark:text-slate-500 hidden sm:block" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 bg-white dark:bg-[#0e121a] border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-200 rounded-3xl shadow-2xl z-[9999]" align="end">
            <div className="border-b border-slate-100 dark:border-white/[0.06] pb-3">
              <div className="font-semibold text-sm text-slate-900 dark:text-white">{currentUser.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
              <div className="mt-2 inline-block text-[10px] font-mono font-medium text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-200 dark:border-sky-500/30">
                {currentUser.roleTitle}
              </div>
            </div>

            <div className="pt-2 space-y-1">
              <div className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 px-2 py-1 uppercase tracking-wider">
                DEMO ROLE SWITCH
              </div>
              <button
                onClick={() => {
                  setCurrentUserRole('group_admin');
                  setUserMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
                  currentUser.role === 'group_admin'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300'
                }`}
              >
                1. 그룹 보안관리자 (CISO)
              </button>
              <button
                onClick={() => {
                  setCurrentUserRole('entity_manager');
                  setUserMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
                  currentUser.role === 'entity_manager'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300'
                }`}
              >
                2. 법인 담당자 (파이낸스)
              </button>
              <button
                onClick={() => {
                  setCurrentUserRole('developer');
                  setUserMenuOpen(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
                  currentUser.role === 'developer'
                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-500/30'
                    : 'hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300'
                }`}
              >
                3. 프로젝트 개발자 (테크)
              </button>

              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>로그아웃 (로그인 화면)</span>
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
};
