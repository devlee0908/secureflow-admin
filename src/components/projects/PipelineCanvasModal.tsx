import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Project, SecurityPolicy } from '@/types';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  Scan,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  User,
  Users,
  Server,
  Rocket,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Loader2,
  X,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  Terminal,
  Layers,
  Code2,
  Package,
  KeyRound,
  FileCode,
  Check,
  Building2,
  HelpCircle,
  Info,
  RefreshCw,
  Undo2,
  AlertCircle,
  GitFork,
  GitMerge,
  Bell,
  Workflow,
  CornerDownRight,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { calculateProjectSecurityScore } from '@/lib/securityScore';
import { SecurityScoreBadge } from '@/components/common/SecurityScoreBadge';
import { SecurityOverrideModal, SecurityOverrideData } from './SecurityOverrideModal';
import { FixBranchModal, FixBranchData } from './FixBranchModal';
import { DeveloperWorkflowModal } from './DeveloperWorkflowModal';
import { GitHubPrChecksModal } from './GitHubPrChecksModal';
import { BranchLifecycleCanvas } from './BranchLifecycleCanvas';
import { StandardPipelineTracks } from './StandardPipelineTracks';
import { PipelineLiveTerminal } from './PipelineLiveTerminal';
import { AGENTGATE_ALL_SCAN_ISSUES } from '@/mock/mockData';
import { toast } from 'sonner';

// Sample Pipeline Run Structure
export interface PipelineRunSample {
  id: string;
  author: string;
  authorEmail: string;
  authorRole: string;
  department: string;
  avatarColor: string;
  branch: string;
  targetBranch: string;
  trigger: 'Push' | 'PR/MR';
  prNumber?: number;
  commitId: string;
  commitMessage: string;
  startedAt: string;

  // Stages progression (1: Trigger, 2: Scanner, 3: Gate, 4: Review, 5: Deploy)
  currentStage: 1 | 2 | 3 | 4 | 5;

  // Stage 2: Scanner
  scanStatus: 'completed' | 'running' | 'failed' | 'pending';
  scanDuration: number;
  toolStatuses: {
    sast: { count: number; duration: number; status: '성공' | '경고' | '대기' | '실행 중' };
    sca: { count: number; duration: number; status: '성공' | '경고' | '대기' | '실행 중' };
    secret: { count: number; duration: number; status: '성공' | '경고' | '대기' | '실행 중' };
    iac: { count: number; duration: number; status: '성공' | '경고' | '대기' | '실행 중' };
  };
  executionLogs: string[];

  // Stage 3: Policy Gate
  gateStatus: 'passed' | 'review' | 'blocked' | 'pending';
  critCount: number;
  highCount: number;
  medCount: number;
  policyNotes?: string;

  // Stage 4: Review
  reviewStatus: 'approved' | 'rejected' | 'pending_review' | 'not_reached';
  reviewer?: string;
  reviewComment?: string;
  targetEnvironment: '개발' | '검증' | '운영';
  commitMatch: boolean;

  // Stage 5: Deploy Target
  deployStatus: 'deployed' | 'blocked' | 'pending' | 'not_reached';
  cluster: string;
  namespace: string;
  replicas: string;

  // Real-world operational scenarios & states
  isOverridden?: boolean;
  overrideData?: SecurityOverrideData;
  canaryFailed?: boolean;
  isRolledBack?: boolean;
  rollbackVersion?: string;
  toolFailure?: 'sast' | 'sca' | null;
}

interface PipelineCanvasModalProps {
  project: Project;
  onClose: () => void;
  onOpenSheet?: () => void;
  onSelectProject?: (project: Project) => void;
  onNavigate?: (menu: any, filterState?: any) => void;
}

