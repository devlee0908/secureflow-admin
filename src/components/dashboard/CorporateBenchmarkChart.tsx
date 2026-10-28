import React, { useState } from 'react';
import {
  Building2,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveMenu } from '@/components/layout/Sidebar';
import { useDevSecOps } from '@/context/DevSecOpsContext';

interface CorporateBenchmarkChartProps {
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const CorporateBenchmarkChart: React.FC<CorporateBenchmarkChartProps> = ({
  onNavigate,
}) => {
  const { entities, selectedEntityId, setSelectedEntityId } = useDevSecOps();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // 8 division benchmark bars mapped to valid corporate EntityIds (ENT-01 ~ ENT-04)
  const benchmarkBars = [
    { code: 'HLD-1', name: '테크 코어', score: 94, isAmber: true, entityId: 'ENT-01' },
    { code: 'HLD-2', name: '테크 AI플랫폼', score: 88, isAmber: false, entityId: 'ENT-01' },
    { code: 'FIN-1', name: '파이낸스 결제', score: 76, isAmber: true, entityId: 'ENT-02' },
    { code: 'FIN-2', name: '파이낸스 뱅킹', score: 84, isAmber: false, entityId: 'ENT-02' },
    { code: 'COM-1', name: '커머스 스토어', score: 82, isAmber: true, entityId: 'ENT-03' },
    { code: 'COM-2', name: '커머스 물류', score: 78, isAmber: false, entityId: 'ENT-03' },
    { code: 'CLD-1', name: '클라우드 아키텍처', score: 91, isAmber: true, entityId: 'ENT-04' },
    { code: 'CLD-2', name: '클라우드 인프라', score: 96, isAmber: false, entityId: 'ENT-04' },
  ];

  return (
    <div className="p-5 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#121620]/90 backdrop-blur-xl shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
      {/* Top Header & Big Metric */}
      <div>
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/[0.06]">
          <div>
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
              CORPORATE BENCHMARK
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-4 h-4 text-amber-500" />
              법인별 보안 위험 벤치마크
            </h3>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              88.5점
            </span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono font-bold">
              전사 평균 양호
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 text-xs text-slate-500 dark:text-slate-400 font-sans">
          <span>법인별 8개 핵심 조직 보안 지수</span>
          <span className="text-amber-600 dark:text-amber-400 font-bold font-mono text-xs">최고 96점 (엔터 인프라)</span>
        </div>

        {/* 8-bar dense vertical pill chart matching reference photo */}
        <div className="h-34 sm:h-36 w-full flex items-end justify-between gap-2 pt-4 pb-1 px-1 border-b border-slate-200/80 dark:border-white/[0.06] relative">
          {/* Subtle guide lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-15">
            <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
            <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
            <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
          </div>

          {benchmarkBars.map((item, idx) => {
            const heightPct = Math.round((item.score / 100) * 100);
            const isHovered = hoveredIndex === idx;
            const isSelected = selectedEntityId === item.entityId;

            return (
              <div
                key={item.code}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                onClick={() => setSelectedEntityId(item.entityId as any)}
                className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
              >
                {/* Floating highlight badge on hover */}
                {isHovered && (
                  <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-slate-900 border border-white/20 text-white font-bold text-[9px] font-mono shadow-xl pointer-events-none z-30 whitespace-nowrap">
                    {item.name}: {item.score}점
                  </div>
                )}

                {/* Vertical Pill Bar with alternating Amber / Sky-Blue gradients matching reference image */}
                <div
                  style={{ height: `${heightPct}%` }}
                  className={cn(
                    'w-4 sm:w-5 rounded-full transition-all duration-300 relative shadow-sm',
                    item.isAmber
                      ? 'bg-gradient-to-t from-orange-600 via-amber-500 to-amber-300'
                      : 'bg-gradient-to-t from-blue-700 via-sky-500 to-sky-300',
                    isHovered
                      ? 'brightness-125 scale-110 shadow-md'
                      : isSelected
                      ? 'ring-2 ring-amber-400/80 brightness-110'
                      : 'opacity-90 dark:opacity-85'
                  )}
                />

                {/* X-axis Entity Code */}
                <span
                  className={cn(
                    'text-[9px] font-mono mt-1.5 truncate transition-colors',
                    isSelected
                      ? 'text-amber-600 dark:text-amber-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                  )}
                >
                  {item.code}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Quick Action */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] mt-1 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          조직 클릭 시 실시간 법인 관제 동기화
        </span>
        <button
          onClick={() => onNavigate('projects')}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1 group"
        >
          <span>법인별 자산</span>
          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
