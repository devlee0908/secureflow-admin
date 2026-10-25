import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  CorporateEntity,
  Project,
  ScanRun,
  Finding,
  DeploymentReview,
  SecurityPolicy,
  GitIntegrationConfig,
  UserProfile,
  UserRole,
  NotificationItem,
  DemoFaultFlags,
  EntityId,
  ScanOverallStatus,
  SecurityVerdict,
  ScanTrigger,
  ScanType,
  ThemeMode,
} from '../types';
import {
  INITIAL_ENTITIES,
  INITIAL_PROJECTS,
  INITIAL_SCANS,
  INITIAL_FINDINGS,
  INITIAL_REVIEWS,
  INITIAL_SECURITY_POLICY,
  INITIAL_GIT_CONFIG,
  DEMO_USERS,
  INITIAL_NOTIFICATIONS,
  REAL_PROJECTS,
  REAL_SCANS,
  REAL_FINDINGS,
  REAL_REVIEWS,
  BASELINE_AGENTGATE_SCAN,
  BASELINE_AGENTGATE_PR_SCAN,
  BASELINE_AGENTGATE_FINDINGS,
  BASELINE_AGENTGATE_PR_FINDINGS,
  BASELINE_AGENTGATE_REVIEWS,
  DUMMY_PROJECTS,
  DUMMY_SCANS,
  DUMMY_FINDINGS,
  DUMMY_REVIEWS,
  ALL_SAMPLE_PROJECTS,
  ALL_SAMPLE_SCANS,
  ALL_SAMPLE_FINDINGS,
  ALL_SAMPLE_REVIEWS,
} from '../mock/mockData';
import { toast } from 'sonner';
import { api } from '../services/api';

interface DevSecOpsContextType {
  // Theme & Appearance
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // Data & SWR Synchronization
  entities: CorporateEntity[];
  projects: Project[];
  scans: ScanRun[];
  findings: Finding[];
  reviews: DeploymentReview[];
  policy: SecurityPolicy;
  gitConfig: GitIntegrationConfig;
  notifications: NotificationItem[];
  currentUser: UserProfile;
  selectedEntityId: EntityId | 'ALL';
  demoFaults: DemoFaultFlags;
  isLoading: boolean;
  loadError: string | null;

  // Real-time SWR Sync State & Cache Invalidation
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
  syncVersion: number;
  invalidateCache: (scope?: 'findings' | 'runs' | 'projects' | 'reviews' | 'all') => Promise<void>;

  // Authentication & Session
  isAuthenticated: boolean;
  login: (role?: UserRole) => void;
  logout: () => void;

  // Actions
  setSelectedEntityId: (id: EntityId | 'ALL') => void;
  setCurrentUserRole: (role: UserRole) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;

  // Queries & calculations
  getProjectLatestScan: (projectId: string) => ScanRun | undefined;
  getProjectUnresolvedHighCriticalCount: (projectId: string) => number;
  getProjectOverallStatus: (projectId: string) => ScanOverallStatus;
  getProjectDeploymentReview: (projectId: string) => DeploymentReview | undefined;
  getProjectFindings: (projectId: string) => Finding[];
  evaluateDeploymentVerdict: (
    requestCommitId: string,
    scanCommitId: string,
    requiredScansCompleted: boolean,
    projectId: string
  ) => { verdict: SecurityVerdict; reason: string };

