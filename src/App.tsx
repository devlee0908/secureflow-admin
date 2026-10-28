import React, { useState, Suspense, lazy } from 'react';
import { DevSecOpsProvider, useDevSecOps } from '@/context/DevSecOpsContext';
import { Sidebar, ActiveMenu } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { LoginView } from '@/views/LoginView';
import { CommandPalette } from '@/components/common/CommandPalette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLiveEvents } from '@/hooks/useLiveEvents';

// Code Splitting (Enterprise Bundle Optimization)
const DashboardView = lazy(() => import('@/views/DashboardView').then((m) => ({ default: m.DashboardView })));
const ProjectsView = lazy(() => import('@/views/ProjectsView').then((m) => ({ default: m.ProjectsView })));
const ScansView = lazy(() => import('@/views/ScansView').then((m) => ({ default: m.ScansView })));
const FindingsView = lazy(() => import('@/views/FindingsView').then((m) => ({ default: m.FindingsView })));
const DeploymentReviewsView = lazy(() => import('@/views/DeploymentReviewsView').then((m) => ({ default: m.DeploymentReviewsView })));
const PoliciesView = lazy(() => import('@/views/PoliciesView').then((m) => ({ default: m.PoliciesView })));
const AuditLogsView = lazy(() => import('@/views/AuditLogsView').then((m) => ({ default: m.AuditLogsView })));
const SettingsView = lazy(() => import('@/views/SettingsView').then((m) => ({ default: m.SettingsView })));

const ViewFallback: React.FC = () => (
  <div className="w-full min-h-[350px] flex flex-col items-center justify-center p-12 space-y-3">
    <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200/80 dark:border-white/[0.1] flex items-center justify-center text-zinc-700 dark:text-zinc-300">
      <RotateCcw className="w-4 h-4 animate-spin" />
    </div>
    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">모듈 온디맨드 로딩 중...</span>
  </div>
);

const AppContent: React.FC = () => {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Navigation payload for filtering across views
  const [navigationFilter, setNavigationFilter] = useState<any>(null);

  const { loadError, isLoading, retryLoadData, invalidateCache, isAuthenticated } = useDevSecOps();

  // Real-time Event Bus (SSE) Listener with fine-grained cache invalidation
  useLiveEvents({
    onWebhookReceived: () => {
      invalidateCache('runs');
      invalidateCache('projects');
    },
    onOverrideApproved: () => {
      invalidateCache('runs');
      invalidateCache('reviews');
    },
    onFindingUpdated: () => {
      invalidateCache('findings');
    },
    onReviewUpdated: () => {
      invalidateCache('reviews');
    },
    onScannerJobCompleted: () => {
      invalidateCache('runs');
    },
    onDatabaseEngineChanged: () => {
      invalidateCache('all');
    },
  });

  const handleNavigate = (menu: ActiveMenu, filterState?: any) => {
    setActiveMenu(menu);
    setNavigationFilter(filterState);
    window.scrollTo(0, 0);
  };

  // If not authenticated, render LoginView
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // If simulated load error is active
  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#09090b] p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-zinc-950 dark:text-zinc-50 mb-2">데이터 로딩 오류 발생</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-md mb-6 leading-relaxed">
          {loadError}
          <br />
          <span className="text-xs text-zinc-400 mt-1 block">
            (데모 오류 시뮬레이션 기능에 의해 발생한 화면입니다)
          </span>
        </p>
        <Button
          onClick={retryLoadData}
          disabled={isLoading}
          className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs"
        >
          <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? '다시 연결 중...' : '데이터 다시 불러오기'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-950 transition-colors duration-200">
      {/* Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        onSelectMenu={(menu) => {
          setActiveMenu(menu);
          setNavigationFilter(null);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 bg-[#fafafa] dark:bg-[#09090b] transition-colors duration-200">
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNavigateMenu={(menu) => handleNavigate(menu)}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full space-y-6">
          <Suspense fallback={<ViewFallback />}>
            {activeMenu === 'dashboard' && (
              <DashboardView onNavigate={handleNavigate} />
            )}
            {activeMenu === 'projects' && (
              <ProjectsView
                onNavigate={handleNavigate}
                initialFilter={navigationFilter}
              />
            )}
            {activeMenu === 'scans' && (
              <ScansView initialFilter={navigationFilter} />
            )}
            {activeMenu === 'findings' && (
              <FindingsView initialFilter={navigationFilter} />
            )}
            {activeMenu === 'reviews' && (
              <DeploymentReviewsView
                initialReviewId={navigationFilter?.reviewId}
                onNavigate={handleNavigate}
              />
            )}
            {activeMenu === 'policies' && (
              <PoliciesView
                initialTab={navigationFilter?.tab}
                onNavigate={handleNavigate}
              />
            )}
            {activeMenu === 'audit' && <AuditLogsView />}
            {activeMenu === 'settings' && (
              <SettingsView initialTab={navigationFilter?.tab} />
            )}
          </Suspense>
        </main>

        <footer className="border-t border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#09090b] py-3.5 px-4 sm:px-6 lg:px-8 transition-colors">
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-500 dark:text-zinc-500 font-mono">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-zinc-800 dark:text-zinc-300">
                SECUREFLOW™ Enterprise DevSecOps Platform
              </span>
              <span className="text-zinc-300 dark:text-zinc-800">|</span>
              <span>v2.4.8 Enterprise Edition (Build 2026.10)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>All Telemetry Operational</span>
              </span>
              <span className="text-zinc-300 dark:text-zinc-800">|</span>
              <span>ISMS-P &amp; ISO 27001 Certified</span>
            </div>
          </div>
        </footer>

        {/* Global Command Palette */}
        <CommandPalette
          open={isCommandPaletteOpen}
          onOpenChange={setIsCommandPaletteOpen}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  );
};

export function App() {
  return (
    <TooltipProvider>
      <DevSecOpsProvider>
        <AppContent />
        <Toaster richColors position="top-right" closeButton />
      </DevSecOpsProvider>
    </TooltipProvider>
  );
}

export default App;
