import React, { useState, useMemo } from 'react';
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

  // 1. Filtered data & KPI Metrics memoized to prevent redundant recalculations
  const {
    registeredProjectsCount,
    prodProjectsCount,
    devProjectsCount,
    unresolvedHighCriticalFindings,
    unresolvedHighCriticalCount,
    pendingReviews,
    pendingReviewsCount,
    avgSecurityScore,
    overdueFindings,
    computedAutoBlockRate,
    computedMttrHours,
  } = useMemo(() => {
    const filteredProjects = projects.filter((p) =>
      isAllEntities ? true : p.entityId === selectedEntityId
    );
    const filteredFindings = findings.filter((f) =>
      isAllEntities ? true : f.entityId === selectedEntityId
    );
    const filteredReviews = reviews.filter((r) =>
      isAllEntities ? true : r.entityId === selectedEntityId
    );

    const regCount = filteredProjects.length;
    const prodCount = filteredProjects.filter((p) => p.status === '운영 중').length;
    const devCount = filteredProjects.filter((p) => p.status !== '운영 중').length;

    const unresolvedHighCrit = filteredFindings.filter(
      (f) =>
        (f.severity === '치명적' || f.severity === '높음') &&
        f.status !== '해결' &&
        f.status !== '오탐' &&
        f.status !== '예외 승인'
    );

    const pendRevs = filteredReviews.filter(
      (r) => r.approvalStatus === '대기' || r.securityVerdict === '검토 필요'
    );

    const today = '2026-10-02';
    const findingsByProj = new Map<string, typeof findings>();
    for (const f of filteredFindings) {
      const list = findingsByProj.get(f.projectId);
      if (list) list.push(f);
      else findingsByProj.set(f.projectId, [f]);
    }

    const projectScores = filteredProjects.map((p) =>
      calculateProjectSecurityScore(p.id, findingsByProj.get(p.id) || [], today)
    );
    const avgScore = Math.round(
      projectScores.reduce((acc, cur) => acc + cur.score, 0) / (projectScores.length || 1)
    );

    const overdue = filteredFindings.filter((f) => {
      if (f.status === '해결' || f.status === '오탐' || f.status === '예외 승인') return false;
      return f.dueDate < today;
    });

    const blockedOrReviewCount = filteredReviews.filter(
      (r) => r.securityVerdict === '차단' || r.approvalStatus === '반려'
    ).length;
    const autoBlockRate =
      filteredReviews.length > 0
        ? Number(((blockedOrReviewCount / filteredReviews.length) * 100).toFixed(1))
        : 4.8;

    const resolvedFindingsCount = filteredFindings.filter(
      (f) => f.status === '해결' || f.status === '오탐' || f.status === '예외 승인'
    ).length;
    const mttrHours =
      unresolvedHighCrit.length === 0 && resolvedFindingsCount > 0
        ? 1.8
        : Number(Math.max(1.8, 3.6 + unresolvedHighCrit.length * 0.6).toFixed(1));

    return {
      registeredProjectsCount: regCount,
      prodProjectsCount: prodCount,
      devProjectsCount: devCount,
      unresolvedHighCriticalFindings: unresolvedHighCrit,
      unresolvedHighCriticalCount: unresolvedHighCrit.length,
      pendingReviews: pendRevs,
      pendingReviewsCount: pendRevs.length,
      avgSecurityScore: avgScore,
      overdueFindings: overdue,
      computedAutoBlockRate: autoBlockRate,
      computedMttrHours: mttrHours,
    };
  }, [projects, findings, reviews, isAllEntities, selectedEntityId]);

  const todayStr = '2026-10-02';

  return (
    <div className="relative min-h-screen text-zinc-900 dark:text-zinc-100 select-none space-y-6 pb-12 animate-in fade-in-50 duration-200">
      {/* 1. Header Bar: Vercel Geist Monochrome Precision */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-950 dark:text-zinc-50 tracking-tight font-sans">
              보안 관제 대시보드
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-mono text-[10px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mt-1">
            그룹 4대 법인 DevSecOps 파이프라인 · 5대 보안 분석 엔진 · 배포 게이트 실시간 통합 관제
          </p>
        </div>

        {/* Header Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Entity Scope Selector Control */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 px-3 rounded-md bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-800 hover:text-zinc-950 dark:bg-[#121214] dark:hover:bg-white/[0.06] dark:border-white/[0.08] dark:text-zinc-200 dark:hover:text-white text-xs font-medium flex items-center gap-2 transition-colors">
                <Building2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                <span>{isAllEntities ? '전체 법인 통합' : currentEntity?.name}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-[#0f0f11] border border-zinc-200 dark:border-white/[0.1] text-xs text-zinc-800 dark:text-zinc-200 rounded-lg shadow-lg z-[9999]">
              <DropdownMenuLabel className="text-[10px] text-zinc-400 font-mono uppercase">법인 관제 범위 선택</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedEntityId('ALL')} className="cursor-pointer font-medium">
                전체 법인 통합 관제 (Global Group)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/[0.08]" />
              {entities.map((ent) => (
                <DropdownMenuItem
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id as any)}
                  className="cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-2" />
                  <span>{ent.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400 ml-auto">{ent.code}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Audit Report Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="h-8 px-3 rounded-md bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-700 hover:text-zinc-950 dark:bg-[#121214] dark:hover:bg-white/[0.06] dark:border-white/[0.08] dark:text-zinc-300 dark:hover:text-white text-xs font-medium gap-1.5 shadow-none transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span className="hidden sm:inline">정기 보안감사</span> 보고서
          </Button>

          {/* Projects Quick Button */}
          <Button
            size="sm"
            onClick={() => onNavigate('projects')}
            className="h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium text-xs shadow-none transition-colors gap-1.5"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
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
