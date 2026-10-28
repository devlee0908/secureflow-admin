import { Finding } from '@/types';

export interface SlaInfo {
  isResolved: boolean;
  isOverdue: boolean;
  isDDay: boolean;
  daysRemaining: number; // positive = remaining days, negative = overdue days
  label: string;
  badgeClass: string;
  policySlaDays: number;
}

export const getPolicySlaDays = (severity: string): number => {
  switch (severity) {
    case '치명적':
      return 3;
    case '높음':
      return 7;
    case '중간':
      return 30;
    case '낮음':
    default:
      return 90;
  }
};

export const calculateSlaStatus = (
  dueDateStr: string,
  status: string,
  severity: string,
  todayStr: string = '2026-10-02'
): SlaInfo => {
  const policySlaDays = getPolicySlaDays(severity);
  const isResolved = status === '해결' || status === '오탐' || status === '예외 승인';

  if (isResolved) {
    return {
      isResolved: true,
      isOverdue: false,
      isDDay: false,
      daysRemaining: 0,
      label: status === '해결' ? '조치 완료' : status === '오탐' ? '오탐 처리' : '예외 승인',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 font-medium',
      policySlaDays,
    };
  }

  const today = new Date(todayStr).getTime();
  const due = new Date(dueDateStr).getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((due - today) / msPerDay);

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      isResolved: false,
      isOverdue: true,
      isDDay: false,
      daysRemaining: diffDays,
      label: `D+${overdueDays}일 지연`,
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 font-semibold',
      policySlaDays,
    };
  }

  if (diffDays === 0) {
    return {
      isResolved: false,
      isOverdue: false,
      isDDay: true,
      daysRemaining: 0,
      label: '오늘 마감 (D-Day)',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 font-semibold',
      policySlaDays,
    };
  }

  if (diffDays <= 3) {
    return {
      isResolved: false,
      isOverdue: false,
      isDDay: false,
      daysRemaining: diffDays,
      label: `D-${diffDays}일 남음`,
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25 font-medium',
      policySlaDays,
    };
  }

  return {
    isResolved: false,
    isOverdue: false,
    isDDay: false,
    daysRemaining: diffDays,
    label: `D-${diffDays}일 남음`,
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-500/20 font-medium',
    policySlaDays,
  };
};
