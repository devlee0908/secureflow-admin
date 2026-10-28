import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import {
  Search,
  FolderGit2,
  Scan,
  ShieldAlert,
  ShieldCheck,
  FileCheck,
  GitPullRequest,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { ActiveMenu } from '@/components/layout/Sidebar';
import { UserRole } from '@/types';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (menu: ActiveMenu, filterState?: any) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  onNavigate,
}) => {
  const [query, setQuery] = useState('');
  const {
    projects,
    findings,
    scans,
    reviews,
    resetDemoData,
    setCurrentUserRole,
    hasDummyData,
    generateDummyData,
    clearDummyData,
  } = useDevSecOps();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const lowerQuery = query.toLowerCase().trim();

  // Matched items
  const matchedProjects = lowerQuery
    ? projects
        .filter(
          (p) =>
            p.name.toLowerCase().includes(lowerQuery) ||
            p.id.toLowerCase().includes(lowerQuery) ||
            p.repository.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 4)
    : projects.slice(0, 3);

  const matchedFindings = lowerQuery
    ? findings
        .filter(
          (f) =>
            f.title.toLowerCase().includes(lowerQuery) ||
            f.id.toLowerCase().includes(lowerQuery) ||
            f.filePath.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 4)
    : findings.slice(0, 3);

  const matchedScans = lowerQuery
    ? scans
        .filter(
          (s) =>
            s.id.toLowerCase().includes(lowerQuery) ||
            s.projectName.toLowerCase().includes(lowerQuery) ||
            s.commitId.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 3)
    : [];

  const matchedReviews = lowerQuery
    ? reviews
        .filter(
          (r) =>
            r.id.toLowerCase().includes(lowerQuery) ||
            r.projectName.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 3)
    : [];

  const handleSelectMenu = (menu: ActiveMenu, filter?: any) => {
    onNavigate(menu, filter);
    onOpenChange(false);
    setQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden shadow-2xl border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#0c0f16] text-slate-900 dark:text-slate-100">
        <DialogHeader className="sr-only">
          <DialogTitle>빠른 통합 검색 (Command Palette)</DialogTitle>
          <DialogDescription>
            프로젝트, 결함, 점검 및 빠른 이동 명령어를 검색합니다.
          </DialogDescription>
        </DialogHeader>

        {/* Search input header */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0f16]">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3" />
          <input
            placeholder="프로젝트, 취약점, 점검 ID 또는 명령 검색... (예: 결제, JWT, SCN)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 text-sm bg-transparent text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
            autoFocus
          />
          <Badge variant="outline" className="text-[10px] text-slate-400 font-mono shrink-0">
            ESC로 닫기
          </Badge>
        </div>

        {/* Search Results / Action List */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 text-xs divide-y divide-slate-100 dark:divide-white/[0.06]">
          {/* Quick Navigations */}
          {!lowerQuery && (
            <div className="pt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-2">
                주요 화면 바로가기
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: 'dashboard', label: '통합 대시보드', icon: Sparkles },
                  { id: 'projects', label: '프로젝트 관리', icon: FolderGit2 },
                  { id: 'scans', label: '보안점검 현황', icon: Scan },
                  { id: 'findings', label: '취약점·발견사항', icon: ShieldAlert },
                  { id: 'reviews', label: '배포 심사 게이트', icon: GitPullRequest },
                  { id: 'policies', label: '보안 정책 관리', icon: ShieldCheck },
                  { id: 'audit', label: '보안 감사·전자서명', icon: FileCheck },
                  { id: 'settings', label: '시스템·연동 설정', icon: Sliders },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMenu(item.id as ActiveMenu)}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-300 text-left transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400 shrink-0" />
                      <span className="font-medium text-xs truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Matched Projects */}
          {matchedProjects.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-2">
                프로젝트 ({matchedProjects.length})
              </span>
              <div className="space-y-1">
                {matchedProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectMenu('projects', { projectId: p.id })}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FolderGit2 className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-950 dark:text-zinc-50 mr-2">{p.name}</span>
                        <span className="font-mono text-[11px] text-zinc-400">{p.id}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono truncate max-w-[150px]">
                      {p.entityName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Findings */}
          {matchedFindings.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-2">
                취약점·발견사항 ({matchedFindings.length})
              </span>
              <div className="space-y-1">
                {matchedFindings.map((f) => (
                  <div
                    key={f.id}
                    onClick={() => handleSelectMenu('findings', { findingId: f.id })}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-rose-50/60 dark:hover:bg-rose-950/30 text-zinc-700 dark:text-zinc-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <ShieldAlert
                        className={`w-4 h-4 shrink-0 ${
                          f.severity === '치명적'
                            ? 'text-rose-600 dark:text-rose-400'
                            : f.severity === '높음'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-amber-500'
                        }`}
                      />
                      <div className="truncate">
                        <span className="font-semibold text-zinc-950 dark:text-zinc-50 mr-2">{f.title}</span>
                        <span className="font-mono text-[10px] text-zinc-400">{f.id}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-zinc-100 dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-medium">
                      {f.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Scans */}
          {matchedScans.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 px-2">
                보안점검 이력
              </span>
              <div className="space-y-1">
                {matchedScans.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectMenu('scans', { scanId: s.id })}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/[0.06] text-zinc-700 dark:text-zinc-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 font-mono">
                      <Scan className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{s.id}</span>
                      <span className="text-zinc-400 text-[11px] font-sans">
                        ({s.projectName})
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions Footer */}
          <div className="pt-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-2">
              빠른 액션 & 권한 변경
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {hasDummyData ? (
                <button
                  onClick={() => {
                    clearDummyData();
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                  <span>더미 파일 제거 (실 프로젝트만 유지)</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    generateDummyData();
                    onOpenChange(false);
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>샘플 더미 데이터 생성</span>
                </button>
              )}
              <button
                onClick={() => {
                  setCurrentUserRole('group_admin');
                  onOpenChange(false);
                }}
                className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-left"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>그룹 보안관리자(CISO)로 권한 전환</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400 px-4">
          <span>단축키: <strong>⌘ + K</strong> 또는 <strong>Ctrl + K</strong></span>
          <span>선택 시 해당 화면으로 즉시 이동합니다</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
