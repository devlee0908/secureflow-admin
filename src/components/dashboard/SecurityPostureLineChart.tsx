import React, { useState } from 'react';
import {
  TrendingUp,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveMenu } from '@/components/layout/Sidebar';

interface SecurityPostureLineChartProps {
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const SecurityPostureLineChart: React.FC<SecurityPostureLineChartProps> = ({
  onNavigate,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // 10 data points spanning the full card width matching reference image
  const points = [
    { label: 'W1', value: 42, passRate: 88.2 },
    { label: 'W2', value: 38, passRate: 86.5 },
    { label: 'W3', value: 65, passRate: 93.0 },
    { label: 'W4', value: 50, passRate: 89.8 },
    { label: 'W5', value: 45, passRate: 88.9 },
    { label: 'W6', value: 72, passRate: 94.4 },
    { label: 'W7', value: 58, passRate: 91.1 },
    { label: 'W8', value: 68, passRate: 93.8 },
    { label: 'W9', value: 85, passRate: 97.2 },
    { label: 'W10', value: 92, passRate: 98.4 },
  ];

  const width = 500;
  const height = 110;
  const paddingX = 14;
  const paddingY = 14;

  const getCoordinates = (index: number, val: number) => {
    const x = paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (val / 100) * (height - paddingY * 2);
    return { x, y };
  };

  const coords = points.map((p, i) => getCoordinates(i, p.value));

  const pathD = coords.reduce((acc, curr, index) => {
    return `${acc} ${index === 0 ? 'M' : 'L'} ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

  return (
    <div className="p-5 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#121620]/90 backdrop-blur-xl shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
      <div>
        {/* Header matching reference image (Mim feature saving + pill button) */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80 dark:border-white/[0.06]">
          <div>
            <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
              DEPLOY GATE VELOCITY
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              게이트 통과율 &amp; 패치 속도 개선
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 shadow-2xs">
              +50.0% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-1.5 text-xs text-slate-500 dark:text-slate-400 font-sans">
          <span>10주 연속 무결점 패치 트렌드</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs">현재 98.4% (최고치)</span>
        </div>

        {/* Full-width Glowing Neon Gold Line SVG Chart matching reference */}
        <div className="relative w-full h-30 sm:h-32 pt-1">
          {/* Y-axis guide lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-15 px-1">
            <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
            <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
            <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Neon Glow Filter */}
              <filter id="neonGoldGlowRef" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Area Gradient */}
              <linearGradient id="goldAreaGradientRef" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.28" />
                <stop offset="60%" stopColor="#d97706" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#b45309" stopOpacity="0.0" />
              </linearGradient>

              {/* Line Gradient */}
              <linearGradient id="goldLineGradientRef" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>

            {/* Gradient Area Fill */}
            <path d={areaD} fill="url(#goldAreaGradientRef)" />

            {/* Glowing Stroke Line */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#goldLineGradientRef)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neonGoldGlowRef)"
            />

            {/* Glowing Points */}
            {coords.map((c, i) => {
              const isHovered = hoveredPoint === i;
              const isLast = i === coords.length - 1;

              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  {/* Outer Pulsing Ring */}
                  {(isLast || isHovered) && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="6.5"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      className="animate-ping opacity-75"
                    />
                  )}

                  {/* Core Node */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered || isLast ? '4.5' : '3'}
                    fill={isHovered || isLast ? '#ffffff' : '#f59e0b'}
                    stroke="#d97706"
                    strokeWidth="2"
                    className="transition-all duration-200 shadow-sm"
                  />
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip Popup */}
          {hoveredPoint !== null && (
            <div
              style={{
                left: `${(coords[hoveredPoint].x / width) * 100}%`,
                top: `${(coords[hoveredPoint].y / height) * 60}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-8 z-30 px-2 py-0.5 rounded-lg bg-slate-900 border border-amber-500/40 text-[10px] font-mono text-white shadow-xl pointer-events-none whitespace-nowrap"
            >
              <span className="font-bold text-amber-300">{points[hoveredPoint].label}:</span>{' '}
              {points[hoveredPoint].passRate}% 통과율
            </div>
          )}

          {/* X-axis labels */}
          <div className="flex justify-between px-1 text-[9px] font-mono text-slate-400 dark:text-slate-500 mt-1">
            {points.map((p) => (
              <span key={p.label}>{p.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-white/[0.06] mt-1 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          프로덕션 배포 통과율 98.4% 돌파
        </span>
        <button
          onClick={() => onNavigate('reviews')}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-mono text-[11px] font-bold flex items-center gap-1 group"
        >
          <span>심사 게이트</span>
          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
