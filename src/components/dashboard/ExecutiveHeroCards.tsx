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
      {/* 1. Frosted Obsidian Glass Card with Golden Aura (Card 1 in reference) */}
      <div
        onClick={() => onNavigate('projects')}
        className="relative group p-5 rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#121620]/90 backdrop-blur-xl shadow-sm dark:shadow-2xl hover:border-amber-400/50 hover:shadow-lg dark:hover:shadow-amber-500/10 flex flex-col justify-between"
      >
        {/* Subtle Ambient Gold Glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-400/10 dark:bg-amber-500/15 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-400/20 transition-all" />

        <div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.1] text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold text-xs shadow-2xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">보안 건전성 지수</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">GROUP INDEX</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold flex items-center gap-1 shadow-2xs">
              +3.2%
              <TrendingUp className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {avgSecurityScore}
              </span>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">/ 100점</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-sans">
              등급: <strong className="text-amber-600 dark:text-amber-400 font-mono">{avgSecurityScore >= 85 ? 'A+ (최우수)' : avgSecurityScore >= 70 ? 'B (보통)' : 'C (위험)'}</strong> · ISMS-P 충족
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] relative z-10">
          <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">{scopeLabel}</span>
          <span className="text-amber-600 dark:text-amber-400 font-mono font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            자세히 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 2. Vibrant Royal Indigo & Violet Gradient Card (Card 2 in reference) */}
      <div
        onClick={() => onNavigate('projects')}
        className="relative group p-5 rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 flex flex-col justify-between"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center font-bold text-xs backdrop-blur-md">
                <FolderGit2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">프로젝트 자산</span>
                <span className="text-[10px] text-indigo-200 font-mono">ASSET TELEMETRY</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1">
              4/4 엔진 <ChevronDown className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {registeredProjectsCount}
              </span>
              <span className="text-xs font-semibold text-indigo-200 font-sans">개 프로젝트</span>
            </div>
            <p className="text-xs text-indigo-100/90 mt-1 font-sans">
              운영 {prodProjectsCount} · 개발 {devProjectsCount} 활성 파이프라인
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] relative z-10">
          <span className="text-indigo-200 font-mono text-[10px]">전체 자동화 연동</span>
          <span className="text-white font-mono font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            조회 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 3. Deep Magenta & Royal Violet Gradient Card (Card 3 in reference) */}
      <div
        onClick={() => onNavigate('reviews')}
        className="relative group p-5 rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden bg-gradient-to-br from-purple-600 via-fuchsia-600 to-indigo-700 text-white shadow-lg shadow-purple-600/20 hover:shadow-xl hover:shadow-purple-600/30 flex flex-col justify-between"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/20 text-white flex items-center justify-center font-bold text-xs backdrop-blur-md">
                <GitPullRequest className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">배포 통제 심사</span>
                <span className="text-[10px] text-fuchsia-200 font-mono">DEPLOY GATE</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold backdrop-blur-md border border-white/20 flex items-center gap-1">
              차단율 {autoBlockRate}%
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                {pendingReviewsCount}
              </span>
              <span className="text-xs font-semibold text-fuchsia-200 font-sans">건 승인 대기</span>
            </div>
            <p className="text-xs text-fuchsia-100/90 mt-1 font-sans">
              {pendingReviewsCount > 0 ? 'CISO/보안 심사 승인 대기 중' : '모든 PR 보안 통과 완료'}
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-[11px] relative z-10">
          <span className="text-fuchsia-200 font-mono text-[10px]">Zero-Tolerance 가동</span>
          <span className="text-white font-mono font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            심사 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* 4. Warm Sunset Amber & Peach Gradient Card (Card 4 in reference) */}
      <div
        onClick={() => onNavigate('findings', { severity: 'HIGH_CRITICAL' })}
        className="relative group p-5 rounded-3xl cursor-pointer transition-all duration-300 overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/35 flex flex-col justify-between"
      >
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/15 rounded-full blur-2xl pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-950/15 border border-slate-950/20 text-slate-950 flex items-center justify-center font-bold text-xs backdrop-blur-md">
                <Zap className="w-4 h-4 text-slate-950" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-950 block">평균 해결(MTTR)</span>
                <span className="text-[10px] text-amber-950/70 font-mono font-semibold">REMEDIATION SPEED</span>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/15 text-slate-950 font-bold backdrop-blur-md border border-slate-950/20">
              -82% 달성
            </span>
          </div>

          <div className="relative z-10">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-slate-950 font-mono tracking-tight">
                {mttrHours}
              </span>
              <span className="text-xs font-bold text-slate-950/80 font-sans">시간 (목표 24h)</span>
            </div>
            <p className="text-xs text-slate-950/80 mt-1 font-sans">
              고위험 결함 {unresolvedHighCriticalCount}건 · SLA 기한 초과 {overdueCount}건
            </p>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-950/15 flex items-center justify-between text-[11px] relative z-10">
          <span className="text-amber-950/70 font-mono text-[10px]">SLA 준수율 100%</span>
          <span className="text-slate-950 font-mono font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
            조치 큐 <ArrowUpRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
