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
    <div className="flex flex-col h-full bg-white dark:bg-[#09090b] text-zinc-800 dark:text-zinc-200 border-r border-zinc-200/80 dark:border-white/[0.08] transition-colors duration-150">
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-md overflow-hidden shrink-0 border border-zinc-200 dark:border-white/[0.14] bg-zinc-950 flex items-center justify-center">
            <img
              src="/assets/secureflow_symbol.png?v=2"
              alt="SecureFlow"
              className="w-full h-full object-contain"
            />
          </div>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-zinc-950 dark:text-zinc-100 font-sans">
                SecureFlow
              </span>
              <span className="text-[9px] px-1.5 py-0.5 bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-400 font-mono font-medium rounded border border-zinc-200 dark:border-white/[0.08]">
                ENT
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors outline-none select-none"
          title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-label={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Vercel Geist Style Navigation List */}
      <div className="flex-1 py-4 px-2.5 space-y-5 overflow-y-auto scrollbar-none">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-0.5">
            {!isCollapsed ? (
              <div className="px-2.5 pt-1 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium select-none">
                {section.category}
              </div>
            ) : (
              <div className="mx-2 my-1.5 border-t border-zinc-200/70 dark:border-white/[0.06]" />
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors duration-150 group relative outline-none select-none',
                    isActive
                      ? 'bg-zinc-100 dark:bg-white/[0.08] text-zinc-950 dark:text-white font-semibold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/60 dark:hover:bg-white/[0.04] hover:text-zinc-950 dark:hover:text-zinc-200 font-medium'
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-zinc-900 dark:bg-white rounded-r" />
                  )}
                  <Icon
                    className={cn(
                      'w-4 h-4 shrink-0 transition-colors duration-150',
                      isActive
                        ? 'text-zinc-950 dark:text-white'
                        : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-300'
                    )}
                  />
                  {!isCollapsed && (
                    <span className="tracking-tight text-xs truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Scope & User Indicator Footer */}
      <div className="p-2.5 border-t border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#09090b]">
        {!isCollapsed ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#111113] px-2.5 py-2 rounded-md border border-zinc-200/80 dark:border-white/[0.07]">
              <Building2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <div className="truncate flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-mono tracking-wider">SCOPE</span>
                  <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    ACTIVE
                  </span>
                </div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs block truncate mt-0.5">{selectedEntityName}</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md bg-white dark:bg-[#111113] border border-zinc-200/70 dark:border-white/[0.06]">
              <div className="w-6 h-6 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center font-mono font-bold text-[11px] shrink-0">
                {currentUser.name[0]}
              </div>
              <div className="truncate text-left flex-1">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">{currentUser.name}</div>
                <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-mono">{currentUser.roleTitle}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="w-7 h-7 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center text-xs font-mono font-bold cursor-pointer"
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
