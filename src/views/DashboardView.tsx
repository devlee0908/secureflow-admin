import React, { useState } from 'react';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { ExecutiveHeroCards } from '@/components/dashboard/ExecutiveHeroCards';
import { PipelineScanTrendChart } from '@/components/dashboard/PipelineScanTrendChart';
import { CorporateBenchmarkChart } from '@/components/dashboard/CorporateBenchmarkChart';
import { SecurityPostureLineChart } from '@/components/dashboard/SecurityPostureLineChart';
import { UrgentActionQueue } from '@/components/dashboard/UrgentActionQueue';
import { AuditReportModal } from '@/components/dashboard/AuditReportModal';
import { Button } from '@/components/ui/button';
import {
  FileText,
  FolderGit2,
  Building2,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { calculateProjectSecurityScore } from '@/lib/securityScore';
import { ActiveMenu } from '@/components/layout/Sidebar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface DashboardViewProps {
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const {
    entities,
    projects,
    scans,
    findings,
    reviews,
    selectedEntityId,
    setSelectedEntityId,
  } = useDevSecOps();

  const isAllEntities = selectedEntityId === 'ALL';
  const currentEntity = isAllEntities
    ? null
    : entities.find((e) => e.id === selectedEntityId);

  const scopeLabel = isAllEntities ? '전체 법인 기준' : `${currentEntity?.name} 기준`;

  // 1. Filtered data according to entity
  const filteredProjects = projects.filter((p) =>
    isAllEntities ? true : p.entityId === selectedEntityId
  );

  const filteredScans = scans.filter((s) =>
    isAllEntities ? true : s.entityId === selectedEntityId
  );

  const filteredFindings = findings.filter((f) =>
    isAllEntities ? true : f.entityId === selectedEntityId
  );

  const filteredReviews = reviews.filter((r) =>
    isAllEntities ? true : r.entityId === selectedEntityId
  );

  // 2. Metrics Calculations
  const registeredProjectsCount = filteredProjects.length;
  const prodProjectsCount = filteredProjects.filter((p) => p.status === '운영 중').length;
  const devProjectsCount = filteredProjects.filter((p) => p.status !== '운영 중').length;

  const unresolvedHighCriticalFindings = filteredFindings.filter(
    (f) =>
      (f.severity === '치명적' || f.severity === '높음') &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  );
  const unresolvedHighCriticalCount = unresolvedHighCriticalFindings.length;

  const pendingReviews = filteredReviews.filter(
    (r) => r.approvalStatus === '대기' || r.securityVerdict === '검토 필요'
  );
  const pendingReviewsCount = pendingReviews.length;

  const todayStr = '2026-10-02';

  // Average Project Security Score
  const projectScores = filteredProjects.map((p) =>
    calculateProjectSecurityScore(p.id, findings, todayStr)
  );
  const avgSecurityScore = Math.round(
    projectScores.reduce((acc, cur) => acc + cur.score, 0) / (projectScores.length || 1)
  );

  // Overdue findings
  const overdueFindings = filteredFindings.filter((f) => {
    if (f.status === '해결' || f.status === '오탐' || f.status === '예외 승인') return false;
    return f.dueDate < todayStr;
  });

  // Dynamic Auto-Block Rate & MTTR Calculations
  const blockedOrReviewCount = filteredReviews.filter(
    (r) => r.securityVerdict === '차단' || r.approvalStatus === '반려'
  ).length;
  const computedAutoBlockRate =
    filteredReviews.length > 0
      ? Number(((blockedOrReviewCount / filteredReviews.length) * 100).toFixed(1))
      : 4.8;

  const resolvedFindingsCount = filteredFindings.filter(
    (f) => f.status === '해결' || f.status === '오탐' || f.status === '예외 승인'
  ).length;
  const computedMttrHours =
    unresolvedHighCriticalCount === 0 && resolvedFindingsCount > 0
      ? 1.8
      : Number(Math.max(1.8, 3.6 + unresolvedHighCriticalCount * 0.6).toFixed(1));

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 select-none space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* Ambient Sunset / Golden Top-Right Glow & Deep Indigo Glow */}
      <div className="fixed top-0 right-0 w-[600px] h-[500px] bg-gradient-to-bl from-amber-400/10 via-orange-400/05 to-transparent dark:from-amber-500/15 dark:via-orange-500/05 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-400/05 via-indigo-400/05 to-transparent dark:from-cyan-500/10 dark:via-indigo-500/05 dark:to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      {/* 1. Header Bar: Dual-mode compatible with Capsule Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/70 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-sans">
              Dashboard
            </h1>
            <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400 font-mono text-[10px] font-semibold shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
            그룹 4대 법인 DevSecOps 파이프라인 · 5대 보안 분석 엔진 · 배포 게이트 실시간 통합 관제
          </p>
        </div>

        {/* Header Right Action Capsules */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Entity Scope Selector Capsule */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 px-4 rounded-full bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/80 text-slate-800 hover:text-slate-900 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/[0.08] dark:text-slate-200 dark:hover:text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs">
                <Building2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>{isAllEntities ? '전체 법인 통합' : currentEntity?.name}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#0e121a] border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-slate-200 rounded-2xl shadow-xl z-[9999]">
              <DropdownMenuLabel className="text-[10px] text-slate-400 font-mono">법인 관제 범위 선택</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedEntityId('ALL')} className="cursor-pointer font-semibold">
                🌐 전체 법인 통합 관제 (Global Group)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/10" />
              {entities.map((ent) => (
                <DropdownMenuItem
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id as any)}
                  className="cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-sky-500 mr-2" />
                  <span>{ent.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-auto">{ent.code}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Audit Report Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="h-9 px-4 rounded-full bg-slate-100/80 hover:bg-slate-200/70 border-slate-200/80 text-slate-700 hover:text-slate-900 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:border-white/[0.08] dark:text-slate-300 dark:hover:text-white text-xs font-semibold gap-1.5 shadow-2xs transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-sky-500" />
            <span className="hidden sm:inline">정기 보안감사</span> 보고서
          </Button>

          {/* Projects Quick Button */}
          <Button
            size="sm"
            onClick={() => onNavigate('projects')}
            className="h-9 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all gap-1.5"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-slate-950" />
            <span>프로젝트 자산</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Hero Metric Cards: Dual-mode compatible */}
      <ExecutiveHeroCards
        avgSecurityScore={avgSecurityScore}
        registeredProjectsCount={registeredProjectsCount}
        prodProjectsCount={prodProjectsCount}
        devProjectsCount={devProjectsCount}
        unresolvedHighCriticalCount={unresolvedHighCriticalCount}
        overdueCount={overdueFindings.length}
        pendingReviewsCount={pendingReviewsCount}
        autoBlockRate={computedAutoBlockRate}
        mttrHours={computedMttrHours}
        scopeLabel={scopeLabel}
        onNavigate={onNavigate}
      />

      {/* 3. Main Center Infographics Grid: Balanced Heights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column: Masterwork Unified Telemetry Hub (Daily Scan Trend + 5-Engine Workload) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col">
          <PipelineScanTrendChart onNavigate={onNavigate} />
        </div>

        {/* Right Column: Corporate Benchmark + Glowing Neon Line Chart */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col justify-between gap-4">
          {/* Top-Right: Corporate Benchmark Chart */}
          <div className="flex-1 flex flex-col">
            <CorporateBenchmarkChart onNavigate={onNavigate} />
          </div>

          {/* Bottom-Right: Glowing Neon Line Chart */}
          <div className="flex-1 flex flex-col">
            <SecurityPostureLineChart onNavigate={onNavigate} />
          </div>
        </div>
      </div>

      {/* 4. Operational Urgency Section: SLA Overdue & Deployment Reviews */}
      <UrgentActionQueue
        overdueFindings={overdueFindings}
        highCriticalFindings={unresolvedHighCriticalFindings}
        pendingReviews={pendingReviews}
        todayStr={todayStr}
        onNavigate={onNavigate}
      />

      {/* Compliance & Security Audit Report Modal */}
      <AuditReportModal
        open={isAuditModalOpen}
        onOpenChange={setIsAuditModalOpen}
      />
    </div>
  );
};
