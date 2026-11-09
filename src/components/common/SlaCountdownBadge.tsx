import React from 'react';
import { calculateSlaStatus } from '@/lib/slaCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SlaCountdownBadgeProps {
  dueDate: string;
  status: string;
  severity: string;
  todayStr?: string;
}

export const SlaCountdownBadge: React.FC<SlaCountdownBadgeProps> = ({
  dueDate,
  status,
  severity,
  todayStr = '2026-10-02',
}) => {
  const sla = calculateSlaStatus(dueDate, status, severity, todayStr);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-mono cursor-pointer transition-all hover:scale-105 ${sla.badgeClass}`}
        >
          {sla.label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="bg-[#141417] border-white/[0.1] text-zinc-100 p-2.5 max-w-xs text-xs space-y-1.5 z-[9999] shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1">
          <span className="font-bold text-white text-xs">SLA 조치 기한 정보</span>
          <span className="font-mono text-[10px] text-zinc-400">기준: {severity}</span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-zinc-400">사내 SLA 규정:</span>
            <span className="text-white font-semibold">{severity} {sla.policySlaDays}일 이내 조치</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-400">지정 만료일:</span>
            <span className="font-mono text-zinc-200 font-bold">{dueDate}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-white/[0.08]">
            <span className="text-zinc-400">현재 상태:</span>
            <span
              className={`font-semibold ${
                sla.isOverdue ? 'text-rose-400' : sla.isDDay ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {sla.isOverdue
                ? `${Math.abs(sla.daysRemaining)}일 초과 (SLA 위반)`
                : sla.isDDay
                ? '오늘 조치 만료 (D-Day)'
                : sla.isResolved
                ? '정상 조치 완료'
                : `${sla.daysRemaining}일 여유 있음`}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
