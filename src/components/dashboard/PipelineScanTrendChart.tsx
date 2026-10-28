import React, { useState } from 'react';
import {
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveMenu } from '@/components/layout/Sidebar';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { toast } from 'sonner';

interface PipelineScanTrendChartProps {
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const PipelineScanTrendChart: React.FC<PipelineScanTrendChartProps> = ({ onNavigate }) => {
  const { projects } = useDevSecOps();
  const [timeRange, setTimeRange] = useState<'7d' | '14d'>('14d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [hoveredEngine, setHoveredEngine] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // 14-day dense rhythm telemetry matching the reference image's dense equalizer
  const rhythmData = [
    { label: '09/19', scans: 22, findings: 3, blocked: 0 },
    { label: '09/20', scans: 18, findings: 2, blocked: 0 },
    { label: '09/21', scans: 12, findings: 1, blocked: 0 },
    { label: '09/22', scans: 34, findings: 6, blocked: 1 },
    { label: '09/23', scans: 42, findings: 9, blocked: 1 },
    { label: '09/24', scans: 39, findings: 7, blocked: 0 },
    { label: '09/25', scans: 48, findings: 11, blocked: 2 },
    { label: '09/26', scans: 24, findings: 4, blocked: 0 },
    { label: '09/27', scans: 14, findings: 2, blocked: 0 },
    { label: '09/28', scans: 10, findings: 1, blocked: 0 },
    { label: '09/29', scans: 38, findings: 8, blocked: 1 },
    { label: '09/30', scans: 52, findings: 12, blocked: 2 },
    { label: '10/01', scans: 58, findings: 14, blocked: 2 },
    { label: '10/02', scans: 46, findings: 6, blocked: 1 },
  ];

  const displayData = timeRange === '7d' ? rhythmData.slice(7) : rhythmData;
  const maxScans = 62;

  // 5 Security Engines (Vercel Geist high-precision bar fills)
  const engines = [
    {
      id: 'sast',
      name: 'Semgrep (SAST)',
      shortName: 'SAST',
      desc: '소스 정적 분석',
      rate: 98.4,
      heightPercent: 88,
      barColor: 'bg-zinc-900 dark:bg-zinc-100',
      activeColor: 'bg-zinc-900 dark:bg-zinc-100',
    },
    {
      id: 'sca',
      name: 'Trivy (SCA)',
      shortName: 'SCA',
      desc: '오픈소스 취약점',
      rate: 99.1,
      heightPercent: 92,
      barColor: 'bg-sky-500 dark:bg-sky-400',
      activeColor: 'bg-sky-500',
    },
    {
      id: 'secret',
      name: 'Gitleaks (Secret)',
      shortName: 'Secret',
      desc: '토큰/키 유출 탐지',
      rate: 99.8,
      heightPercent: 96,
      barColor: 'bg-amber-500 dark:bg-amber-400',
      activeColor: 'bg-amber-500',
    },
    {
      id: 'iac',
      name: 'Checkov (IaC)',
      shortName: 'IaC',
      desc: '인프라 설정 결함',
      rate: 97.6,
      heightPercent: 82,
      barColor: 'bg-zinc-500 dark:bg-zinc-400',
      activeColor: 'bg-zinc-500',
    },
    {
      id: 'sbom',
      name: 'Cosign (SBOM)',
      shortName: 'SBOM',
      desc: '공급망 서명 무결성',
      rate: 100.0,
      heightPercent: 100,
      barColor: 'bg-emerald-500 dark:bg-emerald-400',
      activeColor: 'bg-emerald-500',
    },
  ];

  const handleTriggerQuickScan = () => {
    setIsScanning(true);
    toast.info(`전사 ${projects.length}개 프로젝트 파이프라인 점검을 시작합니다...`);
    setTimeout(() => {
      setIsScanning(false);
      toast.success(`보안 점검 완료: ${projects.length}/${projects.length} 파이프라인 무결성 확인됨`);
    }, 1800);
  };

  return (
    <div className="p-5 sm:p-6 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] relative overflow-hidden flex flex-col justify-between h-full">
      {/* 1. Top Banner: Headline Metric & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-semibold text-zinc-950 dark:text-zinc-50 font-mono tabular-nums tracking-tight">
              98.4%
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-mono">
              COMPLIANT
            </span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-sans mt-1">
            그룹 DevSecOps 규제 컴플라이언스 준수율 (ISMS-P &amp; 전자금융감독규정)
          </div>
        </div>

        {/* Action Button & Time Range Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerQuickScan}
            disabled={isScanning}
            className="flex items-center gap-2 h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60"
          >
            <Play className={cn('w-3 h-3 fill-current', isScanning && 'animate-spin')} />
            <span>{isScanning ? '점검 실행 중...' : '전사 파이프라인 점검'}</span>
          </button>

          {/* Time range switcher */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-zinc-100 dark:bg-[#161618] border border-zinc-200/80 dark:border-white/[0.08] text-xs">
            {(['7d', '14d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-2.5 py-1 rounded font-mono text-[11px] font-medium transition-colors',
                  timeRange === range
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-2xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                {range === '7d' ? '7일' : '14일'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Daily Scan Telemetry Bar Chart */}
      <div className="py-4 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
              일별 보안점검 파이프라인 &amp; 결함 탐지 흐름
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-sans">
              파이프라인 실행 횟수 대비 탐지된 보안 결함 일별 추이
            </p>
          </div>
          <div className="flex items-center gap-3.5 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
              <span className="w-2 h-2 rounded-xs bg-zinc-900 dark:bg-zinc-200" />
              파이프라인 점검
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-xs bg-amber-500" />
              탐지 결함
            </span>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pt-1">
          {/* Left 9 cols: Telemetry Bars */}
          <div className="lg:col-span-8 xl:col-span-9 relative h-36 sm:h-40 w-full flex items-end justify-between gap-1.5 pt-2 pb-1 px-1 border-r border-zinc-200/80 dark:border-white/[0.08] pr-3">
            {/* Horizontal guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-zinc-200 dark:border-white/[0.06] w-full" />
              <div className="border-b border-dashed border-zinc-200 dark:border-white/[0.06] w-full" />
              <div className="border-b border-dashed border-zinc-200 dark:border-white/[0.06] w-full" />
            </div>

            {displayData.map((item, index) => {
              const scanHeightPct = Math.max((item.scans / maxScans) * 100, 10);
              const findingsHeightPct = Math.max((item.findings / maxScans) * 100, 8);
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-11 z-30 px-2.5 py-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md text-[10px] font-mono tabular-nums whitespace-nowrap pointer-events-none">
                      <div className="font-semibold">{item.label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 opacity-90">
                        <span>점검 {item.scans}회</span>
                        <span>·</span>
                        <span>결함 {item.findings}건</span>
                      </div>
                    </div>
                  )}

                  {/* Dual Vertical Bars (Geist crisp rounded-t-xs) */}
                  <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                    <div
                      style={{ height: `${scanHeightPct}%` }}
                      className={cn(
                        'w-2 sm:w-2.5 rounded-t-xs bg-zinc-900 dark:bg-zinc-200 transition-opacity duration-150',
                        isHovered ? 'opacity-100' : 'opacity-85'
                      )}
                    />
                    <div
                      style={{ height: `${findingsHeightPct}%` }}
                      className={cn(
                        'w-2 sm:w-2.5 rounded-t-xs bg-amber-500 dark:bg-amber-400 transition-opacity duration-150',
                        isHovered ? 'opacity-100' : 'opacity-85'
                      )}
                    />
                  </div>

                  <span className="text-[9.5px] font-mono tabular-nums text-zinc-400 dark:text-zinc-500 mt-1 truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right 3 cols: Stat Breakdown Panel */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-2 text-xs font-mono pb-1 pl-1">
            <div className="text-[10px] font-mono text-zinc-400 font-medium uppercase tracking-wider mb-1">
              CYCLE METRICS
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#141417] border border-zinc-200/70 dark:border-white/[0.06]">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">누적 파이프라인</div>
              <div className="text-sm font-semibold text-zinc-950 dark:text-white font-mono tabular-nums mt-0.5">
                428<span className="text-[10px] text-zinc-500 font-sans ml-1 font-normal">회 실행</span>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-[#141417] border border-zinc-200/70 dark:border-white/[0.06]">
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-sans">탐지 결함 조치율</div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                92.4%<span className="text-[10px] text-zinc-500 font-sans ml-1 font-normal">SLA 준수</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lower Section: 5 Core Security Engines Telemetry */}
      <div className="pt-4 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
                ENGINE WORKLOAD TELEMETRY
              </span>
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 mt-0.5">
                <Cpu className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                5대 보안 점검 엔진별 가동 성능 및 정밀도
              </h4>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/25 shrink-0 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              5/5 엔진 온라인 정상
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left 7 cols: Crisp Vertical Telemetry Bars */}
            <div className="lg:col-span-7 h-32 flex items-end justify-around gap-3 px-2 border-b lg:border-b-0 lg:border-r border-zinc-200/80 dark:border-white/[0.08] pb-2 lg:pb-0 lg:pr-4">
              {engines.map((eng) => {
                const isHovered = hoveredEngine === eng.id;
                return (
                  <div
                    key={eng.id}
                    onMouseEnter={() => setHoveredEngine(eng.id)}
                    onMouseLeave={() => setHoveredEngine(null)}
                    className="flex flex-col items-center justify-end h-full relative group cursor-pointer w-12 sm:w-14"
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-9 z-30 px-2 py-0.5 rounded-md bg-zinc-900 dark:bg-zinc-100 text-[10px] font-mono tabular-nums text-white dark:text-zinc-900 whitespace-nowrap shadow-md pointer-events-none">
                        <span className="font-semibold">{eng.name}:</span> {eng.rate}%
                      </div>
                    )}

                    {/* Crisp Vertical Bar */}
                    <div
                      style={{ height: `${eng.heightPercent}%` }}
                      className={cn(
                        'w-7 rounded-t-sm transition-opacity duration-200',
                        eng.barColor,
                        isHovered ? 'opacity-100' : 'opacity-85'
                      )}
                    />

                    {/* Engine short label */}
                    <span className="text-[10px] font-mono font-medium text-zinc-600 dark:text-zinc-400 mt-2 truncate">
                      {eng.shortName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right 5 cols: Legend Metrics for all 5 engines */}
            <div className="lg:col-span-5 space-y-1.5 text-xs font-mono">
              {engines.map((eng) => (
                <div
                  key={eng.id}
                  className="flex items-center justify-between py-1.5 px-2.5 rounded-md bg-zinc-50 dark:bg-[#141417] border border-zinc-200/60 dark:border-white/[0.05]"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-xs', eng.activeColor)} />
                    <span className="text-zinc-700 dark:text-zinc-300 font-sans text-xs">{eng.name}</span>
                  </div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono tabular-nums text-xs">{eng.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Micro Spec Indicator Bar at the bottom */}
        <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-white/[0.06] grid grid-cols-3 gap-2 text-center text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-md bg-zinc-50 dark:bg-[#141417]">
            <Clock className="w-3 h-3 text-zinc-400" />
            <span>평균 스캔: <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">14.8초</strong></span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-md bg-zinc-50 dark:bg-[#141417]">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>정밀도: <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">99.2%</strong></span>
          </div>
          <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-md bg-zinc-50 dark:bg-[#141417]">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>사전 차단: <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">Zero-Tolerance</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
