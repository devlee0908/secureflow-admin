import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Loader2,
  MinusCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileCheck,
} from 'lucide-react';
import {
  ScanRunStatus,
  ScanOverallStatus,
  FindingStatus,
  SecurityVerdict,
  ApprovalStatus,
  ProjectStatus,
} from '@/types';

interface StatusBadgeProps {
  status:
    | ScanRunStatus
    | ScanOverallStatus
    | FindingStatus
    | SecurityVerdict
    | ApprovalStatus
    | ProjectStatus
    | string;
  size?: 'sm' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'default' }) => {
  const iconSizeClass = size === 'sm' ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 mr-1.5';

  switch (status) {
    // Scan Run Status
    case '대기':
      return (
        <Badge variant="neutral">
          <Clock className={iconSizeClass} />
          대기
        </Badge>
      );
    case '실행 중':
    case '점검 중':
      return (
        <Badge variant="info">
          <Loader2 className={`${iconSizeClass} animate-spin`} />
          {status}
        </Badge>
      );
    case '완료':
    case '성공':
    case '통과':
      return (
        <Badge variant="success">
          <CheckCircle2 className={iconSizeClass} />
          {status}
        </Badge>
      );
    case '실패':
      return (
        <Badge variant="danger">
          <XCircle className={iconSizeClass} />
          실패
        </Badge>
      );
    case '취소':
      return (
        <Badge variant="neutral">
          <MinusCircle className={iconSizeClass} />
          취소
        </Badge>
      );

    // Project Overall Status
    case '주의':
      return (
        <Badge variant="warning">
          <AlertTriangle className={iconSizeClass} />
          주의
        </Badge>
      );
    case '위험':
      return (
        <Badge variant="danger">
          <ShieldAlert className={iconSizeClass} />
          위험
        </Badge>
      );
    case '미점검':
      return (
        <Badge variant="neutral">
          <MinusCircle className={iconSizeClass} />
          미점검
        </Badge>
      );

    // Finding Status
    case '신규':
      return (
        <Badge variant="danger">
          <ShieldAlert className={iconSizeClass} />
          신규
        </Badge>
      );
    case '검토 중':
      return (
        <Badge variant="warning">
          <Clock className={iconSizeClass} />
          검토 중
        </Badge>
      );
    case '조치 중':
      return (
        <Badge variant="info">
          <Loader2 className={`${iconSizeClass} animate-spin`} />
          조치 중
        </Badge>
      );
    case '해결':
      return (
        <Badge variant="success">
          <ShieldCheck className={iconSizeClass} />
          해결
        </Badge>
      );
    case '오탐':
      return (
        <Badge variant="neutral">
          <MinusCircle className={iconSizeClass} />
          오탐
        </Badge>
      );
    case '예외 승인':
      return (
        <Badge variant="outline" className="border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-400">
          <FileCheck className={iconSizeClass} />
          예외 승인
        </Badge>
      );

    // Security Verdict
    case '검토 필요':
      return (
        <Badge variant="warning">
          <AlertTriangle className={iconSizeClass} />
          검토 필요
        </Badge>
      );
    case '차단':
      return (
        <Badge variant="danger" className="font-semibold">
          <ShieldX className={iconSizeClass} />
          차단
        </Badge>
      );

    // Approval Status
    case '승인':
      return (
        <Badge variant="success">
          <CheckCircle2 className={iconSizeClass} />
          승인
        </Badge>
      );
    case '반려':
      return (
        <Badge variant="danger">
          <XCircle className={iconSizeClass} />
          반려
        </Badge>
      );

    // Project Operation Status
    case '운영 중':
      return (
        <Badge variant="outline" className="border-emerald-500/25 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
          운영 중
        </Badge>
      );
    case '개발 중':
      return (
        <Badge variant="outline" className="border-sky-500/25 text-sky-700 dark:text-sky-400 bg-sky-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-1.5 inline-block" />
          개발 중
        </Badge>
      );
    case '유지보수':
      return (
        <Badge variant="outline" className="border-amber-500/25 text-amber-700 dark:text-amber-400 bg-amber-500/10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 inline-block" />
          유지보수
        </Badge>
      );
    case '보관(보류)':
      return (
        <Badge variant="neutral">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 mr-1.5 inline-block" />
          보관(보류)
        </Badge>
      );

    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
};
