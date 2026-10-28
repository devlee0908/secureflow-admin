import React from 'react';
import {
  AlertOctagon,
  GitPullRequest,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Finding, DeploymentReview } from '@/types';
import { SeverityBadge } from '@/components/common/SeverityBadge';
import { SlaCountdownBadge } from '@/components/common/SlaCountdownBadge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { ActiveMenu } from '@/components/layout/Sidebar';

interface UrgentActionQueueProps {
  overdueFindings: Finding[];
  highCriticalFindings: Finding[];
  pendingReviews: DeploymentReview[];
  todayStr: string;
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const UrgentActionQueue: React.FC<UrgentActionQueueProps> = ({
  overdueFindings,
  highCriticalFindings,
  pendingReviews,
  todayStr,
  onNavigate,
}) => {
  const urgentFindingsList = [
    ...overdueFindings,
    ...highCriticalFindings.filter((f) => !overdueFindings.some((o) => o.id === f.id)),
  ].slice(0, 3);

  const displayReviews = pendingReviews.slice(0, 3);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left 6 cols: Urgent Remediation Queue (SLA 위험 결함) */}
      <div className="lg:col-span-6 p-5 sm:p-6 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/80 dark:border-white/[0.08]">
            <div>
              <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                SLA BREACH ALERT
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                긴급 조치 요망 결함 큐 ({urgentFindingsList.length}건)
              </h3>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('findings', { severity: 'HIGH_CRITICAL' })}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-md h-8 px-2.5"
            >
              전체 보기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-2.5 mb-3.5">
            규정된 조치 기한(SLA)이 임박하였거나 만료된 고위험 보안 취약점입니다.
          </p>

          <div className="space-y-2">
            {urgentFindingsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-[#141417] border border-dashed border-zinc-200 dark:border-white/[0.08] rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                현재 긴급 조치가 필요한 치명 결함이 없습니다.
              </div>
            ) : (
              urgentFindingsList.map((f) => (
                <div
                  key={f.id}
                  onClick={() => onNavigate('findings', { findingId: f.id })}
                  className="p-3 rounded-lg border border-zinc-200/80 dark:border-white/[0.06] bg-zinc-50/60 hover:bg-zinc-100/70 dark:bg-[#141417] dark:hover:bg-white/[0.05] hover:border-zinc-300 dark:hover:border-white/[0.14] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <SeverityBadge severity={f.severity} size="sm" />
                      <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                        {f.title}
                      </span>
                    </div>
                    <SlaCountdownBadge
                      dueDate={f.dueDate}
                      status={f.status}
                      severity={f.severity}
                      todayStr={todayStr}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-white/[0.05] pt-1.5">
                    <span className="truncate text-zinc-600 dark:text-zinc-300 font-sans text-xs">
                      {f.projectName} · {f.assignee}
                    </span>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[200px]">
                      {f.filePath}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3.5 border-t border-zinc-100 dark:border-white/[0.06] mt-4 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span>치명적 결함 조치 시 자동 재검증</span>
          {overdueFindings.length > 0 ? (
            <span className="text-rose-600 dark:text-rose-400 font-medium">
              SLA 초과 {overdueFindings.length}건 조치 필요
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              SLA 초과 0건 유지 중
            </span>
          )}
        </div>
      </div>

      {/* Right 6 cols: Live Deployment Review Gate */}
      <div className="lg:col-span-6 p-5 sm:p-6 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-200/80 dark:border-white/[0.08]">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                LIVE GATE REVIEW
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                <GitPullRequest className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                배포 통제 심사 및 승인 대기 ({displayReviews.length}건)
              </h3>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('reviews')}
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] rounded-md h-8 px-2.5"
            >
              전체 보기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-2.5 mb-3.5">
            운영(Prod) 및 스테이징 배포 전 보안 게이트 심사를 대기 중인 PR 목록입니다.
          </p>

          <div className="space-y-2">
            {displayReviews.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-50 dark:bg-[#141417] border border-dashed border-zinc-200 dark:border-white/[0.08] rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                현재 심사 대기 중인 배포 요청이 없습니다.
              </div>
            ) : (
              displayReviews.map((rev) => {
                const isMatch = rev.requestCommitId === rev.scanCommitId;
                return (
                  <div
                    key={rev.id}
                    onClick={() => onNavigate('reviews', { reviewId: rev.id })}
                    className="p-3 rounded-lg border border-zinc-200/80 dark:border-white/[0.06] bg-zinc-50/60 hover:bg-zinc-100/70 dark:bg-[#141417] dark:hover:bg-white/[0.05] hover:border-zinc-300 dark:hover:border-white/[0.14] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-xs text-zinc-900 dark:text-zinc-100 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                          {rev.projectName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/70 text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-300 font-medium">
                          {rev.targetEnvironment}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={rev.securityVerdict} size="sm" />
                        <StatusBadge status={rev.approvalStatus} size="sm" />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 border-t border-zinc-200/60 dark:border-white/[0.05] pt-1.5">
                      <div className="flex items-center gap-2">
                        <span>커밋: @{rev.requestCommitId}</span>
                        <span>·</span>
                        {isMatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> MISMATCH
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-600 dark:text-zinc-300 font-sans text-xs">
                        요청자: {rev.requester}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-3.5 border-t border-zinc-100 dark:border-white/[0.06] mt-4 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span>Zero-Tolerance: 결함 미해결 시 프로덕션 배포 완전 차단</span>
          <button
            onClick={() => onNavigate('projects')}
            className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-medium flex items-center gap-1"
          >
            라이프사이클 캔버스 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
