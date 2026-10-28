import React, { useState, useMemo, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { useDevSecOps } from '@/context/DevSecOpsContext';
import { Breadcrumbs } from '@/components/layout/Breadcrumbs';
import { StatusBadge } from '@/components/common/StatusBadge';
import { GitHubPrChecksModal } from '@/components/projects/GitHubPrChecksModal';
import { AGENTGATE_ALL_SCAN_ISSUES } from '@/mock/mockData';
import { DataTablePagination } from '@/components/common/DataTablePagination';
import { DataTableColumnHeader } from '@/components/common/DataTableColumnHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Search,
  Eye,
  GitCommit,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  FileCheck2,
  Send,
  MessageSquare,
  AlertOctagon,
  Download,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { DeploymentReview, DeploymentEnvironment, SecurityVerdict, ApprovalStatus } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { downloadAuditReportHtml } from '@/lib/exportAuditReport';
import { toast } from 'sonner';
import { ActiveMenu } from '@/components/layout/Sidebar';

interface DeploymentReviewsViewProps {
  initialReviewId?: string;
  onNavigate?: (menu: ActiveMenu, filterState?: any) => void;
}

export const DeploymentReviewsView: React.FC<DeploymentReviewsViewProps> = ({
  initialReviewId,
  onNavigate,
}) => {
  const {
    reviews,
    findings,
    selectedEntityId,
    currentUser,
    policy,
    getProjectFindings,
    reviewDeployment,
    hasDummyData,
    generateDummyData,
    clearDummyData,
    simulateAgentGatePr,
    resolveAgentGateRemediation,
  } = useDevSecOps();

  // Only show authentic project reviews if hasDummyData is false
  const currentReviews = useMemo(() => {
    if (hasDummyData) return reviews;
    return reviews.filter(
      (r) => r.projectId === 'PRJ-AGENTGATE' || !r.projectId.startsWith('PRJ-0')
    );
  }, [reviews, hasDummyData]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [envFilter, setEnvFilter] = useState<string>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  const [approvalFilter, setApprovalFilter] = useState<string>('ALL');

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'requestedAt', desc: true },
  ]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Detail Sheet state
  const [detailReview, setDetailReview] = useState<DeploymentReview | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Review Dialog (승인 / 반려)
  const [isReviewActionOpen, setIsReviewActionOpen] = useState(false);
  const [reviewActionType, setReviewActionType] = useState<'승인' | '반려'>('승인');
  const [reviewComment, setReviewComment] = useState('');

  // Developer GitHub PR Preview Modal
  const [isPrModalOpen, setIsPrModalOpen] = useState(false);
  const [selectedPrReview, setSelectedPrReview] = useState<DeploymentReview | null>(null);

  // Sync initial review ID if passed
  useEffect(() => {
    if (initialReviewId) {
      const target = reviews.find((r) => r.id === initialReviewId);
      if (target) {
        setDetailReview(target);
        setIsDetailOpen(true);
      }
    }
  }, [initialReviewId, reviews]);

  // Keep detailReview and selectedPrReview up to date
  useEffect(() => {
    if (detailReview) {
      const updated = reviews.find((r) => r.id === detailReview.id);
      if (updated) setDetailReview(updated);
    }
  }, [reviews, detailReview?.id]);

  useEffect(() => {
    if (selectedPrReview) {
      const updated = reviews.find((r) => r.id === selectedPrReview.id);
      if (updated) setSelectedPrReview(updated);
    }
  }, [reviews, selectedPrReview?.id]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return currentReviews.filter((r) => {
      if (selectedEntityId !== 'ALL' && r.entityId !== selectedEntityId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchProj = r.projectName.toLowerCase().includes(q);
        const matchId = r.id.toLowerCase().includes(q);
        const matchReq = r.requester.toLowerCase().includes(q);
        const matchCommit = r.requestCommitId.toLowerCase().includes(q);
        if (!matchProj && !matchId && !matchReq && !matchCommit) return false;
      }

      if (envFilter !== 'ALL' && r.targetEnvironment !== envFilter) {
        return false;
      }

      if (verdictFilter !== 'ALL' && r.securityVerdict !== verdictFilter) {
        return false;
      }

      if (approvalFilter !== 'ALL' && r.approvalStatus !== approvalFilter) {
        return false;
      }

      return true;
    });
  }, [reviews, selectedEntityId, searchQuery, envFilter, verdictFilter, approvalFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setEnvFilter('ALL');
    setVerdictFilter('ALL');
    setApprovalFilter('ALL');
  };

  const handleOpenReviewAction = (type: '승인' | '반려') => {
    setReviewActionType(type);
    setReviewComment('');
    setIsReviewActionOpen(true);
  };

  const handleConfirmReview = async () => {
    if (!detailReview) return;
    if (!reviewComment.trim()) {
      toast.error('심사 의견(사유)을 반드시 입력해야 합니다.');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updatedReview: DeploymentReview = {
      ...detailReview,
      approvalStatus: reviewActionType,
      reviewer: currentUser.name,
      reviewComment: reviewComment.trim(),
      reviewedAt: nowStr,
    };

    setDetailReview(updatedReview);
    setSelectedPrReview(updatedReview);

    await reviewDeployment(detailReview.id, reviewActionType, reviewComment.trim());
    setIsReviewActionOpen(false);

    if (reviewActionType === '반려') {
      toast.error(`배포 심사 [${detailReview.id}] 건이 반려 처리되었습니다.`, {
        description: '개발자 GitHub PR 화면에 반려 코멘트 및 Checks 차단이 즉시 반영되었습니다.',
        action: {
          label: 'PR 화면 확인',
          onClick: () => {
            setSelectedPrReview(updatedReview);
            setIsPrModalOpen(true);
          },
        },
      });
    }
  };

  const handleDownloadAudit = (review: DeploymentReview) => {
    let issues: {
      tool: string;
      rule: string;
      severity: string;
      filePath: string;
      lineNumber: string | number;
      badCode: string;
      goodCode: string;
    }[] = AGENTGATE_ALL_SCAN_ISSUES;

    if (review.projectId !== 'PRJ-AGENTGATE') {
      const projFindings = findings.filter((f) => f.projectId === review.projectId);
      if (projFindings.length > 0) {
        issues = projFindings.map((f) => ({
          tool: f.tool,
          rule: `${f.title} (${f.scanType})`,
          severity: f.severity,
          filePath: f.filePath,
          lineNumber: f.lineNumber || 1,
          badCode: f.description || '// 취약한 레거시 구현 코드',
          goodCode: '// 시큐어 코딩 지침 및 보안 패치 적용 완료',
        }));
      }
    }

    downloadAuditReportHtml({
      projectName: review.projectName,
      projectId: review.projectId,
      repository:
        review.projectId === 'PRJ-AGENTGATE'
          ? 'github.com/devlee0908/agentgate'
          : `git.internal/${review.projectId}`,
      sourceBranch: 'fix/security-remediation',
      targetBranch: 'main',
      commitId: review.requestCommitId,
      author: review.requester,
      reviewer: review.reviewer || 'SECUREFLOW 보안 통제 게이트 (자동)',
      reviewComment: review.reviewComment || review.verdictReason,
      approvalStatus: review.approvalStatus,
      securityVerdict: review.securityVerdict,
      auditDate: review.requestedAt || new Date().toISOString().substring(0, 10),
      issues: issues.map((iss) => ({
        tool: iss.tool,
        rule: iss.rule,
        severity: iss.severity,
        filePath: iss.filePath,
        lineNumber: iss.lineNumber,
        badCode: iss.badCode,
        goodCode: iss.goodCode,
      })),
    });
    toast.success(`[${review.projectName}] ISMS-P & 전자금융감독규정 준수 감사 증적 보고서가 다운로드되었습니다.`);
  };

  // TanStack Columns
  const columns: ColumnDef<DeploymentReview>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="심사 ID" />,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex flex-col">
              <span
                onClick={() => {
                  setDetailReview(r);
                  setIsDetailOpen(true);
                }}
                className="font-mono font-bold text-xs text-indigo-600 hover:underline cursor-pointer"
              >
                {r.id}
              </span>
              <span className="text-[10px] text-slate-400">{r.requestedAt.slice(0, 16)}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'projectName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="프로젝트·법인" />,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{r.projectName}</div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{r.entityName}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'targetEnvironment',
        header: ({ column }) => <DataTableColumnHeader column={column} title="배포 환경" />,
        cell: ({ row }) => {
          const env = row.original.targetEnvironment;
          return (
            <Badge
              variant={
                env === '운영'
                  ? 'danger'
                  : env === '검증'
                  ? 'info'
                  : 'neutral'
              }
            >
              {env}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'requestCommitId',
        header: '배포 요청 커밋',
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-200 border border-zinc-200/80 dark:border-white/[0.08] px-2 py-0.5 rounded">
            {row.original.requestCommitId}
          </span>
        ),
      },
      {
        accessorKey: 'scanCommitId',
        header: '점검 커밋·일치',
        cell: ({ row }) => {
          const r = row.original;
          const isMatch = r.requestCommitId === r.scanCommitId;
          return (
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">{r.scanCommitId}</span>
              {isMatch ? (
                <span title="커밋 일치">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </span>
              ) : (
                <span title="커밋 불일치">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'securityVerdict',
        header: ({ column }) => <DataTableColumnHeader column={column} title="보안 정책 판정" />,
        cell: ({ row }) => <StatusBadge status={row.original.securityVerdict} size="sm" />,
      },
      {
        accessorKey: 'approvalStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title="승인 상태" />,
        cell: ({ row }) => <StatusBadge status={row.original.approvalStatus} size="sm" />,
      },
      {
        accessorKey: 'requester',
        header: ({ column }) => <DataTableColumnHeader column={column} title="요청자" />,
        cell: ({ row }) => (
          <span className="text-xs text-zinc-800 dark:text-zinc-200 font-medium">{row.original.requester}</span>
        ),
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => {
          const r = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setDetailReview(r);
                  setIsDetailOpen(true);
                }}
                title="상세 판정 및 심사 (관리자)"
                className="text-slate-600 hover:text-indigo-600"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setSelectedPrReview(r);
                  setIsPrModalOpen(true);
                }}
                title="개발자 GitHub PR 화면 확인 (미리보기)"
                className="text-slate-500 hover:text-indigo-600"
              >
                <GitPullRequest className="w-3.5 h-3.5" />
              </Button>
              {onNavigate && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => onNavigate('findings', { search: r.projectName })}
                  title="프로젝트 관련 보안 결함 목록 확인"
                  className="text-slate-500 hover:text-indigo-600"
                >
                  <Search className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => handleDownloadAudit(r)}
                title="ISMS-P 보안 감사 증적 보고서 다운로드"
                className="text-slate-500 hover:text-indigo-600"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
              </Button>
            </div>
          );
        },
      },
    ],
    [onNavigate, findings]
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  // Project findings for current detail review
  const projectActiveFindings = useMemo(() => {
    if (!detailReview) return [];
    return getProjectFindings(detailReview.projectId);
  }, [detailReview, getProjectFindings]);

  const unresolvedCriticalCount = projectActiveFindings.filter(
    (f) => f.severity === '치명적' && f.status !== '해결' && f.status !== '오탐' && f.status !== '예외 승인'
  ).length;

  const unresolvedHighCount = projectActiveFindings.filter(
    (f) => f.severity === '높음' && f.status !== '해결' && f.status !== '오탐' && f.status !== '예외 승인'
  ).length;

  const activeExceptions = projectActiveFindings.filter((f) => f.status === '예외 승인');

  const handleExportCsv = () => {
    const headers = [
      '심사 ID',
      '프로젝트명',
      '법인명',
      '배포 환경',
      '배포 요청 커밋',
      '점검 커밋',
      '커밋 일치 여부',
      '필수점검 완료',
      '보안 판정',
      '승인 상태',
      '요청자',
      '요청일시',
    ];
    const rows = filteredData.map((r) => [
      r.id,
      r.projectName,
      r.entityName,
      r.targetEnvironment,
      r.requestCommitId,
      r.scanCommitId,
      r.requestCommitId === r.scanCommitId ? '일치' : '불일치',
      r.requiredScansCompleted ? '완료' : '미완료',
      r.securityVerdict,
      r.approvalStatus,
      r.requester,
      r.requestedAt,
    ]);
    exportToCsv('배포심사_결과이력', headers, rows);
    toast.success('배포 심사 목록이 CSV 파일로 다운로드되었습니다.');
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="배포 심사 및 보안 게이트"
        subtitle="운영 및 검증 환경 배포 전, 필수 보안점검 완료 여부 및 커밋 일치성을 정책 규칙에 따라 자동 평가합니다."
        actionButtons={
          <div className="flex items-center gap-2">
            {hasDummyData ? (
              <Button
                variant="outline"
                size="sm"
                onClick={clearDummyData}
                className="h-8 text-xs border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
                title="기존 더미 파일들을 삭제하고 실제 연동된 프로젝트만 유지합니다"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                더미 파일 제거
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={generateDummyData}
                className="h-8 text-xs border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-white/[0.06]"
                title="테스트 및 시뮬레이션을 위한 샘플 더미 프로젝트를 즉시 생성합니다"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-zinc-500" />
                더미 파일 생성
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => simulateAgentGatePr('clean')}
              className="h-8 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium gap-1.5 shadow-none"
              title="결함 0건 클린 통과 PR #2 배포 심사 추가"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-emerald-600" />
              <span>클린 통과 PR #2 추가</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const target = detailReview || filteredData[0] || currentReviews[0];
                if (target) {
                  handleDownloadAudit(target);
                } else {
                  toast.info('다운로드할 배포 심사 대상이 없습니다.');
                }
              }}
              className="h-8 border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-white/[0.06] text-xs font-medium gap-1.5 shadow-none"
              title="ISMS-P 2.10 및 전자금융감독규정 제21조 준수 공식 보안 감사 증적 보고서(HTML)를 다운로드합니다"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-zinc-500" />
              ISMS-P 보안 감사 보고서
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="h-8 border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#121214] hover:bg-zinc-50 dark:hover:bg-white/[0.06] text-xs font-medium gap-1.5 shadow-none"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              심사 이력 CSV
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-[#0f0f11] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="프로젝트명, 심사 ID, 요청자, 커밋 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div>
            <Select value={envFilter} onValueChange={setEnvFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="배포 환경" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 환경</SelectItem>
                <SelectItem value="운영">운영 (Production)</SelectItem>
                <SelectItem value="검증">검증 (Staging)</SelectItem>
                <SelectItem value="개발">개발 (Development)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={verdictFilter} onValueChange={setVerdictFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="보안 판정" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 판정</SelectItem>
                <SelectItem value="통과">통과 (Pass)</SelectItem>
                <SelectItem value="검토 필요">검토 필요 (Review)</SelectItem>
                <SelectItem value="차단">차단 (Block)</SelectItem>
                <SelectItem value="미점검">미점검 (Unchecked)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="h-9 text-xs w-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] border-slate-200 dark:border-white/[0.1]"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              초기화
            </Button>
          </div>
        </div>
      </div>

      {/* TanStack Table Card */}
      <div className="rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md shadow-sm dark:shadow-xl overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <GitPullRequest className="w-10 h-10 mb-2 stroke-[1.2]" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">배포 심사(PR/MR) 요청 건이 없습니다</p>
                    <p className="text-xs text-slate-500 mt-1">프로젝트 관리에서 [⚡ 최초 전체 점검]을 완료하거나 상단의 [클린 통과 PR #2 추가]를 통해 배포 심사 게이트를 체험해보세요.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination table={table} />
      </div>

      {/* Review Detail Sheet (Section 4.5: 커밋 일치 여부, 필수점검 완료 여부, 미해결 발견사항, 보안 예외, 판정 근거, 승인/반려 의견) */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
          {detailReview && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {detailReview.id}
                    </Badge>
                    <Badge
                      className={
                        detailReview.targetEnvironment === '운영'
                          ? 'bg-rose-600 text-white font-bold'
                          : 'bg-indigo-600 text-white'
                      }
                    >
                      {detailReview.targetEnvironment} 환경 배포
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={detailReview.securityVerdict} size="sm" />
                    <StatusBadge status={detailReview.approvalStatus} size="sm" />
                  </div>
                </div>
                <SheetTitle className="text-xl font-bold mt-1 text-zinc-950 dark:text-zinc-50">
                  {detailReview.projectName} 배포 심사 게이트
                </SheetTitle>
                <SheetDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                  요청자: {detailReview.requester} · 요청일시: {detailReview.requestedAt}
                </SheetDescription>
              </SheetHeader>

              {/* 1. Commit Comparison Card (Requirement: 커밋 일치 여부 명확히 시각화) */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417] p-4 shadow-2xs space-y-3">
                <h4 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                  <GitCommit className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                  배포 요청 커밋 vs 보안점검 완료 커밋 비교
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08]">
                    <span className="text-[10px] text-zinc-500 block">배포 요청 커밋</span>
                    <span className="font-mono text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 block">
                      {detailReview.requestCommitId}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.08]">
                    <span className="text-[10px] text-zinc-500 block">보안점검 커밋</span>
                    <span className="font-mono text-xs font-bold text-zinc-950 dark:text-zinc-50 mt-0.5 block">
                      {detailReview.scanCommitId}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  {detailReview.requestCommitId === detailReview.scanCommitId ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900/50 text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>커밋 일치: 배포 대상 소스코드가 점검된 코드와 완벽히 일치합니다.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/50 text-xs font-medium">
                      <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>
                        커밋 불일치: 배포 요청 커밋과 점검 완료 커밋이 다릅니다! 동일 커밋 재점검 전까지 배포가 차단됩니다.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Policy Verdict Reason Card (판정 근거) */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141417] p-4 space-y-2 text-xs">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  보안 정책 평가 및 판정 근거
                </h4>
                <div className="p-3 rounded-lg bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-white/[0.08] leading-relaxed font-medium text-zinc-900 dark:text-zinc-100">
                  {detailReview.verdictReason}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                  <div>
                    필수 점검 4종 완료:{' '}
                    <strong>{detailReview.requiredScansCompleted ? '완료' : '미완료'}</strong>
                  </div>
                  <div>
                    점검 완료 시각: <span className="font-mono">{detailReview.scanCompletedAt}</span>
                  </div>
                </div>
              </div>

              {/* 3. Unresolved Findings in Project */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417] p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px]">
                    미해결 보안 결함 현황
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">치명적 {unresolvedCriticalCount}건</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">높음 {unresolvedHighCount}건</span>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {projectActiveFindings.filter((f) => f.status !== '해결').length === 0 ? (
                    <p className="text-zinc-400 py-2">미해결 결함이 없습니다.</p>
                  ) : (
                    projectActiveFindings
                      .filter((f) => f.status !== '해결')
                      .slice(0, 4)
                      .map((f) => (
                        <div
                          key={f.id}
                          className="p-2 rounded border border-zinc-100 dark:border-white/[0.06] bg-zinc-50/50 dark:bg-white/[0.02] flex items-center justify-between"
                        >
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate mr-2">
                            [{f.severity}] {f.title}
                          </span>
                          <StatusBadge status={f.status} size="sm" />
                        </div>
                      ))
                  )}
                </div>
                {onNavigate && detailReview && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsDetailOpen(false);
                      onNavigate('findings', { search: detailReview.projectName });
                    }}
                    className="w-full mt-2 text-xs font-semibold"
                  >
                    <Search className="w-3.5 h-3.5 mr-1.5" />
                    관련 원인 결함 {projectActiveFindings.length}건 확인 및 조치 현황
                  </Button>
                )}
              </div>

              {/* 4. Active Security Exceptions (유효한 보안 예외) */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#141417] p-4 space-y-2 text-xs">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  유효한 보안 예외 승인 건 ({activeExceptions.length}건)
                </h4>
                {activeExceptions.length === 0 ? (
                  <p className="text-zinc-400">등록된 유효 보안 예외가 없습니다.</p>
                ) : (
                  <div className="space-y-1.5">
                    {activeExceptions.map((ex) => (
                      <div
                        key={ex.id}
                        className="p-2.5 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200"
                      >
                        <div className="font-semibold">{ex.title}</div>
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                          사유: {ex.exceptionReason} (만료일: {ex.exceptionExpiresAt})
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Reviewer decision & Comment */}
              <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] p-4 space-y-3 text-xs bg-zinc-50/40 dark:bg-[#141417]">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  심사 의견 및 최종 이력
                </h4>
                {detailReview.reviewComment ? (
                  <div className="p-3 bg-white dark:bg-[#09090b] rounded-lg border border-zinc-200 dark:border-white/[0.08] space-y-1">
                    <div className="flex items-center justify-between text-zinc-500 text-[11px]">
                      <span>심사자: <strong>{detailReview.reviewer}</strong></span>
                      <span className="font-mono">{detailReview.reviewedAt}</span>
                    </div>
                    <p className="text-zinc-900 dark:text-zinc-100 font-medium leading-relaxed">
                      "{detailReview.reviewComment}"
                    </p>
                  </div>
                ) : (
                  <p className="text-zinc-400 italic">아직 심사 의견이 등록되지 않았습니다.</p>
                )}

                {/* Review action buttons (Requirement: 승인·반려에는 의견을 입력하게 하고 보안 판정 자체는 유지) */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenReviewAction('승인')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    배포 승인 처리
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenReviewAction('반려')}
                    className="border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />
                    배포 반려 처리
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadAudit(detailReview)}
                    className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold ml-auto gap-1.5 shadow-2xs"
                    title="해당 심사 건의 공식 ISMS-P 감사 증적 보고서 다운로드"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ISMS-P 감사 증적 다운로드</span>
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPrReview(detailReview);
                    setIsPrModalOpen(true);
                  }}
                  className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 font-semibold text-xs gap-1.5"
                  title="개발자의 GitHub PR 화면에서 봇 코멘트와 반려 상태가 어떻게 노출되는지 시뮬레이션 창을 엽니다"
                >
                  <GitPullRequest className="w-3.5 h-3.5" />
                  <span>개발자 GitHub PR 화면 확인 (미리보기)</span>
                </Button>

                <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Approve / Reject Dialog with Mandatory Comment */}
      <Dialog open={isReviewActionOpen} onOpenChange={setIsReviewActionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reviewActionType === '승인' ? '배포 심사 승인' : '배포 심사 반려'}
            </DialogTitle>
            <DialogDescription>
              {reviewActionType === '승인'
                ? '배포 승인 의견과 보안 검토 확인 사항을 입력해주세요. (주의: 승인 처리하더라도 보안 정책 판정 자체는 유지됩니다)'
                : '배포 반려 사유와 요구되는 보안 조치 사항을 입력해주세요.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="review-comment">
                심사 의견 <span className="text-rose-500">*</span>
              </Label>
              <textarea
                id="review-comment"
                rows={4}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={
                  reviewActionType === '승인'
                    ? '예: 결함 조치 계획서 검토 완료 및 릴리즈 핫픽스 조건부 배포 승인함.'
                    : '예: S3 버킷 ACL 및 SSH 포트 차단 조치가 검증되기 전까지 운영 배포 불가.'
                }
                className="w-full rounded-md border border-input p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReviewActionOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReview}
              className={
                reviewActionType === '승인'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }
            >
              {reviewActionType === '승인' ? '승인 확정' : '반려 확정'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Developer GitHub PR Preview Modal */}
      {(() => {
        const modalReview = selectedPrReview
          ? reviews.find((r) => r.id === selectedPrReview.id) || selectedPrReview
          : null;
        if (!modalReview) return null;

        return (
          <GitHubPrChecksModal
            isOpen={isPrModalOpen}
            onClose={() => setIsPrModalOpen(false)}
            prNumber={modalReview.id === 'REV-AGENTGATE-02' ? 2 : 1}
            prTitle={
              modalReview.id === 'REV-AGENTGATE-02'
                ? 'refactor(jwt): Redis 캐싱 토큰 검증 레이어 최적화'
                : 'fix(security): 소스코드 점검 취약점(3건) 자동 조치 및 보안 분석 리포트'
            }
            author={modalReview.requester}
            authorRole="선임 개발자 (클라우드개발실)"
            authorEmail={`${modalReview.requester}@github.internal`}
            sourceBranch={
              modalReview.id === 'REV-AGENTGATE-02' ? 'refactor/jwt-cache' : 'fix/security-remediation'
            }
            targetBranch="main"
            commitId={modalReview.requestCommitId}
            projectName={modalReview.projectName}
            repoFullName="devlee0908/agentgate"
            initialCheckStatus={modalReview.securityVerdict === '통과' ? 'passed' : 'failed'}
            isDeltaBaselineMode={true}
            baselineDebtCount={2}
            detectedIssues={AGENTGATE_ALL_SCAN_ISSUES}
            rejectionInfo={
              modalReview.approvalStatus === '반려'
                ? {
                    reviewer: modalReview.reviewer || '보안 심사관',
                    comment:
                      modalReview.reviewComment ||
                      '보안 정책 위반(SQL Injection 결함 미해결)으로 인해 운영 배포가 반려되었습니다.',
                    reviewedAt: modalReview.reviewedAt,
                  }
                : undefined
            }
            isInReviewsView={true}
            onSimulateFixPushed={() => {
              resolveAgentGateRemediation();
              toast.success(
                'AgentGate 신규 PR 수정 커밋 검증 완료! GitHub Checks가 성공(Green)으로 전환되었습니다.'
              );
            }}
          />
      );
    })()}
  </div>
  );
};
