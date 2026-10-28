import React from 'react';
import { Project } from '@/types';
import { PipelineRunSample } from './PipelineCanvasModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  GitMerge,
  GitFork,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ArrowRight,
  ArrowDown,
  CornerDownRight,
  Loader2,
  Code2,
  Package,
  KeyRound,
  FileCode,
  Check,
  CheckCheck,
  Server,
  Terminal,
  SlidersHorizontal,
  Bell,
  Rocket,
  Clock,
} from 'lucide-react';

interface BranchLifecycleCanvasProps {
  project: Project;
  activeRun: PipelineRunSample;
  lifecycleStep: number | null;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string;
  onOpenFixModal: () => void;
  onOpenDevWorkflowModal: () => void;
  visibleRuns?: PipelineRunSample[];
  onSelectRun?: (runId: string) => void;
  onOpenPrChecksModal?: () => void;
}

export const BranchLifecycleCanvas: React.FC<BranchLifecycleCanvasProps> = ({
  project,
  activeRun,
  lifecycleStep,
  onSelectNode,
  selectedNodeId,
  onOpenFixModal,
  onOpenDevWorkflowModal,
  visibleRuns,
  onSelectRun,
  onOpenPrChecksModal,
}) => {
  const runsToRender = visibleRuns && visibleRuns.length > 0 ? visibleRuns : [activeRun];
  const totalHeight = Math.max(runsToRender.length * 1150, 1040);

  return (
    <div className="relative" style={{ width: '2260px', height: `${totalHeight}px` }}>
      {/* SVG Global Filters */}
      <svg className="absolute top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none">
        <defs>
          <filter id="glow-emerald-lc" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-indigo-lc" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {runsToRender.map((runItem, runIdx) => {
        const offsetY = runIdx * 1150;
        const isThisRunActive = runItem.id === activeRun.id;

        // Step-based states for simulation
        const isL1Active = isThisRunActive && lifecycleStep === 1;
        const isL2Blocked = isThisRunActive
          ? lifecycleStep === 2 || (lifecycleStep === null && runItem.gateStatus === 'blocked')
          : runItem.gateStatus === 'blocked';
        const isL3Branching = isThisRunActive && lifecycleStep === 3;
        const isL4ReScan = isThisRunActive && lifecycleStep === 4;
        const isL5Merged = isThisRunActive && lifecycleStep === 5;
        const isL6MainScan = isThisRunActive && lifecycleStep === 6;
        const isL7Deployed = isThisRunActive && lifecycleStep === 7;

        return (
          <div key={runItem.id} className="relative">
            {/* Run Group Header Banner when multi-run */}
            {runsToRender.length > 1 && (
              <div
                className="absolute z-20 flex items-center justify-between px-6 py-2.5 rounded-xl bg-[#141417]/95 border border-white/[0.1] backdrop-blur-md shadow-xl"
                style={{ left: '40px', top: `${offsetY + 5}px`, width: '2170px' }}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold font-mono border",
                    isThisRunActive
                      ? "bg-zinc-100 border-zinc-100 text-zinc-950"
                      : "bg-zinc-900 text-zinc-300 border-white/[0.1]"
                  )}>
                    <GitFork className="w-3.5 h-3.5" />
                    RUN #{runIdx + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-white/[0.12] text-zinc-100 font-semibold flex items-center justify-center text-[10px]">
                      {runItem.author[0]}
                    </div>
                    <span className="font-semibold text-zinc-100 text-xs">{runItem.author}</span>
                    <span className="text-zinc-400 text-xs">({runItem.authorRole} · {runItem.department})</span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-zinc-300 bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.08]">
                      {runItem.trigger === 'PR/MR' ? `PR #${runItem.prNumber}` : 'Push'}
                    </span>
                    <span className="text-zinc-100 font-semibold">{runItem.branch}</span>
                    <span className="text-zinc-500">@{runItem.commitId}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {runItem.gateStatus === 'blocked' ? (
                    <Badge variant="destructive" className="text-xs font-semibold gap-1 px-3 py-1">
                      <ShieldAlert className="w-3 h-3" />
                      정책 게이트 차단 (조치 라이프사이클 가동)
                    </Badge>
                  ) : runItem.deployStatus === 'deployed' ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs font-semibold gap-1 px-3 py-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      운영 배포 완료
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-white/[0.15] text-zinc-200 bg-white/[0.06] text-xs font-semibold gap-1 px-3 py-1">
                      <Clock className="w-3 h-3 text-zinc-400" />
                      파이프라인 진행 중
                    </Badge>
                  )}

                  <button
                    onClick={() => onSelectRun?.(runItem.id)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold transition-all border",
                      isThisRunActive
                        ? "bg-zinc-100 text-zinc-950 border-zinc-100"
                        : "bg-zinc-900 text-zinc-300 hover:text-white border-white/[0.1]"
                    )}
                  >
                    {isThisRunActive ? '선택됨 (인스펙터 연동)' : '이 런 포커스'}
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* 1. SWIMLANE BACKGROUND TRACKS (Feature -> Fix -> Main) */}
            {/* ========================================================================= */}

            {/* Track 1: Feature Branch (Top Lane) */}
            <div
              className="absolute rounded-xl border border-rose-500/25 bg-[#0f0f11]/60 transition-all overflow-hidden"
              style={{ left: '40px', top: `${offsetY + 40}px`, width: '1070px', height: '260px' }}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-rose-500/20 bg-rose-950/20">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-semibold text-xs font-mono">
                    <GitBranch className="w-3.5 h-3.5 text-rose-400" />
                    TRACK 1
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 text-xs">Feature 개발 브랜치</span>
                    <span className="text-[11px] text-rose-300 font-mono bg-[#09090b] px-2 py-0.5 rounded border border-rose-500/30">
                      {runItem.branch}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-rose-500/40 text-rose-400 bg-rose-500/10 text-[11px] font-semibold gap-1.5 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    정책 게이트 배포 차단
                  </Badge>
                </div>
              </div>
            </div>

            {/* Track 2: Fix Remediation Branch (Middle Lane) */}
            <div
              className="absolute rounded-xl border border-emerald-500/25 bg-[#0f0f11]/60 transition-all overflow-hidden"
              style={{ left: '740px', top: `${offsetY + 390}px`, width: '1090px', height: '260px' }}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/20 bg-emerald-950/20">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-xs font-mono">
                    <GitFork className="w-3.5 h-3.5 text-emerald-400" />
                    TRACK 2
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 text-xs">Fix 조치 브랜치</span>
                    <span className="text-[11px] text-emerald-300 font-mono bg-[#09090b] px-2 py-0.5 rounded border border-emerald-500/30">
                      fix/revoke-leaked-secret (PR #153)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[11px] font-semibold gap-1.5 px-2.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    4대 점검 재실행 클린 통과
                  </Badge>
                </div>
              </div>
            </div>

            {/* Track 3: Main Production Branch (Bottom Lane) */}
            <div
              className="absolute rounded-xl border border-white/[0.12] bg-[#0f0f11]/60 transition-all overflow-hidden"
              style={{ left: '1450px', top: `${offsetY + 740}px`, width: '760px', height: '260px' }}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#141417]/80">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.08] border border-white/[0.15] text-zinc-100 font-semibold text-xs font-mono">
                    <GitMerge className="w-3.5 h-3.5 text-zinc-300" />
                    TRACK 3
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100 text-xs">Main 프로덕션 브랜치</span>
                    <span className="text-[11px] text-zinc-300 font-mono bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.1]">
                      main (릴리즈 통합 배포)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 bg-emerald-500/10 text-[11px] font-semibold gap-1.5 px-2.5 py-1">
                    <Rocket className="w-3.5 h-3.5 text-emerald-400" />
                    K8s 무중단 배포 완료
                  </Badge>
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. SVG CONNECTING CABLES */}
            {/* ========================================================================= */}
            <svg
              className="absolute top-0 left-0 overflow-visible pointer-events-none z-10"
              style={{ width: '2260px', height: `${totalHeight}px` }}
            >
              {/* Track 1 Horizontal Cables (Y=190 + offsetY) */}
              {/* F1 -> F2 */}
              <path
                d={`M 360 ${offsetY + 190} L 420 ${offsetY + 190}`}
                fill="none"
                stroke={isL1Active ? '#6366f1' : '#10b981'}
                strokeWidth={isL1Active ? '4' : '3'}
                strokeDasharray={isL1Active ? '6,6' : 'none'}
                className={isL1Active ? 'animate-cable-dash' : ''}
              />

              {/* F2 -> F3 */}
              <path
                d={`M 710 ${offsetY + 190} L 770 ${offsetY + 190}`}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="3"
                strokeDasharray="5,5"
                className={isL2Blocked ? 'animate-cable-dash' : ''}
              />

              {/* DOWNWARD BRANCH CABLE: F3 (Feature Gate) -> R1 (Fix Commit) */}
              {/* From F3 bottom (925, offsetY + 276) straight down to R1 top (925, offsetY + 454) - 178px length */}
              <path
                d={`M 925 ${offsetY + 276} L 925 ${offsetY + 454}`}
                fill="none"
                stroke={isL3Branching ? '#6366f1' : '#10b981'}
                strokeWidth={isL3Branching ? '4' : '3'}
                strokeDasharray={isL3Branching ? '6,6' : 'none'}
                className={isL3Branching ? 'animate-cable-dash' : ''}
              />

              {/* Track 2 Horizontal Cables (Y=540 + offsetY) */}
              {/* R1 -> R2 */}
              <path
                d={`M 1080 ${offsetY + 540} L 1140 ${offsetY + 540}`}
                fill="none"
                stroke={isL4ReScan ? '#6366f1' : '#10b981'}
                strokeWidth={isL4ReScan ? '4' : '3'}
                strokeDasharray={isL4ReScan ? '6,6' : 'none'}
                className={isL4ReScan ? 'animate-cable-dash' : ''}
              />

              {/* R2 -> R3 */}
              <path
                d={`M 1430 ${offsetY + 540} L 1490 ${offsetY + 540}`}
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
              />

              {/* DOWNWARD MERGE CABLE: R3 (PR Merge) -> M1 (Main Scan) */}
              {/* From R3 bottom (1645, offsetY + 626) straight down to M1 top (1645, offsetY + 804) - 178px length */}
              <path
                d={`M 1645 ${offsetY + 626} L 1645 ${offsetY + 804}`}
                fill="none"
                stroke={isL5Merged ? '#6366f1' : '#10b981'}
                strokeWidth={isL5Merged ? '4' : '3'}
                strokeDasharray={isL5Merged ? '6,6' : 'none'}
                className={isL5Merged ? 'animate-cable-dash' : ''}
              />

              {/* Track 3 Horizontal Cable (Y=890 + offsetY) */}
              {/* M1 -> M2 */}
              <path
                d={`M 1800 ${offsetY + 890} L 1860 ${offsetY + 890}`}
                fill="none"
                stroke={isL6MainScan || isL7Deployed ? '#10b981' : '#64748b'}
                strokeWidth="3"
                strokeDasharray={isL6MainScan ? '6,6' : 'none'}
                className={isL6MainScan ? 'animate-cable-dash' : ''}
              />
            </svg>

            {/* Downward Branch Badge on Cable 1 (F3 -> R1) - 75px clear space above & below */}
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: '925px', top: `${offsetY + 365}px` }}
            >
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#141417]/95 border border-emerald-500/50 text-emerald-300 shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                <CornerDownRight className="w-3.5 h-3.5 text-emerald-400" />
                fix/ 브랜치 자동 분기 (수정 노드)
              </span>
            </div>

            {/* Downward Merge Badge on Cable 2 (R3 -> M1) - 75px clear space above & below */}
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: '1645px', top: `${offsetY + 715}px` }}
            >
              <span className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#141417]/95 border border-white/[0.2] text-zinc-200 shadow-lg flex items-center gap-1.5 backdrop-blur-md">
                <GitMerge className="w-3.5 h-3.5 text-emerald-400" />
                PR 승인 & main 머지 (릴리즈)
              </span>
            </div>

            {/* ========================================================================= */}
            {/* 3. WORKFLOW NODES */}
            {/* ========================================================================= */}

            {/* ------------------- TRACK 1 NODES ------------------- */}
            {/* Node L-F1: Feature Git Event */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-trigger');
              }}
              className={cn(
                'workflow-node absolute rounded-xl border p-4 bg-[#141417]/95 shadow-lg transition-all cursor-pointer flex flex-col justify-between',
                isThisRunActive && selectedNodeId === 'node-trigger' ? 'border-zinc-200 ring-2 ring-white/[0.15]' : 'border-white/[0.08] hover:border-white/[0.18]'
              )}
              style={{ left: '70px', top: `${offsetY + 104}px`, width: '290px', height: '172px' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-white/[0.08] text-zinc-200 border border-white/[0.12] flex items-center justify-center font-semibold text-xs">
                    1
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">1. 소스코드 이벤트</h5>
                    <span className="text-[10px] text-zinc-400 font-mono">Git Webhook</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 font-medium">
                  Push 완료
                </Badge>
              </div>
              <div className="p-2 rounded bg-[#09090b] border border-white/[0.08] text-[11px] space-y-1 font-mono">
                <div className="text-zinc-300 truncate">{runItem.author} ({runItem.department})</div>
                <div className="text-zinc-100 font-semibold truncate">{runItem.branch} (@{runItem.commitId})</div>
              </div>
              <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                <span>러너 컨테이너 할당</span>
                {runItem.trigger === 'PR/MR' && onOpenPrChecksModal ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRun?.(runItem.id);
                      onOpenPrChecksModal();
                    }}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer flex items-center gap-1"
                  >
                    <span>PR #{runItem.prNumber || 142}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <span className="text-emerald-400 font-mono">HTTP 200 OK</span>
                )}
              </div>
              {/* Output Port Right */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* Node L-F2: Feature CI/CD Scanners */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-scanners');
              }}
              className={cn(
                'workflow-node absolute rounded-xl border p-4 bg-[#141417]/95 shadow-lg transition-all cursor-pointer flex flex-col justify-between',
                isThisRunActive && selectedNodeId === 'node-scanners' ? 'border-rose-400 ring-2 ring-rose-500/20' : 'border-rose-500/40 hover:border-rose-400/70'
              )}
              style={{ left: '420px', top: `${offsetY + 104}px`, width: '290px', height: '172px' }}
            >
              {/* Input Port Left */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center font-semibold text-xs">
                    2
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">2. CI/CD 보안점검</h5>
                    <span className="text-[10px] text-rose-400 font-mono">Defects Found</span>
                  </div>
                </div>
                <Badge variant="destructive" className="text-[10px] font-semibold">
                  결함 2건 탐지
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="p-1 rounded bg-rose-950/30 border border-rose-500/30 text-rose-300">
                  Secret: 1건
                </div>
                <div className="p-1 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300">
                  SAST: 1건
                </div>
                <div className="p-1 rounded bg-[#09090b] border border-white/[0.08] text-zinc-400">
                  SCA: 0건
                </div>
                <div className="p-1 rounded bg-[#09090b] border border-white/[0.08] text-zinc-400">
                  IaC: 0건
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 flex items-center justify-between">
                <span>분석 소요: 68초</span>
                <span className="text-rose-400 font-semibold">임계치 초과</span>
              </div>
              {/* Output Port Right */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#09090b]" />
            </div>

            {/* Node L-F3: Feature Policy Gate (Blocked!) */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-policy');
              }}
              className={cn(
                'workflow-node absolute rounded-xl border p-4 bg-[#141417]/95 border-rose-500/60 shadow-lg transition-all cursor-pointer flex flex-col justify-between',
                isThisRunActive && selectedNodeId === 'node-policy' ? 'border-amber-400 ring-2 ring-amber-500/20' : ''
              )}
              style={{ left: '770px', top: `${offsetY + 104}px`, width: '310px', height: '172px' }}
            >
              {/* Input Port Left */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center font-semibold text-xs">
                    3
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">3. 보안 정책 게이트</h5>
                    <span className="text-[10px] text-rose-400 font-mono">Policy Blocked</span>
                  </div>
                </div>
                <Badge variant="destructive" className="text-[10px] font-semibold">
                  배포 차단 (Block)
                </Badge>
              </div>
              <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">치명적 결함(AWS 시크릿)으로 차단</span>
              </div>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFixModal();
                }}
                className="w-full h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
              >
                <GitFork className="w-3.5 h-3.5" />
                fix/ 브랜치로 분기 & 패치
              </Button>
              {/* Output Port Bottom */}
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* ------------------- TRACK 2 NODES ------------------- */}
            {/* Node L-R1: Fix Commit & Patch */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-policy');
              }}
              className="workflow-node absolute rounded-xl border border-emerald-500/50 p-4 bg-[#141417]/95 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              style={{ left: '770px', top: `${offsetY + 454}px`, width: '310px', height: '172px' }}
            >
              {/* Input Port Top */}
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-semibold text-xs">
                    4
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">4. 조치 커밋 반영</h5>
                    <span className="text-[10px] text-emerald-400 font-mono">Secret Removed</span>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                  패치 완료
                </Badge>
              </div>
              <div className="p-2 rounded bg-[#09090b] border border-white/[0.08] text-[11px] space-y-1 font-mono">
                <div className="text-emerald-400 truncate">fix/revoke-leaked-secret (@c82e1f4)</div>
                <div className="text-zinc-300">AWS Secret → Vault API 마이그레이션</div>
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>조치 담당자</span>
                <span className="text-zinc-100 font-mono">{runItem.author}</span>
              </div>
              {/* Output Port Right */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* Node L-R2: Fix Branch Re-Scan */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-scanners');
              }}
              className="workflow-node absolute rounded-xl border border-emerald-500/50 p-4 bg-[#141417]/95 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              style={{ left: '1140px', top: `${offsetY + 454}px`, width: '290px', height: '172px' }}
            >
              {/* Input Port Left */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-semibold text-xs">
                    5
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">5. fix/ 재점검 통과</h5>
                    <span className="text-[10px] text-emerald-400 font-mono">0 Defects Pass</span>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                  통과 (0건)
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div className="p-1 rounded bg-[#09090b] border border-white/[0.08] text-emerald-400">
                  Secret: 0건
                </div>
                <div className="p-1 rounded bg-[#09090b] border border-white/[0.08] text-emerald-400">
                  SAST: 0건
                </div>
                <div className="p-1 rounded bg-[#09090b] border border-white/[0.08] text-emerald-400">
                  SCA: 0건
                </div>
                <div className="p-1 rounded bg-[#09090b] border border-white/[0.08] text-emerald-400">
                  IaC: 0건
                </div>
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>정책 게이트 판정</span>
                <span className="text-emerald-400 font-semibold">PASS (승인 가능)</span>
              </div>
              {/* Output Port Right */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* Node L-R3: PR Approval & Merge */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-review');
              }}
              className="workflow-node absolute rounded-xl border border-white/[0.2] p-4 bg-[#141417]/95 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              style={{ left: '1490px', top: `${offsetY + 454}px`, width: '310px', height: '172px' }}
            >
              {/* Input Port Left */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-white/[0.08] text-zinc-200 border border-white/[0.12] flex items-center justify-center font-semibold text-xs">
                    6
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">6. PR 심사 & main 머지</h5>
                    <span className="text-[10px] text-zinc-400 font-mono">Approved & Merged</span>
                  </div>
                </div>
                <Badge className="bg-zinc-100 text-zinc-950 text-[10px] font-semibold">
                  Merge 완료
                </Badge>
              </div>
              <div className="p-2 rounded bg-[#09090b] border border-white/[0.08] text-[11px] space-y-1">
                <div className="text-zinc-300">심사위원: <strong className="text-zinc-100">보안팀 최수민 팀장</strong></div>
                <div className="text-emerald-400 text-[10px] font-mono">"보안 취약점 조치 확인 완료, 머지 승인"</div>
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>병합 대상: main</span>
                {onOpenPrChecksModal ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPrChecksModal();
                    }}
                    className="text-zinc-200 hover:text-white font-semibold underline cursor-pointer flex items-center gap-1"
                  >
                    <span>PR Checks 뷰</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <span className="text-emerald-400 font-semibold">Fast-Forward</span>
                )}
              </div>
              {/* Output Port Bottom */}
              <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* ------------------- TRACK 3 NODES ------------------- */}
            {/* Node L-M1: Main Integration Scan */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-scanners');
              }}
              className="workflow-node absolute rounded-xl border border-emerald-500/50 p-4 bg-[#141417]/95 shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              style={{ left: '1490px', top: `${offsetY + 804}px`, width: '310px', height: '172px' }}
            >
              {/* Input Port Top */}
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-semibold text-xs">
                    7
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">7. main 통합 무결점 재점검</h5>
                    <span className="text-[10px] text-emerald-400 font-mono">Regression Clean</span>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                  검증 완료
                </Badge>
              </div>
              <div className="p-2 rounded bg-[#09090b] border border-white/[0.08] text-[11px] space-y-1 font-mono">
                <div className="text-zinc-300">main 브랜치 최신 베이스 통합 빌드</div>
                <div className="text-emerald-400 text-[10.5px]">회귀 취약점 0건 (Total 0 defects)</div>
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>Cosign 이미지 서명 유효</span>
                <span className="text-zinc-200 font-mono">SLSA Level 3</span>
              </div>
              {/* Output Port Right */}
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* Node L-M2: Production K8s Deployment */}
            <div
              onClick={() => {
                onSelectRun?.(runItem.id);
                onSelectNode('node-deploy');
              }}
              className="workflow-node absolute rounded-xl border border-emerald-400/70 p-4 bg-[#141417] shadow-lg transition-all cursor-pointer flex flex-col justify-between"
              style={{ left: '1860px', top: `${offsetY + 804}px`, width: '310px', height: '172px' }}
            >
              {/* Input Port Left */}
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-semibold text-xs">
                    8
                  </div>
                  <div>
                    <h5 className="font-semibold text-zinc-100 text-xs">8. 운영 K8s 클러스터 배포</h5>
                    <span className="text-[10px] text-emerald-400 font-mono">Production Serving</span>
                  </div>
                </div>
                <Badge className="bg-emerald-600 text-white text-[10px] font-semibold">
                  배포 성공
                </Badge>
              </div>
              <div className="p-2 rounded bg-[#09090b] border border-white/[0.08] text-[11px] space-y-1 font-mono">
                <div className="text-zinc-300">클러스터: k8s-prod-seoul (v1.29)</div>
                <div className="text-emerald-400 font-semibold">Pod: 4 / 4 Active Serving</div>
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                <span>무중단 롤링 업데이트</span>
                <span className="text-emerald-400 font-semibold">HTTP 200 OK</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
