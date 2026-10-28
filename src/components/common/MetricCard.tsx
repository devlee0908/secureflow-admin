import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  scopeLabel: string; // e.g. "전체 법인 기준" or "테크솔루션즈 기준"
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    text: string;
    isPositive?: boolean;
    isWarning?: boolean;
  };
  onClick?: () => void;
  className?: string;
  badge?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  scopeLabel,
  subtitle,
  icon,
  trend,
  onClick,
  className,
  badge,
}) => {
  return (
    <Card
      onClick={onClick}
      className={cn(
        'relative overflow-hidden transition-colors border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] rounded-xl group hover:border-zinc-300 dark:hover:border-white/[0.16]',
        onClick && 'cursor-pointer',
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 tracking-tight">
            {title}
            {badge}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-white/[0.05] border border-zinc-200/80 dark:border-white/[0.08] px-2 py-0.5 rounded-md font-mono font-medium">
              {scopeLabel}
            </span>
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-white/[0.05] text-zinc-700 dark:text-zinc-300 border border-zinc-200/80 dark:border-white/[0.08] transition-colors flex items-center justify-center shrink-0">
              {icon}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-3xl font-semibold font-mono tracking-tight text-zinc-950 dark:text-zinc-50 tabular-nums">
            {value}
          </div>
          {onClick && (
            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-950 dark:group-hover:text-white flex items-center font-medium opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
              <span>조회</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-medium font-mono tabular-nums tracking-tight shrink-0 border',
                  trend.isWarning
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25'
                    : trend.isPositive
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25'
                    : 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-white/[0.05] dark:text-zinc-400 dark:border-white/[0.08]'
                )}
              >
                {trend.text}
              </span>
            )}
            {subtitle && (
              <span className="text-zinc-500 dark:text-zinc-400 truncate text-[11px] font-sans">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
