import React from 'react';
import { SecurityPolicy } from '@/types';
import { PipelineRunSample } from './PipelineCanvasModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  GitBranch,
  GitPullRequest,
  Scan,
  ShieldAlert,
  FileCheck2,
  Server,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
  Code2,
  Package,
  KeyRound,
  FileCode,
  Undo2,
} from 'lucide-react';

interface StandardPipelineTracksProps {
  visibleRuns: PipelineRunSample[];
  activeRun: PipelineRunSample;
  selectedNodeId: string;
  simulationStage: number | null;
  activeScannerTool: string | null;
  toolScanProgress: {
    sast: 'waiting' | 'running' | 'completed';
    sca: 'waiting' | 'running' | 'completed';
    secret: 'waiting' | 'running' | 'completed';
    iac: 'waiting' | 'running' | 'completed';
  };
  policy: SecurityPolicy;
  onSelectRun: (runId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenFixModal: () => void;
  onOpenOverrideModal: () => void;
  onSwitchEnvironment: (env: '개발' | '검증' | '운영') => void;
  onRollback: () => void;
  onRetryScanner: (tool: 'sast' | 'sca' | 'secret' | 'iac') => void;
  onOpenPrChecksModal?: () => void;
}

export const StandardPipelineTracks: React.FC<StandardPipelineTracksProps> = ({
  visibleRuns,
  activeRun,
  selectedNodeId,
  simulationStage,
  activeScannerTool,
  toolScanProgress,
  policy,
  onSelectRun,
  onSelectNode,
  onOpenFixModal,
  onOpenOverrideModal,
  onSwitchEnvironment,
  onRollback,
  onRetryScanner,
  onOpenPrChecksModal,
}) => {
  const nodePositions = {
    'node-trigger': { x: 50, width: 320 },
    'node-scanners': { x: 440, width: 330 },
    'node-policy': { x: 850, width: 320 },
    'node-review': { x: 1250, width: 320 },
    'node-deploy': { x: 1650, width: 320 },
  };

  const totalHeight = Math.max(visibleRuns.length * 440 + 80, 800);

  return (
    <div className="relative" style={{ width: '2050px', height: `${totalHeight}px` }}>
      {/* SVG Connecting Cables for all visible tracks */}
      <svg
        className="absolute top-0 left-0 overflow-visible pointer-events-none z-10"
        style={{ width: '2200px', height: `${totalHeight}px` }}
      >
        <defs>
          <filter id="glow-emerald-std" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-indigo-std" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-amber-std" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-rose-std" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-purple-std" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {visibleRuns.map((r, runIndex) => {
          const isSelectedRun = r.id === activeRun.id;
          const nodeY = runIndex * 440 + 30 + 65;
          const cableY = nodeY + 140;

          const isRunScannerRunning =
            (isSelectedRun && simulationStage === 2) || r.scanStatus === 'running';
          const isRunScannerDone =
            (isSelectedRun && simulationStage !== null && simulationStage >= 3) ||
            r.scanStatus === 'completed';
          const isRunScannerFailed = r.scanStatus === 'failed';

          const isRunGatePassed =
            isSelectedRun && simulationStage !== null
              ? simulationStage >= 3 && r.gateStatus === 'passed'
              : r.gateStatus === 'passed';
          const isRunGateReview = r.gateStatus === 'review';
          const isRunGateBlocked = r.gateStatus === 'blocked';
          const isRunGatePending =
            isSelectedRun && simulationStage !== null
              ? simulationStage < 3
              : r.gateStatus === 'pending' || r.currentStage <= 2;

          const isRunReviewApproved =
            isSelectedRun && simulationStage !== null
              ? simulationStage >= 4 && r.reviewStatus === 'approved'
              : r.reviewStatus === 'approved';
          const isRunReviewPending = r.reviewStatus === 'pending_review';
          const isRunReviewRejected = r.reviewStatus === 'rejected';
          const isRunReviewNotReached =
            !isRunReviewApproved && !isRunReviewPending && !isRunReviewRejected;

          const isRunDeployActive =
            isSelectedRun && simulationStage !== null
              ? simulationStage === 5 || r.deployStatus === 'deployed'
              : r.deployStatus === 'deployed';
          const isRunDeployBlocked = r.deployStatus === 'blocked';
          const isRunOverridden = !!r.isOverridden;

          return (
            <g key={`cables-${r.id}`}>
              {/* Cable 1: Git Trigger ➔ Security Scanners */}
              <path
                d={`M 370 ${cableY} L 440 ${cableY}`}
                fill="none"
                stroke={
                  (isSelectedRun && (simulationStage === 1 || isRunScannerRunning)) ||
                  isRunScannerRunning
                    ? '#6366f1'
                    : isRunScannerFailed
                    ? '#f43f5e'
                    : '#10b981'
                }
                strokeWidth={
                  (isSelectedRun && (simulationStage === 1 || isRunScannerRunning)) ||
                  isRunScannerRunning
                    ? '3.5'
                    : '2.5'
                }
                strokeDasharray={
                  (isSelectedRun && (simulationStage === 1 || isRunScannerRunning)) ||
                  isRunScannerRunning
                    ? '6,6'
                    : 'none'
                }
                className={
                  (isSelectedRun && (simulationStage === 1 || isRunScannerRunning)) ||
                  isRunScannerRunning
                    ? 'animate-cable-dash'
                    : ''
                }
                filter={
                  (isSelectedRun && (simulationStage === 1 || isRunScannerRunning)) ||
                  isRunScannerRunning
                    ? 'url(#glow-indigo-std)'
                    : 'url(#glow-emerald-std)'
                }
              />

              {/* Cable 2: Security Scanners ➔ Policy Gate */}
              <path
                d={`M 770 ${cableY} L 850 ${cableY}`}
                fill="none"
                stroke={
                  isSelectedRun && simulationStage === 2
                    ? '#6366f1'
                    : isRunGatePending
                    ? '#334155'
                    : isRunGatePassed
                    ? '#10b981'
                    : isRunGateReview
                    ? '#f59e0b'
                    : '#f43f5e'
                }
                strokeWidth={
                  isSelectedRun && simulationStage === 2
                    ? '3.5'
                    : isRunGatePending
                    ? '2'
                    : '2.5'
                }
                strokeDasharray={
                  isSelectedRun && simulationStage === 2
                    ? '6,6'
                    : isRunGatePending
                    ? '4,4'
                    : 'none'
                }
                className={isSelectedRun && simulationStage === 2 ? 'animate-cable-dash' : ''}
                filter={
                  isSelectedRun && simulationStage === 2
                    ? 'url(#glow-indigo-std)'
                    : isRunGatePassed
                    ? 'url(#glow-emerald-std)'
                    : isRunGateReview
                    ? 'url(#glow-amber-std)'
                    : isRunGateBlocked
                    ? 'url(#glow-rose-std)'
                    : 'none'
                }
              />

              {/* Cable 3: Policy Gate ➔ Deployment Review */}
              <path
                d={`M 1170 ${cableY} L 1250 ${cableY}`}
                fill="none"
                stroke={
                  isRunOverridden
                    ? '#c084fc'
                    : isSelectedRun && simulationStage === 3 && r.critCount === 0
                    ? '#6366f1'
                    : isRunReviewNotReached
                    ? '#334155'
                    : isRunReviewPending
                    ? '#f59e0b'
                    : isRunReviewApproved
                    ? '#10b981'
                    : '#f43f5e'
                }
                strokeWidth={
                  isRunOverridden || (isSelectedRun && simulationStage === 3)
                    ? '3.5'
                    : isRunReviewNotReached
                    ? '2'
                    : '2.5'
                }
                strokeDasharray={
                  isRunOverridden || (isSelectedRun && simulationStage === 3)
                    ? '6,6'
                    : isRunReviewNotReached
                    ? '4,4'
                    : 'none'
                }
                className={
                  isRunOverridden || (isSelectedRun && simulationStage === 3)
                    ? 'animate-cable-dash'
                    : ''
                }
                filter={
                  isRunOverridden
                    ? 'url(#glow-purple-std)'
                    : isSelectedRun && simulationStage === 3
                    ? 'url(#glow-indigo-std)'
                    : isRunReviewPending
                    ? 'url(#glow-amber-std)'
                    : isRunReviewApproved
                    ? 'url(#glow-emerald-std)'
                    : 'none'
                }
              />

              {/* Cable 4: Deployment Review ➔ Prod Deploy */}
              <path
                d={`M 1570 ${cableY} L 1650 ${cableY}`}
                fill="none"
                stroke={
                  isRunDeployActive
                    ? '#10b981'
                    : isRunDeployBlocked
                    ? '#f43f5e'
                    : '#334155'
                }
                strokeWidth={isRunDeployActive ? '3' : '2'}
                strokeDasharray={isRunDeployActive ? 'none' : '4,4'}
                filter={isRunDeployActive ? 'url(#glow-emerald-std)' : 'none'}
              />
            </g>
          );
        })}
      </svg>

      {/* Condition Badges on Cable 3 for all tracks */}
      {visibleRuns.map((r, runIndex) => {
        const nodeY = runIndex * 440 + 30 + 65;
        const cableY = nodeY + 140;

        const isRunGateBlocked = r.gateStatus === 'blocked';
        const isRunReviewPending = r.reviewStatus === 'pending_review';
        const isRunReviewApproved = r.reviewStatus === 'approved';
        const isRunReviewRejected = r.reviewStatus === 'rejected';
        const isRunOverridden = !!r.isOverridden;

        return (
          <div
            key={`badge-${r.id}`}
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: '1210px', top: `${cableY}px` }}
          >
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                isRunOverridden
                  ? 'bg-fuchsia-950/90 border border-fuchsia-500 text-fuchsia-300'
                  : isRunGateBlocked
                  ? 'bg-rose-950/90 border border-rose-500 text-rose-300'
                  : isRunReviewPending
                  ? 'bg-amber-950/90 border border-amber-600 text-amber-300'
                  : isRunReviewApproved
                  ? 'bg-emerald-950/90 border border-emerald-600 text-emerald-300'
                  : isRunReviewRejected
                  ? 'bg-rose-950/90 border border-rose-600 text-rose-300'
                  : 'bg-slate-900 border border-slate-800 text-slate-500'
              }`}
            >
              {isRunOverridden
                ? '🚨 CISO 예외 우회 통과'
                : isRunGateBlocked
                ? '🛑 정책 차단 (진행 중단)'
                : isRunReviewPending
                ? '수동 심사 대기'
                : isRunReviewApproved
                ? '승인 통과'
                : isRunReviewRejected
                ? '심사 반려 (중단)'
                : '대기'}
            </span>
          </div>
        );
      })}

      {/* Track Swimlane Backgrounds & 5 Stage Nodes for all tracks */}
      {visibleRuns.map((r, runIndex) => {
        const trackTop = runIndex * 440 + 30;
        const nodeY = trackTop + 65;
        const isSelectedRun = r.id === activeRun.id;

        const isRunScannerRunning =
          (isSelectedRun && simulationStage === 2) || r.scanStatus === 'running';
        const isRunScannerDone =
          (isSelectedRun && simulationStage !== null && simulationStage >= 3) ||
          r.scanStatus === 'completed';
        const isRunScannerFailed = r.scanStatus === 'failed';
        const isRunScannerPending =
          !isRunScannerRunning && !isRunScannerDone && !isRunScannerFailed;

        const isRunGatePassed =
          isSelectedRun && simulationStage !== null
            ? simulationStage >= 3 && r.gateStatus === 'passed'
            : r.gateStatus === 'passed';
        const isRunGateReview = r.gateStatus === 'review';
        const isRunGateBlocked = r.gateStatus === 'blocked';
        const isRunGatePending =
          isSelectedRun && simulationStage !== null
            ? simulationStage < 3
            : r.gateStatus === 'pending' || r.currentStage <= 2;

        const isRunReviewApproved =
          isSelectedRun && simulationStage !== null
            ? simulationStage >= 4 && r.reviewStatus === 'approved'
            : r.reviewStatus === 'approved';
        const isRunReviewPending = r.reviewStatus === 'pending_review';
        const isRunReviewRejected = r.reviewStatus === 'rejected';
        const isRunReviewNotReached =
          !isRunReviewApproved && !isRunReviewPending && !isRunReviewRejected;

        const isRunDeployActive =
          isSelectedRun && simulationStage !== null
            ? simulationStage === 5 || r.deployStatus === 'deployed'
            : r.deployStatus === 'deployed';
        const isRunDeployBlocked = r.deployStatus === 'blocked';
        const isRunDeployPending = !isRunDeployActive && !isRunDeployBlocked;

        const isRunOverridden = !!r.isOverridden;
        const isRunCanaryFailed = !!r.canaryFailed;
        const isRunRolledBack = !!r.isRolledBack;

        return (
          <React.Fragment key={r.id}>
            {/* Swimlane Track Container */}
            <div
              className={cn(
                'absolute rounded-xl border transition-all overflow-hidden pointer-events-none',
                isSelectedRun
                  ? 'bg-[#0f0f11]/85 border-white/[0.18] ring-1 ring-white/[0.08]'
                  : 'bg-[#0f0f11]/45 border-white/[0.08] hover:border-white/[0.14]'
              )}
              style={{
                left: '30px',
                top: `${trackTop}px`,
                width: '1960px',
                height: '380px',
              }}
            >
              {/* Track Header */}
              <div className="h-12 px-5 border-b border-white/[0.08] bg-[#141417]/90 flex items-center justify-between pointer-events-auto">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold font-mono border',
                      isSelectedRun
                        ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                        : 'bg-zinc-900 border-white/[0.1] text-zinc-300'
                    )}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    TRACK {runIndex + 1}
                  </span>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full bg-zinc-800 border border-white/[0.12] text-zinc-100 font-semibold flex items-center justify-center text-[10px]"
                    >
                      {r.author[0]}
                    </div>
                    <span className="font-semibold text-zinc-100 text-xs">{r.author}</span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      ({r.authorRole} · {r.department})
                    </span>
                  </div>
                  <span className="text-zinc-700">|</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-300 bg-[#09090b] px-2 py-0.5 rounded border border-white/[0.08]">
                      {r.trigger === 'PR/MR' ? `PR #${r.prNumber}` : 'Push'}
                    </span>
                    <span className="text-xs font-mono font-semibold text-zinc-100">
                      {r.branch}
                    </span>
                    <span className="text-[11px] font-mono text-zinc-400">
                      @{r.commitId}
                    </span>
                    <span className="text-[11px] text-zinc-400 italic truncate max-w-[280px]">
                      "{r.commitMessage}"
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {r.deployStatus === 'deployed' && (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[11px] font-semibold gap-1 px-2.5 py-0.5"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      배포 완료 (Prod Active)
                    </Badge>
                  )}
                  {r.reviewStatus === 'pending_review' && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-300 bg-amber-500/10 text-[11px] font-semibold gap-1 px-2.5 py-0.5"
                    >
                      <Clock className="w-3 h-3 text-amber-400" />
                      배포 심사 대기 중
                    </Badge>
                  )}
                  {r.reviewStatus === 'rejected' && (
                    <Badge
                      variant="outline"
                      className="border-rose-500/40 text-rose-300 bg-rose-500/10 text-[11px] font-semibold gap-1 px-2.5 py-0.5"
                    >
                      <XCircle className="w-3 h-3 text-rose-400" />
                      심사 반려
                    </Badge>
                  )}
                  {r.gateStatus === 'blocked' && (
                    <Badge
                      variant="outline"
                      className="border-rose-500/40 text-rose-300 bg-rose-500/10 text-[11px] font-semibold gap-1 px-2.5 py-0.5"
                    >
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      정책 게이트 차단
                    </Badge>
                  )}
                  {r.scanStatus === 'running' && (
                    <Badge
                      variant="outline"
                      className="border-white/[0.15] text-zinc-200 bg-white/[0.06] text-[11px] font-semibold gap-1 px-2.5 py-0.5"
                    >
                      <Loader2 className="w-3 h-3 animate-spin text-zinc-300" />
                      보안점검 진행 중
                    </Badge>
                  )}
                  {r.currentStage === 1 && (
                    <Badge
                      variant="outline"
                      className="border-white/[0.1] text-zinc-400 bg-zinc-900 text-[11px] font-medium gap-1 px-2.5 py-0.5"
                    >
                      <Clock className="w-3 h-3 text-zinc-500" />
                      점검 큐 대기
                    </Badge>
                  )}

                  <button
                    onClick={() => onSelectRun(r.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border cursor-pointer',
                      isSelectedRun
                        ? 'bg-zinc-100 text-zinc-950 border-zinc-100'
                        : 'bg-zinc-900 text-zinc-300 hover:text-white border-white/[0.1] hover:bg-zinc-800'
                    )}
                  >
                    {isSelectedRun ? '선택됨 (인스펙터 연동)' : '이 트랙 포커스'}
                  </button>
                </div>
              </div>
            </div>

            {/* NODE 1: GIT EVENT TRIGGER (Step 1) */}
            <div
              onClick={() => {
                onSelectRun(r.id);
                onSelectNode('node-trigger');
              }}
              className={`workflow-node absolute rounded-xl border transition-all duration-200 cursor-pointer shadow-lg ${
                isSelectedRun && selectedNodeId === 'node-trigger'
                  ? 'border-emerald-400 bg-[#141417] ring-2 ring-emerald-500/20'
                  : 'border-emerald-500/40 bg-[#141417]/95 hover:border-emerald-400/80'
              }`}
              style={{
                left: `${nodePositions['node-trigger'].x}px`,
                top: `${nodeY}px`,
                width: `${nodePositions['node-trigger'].width}px`,
                minHeight: '280px',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#09090b]/60 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    {r.trigger === 'PR/MR' ? (
                      <GitPullRequest className="w-3.5 h-3.5" />
                    ) : (
                      <GitBranch className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-zinc-100">1. Git 소스 이벤트</div>
                    <span className="text-[10px] text-emerald-400 font-mono">Trigger Source</span>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold">
                  완료 (Active)
                </Badge>
              </div>

              {/* Author & Commit Body */}
              <div className="p-4 space-y-3 text-xs">
                <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#09090b] border border-white/[0.08]">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/[0.12] text-zinc-100 font-semibold flex items-center justify-center text-xs shrink-0">
                    {r.author[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100 text-xs truncate flex items-center gap-1.5">
                      {r.author}
                      <span className="text-[10px] font-normal text-zinc-400 font-mono truncate">
                        ({r.department})
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono truncate block">
                      {r.authorEmail}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[#09090b]/80 border border-white/[0.08]">
                    <span className="text-zinc-500 text-[10px] block">작업 브랜치</span>
                    <span className="font-mono font-semibold text-zinc-100 truncate block">
                      {r.branch}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#09090b]/80 border border-white/[0.08]">
                    <span className="text-zinc-500 text-[10px] block">커밋 해시</span>
                    <span className="font-mono font-semibold text-zinc-300 block truncate">
                      @{r.commitId}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 italic bg-[#09090b]/60 p-2 rounded-md border border-white/[0.06] line-clamp-2">
                  "{r.commitMessage}"
                </div>

                {r.trigger === 'PR/MR' && onOpenPrChecksModal && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRun(r.id);
                      onOpenPrChecksModal();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all mt-1"
                  >
                    <GitPullRequest className="w-3 h-3 text-emerald-400" />
                    <span>GitHub PR Checks 뷰 (#{r.prNumber || 142})</span>
                  </button>
                )}
              </div>

              <div className="absolute -right-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b]" />
            </div>

            {/* NODE 2: CI/CD SECURITY SCANNER CLUSTER (Step 2) */}
            <div
              onClick={() => {
                onSelectRun(r.id);
                onSelectNode('node-scanners');
              }}
              className={`workflow-node absolute rounded-xl border transition-all duration-200 cursor-pointer shadow-lg ${
                isSelectedRun && selectedNodeId === 'node-scanners'
                  ? 'border-zinc-200 bg-[#141417] ring-2 ring-white/[0.15]'
                  : isRunScannerRunning
                  ? 'border-zinc-400 bg-[#141417]'
                  : isRunScannerDone
                  ? 'border-emerald-500/40 bg-[#141417]/95'
                  : isRunScannerFailed
                  ? 'border-rose-500/60 bg-rose-950/20'
                  : 'border-white/[0.08] bg-[#0f0f11]/60 opacity-60 hover:opacity-90'
              }`}
              style={{
                left: `${nodePositions['node-scanners'].x}px`,
                top: `${nodeY}px`,
                width: `${nodePositions['node-scanners'].width}px`,
                minHeight: '280px',
              }}
            >
              {/* Input Port */}
              <div
                className={`absolute -left-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunScannerRunning
                    ? 'bg-zinc-200 border-[#09090b]'
                    : isRunScannerDone
                    ? 'bg-emerald-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#09090b]/60 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                      isRunScannerRunning
                        ? 'bg-white/[0.1] text-zinc-100 border-white/[0.2]'
                        : isRunScannerDone
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isRunScannerFailed
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    <Scan className={`w-3.5 h-3.5 ${isRunScannerRunning ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isRunScannerPending ? 'text-zinc-400' : 'text-zinc-100'}`}>
                      2. CI/CD 보안점검 엔진
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {isRunScannerPending ? 'Not Started' : 'Runner Cluster'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    isRunScannerRunning
                      ? 'border-white/[0.2] text-zinc-100 bg-white/[0.08] text-[10px] font-semibold'
                      : isRunScannerDone
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold'
                      : isRunScannerFailed
                      ? 'border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px] font-semibold'
                      : 'border-white/[0.08] text-zinc-500 bg-zinc-900 text-[10px] font-medium'
                  }
                >
                  {isRunScannerRunning
                    ? '실행 중'
                    : isRunScannerDone
                    ? '완료 (4종)'
                    : isRunScannerFailed
                    ? '실패'
                    : '진행 전 (대기)'}
                </Badge>
              </div>

              {/* Scanner Sub-engines */}
              <div className="p-3.5 space-y-2 text-xs">
                {isRunScannerPending ? (
                  <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.08] text-center space-y-1">
                    <Clock className="w-5 h-5 mx-auto text-zinc-600" />
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      점검 큐 등록 대기 중
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      이전 소스 이벤트 검증 후 컨테이너 자동 할당
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Live Progress Bar during execution for active simulated run */}
                    {isSelectedRun && isRunScannerRunning && (
                      <div className="space-y-1 p-2 rounded-lg bg-[#09090b] border border-white/[0.12]">
                        <div className="flex items-center justify-between text-[10px] text-zinc-200 font-mono">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                            {activeScannerTool ? `${activeScannerTool.toUpperCase()} 엔진 실시간 분석 중...` : '보안 엔진 병렬 분석 중...'}
                          </span>
                          <span className="font-semibold text-white">
                            {toolScanProgress.sast === 'completed'
                              ? '100%'
                              : toolScanProgress.sca === 'completed'
                              ? '75%'
                              : toolScanProgress.iac === 'completed'
                              ? '50%'
                              : toolScanProgress.secret === 'completed'
                              ? '25%'
                              : '15%'}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-900 border border-white/[0.08] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                            style={{
                              width: `${
                                toolScanProgress.sast === 'completed'
                                  ? 100
                                  : toolScanProgress.sca === 'completed'
                                  ? 75
                                  : toolScanProgress.iac === 'completed'
                                  ? 50
                                  : toolScanProgress.secret === 'completed'
                                  ? 25
                                  : 15
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {/* SAST Tool Card */}
                      <div className={cn(
                        'p-2 rounded-lg border flex flex-col gap-1 transition-all',
                        r.toolFailure === 'sast'
                          ? 'bg-rose-950/30 border-rose-500/60'
                          : isSelectedRun && toolScanProgress.sast === 'running'
                          ? 'bg-white/[0.06] border-white/[0.2]'
                          : 'bg-[#09090b] border-white/[0.08]'
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-zinc-300">
                            <Code2 className="w-3.5 h-3.5 text-zinc-400" />
                            SAST
                          </span>
                          {r.toolFailure === 'sast' ? (
                            <span className="text-[10px] font-mono font-semibold text-rose-400 flex items-center gap-1">
                              504 타임아웃
                            </span>
                          ) : (
                            <span className={`text-[10px] font-mono font-semibold ${r.toolStatuses.sast.count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {r.toolStatuses.sast.count}건
                            </span>
                          )}
                        </div>
                      </div>

                      {/* SCA Tool Card */}
                      <div className="p-2 rounded-lg border flex items-center justify-between transition-all bg-[#09090b] border-white/[0.08]">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Package className="w-3.5 h-3.5 text-zinc-400" />
                          SCA
                        </span>
                        <span className={`text-[10px] font-mono font-semibold ${r.toolStatuses.sca.count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {r.toolStatuses.sca.count}건
                        </span>
                      </div>

                      {/* Secret Tool Card */}
                      <div className="p-2 rounded-lg border flex items-center justify-between transition-all bg-[#09090b] border-white/[0.08]">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                          Secret
                        </span>
                        <span className={`text-[10px] font-mono font-semibold ${r.toolStatuses.secret.count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {r.toolStatuses.secret.count}건
                        </span>
                      </div>

                      {/* IaC Tool Card */}
                      <div className="p-2 rounded-lg border flex items-center justify-between transition-all bg-[#09090b] border-white/[0.08]">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                          IaC
                        </span>
                        <span className={`text-[10px] font-mono font-semibold ${r.toolStatuses.iac.count > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {r.toolStatuses.iac.count}건
                        </span>
                      </div>
                    </div>

                    {/* Supply Chain Security & SBOM Badges */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#09090b] border border-white/[0.08] text-[10px]">
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Sparkles className="w-3 h-3 text-zinc-400" />
                        Cosign: <strong className="text-emerald-400">검증완료</strong>
                      </span>
                      <span className="text-zinc-600">|</span>
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Package className="w-3 h-3 text-zinc-400" />
                        SBOM: <strong className="text-zinc-200 font-mono">CycloneDX</strong>
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.08] text-[11px] text-zinc-400">
                  <span>총 소요시간: <strong className="text-zinc-100 font-mono">{r.scanDuration}초</strong></span>
                  <span className={r.critCount > 0 ? 'text-rose-400 font-semibold font-mono' : 'text-zinc-300 font-mono'}>
                    {isRunScannerPending ? '결함 미탐지' : `총 ${r.critCount + r.highCount + r.medCount}건 발견`}
                  </span>
                </div>
              </div>

              {/* Output Port */}
              <div
                className={`absolute -right-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunScannerRunning
                    ? 'bg-zinc-200 border-[#09090b]'
                    : isRunScannerDone
                    ? 'bg-emerald-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />
            </div>

            {/* NODE 3: POLICY GATE DECISION (Step 3) */}
            <div
              onClick={() => {
                onSelectRun(r.id);
                onSelectNode('node-policy');
              }}
              className={`workflow-node absolute rounded-xl border transition-all duration-200 cursor-pointer shadow-lg ${
                isSelectedRun && selectedNodeId === 'node-policy'
                  ? 'border-amber-400 bg-[#141417] ring-2 ring-amber-500/20'
                  : isRunGatePassed
                  ? 'border-emerald-500/40 bg-[#141417]/95'
                  : isRunGateReview
                  ? 'border-amber-400/60 bg-[#141417]/95'
                  : isRunGateBlocked
                  ? 'border-rose-500/70 bg-rose-950/20'
                  : 'border-white/[0.08] bg-[#0f0f11]/60 opacity-60 hover:opacity-90'
              }`}
              style={{
                left: `${nodePositions['node-policy'].x}px`,
                top: `${nodeY}px`,
                width: `${nodePositions['node-policy'].width}px`,
                minHeight: '280px',
              }}
            >
              {/* Input Port */}
              <div
                className={`absolute -left-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunGatePassed
                    ? 'bg-emerald-500 border-[#09090b]'
                    : isRunGateReview
                    ? 'bg-amber-500 border-[#09090b]'
                    : isRunGateBlocked
                    ? 'bg-rose-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#09090b]/60 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                      isRunGatePassed
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isRunGateReview
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : isRunGateBlocked
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isRunGatePending ? 'text-zinc-400' : 'text-zinc-100'}`}>
                      3. 보안 정책 게이트
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {isRunGatePending ? 'Not Evaluated' : 'Rule Decision'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    isRunOverridden
                      ? 'border-amber-500/50 text-amber-300 bg-amber-500/10 text-[10px] font-semibold'
                      : isRunGatePassed
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold'
                      : isRunGateReview
                      ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] font-semibold'
                      : isRunGateBlocked
                      ? 'border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px] font-semibold'
                      : 'border-white/[0.08] text-zinc-500 bg-zinc-900 text-[10px] font-medium'
                  }
                >
                  {isRunOverridden
                    ? '예외 승인 (Override)'
                    : isRunGatePassed
                    ? '통과 (Pass)'
                    : isRunGateReview
                    ? '검토 필요'
                    : isRunGateBlocked
                    ? '차단 (Block)'
                    : '진행 전 (대기)'}
                </Badge>
              </div>

              {/* Gate Rules Body */}
              <div className="p-4 space-y-3 text-xs">
                {isRunGatePending ? (
                  <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.08] text-center space-y-1">
                    <Clock className="w-5 h-5 mx-auto text-zinc-600" />
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      보안점검 완료 후 자동 평가
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      정책 기준: Critical 0건, High {policy.highThresholdForBlock}건 미만
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 bg-[#09090b] p-2.5 rounded-lg border border-white/[0.08]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">치명적(Critical)</span>
                        <span className={`font-mono font-semibold ${r.critCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {r.critCount}건 {r.critCount > 0 ? '(차단 기준 위반)' : '(0건 정상)'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">높음(High)</span>
                        <span className={`font-mono font-semibold ${r.highCount >= policy.highThresholdForBlock ? 'text-rose-400' : 'text-amber-400'}`}>
                          {r.highCount}건 (기준: {policy.highThresholdForBlock}건)
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">중간(Medium)</span>
                        <span className="font-mono font-semibold text-zinc-300">
                          {r.medCount}건
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-400 leading-snug">
                      * 정책 판정: <strong className={isRunOverridden ? 'text-amber-300' : isRunGateBlocked ? 'text-rose-400' : isRunGateReview ? 'text-amber-300' : 'text-emerald-300'}>
                        {isRunOverridden ? 'CISO 긴급 보안 예외 승인' : isRunGateBlocked ? '배포 차단 (Block)' : isRunGateReview ? '수동 심사 필요' : '클린 통과 (Pass)'}
                      </strong>
                    </div>

                    {isRunGateBlocked && !isRunOverridden && (
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRun(r.id);
                            onOpenFixModal();
                          }}
                          className="h-7 text-[10.5px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1"
                          title="Git Flow 표준: fix/ 브랜치 분기 후 결함 조치 및 재검증 PR"
                        >
                          <GitBranch className="w-3 h-3" />
                          fix/ 조치 브랜치
                        </Button>
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectRun(r.id);
                            onOpenOverrideModal();
                          }}
                          className="h-7 text-[10.5px] bg-rose-600 hover:bg-rose-500 text-white font-semibold gap-1"
                          title="긴급 핫픽스용: CISO 예외 우회 인가"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          CISO 예외승인
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Step 3 -> Step 4 Output Port (Right) */}
              <div
                className={`absolute -right-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunGatePassed
                    ? 'bg-emerald-500 border-[#09090b]'
                    : isRunGateReview
                    ? 'bg-amber-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />
            </div>

            {/* NODE 4: DEPLOYMENT REVIEW & APPROVAL (Step 4) */}
            <div
              onClick={() => {
                onSelectRun(r.id);
                onSelectNode('node-review');
              }}
              className={`workflow-node absolute rounded-xl border transition-all duration-200 cursor-pointer shadow-lg ${
                isSelectedRun && selectedNodeId === 'node-review'
                  ? 'border-zinc-200 bg-[#141417] ring-2 ring-white/[0.15]'
                  : isRunReviewApproved
                  ? 'border-emerald-500/40 bg-[#141417]/95'
                  : isRunReviewPending
                  ? 'border-amber-400/60 bg-[#141417]/95'
                  : isRunReviewRejected
                  ? 'border-rose-500/70 bg-rose-950/20'
                  : 'border-white/[0.08] bg-[#0f0f11]/60 opacity-60 hover:opacity-90'
              }`}
              style={{
                left: `${nodePositions['node-review'].x}px`,
                top: `${nodeY}px`,
                width: `${nodePositions['node-review'].width}px`,
                minHeight: '280px',
              }}
            >
              <div
                className={`absolute -left-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunReviewPending
                    ? 'bg-amber-500 border-[#09090b]'
                    : isRunReviewApproved
                    ? 'bg-emerald-500 border-[#09090b]'
                    : isRunReviewRejected
                    ? 'bg-rose-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#09090b]/60 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                      isRunReviewApproved
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isRunReviewPending
                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                        : isRunReviewRejected
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isRunReviewNotReached ? 'text-zinc-400' : 'text-zinc-100'}`}>
                      4. 배포 심사 및 인가
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {isRunReviewNotReached ? 'Not Reached' : 'Manual Approval'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    isRunReviewApproved
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold'
                      : isRunReviewPending
                      ? 'border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px] font-semibold'
                      : isRunReviewRejected
                      ? 'border-rose-500/40 text-rose-400 bg-rose-500/10 text-[10px] font-semibold'
                      : 'border-white/[0.08] text-zinc-500 bg-zinc-900 text-[10px] font-medium'
                  }
                >
                  {isRunReviewApproved
                    ? '승인 (Approved)'
                    : isRunReviewPending
                    ? '심사 대기'
                    : isRunReviewRejected
                    ? '반려 (Rejected)'
                    : '진행 전 (대기)'}
                </Badge>
              </div>

              {/* Review Body */}
              <div className="p-4 space-y-3 text-xs">
                {isRunReviewNotReached ? (
                  <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.08] text-center space-y-1">
                    <Clock className="w-5 h-5 mx-auto text-zinc-600" />
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      정책 게이트 통과 후 활성화
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      이전 단계가 차단되거나 아직 도달하지 않음
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 bg-[#09090b] p-2.5 rounded-lg border border-white/[0.08] text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">환경</span>
                        <Badge variant="outline" className="text-[10px] font-semibold border-white/[0.15] text-zinc-200">
                          {r.targetEnvironment} 배포
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">커밋 일치</span>
                        <span className="font-semibold text-emerald-400 font-mono">
                          일치 (@{r.commitId})
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">심사위원</span>
                        <span className="text-zinc-200 font-medium truncate max-w-[150px]">
                          {r.reviewer || '보안팀 최수민 팀장'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-400 italic bg-[#09090b]/60 p-2 rounded border border-white/[0.06] truncate">
                      "{r.reviewComment || '심사 진행 중'}"
                    </div>
                  </>
                )}
              </div>

              {/* Right Output Port */}
              <div
                className={`absolute -right-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunReviewApproved
                    ? 'bg-emerald-500 border-[#09090b]'
                    : isRunReviewPending
                    ? 'bg-amber-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />
            </div>

            {/* NODE 5: PRODUCTION DEPLOYMENT TARGET (Step 5) */}
            <div
              onClick={() => {
                onSelectRun(r.id);
                onSelectNode('node-deploy');
              }}
              className={`workflow-node absolute rounded-xl border transition-all duration-200 cursor-pointer shadow-lg ${
                isSelectedRun && selectedNodeId === 'node-deploy'
                  ? 'border-emerald-400 bg-[#141417] ring-2 ring-emerald-500/20'
                  : isRunDeployActive
                  ? 'border-emerald-500/50 bg-[#141417]/95'
                  : isRunDeployBlocked
                  ? 'border-rose-500/40 bg-rose-950/20 opacity-75'
                  : 'border-white/[0.08] bg-[#0f0f11]/60 opacity-60 hover:opacity-90'
              }`}
              style={{
                left: `${nodePositions['node-deploy'].x}px`,
                top: `${nodeY}px`,
                width: `${nodePositions['node-deploy'].width}px`,
                minHeight: '280px',
              }}
            >
              <div
                className={`absolute -left-2 top-[140px] -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                  isRunDeployActive
                    ? 'bg-emerald-500 border-[#09090b]'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              />

              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#09090b]/60 rounded-t-xl">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                      isRunDeployActive
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : isRunDeployBlocked
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : 'bg-zinc-900 text-zinc-500 border-white/[0.08]'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className={`text-xs font-semibold ${isRunDeployPending ? 'text-zinc-400' : 'text-zinc-100'}`}>
                      5. 클러스터 운영 배포
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {isRunDeployActive ? 'Live In Production' : 'Deploy Target'}
                    </span>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className={
                    isRunRolledBack
                      ? 'bg-zinc-800 border-white/[0.2] text-zinc-200 font-semibold text-[10px]'
                      : isRunCanaryFailed
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-semibold text-[10px]'
                      : isRunOverridden
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 font-semibold text-[10px]'
                      : isRunDeployActive
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold'
                      : isRunDeployBlocked
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-400 text-[10px] font-semibold'
                      : 'bg-zinc-900 border border-white/[0.08] text-zinc-400 font-medium text-[10px]'
                  }
                >
                  {isRunRolledBack
                    ? '롤백 완료 (@v2.4.0)'
                    : isRunCanaryFailed
                    ? '카나리 이상 감지'
                    : isRunOverridden
                    ? '예외 배포 완료'
                    : isRunDeployActive
                    ? '배포 완료'
                    : isRunDeployBlocked
                    ? '배포 차단'
                    : '진행 전 (대기)'}
                </Badge>
              </div>

              {/* Deploy Body */}
              <div className="p-4 space-y-3 text-xs">
                {/* Target Environment Switcher */}
                <div className="flex items-center justify-between text-[11px] pb-2 border-b border-white/[0.08]">
                  <span className="text-zinc-400 font-medium">대상 환경:</span>
                  <div className="flex items-center gap-1 bg-[#09090b] p-0.5 rounded-md border border-white/[0.08]">
                    {(['개발', '검증', '운영'] as const).map((env) => (
                      <button
                        key={env}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRun(r.id);
                          onSwitchEnvironment(env);
                        }}
                        className={cn(
                          'px-2 py-0.5 rounded text-[10px] font-semibold transition-all',
                          r.targetEnvironment === env
                            ? 'bg-zinc-100 text-zinc-950'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                        )}
                        title={`클릭하여 ${env} 환경으로 배포 대상 전환`}
                      >
                        {env}
                      </button>
                    ))}
                  </div>
                </div>

                {isRunDeployPending ? (
                  <div className="p-3 rounded-lg bg-[#09090b] border border-white/[0.08] text-center space-y-1">
                    <Clock className="w-5 h-5 mx-auto text-zinc-600" />
                    <span className="text-[11px] text-zinc-400 font-medium block">
                      최종 배포 승인 후 롤링 업데이트
                    </span>
                    <span className="text-[10px] text-zinc-500 block">
                      대상 클러스터: {r.cluster} ({r.namespace})
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 bg-[#09090b] p-2.5 rounded-lg border border-white/[0.08] text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">클러스터</span>
                        <span className="font-mono text-zinc-200">{r.cluster}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">네임스페이스</span>
                        <span className="font-mono text-zinc-200">{r.namespace}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Pod 상태</span>
                        <span className="font-mono text-emerald-400 font-semibold">{r.replicas}</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-zinc-400 leading-snug">
                      {isRunRolledBack ? (
                        <span className="text-zinc-200 font-semibold">
                          카나리 에러 감지로 @v2.4.0 자동 롤백 성공 (정상 서빙 중)
                        </span>
                      ) : isRunCanaryFailed ? (
                        <span className="text-rose-400 font-semibold">
                          카나리 에러율 14.8% 감지 (기준치 초과)
                        </span>
                      ) : isRunOverridden ? (
                        <span className="text-amber-300 font-semibold">
                          CISO 긴급 승인 배포 완료 (24H 패치 SLA)
                        </span>
                      ) : isRunDeployActive ? (
                        <span className="text-emerald-400 font-medium">정상 서비스 서빙 중 (Zero-Downtime)</span>
                      ) : (
                        <span className="text-rose-400 font-medium">보안 정책 위반으로 배포 중단</span>
                      )}
                    </div>

                    {isSelectedRun && isRunCanaryFailed && (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRollback();
                        }}
                        className="w-full mt-1 h-7 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold gap-1"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        이전 버전(@v2.4.0) 롤백 실행
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
