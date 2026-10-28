import React from 'react';
import {
  ShieldCheck,
  FolderGit2,
  ShieldAlert,
  GitPullRequest,
  Zap,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveMenu } from '@/components/layout/Sidebar';

interface ExecutiveHeroCardsProps {
  avgSecurityScore: number;
  registeredProjectsCount: number;
  prodProjectsCount: number;
  devProjectsCount: number;
  unresolvedHighCriticalCount: number;
  overdueCount: number;
  pendingReviewsCount: number;
  autoBlockRate: number;
  mttrHours: number;
  scopeLabel: string;
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const ExecutiveHeroCards: React.FC<ExecutiveHeroCardsProps> = ({
  avgSecurityScore,
  registeredProjectsCount,
  prodProjectsCount,
  devProjectsCount,
  unresolvedHighCriticalCount,
  overdueCount,
  pendingReviewsCount,
  autoBlockRate,
  mttrHours,
  scopeLabel,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Security Posture Index (Vercel Geist Card) */}
      <div
        onClick={() => onNavigate('projects')}
        className="group p-5 rounded-xl cursor-pointer transition-colors border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] hover:border-zinc-300 dark:hover:border-white/[0.16] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">보안 건전성 지수</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">GROUP INDEX</span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-medium flex items-center gap-1">
              +3.2%
              <TrendingUp className="w-2.5 h-2.5" />
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50 font-mono tabular-nums tracking-tight">
                {avgSecurityScore}
              </span>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-mono">/ 100점</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-sans">
              등급: <strong className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">{avgSecurityScore >= 85 ? 'A+ (최우수)' : avgSecurityScore >= 70 ? 'B (양호)' : 'C (위험)'}</strong> · ISMS-P 충족
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">{scopeLabel}</span>
          <span className="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white font-medium flex items-center gap-0.5 transition-colors">
            자세히 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 2. Registered Projects Asset Card (Vercel Geist Card) */}
      <div
        onClick={() => onNavigate('projects')}
        className="group p-5 rounded-xl cursor-pointer transition-colors border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] hover:border-zinc-300 dark:hover:border-white/[0.16] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <FolderGit2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">프로젝트 자산</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">ASSET TELEMETRY</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 font-medium border border-zinc-200/80 dark:border-white/[0.08] flex items-center gap-1">
              5/5 엔진 활성
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50 font-mono tabular-nums tracking-tight">
                {registeredProjectsCount}
              </span>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-sans">개 프로젝트</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-sans">
              운영 <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{prodProjectsCount}</strong> · 개발 <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{devProjectsCount}</strong> 활성 파이프라인
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">전체 자동화 연동</span>
          <span className="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white font-medium flex items-center gap-0.5 transition-colors">
            자산 조회 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 3. Deployment Gate Reviews Card (Vercel Geist Card) */}
      <div
        onClick={() => onNavigate('reviews')}
        className="group p-5 rounded-xl cursor-pointer transition-colors border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] hover:border-zinc-300 dark:hover:border-white/[0.16] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <GitPullRequest className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">배포 통제 심사</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">DEPLOY GATE</span>
              </div>
            </div>
            <span className="text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium border border-amber-500/25">
              차단율 {autoBlockRate}%
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50 font-mono tabular-nums tracking-tight">
                {pendingReviewsCount}
              </span>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-sans">건 승인 대기</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-sans">
              {pendingReviewsCount > 0 ? 'CISO/보안 심사 승인 대기 중' : '모든 PR 보안 통과 완료'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">Zero-Tolerance 가동</span>
          <span className="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white font-medium flex items-center gap-0.5 transition-colors">
            심사하기 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 4. Remediation Speed (MTTR) & High/Critical Findings Card (Vercel Geist Card) */}
      <div
        onClick={() => onNavigate('findings', { severity: 'HIGH_CRITICAL' })}
        className="group p-5 rounded-xl cursor-pointer transition-colors border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] hover:border-zinc-300 dark:hover:border-white/[0.16] flex flex-col justify-between"
      >
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 block">평균 해결(MTTR)</span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">REMEDIATION</span>
              </div>
            </div>
            <span
              className={cn(
                'text-[10px] font-mono tabular-nums px-2 py-0.5 rounded-md font-medium border',
                unresolvedHighCriticalCount > 0
                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                  : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
              )}
            >
              {unresolvedHighCriticalCount > 0 ? `고위험 ${unresolvedHighCriticalCount}건` : '무결점 유지'}
            </span>
          </div>

          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-zinc-950 dark:text-zinc-50 font-mono tabular-nums tracking-tight">
                {mttrHours}
              </span>
              <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 font-sans">시간 (목표 24h)</span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-sans">
              고위험 결함 <strong className={cn('font-mono', unresolvedHighCriticalCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-800 dark:text-zinc-200')}>{unresolvedHighCriticalCount}건</strong> · SLA 초과 <strong className={cn('font-mono', overdueCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-800 dark:text-zinc-200')}>{overdueCount}건</strong>
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[10px]">SLA 목표 24시간 이내</span>
          <span className="text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white font-medium flex items-center gap-0.5 transition-colors">
            조치 큐 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
