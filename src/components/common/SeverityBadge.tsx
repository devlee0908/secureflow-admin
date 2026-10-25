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
        <Badge className="bg-red-600 hover:bg-red-700 text-white border-transparent font-bold">
          <Flame className={iconSizeClass} />
          치명적 (Critical)
        </Badge>
      );
    case '높음':
      return (
        <Badge className="bg-orange-600 hover:bg-orange-700 text-white border-transparent font-medium">
          <AlertCircle className={iconSizeClass} />
          높음 (High)
        </Badge>
      );
    case '중간':
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-transparent font-medium">
          <AlertTriangle className={iconSizeClass} />
          중간 (Medium)
        </Badge>
      );
    case '낮음':
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white border-transparent font-normal">
          <Info className={iconSizeClass} />
          낮음 (Low)
        </Badge>
      );
    case '정보':
    default:
      return (
        <Badge className="bg-slate-600 hover:bg-slate-700 text-white border-transparent font-normal">
          <HelpCircle className={iconSizeClass} />
          정보 (Info)
        </Badge>
      );
  }
};
