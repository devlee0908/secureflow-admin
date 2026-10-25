import React from 'react';
import { ChevronRight, Home, Building2 } from 'lucide-react';
import { useDevSecOps } from '@/context/DevSecOpsContext';

interface BreadcrumbsProps {
  currentMenuTitle: string;
  subtitle?: string;
  actionButtons?: React.ReactNode;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  currentMenuTitle,
  subtitle,
  actionButtons,
}) => {
  const { selectedEntityId, entities } = useDevSecOps();

  const selectedEntity =
    selectedEntityId === 'ALL'
      ? { name: '전체 법인 통합' }
      : entities.find((e) => e.id === selectedEntityId) || { name: '선택 법인' };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 pt-2 border-b border-slate-200/80 dark:border-white/[0.06] mb-6">
      <div>
        {/* Navigation path */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-mono">
          <span className="flex items-center gap-1 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <Home className="w-3.5 h-3.5" />
            SecureFlow
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          <span className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-medium">
            <Building2 className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
            {selectedEntity.name}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
          <span className="text-slate-900 dark:text-white font-semibold">{currentMenuTitle}</span>
        </div>

        {/* Page Title & Subtitle */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
          {currentMenuTitle}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action buttons slot */}
      {actionButtons && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actionButtons}
        </div>
      )}
    </div>
  );
};