export const PipelineCanvasModal: React.FC<PipelineCanvasModalProps> = ({
  project,
  onClose,
  onOpenSheet,
  onSelectProject,
  onNavigate,
}) => {
  const {
    policy,
    projects,
    findings,
    hasDummyData,
    getProjectLatestScan,
    commitBaselineScan,
    resolveAgentGateRemediation,
  } = useDevSecOps();

  // Security Score calculation for current project
  const projectScore = useMemo(
    () => calculateProjectSecurityScore(project.id, findings),
    [project.id, findings]
  );

  // Canvas zoom & pan state
  const [zoom, setZoom] = useState<number>(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasViewportRef = useRef<HTMLDivElement>(null);

  // Inspector Panel State
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-scanners');
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Real-time Staged Simulation State (Phase 1 Enhancement)
  const [simulationStage, setSimulationStage] = useState<number | null>(null);
  const [activeScannerTool, setActiveScannerTool] = useState<string | null>(null);
  const [toolScanProgress, setToolScanProgress] = useState<{
    sast: 'waiting' | 'running' | 'completed';
    sca: 'waiting' | 'running' | 'completed';
    secret: 'waiting' | 'running' | 'completed';
    iac: 'waiting' | 'running' | 'completed';
  }>({
    sast: 'waiting',
    sca: 'waiting',
    secret: 'waiting',
    iac: 'waiting',
  });

  // Real-world Pipeline Interactive States
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isFixBranchModalOpen, setIsFixBranchModalOpen] = useState(false);
  const [isDevWorkflowModalOpen, setIsDevWorkflowModalOpen] = useState(false);
  const [isPrChecksModalOpen, setIsPrChecksModalOpen] = useState(false);
  const [canvasViewMode, setCanvasViewMode] = useState<'standard' | 'lifecycle'>('standard');
  const [lifecycleStep, setLifecycleStep] = useState<number | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<
    | 'clean_pass'
    | 'hard_block'
    | 'emergency_override'
    | 'scanner_timeout'
    | 'review_rejected'
    | 'canary_rollback'
    | 'secret_leak'
    | 'iac_misconfig'
  >('clean_pass');
  const [retryingTool, setRetryingTool] = useState<string | null>(null);

  // Generate realistic pipeline runs based on authentic project and dummy state
  const initialRuns = useMemo<PipelineRunSample[]>(() => {
    const isAgentGate = project.id === 'PRJ-AGENTGATE';
    const latestScan = getProjectLatestScan(project.id);
    const isBaselineScanned = Boolean(latestScan && latestScan.status === '완료');

    // 1. Real Project (AgentGate) or when dummy data is disabled:
    // Display ONLY authentic owner runs, matching the actual TypeScript gateway architecture
    if (isAgentGate || !hasDummyData) {
      if (!isBaselineScanned) {
        // Project registered, awaiting initial full baseline scan
        return [
          {
            id: 'run-agentgate-unscanned',
            author: project.owner,
            authorEmail: project.ownerEmail,
            authorRole: '프로젝트 담당자',
            department: project.department,
            avatarColor: 'from-indigo-600 to-indigo-400',
            branch: project.defaultBranch || 'main',
            targetBranch: project.defaultBranch || 'main',
            trigger: 'Push',
            commitId: 'e81a3d9',
            commitMessage: 'Initial commit: AgentGate reverse proxy & token filter',
            startedAt: project.createdAt || '2026-10-05 16:00:00',
            currentStage: 1, // 1단계 Git 이벤트 수신 완료, 2~5단계는 최초 전체 점검 대기 중!
            scanStatus: 'pending',
            scanDuration: 0,
            toolStatuses: {
              sast: { count: 0, duration: 0, status: '대기' },
              sca: { count: 0, duration: 0, status: '대기' },
              secret: { count: 0, duration: 0, status: '대기' },
              iac: { count: 0, duration: 0, status: '대기' },
            },
            executionLogs: [
              `[16:00:00] [INFO] Git Webhook connected for ${project.repository} (@e81a3d9) by ${project.owner}`,
              '[16:00:05] [INFO] Target repository branch: main',
              '[16:00:10] [WARN] 최초 소스코드 전체 점검(Full Baseline Scan) 미실행 상태입니다.',
              '[16:00:15] [INFO] 상단의 [파이프라인 실행] 또는 프로젝트 화면의 [최초 전체 점검]을 실행하여 보안 기준선을 수립하세요.',
            ],
            gateStatus: 'pending',
            critCount: 0,
            highCount: 0,
            medCount: 0,
            policyNotes: '최초 전체 소스코드 베이스라인 점검 미실행 (보안 기준선 수립 필요)',
            reviewStatus: 'not_reached',
            targetEnvironment: '운영',
            commitMatch: true,
            deployStatus: 'pending',
            cluster: 'k8s-prod-seoul',
            namespace: 'agentgate-svc',
            replicas: '0 / 4 (최초 점검 대기)',
          },
        ];
      }

      // Project baseline scanned: return 3 authentic AgentGate runs (all authored by devlee0908, pure TypeScript)
      return [
        {
          id: 'run-agentgate-main',
          author: project.owner,
          authorEmail: project.ownerEmail,
          authorRole: '프로젝트 담당자',
          department: project.department,
          avatarColor: 'from-indigo-600 to-indigo-400',
          branch: 'main',
          targetBranch: 'main',
          trigger: 'Push',
          commitId: 'e81a3d9',
          commitMessage: 'feat(core): AgentGate reverse proxy and JWT authentication engine',
          startedAt: latestScan?.startedAt || '2026-10-05 16:30:00',
          currentStage: 5,
          scanStatus: 'completed',
          scanDuration: 85,
          toolStatuses: {
            sast: { count: 1, duration: 38, status: '경고' },
            sca: { count: 1, duration: 24, status: '경고' },
            secret: { count: 0, duration: 11, status: '성공' },
            iac: { count: 0, duration: 12, status: '성공' },
          },
          executionLogs: [
            `[16:30:00] [INFO] Runner container spawned for ${project.repository} (main @e81a3d9) by ${project.owner}`,
            '[16:30:38] [WARN] [SonarQube SAST] JWT algorithms option missing in src/auth/jwt.ts:28 (CWE-327, Medium)',
            '[16:31:02] [WARN] [Trivy SCA] cross-spawn v7.0.3 ReDoS vulnerability detected (CVE-2024-21538, Medium)',
            '[16:31:25] [INFO] Full Baseline Scan finished (Security Score: 88, B+).',
            '[16:31:30] [INFO] Quality Gate: 통과 (Medium 2건 기술부채 등록 / 치명·높음 0건)',
            '[16:31:45] [INFO] Production cluster rolling update completed successfully.',
          ],
          gateStatus: 'passed',
          critCount: 0,
          highCount: 0,
          medCount: 2,
          policyNotes: '치명적/높음 결함 0건 - 베이스라인 기준선 통과 (중간 2건 보안 부채 등록)',
          reviewStatus: 'approved',
          reviewer: '시스템 자동 승인 (베이스라인 통과)',
          reviewComment: '최초 전체 점검 무결점 기준 충족으로 정상 등록 승인',
          targetEnvironment: '운영',
          commitMatch: true,
          deployStatus: 'deployed',
          cluster: 'k8s-prod-seoul',
          namespace: 'agentgate-svc',
          replicas: '4 / 4 Active',
        },
        {
          id: 'run-agentgate-pr1',
          author: project.owner,
          authorEmail: project.ownerEmail,
          authorRole: '프로젝트 담당자',
          department: project.department,
          avatarColor: 'from-rose-600 to-amber-500',
          branch: 'feat/session-auth',
          targetBranch: 'main',
          trigger: 'PR/MR',
          prNumber: 1,
          commitId: 'f9c2a10',
          commitMessage: 'feat: 세션 캐시 Redis 연동 및 쿼리 파라미터 핸들러 추가',
          startedAt: '2026-10-05 17:00:00',
          currentStage: 3, // 3단계: 정책 게이트 차단!
          scanStatus: 'completed',
          scanDuration: 72,
          toolStatuses: {
            sast: { count: 1, duration: 32, status: '경고' },
            sca: { count: 0, duration: 18, status: '성공' },
            secret: { count: 0, duration: 10, status: '성공' },
            iac: { count: 0, duration: 12, status: '성공' },
          },
          executionLogs: [
            `[17:00:00] [INFO] PR #1 webhook received: feat/session-auth -> main by ${project.owner}`,
            '[17:00:22] [ERROR] [SonarQube SAST] SQL Injection detected in src/auth/session.ts:34 (CWE-89, Critical)',
            '[17:00:32] [ERROR] 보안 정책 규칙 위반: 신규 치명적(Critical) 결함으로 CI/CD 게이트 차단',
            '[17:00:32] [TERMINAL] 🚫 배포 파이프라인 차단 (GitHub PR Checks 실패 상태 리포트 전송)',
          ],
          gateStatus: 'blocked',
          critCount: 1,
          highCount: 0,
          medCount: 0,
          policyNotes: '신규 치명적 SQL Injection(src/auth/session.ts:34) 결함으로 인해 배포 즉시 차단',
          reviewStatus: 'not_reached',
          targetEnvironment: '운영',
          commitMatch: true,
          deployStatus: 'blocked',
          cluster: 'k8s-prod-seoul',
          namespace: 'agentgate-svc',
          replicas: '0 / 4 (차단됨)',
        },
        {
          id: 'run-agentgate-pr2',
          author: project.owner,
          authorEmail: project.ownerEmail,
          authorRole: '프로젝트 담당자',
          department: project.department,
          avatarColor: 'from-emerald-600 to-teal-400',
          branch: 'fix/jwt-algorithms',
          targetBranch: 'main',
          trigger: 'PR/MR',
          prNumber: 2,
          commitId: 'a31c890',
          commitMessage: 'fix(security): jwt.verify algorithms 화이트리스트 고정 및 의존성 패치',
          startedAt: '2026-10-05 17:15:00',
          currentStage: 5,
          scanStatus: 'completed',
          scanDuration: 55,
          toolStatuses: {
            sast: { count: 0, duration: 22, status: '성공' },
            sca: { count: 0, duration: 16, status: '성공' },
            secret: { count: 0, duration: 8, status: '성공' },
            iac: { count: 0, duration: 9, status: '성공' },
          },
          executionLogs: [
            `[17:15:00] [INFO] PR #2 webhook received: fix/jwt-algorithms -> main by ${project.owner}`,
            '[17:15:22] [INFO] SonarQube SAST: 0 vulnerabilities, 0 hotspots (Clean)',
            '[17:15:38] [INFO] Trivy SCA: 0 vulnerabilities (cross-spawn override applied)',
            '[17:15:55] [INFO] Quality Gate: 100% 통과 (Pass) - Zero New Vulnerabilities',
            '[17:16:05] [INFO] Deployment Review: 클린 점검 통과 자동 승인',
            '[17:16:25] [INFO] Kubernetes rolling update completed successfully.',
          ],
          gateStatus: 'passed',
          critCount: 0,
          highCount: 0,
          medCount: 0,
          policyNotes: '신규 결함 0건 - 모든 보안 게이트 통과',
          reviewStatus: 'approved',
          reviewer: '시스템 자동 승인 (클린 검증)',
          reviewComment: '보안 기준 완벽 충족으로 자동 승인 배포',
          targetEnvironment: '운영',
          commitMatch: true,
          deployStatus: 'deployed',
          cluster: 'k8s-prod-seoul',
          namespace: 'agentgate-svc',
          replicas: '4 / 4 Active (v1.0.1)',
        },
      ];
    }

    // 2. Sample Dummy Runs (Only when hasDummyData is explicitly enabled by user and for non-AgentGate projects)
    const ownerName = project.owner;
    const ownerEmail = project.ownerEmail;
    const dept = project.department;

    return [
      {
        id: 'run-owner-1',
        author: ownerName,
        authorEmail: ownerEmail,
        authorRole: '프로젝트 담당자',
        department: dept,
        avatarColor: 'from-indigo-600 to-indigo-400',
        branch: 'feature/auth-token-v2',
        targetBranch: project.defaultBranch || 'main',
        trigger: 'PR/MR',
        prNumber: 142,
        commitId: '8f2a1b9',
        commitMessage: '결제 및 인증 토큰 보안 검증 로직 개선',
        startedAt: '2026-10-01 14:15:00',
        currentStage: 4,
        scanStatus: 'completed',
        scanDuration: 94,
        toolStatuses: {
          sast: { count: 1, duration: 38, status: '경고' },
          sca: { count: 2, duration: 24, status: '경고' },
          secret: { count: 0, duration: 12, status: '성공' },
          iac: { count: 0, duration: 20, status: '성공' },
        },
        executionLogs: [
          `[14:15:00] [INFO] Runner container spawned for PR #142 (feature/auth-token-v2) by ${ownerName}`,
          '[14:15:08] [INFO] Cloned commit @8f2a1b9',
          '[14:15:35] [WARN] [Snyk] 2 Medium vulnerabilities detected in dependencies',
          '[14:15:55] [WARN] [SonarQube] 1 Security Hotspot detected in src/auth/token.ts',
          '[14:16:34] [INFO] All scanners completed in 94s. Gate: 검토 필요 판정.',
        ],
        gateStatus: 'review',
        critCount: 0,
        highCount: 0,
        medCount: 2,
        policyNotes: '중간(Medium) 결함 2건으로 인해 배포 전 수동 심사 필요',
        reviewStatus: 'pending_review',
        reviewer: '보안팀 최수민 팀장',
        reviewComment: '중간 결함 조치 계획서 확인 중 (심사 진행 중)',
        targetEnvironment: '운영',
        commitMatch: true,
        deployStatus: 'pending',
        cluster: 'k8s-prod-seoul',
        namespace: `${project.id.toLowerCase()}-svc`,
        replicas: '4 / 4 Active',
      },
      {
        id: 'run-owner-2',
        author: ownerName,
        authorEmail: ownerEmail,
        authorRole: '프로젝트 담당자',
        department: dept,
        avatarColor: 'from-indigo-600 to-indigo-400',
        branch: 'hotfix/session-patch',
        targetBranch: project.defaultBranch || 'main',
        trigger: 'Push',
        commitId: 'd91e4c2',
        commitMessage: '긴급 세션 메모리 누수 핫픽스 및 보안 패치 적용',
        startedAt: '2026-09-30 22:40:00',
        currentStage: 5,
        scanStatus: 'completed',
        scanDuration: 62,
        toolStatuses: {
          sast: { count: 0, duration: 25, status: '성공' },
          sca: { count: 0, duration: 18, status: '성공' },
          secret: { count: 0, duration: 9, status: '성공' },
          iac: { count: 0, duration: 10, status: '성공' },
        },
        executionLogs: [
          `[22:40:00] [INFO] Direct push event received on main (@d91e4c2) by ${ownerName}`,
          '[22:40:15] [INFO] Clean code analysis passed (0 defects)',
          '[22:41:02] [INFO] Security Policy Gate: 100% 통과 (Pass)',
          '[22:41:10] [INFO] Deployment Review: 긴급 핫픽스 패스트트랙 자동 승인',
          '[22:41:30] [INFO] Kubernetes rolling update completed successfully.',
        ],
        gateStatus: 'passed',
        critCount: 0,
        highCount: 0,
        medCount: 0,
        policyNotes: '모든 점검 무결점 클린 통과 (0 defects)',
        reviewStatus: 'approved',
        reviewer: '시스템 자동 승인 (긴급 패스트트랙)',
        reviewComment: '핫픽스 클린 점검 통과로 즉시 배포 승인',
        targetEnvironment: '운영',
        commitMatch: true,
        deployStatus: 'deployed',
        cluster: 'k8s-prod-seoul',
        namespace: `${project.id.toLowerCase()}-svc`,
        replicas: '4 / 4 Pods Serving (v2.4.1)',
      },
      {
        id: 'run-owner-3',
        author: ownerName,
        authorEmail: ownerEmail,
        authorRole: '프로젝트 담당자',
        department: dept,
        avatarColor: 'from-indigo-600 to-indigo-400',
        branch: 'feature/service-api-v2',
        targetBranch: project.defaultBranch || 'main',
        trigger: 'PR/MR',
        prNumber: 145,
        commitId: 'b45f1a8',
        commitMessage: '고객용 신규 마이크로서비스 연동 API v2 스펙 추가',
        startedAt: '방금 전 (실시간 분석 중)',
        currentStage: 2,
        scanStatus: 'running',
        scanDuration: 42,
        toolStatuses: {
          sast: { count: 0, duration: 28, status: '실행 중' },
          sca: { count: 0, duration: 14, status: '실행 중' },
          secret: { count: 0, duration: 0, status: '대기' },
          iac: { count: 0, duration: 0, status: '대기' },
        },
        executionLogs: [
          `[방금 전] [INFO] Runner container spawned (ID: run-7712) for ${ownerName}`,
          '[방금 전] [INFO] Scanning AST tree with SonarQube ruleset v10.2...',
          '[방금 전] [INFO] Dependency check worker executing in parallel...',
          '[진행 중] [INFO] 보안점검 러너가 실시간 소스코드를 분석 중입니다...',
        ],
        gateStatus: 'pending',
        critCount: 0,
        highCount: 0,
        medCount: 0,
        reviewStatus: 'not_reached',
        targetEnvironment: '운영',
        commitMatch: true,
        deployStatus: 'not_reached',
        cluster: 'k8s-prod-seoul',
        namespace: `${project.id.toLowerCase()}-svc`,
        replicas: '4 / 4 Active',
      },
    ];
  }, [project, projects, hasDummyData, getProjectLatestScan]);

  // Local state for runs
  const [runs, setRuns] = useState<PipelineRunSample[]>(initialRuns);
  const [selectedRunId, setSelectedRunId] = useState<string>(() => initialRuns[0]?.id || 'run-1');
  const [selectedDeveloperFilter, setSelectedDeveloperFilter] = useState<string | 'all'>('all');
  const [selectedRunFilter, setSelectedRunFilter] = useState<string | 'all'>('all');

  // Synchronize when project or initial runs change
  useEffect(() => {
    setRuns(initialRuns);
    if (!initialRuns.some((r) => r.id === selectedRunId)) {
      setSelectedRunId(initialRuns[0]?.id || '');
    }
  }, [initialRuns]);

  // Group runs by developer name (User Requirement: 보기 기준)
  const developers = useMemo(() => {
    const list: {
      author: string;
      authorRole: string;
      department: string;
      isOwner: boolean;
      runs: PipelineRunSample[];
    }[] = [];

    runs.forEach((r) => {
      let dev = list.find((d) => d.author === r.author);
      if (!dev) {
        dev = {
          author: r.author,
          authorRole: r.authorRole,
          department: r.department,
          isOwner: r.author === project.owner,
          runs: [],
        };
        list.push(dev);
      }
      dev.runs.push(r);
    });

    return list;
  }, [runs, project.owner]);

  // Filter developers based on view selection (전체보기 vs 개별 작업자)
  const visibleDevelopers = useMemo(() => {
    if (selectedDeveloperFilter === 'all') {
      return developers;
    }
    return developers.filter((d) => d.author === selectedDeveloperFilter);
  }, [developers, selectedDeveloperFilter]);

  // Filter runs based on view selection (전체보기 vs 개별 작업자 vs 단일 PR)
  const visibleRuns = useMemo(() => {
    if (selectedDeveloperFilter === 'all') {
      return runs;
    }
    const devRuns = runs.filter((r) => r.author === selectedDeveloperFilter);
    if (selectedRunFilter !== 'all') {
      const single = devRuns.filter((r) => r.id === selectedRunFilter);
      return single.length > 0 ? single : devRuns;
    }
    return devRuns;
  }, [runs, selectedDeveloperFilter, selectedRunFilter]);

  // Reset selected run only when project changes
  useEffect(() => {
    setSelectedRunId(initialRuns[0]?.id || '');
    setSelectedDeveloperFilter('all');
    setSelectedRunFilter('all');
  }, [project.id, initialRuns]);

  // Currently active run
  const activeRun = useMemo(() => {
    return runs.find((r) => r.id === selectedRunId) || runs[0];
  }, [runs, selectedRunId]);

  // Lock body scroll while modal is mounted
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Fit canvas content into viewport with balanced centering
  const fitView = useCallback((mode: 'standard' | 'lifecycle' = canvasViewMode) => {
    const el = canvasViewportRef.current;
    if (!el) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    if (!vw || !vh) return;

    const runsCount = visibleRuns.length;

    if (mode === 'lifecycle') {
      // BranchLifecycleCanvas bounding box: 2260px x (runsCount * 1150px)
      const contentWidth = 2260;
      const contentHeight = runsCount > 1 ? runsCount * 1150 : 1040;
      const padX = 50;
      const padY = 40;
      const availW = Math.max(vw - padX * 2, 300);
      const availH = Math.max(vh - padY * 2, 200);
      const rawZoom = runsCount === 1
        ? Math.min(availW / contentWidth, availH / contentHeight)
        : Math.min(availW / contentWidth, (availH / 1040) * 0.85);
      const targetZoom = Math.min(Math.max(Number(rawZoom.toFixed(2)), 0.35), 1.05);

      const targetPanX = Math.round((vw - contentWidth * targetZoom) / 2);
      const targetPanY = runsCount === 1 ? Math.round((vh - contentHeight * targetZoom) / 2) : 30;

      setZoom(targetZoom);
      setPan({ x: targetPanX, y: targetPanY });
    } else {
      // Standard 5-stage pipeline bounding box: 2050px x (runsCount * 440px)
      const contentWidth = 2050;
      const contentHeight = runsCount > 1 ? runsCount * 440 + 60 : 420;
      const padX = 50;
      const padY = 40;
      const availW = Math.max(vw - padX * 2, 300);
      const availH = Math.max(vh - padY * 2, 200);
      const rawZoom = runsCount === 1
        ? Math.min(availW / contentWidth, availH / 420)
        : Math.min(availW / contentWidth, (availH / 420) * 0.75);
      const targetZoom = Math.min(Math.max(Number(rawZoom.toFixed(2)), 0.45), 1.0);

      const targetPanX = Math.round((vw - contentWidth * targetZoom) / 2);
      const targetPanY = runsCount === 1 ? Math.round((vh - 420 * targetZoom) / 2) : 30;

      setZoom(targetZoom);
      setPan({ x: targetPanX, y: targetPanY });
    }
  }, [canvasViewMode, visibleRuns.length]);

  // Center-anchored zoom controls
  const zoomAroundCenter = useCallback((delta: number) => {
    const el = canvasViewportRef.current;
    setZoom((prevZoom) => {
      const nextZoom = Math.min(Math.max(Number((prevZoom + delta).toFixed(2)), 0.35), 1.8);
      if (el) {
        const vw = el.clientWidth;
        const vh = el.clientHeight;
        const centerX = vw / 2;
        const centerY = vh / 2;
        const canvasX = (centerX - pan.x) / prevZoom;
        const canvasY = (centerY - pan.y) / prevZoom;
        const nextPanX = Math.round(centerX - canvasX * nextZoom);
        const nextPanY = Math.round(centerY - canvasY * nextZoom);
        setPan({ x: nextPanX, y: nextPanY });
      }
      return nextZoom;
    });
  }, [pan.x, pan.y]);

  const handleZoomIn = () => zoomAroundCenter(0.12);
  const handleZoomOut = () => zoomAroundCenter(-0.12);
  const handleResetZoom = () => {
    const el = canvasViewportRef.current;
    const runsCount = visibleRuns.length;
    const contentW = canvasViewMode === 'lifecycle' ? 2260 : 2050;
    const contentH = canvasViewMode === 'lifecycle'
      ? (runsCount > 1 ? runsCount * 1150 : 1040)
      : (runsCount > 1 ? runsCount * 440 + 60 : 420);
    if (el) {
      const vw = el.clientWidth;
      const vh = el.clientHeight;
      setPan({
        x: Math.round((vw - contentW * 1) / 2),
        y: runsCount === 1 ? Math.round((vh - contentH * 1) / 2) : 30,
      });
    } else {
      setPan({ x: 30, y: 20 });
    }
    setZoom(1);
  };
  const handleFitScreen = () => {
    fitView(canvasViewMode);
  };

  // Wheel zoom with Ctrl/Meta, trackpad/wheel pan otherwise
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      const el = canvasViewportRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const nextZoom = Math.min(Math.max(Number((prevZoom + delta).toFixed(2)), 0.35), 1.8);
        const canvasX = (mouseX - pan.x) / prevZoom;
        const canvasY = (mouseY - pan.y) / prevZoom;
        setPan({
          x: Math.round(mouseX - canvasX * nextZoom),
          y: Math.round(mouseY - canvasY * nextZoom),
        });
        return nextZoom;
      });
    } else {
      setPan((prev) => ({
        x: Math.round(prev.x - e.deltaX),
        y: Math.round(prev.y - e.deltaY),
      }));
    }
  };

  // Auto-fit on mount, mode switch, inspector toggle, and window resize
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView(canvasViewMode);
    }, 80);
    return () => clearTimeout(timer);
  }, [canvasViewMode, isInspectorOpen, fitView]);

  useEffect(() => {
    const handleResize = () => {
      fitView(canvasViewMode);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasViewMode, fitView]);

  // Granular Retry for Scanner Tool
  const handleRetryScanner = (toolKey: 'sast' | 'sca' | 'secret' | 'iac') => {
    setRetryingTool(toolKey);
    const nowTime = () => new Date().toLocaleTimeString();
    toast.info(`${toolKey.toUpperCase()} 점검 엔진 단독 재연결 시도 중...`);

    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) => {
          if (r.id === activeRun.id) {
            return {
              ...r,
              scanStatus: 'completed',
              toolFailure: null,
              toolStatuses: {
                ...r.toolStatuses,
                [toolKey]: { count: 0, duration: 14, status: '성공' },
              },
              currentStage: 3,
              gateStatus: 'passed',
              executionLogs: [
                ...r.executionLogs,
                `[${nowTime()}] [RETRY] 🔄 ${toolKey.toUpperCase()} 스캐너 워커 파드 재기동 (노드: k8s-sec-worker-01)`,
                `[${nowTime()}] [RETRY] ✓ ${toolKey.toUpperCase()} 단독 분석 완료 (0 defects 탐지, 14초)`,
                `[${nowTime()}] [STAGE 2] 4대 보안점검 엔진 복구 완료 -> 3단계 정책 게이트 평가로 진입`,
              ],
            };
          }
          return r;
        })
      );
      setRetryingTool(null);
      toast.success(`${toolKey.toUpperCase()} 점검 엔진 재시도 성공! 3단계 정책 게이트로 진입합니다.`);
      setSelectedNodeId('node-policy');
    }, 1200);
  };

  // Emergency Security Override (CISO Bypass)
  const handleApproveOverride = (data: SecurityOverrideData) => {
    const nowTime = () => new Date().toLocaleTimeString();
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id === activeRun.id) {
          return {
            ...r,
            isOverridden: true,
            overrideData: data,
            gateStatus: 'passed',
            currentStage: 5,
            reviewStatus: 'approved',
            reviewer: `${data.approver} (긴급 우회 인가)`,
            reviewComment: `[긴급 예외] ${data.reason}: ${data.detail}`,
            deployStatus: 'deployed',
            executionLogs: [
              ...r.executionLogs,
              `[${nowTime()}] [AUDIT] 🚨 ${data.approver}에 의해 긴급 보안 예외 승인 처리 (CISO Override)`,
              `[${nowTime()}] [AUDIT] 승인 사유 구분: ${data.reason}`,
              `[${nowTime()}] [AUDIT] 상세 사유: ${data.detail}`,
              `[${nowTime()}] [AUDIT] ⏳ 사후 조치 보증: ${data.slaHours}시간 이내 잔존 결함 패치 확약`,
              `[${nowTime()}] [STAGE 4] 배포 심사 긴급 패스트트랙 자동 인가 통과`,
              `[${nowTime()}] [STAGE 5] 🚀 운영 클러스터(${r.cluster}) 긴급 롤링 배포 개시 및 완료`,
            ],
          };
        }
        return r;
      })
    );
    setIsOverrideModalOpen(false);
    toast.success(`[CISO 긴급 승인 완료] ${data.approver} 인가로 운영 인프라 배포가 완료되었습니다.`);
    setSelectedNodeId('node-deploy');
  };

  // Standard DevSecOps Workflow: Create fix/ Branch and Re-verify
  const handleCreateFixBranch = (data: FixBranchData) => {
    const nowTime = () => new Date().toLocaleTimeString();
    const shortCommitId = Math.random().toString(36).substring(2, 9);
    const newRunId = `run-fix-${Date.now()}`;
    const nextPrNum = (activeRun.prNumber || 150) + 1;

    const newFixRun: PipelineRunSample = {
      id: newRunId,
      author: activeRun.author,
      authorEmail: activeRun.authorEmail,
      authorRole: activeRun.authorRole,
      department: activeRun.department,
      avatarColor: activeRun.avatarColor,
      branch: data.branchName,
      targetBranch: data.targetBranch || activeRun.targetBranch || 'main',
      trigger: 'PR/MR',
      prNumber: nextPrNum,
      commitId: shortCommitId,
      commitMessage: data.commitMessage,
      startedAt: '방금 전 (조치 브랜치 재검증)',
      currentStage: 2,
      scanStatus: 'running',
      scanDuration: 18,
      toolStatuses: {
        sast: { count: 0, duration: 18, status: '실행 중' },
        sca: { count: 0, duration: 12, status: '실행 중' },
        secret: { count: 0, duration: 6, status: '실행 중' },
        iac: { count: 0, duration: 8, status: '실행 중' },
      },
      executionLogs: [
        `[${nowTime()}] [GIT] 🌿 새 조치 브랜치 생성: ${data.branchName} (Base: ${activeRun.branch})`,
        `[${nowTime()}] [COMMIT] @${shortCommitId} "${data.commitMessage}"`,
        `[${nowTime()}] [PR] PR #${nextPrNum} 생성: ${data.prTitle}`,
        `[${nowTime()}] [WEBHOOK] GitHub Webhook 이벤트 수신: PR #${nextPrNum} (${data.branchName} ➔ ${data.targetBranch || 'main'})`,
        `[${nowTime()}] [STAGE 2] ⚡ 4대 보안점검 엔진 파드 병렬 기동 (워커: k8s-sec-worker-01)`,
        `[${nowTime()}] [SCAN] 소스코드 및 인프라 수정 사항에 대한 실시간 회귀/취약점 재스캔 진행 중...`,
      ],
      gateStatus: 'pending',
      critCount: 0,
      highCount: 0,
      medCount: 0,
      reviewStatus: 'not_reached',
      targetEnvironment: activeRun.targetEnvironment || '운영',
      commitMatch: true,
      deployStatus: 'not_reached',
      cluster: activeRun.cluster || 'k8s-prod-seoul',
      namespace: activeRun.namespace,
      replicas: '4 / 4 Active',
    };

    setRuns((prev) => [newFixRun, ...prev]);
    setSelectedRunId(newRunId);
    setIsFixBranchModalOpen(false);
    setSelectedNodeId('node-scanners');
    toast.success(`조치 브랜치 '${data.branchName}'(PR #${nextPrNum}) 생성 완료! 파이프라인 재검증을 개시합니다.`);

    // 1. Stage 2 -> Stage 3 (1.2s): Scanners complete clean!
    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === newRunId
            ? {
                ...r,
                currentStage: 3,
                scanStatus: 'completed',
                toolStatuses: {
                  sast: { count: 0, duration: 18, status: '성공' },
                  sca: { count: 0, duration: 12, status: '성공' },
                  secret: { count: 0, duration: 6, status: '성공' },
                  iac: { count: 0, duration: 8, status: '성공' },
                },
                gateStatus: 'passed',
                policyNotes: '모든 보안점검 엔진 무결점 클린 통과 (0 defects)',
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [SCAN SUCCESS] ✓ SAST 0건, SCA 0건, Secret 0건, IaC 0건 (모든 결함 조치 완료 확인)`,
                  `[${nowTime()}] [STAGE 3 PASSED] ✅ 보안 정책 게이트 100% 클린 통과 (치명적 0건, 높음 0건)`,
                  `[${nowTime()}] [STAGE 4] 배포 심사(PR Review) 단계로 자동 이관`,
                ],
              }
            : r
        )
      );
      toast.info(`[${data.branchName}] 4대 보안점검 결함 0건 클린! 3단계 정책 게이트를 통과했습니다.`);
      setSelectedNodeId('node-policy');
    }, 1200);

    // 2. Stage 3 -> Stage 5 (2.6s): Review auto-approved & Deployed!
    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === newRunId
            ? {
                ...r,
                currentStage: 5,
                reviewStatus: 'approved',
                reviewer: '보안팀 최수민 팀장 (조치 검증 승인)',
                reviewComment: '결함 조치 패치 확인 완료, 프로덕션 롤링 배포 최종 승인',
                deployStatus: 'deployed',
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [STAGE 4 APPROVED] 📋 배포 심사위원(최수민 팀장) PR 승인 및 Merge 인가`,
                  `[${nowTime()}] [STAGE 5] 🚀 운영 클러스터(${r.cluster}) 롤링 배포 개시`,
                  `[${nowTime()}] [DEPLOY SUCCESS] 4/4 Pods Active 서빙 완료. 신규 버전 정상 운영 가동!`,
                ],
              }
            : r
        )
      );
      toast.success(`[${data.branchName}] 배포 심사 승인 및 운영 인프라 배포가 완벽하게 성공했습니다!`);
      setSelectedNodeId('node-deploy');
    }, 2600);
  };

  // Canary Automated/Manual Rollback
  const handleRollback = () => {
    const nowTime = () => new Date().toLocaleTimeString();
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id === activeRun.id) {
          return {
            ...r,
            isRolledBack: true,
            canaryFailed: false,
            rollbackVersion: '@v2.4.0',
            executionLogs: [
              ...r.executionLogs,
              `[${nowTime()}] [ROLLBACK] ⏪ 카나리 에러 감지에 따른 이전 안정 버전(@v2.4.0) 롤백 명령 발송`,
              `[${nowTime()}] [ROLLBACK] kubectl rollout undo deployment/${project.id.toLowerCase()}-svc -n production`,
              `[${nowTime()}] [SUCCESS] 4/4 Pods rollback 완료. 프로덕션 서비스 정상화 (HTTP 200 OK)`,
            ],
          };
        }
        return r;
      })
    );
    toast.success('이전 안정 버전(@v2.4.0)으로 무중단 자동 롤백이 성공적으로 완료되었습니다.');
  };

  // Interactive Lifecycle Simulation (Feature ➔ Fix ➔ Main)
  const handlePlayLifecycle = () => {
    setLifecycleStep(1);
    toast.info('[1단계: Feature] feature 브랜치에서 소스 코드 보안점검을 시작합니다.');

    // 1 -> 2: Gate Blocked (1.2s)
    setTimeout(() => {
      setLifecycleStep(2);
      toast.error('[2단계: Feature 차단] 보안 정책 게이트에서 치명적 결함으로 배포가 차단되었습니다!');
    }, 1200);

    // 2 -> 3: Branch out to Fix (2.4s)
    setTimeout(() => {
      setLifecycleStep(3);
      toast.info('[3단계: fix/ 분기] 담당자 알림 전송 후 fix/ 조치 브랜치가 분기되어 패치 커밋이 푸시되었습니다.');
    }, 2400);

    // 3 -> 4: Fix Scanners Complete 0 defects (3.6s)
    setTimeout(() => {
      setLifecycleStep(4);
      toast.success('[4단계: 재검증 클린] fix/ 브랜치 4대 보안점검 결함 0건(Clean Pass) 통과!');
    }, 3600);

    // 4 -> 5: PR Approved & Merged to Main (4.8s)
    setTimeout(() => {
      setLifecycleStep(5);
      toast.info('[5단계: PR 머지] 심사위원 승인 완료 ➔ main 브랜치로 통합 병합(Merge)되었습니다.');
    }, 4800);

    // 5 -> 6: Main Integration Scan (6.0s)
    setTimeout(() => {
      setLifecycleStep(6);
      toast.info('[6단계: main 재점검] main 브랜치의 통합 빌드 및 회귀 보안점검을 무결점으로 통과했습니다.');
    }, 6000);

    // 6 -> 7: K8s Production Deploy (7.2s)
    setTimeout(() => {
      setLifecycleStep(7);
      toast.success('[7단계: 운영 배포] k8s-prod-seoul 클러스터에 무중단 롤링 배포가 완벽하게 완료되었습니다! 🚀');
    }, 7200);

    setTimeout(() => {
      setLifecycleStep(null);
    }, 10000);
  };

  // Switch Target Deployment Environment (개발 Dev / 검증 Staging / 운영 Prod)
  const handleSwitchEnvironment = (env: '개발' | '검증' | '운영') => {
    const nowTime = () => new Date().toLocaleTimeString();
    let cluster = 'k8s-prod-seoul';
    let ns = `${project.id.toLowerCase()}-svc`;
    let replicas = '4 / 4 Active';

    if (env === '개발') {
      cluster = 'k8s-dev-seoul';
      ns = `${project.id.toLowerCase()}-dev`;
      replicas = '2 / 2 Active';
    } else if (env === '검증') {
      cluster = 'k8s-stage-seoul';
      ns = `${project.id.toLowerCase()}-stage`;
      replicas = '3 / 3 Active';
    }

    setRuns((prev) =>
      prev.map((r) => {
        if (r.id === activeRun.id) {
          return {
            ...r,
            targetEnvironment: env,
            cluster,
            namespace: ns,
            replicas,
            executionLogs: [
              ...r.executionLogs,
              `[${nowTime()}] [CONFIG] 배포 대상 인프라 환경 전환 -> [${env}] (클러스터: ${cluster}, 네임스페이스: ${ns})`,
            ],
          };
        }
        return r;
      })
    );
    toast.info(`배포 대상 환경이 [${env}] (${cluster})로 전환되었습니다.`);
  };

  // Interactive Simulation: Rerun Pipeline on current run with full real-time staging!
  const handleRunSimulation = () => {
    if (simulationStage !== null) return; // Prevent double trigger

    const runId = activeRun.id;
    const nowTime = () => new Date().toLocaleTimeString();

    // Reset runtime flags
    setRuns((prev) =>
      prev.map((r) =>
        r.id === runId
          ? {
              ...r,
              isOverridden: false,
              overrideData: undefined,
              canaryFailed: false,
              isRolledBack: false,
              toolFailure: null,
            }
          : r
      )
    );

    // 1. Stage 1 Init (0ms): Webhook Trigger & Dispatch
    setSimulationStage(1);
    setSelectedNodeId('node-trigger');
    setToolScanProgress({
      secret: 'waiting',
      iac: 'waiting',
      sca: 'waiting',
      sast: 'waiting',
    });

    setRuns((prev) =>
      prev.map((r) => {
        if (r.id === runId) {
          return {
            ...r,
            currentStage: 1,
            scanStatus: 'running',
            scanDuration: 0,
            gateStatus: 'pending',
            reviewStatus: 'not_reached',
            deployStatus: 'pending',
            executionLogs: [
              ...r.executionLogs,
              `[${nowTime()}] [STAGE 1] 🚀 사내 Git Webhook 수신 (@${r.commitId} on ${r.branch}) by ${r.author}`,
              `[${nowTime()}] [STAGE 1] CI/CD 러너 큐 등록 및 보안 컨테이너 풀 할당 요청`,
              `[${nowTime()}] [SCENARIO] 🎯 실행 시나리오: ${
                selectedScenario === 'clean_pass'
                  ? '정상 통과 및 무중단 배포'
                  : selectedScenario === 'hard_block'
                  ? '치명적 결함 보안 정책 차단'
                  : selectedScenario === 'emergency_override'
                  ? 'CISO 긴급 보안 예외 배포'
                  : selectedScenario === 'scanner_timeout'
                  ? '스캐너 타임아웃 장애 및 재시도'
                  : selectedScenario === 'review_rejected'
                  ? '배포 심사위원 반려'
                  : selectedScenario === 'canary_rollback'
                  ? '카나리 이상 감지 및 자동 롤백'
                  : selectedScenario === 'secret_leak'
                  ? 'API 키/시크릿 하드코딩 유출 차단 (Gitleaks)'
                  : 'IaC 인프라 S3 버킷 공개노출 차단 (Checkov)'
              }`,
            ],
          };
        }
        return r;
      })
    );
    toast.info(`[${activeRun.branch}] 1단계: Git Webhook 이벤트 수신 및 러너 할당 시작`);

    // 2. Stage 2 Start (700ms): Launch Security Scanners & Start Secret Scan
    setTimeout(() => {
      setSimulationStage(2);
      setSelectedNodeId('node-scanners');
      setActiveScannerTool('secret');
      setToolScanProgress((p) => ({ ...p, secret: 'running' }));
      setRuns((prev) =>
        prev.map((r) =>
          r.id === runId
            ? {
                ...r,
                currentStage: 2,
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [STAGE 2] ⚡ CI/CD 보안점검 엔진 파드 기동 (워커 노드: k8s-sec-worker-01)`,
                  `[${nowTime()}] [SCAN] 🔑 Secret Scanner 분석 시작: 하드코딩된 API Key, Private Key 탐지...`,
                ],
              }
            : r
        )
      );

      // Secret Leak Scenario: Early Fail-Fast Termination!
      if (selectedScenario === 'secret_leak') {
        setTimeout(() => {
          setActiveScannerTool(null);
          setSimulationStage(null);
          setToolScanProgress((p) => ({ ...p, secret: 'completed' }));
          setRuns((prev) =>
            prev.map((r) =>
              r.id === runId
                ? {
                    ...r,
                    currentStage: 3,
                    scanStatus: 'completed',
                    gateStatus: 'blocked',
                    critCount: 1,
                    deployStatus: 'blocked',
                    toolStatuses: {
                      ...r.toolStatuses,
                      secret: { count: 1, duration: 8, status: '경고' },
                    },
                    executionLogs: [
                      ...r.executionLogs,
                      `[${nowTime()}] [ERROR] 🚨 [Gitleaks] AWS Secret Access Key & Private RSA Key 탐지됨! (src/config/auth.key:12, Entropy: 5.82)`,
                      `[${nowTime()}] [FAIL-FAST] 🛑 시크릿 유출 긴급 차단(Fail-Fast) 발동: 후속 스캔 중단 및 배포 즉시 차단`,
                      `[${nowTime()}] [STAGE 3 BLOCKED] ❌ 정책 차단 기준 위반! (치명적 시크릿 유출 1건) -> 보안 정책 게이트에서 배포 즉시 차단`,
                      `[${nowTime()}] [REMEDIATION] ⚠️ AWS IAM 콘솔에서 해당 Access Key를 즉시 비활성화(Deactivate)하고 커밋 히스토리를 정리하세요.`,
                    ],
                  }
                : r
            )
          );
          toast.error(`[${activeRun.branch}] 커밋 내 AWS 시크릿 키 유출이 탐지되어 배포가 강제 차단되었습니다!`);
          setSelectedNodeId('node-policy');
        }, 800);
        return;
      }
    }, 700);

    if (selectedScenario === 'secret_leak') return;

    // 3. Stage 2 - Step 2 (1400ms): Secret Done, Start IaC Scan
    setTimeout(() => {
      setActiveScannerTool('iac');
      const isIacMisconfig = selectedScenario === 'iac_misconfig';
      setToolScanProgress((p) => ({ ...p, secret: 'completed', iac: 'running' }));
      setRuns((prev) =>
        prev.map((r) =>
          r.id === runId
            ? {
                ...r,
                scanDuration: 18,
                highCount: isIacMisconfig ? 1 : r.highCount,
                toolStatuses: {
                  ...r.toolStatuses,
                  iac: { count: isIacMisconfig ? 1 : 0, duration: 18, status: isIacMisconfig ? '경고' : '성공' },
                },
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [SCAN] 🔑 Secret Scanner 완료 (탐지: 0건)`,
                  `[${nowTime()}] [SCAN] 📜 IaC Scanner 분석 시작: Terraform / Kubernetes 매니페스트 보안 검사...`,
                  ...(isIacMisconfig
                    ? [`[${nowTime()}] [WARN] 📜 [Checkov] CKV_AWS_20: S3 Bucket has Public Read ACL enabled (infra/terraform/s3.tf:14)`]
                    : []),
                ],
              }
            : r
        )
      );
    }, 1400);

    // 4. Stage 2 - Step 3 (2100ms): IaC Done, Start SCA Scan
    setTimeout(() => {
      setActiveScannerTool('sca');
      const scaCount = selectedScenario === 'hard_block' ? 2 : 0;
      setToolScanProgress((p) => ({ ...p, iac: 'completed', sca: 'running' }));
      setRuns((prev) =>
        prev.map((r) =>
          r.id === runId
            ? {
                ...r,
                scanDuration: 36,
                highCount: scaCount,
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [SCAN] 📜 IaC Scanner 완료 (탐지: 0건)`,
                  `[${nowTime()}] [SCAN] 📦 SCA Scanner 분석 시작: 오픈소스 의존성 CVE 취약점 DB 대조...`,
                  ...(scaCount > 0
                    ? [`[${nowTime()}] [WARN] 📦 SCA 발견: CVE-2024-21538 (cross-spawn 고위험 2건)`]
                    : []),
                ],
              }
            : r
        )
      );
    }, 2100);

    // 5. Stage 2 - Step 4 (2800ms): SCA Done, Start SAST Scan (Or trigger timeout if scanner_timeout scenario)
    setTimeout(() => {
      setActiveScannerTool('sast');
      setToolScanProgress((p) => ({ ...p, sca: 'completed', sast: 'running' }));

      if (selectedScenario === 'scanner_timeout') {
        // Scanner Timeout Failure scenario!
        setTimeout(() => {
          setActiveScannerTool(null);
          setSimulationStage(null);
          setToolScanProgress((p) => ({ ...p, sast: 'waiting' }));
          setRuns((prev) =>
            prev.map((r) =>
              r.id === runId
                ? {
                    ...r,
                    scanStatus: 'failed',
                    toolFailure: 'sast',
                    toolStatuses: {
                      ...r.toolStatuses,
                      sast: { count: 0, duration: 45, status: '실행 중' },
                    },
                    executionLogs: [
                      ...r.executionLogs,
                      `[${nowTime()}] [ERROR] 💥 SAST Scanner 실패: 504 Gateway Timeout (SonarQube 서버 응답 지연)`,
                      `[${nowTime()}] [STAGE 2] 스캔 도구 장애로 파이프라인 일시 정지. [단독 재시도]가 필요합니다.`,
                    ],
                  }
                : r
            )
          );
          toast.error(`[${activeRun.branch}] SAST 스캐너 타임아웃 장애 발생! 개별 재시도를 클릭하세요.`);
        }, 1200);
        return;
      }

      const critCount = selectedScenario === 'hard_block' ? 1 : 0;
      setRuns((prev) =>
        prev.map((r) =>
          r.id === runId
            ? {
                ...r,
                scanDuration: 62,
                critCount: critCount,
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [SCAN] 📦 SCA Scanner 분석 완료`,
                  `[${nowTime()}] [SCAN] 🛡️ SAST Scanner 분석 시작: 정적 소스코드 오염 경로(Dataflow Taint) 분석...`,
                  ...(critCount > 0
                    ? [`[${nowTime()}] [ERROR] 🛡️ SAST 발견: CWE-89 SQL Injection in authController.ts:42 (Critical)`]
                    : []),
                ],
              }
            : r
        )
      );
    }, 2800);

    // If scanner_timeout was selected, step 6/7 will not execute
    if (selectedScenario === 'scanner_timeout') return;

    // 6. Stage 3 (3800ms): All Scans Done -> Policy Gate Evaluation!
    setTimeout(() => {
      setActiveScannerTool(null);
      setToolScanProgress({
        secret: 'completed',
        iac: 'completed',
        sca: 'completed',
        sast: 'completed',
      });
      setSimulationStage(3);
      setSelectedNodeId('node-policy');

      const isBlockCase = selectedScenario === 'hard_block' || selectedScenario === 'iac_misconfig';
      const isIacCase = selectedScenario === 'iac_misconfig';

      setRuns((prev) =>
        prev.map((r) =>
          r.id === runId
            ? {
                ...r,
                currentStage: 3,
                scanStatus: 'completed',
                scanDuration: 85,
                gateStatus: isBlockCase ? 'blocked' : 'passed',
                critCount: isIacCase ? 0 : isBlockCase ? 1 : 0,
                highCount: isIacCase ? 1 : isBlockCase ? 2 : 0,
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [SCAN] 🛡️ SAST Scanner 완료 (탐지: ${isIacCase ? 0 : isBlockCase ? 1 : 0}건)`,
                  `[${nowTime()}] [SUPPLY-CHAIN] ✓ Cosign 이미지 서명 검증 성공 (sha256:7f9a2c1)`,
                  `[${nowTime()}] [SUPPLY-CHAIN] ✓ CycloneDX v1.5 SBOM 생성 완료 (142개 패키지 색인)`,
                  `[${nowTime()}] [STAGE 2] 보안점검 4종 전체 완료`,
                  `[${nowTime()}] [STAGE 3] ⚖️ 보안 정책 게이트 자동 판정 엔진 가동 (기준: Critical 0건, High < ${policy.highThresholdForBlock}건)`,
                ],
              }
            : r
        )
      );
      toast.success(`[${activeRun.branch}] 2단계 보안점검 완료! 3단계 정책 게이트 평가 중...`);
    }, 3800);

    // 7. Gate Result & Stage 4 / Stage 5 / Block Transition (4800ms):
    setTimeout(() => {
      const isBlockCase = selectedScenario === 'hard_block' || selectedScenario === 'iac_misconfig';
      const isIacCase = selectedScenario === 'iac_misconfig';
      const isRejectCase = selectedScenario === 'review_rejected';
      const isCanaryCase = selectedScenario === 'canary_rollback';
      const isEmergencyCase = selectedScenario === 'emergency_override';

      if (isBlockCase) {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  gateStatus: 'blocked',
                  currentStage: 3,
                  reviewStatus: 'not_reached',
                  deployStatus: 'blocked',
                  executionLogs: [
                    ...r.executionLogs,
                    isIacCase
                      ? `[${nowTime()}] [STAGE 3 BLOCKED] ❌ 인프라 보안 정책 위반! (Checkov S3 버킷 공개 노출 1건 탐지) -> 보안 정책 게이트에서 배포 즉시 차단`
                      : `[${nowTime()}] [STAGE 3 BLOCKED] ❌ 정책 차단 기준 위반! (치명적 결함: 1건 탐지) -> 보안 정책 게이트에서 배포 즉시 차단`,
                    `[${nowTime()}] [TERMINAL] 🚫 배포 파이프라인 강제 차단됨. (인프라/코드 패치 또는 CISO 긴급 예외 승인 필요)`,
                  ],
                }
              : r
          )
        );
        toast.error(
          isIacCase
            ? `[${activeRun.branch}] 3단계 정책 위반: 인프라 코드(IaC) S3 버킷 공개 노출 결함으로 배포가 즉시 차단되었습니다!`
            : `[${activeRun.branch}] 3단계 정책 위반: 치명적 결함(1건)으로 배포가 즉시 차단되었습니다!`
        );
        setSelectedNodeId('node-policy');
        setSimulationStage(null);
        return;
      }

      if (isEmergencyCase) {
        // Directly open emergency override modal to showcase the workflow!
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  gateStatus: 'blocked',
                  critCount: 1,
                  highCount: 1,
                  currentStage: 3,
                  deployStatus: 'blocked',
                  executionLogs: [
                    ...r.executionLogs,
                    `[${nowTime()}] [STAGE 3 BLOCKED] ❌ 정책 차단 기준 위반! (치명적 1건 탐지) -> 보안 정책 게이트에서 배포 즉시 차단`,
                    `[${nowTime()}] [PROMPT] 🚨 긴급 핫픽스 배포를 위한 CISO 보안 예외 승인 모달 호출`,
                  ],
                }
              : r
          )
        );
        setSelectedNodeId('node-policy');
        setSimulationStage(null);
        setIsOverrideModalOpen(true);
        return;
      }

      if (isRejectCase) {
        setRuns((prev) =>
          prev.map((r) =>
            r.id === runId
              ? {
                  ...r,
                  gateStatus: 'passed',
                  currentStage: 4,
                  reviewStatus: 'rejected',
                  reviewer: '보안팀 최수민 팀장 (반려)',
                  reviewComment: '보안 아키텍처 다이어그램 미첨부 및 외부 API 접근제어 설정 누락',
                  deployStatus: 'blocked',
                  executionLogs: [
                    ...r.executionLogs,
                    `[${nowTime()}] [STAGE 3 PASSED] ✅ 보안 정책 게이트 통과`,
                    `[${nowTime()}] [STAGE 4 REJECTED] 🚫 심사위원 최수민 팀장에 의해 배포 반려: 외부 API 접근제어 설정 누락`,
                    `[${nowTime()}] [TERMINAL] 심사 반려에 따라 배포 차단 터미널로 분기`,
                  ],
                }
              : r
          )
        );
        toast.error('배포 심사위원의 의견에 따라 반려 처리되어 배포가 중단되었습니다.');
        setSelectedNodeId('node-review');
        setSimulationStage(null);
        return;
      }

      // Default: Clean Pass & Deploy (or Canary Rollback)
      setRuns((prev) =>
        prev.map((r) =>
          r.id === runId
            ? {
                ...r,
                gateStatus: 'passed',
                currentStage: 5,
                reviewStatus: 'approved',
                reviewer: '시스템 자동 승인 (무결점 패스트트랙)',
                reviewComment: '보안점검 0건 및 정책 게이트 100% 클린 통과',
                deployStatus: 'deployed',
                canaryFailed: isCanaryCase,
                executionLogs: [
                  ...r.executionLogs,
                  `[${nowTime()}] [STAGE 3 PASSED] ✅ 보안 정책 게이트 100% 클린 통과`,
                  `[${nowTime()}] [STAGE 4 APPROVED] 📋 배포 심사 자동 통과 (무결점 패스트트랙)`,
                  `[${nowTime()}] [STAGE 5] 🚀 운영 클러스터(${r.cluster}) 롤링 배포 성공`,
                  ...(isCanaryCase
                    ? [`[${nowTime()}] [CANARY] 카나리 트래픽 10% 유입 모니터링 시작...`]
                    : [`[${nowTime()}] [SUCCESS] Pods 4/4 서빙 정상 가동 (Zero-Downtime)`]),
                ],
              }
            : r
        )
      );

      if (isCanaryCase) {
        toast.info('배포 완료 후 카나리 헬스체크 모니터링 진행 중...');
        setSelectedNodeId('node-deploy');

        // Trigger canary failure and auto-rollback after 1.8 seconds!
        setTimeout(() => {
          setRuns((prev) =>
            prev.map((r) =>
              r.id === runId
                ? {
                    ...r,
                    canaryFailed: false,
                    isRolledBack: true,
                    rollbackVersion: '@v2.4.0',
                    executionLogs: [
                      ...r.executionLogs,
                      `[${nowTime()}] [ALERT] 🚨 카나리 이상 감지: 5xx HTTP Error Rate 14.8% (임계치 1.0% 초과)!`,
                      `[${nowTime()}] [AUTO-ROLLBACK] 무중단 긴급 자동 롤백 시작: 이전 안정 버전(@v2.4.0) 복구`,
                      `[${nowTime()}] [SUCCESS] 4/4 Pods rollback 완료. 프로덕션 서비스 정상화 (HTTP 200 OK)`,
                    ],
                  }
                : r
            )
          );
          toast.warning('카나리 에러 급증(14.8%) 감지! 이전 안정 버전(@v2.4.0)으로 즉시 자동 롤백되었습니다.');
        }, 1800);
      } else {
        toast.success(`[${activeRun.branch}] 5단계 운영 인프라 배포가 완벽하게 성공했습니다!`);
        setSelectedNodeId('node-deploy');
        if (runId === 'run-agentgate-unscanned') {
          commitBaselineScan(project.id);
        }
      }

      setSimulationStage(null);
    }, 4800);
  };

  // Interactive Simulation: Approve deployment review
  const handleApproveReview = () => {
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id === activeRun.id) {
          return {
            ...r,
            currentStage: 5,
            reviewStatus: 'approved',
            reviewer: '보안팀 최수민 팀장 (승인 처리)',
            reviewComment: '보안 결함 조치 계획서 확인 및 배포 최종 인가',
            deployStatus: 'deployed',
            executionLogs: [
              ...r.executionLogs,
              `[${new Date().toLocaleTimeString()}] [INFO] 배포 심사위원 최종 승인 완료`,
              `[${new Date().toLocaleTimeString()}] [SUCCESS] 운영 클러스터 롤링 배포 성공`,
            ],
          };
        }
        return r;
      })
    );
    toast.success('배포 심사가 승인되어 5단계 운영 인프라 배포가 완료되었습니다!');
  };

  // Interactive Simulation: Reject deployment review
  const handleRejectReview = () => {
    setRuns((prev) =>
      prev.map((r) => {
        if (r.id === activeRun.id) {
          return {
            ...r,
            reviewStatus: 'rejected',
            reviewer: '보안팀 최수민 팀장 (반려 처리)',
            reviewComment: '보안 조치 미흡으로 인한 배포 반려',
            deployStatus: 'blocked',
            executionLogs: [
              ...r.executionLogs,
              `[${new Date().toLocaleTimeString()}] [WARN] 배포 심사 반려 발생: 배포가 중단되었습니다.`,
            ],
          };
        }
        return r;
      })
    );
    toast.error('배포 심사가 반려되어 배포 파이프라인이 중단되었습니다.');
  };

  // Canvas Mouse Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.workflow-node, .inspector-panel, button, input, [role="combobox"]')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Node Positions (Canvas Coords - 5 Sequential Standard Pipeline Stages)
  const nodePositions = {
    'node-trigger': { x: 50, y: 160, width: 320 },
    'node-scanners': { x: 440, y: 160, width: 330 },
    'node-policy': { x: 850, y: 160, width: 320 },
    'node-review': { x: 1250, y: 160, width: 320 },
    'node-deploy': { x: 1650, y: 160, width: 320 },
  };

  // Stage Status Derivations for Active Run
  const isScannerRunning = activeRun.scanStatus === 'running';
  const isScannerDone = activeRun.scanStatus === 'completed';
  const isScannerFailed = activeRun.scanStatus === 'failed';
  const isScannerPending = activeRun.scanStatus === 'pending';

  const isGatePassed = activeRun.gateStatus === 'passed';
  const isGateReview = activeRun.gateStatus === 'review';
  const isGateBlocked = activeRun.gateStatus === 'blocked';
  const isGatePending = activeRun.gateStatus === 'pending';

  const isReviewApproved = activeRun.reviewStatus === 'approved';
  const isReviewPending = activeRun.reviewStatus === 'pending_review';
  const isReviewRejected = activeRun.reviewStatus === 'rejected';
  const isReviewNotReached = activeRun.reviewStatus === 'not_reached';

  const isDeployActive = activeRun.deployStatus === 'deployed';
  const isDeployBlocked = activeRun.deployStatus === 'blocked';
  const isDeployPending = activeRun.deployStatus === 'pending' || activeRun.deployStatus === 'not_reached';

  const isOverridden = !!activeRun.isOverridden;
  const isCanaryFailed = !!activeRun.canaryFailed;
  const isRolledBack = !!activeRun.isRolledBack;

  const detectedIssueType: 'secret' | 'iac' | 'sast' | 'general' = useMemo(() => {
    if (activeRun.toolStatuses.secret.count > 0) return 'secret';
    if (activeRun.toolStatuses.iac.count > 0) return 'iac';
    if (activeRun.toolStatuses.sast.count > 0) return 'sast';
    return 'general';
  }, [activeRun]);

  const detectedPrIssue = useMemo(() => {
    if (activeRun.toolStatuses.secret.count > 0) {
      return {
        tool: 'Gitleaks Secret Scanner',
        rule: 'AWS-ACCESS-KEY-ID: High Entropy Secret Pattern Detected',
        severity: '치명적' as const,
        filePath: 'src/config/aws.ts',
        lineNumber: 14,
        badCode: `const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";\nconst AWS_SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";`,
        goodCode: `const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;\nconst AWS_SECRET_KEY = process.env.AWS_SECRET_KEY;`,
        guide: '하드코딩된 클라우드 액세스 키를 즉시 폐기(Revoke)하고 HashiCorp Vault 또는 AWS Secrets Manager를 통해 환경변수로 주입하십시오.',
      };
    }
    if (activeRun.toolStatuses.iac.count > 0) {
      return {
        tool: 'Checkov IaC Scanner',
        rule: 'CKV_AWS_20: S3 Bucket has an ACL defined granting public read access',
        severity: '높음' as const,
        filePath: 'infra/terraform/s3_storage.tf',
        lineNumber: 22,
        badCode: `resource "aws_s3_bucket" "asset_bucket" {\n  bucket = "prod-static-assets"\n  acl    = "public-read"\n}`,
        goodCode: `resource "aws_s3_bucket" "asset_bucket" {\n  bucket = "prod-static-assets"\n  acl    = "private"\n}\n\nresource "aws_s3_bucket_public_access_block" "block" {\n  bucket = aws_s3_bucket.asset_bucket.id\n  block_public_acls = true\n  block_public_policy = true\n}`,
        guide: '운영 버킷의 public-read ACL을 private으로 변경하고 public access block 설정을 활성화하십시오.',
      };
    }
    return {
      tool: 'SonarQube SAST',
      rule: 'CWE-89: Improper Neutralization of Special Elements used in an SQL Command',
      severity: '치명적' as const,
      filePath: 'src/controllers/authController.ts',
      lineNumber: 42,
      badCode: `const query = \`SELECT * FROM users WHERE email = '\${userEmail}'\`;\nconst result = await db.query(query);`,
      goodCode: `const query = 'SELECT * FROM users WHERE email = $1';\nconst result = await db.query(query, [userEmail]);`,
      guide: '문자열 결합 대신 파라미터화된 쿼리(Prepared Statement)를 사용하여 SQL 인젝션을 원천 차단하십시오.',
    };
  }, [activeRun]);

  const handlePrFixPushed = () => {
    resolveAgentGateRemediation();
    const nowTime = () => new Date().toLocaleTimeString();
    setRuns((prev) =>
      prev.map((r) =>
        r.id === activeRun.id
          ? {
              ...r,
              gateStatus: 'passed',
              critCount: 0,
              highCount: 0,
              medCount: 0,
              reviewStatus: 'approved',
              deployStatus: 'deployed',
              executionLogs: [
                ...r.executionLogs,
                `[${nowTime()}] [PR BOT] 🤖 GitHub PR Checks: 개발자 수정 커밋 수신 -> 보안점검 재실행(Passed)`,
                `[${nowTime()}] [GITHUB] PR #${activeRun.prNumber || 142} Checks all passed (4/4 jobs green)`,
                `[${nowTime()}] [STAGE 4] 배포 심사 자동 통과 (무결점 패스트트랙)`,
                `[${nowTime()}] [STAGE 5] 🚀 운영 클러스터(${r.cluster}) 배포 완료`,
              ],
            }
          : r
      )
    );
    toast.success(`PR #${activeRun.prNumber || 142} 수정 커밋이 푸시되어 보안 검사가 100% 통과(Passed)되었습니다!`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* 1. TOP CONTROL & BREADCRUMB BAR */}
      <header className="h-16 min-h-[64px] border-b border-slate-800 bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 shadow-lg gap-2 overflow-x-auto scrollbar-none">
        {/* Left: Close, Breadcrumbs, & Run Selector */}
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 shrink-0"
            title="프로젝트 목록으로 돌아가기 (ESC)"
          >
            <X className="w-4 h-4 mr-1" />
            닫기
          </Button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />

          {/* Project Breadcrumb & Project Quick Switcher */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-xs font-bold text-slate-400 hidden sm:inline">
              {project.entityName}
            </span>
            <span className="text-slate-600 hidden sm:inline">/</span>

            <Select
              value={project.id}
              onValueChange={(val) => {
                const target = projects.find((p) => p.id === val);
                if (target && onSelectProject) {
                  onSelectProject(target);
                }
              }}
            >
              <SelectTrigger
                className="h-8 bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-xs font-bold text-white max-w-[180px] sm:max-w-[240px]"
                title="다른 프로젝트 파이프라인으로 전환"
              >
                <span className="truncate">{project.name}</span>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md z-[9999]">
                <SelectGroup>
                  <SelectLabel className="text-[11px] font-bold text-indigo-400 px-2 py-1">
                    📁 전체 프로젝트 전환 (빠른 이동)
                  </SelectLabel>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="font-semibold text-white truncate">{p.name}</span>
                        <span className="text-slate-400 text-[10px] font-mono shrink-0">
                          ({p.id} · {p.owner})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Security Score Badge */}
          <div className="hidden lg:flex items-center shrink-0">
            <SecurityScoreBadge scoreInfo={projectScore} showLabel />
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block shrink-0" />

          {/* MULTI-BRANCH & MULTI-USER RUN SELECTOR */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium hidden xl:inline">
              이벤트/브랜치 선택:
            </span>
            <Select value={selectedRunId} onValueChange={(val) => setSelectedRunId(val)}>
              <SelectTrigger className="h-8 bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-xs font-mono text-slate-200 w-[270px] sm:w-[380px]">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="font-bold text-indigo-400 shrink-0">
                    👤 {activeRun.author}
                  </span>
                  <span className="text-slate-500 shrink-0">/</span>
                  <span className="font-mono text-slate-200 truncate">
                    {activeRun.trigger === 'PR/MR' ? `🔀 PR #${activeRun.prNumber}` : '⚡ Push'} · {activeRun.branch}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg z-[9999] max-h-[480px]">
                {visibleDevelopers.map((dev, idx) => (
                  <React.Fragment key={dev.author}>
                    {idx > 0 && <SelectSeparator className="bg-slate-800 my-1" />}
                    <SelectGroup>
                      <SelectLabel className="text-[11px] font-bold text-slate-200 flex items-center justify-between px-2.5 py-1.5 bg-slate-800/90 rounded border border-slate-700/80 my-1 sticky top-0 backdrop-blur z-10">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full shrink-0',
                              dev.isOwner
                                ? 'bg-indigo-500 shadow-[0_0_6px_#6366f1]'
                                : 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                            )}
                          />
                          <span className="text-white font-bold truncate">👤 {dev.author}</span>
                          <span className="text-[10px] text-slate-400 font-normal shrink-0">
                            ({dev.authorRole} · {dev.department})
                          </span>
                        </div>
                        <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950 border border-indigo-800/80 px-1.5 py-0.2 rounded shrink-0 ml-2">
                          {dev.runs.length}개 브랜치
                        </span>
                      </SelectLabel>
                      {dev.runs.map((r) => (
                        <SelectItem key={r.id} value={r.id} className="text-xs py-1.5 cursor-pointer">
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-mono text-slate-300 shrink-0">
                                {r.trigger === 'PR/MR' ? `🔀 PR #${r.prNumber}` : '⚡ Push'}
                              </span>
                              <span className="text-slate-600 shrink-0">·</span>
                              <span className="font-mono font-medium text-white truncate max-w-[170px] sm:max-w-[210px]">
                                {r.branch}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center">
                              {r.deployStatus === 'deployed' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80">
                                  배포완료
                                </span>
                              )}
                              {r.reviewStatus === 'pending_review' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-300 border border-amber-800/80">
                                  심사대기
                                </span>
                              )}
                              {r.reviewStatus === 'rejected' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/80">
                                  심사반려
                                </span>
                              )}
                              {r.gateStatus === 'blocked' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/80">
                                  정책차단
                                </span>
                              )}
                              {r.scanStatus === 'running' && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/80 animate-pulse">
                                  점검중
                                </span>
                              )}
                              {r.currentStage === 1 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                                  대기(진행전)
                                </span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right: Color Legend, Actions, Inspector Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Real-world Operational Scenario Preset Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400 font-medium hidden 2xl:inline">
              운영 시나리오:
            </span>
            <Select
              value={selectedScenario}
              onValueChange={(val: any) => setSelectedScenario(val)}
              disabled={simulationStage !== null}
            >
              <SelectTrigger className="h-8 bg-slate-800/90 hover:bg-slate-750 border-slate-700 text-xs text-slate-200 w-[170px] sm:w-[225px]">
                <div className="flex items-center gap-1.5 truncate">
                  {selectedScenario === 'clean_pass' && <span className="text-emerald-400 truncate">🟢 정상 통과 & 배포</span>}
                  {selectedScenario === 'hard_block' && <span className="text-rose-400 truncate">🔴 치명적 결함 차단</span>}
                  {selectedScenario === 'emergency_override' && <span className="text-fuchsia-400 truncate">🚨 CISO 긴급 우회 배포</span>}
                  {selectedScenario === 'scanner_timeout' && <span className="text-amber-400 truncate">💥 스캐너 장애 & 재시도</span>}
                  {selectedScenario === 'review_rejected' && <span className="text-rose-400 truncate">🚫 심사위원 반려</span>}
                  {selectedScenario === 'canary_rollback' && <span className="text-cyan-400 truncate">🔄 카나리 롤백</span>}
                  {selectedScenario === 'secret_leak' && <span className="text-rose-400 truncate">🔑 시크릿 키 유출 차단</span>}
                  {selectedScenario === 'iac_misconfig' && <span className="text-amber-400 truncate">📜 IaC 클라우드 취약점</span>}
                </div>
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-slate-100 z-[9999] min-w-[280px]">
                <SelectItem value="clean_pass">🟢 정상 통과 & 무중단 배포 (Clean Pass)</SelectItem>
                <SelectItem value="hard_block">🔴 치명적 결함 정책 차단 (Hard Block)</SelectItem>
                <SelectItem value="emergency_override">🚨 CISO 긴급 보안 예외 배포 (Override)</SelectItem>
                <SelectItem value="scanner_timeout">💥 스캐너 타임아웃 & 단독 재시도 (Timeout)</SelectItem>
                <SelectItem value="review_rejected">🚫 배포 심사위원 반려 (Review Reject)</SelectItem>
                <SelectItem value="canary_rollback">🔄 카나리 이상 감지 & 자동 롤백 (Rollback)</SelectItem>
                <SelectItem value="secret_leak">🔑 API 시크릿 키 유출 차단 (Secret Leak)</SelectItem>
                <SelectItem value="iac_misconfig">📜 Terraform S3 공개 설정 오류 차단 (IaC Checkov)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle: Standard 5-Stage vs Branch Lifecycle */}
          <div className="flex items-center rounded-lg bg-slate-800/90 p-0.5 border border-slate-700 shrink-0">
            <button
              onClick={() => {
                setCanvasViewMode('standard');
                setTimeout(() => fitView('standard'), 30);
              }}
              className={cn(
                'px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all',
                canvasViewMode === 'standard'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="단일 런 5단계 표준 파이프라인"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span className="hidden xl:inline">5단계 파이프라인</span>
            </button>
            <button
              onClick={() => {
                setCanvasViewMode('lifecycle');
                setTimeout(() => fitView('lifecycle'), 30);
              }}
              className={cn(
                'px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all',
                canvasViewMode === 'lifecycle'
                  ? 'bg-emerald-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              )}
              title="Feature(오류) ➔ Fix(조치) ➔ Main(재점검 & 배포) 브랜치 라이프사이클"
            >
              <GitFork className="w-3 h-3 text-emerald-300" />
              <span className="hidden xl:inline">브랜치 라이프사이클</span>
            </button>
          </div>

          {/* Assignee Notification & Dispatch Workflow Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrChecksModalOpen(true)}
            className="h-8 text-xs gap-1.5 border-indigo-700/80 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 font-medium"
            title="오류 발생 시 담당자 전달 ➔ 조치 ➔ 푸시 ➔ 플랫폼 반영 워크플로우 안내"
          >
            <Bell className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden xl:inline">담당자 전달 & 조치 현황</span>
            <span className="xl:hidden">통보 현황</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/40">
              {activeRun.critCount > 0 ? '차단 1' : '정상'}
            </span>
          </Button>

          {/* GitHub / GitLab PR Checks Feedback View Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPrChecksModalOpen(true)}
            className="h-8 text-xs gap-1.5 border-emerald-700/80 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 font-medium"
            title="GitHub / GitLab PR 화면 시뮬레이션: SecureFlow Bot 리뷰 코멘트 및 보안 Checks 통과/차단 인터페이스"
          >
            <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xl:inline">GitHub PR Checks 뷰</span>
            <span className="xl:hidden">PR Checks</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
              #{activeRun.prNumber || 142}
            </span>
          </Button>

          {canvasViewMode === 'lifecycle' ? (
            <Button
              size="sm"
              onClick={handlePlayLifecycle}
              disabled={lifecycleStep !== null}
              className="font-semibold text-xs h-8 shadow-md gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/40"
            >
              {lifecycleStep !== null ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-200" />
                  <span>
                    {lifecycleStep === 1 && '1/7: Feature 보안점검...'}
                    {lifecycleStep === 2 && '2/7: 🛑 정책 게이트 차단!'}
                    {lifecycleStep === 3 && '3/7: 🌿 fix/ 브랜치 분기...'}
                    {lifecycleStep === 4 && '4/7: ⚡ fix/ 0건 클린 통과!'}
                    {lifecycleStep === 5 && '5/7: 🔀 main 머지 승인...'}
                    {lifecycleStep === 6 && '6/7: 🛡️ main 무결점 재점검!'}
                    {lifecycleStep === 7 && '7/7: 🚀 운영 배포 완료!'}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  라이프사이클 시뮬레이션 재생
                </>
              )}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleRunSimulation}
              disabled={simulationStage !== null}
              className={`font-semibold text-xs h-8 shadow-md gap-1.5 border transition-all ${
                simulationStage !== null
                  ? 'bg-indigo-700/80 border-indigo-400/50 text-indigo-100 cursor-wait'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40'
              }`}
            >
              {simulationStage !== null ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
                  <span>
                    {simulationStage === 1 && '1단계: Git Webhook 처리 중...'}
                    {simulationStage === 2 && `2단계: ${activeScannerTool ? activeScannerTool.toUpperCase() : '스캐너'} 실시간 분석 중...`}
                    {simulationStage === 3 && '3단계: 정책 게이트 판정 중...'}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  시나리오 실행
                </>
              )}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className={`h-8 text-xs gap-1.5 border-slate-700 ${
              isInspectorOpen
                ? 'bg-slate-800 text-indigo-400 border-indigo-500/50'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">속성 패널 {isInspectorOpen ? '닫기' : '열기'}</span>
          </Button>

          {onOpenSheet && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClose();
                onOpenSheet();
              }}
              className="h-8 text-xs text-slate-400 hover:text-white hidden sm:inline-flex"
            >
              기본 Sheet
            </Button>
          )}
        </div>
      </header>

      {/* 2. DEVELOPER QUICK-FILTER & NAME-BASED NAVIGATION BAR (보기 기준) */}
      <div className="h-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur px-4 sm:px-6 flex items-center justify-between text-xs shrink-0 z-20 gap-3 overflow-hidden">
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none min-w-0">
          <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            보기 기준:
          </span>

          {/* 전체보기 Button */}
          <button
            onClick={() => {
              setSelectedDeveloperFilter('all');
              setSelectedRunFilter('all');
              setTimeout(() => fitView(canvasViewMode), 50);
            }}
            className={cn(
              'h-7 px-2.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 border',
              selectedDeveloperFilter === 'all'
                ? 'bg-indigo-600/30 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.25)] font-semibold'
                : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
            )}
            title="프로젝트 전체 작업자 및 전체 브랜치 보기"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>전체보기</span>
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.2 rounded font-mono',
                selectedDeveloperFilter === 'all'
                  ? 'bg-indigo-500/40 text-indigo-200 font-bold'
                  : 'bg-slate-800 text-slate-400'
              )}
            >
              {runs.length}
            </span>
          </button>

          {/* 개별 작업자(이름별) 드롭다운 메뉴 */}
          {developers.map((dev) => {
            const isCurrentDev = selectedDeveloperFilter === dev.author;
            return (
              <DropdownMenu key={dev.author}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={cn(
                      'group h-7 px-2.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 border outline-none',
                      isCurrentDev
                        ? 'bg-indigo-600/30 text-white border-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.25)] font-semibold'
                        : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
                    )}
                    title={`클릭하여 ${dev.author}의 PR 및 브랜치 목록 열기`}
                  >
                    <span
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        dev.isOwner ? 'bg-indigo-400' : 'bg-emerald-400'
                      )}
                    />
                    <span>👤 {dev.author}</span>
                    <span
                      className={cn(
                        'text-[10px] px-1 py-0.2 rounded font-mono',
                        isCurrentDev
                          ? 'bg-indigo-500/40 text-indigo-200'
                          : 'bg-slate-800 text-slate-400'
                      )}
                    >
                      {isCurrentDev && selectedRunFilter !== 'all'
                        ? `1 / ${dev.runs.length}`
                        : dev.runs.length}
                    </span>
                    {dev.isOwner && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40">
                        담당자
                      </span>
                    )}
                    <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-transform duration-150" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  sideOffset={6}
                  className="w-80 bg-slate-900/98 backdrop-blur-md border border-slate-800 p-1.5 shadow-2xl text-slate-200 z-[9999]"
                >
                  {/* 작업자 헤더 정보 */}
                  <div className="px-2 py-1.5 flex items-center justify-between border-b border-slate-800/80 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-bold text-white text-xs">👤 {dev.author}</span>
                      <span className="text-[10px] text-slate-400 truncate">
                        ({dev.authorRole} · {dev.department})
                      </span>
                    </div>
                    {dev.isOwner && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/40 shrink-0">
                        메인 담당자
                      </span>
                    )}
                  </div>

                  {/* 1. 상단: 전체보기 (해당 작업자의 모든 트랙 보기) */}
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedDeveloperFilter(dev.author);
                      setSelectedRunFilter('all');
                      if (dev.runs.length > 0) {
                        setSelectedRunId(dev.runs[0].id);
                      }
                      setTimeout(() => fitView(canvasViewMode), 50);
                    }}
                    className={cn(
                      'flex items-center justify-between py-2 px-2.5 rounded-lg text-xs font-semibold cursor-pointer mb-1',
                      isCurrentDev && selectedRunFilter === 'all'
                        ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40'
                        : 'hover:bg-slate-800/80 text-slate-200'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>전체보기</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                        {dev.runs.length}개 트랙 전체
                      </span>
                    </div>
                    {isCurrentDev && selectedRunFilter === 'all' && (
                      <Check className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-slate-800/80 my-1" />

                  <DropdownMenuLabel className="px-2 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>개별 PR / 브랜치 선택</span>
                    <span className="text-[9px] text-slate-500 font-normal">단일 트랙 보기</span>
                  </DropdownMenuLabel>

                  {/* 2. 하단: 개별 PR / 브랜치 목록 */}
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-0.5">
                    {dev.runs.map((r) => {
                      const isSelectedRun = isCurrentDev && selectedRunFilter === r.id;
                      return (
                        <DropdownMenuItem
                          key={r.id}
                          onClick={() => {
                            setSelectedDeveloperFilter(dev.author);
                            setSelectedRunFilter(r.id);
                            setSelectedRunId(r.id);
                            setTimeout(() => fitView(canvasViewMode), 50);
                          }}
                          className={cn(
                            'flex flex-col items-start gap-1 p-2 rounded-lg cursor-pointer transition-colors border',
                            isSelectedRun
                              ? 'bg-indigo-600/25 text-white border-indigo-500/50 shadow-sm'
                              : 'border-transparent hover:bg-slate-800/70 text-slate-300'
                          )}
                        >
                          <div className="w-full flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {r.trigger === 'PR/MR' ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded border border-indigo-500/30 shrink-0">
                                  <GitPullRequest className="w-3 h-3 text-indigo-400" />
                                  PR #{r.prNumber}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30 shrink-0">
                                  <GitCommit className="w-3 h-3 text-amber-400" />
                                  Push
                                </span>
                              )}
                              <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                                {r.branch}
                              </span>
                            </div>
                            {isSelectedRun && (
                              <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            )}
                          </div>

                          <div className="w-full flex items-center justify-between gap-2 text-[10px] text-slate-400 pl-0.5">
                            <span className="truncate max-w-[190px]" title={r.commitMessage}>
                              {r.commitMessage}
                            </span>
                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded font-mono font-medium shrink-0 text-[9px]',
                                r.currentStage === 5 && r.deployStatus === 'deployed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : r.gateStatus === 'blocked'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : r.reviewStatus === 'rejected'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              )}
                            >
                              {r.currentStage === 5 && r.deployStatus === 'deployed'
                                ? '배포 완료'
                                : r.gateStatus === 'blocked'
                                ? '정책 차단'
                                : r.reviewStatus === 'rejected'
                                ? '심사 반려'
                                : `${r.currentStage}단계 진행`}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 shrink-0 text-[11px] text-slate-400 font-mono">
          {selectedDeveloperFilter === 'all' ? (
            <>
              <span>보기 모드:</span>
              <span className="text-white font-bold">전체 브랜치 ({runs.length}개)</span>
              <span className="text-slate-600">|</span>
              <span className="text-indigo-300">작업자 {developers.length}명</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">선택 런: {activeRun.author} ({activeRun.branch})</span>
            </>
          ) : (
            <>
              <span>현재 작업자:</span>
              <span className="text-white font-bold">👤 {activeRun.author}</span>
              <span className="text-slate-600">|</span>
              <span className="text-indigo-300">
                {selectedRunFilter === 'all'
                  ? `전체 ${visibleRuns.length}개 트랙`
                  : `단일 트랙 (${activeRun.branch})`}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{activeRun.department}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. MAIN WORKFLOW CANVAS + RIGHT INSPECTOR */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Canvas Area with Dotted Grid */}
        <div
          ref={canvasViewportRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing bg-slate-950"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1.2px, transparent 1.2px)`,
            backgroundSize: '24px 24px',
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          {/* Zoomable & Pannable Container */}
          <div
            className="absolute top-0 left-0 transform-gpu transition-transform duration-75 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: `${canvasViewMode === 'lifecycle' ? 2280 : 2050}px`,
              height: `${
                canvasViewMode === 'lifecycle'
                  ? Math.max(visibleRuns.length * 1150, 1040)
                  : Math.max(visibleRuns.length * 440 + 80, 800)
              }px`,
            }}
          >
            {canvasViewMode === 'lifecycle' ? (
              <BranchLifecycleCanvas
                project={project}
                activeRun={activeRun}
                lifecycleStep={lifecycleStep}
                onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                selectedNodeId={selectedNodeId}
                onOpenFixModal={() => setIsPrChecksModalOpen(true)}
                onOpenDevWorkflowModal={() => setIsPrChecksModalOpen(true)}
                visibleRuns={visibleRuns}
                onSelectRun={(runId) => setSelectedRunId(runId)}
                onOpenPrChecksModal={() => setIsPrChecksModalOpen(true)}
              />
            ) : (
              <StandardPipelineTracks
                visibleRuns={visibleRuns}
                activeRun={activeRun}
                selectedNodeId={selectedNodeId}
                simulationStage={simulationStage}
                activeScannerTool={activeScannerTool}
                toolScanProgress={toolScanProgress}
                policy={policy}
                onSelectRun={(runId) => setSelectedRunId(runId)}
                onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                onOpenFixModal={() => setIsPrChecksModalOpen(true)}
                onOpenOverrideModal={() => setIsOverrideModalOpen(true)}
                onSwitchEnvironment={handleSwitchEnvironment}
                onRollback={handleRollback}
                onRetryScanner={handleRetryScanner}
                onOpenPrChecksModal={() => setIsPrChecksModalOpen(true)}
              />
            )}
        </div>

          {/* Floating Bottom Canvas Toolbar */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-slate-900/95 border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-xs transition-all duration-300 ease-in-out select-none",
              isTerminalOpen
                ? isTerminalExpanded
                  ? "bottom-[calc(75%+14px)]"
                  : "bottom-[304px]"
                : "bottom-6"
            )}
          >
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
              title="축소 (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-[11px] text-slate-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
              title="확대 (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={handleFitScreen}
              className="px-2.5 py-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold"
            >
              화면 맞춤
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2.5 py-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white text-[11px]"
            >
              100%
            </button>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <div className="text-[11px] text-slate-400 px-2 font-mono flex items-center gap-1.5">
              <span
                className={cn(
                  'w-2 h-2 rounded-full animate-pulse',
                  canvasViewMode === 'lifecycle' ? 'bg-emerald-400' : 'bg-indigo-400'
                )}
              />
              {canvasViewMode === 'lifecycle' ? (
                <span>
                  라이프사이클:{' '}
                  <strong className="text-white">
                    {lifecycleStep ? `${lifecycleStep} / 7 단계` : '3개 트랙 전 과정'}
                  </strong>
                </span>
              ) : (
                <span>
                  진행 단계: <strong className="text-white">{activeRun.currentStage} / 5</strong>
                </span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-700 mx-1" />

            <button
              onClick={() => setIsTerminalOpen(!isTerminalOpen)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                isTerminalOpen
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="실시간 러너 터미널 콘솔 열기/닫기"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>콘솔 {isTerminalOpen ? '닫기' : '열기'}</span>
            </button>
          </div>

          {/* Live Runner Terminal Console Drawer */}
          <PipelineLiveTerminal
            logs={activeRun.executionLogs}
            isOpen={isTerminalOpen}
            onToggle={() => setIsTerminalOpen(!isTerminalOpen)}
            isExpanded={isTerminalExpanded}
            onToggleExpand={() => setIsTerminalExpanded(!isTerminalExpanded)}
            runnerInfo={{
              workerNode: 'k8s-sec-worker-01',
              containerId: `cnt-${activeRun.id}`,
              branch: activeRun.branch,
              commitId: activeRun.commitId,
            }}
          />
        </div>

        {/* 3. RIGHT INSPECTOR DRAWER */}
        {isInspectorOpen && (
          <aside className="inspector-panel w-96 border-l border-slate-800 bg-slate-900/95 backdrop-blur-xl flex flex-col z-20 shrink-0 shadow-2xl">
            {/* Inspector Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  노드 상세 속성 검사기
                </span>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Inspector Body based on selectedNodeId */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs text-slate-300">
              {/* NODE 1 INSPECTION */}
              {selectedNodeId === 'node-trigger' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Git 소스 이벤트 트리거</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: trigger-git-event</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[11px] text-slate-400 font-semibold block">이벤트 메타데이터</span>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-500">실행 계기</span>
                        <span className="text-white font-bold">{activeRun.trigger}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">작성자</span>
                        <span className="text-white font-semibold">{activeRun.author} ({activeRun.authorRole})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">부서 / 이메일</span>
                        <span className="font-mono text-slate-300">{activeRun.authorEmail}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">작업 브랜치</span>
                        <span className="font-mono text-indigo-400">{activeRun.branch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">타겟 브랜치</span>
                        <span className="font-mono text-slate-400">{activeRun.targetBranch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">커밋 ID</span>
                        <span className="font-mono text-slate-300">@{activeRun.commitId}</span>
                      </div>
                    </div>
                  </div>

                  {activeRun.trigger === 'PR/MR' && (
                    <Button
                      size="sm"
                      onClick={() => setIsPrChecksModalOpen(true)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 gap-1.5 shadow-md shadow-emerald-950"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      GitHub PR Checks & 봇 코멘트 보기 (#{activeRun.prNumber || 142})
                    </Button>
                  )}

                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-slate-400">사내 Git Webhook 페이로드 (JSON)</span>
                    <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-emerald-400 overflow-x-auto leading-relaxed">
{`{
  "event": "${activeRun.trigger}",
  "ref": "refs/heads/${activeRun.branch}",
  "commit": "${activeRun.commitId}",
  "message": "${activeRun.commitMessage}",
  "author": {
    "name": "${activeRun.author}",
    "email": "${activeRun.authorEmail}"
  },
  "repository": "${project.repository}"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {/* NODE 2 INSPECTION */}
              {selectedNodeId === 'node-scanners' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isScannerRunning
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : isScannerDone
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      2
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">CI/CD 보안점검 엔진</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: scanner-cluster-runner</span>
                    </div>
                  </div>

                  {isScannerPending ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-600" />
                      <h5 className="font-bold text-slate-300">점검 대기 상태 (진행 전)</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        아직 점검 러너가 시작되지 않은 상태입니다. 상단의 <strong>[파이프라인 재실행]</strong> 버튼을 누르면 즉시 컨테이너가 가동되어 실시간 점검이 수행됩니다.
                      </p>
                      <Button
                        size="sm"
                        onClick={handleRunSimulation}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 gap-1.5 mt-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        지금 즉시 점검 시작
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                        <span className="text-[11px] text-slate-400 font-semibold block">4대 점검 도구 상태</span>
                        <div className="space-y-2">
                          <div className="p-2 rounded bg-slate-900 flex items-center justify-between text-[11px]">
                            <span>SonarQube (SAST)</span>
                            <span className="font-mono text-amber-400 font-bold">{activeRun.toolStatuses.sast.count}건 ({activeRun.toolStatuses.sast.duration}초)</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 flex items-center justify-between text-[11px]">
                            <span>Snyk (SCA)</span>
                            <span className="font-mono text-amber-400 font-bold">{activeRun.toolStatuses.sca.count}건 ({activeRun.toolStatuses.sca.duration}초)</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 flex items-center justify-between text-[11px]">
                            <span>Gitleaks (Secret)</span>
                            <span className="font-mono text-emerald-400 font-bold">{activeRun.toolStatuses.secret.count}건 ({activeRun.toolStatuses.secret.duration}초)</span>
                          </div>
                          <div className="p-2 rounded bg-slate-900 flex items-center justify-between text-[11px]">
                            <span>Checkov (IaC)</span>
                            <span className="font-mono text-emerald-400 font-bold">{activeRun.toolStatuses.iac.count}건 ({activeRun.toolStatuses.iac.duration}초)</span>
                          </div>
                        </div>
                      </div>

                      {activeRun.toolFailure === 'sast' && (
                        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-rose-300 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            SAST 엔진 504 Gateway Timeout 장애
                          </div>
                          <p className="text-[11px] text-rose-200/90 leading-snug">
                            SonarQube 러너 파드가 대기 큐 초과로 타임아웃되었습니다. 다른 3종 도구는 정상 완료되었으므로 SAST만 단독 재시도할 수 있습니다.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleRetryScanner('sast')}
                            disabled={retryingTool !== null}
                            className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-8 gap-1.5"
                          >
                            {retryingTool === 'sast' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            SAST 점검 엔진 단독 재시도
                          </Button>
                        </div>
                      )}

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                          공급망 보안 (Supply Chain Security)
                        </span>
                        <div className="space-y-1 text-slate-400">
                          <div className="flex justify-between">
                            <span>Cosign 이미지 서명:</span>
                            <span className="text-emerald-400 font-semibold font-mono">✅ 서명 유효 (SLSA-3)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SBOM 산출물:</span>
                            <span className="text-cyan-300 font-semibold font-mono">CycloneDX v1.5 (142 pkgs)</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                          실시간 컨테이너 러너 로그
                        </span>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[10px] text-slate-300 space-y-1 max-h-48 overflow-y-auto leading-relaxed">
                          {activeRun.executionLogs.map((log, lIdx) => (
                            <div
                              key={lIdx}
                              className={
                                log.includes('[ERROR]')
                                  ? 'text-rose-400 font-bold'
                                  : log.includes('[WARN]')
                                  ? 'text-amber-400'
                                  : log.includes('[SUCCESS]')
                                  ? 'text-emerald-400 font-bold'
                                  : 'text-slate-400'
                              }
                            >
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <Button
                          onClick={handleRunSimulation}
                          disabled={simulationStage !== null}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-8 gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          컨테이너 점검 재시도 (실시간 시뮬레이션)
                        </Button>

                        {onNavigate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              onClose();
                              onNavigate('findings', { branch: activeRun.branch });
                            }}
                            className="w-full text-xs h-8 gap-1.5 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                          >
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                            결함 관리(Findings)에서 상세 보기
                            <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* NODE 3 INSPECTION */}
              {selectedNodeId === 'node-policy' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isGatePassed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isGateReview
                          ? 'bg-amber-500/20 text-amber-400'
                          : isGateBlocked
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      3
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">보안 정책 게이트 평가</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: gate-decision-engine</span>
                    </div>
                  </div>

                  {isGatePending ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-600" />
                      <h5 className="font-bold text-slate-300">정책 평가 대기 (진행 전)</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        2단계 보안점검 결과가 생성된 이후 자동으로 정책 임계치가 평가됩니다.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-[11px] text-slate-400 font-semibold block">적용 정책 기준</span>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-slate-500">치명적 차단 규칙</span>
                            <span className="text-white font-bold">{policy.blockOnCritical ? '1건 이상 시 즉시 차단' : '미적용'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">높음 차단 임계치</span>
                            <span className="font-mono text-white">{policy.highThresholdForBlock}건 이상 시 차단</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">중간 검토 임계치</span>
                            <span className="font-mono text-white">{policy.mediumThresholdForReview}건 이상</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <span className="text-[11px] text-slate-400 font-semibold block">
                          판정 근거: <strong className={isGateBlocked ? 'text-rose-400' : isGateReview ? 'text-amber-400' : 'text-emerald-400'}>
                            {activeRun.policyNotes || '정책 평가 완료'}
                          </strong>
                        </span>
                        <div className="text-[11px] text-slate-400">
                          탐지된 치명적 결함: <strong className="text-white">{activeRun.critCount}건</strong>,
                          높음: <strong className="text-white">{activeRun.highCount}건</strong>,
                          중간: <strong className="text-white">{activeRun.medCount}건</strong>
                        </div>
                      </div>

                      {isOverridden && (
                        <div className="p-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-700/60 space-y-1.5 text-[11px] text-fuchsia-200">
                          <span className="font-bold flex items-center gap-1.5 text-fuchsia-300">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            CISO 긴급 보안 예외 승인 증적 (Audit Trail)
                          </span>
                          <div>승인자: <strong className="text-white">{activeRun.overrideData?.approver || 'CISO 김철수 상무'}</strong></div>
                          <div>사유 구분: <span className="font-semibold text-fuchsia-300">{activeRun.overrideData?.reason}</span></div>
                          <div className="italic text-[10px] text-slate-300">"{activeRun.overrideData?.detail}"</div>
                          <div className="text-[10px] text-amber-300 font-mono">⏳ 사후 조치 기한: 24시간 이내 패치 보증</div>
                        </div>
                      )}

                      {/* Detailed Remediation Cards when Blocked */}
                      {isGateBlocked && !isOverridden && (
                        <div className="space-y-2">
                          {/* Secret Leak Specific Remediation Card */}
                          {activeRun.toolStatuses.secret.count > 0 && (
                            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-800/80 space-y-1.5 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                                <span>탐지된 시크릿: AWS Secret Access Key</span>
                              </div>
                              <div className="text-[10px] text-slate-400">발견 위치: src/config/auth.key:12 (Entropy: 5.82)</div>
                              <div className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-900/50 leading-relaxed font-sans">
                                💡 <strong>보안팀 긴급 조치 가이드:</strong><br />
                                1. AWS 콘솔 IAM에서 노출된 Access Key를 즉시 비활성화(Deactivate)<br />
                                2. <code>git filter-repo --invert-paths --path src/config/auth.key</code> 실행 후 Force Push
                              </div>
                            </div>
                          )}

                          {/* IaC Misconfiguration Specific Remediation Card */}
                          {activeRun.toolStatuses.iac.count > 0 && (
                            <div className="p-3 rounded-xl bg-slate-950/80 border border-amber-800/80 space-y-1.5 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                                <FileCode className="w-3.5 h-3.5 shrink-0" />
                                <span>탐지된 IaC 위반: CKV_AWS_20 (S3 Public ACL)</span>
                              </div>
                              <div className="text-[10px] text-slate-400">발견 위치: infra/terraform/s3.tf:14</div>
                              <div className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-900/50 leading-relaxed font-sans">
                                💡 <strong>클라우드 인프라 수정 가이드:</strong><br />
                                1. <code>acl = "private"</code>로 변경<br />
                                2. <code>aws_s3_bucket_public_access_block</code> 리소스 추가 및 <code>block_public_acls = true</code> 지정
                              </div>
                            </div>
                          )}

                          {/* SAST SQLi Specific Remediation Card */}
                          {activeRun.toolStatuses.sast.count > 0 && activeRun.critCount > 0 && activeRun.toolStatuses.secret.count === 0 && (
                            <div className="p-3 rounded-xl bg-slate-950/80 border border-rose-800/80 space-y-1.5 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                <Code2 className="w-3.5 h-3.5 shrink-0" />
                                <span>탐지된 코드 취약점: CWE-89 SQL Injection</span>
                              </div>
                              <div className="text-[10px] text-slate-400">발견 위치: src/controllers/authController.ts:42</div>
                              <div className="text-[10px] text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-900/50 leading-relaxed font-sans">
                                💡 <strong>소스코드 시큐어코딩 가이드:</strong><br />
                                동적 문자열 결합(String Concatenation) SQL 쿼리를 즉시 제거하고 파라미터화된 쿼리(PreparedStatement) 또는 ORM 매핑을 사용하세요.
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {isGateBlocked && !isOverridden && (
                        <div className="space-y-2 pt-1">
                          {/* Standard Path: Fix Branch (Recommended) */}
                          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                                <GitBranch className="w-3.5 h-3.5 text-emerald-400" />
                                표준 개발 워크플로우 (권장)
                              </span>
                              <Badge variant="outline" className="text-[9px] border-emerald-500/60 text-emerald-300">
                                Git Flow
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">
                              실무 표준대로 <strong>fix/ 브랜치</strong>를 분기하여 보안 결함을 수정한 뒤, 재검증 PR을 발행하여 0 defects 클린 배포를 진행합니다.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => setIsPrChecksModalOpen(true)}
                              className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-950 mt-1"
                            >
                              <GitBranch className="w-3.5 h-3.5" />
                              🛠️ fix/ 조치 브랜치 생성 및 재검증 PR
                            </Button>
                          </div>

                          {/* Emergency Bypass Path: CISO Override */}
                          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                장애 긴급 핫픽스 우회 (특수 상황)
                              </span>
                              <Badge variant="destructive" className="text-[9px]">
                                CISO Bypass
                              </Badge>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              서비스 전면 장애 등 긴급 배포가 불가피한 경우, CISO 인가를 통해 24시간 내 사후 패치 확약서를 등록하고 즉시 배포합니다.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => setIsOverrideModalOpen(true)}
                              className="w-full text-xs h-8 bg-rose-600 hover:bg-rose-500 text-white font-bold gap-1.5 shadow-md shadow-rose-950 mt-1"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              🚨 CISO 긴급 예외 승인 신청
                            </Button>
                          </div>

                          {/* GitHub PR Checks Bot Direct View */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsPrChecksModalOpen(true)}
                            className="w-full text-xs h-8 border-indigo-700/80 bg-indigo-950/40 hover:bg-indigo-900/60 text-indigo-300 font-semibold gap-1.5"
                          >
                            <GitPullRequest className="w-3.5 h-3.5 text-indigo-400" />
                            GitHub PR 화면에서 봇 피드백 보기
                          </Button>
                        </div>
                      )}

                      {onNavigate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onClose();
                            onNavigate('findings', { branch: activeRun.branch });
                          }}
                          className="w-full text-xs h-8 gap-1.5 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          차단 원인 결함 목록 확인하기
                          <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* NODE 4 INSPECTION */}
              {selectedNodeId === 'node-review' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isReviewApproved
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isReviewPending
                          ? 'bg-amber-500/20 text-amber-400'
                          : isReviewRejected
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">배포 심사 및 인가</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: deployment-review-gate</span>
                    </div>
                  </div>

                  {isReviewNotReached ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-600" />
                      <h5 className="font-bold text-slate-300">심사 단계 미도달 (진행 전)</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        이전 단계의 보안 정책 게이트를 통과해야 심사 프로세스가 생성됩니다.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">배포 타겟 환경</span>
                          <Badge variant="outline" className="text-[10px] text-indigo-300 border-indigo-500/40">
                            {activeRun.targetEnvironment} 배포
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">배포 요청 커밋</span>
                          <span className="font-mono text-slate-300">@{activeRun.commitId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">커밋 일치 검증</span>
                          <span className="font-semibold text-emerald-400">
                            {activeRun.commitMatch ? '✅ 일치 확인' : '❌ 불일치'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">심사 결과</span>
                          <span className={`font-bold ${isReviewApproved ? 'text-emerald-400' : isReviewRejected ? 'text-rose-400' : 'text-amber-400'}`}>
                            {isReviewApproved ? '승인 완료' : isReviewRejected ? '심사 반려' : '심사 대기 중'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">심사자</span>
                          <span className="text-slate-200">{activeRun.reviewer || '미배정'}</span>
                        </div>
                      </div>

                      {/* Interactive Review Action simulation */}
                      {isReviewPending && (
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <span className="text-[11px] text-slate-400 font-semibold">심사 조치 시뮬레이션</span>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleApproveReview}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8"
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              승인 처리
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={handleRejectReview}
                              className="flex-1 text-xs h-8"
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              반려 처리
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* NODE 5 INSPECTION */}
              {selectedNodeId === 'node-deploy' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold ${
                        isDeployActive
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isDeployBlocked
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      5
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">운영 인프라 배포 타겟</h4>
                      <span className="text-[10px] text-slate-400 font-mono">ID: kubernetes-prod-target</span>
                    </div>
                  </div>

                  {isDeployPending ? (
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                      <Clock className="w-8 h-8 mx-auto text-slate-600" />
                      <h5 className="font-bold text-slate-300">배포 전 대기 상태 (진행 전)</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        4단계 배포 심사가 승인되면 클러스터 네임스페이스(<strong>{activeRun.namespace}</strong>)로 무중단 롤링 업데이트가 수행됩니다.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">배포 상태</span>
                          <span className={`font-bold ${isDeployActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isDeployActive ? '배포 완료 (Active)' : '배포 차단 (Blocked)'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">대상 클러스터</span>
                          <span className="font-mono text-white">{activeRun.cluster} (v1.29)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">네임스페이스</span>
                          <span className="font-mono text-indigo-400">{activeRun.namespace}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pod 복제본</span>
                          <span className="font-mono text-emerald-400 font-bold">{activeRun.replicas}</span>
                        </div>
                      </div>

                      {isRolledBack && (
                        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-700/60 space-y-1.5 text-[11px] text-cyan-200">
                          <span className="font-bold flex items-center gap-1.5 text-cyan-300">
                            <Undo2 className="w-3.5 h-3.5" />
                            카나리 자동 롤백 완료 증적
                          </span>
                          <div>복구 리비전: <strong className="font-mono text-white">@v2.4.0 (Stable Release)</strong></div>
                          <div className="text-[10px] text-slate-300">
                            HTTP 5xx 에러율 14.8% 감지 후 무중단 카나리 자동 롤백 성공.
                          </div>
                        </div>
                      )}

                      {isCanaryFailed && (
                        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/80 space-y-2">
                          <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                            <AlertCircle className="w-4 h-4 text-rose-400" />
                            카나리 헬스체크 이상 감지 (에러율 14.8%)
                          </div>
                          <p className="text-[11px] text-rose-200/90 leading-snug">
                            10% 카나리 트래픽 유입 중 5xx HTTP 게이트웨이 에러가 임계치(1.0%)를 초과했습니다. 즉시 이전 안정 버전으로 롤백해야 합니다.
                          </p>
                          <Button
                            size="sm"
                            onClick={handleRollback}
                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-8 gap-1.5 shadow-md shadow-cyan-950"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            이전 안정 버전(@v2.4.0)으로 즉시 롤백
                          </Button>
                        </div>
                      )}

                      {isOverridden && (
                        <div className="p-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-700/60 space-y-1 text-[11px] text-fuchsia-200">
                          <span className="font-bold text-fuchsia-300">🚨 CISO 긴급 승인 인프라 가동 중</span>
                          <div>승인자: {activeRun.overrideData?.approver || 'CISO 김철수 상무'}</div>
                          <div className="text-[10px] text-amber-300 font-mono">24시간 이내 보안 결함 패치 완료 보증</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* CISO Emergency Security Override Dialog */}
      <SecurityOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        onApprove={handleApproveOverride}
        projectName={project.name}
        branch={activeRun.branch}
        critCount={activeRun.critCount}
        highCount={activeRun.highCount}
      />

      {/* Git Flow Standard Fix Branch & Re-verification Dialog */}
      <FixBranchModal
        isOpen={isFixBranchModalOpen}
        onClose={() => setIsFixBranchModalOpen(false)}
        onCreateFix={handleCreateFixBranch}
        projectName={project.name}
        currentBranch={activeRun.branch}
        targetBranch={activeRun.targetBranch || 'main'}
        author={activeRun.author}
        department={activeRun.department}
        critCount={activeRun.critCount}
        highCount={activeRun.highCount}
        issueType={detectedIssueType}
      />

      {/* Assignee Notification & Resolution Workflow Dialog */}
      <DeveloperWorkflowModal
        isOpen={isDevWorkflowModalOpen}
        onClose={() => setIsDevWorkflowModalOpen(false)}
        author={activeRun.author}
        authorEmail={activeRun.authorEmail}
        department={activeRun.department}
        branch={activeRun.branch}
        commitId={activeRun.commitId}
        critCount={activeRun.critCount}
        onStartFixFlow={() => {
          setIsDevWorkflowModalOpen(false);
          setIsPrChecksModalOpen(true);
        }}
      />

      {/* GitHub / GitLab PR Checks & Bot Interaction Modal */}
      <GitHubPrChecksModal
        isOpen={isPrChecksModalOpen}
        onClose={() => setIsPrChecksModalOpen(false)}
        prNumber={activeRun.prNumber || 1}
        prTitle={activeRun.commitMessage || `${activeRun.branch} 보안 점검 및 기능 개발`}
        author={activeRun.author}
        authorRole={activeRun.authorRole}
        authorEmail={activeRun.authorEmail}
        sourceBranch={activeRun.branch}
        targetBranch={activeRun.targetBranch || 'main'}
        commitId={activeRun.commitId}
        projectName={project.name}
        repoFullName={project.repository || 'devlee0908/agentgate'}
        initialCheckStatus={
          activeRun.gateStatus === 'blocked'
            ? 'failed'
            : activeRun.scanStatus === 'running'
            ? 'running'
            : 'passed'
        }
        detectedIssue={detectedPrIssue}
        detectedIssues={AGENTGATE_ALL_SCAN_ISSUES}
        rejectionInfo={
          activeRun.reviewStatus === 'rejected'
            ? {
                reviewer: activeRun.reviewer || '보안 심사관',
                comment: activeRun.reviewComment || '보안 정책 위반으로 배포가 반려되었습니다.',
              }
            : undefined
        }
        onSimulateFixPushed={handlePrFixPushed}
        onRequestWaiver={() => {
          setIsPrChecksModalOpen(false);
          setIsOverrideModalOpen(true);
        }}
        onNavigateToReviews={() => {
          setIsPrChecksModalOpen(false);
          onClose();
          onNavigate?.('reviews');
        }}
      />
    </div>,
    document.body
  );
};
