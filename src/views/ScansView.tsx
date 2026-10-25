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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Scan,
  Play,
  RotateCcw,
  Search,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  GitBranch,
  Layers,
  Wrench,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  Download,
  Trash2,
  Sparkles,
  Package,
} from 'lucide-react';
import { ScanRun, ScanTrigger, ScanType, ScanRunStatus } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { SbomInspectorModal } from '@/components/common/SbomInspectorModal';
import { toast } from 'sonner';

export const ScansView: React.FC = () => {
  const {
    scans,
    projects,
    findings,
    selectedEntityId,
    triggerScan,
    retryScan,
    hasDummyData,
    generateDummyData,
    clearDummyData,
  } = useDevSecOps();

  // Only show authentic project scans if hasDummyData is false
  const currentScans = useMemo(() => {
    if (hasDummyData) return scans;
    return scans.filter(
      (s) => s.projectId === 'PRJ-AGENTGATE' || !s.projectId.startsWith('PRJ-0')
    );
  }, [scans, hasDummyData]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [triggerFilter, setTriggerFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scanTypeFilter, setScanTypeFilter] = useState<string>('ALL');

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'startedAt', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Detail Sheet state
  const [detailScan, setDetailScan] = useState<ScanRun | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [logLevelFilter, setLogLevelFilter] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [isSbomModalOpen, setIsSbomModalOpen] = useState(false);
  const [sbomProjectId, setSbomProjectId] = useState('PRJ-AGENTGATE');

  const handleCopyLogs = () => {
    if (!detailScan) return;
    const logsToCopy = detailScan.executionLogs.join('\n');
    navigator.clipboard.writeText(logsToCopy);
    setCopiedLogs(true);
    toast.success('터미널 로그가 클립보드에 복사되었습니다.');
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // New Scan Dialog state
  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTrigger, setSelectedTrigger] = useState<ScanTrigger>('수동');
  const [selectedScanTypes, setSelectedScanTypes] = useState<ScanType[]>([
    '소스코드 정적 분석',
    '의존성 취약점 분석',
    '비밀정보 탐지',
    '설정 오류 분석',
  ]);

  // Keep detailScan updated with live changes in context (e.g. status transition from running to done)
  useEffect(() => {
    if (detailScan) {
      const updated = scans.find((s) => s.id === detailScan.id);
      if (updated) {
        setDetailScan(updated);
      }
    }
  }, [scans, detailScan?.id]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return currentScans.filter((s) => {
      // 1. Entity filter
      if (selectedEntityId !== 'ALL' && s.entityId !== selectedEntityId) {
        return false;
      }

      // 2. Search query (id, projectName, commitId, branch)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = s.id.toLowerCase().includes(q);
        const matchProj = s.projectName.toLowerCase().includes(q);
        const matchCommit = s.commitId.toLowerCase().includes(q);
        const matchBranch = s.branch.toLowerCase().includes(q);
        if (!matchId && !matchProj && !matchCommit && !matchBranch) return false;
      }

      // 3. Trigger filter
      if (triggerFilter !== 'ALL' && s.trigger !== triggerFilter) {
        return false;
      }

      // 4. Status filter
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // 5. Scan Type filter
      if (scanTypeFilter !== 'ALL' && !s.scanTypes.includes(scanTypeFilter as ScanType)) {
        return false;
      }

      return true;
    });
  }, [scans, selectedEntityId, searchQuery, triggerFilter, statusFilter, scanTypeFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setTriggerFilter('ALL');
    setStatusFilter('ALL');
    setScanTypeFilter('ALL');
  };

  const handleStartNewScan = async () => {
    if (!selectedProjectId) return;
    setIsNewScanOpen(false);
    const newScan = await triggerScan(selectedProjectId, selectedTrigger, selectedScanTypes);
    if (newScan) {
      setDetailScan(newScan);
      setIsDetailOpen(true);
    }
  };

  const handleToggleScanType = (type: ScanType) => {
    if (selectedScanTypes.includes(type)) {
      if (selectedScanTypes.length > 1) {
        setSelectedScanTypes(selectedScanTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedScanTypes([...selectedScanTypes, type]);
    }
  };

  // TanStack Columns
  const columns: ColumnDef<ScanRun>[] = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="점검 ID" />,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex flex-col">
              <span
                onClick={() => {
                  setDetailScan(s);
                  setIsDetailOpen(true);
                }}
                className="font-mono font-bold text-xs text-indigo-600 hover:underline cursor-pointer"
              >
                {s.id}
              </span>
              <span className="text-[10px] text-slate-400">{s.startedAt}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'projectName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="프로젝트·법인" />,
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div>
              <div className="font-semibold text-slate-900">{s.projectName}</div>
              <div className="text-[11px] text-slate-500">{s.entityName}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'commitId',
        header: '브랜치·커밋 ID',
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-slate-600">{s.branch}</span>
              <span className="text-slate-400">@</span>
              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                {s.commitId}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'trigger',
        header: ({ column }) => <DataTableColumnHeader column={column} title="실행 계기" />,
        cell: ({ row }) => {
          const t = row.original.trigger;
          return (
            <Badge
              variant="outline"
              className={
                t === '수동'
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : t === 'Push'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : t === 'PR/MR'
                  ? 'border-purple-200 bg-purple-50 text-purple-700'
                  : 'border-slate-200 bg-slate-100 text-slate-700'
              }
            >
              {t}
            </Badge>
          );
        },
      },
      {
        id: 'scanTypes',
        header: '점검 유형',
        cell: ({ row }) => {
          const types = row.original.scanTypes;
          return (
            <div className="flex flex-wrap gap-1 max-w-[200px]">
              {types.map((type) => (
                <span
                  key={type}
                  className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 whitespace-nowrap"
                >
                  {type === '소스코드 정적 분석'
                    ? 'SAST'
                    : type === '의존성 취약점 분석'
                    ? 'SCA'
                    : type === '비밀정보 탐지'
                    ? 'Secret'
                    : 'IaC'}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="실행 상태" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
      },
      {
        accessorKey: 'findingsCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="발견사항" />,
        cell: ({ row }) => {
          const count = row.original.findingsCount;
          if (row.original.status === '실패') {
            return <span className="text-slate-400 text-xs">-</span>;
          }
          if (count === 0) {
            return (
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 0건 (Clean)
              </span>
            );
          }
          return (
            <span className="text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {count}건 발견
            </span>
          );
        },
      },
      {
        accessorKey: 'durationSeconds',
        header: ({ column }) => <DataTableColumnHeader column={column} title="소요 시간" />,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-slate-600">
            {row.original.durationSeconds}초
          </span>
        ),
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => {
          const s = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setDetailScan(s);
                  setIsDetailOpen(true);
                }}
                title="점검 상세 로그 보기"
                className="text-indigo-600 hover:bg-indigo-50"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              {s.status === '실패' && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => retryScan(s.id)}
                  title="재시도"
                  className="text-amber-600 hover:bg-amber-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [retryScan]
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

  // Findings related to current detail scan
  const relatedScanFindings = useMemo(() => {
    if (!detailScan) return [];
    return findings.filter((f) => f.scanRunId === detailScan.id);
  }, [detailScan, findings]);

  // Filtered execution logs for detail view
  const displayedLogs = useMemo(() => {
    if (!detailScan) return [];
    if (logLevelFilter === 'ALL') return detailScan.executionLogs;
    return detailScan.executionLogs.filter((log) => log.includes(`[${logLevelFilter}]`));
  }, [detailScan, logLevelFilter]);

  const handleExportCsv = () => {
    const headers = [
      '점검 ID',
      '프로젝트명',
      '법인명',
      '브랜치',
      '커밋 ID',
      '실행 계기',
      '점검 유형',
      '상태',
      '발견 결함 수',
      '소요 시간(초)',
      '시작 시각',
    ];
    const rows = filteredData.map((s) => [
      s.id,
      s.projectName,
      s.entityName,
      s.branch,
      s.commitId,
      s.trigger,
      s.scanTypes.join('; '),
      s.status,
      s.findingsCount,
      s.durationSeconds,
      s.startedAt,
    ]);
    exportToCsv('보안점검_실행이력', headers, rows);
    toast.success('보안점검 실행 목록이 CSV 파일로 다운로드되었습니다.');
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="보안점검 실행 현황"
        subtitle="Git 푸시 및 MR 발생 시 격리된 러너 컨테이너에서 SAST, SCA, 비밀정보, IaC 점검 파이프라인을 실행합니다."
        actionButtons={
          <div className="flex items-center gap-2">
            {hasDummyData ? (
              <Button
                variant="outline"
                size="sm"
                onClick={clearDummyData}
                className="text-xs border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                title="기존 더미 파일들을 삭제하고 실제 연동된 프로젝트만 유지합니다"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                더미 파일 제거
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={generateDummyData}
                className="text-xs border-indigo-300 dark:border-indigo-700/60 text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
                title="테스트 및 시뮬레이션을 위한 샘플 더미 프로젝트를 즉시 생성합니다"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                더미 파일 생성
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSbomProjectId('PRJ-AGENTGATE');
                setIsSbomModalOpen(true);
              }}
              className="bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <Package className="w-3.5 h-3.5" />
              SBOM &amp; SLSA 증명서
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="bg-white text-slate-700 hover:text-indigo-600 border-slate-300 text-xs font-semibold gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              점검 이력 CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setSelectedProjectId(projects[0]?.id || '');
                setIsNewScanOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
            >
              <Play className="w-4 h-4 mr-1.5" />
              수동 점검 실행
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md p-4 shadow-sm dark:shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="점검 ID, 프로젝트명, 커밋, 브랜치 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div>
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="실행 계기" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 실행 계기</SelectItem>
                <SelectItem value="수동">수동</SelectItem>
                <SelectItem value="Push">Push</SelectItem>
                <SelectItem value="PR/MR">PR/MR</SelectItem>
                <SelectItem value="정기">정기</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="실행 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 상태</SelectItem>
                <SelectItem value="대기">대기</SelectItem>
                <SelectItem value="실행 중">실행 중</SelectItem>
                <SelectItem value="완료">완료</SelectItem>
                <SelectItem value="실패">실패</SelectItem>
                <SelectItem value="취소">취소</SelectItem>
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
              필터 초기화
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
                    <Scan className="w-10 h-10 mb-2 stroke-[1.2]" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-sm">보안점검 파이프라인 실행 기록이 없습니다</p>
                    <p className="text-xs text-slate-500 mt-1">프로젝트 목록에서 [⚡ 최초 전체 점검]을 실행하거나 상단의 [수동 점검 실행]을 통해 점검을 시작해보세요.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination table={table} />
      </div>

      {/* Scan Detail Sheet (Section 4.3: 실행 정보, 도구별 상태, 실행 로그, 발견사항, 실패 사유와 재시도) */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto">
          {detailScan && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {detailScan.id}
                    </Badge>
                    <StatusBadge status={detailScan.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSbomProjectId(detailScan.projectId);
                        setIsSbomModalOpen(true);
                      }}
                      className="h-7 text-xs border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100"
                    >
                      <Package className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                      SBOM & SLSA 증명서
                    </Button>
                    {detailScan.status === '실패' && (
                      <Button
                        size="sm"
                        onClick={() => retryScan(detailScan.id)}
                        className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" />
                        점검 재시도
                      </Button>
                    )}
                  </div>
                </div>
                <SheetTitle className="text-lg font-bold mt-1 text-slate-900">
                  {detailScan.projectName} 보안점검 파이프라인
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  {detailScan.entityName} · 브랜치 {detailScan.branch} (Commit: {detailScan.commitId})
                </SheetDescription>
              </SheetHeader>

              {/* Failure Notice Box (if failed) */}
              {detailScan.status === '실패' && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    점검 실행 실패 원인
                  </div>
                  <p className="leading-relaxed font-mono text-[11px] bg-white p-2 rounded border border-rose-200">
                    {detailScan.failureReason || '스캐너 컨테이너 실행 중 알 수 없는 오류 발생'}
                  </p>
                </div>
              )}

              {/* 1. Execution Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-2.5 text-xs">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  실행 메타데이터
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px]">실행 계기</span>
                    <span className="font-semibold text-slate-800">{detailScan.trigger}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">시작 시각 / 소요 시간</span>
                    <span className="font-semibold text-slate-800">
                      {detailScan.startedAt} ({detailScan.durationSeconds}초)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">검사 유형 ({detailScan.scanTypes.length}개)</span>
                    <span className="font-medium text-slate-700">
                      {detailScan.scanTypes.join(', ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">발견 결함 건수</span>
                    <span
                      className={`font-bold ${
                        detailScan.findingsCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {detailScan.findingsCount}건
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Tool Execution Statuses */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                  스캐너 도구별 검사 결과
                </h4>
                <div className="space-y-2">
                  {detailScan.toolStatuses.map((tool, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-100 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-800">{tool.name}</div>
                        <span className="text-[10px] text-slate-400">{tool.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {tool.durationSeconds}초
                        </span>
                        <span className="text-[11px] font-semibold text-slate-700">
                          {tool.findingsCount}건 발견
                        </span>
                        <StatusBadge status={tool.status} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Terminal Execution Logs */}
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] flex items-center gap-1.5 text-slate-200 font-semibold">
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      컨테이너 실행 터미널 로그
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700 text-slate-400 font-mono">
                      총 {detailScan.executionLogs.length}행
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Log Level Filter Tabs */}
                    <div className="flex items-center rounded-md bg-slate-900 p-0.5 border border-slate-800 text-[10px]">
                      {(['ALL', 'ERROR', 'WARN', 'INFO'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setLogLevelFilter(level)}
                          className={`px-2 py-0.5 rounded transition-colors font-mono ${
                            logLevelFilter === level
                              ? 'bg-slate-700 text-white font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>

                    {/* Copy All Logs Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyLogs}
                      className="h-6 px-2 text-[10px] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700 font-mono gap-1"
                      title="클립보드로 전체 로그 복사"
                    >
                      {copiedLogs ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-400" />
                          <span>로그 복사</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-slate-300 space-y-1 max-h-52 overflow-y-auto leading-relaxed pt-1">
                  {displayedLogs.length === 0 ? (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      [{logLevelFilter}] 필터에 해당하는 로그 라인이 없습니다.
                    </div>
                  ) : (
                    displayedLogs.map((log, lIdx) => (
                      <div
                        key={lIdx}
                        className={
                          log.includes('[ERROR]')
                            ? 'text-rose-400 font-bold bg-rose-950/30 px-1 rounded'
                            : log.includes('[WARN]')
                            ? 'text-amber-400 bg-amber-950/20 px-1 rounded'
                            : 'text-slate-300'
                        }
                      >
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Findings Discovered in this scan */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  본 점검 보고 결함 ({relatedScanFindings.length}건)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {relatedScanFindings.length === 0 ? (
                    <p className="text-xs text-slate-400">검출된 취약점 또는 결함이 없습니다.</p>
                  ) : (
                    relatedScanFindings.map((f) => (
                      <div
                        key={f.id}
                        className="p-2 rounded border border-slate-100 bg-slate-50 text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-800 truncate mr-2">
                          {f.title}
                        </span>
                        <StatusBadge status={f.status} size="sm" />
                      </div>
                    ))
                  )}
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

      {/* Trigger New Scan Dialog */}
      <Dialog open={isNewScanOpen} onOpenChange={setIsNewScanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>수동 보안점검 실행</DialogTitle>
            <DialogDescription>
              선택한 프로젝트의 최신 Git 코드를 가져와 보안 스캐너를 실행합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">대상 프로젝트</label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="프로젝트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.entityName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">실행 계기</label>
              <Select
                value={selectedTrigger}
                onValueChange={(val) => setSelectedTrigger(val as ScanTrigger)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="수동">수동 트리거</SelectItem>
                  <SelectItem value="Push">Push 시뮬레이션</SelectItem>
                  <SelectItem value="PR/MR">PR/MR 시뮬레이션</SelectItem>
                  <SelectItem value="정기">정기 점검 시뮬레이션</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="font-semibold text-slate-700">점검 엔진 선택</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '소스코드 정적 분석', label: '소스코드 정적 분석 (SAST)' },
                  { id: '의존성 취약점 분석', label: '의존성 취약점 분석 (SCA)' },
                  { id: '비밀정보 탐지', label: '비밀정보 탐지 (Secret)' },
                  { id: '설정 오류 분석', label: '설정 오류 분석 (IaC)' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleScanType(item.id as ScanType)}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                      selectedScanTypes.includes(item.id as ScanType)
                        ? 'border-indigo-400 bg-indigo-50/60 font-semibold text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <Checkbox checked={selectedScanTypes.includes(item.id as ScanType)} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewScanOpen(false)}>
              취소
            </Button>
            <Button
              size="sm"
              onClick={handleStartNewScan}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              스캐너 작업 큐 등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SbomInspectorModal
        isOpen={isSbomModalOpen}
        onClose={() => setIsSbomModalOpen(false)}
        projectId={sbomProjectId}
      />
    </div>
  );
};
