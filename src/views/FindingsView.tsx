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
import { SeverityBadge } from '@/components/common/SeverityBadge';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  ShieldAlert,
  Search,
  RotateCcw,
  UserCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Eye,
  Play,
  Clock,
  History,
  Info,
  Lock,
  FileCode,
  Download,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Finding, SeverityLevel, FindingStatus } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { SlaCountdownBadge } from '@/components/common/SlaCountdownBadge';
import { calculateSlaStatus } from '@/lib/slaCalculator';
import { ExploitSimulatorModal, ExploitIssueData } from '@/components/common/ExploitSimulatorModal';
import { api } from '@/services/api';
import { toast } from 'sonner';

interface FindingsViewProps {
  initialFilter?: {
    severity?: string;
    filter?: string;
    findingId?: string;
    search?: string;
  };
}

export const FindingsView: React.FC<FindingsViewProps> = ({ initialFilter }) => {
  const {
    findings,
    selectedEntityId,
    currentUser,
    updateFindingAssigneeAndDueDate,
    batchUpdateAssignee,
    markAsFalsePositive,
    requestSecurityException,
    simulateRescanFinding,
  } = useDevSecOps();

  // Filters state
  const [searchQuery, setSearchQuery] = useState(initialFilter?.search || '');
  const [severityFilter, setSeverityFilter] = useState<string>(
    initialFilter?.severity === 'HIGH_CRITICAL' ? 'HIGH_CRITICAL' : 'ALL'
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(initialFilter?.filter === 'overdue');

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Detail Sheet state
  const [detailFinding, setDetailFinding] = useState<Finding | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // False Positive Dialog
  const [isFpDialogOpen, setIsFpDialogOpen] = useState(false);
  const [fpReason, setFpReason] = useState('');

  // Security Exception Dialog
  const [isExceptionDialogOpen, setIsExceptionDialogOpen] = useState(false);
  const [exceptionReason, setExceptionReason] = useState('');
  const [exceptionExpiry, setExceptionExpiry] = useState('2026-11-30');

  // Batch Assignee Dialog
  const [isBatchAssigneeOpen, setIsBatchAssigneeOpen] = useState(false);
  const [batchAssigneeName, setBatchAssigneeName] = useState('');

  // Batch False Positive Dialog
  const [isBatchFpOpen, setIsBatchFpOpen] = useState(false);
  const [batchFpReason, setBatchFpReason] = useState('');

  // Edit Assignee & Due Date in Sheet
  const [editAssignee, setEditAssignee] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [isRescanning, setIsRescanning] = useState(false);
  const [exploitTargetFinding, setExploitTargetFinding] = useState<ExploitIssueData | null>(null);
  const [isExploitModalOpen, setIsExploitModalOpen] = useState(false);

  // Sync initial search or findingId if passed from outside
  useEffect(() => {
    if (initialFilter?.search !== undefined) {
      setSearchQuery(initialFilter.search);
    }
    if (initialFilter?.findingId) {
      const target = findings.find((f) => f.id === initialFilter.findingId);
      if (target) {
        setDetailFinding(target);
        setIsDetailOpen(true);
      }
    }
  }, [initialFilter, findings]);

  // Keep detailFinding updated when store changes
  useEffect(() => {
    if (detailFinding) {
      const updated = findings.find((f) => f.id === detailFinding.id);
      if (updated) {
        setDetailFinding(updated);
        setEditAssignee(updated.assignee);
        setEditDueDate(updated.dueDate);
      }
    }
  }, [findings, detailFinding?.id]);

  // Reset selection on filter or entity changes
  useEffect(() => {
    setRowSelection({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedEntityId, searchQuery, severityFilter, statusFilter, assigneeFilter, onlyOverdue]);

  // Extract distinct assignees for filter
  const distinctAssignees = useMemo(() => {
    const set = new Set<string>();
    findings.forEach((f) => {
      if (f.assignee) set.add(f.assignee);
    });
    return Array.from(set);
  }, [findings]);

  // Filtered dataset
  const todayStr = '2026-10-02';
  const filteredData = useMemo(() => {
    return findings.filter((f) => {
      if (selectedEntityId !== 'ALL' && f.entityId !== selectedEntityId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(q);
        const matchProj = f.projectName.toLowerCase().includes(q);
        const matchPath = f.filePath.toLowerCase().includes(q);
        const matchAssignee = f.assignee.toLowerCase().includes(q);
        if (!matchTitle && !matchProj && !matchPath && !matchAssignee) return false;
      }

      if (severityFilter === 'HIGH_CRITICAL') {
        if (f.severity !== '치명적' && f.severity !== '높음') return false;
      } else if (severityFilter !== 'ALL' && f.severity !== severityFilter) {
        return false;
      }

      if (statusFilter !== 'ALL' && f.status !== statusFilter) {
        return false;
      }

      if (assigneeFilter !== 'ALL' && f.assignee !== assigneeFilter) {
        return false;
      }

      if (onlyOverdue) {
        if (f.status === '해결' || f.status === '오탐' || f.status === '예외 승인') return false;
        if (f.dueDate >= todayStr) return false;
      }

      if (startDate && f.createdAt < startDate) return false;
      if (endDate && f.createdAt > endDate) return false;

      return true;
    });
  }, [
    findings,
    selectedEntityId,
    searchQuery,
    severityFilter,
    statusFilter,
    assigneeFilter,
    onlyOverdue,
    startDate,
    endDate,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSeverityFilter('ALL');
    setStatusFilter('ALL');
    setAssigneeFilter('ALL');
    setOnlyOverdue(false);
    setStartDate('');
    setEndDate('');
  };

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  const handleBatchAssign = async () => {
    if (!batchAssigneeName.trim()) {
      toast.error('담당자 이름을 입력해주세요.');
      return;
    }
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    await batchUpdateAssignee(ids, batchAssigneeName.trim());
    setIsBatchAssigneeOpen(false);
    setBatchAssigneeName('');
    setRowSelection({});
  };

  const handleConfirmBatchFp = async () => {
    if (!batchFpReason.trim()) {
      toast.error('오탐 제외 사유를 반드시 입력해주세요.');
      return;
    }
    const ids = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    for (const id of ids) {
      await markAsFalsePositive(id, batchFpReason.trim());
    }
    // Record in immutable audit log
    await api.recordAuditLog({
      actorName: currentUser.name,
      actorId: currentUser.id,
      actorRole: currentUser.roleTitle,
      actionType: 'BATCH_FALSE_POSITIVE',
      category: 'SECURITY_GATE',
      targetResource: `${ids.length}건 결함 일괄 오탐 제외`,
      details: { count: ids.length, ids, reason: batchFpReason.trim() },
      resultStatus: '성공',
    });
    setIsBatchFpOpen(false);
    setBatchFpReason('');
    setRowSelection({});
    toast.success(`${ids.length}건의 결함이 일괄 오탐(False Positive)으로 처리되고 감사 로그에 영구 기록되었습니다.`);
  };

  const handleExportSelectedCsv = () => {
    const ids = new Set(Object.keys(rowSelection).filter((k) => rowSelection[k]));
    const selectedData = findings.filter((f) => ids.has(f.id));
    if (selectedData.length === 0) return;

    const headers = [
      '결함 ID', '제목', '심각도', '조치 상태', '프로젝트', '소속 법인', '코드 위치', '탐지 도구', '담당자', '조치기한'
    ];
    const rows = selectedData.map((f) => [
      f.id, f.title, f.severity, f.status, f.projectName, f.entityName,
      `${f.filePath}${f.lineNumber ? ` (${f.lineNumber})` : ''}`, f.tool, f.assignee, f.dueDate
    ]);
    exportToCsv(`SecureFlow_선택결함_${selectedData.length}건`, headers, rows);
    toast.success(`선택된 ${selectedData.length}건의 취약점 보고서를 CSV로 다운로드했습니다.`);
  };

  const handleBatchJiraIssue = () => {
    const ids = new Set(Object.keys(rowSelection).filter((k) => rowSelection[k]));
    const selectedData = findings.filter((f) => ids.has(f.id));
    if (selectedData.length === 0) return;

    const markdownTicket = `# 🛡️ SecureFlow 보안 취약점 조치 일괄 티켓 (${selectedData.length}건)
- 발행 일시: ${new Date().toLocaleString()}
- 요청자: ${currentUser.name} (${currentUser.roleTitle})

## 📋 대상 결함 목록
${selectedData.map((f, i) => `${i + 1}. **[${f.severity}]** ${f.title} (${f.id}) - \`${f.filePath}:${f.lineNumber || 1}\` (담당: ${f.assignee})`).join('\n')}

> Generated by SecureFlow Bulk Action Dispatcher`;

    navigator.clipboard.writeText(markdownTicket);
    toast.success(`선택된 ${selectedData.length}건의 통합 Jira/GitHub 이슈 마크다운이 클립보드에 복사되었습니다!`);
  };

  const handleSaveAssigneeDueDate = async () => {
    if (!detailFinding) return;
    await updateFindingAssigneeAndDueDate(detailFinding.id, editAssignee, editDueDate);
  };

  const handleOpenFpDialog = () => {
    setFpReason('');
    setIsFpDialogOpen(true);
  };

  const handleConfirmFp = async () => {
    if (!detailFinding) return;
    if (!fpReason.trim()) {
      toast.error('오탐 사유를 반드시 입력해야 합니다.');
      return;
    }
    await markAsFalsePositive(detailFinding.id, fpReason.trim());
    setIsFpDialogOpen(false);
  };

  const handleOpenExceptionDialog = () => {
    setExceptionReason('');
    setExceptionExpiry('2026-11-30');
    setIsExceptionDialogOpen(true);
  };

  const handleConfirmException = async () => {
    if (!detailFinding) return;
    if (!exceptionReason.trim()) {
      toast.error('보안 예외 사유를 입력해야 합니다.');
      return;
    }
    await requestSecurityException(detailFinding.id, exceptionReason.trim(), exceptionExpiry);
    setIsExceptionDialogOpen(false);
  };

  const handleRescan = async () => {
    if (!detailFinding) return;
    setIsRescanning(true);
    await simulateRescanFinding(detailFinding.id);
    setIsRescanning(false);
  };

  // TanStack Columns
  const columns: ColumnDef<Finding>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
            }
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
            aria-label="전체 선택"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(!!val)}
            aria-label="행 선택"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'title',
        header: ({ column }) => <DataTableColumnHeader column={column} title="취약점·결함 제목" />,
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="flex flex-col max-w-[280px]">
              <span
                onClick={() => {
                  setDetailFinding(f);
                  setEditAssignee(f.assignee);
                  setEditDueDate(f.dueDate);
                  setIsDetailOpen(true);
                }}
                className="font-semibold text-xs text-slate-900 hover:text-indigo-600 cursor-pointer truncate"
                title={f.title}
              >
                {f.title}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{f.id}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'severity',
        header: ({ column }) => <DataTableColumnHeader column={column} title="심각도" />,
        cell: ({ row }) => <SeverityBadge severity={row.original.severity} size="sm" />,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="조치 상태" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
      },
      {
        accessorKey: 'projectName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="프로젝트·법인" />,
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-800">{f.projectName}</div>
              <div className="text-[11px] text-slate-500">{f.entityName}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'filePath',
        header: '코드 위치 / 패키지',
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="max-w-[200px]">
              <div className="font-mono text-[11px] text-slate-700 truncate" title={f.filePath}>
                {f.filePath}
              </div>
              {f.lineNumber && (
                <span className="text-[10px] text-slate-400 font-mono">{f.lineNumber}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'tool',
        header: '점검 도구',
        cell: ({ row }) => (
          <div>
            <div className="text-xs text-slate-800 font-medium">{row.original.tool}</div>
            <div className="text-[10px] text-slate-400">{row.original.scanType}</div>
          </div>
        ),
      },
      {
        accessorKey: 'assignee',
        header: ({ column }) => <DataTableColumnHeader column={column} title="담당자" />,
        cell: ({ row }) => (
          <span className="text-xs text-slate-800 font-medium">{row.original.assignee}</span>
        ),
      },
      {
        accessorKey: 'dueDate',
        header: ({ column }) => <DataTableColumnHeader column={column} title="조치기한 (SLA)" />,
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="flex flex-col gap-1 items-start">
              <SlaCountdownBadge
                dueDate={f.dueDate}
                status={f.status}
                severity={f.severity}
                todayStr={todayStr}
              />
              <span className="font-mono text-[10px] text-slate-400 pl-0.5">
                기한: {f.dueDate}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => {
          const f = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setDetailFinding(f);
                  setEditAssignee(f.assignee);
                  setEditDueDate(f.dueDate);
                  setIsDetailOpen(true);
                }}
                title="상세 보기 및 조치"
                className="text-slate-600 hover:text-indigo-600"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setExploitTargetFinding({
                    tool: f.tool,
                    rule: f.title,
                    severity: f.severity as any,
                    filePath: f.filePath,
                    lineNumber: f.lineNumber || 1,
                    badCode: f.codeSnippet || f.description,
                    goodCode: f.remediationGuide || '시큐어 코딩 파라미터화 쿼리 및 보안 라이브러리 업그레이드',
                    guide: f.remediationGuide || f.description,
                  });
                  setIsExploitModalOpen(true);
                }}
                title="AI 공격 PoC 시뮬레이터 실행"
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  const handleExportCsv = () => {
    const headers = [
      '결함 ID',
      '제목',
      '심각도',
      '조치 상태',
      '프로젝트',
      '소속 법인',
      '코드 위치 / 패키지',
      '탐지 도구',
      '점검 유형',
      '담당자',
      '최초 발견일',
      '조치기한',
    ];
    const rows = filteredData.map((f) => [
      f.id,
      f.title,
      f.severity,
      f.status,
      f.projectName,
      f.entityName,
      `${f.filePath}${f.lineNumber ? ` (${f.lineNumber})` : ''}`,
      f.tool,
      f.scanType,
      f.assignee,
      f.createdAt,
      f.dueDate,
    ]);
    exportToCsv('SecureFlow_취약점_조치_보고서', headers, rows);
    toast.success(`현재 필터링된 ${filteredData.length}건의 취약점 보고서를 CSV로 다운로드했습니다.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="취약점·발견사항 관리"
        subtitle="보안 스캐너가 탐지한 취약점, 시크릿 노출, IaC 설정 오류를 검토하고 조치 및 예외 승인을 수행합니다."
        actionButtons={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="text-xs text-slate-700 hover:bg-slate-100"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              CSV 보고서 다운로드
            </Button>
            {selectedCount > 0 && (
              <Button
                size="sm"
                onClick={() => setIsBatchAssigneeOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                <UserCheck className="w-4 h-4 mr-1.5" />
                선택 {selectedCount}건 일괄 담당자 지정
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md p-4 shadow-sm dark:shadow-xl space-y-3">
        {/* Smart Quick Filter Chips (Enterprise Feature) */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.04]">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            스마트 필터:
          </span>
          <button
            onClick={() => handleResetFilters()}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              severityFilter === 'ALL' && statusFilter === 'ALL' && !onlyOverdue && assigneeFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/[0.1]'
            }`}
          >
            전체 결함 ({findings.length})
          </button>
          <button
            onClick={() => {
              setSeverityFilter('HIGH_CRITICAL');
              setOnlyOverdue(false);
              setAssigneeFilter('ALL');
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1 ${
              severityFilter === 'HIGH_CRITICAL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            긴급 조치 (Critical &amp; High)
          </button>
          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1 ${
              onlyOverdue
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            SLA 초과 경과 건만
          </button>
          <button
            onClick={() => setAssigneeFilter(currentUser.name)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1 ${
              assigneeFilter === currentUser.name
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-950/60'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            내게 할당된 결함
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="제목, 파일 경로, 프로젝트명, 담당자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Severity filter */}
          <div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="심각도" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 심각도</SelectItem>
                <SelectItem value="HIGH_CRITICAL">긴급 조치 대상 (Critical &amp; High)</SelectItem>
                <SelectItem value="치명적">치명적 (Critical)</SelectItem>
                <SelectItem value="높음">높음 (High)</SelectItem>
                <SelectItem value="중간">중간 (Medium)</SelectItem>
                <SelectItem value="낮음">낮음 (Low)</SelectItem>
                <SelectItem value="정보">정보 (Info)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status filter */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="조치 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 상태</SelectItem>
                <SelectItem value="신규">신규</SelectItem>
                <SelectItem value="검토 중">검토 중</SelectItem>
                <SelectItem value="조치 중">조치 중</SelectItem>
                <SelectItem value="해결">해결 완료</SelectItem>
                <SelectItem value="오탐">오탐 (False Positive)</SelectItem>
                <SelectItem value="예외 승인">예외 승인</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee filter */}
          <div>
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="담당자" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 담당자</SelectItem>
                {distinctAssignees.map((assignee) => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset button */}
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

        {/* Date and Quick Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/80 dark:border-white/[0.06] text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span className="font-medium">발견일자 기간:</span>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36 h-8 text-xs"
            />
            <span className="text-slate-400">~</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36 h-8 text-xs"
            />
          </div>

          <button
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              onlyOverdue
                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-300 dark:hover:bg-white/[0.08]'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            조치기한 경과 결함만 모아보기
          </button>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
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
                    <ShieldAlert className="w-10 h-10 mb-2 stroke-[1.2]" />
                    <p className="font-semibold text-slate-700 text-sm">해당 조건의 취약점·결함이 없습니다</p>
                    <p className="text-xs text-slate-500 mt-1">필터 조건을 재설정하거나 초기화해보세요.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination table={table} selectedRowsCount={selectedCount} />
      </div>

      {/* Floating Bulk Action Dock (Enterprise Feature) */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900/95 dark:bg-[#121824]/95 text-white backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/80 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 border-r border-slate-700 pr-3 mr-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="font-bold text-xs whitespace-nowrap">
              <strong className="text-indigo-400 font-mono text-sm mr-1">{selectedCount}</strong>
              건 선택됨
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsBatchAssigneeOpen(true)}
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium gap-1.5 shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              일괄 담당자 지정
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBatchFpReason('');
                setIsBatchFpOpen(true);
              }}
              className="h-8 text-xs border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
            >
              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
              일괄 오탐(FP) 제외
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchJiraIssue}
              className="h-8 text-xs border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
              Jira/GitHub 티켓 복사
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportSelectedCsv}
              className="h-8 text-xs border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              선택 건 CSV
            </Button>
          </div>

          <div className="border-l border-slate-700 pl-3 ml-1 shrink-0">
            <button
              onClick={() => setRowSelection({})}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* Finding Detail Sheet (Section 4.4) */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
          {detailFinding && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">
                    {detailFinding.id}
                  </span>
                  <SeverityBadge severity={detailFinding.severity} size="sm" />
                  <StatusBadge status={detailFinding.status} size="sm" />
                </div>
                <SheetTitle className="text-lg font-bold text-slate-900 mt-1">
                  {detailFinding.title}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  {detailFinding.projectName} ({detailFinding.entityName}) · 점검 ID {detailFinding.scanRunId}
                </SheetDescription>
              </SheetHeader>

              {/* Action Toolbar for Finding (오탐 처리, 예외 승인, 재점검, AI PoC) */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <Button
                  size="sm"
                  onClick={() => {
                    setExploitTargetFinding({
                      tool: detailFinding.tool,
                      rule: detailFinding.title,
                      severity: detailFinding.severity as any,
                      filePath: detailFinding.filePath,
                      lineNumber: detailFinding.lineNumber || 1,
                      badCode: detailFinding.codeSnippet || detailFinding.description,
                      goodCode: detailFinding.remediationGuide || '시큐어 코딩 파라미터화 쿼리 및 보안 라이브러리 업그레이드',
                      guide: detailFinding.remediationGuide || detailFinding.description,
                    });
                    setIsExploitModalOpen(true);
                  }}
                  className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ AI 공격 PoC 시뮬레이터</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRescan}
                  disabled={isRescanning}
                  className="h-8 text-xs text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50"
                >
                  <Play className={`w-3 h-3 mr-1 ${isRescanning ? 'animate-spin' : ''}`} />
                  {isRescanning ? '재점검 분석 중...' : '재점검 시뮬레이션'}
                </Button>

                {detailFinding.status !== '오탐' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenFpDialog}
                    className="h-8 text-xs text-slate-700 hover:bg-slate-100"
                  >
                    오탐(False Positive) 처리
                  </Button>
                )}

                {detailFinding.status !== '예외 승인' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenExceptionDialog}
                    className="h-8 text-xs text-purple-700 border-purple-200 bg-purple-50/50 hover:bg-purple-100"
                  >
                    <FileCheck className="w-3.5 h-3.5 mr-1" />
                    보안 예외 승인
                  </Button>
                )}
              </div>

              {/* 1. Description and Analysis Reasoning */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-2 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  설명 및 탐지 근거
                </h4>
                <p className="text-slate-600 leading-relaxed">{detailFinding.description}</p>
                <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-500 border-t border-slate-100 mt-2">
                  <span>탐지 도구: <strong>{detailFinding.tool}</strong></span>
                  <span>점검 유형: <strong>{detailFinding.scanType}</strong></span>
                  <span>발견 커밋: <code className="font-mono">{detailFinding.commitId}</code></span>
                </div>
              </div>

              {/* 2. Code Location or Masked Secret or Package Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-900 text-slate-100 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-mono text-[11px] flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                    {detailFinding.filePath}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {detailFinding.lineNumber}
                  </span>
                </div>

                {detailFinding.codeSnippet && (
                  <pre className="font-mono text-[11px] text-emerald-300 overflow-x-auto p-2 bg-slate-950 rounded">
                    {detailFinding.codeSnippet}
                  </pre>
                )}

                {detailFinding.maskedSecret && (
                  <div className="mt-2 p-2.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300">
                    <span className="font-bold text-[10px] flex items-center gap-1 mb-1">
                      <Lock className="w-3 h-3" /> 마스킹된 비밀정보 값 (보안 규정 준수)
                    </span>
                    <code className="font-mono text-[11px] block">{detailFinding.maskedSecret}</code>
                  </div>
                )}
              </div>

              {/* 3. Remediation Guide */}
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-4 space-y-2 text-xs">
                <h4 className="font-bold text-emerald-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  보안 조치 가이드 (Remediation)
                </h4>
                <p className="text-emerald-950 leading-relaxed font-medium">
                  {detailFinding.remediationGuide}
                </p>
              </div>

              {/* 4. Assignee, Due Date & Rescan Result */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    담당자 및 조치 일정 관리 (SLA)
                  </h4>
                  <SlaCountdownBadge
                    dueDate={detailFinding.dueDate}
                    status={detailFinding.status}
                    severity={detailFinding.severity}
                    todayStr={todayStr}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-assignee">담당자</Label>
                    <Input
                      id="edit-assignee"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-due">조치기한</Label>
                    <Input
                      id="edit-due"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500">
                    재점검 판정 상태:{' '}
                    <strong className="text-slate-800 font-semibold">
                      {detailFinding.rescanResult || '미실행'}
                    </strong>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveAssigneeDueDate}
                    className="h-7 text-xs"
                  >
                    담당자/기한 저장
                  </Button>
                </div>
              </div>

              {/* 5. Special Status Details (False Positive or Exception) */}
              {detailFinding.status === '오탐' && detailFinding.falsePositiveReason && (
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-700">오탐 판정 사유:</span>
                  <p className="text-slate-600 leading-relaxed">{detailFinding.falsePositiveReason}</p>
                </div>
              )}

              {detailFinding.status === '예외 승인' && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 text-xs space-y-1">
                  <span className="font-bold text-purple-900">
                    보안 예외 사유 (만료일: {detailFinding.exceptionExpiresAt}):
                  </span>
                  <p className="text-purple-800 leading-relaxed">{detailFinding.exceptionReason}</p>
                </div>
              )}

              {/* 6. Change History (Audit trail) */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-600" />
                  변경 이력 (Audit Trail)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {detailFinding.history.map((hist, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-50 border border-slate-100 text-[11px]"
                    >
                      <div className="flex items-center justify-between text-slate-500 mb-0.5">
                        <span className="font-semibold text-slate-700">{hist.actor}</span>
                        <span className="font-mono text-[10px]">{hist.timestamp}</span>
                      </div>
                      <div className="text-slate-800">{hist.action}</div>
                      {hist.comment && (
                        <div className="text-slate-500 italic mt-0.5">"{hist.comment}"</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="outline" size="sm" onClick={() => setIsDetailOpen(false)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Batch Assignee Dialog */}
      <Dialog open={isBatchAssigneeOpen} onOpenChange={setIsBatchAssigneeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>일괄 담당자 지정</DialogTitle>
            <DialogDescription>
              선택한 {selectedCount}건의 발견사항에 새 담당자를 일괄 배정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="batch-assignee">배정할 담당자 이름</Label>
              <Input
                id="batch-assignee"
                placeholder="예: 김보안 수석"
                value={batchAssigneeName}
                onChange={(e) => setBatchAssigneeName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBatchAssigneeOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleBatchAssign}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              일괄 변경 적용
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* False Positive Reason Dialog */}
      <Dialog open={isFpDialogOpen} onOpenChange={setIsFpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>오탐(False Positive) 판정 처리</DialogTitle>
            <DialogDescription>
              스캐너의 오탐 판단 근거나 코드 레벨의 방어 로직 사유를 입력해주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="fp-reason">오탐 판단 사유 <span className="text-rose-500">*</span></Label>
              <textarea
                id="fp-reason"
                rows={4}
                value={fpReason}
                onChange={(e) => setFpReason(e.target.value)}
                placeholder="예: 테스트 목적으로 모의 주입된 더미 데이터이며 상위 방화벽/WAF에서 원천 차단됨을 확인했습니다."
                className="w-full rounded-md border border-input p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsFpDialogOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmFp}
              className="bg-slate-800 hover:bg-slate-900 text-white"
            >
              오탐 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch False Positive Dialog (Enterprise Bulk Action) */}
      <Dialog open={isBatchFpOpen} onOpenChange={setIsBatchFpOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#0c0f16] border border-slate-200 dark:border-white/[0.1]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-emerald-500" />
              선택 {selectedCount}건 일괄 오탐(False Positive) 제외
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              선택한 모든 취약점을 일괄 제외 처리하며, 사유는 불변 보안 감사 로그에 전자서명되어 영구 보관됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="batch-fp-reason" className="font-bold">
                일괄 오탐 제외 사유 (필수) <span className="text-rose-500">*</span>
              </Label>
              <textarea
                id="batch-fp-reason"
                rows={4}
                value={batchFpReason}
                onChange={(e) => setBatchFpReason(e.target.value)}
                placeholder="예: 클라우드 WAF 모듈 및 API 게이트웨이 레벨에서 해당 파라미터가 검증·차단됨을 확인하여 일괄 제외 처리함."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-white/[0.04] p-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>ISMS-P 감사 시 사후 소명 자료로 활용되므로 구체적인 기술 사유를 작성해주세요.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBatchFpOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmBatchFp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              선택 {selectedCount}건 일괄 오탐 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Security Exception Dialog */}
      <Dialog open={isExceptionDialogOpen} onOpenChange={setIsExceptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>보안 예외 승인 요청</DialogTitle>
            <DialogDescription>
              비즈니스 긴급성 또는 대체 통제로 인한 한시적 예외 승인 사유와 만료일을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3.5 py-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="exc-reason">예외 승인 사유 <span className="text-rose-500">*</span></Label>
              <textarea
                id="exc-reason"
                rows={3}
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="예: 레거시 결제망 통신 호환을 위해 다음 정기 릴리즈(11월)까지 한시적으로 허용함."
                className="w-full rounded-md border border-input p-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exc-expiry">예외 만료일</Label>
              <Input
                id="exc-expiry"
                type="date"
                value={exceptionExpiry}
                onChange={(e) => setExceptionExpiry(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsExceptionDialogOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmException}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              예외 승인 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Exploit PoC Simulator & Threat Intelligence Modal */}
      <ExploitSimulatorModal
        isOpen={isExploitModalOpen}
        onClose={() => setIsExploitModalOpen(false)}
        issue={exploitTargetFinding}
      />
    </div>
  );
};
