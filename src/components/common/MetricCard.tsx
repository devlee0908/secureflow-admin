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
        'relative overflow-hidden transition-all duration-200 border-slate-200/90 dark:border-white/[0.08] shadow-sm hover:shadow-md dark:shadow-xl dark:hover:shadow-2xl bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md rounded-2xl group hover:border-indigo-300 dark:hover:border-white/[0.18]',
        onClick && 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500/50 hover:bg-slate-50/80 dark:hover:bg-[#0f1523]/90',
        className
      )}
    >
      {/* 2026 Top subtle hover accent line */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 tracking-tight">
            {title}
            {badge}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] px-2 py-0.5 rounded-full font-mono font-medium">
              {scopeLabel}
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/[0.03] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/[0.08] group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 transition-all flex items-center justify-center shrink-0">
              {icon}
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors tabular-nums">
            {value}
          </div>
          {onClick && (
            <div className="text-[11px] text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center font-medium opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
              <span>조회</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          )}
        </div>

        {(subtitle || trend) && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-2 text-xs">
            {trend && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono tracking-tight shrink-0',
                  trend.isWarning
                    ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                    : trend.isPositive
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-white/[0.04] dark:text-slate-400 dark:border-white/[0.08]'
                )}
              >
                {trend.text}
              </span>
            )}
            {subtitle && (
              <span className="text-slate-500 dark:text-slate-400 truncate text-[11px] font-mono">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
