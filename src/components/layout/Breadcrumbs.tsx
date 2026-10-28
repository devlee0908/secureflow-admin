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
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 pt-1 border-b border-zinc-200/80 dark:border-white/[0.08] mb-6">
      <div>
        {/* Navigation path */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1.5 font-sans">
          <span className="flex items-center gap-1 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors">
            <Home className="w-3.5 h-3.5" />
            SecureFlow
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
          <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-400 font-medium">
            <Building2 className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
            {selectedEntity.name}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
          <span className="text-zinc-900 dark:text-zinc-100 font-medium">{currentMenuTitle}</span>
        </div>

        {/* Page Title & Subtitle */}
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 font-sans">
          {currentMenuTitle}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action buttons slot */}
      {actionButtons && (
        <div className="flex items-center gap-2 shrink-0">
          {actionButtons}
        </div>
      )}
    </div>
  );
};
