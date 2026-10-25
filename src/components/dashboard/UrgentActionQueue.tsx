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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 6 cols: Urgent Remediation Queue (SLA 위험 결함) */}
      <div className="lg:col-span-6 p-6 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#121620]/90 backdrop-blur-xl shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/[0.06]">
            <div>
              <div className="text-[10px] font-mono text-rose-500 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                SLA BREACH ALERT
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                <AlertOctagon className="w-4 h-4 text-rose-500" />
                긴급 조치 요망 결함 큐 ({urgentFindingsList.length}건)
              </h3>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('findings', { severity: 'HIGH_CRITICAL' })}
              className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full h-8 font-mono px-3"
            >
              전체 보기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-2 mb-3.5">
            규정된 조치 기한(SLA)이 임박하였거나 만료된 고위험 보안 취약점입니다.
          </p>

          <div className="space-y-2.5">
            {urgentFindingsList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                현재 긴급 조치가 필요한 치명 결함이 없습니다.
              </div>
            ) : (
              urgentFindingsList.map((f) => (
                <div
                  key={f.id}
                  onClick={() => onNavigate('findings', { findingId: f.id })}
                  className="p-3 px-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] hover:border-rose-300 dark:hover:border-rose-500/30 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <SeverityBadge severity={f.severity} size="sm" />
                      <span className="font-semibold text-xs text-slate-900 dark:text-slate-200 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors truncate">
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

                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/[0.04] pt-1.5">
                    <span className="truncate text-slate-700 dark:text-slate-300 font-sans text-xs">
                      {f.projectName} · {f.assignee}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                      {f.filePath}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3.5 border-t border-slate-200/80 dark:border-white/[0.06] mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>치명적 결함 조치 시 자동 재검증</span>
          <span className="text-amber-600 dark:text-amber-400 font-semibold">SLA 초과 0건 유지 중</span>
        </div>
      </div>

      {/* Right 6 cols: Live Deployment Review Gate */}
      <div className="lg:col-span-6 p-6 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#121620]/90 backdrop-blur-xl shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/[0.06]">
            <div>
              <div className="text-[10px] font-mono text-purple-500 uppercase tracking-wider flex items-center gap-1.5 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                LIVE GATE REVIEW
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                <GitPullRequest className="w-4 h-4 text-purple-500" />
                배포 통제 심사 및 승인 대기 ({displayReviews.length}건)
              </h3>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('reviews')}
              className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-full h-8 font-mono px-3"
            >
              전체 보기 <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-2 mb-3.5">
            운영(Prod) 및 스테이징 배포 전 보안 게이트 심사를 대기 중인 PR 목록입니다.
          </p>

          <div className="space-y-2.5">
            {displayReviews.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                현재 심사 대기 중인 배포 요청이 없습니다.
              </div>
            ) : (
              displayReviews.map((rev) => {
                const isMatch = rev.requestCommitId === rev.scanCommitId;
                return (
                  <div
                    key={rev.id}
                    onClick={() => onNavigate('reviews', { reviewId: rev.id })}
                    className="p-3 px-3.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/70 hover:bg-slate-100/90 dark:bg-white/[0.02] dark:hover:bg-white/[0.05] hover:border-purple-300 dark:hover:border-purple-500/30 transition-all cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                          {rev.projectName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-purple-100 text-purple-800 border border-purple-300/60 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30 font-semibold">
                          {rev.targetEnvironment}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={rev.securityVerdict} size="sm" />
                        <StatusBadge status={rev.approvalStatus} size="sm" />
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/[0.04] pt-1.5">
                      <div className="flex items-center gap-2">
                        <span>커밋: @{rev.requestCommitId}</span>
                        <span>·</span>
                        {isMatch ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                          </span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" /> MISMATCH
                          </span>
                        )}
                      </div>
                      <span className="text-slate-700 dark:text-slate-300 font-sans text-xs">
                        요청자: {rev.requester}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="pt-3.5 border-t border-slate-200/80 dark:border-white/[0.06] mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <span>Zero-Tolerance: 결함 미해결 시 프로덕션 배포 완전 차단</span>
          <button
            onClick={() => onNavigate('projects')}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-700 font-semibold flex items-center gap-1"
          >
            라이프사이클 캔버스 <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
