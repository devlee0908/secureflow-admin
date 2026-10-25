import React, { useMemo } from 'react';
import { Project, ScanRun, Finding, DeploymentReview, SecurityPolicy } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  GitBranch,
  GitPullRequest,
  GitCommit,
  Scan,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  User,
  Server,
  Rocket,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Loader2,
  Maximize2,
} from 'lucide-react';

interface ProjectPipelineFlowChartProps {
  project: Project;
  latestScan?: ScanRun;
  findings: Finding[];
  review?: DeploymentReview;
  policy: SecurityPolicy;
  onTriggerScan?: (projectId: string) => void;
  onNavigateFindings?: (filterState?: any) => void;
  onNavigateScans?: (scanId?: string) => void;
  onNavigateReviews?: (reviewId?: string) => void;
  onOpenCanvas?: () => void;
}

export const ProjectPipelineFlowChart: React.FC<ProjectPipelineFlowChartProps> = ({
  project,
  latestScan,
  findings,
  review,
  policy,
  onTriggerScan,
  onNavigateFindings,
  onNavigateScans,
  onNavigateReviews,
  onOpenCanvas,
}) => {
  // 1. Authors & Branch info
  const triggerType = latestScan?.trigger || 'Push';
  const authorName =
    triggerType === 'PR/MR' && review?.requester
      ? review.requester
      : project.owner;
  const branchName = latestScan?.branch || project.defaultBranch;
  const commitId = latestScan?.commitId || (project.id === 'PRJ-AGENTGATE' ? 'e81a3d9' : '최초 등록');
  const eventTime = latestScan?.startedAt || project.createdAt;

  // 2. Finding counts
  const critCount = findings.filter(
    (f) =>
      f.severity === '치명적' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  const highCount = findings.filter(
    (f) =>
      f.severity === '높음' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  const medCount = findings.filter(
    (f) =>
      f.severity === '중간' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  // 3. Stage 1: Git Event Status
  const stage1 = {
    title: 'Git 이벤트',
    type: triggerType,
    author: authorName,
    branch: branchName,
    commit: commitId,
    time: eventTime,
    isComplete: true,
  };

  // 4. Stage 2: Security Scan Status
  const isScanning = latestScan?.status === '실행 중' || latestScan?.status === '대기';
  const isScanDone = latestScan?.status === '완료';
  const isScanFailed = latestScan?.status === '실패';
  const stage2 = {
    title: 'CI/CD 보안점검',
    status: latestScan ? latestScan.status : '미실행',
    duration: latestScan?.durationSeconds,
    findingsCount: latestScan?.findingsCount ?? findings.length,
    isScanning,
    isComplete: isScanDone,
    isFailed: isScanFailed,
  };

  // 5. Stage 3: Security Policy Gate Status
  const verdict = review?.securityVerdict || (critCount > 0 ? '차단' : highCount >= policy.highThresholdForBlock ? '차단' : medCount >= policy.mediumThresholdForReview ? '검토 필요' : isScanDone ? '통과' : '미점검');
  const isGateBlocked = verdict === '차단';
  const isGateReview = verdict === '검토 필요';
  const isGatePassed = verdict === '통과';
  const stage3 = {
    title: '보안 게이트 판정',
    verdict,
    critCount,
    highCount,
    medCount,
    isBlocked: isGateBlocked,
    isReview: isGateReview,
    isPassed: isGatePassed,
    isPending: verdict === '미점검',
  };

  // 6. Stage 4: Deployment Review Status
  const isCommitMatch = review
    ? review.requestCommitId === review.scanCommitId
    : true;
  const approvalStatus = review ? review.approvalStatus : '대기';
  const stage4 = {
    title: '배포 심사 승인',
    targetEnv: review?.targetEnvironment || '운영',
    approvalStatus,
    reviewer: review?.reviewer,
    comment: review?.reviewComment,
    isCommitMatch,
    isApproved: approvalStatus === '승인',
    isRejected: approvalStatus === '반려',
    isWaiting: approvalStatus === '대기',
  };

  // 7. Stage 5: Final Deployment Status
  let finalDeployStatus: '배포 완료' | '배포 차단' | '승인 대기' | '점검 대기';
  let finalDeployReason = '';

  if (!latestScan) {
    finalDeployStatus = '점검 대기';
    finalDeployReason = '최초 소스코드 전체 점검(Full Baseline Scan) 미실행';
  } else if (isGateBlocked || stage4.isRejected || !isCommitMatch) {
    finalDeployStatus = '배포 차단';
    finalDeployReason = !isCommitMatch
      ? '커밋 불일치로 배포 차단'
      : isGateBlocked
      ? '치명적/높음 결함으로 인한 보안 게이트 차단'
      : '심사관 반려로 배포 중단';
  } else if (isScanning) {
    finalDeployStatus = '점검 대기';
    finalDeployReason = '컨테이너 보안 점검 진행 중';
  } else if (stage4.isApproved && isGatePassed) {
    finalDeployStatus = '배포 완료';
    finalDeployReason = `${stage4.targetEnv} 환경 정상 배포 반영 완료`;
  } else {
    finalDeployStatus = '승인 대기';
    finalDeployReason = '보안 관리자 최종 심사 대기 중';
  }

  // 8. Progress summary text
  const currentStepNumber = !latestScan
    ? 1
    : isScanning
    ? 2
    : isGateBlocked
    ? 3
    : stage4.isApproved
    ? 5
    : 4;

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/60 p-4 sm:p-5 space-y-4 shadow-xs">
      {/* 1. Header Summary Card: Who / Branch / PR or Push / Current Stage */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/80 pb-3.5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-xs text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              DevSecOps 파이프라인 진행 상태 흐름도
            </span>
            <Badge
              variant="outline"
              className={
                triggerType === 'PR/MR'
                  ? 'border-purple-300 bg-purple-50 text-purple-700 font-bold'
                  : triggerType === 'Push'
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 font-bold'
                  : 'border-indigo-300 bg-indigo-50 text-indigo-700'
              }
            >
              {triggerType === 'PR/MR' ? '🔀 Pull/Merge Request' : triggerType === 'Push' ? '⚡ Direct Push' : '🛠️ 수동 실행'}
            </Badge>
            <span className="text-[11px] text-slate-400 font-mono">
              Commit: <strong className="text-slate-700">@{commitId}</strong>
            </span>
          </div>

          {/* Core Sentence Answering User Question */}
          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-bold text-slate-900">{authorName}</span>님이{' '}
            <code className="px-1.5 py-0.5 rounded bg-indigo-100/80 text-indigo-900 font-mono font-semibold text-[11px]">
              {branchName}
            </code>{' '}
            브랜치로 <strong className="text-indigo-700">{triggerType}</strong>를 실행하였으며, 현재{' '}
            <strong className="text-slate-900">
              {currentStepNumber}단계 [{currentStepNumber === 2 ? '보안점검' : currentStepNumber === 3 ? '게이트 평가' : currentStepNumber === 4 ? '배포 심사' : '배포 완료'}]
            </strong>
            에 위치합니다.
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onOpenCanvas && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenCanvas}
              className="h-8 text-xs border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50 font-semibold gap-1.5 shadow-2xs"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              대화면 캔버스 열기
            </Button>
          )}

          {onTriggerScan && (
            <Button
              size="sm"
              onClick={() => onTriggerScan(project.id)}
              disabled={isScanning}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 shadow-2xs"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  점검 중...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  파이프라인 재실행
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Visual 5-Stage Interactive Flowchart Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
        {/* Node 1: Git Event */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col justify-between space-y-2 relative transition-all hover:border-indigo-300">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Step 1 · 소스 이벤트
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              {triggerType === 'PR/MR' ? (
                <GitPullRequest className="w-4 h-4 text-purple-600 shrink-0" />
              ) : (
                <GitBranch className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="truncate">{triggerType === 'PR/MR' ? 'PR/MR 생성' : 'Git Push'}</span>
            </div>
          </div>

          <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">작성자</span>
              <span className="font-semibold text-slate-800 truncate">{authorName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">브랜치</span>
              <span className="font-mono text-indigo-700 font-semibold truncate max-w-[90px]">
                {branchName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">커밋</span>
              <span className="font-mono text-slate-700">{commitId}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
            <span>{eventTime.slice(5, 16)}</span>
            <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-200 h-4 px-1 font-bold">
              완료
            </Badge>
          </div>
        </div>

        {/* Node 2: Security Scan Pipeline */}
        <div className={`p-3 rounded-xl border bg-white shadow-2xs flex flex-col justify-between space-y-2 relative transition-all ${
          isScanning
            ? 'border-indigo-400 ring-2 ring-indigo-200/50 bg-indigo-50/20'
            : isScanFailed
            ? 'border-rose-300'
            : 'border-slate-200 hover:border-indigo-300'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Step 2 · 보안점검
              </span>
              <span className={`w-2 h-2 rounded-full ${
                isScanning ? 'bg-indigo-500 animate-ping' : isScanFailed ? 'bg-rose-500' : isScanDone ? 'bg-emerald-500' : 'bg-slate-300'
              }`} />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <Scan className={`w-4 h-4 shrink-0 ${isScanning ? 'text-indigo-600 animate-spin' : isScanFailed ? 'text-rose-600' : 'text-indigo-600'}`} />
              <span className="truncate">SAST/SCA/Secret/IaC</span>
            </div>
          </div>

          <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">러너 상태</span>
              <span className={`font-semibold ${isScanning ? 'text-indigo-600 font-bold' : isScanFailed ? 'text-rose-600' : 'text-slate-800'}`}>
                {stage2.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">소요 시간</span>
              <span className="font-mono text-slate-700">{stage2.duration ? `${stage2.duration}초` : '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">검출 결함</span>
              <span className={`font-bold font-mono ${stage2.findingsCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {stage2.findingsCount}건
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
            <span className="text-slate-400">4대 엔진 동시 점검</span>
            <StatusBadge status={stage2.status} size="sm" />
          </div>
        </div>

        {/* Node 3: Policy Gate */}
        <div className={`p-3 rounded-xl border bg-white shadow-2xs flex flex-col justify-between space-y-2 relative transition-all ${
          isGateBlocked
            ? 'border-rose-300 bg-rose-50/20'
            : isGateReview
            ? 'border-amber-300 bg-amber-50/20'
            : isGatePassed
            ? 'border-emerald-300 bg-emerald-50/20'
            : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Step 3 · 정책 게이트
              </span>
              <span className={`w-2 h-2 rounded-full ${
                isGateBlocked ? 'bg-rose-500' : isGateReview ? 'bg-amber-500' : isGatePassed ? 'bg-emerald-500' : 'bg-slate-300'
              }`} />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              {isGateBlocked ? (
                <ShieldX className="w-4 h-4 text-rose-600 shrink-0" />
              ) : isGateReview ? (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="truncate">게이트 자동 평가</span>
            </div>
          </div>

          <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">치명적(Crit)</span>
              <span className={`font-mono font-bold ${critCount > 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                {critCount}건
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">높음(High)</span>
              <span className={`font-mono font-bold ${highCount > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                {highCount}건
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">중간(Med)</span>
              <span className="font-mono text-slate-700">{medCount}건</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
            <span className="text-slate-400">판정 결과</span>
            <StatusBadge status={verdict} size="sm" />
          </div>
        </div>

        {/* Node 4: Deployment Review */}
        <div className={`p-3 rounded-xl border bg-white shadow-2xs flex flex-col justify-between space-y-2 relative transition-all ${
          stage4.isApproved
            ? 'border-emerald-300 bg-emerald-50/20'
            : stage4.isRejected
            ? 'border-rose-300 bg-rose-50/20'
            : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Step 4 · 배포 심사
              </span>
              <span className={`w-2 h-2 rounded-full ${
                stage4.isApproved ? 'bg-emerald-500' : stage4.isRejected ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              <FileCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="truncate">{stage4.targetEnv} 배포 승인</span>
            </div>
          </div>

          <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg text-slate-600">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">커밋 일치</span>
              <span className={`font-semibold ${isCommitMatch ? 'text-emerald-700' : 'text-rose-700 font-bold'}`}>
                {isCommitMatch ? '✅ 일치' : '❌ 불일치'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px]">심사관</span>
              <span className="truncate max-w-[85px] text-slate-800 font-medium">
                {stage4.reviewer || '미지정'}
              </span>
            </div>
            <div className="truncate text-[10px] text-slate-500 italic">
              "{stage4.comment || '심사 의견 대기'}"
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
            <span className="text-slate-400">승인 상태</span>
            <StatusBadge status={stage4.approvalStatus} size="sm" />
          </div>
        </div>

        {/* Node 5: Final Production Deployment */}
        <div className={`p-3 rounded-xl border bg-white shadow-2xs flex flex-col justify-between space-y-2 relative transition-all ${
          finalDeployStatus === '배포 완료'
            ? 'border-emerald-400 bg-emerald-50/40 ring-2 ring-emerald-200/50'
            : finalDeployStatus === '배포 차단'
            ? 'border-rose-400 bg-rose-50/40'
            : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Step 5 · 배포 반영
              </span>
              <span className={`w-2 h-2 rounded-full ${
                finalDeployStatus === '배포 완료' ? 'bg-emerald-500' : finalDeployStatus === '배포 차단' ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
            </div>
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
              {finalDeployStatus === '배포 완료' ? (
                <Rocket className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : finalDeployStatus === '배포 차단' ? (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="truncate">{finalDeployStatus}</span>
            </div>
          </div>

          <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-lg text-slate-600">
            <div className="text-[10px] text-slate-400">배포 인프라 반영 결과</div>
            <div className={`font-semibold text-xs leading-snug ${
              finalDeployStatus === '배포 완료'
                ? 'text-emerald-700 font-bold'
                : finalDeployStatus === '배포 차단'
                ? 'text-rose-700 font-bold'
                : 'text-amber-700'
            }`}>
              {finalDeployReason}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100">
            <span className="text-slate-400">환경</span>
            <Badge
              variant="outline"
              className={
                finalDeployStatus === '배포 완료'
                  ? 'border-emerald-300 bg-emerald-100 text-emerald-800 font-bold'
                  : finalDeployStatus === '배포 차단'
                  ? 'border-rose-300 bg-rose-100 text-rose-800 font-bold'
                  : 'border-amber-300 bg-amber-100 text-amber-800'
              }
            >
              {stage4.targetEnv}
            </Badge>
          </div>
        </div>
      </div>

      {/* 3. Detailed Stage Callout Footnote */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-100/70 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          {finalDeployStatus === '배포 완료' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : finalDeployStatus === '배포 차단' ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            {finalDeployStatus === '배포 완료'
              ? '보안 게이트를 모두 통과하여 실제 운영 인프라에 배포가 완료된 상태입니다.'
              : finalDeployStatus === '배포 차단'
              ? '보안 정책(치명적/높음 결함 또는 커밋 불일치)으로 인해 배포가 자동으로 차단되었습니다. 코드 조치가 선행되어야 합니다.'
              : '현재 보안 검토 및 담당자 승인 대기 중이며, 통과 시 배포가 재개됩니다.'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onNavigateFindings && findings.length > 0 && (
            <button
              onClick={() => onNavigateFindings({ projectId: project.id })}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
            >
              결함 {findings.length}건 바로보기
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
