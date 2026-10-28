import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { EntityId } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Clock,
  Sparkles,
  Layers,
  Award,
  Lock,
} from 'lucide-react';

interface AuditReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    entities,
    projects,
    scans,
    findings,
    reviews,
    policy,
    selectedEntityId,
  } = useDevSecOps();

  const [reportEntityId, setReportEntityId] = useState<EntityId | 'ALL'>(
    selectedEntityId
  );

  // Sync reportEntityId when selectedEntityId changes
  React.useEffect(() => {
    setReportEntityId(selectedEntityId);
  }, [selectedEntityId]);

  const isAll = reportEntityId === 'ALL';
  const targetEntity = isAll
    ? null
    : entities.find((e) => e.id === reportEntityId);

  const scopeProjects = projects.filter((p) =>
    isAll ? true : p.entityId === reportEntityId
  );
  const scopeScans = scans.filter((s) =>
    isAll ? true : s.entityId === reportEntityId
  );
  const scopeFindings = findings.filter((f) =>
    isAll ? true : f.entityId === reportEntityId
  );
  const scopeReviews = reviews.filter((r) =>
    isAll ? true : r.entityId === reportEntityId
  );

  // 1. Calculations for Compliance & Audit
  const totalProjects = scopeProjects.length;
  const scannedProjects = scopeProjects.filter((p) => {
    return scopeScans.some((s) => s.projectId === p.id && s.status === '완료');
  }).length;
  const scanCoverageRate =
    totalProjects > 0 ? Math.round((scannedProjects / totalProjects) * 100) : 0;

  // Gate Pass Rate
  const totalReviews = scopeReviews.length;
  const passedReviews = scopeReviews.filter((r) => r.securityVerdict === '통과').length;
  const gatePassRate =
    totalReviews > 0 ? Math.round((passedReviews / totalReviews) * 100) : 0;

  // Unresolved counts
  const critUnresolved = scopeFindings.filter(
    (f) =>
      f.severity === '치명적' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  const highUnresolved = scopeFindings.filter(
    (f) =>
      f.severity === '높음' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  const medUnresolved = scopeFindings.filter(
    (f) =>
      f.severity === '중간' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  const lowUnresolved = scopeFindings.filter(
    (f) =>
      f.severity === '낮음' &&
      f.status !== '해결' &&
      f.status !== '오탐' &&
      f.status !== '예외 승인'
  ).length;

  // Resolved count
  const resolvedFindings = scopeFindings.filter((f) => f.status === '해결').length;
  const resolutionRate =
    scopeFindings.length > 0
      ? Math.round((resolvedFindings / scopeFindings.length) * 100)
      : 100;

  // Active exceptions
  const activeExceptions = scopeFindings.filter((f) => f.status === '예외 승인');

  // Overall Compliance Health Score (0 ~ 100)
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        scanCoverageRate * 0.35 +
          gatePassRate * 0.25 +
          resolutionRate * 0.25 -
          critUnresolved * 15 -
          highUnresolved * 4 +
          15
      )
    )
  );

  const grade =
    healthScore >= 90
      ? 'A+'
      : healthScore >= 80
      ? 'A'
      : healthScore >= 70
      ? 'B'
      : healthScore >= 60
      ? 'C'
      : 'D';

  const gradeColor =
    healthScore >= 80
      ? 'text-emerald-600 border-emerald-300 bg-emerald-50'
      : healthScore >= 70
      ? 'text-indigo-600 border-indigo-300 bg-indigo-50'
      : healthScore >= 60
      ? 'text-amber-600 border-amber-300 bg-amber-50'
      : 'text-rose-600 border-rose-300 bg-rose-50';

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      '구분',
      '프로젝트명',
      '법인명',
      '심각도',
      '취약점 제목',
      '탐지도구',
      '조치상태',
      '담당자',
      '발견일',
      '조치기한',
    ];
    const rows = scopeFindings.map((f) => [
      '결함 내역',
      f.projectName,
      f.entityName,
      f.severity,
      f.title,
      f.tool,
      f.status,
      f.assignee,
      f.createdAt,
      f.dueDate,
    ]);
    exportToCsv(`보안감사_결함목록_${isAll ? '전체' : targetEntity?.code}`, headers, rows);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="border-b border-zinc-200/80 dark:border-white/[0.08] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                  DevSecOps 보안 감사 및 컴플라이언스 정기 보고서
                </DialogTitle>
                <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  ISMS-P, ISO 27001, 전자금융감독규정 준거성 점검용 공식 감사 증빙 요약본
                </DialogDescription>
              </div>
            </div>

            {/* Entity Selector */}
            <div className="flex items-center gap-2 print:hidden">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <div className="w-[180px]">
                <Select
                  value={reportEntityId}
                  onValueChange={(val) => setReportEntityId(val as EntityId | 'ALL')}
                >
                  <SelectTrigger className="h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 법인 통합 보고서</SelectItem>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Report Content Body */}
        <div className="space-y-6 pt-2 text-xs text-zinc-800 dark:text-zinc-200">
          {/* Executive Overview Header Card */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141417] p-4 sm:p-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-8 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono bg-white dark:bg-[#09090b] text-[11px]">
                    기준일자: 2026-10-02
                  </Badge>
                  <Badge variant="outline" className="bg-white dark:bg-[#09090b] text-[11px] font-semibold">
                    대상: {isAll ? '전체 계열사 (4개 법인)' : `${targetEntity?.name} (${targetEntity?.code})`}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                  {isAll ? '그룹 DevSecOps 종합 보안성 평가 결과' : `${targetEntity?.name} 개발 보안 감사 결과 요약`}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-[11px] leading-relaxed">
                  사내 Git 소스코드 정적 분석(SAST), 오픈소스 라이브러리 취약점(SCA), 비밀정보(Secret), 인프라 설정 오류(IaC) 4대 점검 파이프라인의 통합 실행 결과 및 배포 게이트 정책 준수 현황입니다.
                </p>
              </div>

              {/* Health Score & Grade */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#09090b] shadow-2xs text-center">
                <span className="text-[11px] text-zinc-500 font-medium">컴플라이언스 준수 점수</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold font-mono text-zinc-950 dark:text-zinc-50">
                    {healthScore}
                  </span>
                  <span className="text-xs text-zinc-400">/ 100점</span>
                </div>
                <div className={`mt-1.5 px-3 py-0.5 rounded-full border text-xs font-bold ${gradeColor}`}>
                  보안 등급 {grade}
                </div>
              </div>
            </div>
          </div>

          {/* 4 Key Audit Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417]">
              <span className="text-[11px] text-zinc-500 block">점검 적용률 (Coverage)</span>
              <span className="text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1 block">
                {scanCoverageRate}%
              </span>
              <span className="text-[10px] text-zinc-400">
                {scannedProjects} / {totalProjects}개 저장소
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417]">
              <span className="text-[11px] text-zinc-500 block">배포 게이트 통과율</span>
              <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
                {gatePassRate}%
              </span>
              <span className="text-[10px] text-zinc-400">
                {passedReviews} / {totalReviews}건 통과
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417]">
              <span className="text-[11px] text-zinc-500 block">미해결 치명적 결함</span>
              <span
                className={`text-xl font-bold font-mono mt-1 block ${
                  critUnresolved > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
                }`}
              >
                {critUnresolved}건
              </span>
              <span className="text-[10px] text-zinc-400">
                높음(High) {highUnresolved}건
              </span>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417]">
              <span className="text-[11px] text-zinc-500 block">전체 조치 완료율</span>
              <span className="text-xl font-bold font-mono text-zinc-950 dark:text-zinc-50 mt-1 block">
                {resolutionRate}%
              </span>
              <span className="text-[10px] text-zinc-400">
                {resolvedFindings}건 조치 완료
              </span>
            </div>
          </div>

          {/* Compliance Framework Checklist */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] p-4 space-y-3 bg-white dark:bg-[#141417]">
            <h4 className="font-bold text-zinc-950 dark:text-zinc-50 text-xs flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
              대외 컴플라이언스 및 표준 규정 준거성 진단
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] flex items-start justify-between">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    전자금융감독규정 제21조 (소스코드 보안성 검토)
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    운영 배포 전 정적 분석(SAST) 및 결함 조치 의무 충족
                  </p>
                </div>
                <Badge variant="success" className="text-[10px] shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  적합 (Pass)
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] flex items-start justify-between">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    KISA ISMS-P 2.10.1 (개발 보안 및 형상관리)
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    배포 요청 커밋과 점검 완료 커밋의 일치성 검증 체계
                  </p>
                </div>
                <Badge variant="success" className="text-[10px] shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  적합 (Pass)
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] flex items-start justify-between">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    ISO/IEC 27001 A.14 (시스템 개발 및 유지보수)
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    오픈소스 라이브러리(SCA) 및 클라우드 IaC 보안 결함 관리
                  </p>
                </div>
                <Badge variant="success" className="text-[10px] shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  적합 (Pass)
                </Badge>
              </div>

              <div className="p-2.5 rounded-lg border border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] flex items-start justify-between">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    OWASP Top 10 2021 보안 위험 통제
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    SQL Injection, Hardcoded Secrets 등 주요 결함 탐지 및 차단
                  </p>
                </div>
                <Badge variant="success" className="text-[10px] shrink-0">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  적합 (Pass)
                </Badge>
              </div>
            </div>
          </div>

          {/* Active Security Exceptions Section */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] p-4 space-y-3 bg-white dark:bg-[#141417]">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-zinc-950 dark:text-zinc-50 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                승인된 보안 예외(Exception) 감사 대장 ({activeExceptions.length}건)
              </h4>
              <span className="text-[11px] text-zinc-400">
                정책: 만료일 도래 시 자동 효력 상실
              </span>
            </div>

            {activeExceptions.length === 0 ? (
              <p className="text-xs text-zinc-400 py-2">
                현재 승인된 보안 예외 항목이 없습니다. (모든 결함 표준 통제 적용 중)
              </p>
            ) : (
              <div className="space-y-2">
                {activeExceptions.map((ex) => (
                  <div
                    key={ex.id}
                    className="p-2.5 rounded-lg border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <span>{ex.title}</span>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {ex.projectName}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                        승인 사유: {ex.exceptionReason || '비즈니스 긴급 배포 승인'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        담당자: <strong>{ex.assignee}</strong>
                      </span>
                      <span className="text-amber-700 dark:text-amber-400 font-mono font-semibold">
                        만료: {ex.exceptionExpiresAt || '2026-11-30'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="text-[11px] text-slate-400">
            * 본 보고서는 SecureFlow DevSecOps 감사 로그 데이터에 기반하여 실시간 생성되었습니다.
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              감사 결함 CSV 다운로드
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              보고서 인쇄 / PDF 저장
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
