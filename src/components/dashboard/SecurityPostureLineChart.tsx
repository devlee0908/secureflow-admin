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
    <div className="p-5 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] relative overflow-hidden flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80 dark:border-white/[0.08]">
          <div>
            <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
              DEPLOY GATE VELOCITY
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
              <TrendingUp className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              게이트 통과율 &amp; 패치 속도 개선
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium font-mono tabular-nums px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              +50.0% <TrendingUp className="w-3 h-3" />
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 text-xs text-zinc-500 dark:text-zinc-400 font-sans">
          <span>10주 연속 무결점 패치 트렌드</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono tabular-nums text-xs">현재 98.4%</span>
        </div>

        {/* Crisp Vercel Geist SVG Line Chart */}
        <div className="relative w-full h-30 sm:h-32 pt-1">
          {/* Y-axis guide lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none px-1">
            <div className="border-b border-dashed border-zinc-200 dark:border-white/[0.06] w-full" />
            <div className="border-b border-dashed border-zinc-200 dark:border-white/[0.06] w-full" />
            <div className="border-b border-dashed border-zinc-200 dark:border-white/[0.06] w-full" />
          </div>

          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              {/* Subtle Area Gradient */}
              <linearGradient id="geistEmeraldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Area Fill */}
            <path d={areaD} fill="url(#geistEmeraldArea)" />

            {/* Crisp 2px Stroke Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
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
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered || isLast ? '4' : '2.5'}
                    fill={isHovered || isLast ? '#10b981' : '#ffffff'}
                    stroke="#10b981"
                    strokeWidth="2"
                    className="transition-all duration-150"
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
              className="absolute -translate-x-1/2 -translate-y-8 z-30 px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-[10px] font-mono tabular-nums text-white dark:text-zinc-900 shadow-md pointer-events-none whitespace-nowrap"
            >
              <span className="font-semibold">{points[hoveredPoint].label}:</span>{' '}
              {points[hoveredPoint].passRate}% 통과율
            </div>
          )}

          {/* X-axis labels */}
          <div className="flex justify-between px-1 text-[9px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 mt-1">
            {points.map((p) => (
              <span key={p.label}>{p.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-2.5 border-t border-zinc-100 dark:border-white/[0.06] mt-1 flex items-center justify-between text-xs">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          프로덕션 배포 통과율 98.4% 달성
        </span>
        <button
          onClick={() => onNavigate('reviews')}
          className="text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-medium text-[11px] flex items-center gap-1 group"
        >
          <span>심사 게이트</span>
          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
