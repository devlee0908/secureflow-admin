import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  TrendingDown,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeltaDebtBurndownCardProps {
  baselineDebtCount?: number;
  newVulnerabilitiesCount?: number;
  totalResolvedCount?: number;
  gracePeriodDays?: number;
  targetDate?: string;
  onOpenDebtFindings?: () => void;
  onOpenPrChecks?: () => void;
  compact?: boolean;
}

export const DeltaDebtBurndownCard: React.FC<DeltaDebtBurndownCardProps> = ({
  baselineDebtCount = 2,
  newVulnerabilitiesCount = 1,
  totalResolvedCount = 0,
  gracePeriodDays = 30,
  targetDate = '2026-11-04T18:00:00Z',
  onOpenDebtFindings,
  onOpenPrChecks,
  compact = false,
}) => {
  // Real-time countdown timer tick
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({
    days: 27,
    hours: 14,
    minutes: 32,
    seconds: 45,
    isExpired: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  // Burndown progress ratio (e.g. 3 days elapsed / 30 days total = 10%)
  const daysElapsed = Math.max(0, gracePeriodDays - timeLeft.days);
  const elapsedPercentage = Math.min(100, Math.round((daysElapsed / gracePeriodDays) * 100));

  if (compact) {
    return (
      <div className="p-3 rounded-lg bg-zinc-50 dark:bg-[#141417] border border-zinc-200/80 dark:border-white/[0.08] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>Delta Gate 레거시 부채 조치 유예 타이머</span>
          </div>
          <span className="font-mono tabular-nums text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-200/70 dark:bg-white/[0.08] text-zinc-800 dark:text-zinc-200">
            D-{timeLeft.days}일 {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
          <span>
            기존 부채: <strong className="text-amber-600 dark:text-amber-400 font-mono">{baselineDebtCount}건</strong> (JWT, ReDoS)
          </span>
          <span>
            신규 차단: <strong className="text-rose-600 dark:text-rose-400 font-mono">{newVulnerabilitiesCount}건</strong> (SQLi)
          </span>
        </div>

        <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-500"
            style={{ width: `${elapsedPercentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] p-4 sm:p-5 space-y-4">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-white/[0.06] pb-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.08] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
              <span>Delta Baseline 기술 부채 격리 및 번다운(Burndown) 관리</span>
            </h3>
            <Badge variant="outline" className="font-mono text-[10px]">
              Brownfield SLA Active
            </Badge>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            기존 운영 코드베이스의 레거시 부채 2건은 비즈니스 연속성을 위해 30일 유예기간 내 상환을 유도하며, PR에 신규 유입된 치명적 결함은 즉각 차단합니다.
          </p>
        </div>

        {/* Real-time D-Day Countdown Clock Display */}
        <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#141417] border border-zinc-200/80 dark:border-white/[0.08] flex items-center gap-3 shrink-0">
          <Clock className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          <div className="text-right">
            <span className="text-[10px] text-zinc-400 block font-mono">레거시 부채 조치 마감까지</span>
            <span className="font-mono tabular-nums font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              D-{timeLeft.days}일 {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics 3-Column Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. New Zero-Tolerance Findings */}
        <div className="p-3.5 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141417] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              신규 유입 결함 (Delta New)
            </span>
            <Badge variant="danger" className="font-mono text-[10px] px-1.5 py-0">
              Zero Tolerance
            </Badge>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-rose-600 dark:text-rose-400">
              {newVulnerabilitiesCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">건 (치명적 SQLi)</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
            배포 심사 즉시 차단(Block). 패치 푸시 전까지 Merge 불가.
          </p>
        </div>

        {/* 2. Legacy Technical Debt */}
        <div className="p-3.5 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141417] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              승계된 레거시 부채 (Baseline Debt)
            </span>
            <Badge variant="warning" className="font-mono text-[10px]">
              30일 유예
            </Badge>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-amber-600 dark:text-amber-400">
              {baselineDebtCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">건 (JWT, ReDoS)</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
            PR 머지는 허용하되 30일 이내 부채 상환 계획 이행 권고.
          </p>
        </div>

        {/* 3. Resolved & Cleared */}
        <div className="p-3.5 rounded-lg border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141417] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              조치 완료 / 상환 누적
            </span>
            <Badge variant="success" className="font-mono text-[10px]">
              Clean Target
            </Badge>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {totalResolvedCount}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">건 상환 완료</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
            권장 패치 적용 시 3건 결함 전체 해결 및 98점 정상 회복.
          </p>
        </div>
      </div>

      {/* Burndown Visual Timeline Progress */}
      <div className="p-4 rounded-lg bg-zinc-50/70 dark:bg-[#141417] border border-zinc-200/80 dark:border-white/[0.06] space-y-2.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <span className="text-zinc-900 dark:text-zinc-100">
              30일 기술 부채 번다운(Burndown) 진행 현황
            </span>
          </div>
          <span className="font-mono tabular-nums text-[11px] text-zinc-500">
            SLA 경과: {daysElapsed}일 / {gracePeriodDays}일 ({elapsedPercentage}%)
          </span>
        </div>

        {/* Progress bar with markers */}
        <div className="relative pt-1">
          <div className="w-full bg-zinc-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-zinc-900 dark:bg-zinc-100 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, elapsedPercentage)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400 pt-1.5">
            <span>Day 0 (최초 점검 3건 탐지)</span>
            <span>Day 15 (중간 리뷰 1.5건 목표)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Day 30 (0건 전면 상환 목표)</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 text-xs">
        <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span>
            모든 취약점 패치 코드는 PR 화면에서 <strong>원클릭 커밋 푸시</strong> 및 <strong>자동 머지</strong>가 가능합니다.
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {onOpenDebtFindings && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenDebtFindings}
              className="h-8 text-xs font-medium gap-1 text-zinc-700 dark:text-zinc-300"
            >
              <span>레거시 부채 2건 상세</span>
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}

          {onOpenPrChecks && (
            <Button
              size="sm"
              onClick={onOpenPrChecks}
              className="h-8 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 gap-1.5 shadow-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>PR 보안 패치 &amp; 조치 화면 열기</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
