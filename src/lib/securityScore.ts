import { Finding } from '@/types';

export type SecurityGrade = 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface ProjectSecurityScore {
  score: number; // 0 ~ 100
  grade: SecurityGrade;
  gradeColor: {
    text: string;
    bg: string;
    border: string;
    badge: string;
  };
  gradeLabel: string;
  slaComplianceRate: number; // 0 ~ 100%
  breakdown: {
    critDeduction: number;
    highDeduction: number;
    medDeduction: number;
    overdueDeduction: number;
    critCount: number;
    highCount: number;
    medCount: number;
    overdueCount: number;
    totalFindings: number;
    resolvedCount: number;
  };
}

export const calculateProjectSecurityScore = (
  projectId: string,
  allFindings: Finding[],
  todayStr: string = '2026-10-02'
): ProjectSecurityScore => {
  const projectFindings = allFindings.filter((f) => f.projectId === projectId);
  const totalFindings = projectFindings.length;

  const unresolved = projectFindings.filter(
    (f) => f.status !== '해결' && f.status !== '오탐' && f.status !== '예외 승인'
  );
  const resolved = projectFindings.filter(
    (f) => f.status === '해결' || f.status === '오탐' || f.status === '예외 승인'
  );

  const critFindings = unresolved.filter((f) => f.severity === '치명적');
  const highFindings = unresolved.filter((f) => f.severity === '높음');
  const medFindings = unresolved.filter((f) => f.severity === '중간');
  const overdueFindings = unresolved.filter((f) => f.dueDate < todayStr);

  const critCount = critFindings.length;
  const highCount = highFindings.length;
  const medCount = medFindings.length;
  const overdueCount = overdueFindings.length;

  // Deductions calculation (Max 100 scale)
  const critDeduction = Math.min(50, critCount * 25);
  const highDeduction = Math.min(40, highCount * 12);
  const medDeduction = Math.min(20, medCount * 3);
  const overdueDeduction = Math.min(25, overdueCount * 5);

  const totalDeductions = critDeduction + highDeduction + medDeduction + overdueDeduction;
  const rawScore = 100 - totalDeductions;
  const score = Math.max(0, Math.min(100, rawScore));

  // SLA Compliance Rate
  let slaComplianceRate = 100;
  if (totalFindings > 0) {
    slaComplianceRate = Math.round(((totalFindings - overdueCount) / totalFindings) * 100);
  }

  // Determine Grade
  let grade: SecurityGrade = 'F';
  let gradeLabel = '위험 (배포 차단 권고)';
  let gradeColor = {
    text: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
  };

  if (score >= 95) {
    grade = 'A+';
    gradeLabel = '최우수 (무결점 클린)';
    gradeColor = {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  } else if (score >= 88) {
    grade = 'A';
    gradeLabel = '우수 (배포 권장)';
    gradeColor = {
      text: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
  } else if (score >= 80) {
    grade = 'B';
    gradeLabel = '양호 (보통)';
    gradeColor = {
      text: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-300',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
  } else if (score >= 70) {
    grade = 'C';
    gradeLabel = '주의 (개선 권고)';
    gradeColor = {
      text: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
    };
  } else if (score >= 60) {
    grade = 'D';
    gradeLabel = '경고 (고위험 잔존)';
    gradeColor = {
      text: 'text-orange-700',
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      badge: 'bg-orange-100 text-orange-800 border-orange-200',
    };
  }

  return {
    score,
    grade,
    gradeLabel,
    gradeColor,
    slaComplianceRate,
    breakdown: {
      critDeduction,
      highDeduction,
      medDeduction,
      overdueDeduction,
      critCount,
      highCount,
      medCount,
      overdueCount,
      totalFindings,
      resolvedCount: resolved.length,
    },
  };
};