  // Mutations
  addProject: (data: Omit<Project, 'id' | 'createdAt'>) => Promise<boolean>;
  updateProject: (id: string, data: Partial<Project>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;

  triggerScan: (projectId: string, trigger?: ScanTrigger, scanTypes?: ScanType[]) => Promise<ScanRun | null>;
  triggerBatchScan: (projectIds: string[]) => Promise<void>;
  retryScan: (scanId: string) => Promise<void>;

  updateFindingAssigneeAndDueDate: (findingId: string, assignee: string, dueDate: string) => Promise<boolean>;
  batchUpdateAssignee: (findingIds: string[], assignee: string) => Promise<boolean>;
  markAsFalsePositive: (findingId: string, reason: string) => Promise<boolean>;
  requestSecurityException: (findingId: string, reason: string, expiresAt: string) => Promise<boolean>;
  simulateRescanFinding: (findingId: string) => Promise<boolean>;

  reviewDeployment: (reviewId: string, status: '승인' | '반려', comment: string) => Promise<boolean>;
  updatePolicy: (newPolicy: SecurityPolicy) => Promise<boolean>;
  updateGitConfig: (newConfig: GitIntegrationConfig) => Promise<boolean>;
  testGitConnection: () => Promise<boolean>;

  // Demo tool actions
  toggleFailNextScan: () => void;
  toggleFailNextSave: () => void;
  toggleFailNextLoad: () => void;
  setEmptyState: () => void;
  resetDemoData: () => void;
  retryLoadData: () => void;

  // Baseline scan management
  commitBaselineScan: (projectId?: string) => Promise<boolean>;
  resetBaselineScan: (projectId?: string) => void;
  simulateAgentGatePr: (scenario?: 'block' | 'clean') => Promise<void>;
  resolveAgentGateRemediation: (customComment?: string) => void;

  // Dummy data management
  hasDummyData: boolean;
  generateDummyData: () => void;
  clearDummyData: () => void;
}

const DevSecOpsContext = createContext<DevSecOpsContextType | undefined>(undefined);

export const DevSecOpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entities, setEntities] = useState<CorporateEntity[]>(INITIAL_ENTITIES);
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('secureflow_has_dummy');
    if (saved === 'true') {
      return ALL_SAMPLE_PROJECTS;
    }
    return REAL_PROJECTS;
  });
  const [scans, setScans] = useState<ScanRun[]>(() => {
    const isBaselineScanned = localStorage.getItem('secureflow_agentgate_scanned') === 'true';
    const agentgateScans = isBaselineScanned ? [BASELINE_AGENTGATE_SCAN, BASELINE_AGENTGATE_PR_SCAN] : [];
    const saved = localStorage.getItem('secureflow_has_dummy');
    if (saved === 'true') {
      return [...agentgateScans, ...DUMMY_SCANS];
    }
    return agentgateScans;
  });
  const [findings, setFindings] = useState<Finding[]>(() => {
    const isBaselineScanned = localStorage.getItem('secureflow_agentgate_scanned') === 'true';
    const agentgateFindings = isBaselineScanned ? [...BASELINE_AGENTGATE_FINDINGS, ...BASELINE_AGENTGATE_PR_FINDINGS] : [];
    const saved = localStorage.getItem('secureflow_has_dummy');
    if (saved === 'true') {
      return [...agentgateFindings, ...DUMMY_FINDINGS];
    }
    return agentgateFindings;
  });
  const [reviews, setReviews] = useState<DeploymentReview[]>(() => {
    const savedCustom = localStorage.getItem('secureflow_custom_reviews');
    if (savedCustom) {
      try {
        const parsed = JSON.parse(savedCustom);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    const isBaselineScanned = localStorage.getItem('secureflow_agentgate_scanned') === 'true';
    const agentgateReviews = isBaselineScanned ? BASELINE_AGENTGATE_REVIEWS : [];
    const saved = localStorage.getItem('secureflow_has_dummy');
    if (saved === 'true') {
      return [...agentgateReviews, ...DUMMY_REVIEWS];
    }
    return agentgateReviews;
  });
  const [policy, setPolicy] = useState<SecurityPolicy>(INITIAL_SECURITY_POLICY);
  const [gitConfig, setGitConfig] = useState<GitIntegrationConfig>(INITIAL_GIT_CONFIG);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const [selectedEntityId, setSelectedEntityId] = useState<EntityId | 'ALL'>('ALL');
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('group_admin');

  const [demoFaults, setDemoFaults] = useState<DemoFaultFlags>({
    failNextScan: false,
    failNextSave: false,
    failNextLoad: false,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // SWR Real-time Synchronization States & Telemetry
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(new Date());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState<number>(1);

  // Fine-Grained Cache Invalidation
  const invalidateCache = async (scope: 'findings' | 'runs' | 'projects' | 'reviews' | 'all' = 'all') => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      if (scope === 'all') {
        const syncState = await api.getSyncState();
        if (syncState) {
          if (Array.isArray(syncState.projects) && syncState.projects.length > 0) {
            setProjects((prev) => {
              const dummyOnly = prev.filter((p) => p.id !== 'PRJ-AGENTGATE' && p.id.startsWith('PRJ-0'));
              const combined = [...syncState.projects, ...dummyOnly];
              const map = new Map();
              for (const p of combined) map.set(p.id, p);
              return Array.from(map.values());
            });
          }
          if (Array.isArray(syncState.findings) && syncState.findings.length > 0) {
            setFindings((prev) => {
              const nonAgentGate = prev.filter((f) => f.projectId !== 'PRJ-AGENTGATE');
              const combined = [...syncState.findings, ...nonAgentGate];
              const map = new Map();
              for (const f of combined) map.set(f.id, f);
              return Array.from(map.values());
            });
          }
          if (Array.isArray(syncState.reviews) && syncState.reviews.length > 0) {
            setReviews((prev) => {
              const nonAgentGate = prev.filter((r) => r.projectId !== 'PRJ-AGENTGATE');
              const combined = [...syncState.reviews, ...nonAgentGate];
              const map = new Map();
              for (const r of combined) map.set(r.id, r);
              return Array.from(map.values());
            });
          }
        }
      } else if (scope === 'findings') {
        const backendFindings = await api.getFindings();
        if (backendFindings && backendFindings.length > 0) {
          setFindings((prev) => {
            const nonAgentGate = prev.filter((f) => f.projectId !== 'PRJ-AGENTGATE');
            const combined = [...backendFindings, ...nonAgentGate];
            const map = new Map();
            for (const f of combined) map.set(f.id, f);
            return Array.from(map.values());
          });
        }
      } else if (scope === 'reviews') {
        const backendReviews = await api.getReviews();
        if (backendReviews && backendReviews.length > 0) {
          setReviews((prev) => {
            const nonAgentGate = prev.filter((r) => r.projectId !== 'PRJ-AGENTGATE');
            const combined = [...backendReviews, ...nonAgentGate];
            const map = new Map();
            for (const r of combined) map.set(r.id, r);
            return Array.from(map.values());
          });
        }
      } else if (scope === 'runs') {
        const backendRuns = await api.getRuns();
        if (backendRuns && backendRuns.length > 0) {
          setScans((prev) => {
            const combined = [...backendRuns, ...prev];
            const map = new Map();
            for (const s of combined) map.set(s.id, s);
            return Array.from(map.values());
          });
        }
      }
      setLastSyncedAt(new Date());
      setSyncVersion((v) => v + 1);
    } catch (err: any) {
      console.warn('[Cache Invalidation] Failed to sync:', err);
      setSyncError(err?.message || '캐시 무효화 동기화 실패');
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform initial background sync on startup
  useEffect(() => {
    invalidateCache('all');
  }, []);

  // Structural Snapshot-based Optimistic Update with Automatic Rollback
  const executeOptimisticMutation = async <TSnapshot,>(
    snapshot: () => TSnapshot,
    applyOptimistic: () => void,
    rollback: (snap: TSnapshot) => void,
    remoteAction: () => Promise<any>,
    successMessage?: string,
    errorMessagePrefix: string = '작업 처리 중 오류가 발생했습니다'
  ): Promise<boolean> => {
    // 1. Check demo fault simulation
    if (demoFaults.failNextSave) {
      setDemoFaults((prev) => ({ ...prev, failNextSave: false }));
      const snap = snapshot();
      applyOptimistic(); // Render optimistically first
      setIsSyncing(true);
      await new Promise((res) => setTimeout(res, 500)); // Simulate async network lag
      rollback(snap); // Automatic rollback to pristine snapshot!
      setIsSyncing(false);
      setSyncError('데모 오류 시뮬레이션: 데이터베이스 잠금 충돌 (Lock Timeout 504)');
      toast.error('변경사항 롤백 복원됨 (Optimistic Rollback)', {
        description: '저장 실패 시뮬레이션으로 인해 상태가 변경 전 스냅샷으로 안전하게 복구되었습니다.',
      });
      return false;
    }

    // 2. Normal Real Execution with Auto Rollback on Failure
    const snap = snapshot();
    applyOptimistic();
    setIsSyncing(true);
    setSyncError(null);

    try {
      await remoteAction();
      setLastSyncedAt(new Date());
      setSyncVersion((v) => v + 1);
      if (successMessage) {
        toast.success(successMessage);
      }
      return true;
    } catch (err: any) {
      console.error('[Optimistic Mutation Failed, rolling back]:', err);
      rollback(snap);
      setSyncError(err?.message || '원격 동기화 실패');
      toast.error('동기화 실패: 이전 상태로 롤백되었습니다', {
        description: err?.message || `${errorMessagePrefix} (자동 롤백 완료)`,
      });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Check localStorage, default to false so user sees the login screen first
    const saved = localStorage.getItem('secureflow_auth');
    return saved === 'true';
  });

  // Theme Management (Dark Obsidian by default, Light, or System sync)
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('secureflow_theme');
    if (saved === 'dark' || saved === 'light' || saved === 'system') {
      return saved;
    }
    return 'dark'; // Flagship 2026 dark obsidian default
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('secureflow_theme', newTheme);
  };

  useEffect(() => {
    const applyTheme = (t: ThemeMode) => {
      const root = document.documentElement;
      let isDark = false;
      if (t === 'dark') {
        isDark = true;
      } else if (t === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [theme]);

  const login = (role?: UserRole) => {
    if (role) {
      setCurrentUserRole(role);
    }
    setIsAuthenticated(true);
    localStorage.setItem('secureflow_auth', 'true');
    toast.success('보안 인증이 완료되었습니다', {
      description: 'SecureFlow DevSecOps 통합 관리 대시보드에 접속했습니다.',
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('secureflow_auth');
    toast.info('로그아웃되었습니다', {
      description: '보안 세션이 안전하게 종료되었습니다.',
    });
  };

  // Sync role to user object
  const currentUser = useMemo(() => {
    return DEMO_USERS[currentUserRole];
  }, [currentUserRole]);

  // Adjust entity selector when role changes
  useEffect(() => {
    if (currentUser.role === 'entity_manager' && currentUser.entityId) {
      setSelectedEntityId(currentUser.entityId);
    }
  }, [currentUser]);

  // 1. Calculations
  const getProjectLatestScan = (projectId: string): ScanRun | undefined => {
    const projectScans = scans.filter((s) => s.projectId === projectId);
    if (projectScans.length === 0) return undefined;
    return [...projectScans].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
  };

  const getProjectFindings = (projectId: string): Finding[] => {
    return findings.filter((f) => f.projectId === projectId);
  };

  const getProjectUnresolvedHighCriticalCount = (projectId: string): number => {
    return findings.filter(
      (f) =>
        f.projectId === projectId &&
        (f.severity === '치명적' || f.severity === '높음') &&
        f.status !== '해결' &&
        f.status !== '오탐' &&
        f.status !== '예외 승인'
    ).length;
  };

  const getProjectOverallStatus = (projectId: string): ScanOverallStatus => {
    const latestScan = getProjectLatestScan(projectId);
    if (!latestScan) return '미점검';
    if (latestScan.status === '실행 중' || latestScan.status === '대기') return '점검 중';
    if (latestScan.status === '실패') return '실패';

    const unresolvedHighCrit = getProjectUnresolvedHighCriticalCount(projectId);
    if (unresolvedHighCrit > 0) return '위험';

    const unresolvedMedium = findings.filter(
      (f) =>
        f.projectId === projectId &&
        f.severity === '중간' &&
        f.status !== '해결' &&
        f.status !== '오탐' &&
        f.status !== '예외 승인'
    ).length;
    if (unresolvedMedium > 0) return '주의';

    return '통과';
  };

  const getProjectDeploymentReview = (projectId: string): DeploymentReview | undefined => {
    return reviews.find((r) => r.projectId === projectId);
  };

  const evaluateDeploymentVerdict = (
    requestCommitId: string,
    scanCommitId: string,
    requiredScansCompleted: boolean,
    projectId: string
  ): { verdict: SecurityVerdict; reason: string } => {
    // 1. Commit match
    if (!requestCommitId || !scanCommitId || requestCommitId.trim() !== scanCommitId.trim()) {
      return {
        verdict: '차단',
        reason: `커밋 불일치: 배포 요청 커밋(${requestCommitId || '없음'})과 보안점검 커밋(${scanCommitId || '없음'})이 일치하지 않습니다.`,
      };
    }

    // 2. Scan completion
    const latestScan = getProjectLatestScan(projectId);
    if (!latestScan || latestScan.status !== '완료') {
      return {
        verdict: '미점검',
        reason: '최신 점검이 완료되지 않았거나 점검 실패 상태입니다.',
      };
    }

    if (!requiredScansCompleted) {
      return {
        verdict: '차단',
        reason: '필수 보안점검(SAST, SCA, Secret, IaC) 중 미실시된 항목이 존재합니다.',
      };
    }

    // 3. Evaluate active findings for this project
    const activeFindings = findings.filter(
      (f) =>
        f.projectId === projectId &&
        f.status !== '해결' &&
        f.status !== '오탐' &&
        f.status !== '예외 승인'
    );

    const criticalCount = activeFindings.filter((f) => f.severity === '치명적').length;
    const highCount = activeFindings.filter((f) => f.severity === '높음').length;
    const mediumCount = activeFindings.filter((f) => f.severity === '중간').length;

    if (policy.blockOnCritical && criticalCount > 0) {
      return {
        verdict: '차단',
        reason: `치명적 보안 결함 ${criticalCount}건 미해결 (정책: 즉시 차단)`,
      };
    }

    if (highCount >= policy.highThresholdForBlock) {
      return {
        verdict: '차단',
        reason: `높음 보안 결함 ${highCount}건 미해결 (정책 기준: ${policy.highThresholdForBlock}건 이상 시 차단)`,
      };
    }

    if (mediumCount >= policy.mediumThresholdForReview) {
      return {
        verdict: '검토 필요',
        reason: `중간 결함 ${mediumCount}건 검토 필요 (정책 기준: ${policy.mediumThresholdForReview}건 이상)`,
      };
    }

    return {
      verdict: '통과',
      reason: '모든 필수 점검 완료 및 보안 정책 기준(Critical/High 없음) 충족',
    };
  };

  // 2. Mutations
  const addProject = async (data: Omit<Project, 'id' | 'createdAt'>): Promise<boolean> => {
    if (demoFaults.failNextSave) {
      setDemoFaults((prev) => ({ ...prev, failNextSave: false }));
      toast.error('저장 실패 시뮬레이션: 네트워크 타임아웃 오류가 발생했습니다.');
      return false;
    }

    const newId = `PRJ-${String(projects.length + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];
    const newProj: Project = {
      ...data,
      id: newId,
      createdAt: today,
    };

    setProjects((prev) => [newProj, ...prev]);
    toast.success(`프로젝트 [${data.name}] 등록 완료 (ID: ${newId})`);
    return true;
  };

  const updateProject = async (id: string, data: Partial<Project>): Promise<boolean> => {
    if (demoFaults.failNextSave) {
      setDemoFaults((prev) => ({ ...prev, failNextSave: false }));
      toast.error('수정 실패 시뮬레이션: 데이터베이스 잠금 충돌 오류가 발생했습니다.');
      return false;
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...data } : p))
    );
    toast.success('프로젝트 정보가 성공적으로 수정되었습니다.');
    return true;
  };

  const deleteProject = async (id: string): Promise<boolean> => {
    const target = projects.find((p) => p.id === id);
    if (!target) return false;

    // Cascade delete from scans, findings, reviews
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setScans((prev) => prev.filter((s) => s.projectId !== id));
    setFindings((prev) => prev.filter((f) => f.projectId !== id));
    setReviews((prev) => prev.filter((r) => r.projectId !== id));

    toast.success(`프로젝트 [${target.name}] 및 연결된 점검/발견사항/배포심사 데이터가 제거되었습니다.`);
    return true;
  };

  // Scan simulation
  const triggerScan = async (
    projectId: string,
    trigger: ScanTrigger = '수동',
    scanTypes: ScanType[] = [
      '소스코드 정적 분석',
      '의존성 취약점 분석',
      '비밀정보 탐지',
      '설정 오류 분석',
    ]
  ): Promise<ScanRun | null> => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      toast.error('존재하지 않는 프로젝트입니다.');
      return null;
    }

    const scanId = `SCN-2026-${String(scans.length + 101).padStart(4, '0')}`;
    const now = new Date();
    const nowStr = `${now.toISOString().replace('T', ' ').substring(0, 19)}`;
    const randomCommit = Math.random().toString(16).substring(2, 9);

    const willFail = demoFaults.failNextScan;
    if (willFail) {
      setDemoFaults((prev) => ({ ...prev, failNextScan: false }));
    }

    const newScan: ScanRun = {
      id: scanId,
      projectId: project.id,
      projectName: project.name,
      entityId: project.entityId,
      entityName: project.entityName,
      branch: project.defaultBranch,
      commitId: randomCommit,
      trigger,
      scanTypes,
      status: '실행 중',
      startedAt: nowStr,
      durationSeconds: 15,
      findingsCount: 0,
      toolStatuses: scanTypes.map((st) => ({
        name: st === '소스코드 정적 분석' ? 'SonarQube SAST' : st === '의존성 취약점 분석' ? 'Snyk SCA' : st === '비밀정보 탐지' ? 'Gitleaks' : 'Checkov IaC',
        category: st,
        status: '진행 중',
        findingsCount: 0,
        durationSeconds: 5,
      })),
      executionLogs: [
        `[${nowStr.slice(11)}] [INFO] 점검 작업 큐 등록 (Worker 할당 대기)`,
        `[${nowStr.slice(11)}] [INFO] Git 저장소 체크아웃: ${project.repository} (Commit: ${randomCommit})`,
        `[${nowStr.slice(11)}] [INFO] 격리된 스캐너 컨테이너 기동 중...`,
      ],
    };

    setScans((prev) => [newScan, ...prev]);
    toast.info(`[${project.name}] 보안 점검 시뮬레이션을 시작했습니다.`);

    // Simulate async completion after 2 seconds
    setTimeout(() => {
      setScans((prev) =>
        prev.map((s) => {
          if (s.id !== scanId) return s;

          if (willFail) {
            return {
              ...s,
              status: '실패',
              failureReason: '스캐너 노드 리소스 부족 (OOMKilled - Exit 137). 관리자에게 문의하세요.',
              toolStatuses: s.toolStatuses.map((t) => ({ ...t, status: '오류' })),
              executionLogs: [
                ...s.executionLogs,
                `[${new Date().toLocaleTimeString()}] [ERROR] 컨테이너 메모리 제한 초과로 비정상 종료되었습니다.`,
                `[${new Date().toLocaleTimeString()}] [ERROR] 점검 작업 실패 처리됨.`,
              ],
            };
          }

          // Successful scan
          const toolStatuses = s.toolStatuses.map((t) => ({
            ...t,
            status: '성공' as const,
            findingsCount: 0,
            durationSeconds: Math.floor(Math.random() * 30) + 15,
          }));

          return {
            ...s,
            status: '완료',
            durationSeconds: 45,
            toolStatuses,
            executionLogs: [
              ...s.executionLogs,
              `[${new Date().toLocaleTimeString()}] [INFO] 모든 스캐너 엔진 정상 완료 (정적분석/SCA/비밀정보/IaC)`,
              `[${new Date().toLocaleTimeString()}] [INFO] 정책 엔진 검증 완료: 정상 완료 기록`,
            ],
          };
        })
      );

      if (willFail) {
        toast.error(`[${project.name}] 점검 실패 재현: 스캐너 컨테이너 오류 발생!`);
      } else {
        toast.success(`[${project.name}] 보안 점검 완료 (ID: ${scanId})`);
      }
    }, 2200);

    return newScan;
  };

  const triggerBatchScan = async (projectIds: string[]): Promise<void> => {
    toast.info(`선택한 ${projectIds.length}개 프로젝트의 보안 점검을 일괄 요청했습니다.`);
    for (const pid of projectIds) {
      await triggerScan(pid, '수동');
    }
  };

  const retryScan = async (scanId: string): Promise<void> => {
    const scan = scans.find((s) => s.id === scanId);
    if (!scan) return;
    toast.info(`점검 [${scanId}] 재시도를 시작합니다...`);
    await triggerScan(scan.projectId, scan.trigger, scan.scanTypes);
  };

  // Findings mutations with Optimistic Update & Auto Rollback
  const updateFindingAssigneeAndDueDate = async (
    findingId: string,
    assignee: string,
    dueDate: string
  ): Promise<boolean> => {
    const updatedHistoryItem = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.name,
      action: `담당자(${assignee}) 및 조치기한(${dueDate}) 수정`,
    };

    return executeOptimisticMutation(
      () => findings,
      () => {
        setFindings((prev) =>
          prev.map((f) => {
            if (f.id !== findingId) return f;
            return {
              ...f,
              assignee,
              dueDate,
              history: [...f.history, updatedHistoryItem],
            };
          })
        );
      },
      (snap) => setFindings(snap),
      async () => {
        await api.updateFinding(
          findingId,
          { assignee, dueDate, history: updatedHistoryItem },
          { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        );
      },
      '담당자 및 조치기한이 변경되었습니다.',
      '발견사항 수정 실패'
    );
  };

  const batchUpdateAssignee = async (findingIds: string[], assignee: string): Promise<boolean> => {
    const historyItem = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.name,
      action: `일괄 담당자 지정 -> ${assignee}`,
    };

    return executeOptimisticMutation(
      () => findings,
      () => {
        setFindings((prev) =>
          prev.map((f) => {
            if (!findingIds.includes(f.id)) return f;
            return {
              ...f,
              assignee,
              history: [...f.history, historyItem],
            };
          })
        );
      },
      (snap) => setFindings(snap),
      async () => {
        await api.batchUpdateFindings(
          findingIds,
          { assignee, history: historyItem },
          { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        );
      },
      `${findingIds.length}개 발견사항의 담당자가 [${assignee}] 님으로 일괄 변경되었습니다.`,
      '일괄 담당자 지정 실패'
    );
  };

  const markAsFalsePositive = async (findingId: string, reason: string): Promise<boolean> => {
    const historyItem = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.name,
      action: '오탐(False Positive) 처리',
      comment: reason,
    };

    return executeOptimisticMutation(
      () => findings,
      () => {
        setFindings((prev) =>
          prev.map((f) => {
            if (f.id !== findingId) return f;
            return {
              ...f,
              status: '오탐',
              falsePositiveReason: reason,
              history: [...f.history, historyItem],
            };
          })
        );
      },
      (snap) => setFindings(snap),
      async () => {
        await api.updateFinding(
          findingId,
          { status: '오탐', falsePositiveReason: reason, history: historyItem },
          { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        );
      },
      '오탐 처리가 완료되었습니다.',
      '오탐 처리 저장 실패'
    );
  };

  const requestSecurityException = async (
    findingId: string,
    reason: string,
    expiresAt: string
  ): Promise<boolean> => {
    const historyItem = {
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      actor: currentUser.name,
      action: `보안 예외 승인 처리 (만료일: ${expiresAt})`,
      comment: reason,
    };

    return executeOptimisticMutation(
      () => findings,
      () => {
        setFindings((prev) =>
          prev.map((f) => {
            if (f.id !== findingId) return f;
            return {
              ...f,
              status: '예외 승인',
              exceptionReason: reason,
              exceptionExpiresAt: expiresAt,
              history: [...f.history, historyItem],
            };
          })
        );
      },
      (snap) => setFindings(snap),
      async () => {
        await api.updateFinding(
          findingId,
          { status: '예외 승인', exceptionReason: reason, exceptionExpiresAt: expiresAt, history: historyItem },
          { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        );
      },
      `보안 예외가 승인되었습니다 (만료일: ${expiresAt}).`,
      '보안 예외 승인 저장 실패'
    );
  };

  const simulateRescanFinding = async (findingId: string): Promise<boolean> => {
    const finding = findings.find((f) => f.id === findingId);
    if (!finding) return false;

    toast.info(`발견사항 [${findingId}] 단독 재점검 시뮬레이션을 실행 중...`);

    // Simulate 1.5s scan
    await new Promise((res) => setTimeout(res, 1500));

    // Resolve condition: 70% resolved, 30% recurring
    const resolved = Math.random() > 0.3;

    setFindings((prev) =>
      prev.map((f) => {
        if (f.id !== findingId) return f;
        if (resolved) {
          return {
            ...f,
            status: '해결',
            rescanResult: '확인 완료(해결)',
            history: [
              ...f.history,
              {
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                actor: `${currentUser.name} (재점검 러너)`,
                action: '재점검 결과 취약점 코드 제거 확인 -> [해결] 상태 갱신',
              },
            ],
          };
        } else {
          return {
            ...f,
            rescanResult: '재발견(미해결)',
            history: [
              ...f.history,
              {
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
                actor: `${currentUser.name} (재점검 러너)`,
                action: '재점검 결과 여전히 취약점 패턴이 검출됨 (미해결 유지)',
              },
            ],
          };
        }
      })
    );

    if (resolved) {
      toast.success(`[${findingId}] 재점검 완료: 취약점이 정상 해결되었습니다!`);
    } else {
      toast.warning(`[${findingId}] 재점검 완료: 해당 취약점이 여전히 소스에 남아있습니다.`);
    }

    return resolved;
  };

  // Deployment Review mutations
  // Deployment Review mutations with Optimistic Update & Auto Rollback
  const reviewDeployment = async (
    reviewId: string,
    status: '승인' | '반려',
    comment: string
  ): Promise<boolean> => {
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    return executeOptimisticMutation(
      () => reviews,
      () => {
        setReviews((prev) => {
          const updated = prev.map((r) => {
            if (r.id !== reviewId) return r;
            return {
              ...r,
              approvalStatus: status,
              reviewer: currentUser.name,
              reviewComment: comment,
              reviewedAt: nowStr,
            };
          });
          try {
            localStorage.setItem('secureflow_custom_reviews', JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      },
      (snap) => setReviews(snap),
      async () => {
        await api.updateReview(
          reviewId,
          {
            approvalStatus: status,
            reviewer: currentUser.name,
            reviewComment: comment,
            reviewedAt: nowStr,
          },
          { id: currentUser.id, name: currentUser.name, role: currentUser.role }
        );
      },
      status === '승인'
        ? `배포 심사 [${reviewId}] 건이 승인되었습니다. (보안 판정은 정책 규칙을 유지합니다)`
        : `배포 심사 [${reviewId}] 건이 반려 처리되었습니다.`,
      '배포 심사 저장 실패'
    );
  };

  // Policy & Git Config
  const updatePolicy = async (newPolicy: SecurityPolicy): Promise<boolean> => {
    if (demoFaults.failNextSave) {
      setDemoFaults((prev) => ({ ...prev, failNextSave: false }));
      toast.error('저장 실패 시뮬레이션: 정책 저장 오류 발생');
      return false;
    }
    setPolicy(newPolicy);
    toast.success('보안 정책이 성공적으로 저장되었습니다.');
    return true;
  };

  const updateGitConfig = async (newConfig: GitIntegrationConfig): Promise<boolean> => {
    if (demoFaults.failNextSave) {
      setDemoFaults((prev) => ({ ...prev, failNextSave: false }));
      toast.error('저장 실패 시뮬레이션: Git 연동 설정 저장 실패');
      return false;
    }
    setGitConfig(newConfig);
    toast.success('사내 Git 서버 연동 정보가 갱신되었습니다.');
    return true;
  };

  const testGitConnection = async (): Promise<boolean> => {
    toast.info('사내 Git 서버 API 통신 테스트 중...');
    await new Promise((res) => setTimeout(res, 1200));
    setGitConfig((prev) => ({
      ...prev,
      connectionStatus: '연결됨',
      lastEventAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }));
    toast.success('Git 서버 연결 테스트 성공: Webhook 및 API v4 통신 정상 확인');
    return true;
  };

  // Notifications
  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    toast.info('모든 알림을 삭제했습니다.');
  };

  // Demo Fault toggles
  const toggleFailNextScan = () => {
    setDemoFaults((prev) => {
      const nextVal = !prev.failNextScan;
      if (nextVal) {
        toast.warning('다음 보안점검 실패 재현이 예약되었습니다 (1회성).');
      } else {
        toast.info('점검 실패 예약이 해제되었습니다.');
      }
      return { ...prev, failNextScan: nextVal };
    });
  };

  const toggleFailNextSave = () => {
    setDemoFaults((prev) => {
      const nextVal = !prev.failNextSave;
      if (nextVal) {
        toast.warning('다음 저장(생성/수정) 실패 재현이 예약되었습니다 (1회성).');
      } else {
        toast.info('저장 실패 예약이 해제되었습니다.');
      }
      return { ...prev, failNextSave: nextVal };
    });
  };

  const toggleFailNextLoad = () => {
    setDemoFaults((prev) => {
      const nextVal = !prev.failNextLoad;
      if (nextVal) {
        toast.warning('다음 데이터 로드 실패 재현이 예약되었습니다.');
        setLoadError('데모 오류 재현: 데이터베이스 연결 실패 (Timeout 504)');
      } else {
        setLoadError(null);
        toast.info('데이터 로드 오류 상태가 해제되었습니다.');
      }
      return { ...prev, failNextLoad: nextVal };
    });
  };

  const retryLoadData = () => {
    setIsLoading(true);
    setLoadError(null);
    invalidateCache('all')
      .then(() => {
        setIsLoading(false);
        toast.success('데이터 다시 불러오기 및 최신 상태 동기화 완료');
      })
      .catch((err) => {
        setIsLoading(false);
        toast.error('동기화 실패: ' + (err?.message || '네트워크 오류'));
      });
  };

  const hasDummyData = useMemo(() => {
    return projects.some((p) => p.id !== 'PRJ-AGENTGATE' && p.id.startsWith('PRJ-0'));
  }, [projects]);

  const commitBaselineScan = async (projectId: string = 'PRJ-AGENTGATE'): Promise<boolean> => {
    const now = new Date();
    const scanTimeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const scanRecord: ScanRun = {
      ...BASELINE_AGENTGATE_SCAN,
      startedAt: scanTimeStr,
    };

    setScans((prev) => [
      scanRecord,
      BASELINE_AGENTGATE_PR_SCAN,
      ...prev.filter((s) => s.id !== scanRecord.id && s.id !== BASELINE_AGENTGATE_PR_SCAN.id),
    ]);
    setFindings((prev) => [
      ...BASELINE_AGENTGATE_FINDINGS,
      ...BASELINE_AGENTGATE_PR_FINDINGS,
      ...prev.filter((f) => f.projectId !== projectId),
    ]);
    setReviews((prev) => [
      ...BASELINE_AGENTGATE_REVIEWS,
      ...prev.filter((r) => r.projectId !== projectId),
    ]);
    localStorage.setItem('secureflow_agentgate_scanned', 'true');

    // Add alert notification
    const newNoti: NotificationItem = {
      id: `NOTI-BASELINE-${Date.now()}`,
      type: 'success',
      title: 'AgentGate 베이스라인 완료 및 신규 PR #1 수신',
      message: '전체 소스코드 점검 완료 후, 신규 PR #1 (feat/session-auth)이 감지되어 배포 게이트 심사 목록에 등록되었습니다.',
      timestamp: '방금 전',
      read: false,
      linkMenu: 'reviews',
    };
    setNotifications((prev) => [newNoti, ...prev]);

    return true;
  };

  const resetBaselineScan = (projectId: string = 'PRJ-AGENTGATE') => {
    setScans((prev) => prev.filter((s) => s.projectId !== projectId));
    setFindings((prev) => prev.filter((f) => f.projectId !== projectId));
    setReviews((prev) => prev.filter((r) => r.projectId !== projectId));
    localStorage.removeItem('secureflow_agentgate_scanned');
    localStorage.removeItem('secureflow_custom_reviews');
    toast.info('AgentGate 프로젝트가 최초 미점검 상태로 재설정되었습니다.', {
      description: '프로젝트 목록 상단의 경고 알림에서 최초 전체 점검을 다시 실행할 수 있습니다.',
    });
  };

  const simulateAgentGatePr = async (scenario: 'block' | 'clean' = 'clean'): Promise<void> => {
    if (scenario === 'clean') {
      const cleanReview: DeploymentReview = {
        id: 'REV-AGENTGATE-02',
        projectId: 'PRJ-AGENTGATE',
        projectName: 'AgentGate 보안 게이트웨이 (연동 저장소)',
        entityId: 'ENT-01',
        entityName: '테크솔루션즈',
        targetEnvironment: '운영',
        requestCommitId: 'a31c890',
        scanCommitId: 'a31c890',
        scanCompletedAt: '2026-10-05 17:16:05',
        requiredScansCompleted: true,
        securityVerdict: '통과',
        verdictReason: '신규 취약점 0건 (Clean Pass) - 보안 정책 기준선 100% 충족',
        approvalStatus: '승인',
        reviewer: '시스템 자동 승인 (클린 검증)',
        reviewComment: '보안 기준 완벽 충족으로 자동 승인 배포 완료',
        reviewedAt: '2026-10-05 17:16:15',
        requester: 'devlee0908',
        requestedAt: '2026-10-05 17:15:00',
      };
      setReviews((prev) => [cleanReview, ...prev.filter((r) => r.id !== cleanReview.id)]);
      toast.success('신규 PR #2 (fix/jwt-algorithms) 검증 완료!', {
        description: '결함 0건 클린 통과로 배포 심사가 자동 승인되었습니다.',
      });
    } else {
      setReviews((prev) => [...BASELINE_AGENTGATE_REVIEWS, ...prev.filter((r) => r.id !== 'REV-AGENTGATE-01')]);
      toast.error('신규 PR #1 (feat/session-auth) 검증 완료!', {
        description: '치명적 SQL Injection 결함 탐지로 배포 게이트가 차단되었습니다.',
      });
    }
  };

  const resolveAgentGateRemediation = (customComment?: string) => {
    // 1. Update review: REV-AGENTGATE-01 to 승인 / 통과
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === 'REV-AGENTGATE-01' || r.projectId === 'PRJ-AGENTGATE') {
          return {
            ...r,
            securityVerdict: '통과' as SecurityVerdict,
            verdictReason: '3건 보안 결함(SQLi, JWT, cross-spawn) 패치 커밋 푸시 확인으로 배포 게이트 통과',
            approvalStatus: '승인' as const,
            reviewer: '보안 심사관 (자동 재검증 통과)',
            reviewComment:
              customComment ||
              '3건 보안 취약점 조치 패치 커밋 푸시 확인 완료 — 운영 배포 자동 승인',
            reviewedAt: new Date().toLocaleString(),
          };
        }
        return r;
      })
    );

    // 2. Update project: PRJ-AGENTGATE
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === 'PRJ-AGENTGATE') {
          return {
            ...p,
            status: '운영 중' as const,
          };
        }
        return p;
      })
    );

    // 3. Update findings: mark all 3 AgentGate findings as '해결'
    setFindings((prev) =>
      prev.map((f) => {
        if (f.projectId === 'PRJ-AGENTGATE') {
          return {
            ...f,
            status: '해결' as const,
          };
        }
        return f;
      })
    );

    // 4. Update scan: mark latest PR scan as '통과'
    setScans((prev) =>
      prev.map((s) => {
        if (s.projectId === 'PRJ-AGENTGATE' && (s.branch?.includes('security-remediation') || s.branch?.includes('session-auth'))) {
          return {
            ...s,
            status: '완료' as const,
            critCount: 0,
            highCount: 0,
            medCount: 0,
          };
        }
        return s;
      })
    );

    // 5. Persist via Zero-Trust Vault GitHub Orchestrator (/api/github/orchestrate)
    api
      .orchestrateGitHubFix({
        action: 'MERGE_PR',
        projectId: 'PRJ-AGENTGATE',
        repository: 'github.com/devlee0908/agentgate',
        branchName: 'fix/security-remediation',
        targetBranch: 'main',
        prTitle: 'fix(security): remediate SQLi, JWT algorithm confusion & CVE-2024-21538',
        author: currentUser.name,
      })
      .catch(() => {});
  };

  const generateDummyData = () => {
    const existingReal = projects.filter((p) => p.id === 'PRJ-AGENTGATE' || !p.id.startsWith('PRJ-0'));
    const baseProjects = existingReal.length > 0 ? existingReal : REAL_PROJECTS;

    const isBaselineScanned = localStorage.getItem('secureflow_agentgate_scanned') === 'true';
    const agentgateScans = isBaselineScanned ? [BASELINE_AGENTGATE_SCAN, BASELINE_AGENTGATE_PR_SCAN] : [];
    const agentgateFindings = isBaselineScanned ? [...BASELINE_AGENTGATE_FINDINGS, ...BASELINE_AGENTGATE_PR_FINDINGS] : [];
    const agentgateReviews = isBaselineScanned ? BASELINE_AGENTGATE_REVIEWS : [];

    setProjects([...baseProjects, ...DUMMY_PROJECTS]);
    setScans([...agentgateScans, ...DUMMY_SCANS]);
    setFindings([...agentgateFindings, ...DUMMY_FINDINGS]);
    setReviews([...agentgateReviews, ...DUMMY_REVIEWS]);
    localStorage.setItem('secureflow_has_dummy', 'true');
    toast.success('샘플 더미 데이터가 생성되었습니다!', {
      description: '15개 샘플 프로젝트, 30개 점검 이력, 48개 취약점이 로드되었습니다.',
    });
  };

  const clearDummyData = () => {
    const onlyRealProjects = projects.filter((p) => p.id === 'PRJ-AGENTGATE' || !p.id.startsWith('PRJ-0'));
    const finalProjects = onlyRealProjects.length > 0 ? onlyRealProjects : REAL_PROJECTS;

    const isBaselineScanned = localStorage.getItem('secureflow_agentgate_scanned') === 'true';
    const agentgateScans = isBaselineScanned ? [BASELINE_AGENTGATE_SCAN, BASELINE_AGENTGATE_PR_SCAN] : [];
    const agentgateFindings = isBaselineScanned ? [...BASELINE_AGENTGATE_FINDINGS, ...BASELINE_AGENTGATE_PR_FINDINGS] : [];
    const agentgateReviews = isBaselineScanned ? BASELINE_AGENTGATE_REVIEWS : [];

    setProjects(finalProjects);
    setScans(agentgateScans);
    setFindings(agentgateFindings);
    setReviews(agentgateReviews);
    setSelectedEntityId('ALL');
    localStorage.setItem('secureflow_has_dummy', 'false');
    toast.info('더미 데이터가 모두 제거되었습니다.', {
      description: '실제 연동된 AgentGate 프로젝트만 유지됩니다.',
    });
  };

  const setEmptyState = () => {
    setProjects([]);
    setScans([]);
    setFindings([]);
    setReviews([]);
    localStorage.setItem('secureflow_has_dummy', 'false');
    toast.info('데이터를 [빈 상태(0건)]로 전환했습니다.');
  };

  const resetDemoData = () => {
    clearDummyData();
    setEntities(INITIAL_ENTITIES);
    setPolicy(INITIAL_SECURITY_POLICY);
    setGitConfig(INITIAL_GIT_CONFIG);
    setNotifications(INITIAL_NOTIFICATIONS);
    setLoadError(null);
    setSelectedEntityId('ALL');
    setDemoFaults({ failNextScan: false, failNextSave: false, failNextLoad: false });
    toast.success('시스템이 기본 클린 상태(실 연동 프로젝트만 유지)로 복원되었습니다.');
  };

  return (
    <DevSecOpsContext.Provider
      value={{
        theme,
        setTheme,
        entities,
        projects,
        scans,
        findings,
        reviews,
        policy,
        gitConfig,
        notifications,
        currentUser,
        selectedEntityId,
        demoFaults,
        isLoading,
        loadError,
        isSyncing,
        lastSyncedAt,
        syncError,
        syncVersion,
        invalidateCache,
        isAuthenticated,
        login,
        logout,
        setSelectedEntityId,
        setCurrentUserRole,
        markNotificationAsRead,
        clearAllNotifications,
        getProjectLatestScan,
        getProjectUnresolvedHighCriticalCount,
        getProjectOverallStatus,
        getProjectDeploymentReview,
        getProjectFindings,
        evaluateDeploymentVerdict,
        addProject,
        updateProject,
        deleteProject,
        triggerScan,
        triggerBatchScan,
        retryScan,
        updateFindingAssigneeAndDueDate,
        batchUpdateAssignee,
        markAsFalsePositive,
        requestSecurityException,
        simulateRescanFinding,
        reviewDeployment,
        updatePolicy,
        updateGitConfig,
        testGitConnection,
        toggleFailNextScan,
        toggleFailNextSave,
        toggleFailNextLoad,
        setEmptyState,
        resetDemoData,
        retryLoadData,
        commitBaselineScan,
        resetBaselineScan,
        simulateAgentGatePr,
        resolveAgentGateRemediation,
        hasDummyData,
        generateDummyData,
        clearDummyData,
      }}
    >
      {children}
    </DevSecOpsContext.Provider>
  );
};

export const useDevSecOps = () => {
  const context = useContext(DevSecOpsContext);
  if (!context) {
    throw new Error('useDevSecOps must be used within a DevSecOpsProvider');
  }
  return context;
};
