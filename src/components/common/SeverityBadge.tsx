import React from 'react';
import { Badge } from '@/components/ui/badge';
import { SeverityLevel } from '@/types';
import { Flame, AlertCircle, AlertTriangle, Info, HelpCircle } from 'lucide-react';

interface SeverityBadgeProps {
  severity: SeverityLevel | string;
  size?: 'sm' | 'default';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, size = 'default' }) => {
  const iconSizeClass = size === 'sm' ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 mr-1.5';

  switch (severity) {
    case '치명적':
      return (
        <Badge className="bg-rose-500/10 hover:bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 shrink-0" />
          치명적 (Critical)
        </Badge>
      );
    case '높음':
      return (
        <Badge className="bg-orange-500/10 hover:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5 shrink-0" />
          높음 (High)
        </Badge>
      );
    case '중간':
      return (
        <Badge className="bg-amber-500/10 hover:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 shrink-0" />
          중간 (Medium)
        </Badge>
      );
    case '낮음':
      return (
        <Badge className="bg-sky-500/10 hover:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30 font-normal">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 shrink-0" />
          낮음 (Low)
        </Badge>
      );
    case '정보':
    default:
      return (
        <Badge className="bg-zinc-500/10 hover:bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/25 font-normal">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5 shrink-0" />
          정보 (Info)
        </Badge>
      );
  }
};
