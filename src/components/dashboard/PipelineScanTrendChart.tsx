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

  // 5 Security Engines (thick vertical pill bars matching reference image's lower bars)
  const engines = [
    {
      id: 'sast',
      name: 'Semgrep (SAST)',
      shortName: 'SAST',
      desc: '소스 정적 분석',
      rate: 98.4,
      heightPercent: 88,
      gradient: 'from-blue-700 via-sky-500 to-sky-300',
      activeColor: 'bg-sky-400',
    },
    {
      id: 'sca',
      name: 'Trivy (SCA)',
      shortName: 'SCA',
      desc: '오픈소스 취약점',
      rate: 99.1,
      heightPercent: 92,
      gradient: 'from-cyan-700 via-teal-500 to-cyan-300',
      activeColor: 'bg-cyan-400',
    },
    {
      id: 'secret',
      name: 'Gitleaks (Secret)',
      shortName: 'Secret',
      desc: '토큰/키 유출 탐지',
      rate: 99.8,
      heightPercent: 96,
      gradient: 'from-amber-700 via-yellow-500 to-amber-300',
      activeColor: 'bg-amber-400',
    },
    {
      id: 'iac',
      name: 'Checkov (IaC)',
      shortName: 'IaC',
      desc: '인프라 설정 결함',
      rate: 97.6,
      heightPercent: 82,
      gradient: 'from-purple-700 via-fuchsia-500 to-purple-300',
      activeColor: 'bg-purple-400',
    },
    {
      id: 'sbom',
      name: 'Cosign (SBOM)',
      shortName: 'SBOM',
      desc: '공급망 서명 무결성',
      rate: 100.0,
      heightPercent: 100,
      gradient: 'from-emerald-700 via-emerald-500 to-emerald-300',
      activeColor: 'bg-emerald-400',
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
    <div className="p-5 sm:p-6 rounded-3xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#121620]/90 backdrop-blur-xl shadow-sm dark:shadow-2xl relative overflow-hidden flex flex-col justify-between h-full">
      {/* Ambient background glows */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-sky-500/08 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-500/08 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Top Banner: Large Headline Metric & Circular Action Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/80 dark:border-white/[0.06] relative z-10">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight flex items-baseline gap-0.5">
              <span className="text-amber-500 font-sans text-xl font-bold">$</span>
              98.4%
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              COMPLIANT
            </span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            그룹 DevSecOps 규제 컴플라이언스 준수율 (ISMS-P &amp; 전자금융감독규정)
          </div>
        </div>

        {/* Circular Action Button matching reference image */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerQuickScan}
            disabled={isScanning}
            className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] border border-slate-200/90 dark:border-white/[0.1] text-xs font-semibold text-slate-800 dark:text-white transition-all shadow-2xs group"
          >
            <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Play className={cn('w-2.5 h-2.5 fill-current ml-0.5', isScanning && 'animate-spin')} />
            </div>
            <div className="text-left font-mono">
              <span className="block text-[9.5px] text-slate-400 dark:text-slate-400 leading-none">TELEMETRY</span>
              <span className="font-bold text-xs">
                {isScanning ? '점검 중...' : '실시간 전사 점검'}
              </span>
            </div>
          </button>

          {/* Time range pill */}
          <div className="flex items-center gap-1 p-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.06] text-xs">
            {(['7d', '14d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-2.5 py-0.5 rounded-full font-mono text-[10.5px] font-semibold transition-all',
                  timeRange === range
                    ? 'bg-white dark:bg-amber-500/20 text-slate-900 dark:text-amber-300 shadow-2xs border border-slate-200/80 dark:border-amber-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {range === '7d' ? '7일' : '14일'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Middle Section: Split Layout (Dense Equalizer Bars on Left, Stat Summary on Right) */}
      <div className="py-3 relative z-10 border-b border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm font-sans flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              일별 보안점검 파이프라인 &amp; 결함 탐지 흐름
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
              파이프라인 실행 횟수(청록색) 대비 탐지된 보안 결함(오렌지색) 일별 현황
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-sky-700 dark:text-sky-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-[0_0_6px_#0ea5e9]" />
              파이프라인 점검
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
              탐지 결함
            </span>
          </div>
        </div>

        {/* Main Grid: Dense Rhythm Equalizer on Left, Stats Panel on Right matching reference image */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pt-1">
          {/* Left 8.5 cols: Dense Vertical Pill Bars */}
          <div className="lg:col-span-8 xl:col-span-9 relative h-36 sm:h-40 w-full flex items-end justify-between gap-1.5 pt-2 pb-1 px-1 border-r border-slate-200/80 dark:border-white/[0.06] pr-3">
            {/* Horizontal guide lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 dark:opacity-15">
              <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
              <div className="border-b border-dashed border-slate-300 dark:border-slate-600 w-full" />
              <div className="border-b border-dashed border-slate-300 dark:border-slate-700 w-full" />
            </div>

            {displayData.map((item, index) => {
              const scanHeightPct = Math.max((item.scans / maxScans) * 100, 12);
              const findingsHeightPct = Math.max((item.findings / maxScans) * 100, 10);
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
                    <div className="absolute -top-11 z-30 px-2.5 py-1 rounded-xl bg-slate-900/95 border border-white/20 shadow-xl backdrop-blur-md text-[10px] font-mono text-white whitespace-nowrap animate-in fade-in-0 pointer-events-none">
                      <div className="font-bold text-amber-300">{item.label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-sky-300">점검 {item.scans}회</span>
                        <span>·</span>
                        <span className="text-amber-300">결함 {item.findings}건</span>
                      </div>
                    </div>
                  )}

                  {/* Dual Vertical Pill Bars */}
                  <div className="w-full flex items-end justify-center gap-1 h-full pb-1">
                    <div
                      style={{ height: `${scanHeightPct}%` }}
                      className={cn(
                        'w-2 sm:w-2.5 rounded-full bg-gradient-to-t from-blue-700 via-sky-500 to-sky-300 transition-all duration-200 shadow-xs',
                        isHovered ? 'brightness-125 shadow-[0_0_8px_#38bdf8]' : 'opacity-90 dark:opacity-85'
                      )}
                    />
                    <div
                      style={{ height: `${findingsHeightPct}%` }}
                      className={cn(
                        'w-2 sm:w-2.5 rounded-full bg-gradient-to-t from-orange-700 via-amber-500 to-amber-300 transition-all duration-200 shadow-xs',
                        isHovered ? 'brightness-125 shadow-[0_0_8px_#f59e0b]' : 'opacity-90 dark:opacity-85'
                      )}
                    />
                  </div>

                  <span className="text-[9.5px] font-mono text-slate-400 dark:text-slate-500 mt-1 truncate">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right 3.5 cols: Stat Breakdown Panel matching reference image */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-2 text-xs font-mono pb-1 pl-1">
            <div className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mb-1">
              CYCLE METRICS
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
              <div className="text-[10px] text-slate-400 font-sans">누적 파이프라인</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                428<span className="text-[10px] text-sky-500 font-sans ml-1">회 실행</span>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
              <div className="text-[10px] text-slate-400 font-sans">탐지 결함 조치율</div>
              <div className="text-sm font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                92.4%<span className="text-[10px] text-emerald-500 font-sans ml-1">우수</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Lower Section: 5 Core Security Engines Infographic */}
      <div className="pt-3 relative z-10 flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">
                ENGINE WORKLOAD TELEMETRY
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                <Cpu className="w-4 h-4 text-amber-500" />
                5대 보안 점검 엔진별 가동 성능 및 정밀도
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 shrink-0 self-start sm:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              5/5 엔진 온라인 정상
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            {/* Left 7 cols: Thick Vertical Pill Bars matching reference photo (w-8/w-9) */}
            <div className="lg:col-span-7 h-32 sm:h-34 flex items-end justify-around gap-3 px-2 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/[0.06] pb-2 lg:pb-0 lg:pr-4">
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
                      <div className="absolute -top-11 z-30 px-2.5 py-1 rounded-xl bg-slate-900 border border-white/20 text-[10px] font-mono text-white whitespace-nowrap shadow-xl pointer-events-none">
                        <span className="font-bold text-amber-300">{eng.name}:</span> {eng.rate}%
                      </div>
                    )}

                    {/* Thick Vertical Pill Bar (proper width: w-8 rounded-full) */}
                    <div
                      style={{ height: `${eng.heightPercent}%` }}
                      className={cn(
                        'w-8 rounded-full bg-gradient-to-t transition-all duration-300 shadow-md',
                        eng.gradient,
                        isHovered ? 'scale-105 brightness-125 shadow-lg' : 'opacity-90 dark:opacity-85'
                      )}
                    />

                    {/* Engine short label */}
                    <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 mt-2 truncate">
                      {eng.shortName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Right 5 cols: Legend Metrics for all 5 engines matching reference image */}
            <div className="lg:col-span-5 space-y-1.5 text-xs font-mono">
              {engines.map((eng) => (
                <div
                  key={eng.id}
                  className="flex items-center justify-between p-1 px-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', eng.activeColor)} />
                    <span className="text-slate-700 dark:text-slate-300 font-sans text-xs">{eng.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-xs">{eng.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Micro Spec Indicator Bar at the bottom */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.04] grid grid-cols-3 gap-2 text-center text-[10.5px] font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-slate-50/80 dark:bg-white/[0.02]">
            <Clock className="w-3 h-3 text-sky-500" />
            <span>평균 스캔: <strong className="text-slate-800 dark:text-slate-200 font-bold">14.8초</strong></span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-slate-50/80 dark:bg-white/[0.02]">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>정밀도: <strong className="text-slate-800 dark:text-slate-200 font-bold">99.2% (오탐 0.8%↓)</strong></span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-1 rounded-xl bg-slate-50/80 dark:bg-white/[0.02]">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>사전 차단: <strong className="text-slate-800 dark:text-slate-200 font-bold">Zero-Tolerance</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
