import React from 'react';
import { ProjectSecurityScore } from '@/lib/securityScore';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SecurityScoreBadgeProps {
  scoreInfo: ProjectSecurityScore;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const SecurityScoreBadge: React.FC<SecurityScoreBadgeProps> = ({
  scoreInfo,
  showLabel = false,
}) => {
  const { grade, score, gradeColor, gradeLabel, breakdown, slaComplianceRate } = scoreInfo;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono tabular-nums cursor-pointer transition-colors ${gradeColor.bg} ${gradeColor.border}`}
        >
          <span
            className={`font-bold rounded-xs px-1.5 py-0.2 text-white text-[10px] leading-tight ${
              grade === 'A+' || grade === 'A'
                ? 'bg-emerald-600'
                : grade === 'B'
                ? 'bg-sky-600'
                : grade === 'C'
                ? 'bg-amber-600'
                : grade === 'D'
                ? 'bg-orange-600'
                : 'bg-rose-600'
            }`}
          >
            {grade}
          </span>
          <span className={`font-semibold ${gradeColor.text} text-xs`}>
            {score}점
          </span>
          {showLabel && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans hidden sm:inline">
              ({gradeLabel})
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-slate-900 border-slate-800 text-slate-100 p-3 max-w-xs space-y-2 z-[9999] shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white text-xs">보안 성숙도 평가</span>
            <span className="text-[10px] text-slate-400">({gradeLabel})</span>
          </div>
          <span className="font-mono font-bold text-xs text-indigo-400">{score} / 100점</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">치명적(Critical) 결함:</span>
            <span className={breakdown.critCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              {breakdown.critCount}건 (-{breakdown.critDeduction}점)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">높음(High) 결함:</span>
            <span className={breakdown.highCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
              {breakdown.highCount}건 (-{breakdown.highDeduction}점)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">SLA 조치기한 초과:</span>
            <span className={breakdown.overdueCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
              {breakdown.overdueCount}건 (-{breakdown.overdueDeduction}점)
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-800 text-indigo-300 font-medium">
            <span>SLA 준수율:</span>
            <span className="font-mono font-bold">{slaComplianceRate}%</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
