import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Scan,
  ShieldAlert,
  GitPullRequest,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  Building2,
  User,
  FileCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDevSecOps } from '@/context/DevSecOpsContext';

export type ActiveMenu =
  | 'dashboard'
  | 'projects'
  | 'scans'
  | 'findings'
  | 'reviews'
  | 'policies'
  | 'audit'
  | 'settings';

interface SidebarProps {
  activeMenu: ActiveMenu;
  onSelectMenu: (menu: ActiveMenu) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeMenu,
  onSelectMenu,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { currentUser, selectedEntityId, entities } = useDevSecOps();

  const selectedEntityName =
    selectedEntityId === 'ALL'
      ? '전체 법인'
      : entities.find((e) => e.id === selectedEntityId)?.name || '법인 선택됨';

  const navSections: {
    category: string;
    items: {
      id: ActiveMenu;
      label: string;
      code: string;
      icon: React.ComponentType<{ className?: string }>;
    }[];
  }[] = [
    {
      category: 'OPERATIONS',
      items: [
        { id: 'dashboard', label: '통합 대시보드', code: 'DASHBOARD', icon: LayoutDashboard },
        { id: 'projects', label: '프로젝트 자산', code: 'PROJECTS', icon: FolderGit2 },
        { id: 'scans', label: '보안점검 파이프라인', code: 'PIPELINES', icon: Scan },
      ],
    },
    {
      category: 'SECURITY GATE',
      items: [
        { id: 'findings', label: '취약점·결함 관리', code: 'FINDINGS', icon: ShieldAlert },
        { id: 'reviews', label: '배포 통제 심사 게이트', code: 'DEPLOY-GATE', icon: GitPullRequest },
        { id: 'policies', label: '보안 정책 관리', code: 'POLICIES', icon: ShieldCheck },
      ],
    },
    {
      category: 'ADMINISTRATION',
      items: [
        { id: 'audit', label: '보안 감사 및 전자서명', code: 'AUDIT', icon: FileCheck },
        { id: 'settings', label: '시스템 및 연동 설정', code: 'SETTINGS', icon: Sliders },
      ],
    },
  ];

  const handleItemClick = (id: ActiveMenu) => {
    onSelectMenu(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#0c0f16] text-slate-800 dark:text-slate-200 border-r border-slate-200/80 dark:border-white/[0.06] transition-colors duration-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200/70 dark:border-white/[0.06]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-sm bg-gradient-to-tr from-sky-400 to-indigo-600 dark:from-sky-400 dark:to-indigo-500 p-0.5 flex items-center justify-center">
            <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center overflow-hidden">
              <img
                src="/assets/secureflow_symbol.png?v=2"
                alt="SecureFlow"
                className="w-full h-full object-contain filter drop-shadow-md"
              />
            </div>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 font-sans">
                Secure<span className="text-sky-500 dark:text-sky-400">Flow</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-sky-500/10 text-sky-600 dark:text-sky-300 font-mono font-bold rounded-full border border-sky-500/20">
                  ENTERPRISE
                </span>
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-tight">
                DevSecOps Platform
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors outline-none focus:outline-none select-none"
          title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List with Reference-Inspired Active Pill Capsule */}
      <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto scrollbar-none">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            {!isCollapsed ? (
              <div className="px-3 pt-1 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold select-none">
                {section.category}
              </div>
            ) : (
              <div className="mx-2 my-1 border-t border-slate-100 dark:border-white/[0.06]" />
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs transition-all duration-200 group relative outline-none select-none',
                    isActive
                      ? 'bg-sky-500 dark:bg-[#38bdf8] text-white dark:text-slate-950 font-bold shadow-md shadow-sky-500/25 dark:shadow-sky-400/20 translate-x-0.5'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] hover:text-slate-900 dark:hover:text-slate-100'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105',
                      isActive ? 'text-white dark:text-slate-950' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    )}
                  />
                  {!isCollapsed && (
                    <span className="tracking-tight text-xs font-semibold">{item.label}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white dark:bg-slate-950 opacity-80" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scope & User Indicator Footer */}
      <div className="p-3 border-t border-slate-200/70 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#07090e]/50">
        {!isCollapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-white/[0.03] p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
              <div className="truncate flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 dark:text-slate-500 text-[9px] font-mono font-bold tracking-wider">TENANT</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ONLINE
                  </span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block truncate mt-0.5">{selectedEntityName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-1.5 rounded-2xl bg-white dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/[0.04]">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {currentUser.name[0]}
              </div>
              <div className="truncate text-left flex-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate font-mono">{currentUser.roleTitle}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs cursor-pointer"
              title={`${currentUser.name} (${currentUser.roleTitle})`}
            >
              {currentUser.name[0]}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col shrink-0 transition-[width] duration-200 ease-in-out z-30 sticky top-0 h-screen select-none',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 md:hidden backdrop-blur-xs animate-in fade-in-0 duration-200"
          onClick={onCloseMobile}
        >
          <div
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#0c0f16] shadow-2xl animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
