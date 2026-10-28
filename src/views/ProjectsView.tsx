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
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Play,
  Search,
  RotateCcw,
  ExternalLink,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
  FolderGit2,
  GitBranch,
  Calendar,
  AlertCircle,
  FileCheck2,
  Scan,
  Download,
  Maximize2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  GitPullRequest,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, ProjectStatus, ScanOverallStatus, EntityId } from '@/types';
import { exportToCsv } from '@/lib/exportCsv';
import { calculateProjectSecurityScore } from '@/lib/securityScore';
import { SecurityScoreBadge } from '@/components/common/SecurityScoreBadge';
import { ProjectPipelineFlowChart } from '@/components/projects/ProjectPipelineFlowChart';
import { PipelineCanvasModal } from '@/components/projects/PipelineCanvasModal';
import { GitHubPrChecksModal } from '@/components/projects/GitHubPrChecksModal';
import { BaselineOnboardingWizardModal } from '@/components/projects/BaselineOnboardingWizardModal';
import { DeltaDebtBurndownCard } from '@/components/projects/DeltaDebtBurndownCard';
import { AGENTGATE_ALL_SCAN_ISSUES } from '@/mock/mockData';
import { toast } from 'sonner';

interface ProjectsViewProps {
  onNavigate?: (menu: any, filterState?: any) => void;
  initialFilter?: {
    projectId?: string;
    search?: string;
  };
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ onNavigate, initialFilter }) => {
  const {
    projects,
    entities,
    findings,
    selectedEntityId,
    currentUser,
    policy,
    getProjectOverallStatus,
    getProjectUnresolvedHighCriticalCount,
    getProjectLatestScan,
    getProjectFindings,
    getProjectDeploymentReview,
    addProject,
    updateProject,
    deleteProject,
    triggerScan,
    triggerBatchScan,
    hasDummyData,
    generateDummyData,
    clearDummyData,
    resetBaselineScan,
    reviews,
    resolveAgentGateRemediation,
  } = useDevSecOps();

  const agentgateReview = useMemo(() => {
    return reviews.find(
      (r) => r.id === 'REV-AGENTGATE-01' || r.projectId === 'PRJ-AGENTGATE'
    );
  }, [reviews]);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [scanStatusFilter, setScanStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);

  // TanStack Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  // Detail Sheet state
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [canvasProject, setCanvasProject] = useState<Project | null>(null);

  // Sync initial projectId or search if navigated via CommandPalette / Deep Link
  useEffect(() => {
    if (initialFilter?.search !== undefined) {
      setSearchQuery(initialFilter.search);
    }
    if (initialFilter?.projectId) {
      const target = projects.find((p) => p.id === initialFilter.projectId);
      if (target) {
        setDetailProject(target);
        setIsDetailOpen(true);
      }
    }
  }, [initialFilter, projects]);

  // Baseline Scan & Warning Alert state
  const [targetScanProject, setTargetScanProject] = useState<Project | null>(null);
  const [isOnboardingPrModalOpen, setIsOnboardingPrModalOpen] = useState(false);
  const [isBaselineWizardOpen, setIsBaselineWizardOpen] = useState(false);
  const [isWhyBaselineOpen, setIsWhyBaselineOpen] = useState(false);

  const unscannedProjects = useMemo(() => {
    return projects.filter((p) => !getProjectLatestScan(p.id));
  }, [projects, getProjectLatestScan]);

  const agentgateProject = useMemo(() => {
    return (
      projects.find((p) => p.id === 'PRJ-AGENTGATE') ||
      projects.find((p) => p.repository.toLowerCase().includes('agentgate')) ||
      projects[0]
    );
  }, [projects]);

  // Add / Edit Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    entityId: (selectedEntityId === 'ALL' ? 'ENT-01' : selectedEntityId) as EntityId,
    department: '',
    owner: '',
    ownerEmail: '',
    repository: '',
    defaultBranch: 'main',
    serviceType: '대고객 서비스',
    status: '운영 중' as ProjectStatus,
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Alert Dialog state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Date range validation
  useEffect(() => {
    if (startDate && endDate && startDate > endDate) {
      setDateError('시작일이 종료일보다 이후일 수 없습니다.');
    } else {
      setDateError(null);
    }
  }, [startDate, endDate]);

  // Reset selection when entity or filters change (Requirement 6)
  useEffect(() => {
    setRowSelection({});
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [selectedEntityId, searchQuery, statusFilter, scanStatusFilter, startDate, endDate]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return projects.filter((p) => {
      // 1. Entity filter
      if (selectedEntityId !== 'ALL' && p.entityId !== selectedEntityId) {
        return false;
      }

      // 2. Search query (name, owner, repo)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchOwner = p.owner.toLowerCase().includes(query);
        const matchRepo = p.repository.toLowerCase().includes(query);
        if (!matchName && !matchOwner && !matchRepo) return false;
      }

      // 3. Operation status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) {
        return false;
      }

      // 4. Scan overall status filter
      if (scanStatusFilter !== 'ALL') {
        const overall = getProjectOverallStatus(p.id);
        if (overall !== scanStatusFilter) return false;
      }

      // 5. Date filter
      if (startDate && p.createdAt < startDate) return false;
      if (endDate && p.createdAt > endDate) return false;

      return true;
    });
  }, [
    projects,
    selectedEntityId,
    searchQuery,
    statusFilter,
    scanStatusFilter,
    startDate,
    endDate,
    getProjectOverallStatus,
  ]);

  // Handle resetting filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setScanStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    setDateError(null);
  };

  // Open Form for Add
  const handleOpenAdd = () => {
    setEditingProject(null);
    setFormData({
      name: '',
      entityId: (selectedEntityId === 'ALL' ? 'ENT-01' : selectedEntityId) as EntityId,
      department: entities[0]?.departments[0] || '플랫폼개발팀',
      owner: currentUser.name,
      ownerEmail: currentUser.email,
      repository: 'git.internal-corp.net/',
      defaultBranch: 'main',
      serviceType: '대고객 서비스',
      status: '개발 중',
      description: '',
    });
    setFormErrors({});
    setIsFormDirty(false);
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleOpenEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      name: project.name,
      entityId: project.entityId,
      department: project.department,
      owner: project.owner,
      ownerEmail: project.ownerEmail,
      repository: project.repository,
      defaultBranch: project.defaultBranch,
      serviceType: project.serviceType,
      status: project.status,
      description: project.description,
    });
    setFormErrors({});
    setIsFormDirty(false);
    setIsFormOpen(true);
  };

  // Validate form fields
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = '프로젝트명을 입력해주세요.';
    if (!formData.department.trim()) errors.department = '부서명을 입력해주세요.';
    if (!formData.owner.trim()) errors.owner = '담당자명을 입력해주세요.';

    if (!formData.repository.trim()) {
      errors.repository = 'Git 저장소 주소를 입력해주세요.';
    } else if (!formData.repository.includes('.') || !formData.repository.endsWith('.git')) {
      errors.repository = '올바른 Git 저장소 URL 형식(.git 포함)이어야 합니다.';
    } else {
      // Check duplicate repo URL (excluding current editing project)
      const isDuplicate = projects.some(
        (p) =>
          p.repository.toLowerCase() === formData.repository.trim().toLowerCase() &&
          p.id !== editingProject?.id
      );
      if (isDuplicate) {
        errors.repository = '이미 등록된 Git 저장소 주소입니다. 중복 저장은 불가능합니다.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const targetEntity = entities.find((ent) => ent.id === formData.entityId);
    const entityName = targetEntity ? targetEntity.name : '테크솔루션즈';

    let success = false;
    if (editingProject) {
      success = await updateProject(editingProject.id, {
        ...formData,
        entityName,
      });
    } else {
      success = await addProject({
        ...formData,
        entityName,
      });
    }

    setIsSubmitting(false);
    if (success) {
      setIsFormDirty(false);
      setIsFormOpen(false);
    }
  };

  // Confirm delete project
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    const deletedId = projectToDelete.id;
    const success = await deleteProject(deletedId);
    if (success) {
      // Remove deleted ID from table selection (Requirement 6)
      setRowSelection((prev) => {
        const next = { ...prev };
        delete next[deletedId];
        return next;
      });
      // Close detail sheet if currently opened project was deleted
      if (detailProject?.id === deletedId) {
        setIsDetailOpen(false);
      }
      setProjectToDelete(null);

      // Page boundary safety (Requirement 6): if page becomes empty after deletion, move back to last valid page
      const remainingCount = filteredData.length - 1;
      const maxPageIndex = Math.max(0, Math.ceil(remainingCount / pagination.pageSize) - 1);
      if (pagination.pageIndex > maxPageIndex) {
        setPagination((prev) => ({ ...prev, pageIndex: maxPageIndex }));
      }
    }
  };

  // TanStack Columns definition
  const columns: ColumnDef<Project>[] = useMemo(
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
            aria-label="현재 페이지 전체 선택"
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
        accessorKey: 'name',
        header: ({ column }) => <DataTableColumnHeader column={column} title="프로젝트명" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex flex-col">
              <span
                onClick={() => setCanvasProject(p)}
                className="font-semibold text-slate-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                title="클릭하여 대화면 파이프라인 캔버스 뷰 열기"
              >
                {p.name}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">{p.id}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'entityName',
        header: ({ column }) => <DataTableColumnHeader column={column} title="법인·부서" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <div className="font-medium text-slate-800">{p.entityName}</div>
              <div className="text-[11px] text-slate-500">{p.department}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'owner',
        header: ({ column }) => <DataTableColumnHeader column={column} title="담당자" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div>
              <div className="font-medium text-slate-800">{p.owner}</div>
              <div className="text-[10px] text-slate-400">{p.ownerEmail}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'repository',
        header: 'Git 저장소 / 브랜치',
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="max-w-[220px]">
              <div className="font-mono text-[11px] text-slate-700 truncate" title={p.repository}>
                {p.repository}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-indigo-600 font-mono mt-0.5">
                <GitBranch className="w-3 h-3" />
                {p.defaultBranch}
              </div>
            </div>
          );
        },
      },
      {
        id: 'scanStatus',
        header: '최근 점검 상태',
        cell: ({ row }) => {
          const p = row.original;
          const overall = getProjectOverallStatus(p.id);
          const latestScan = getProjectLatestScan(p.id);

          if (!latestScan || overall === '미점검') {
            return (
              <div className="flex flex-col items-start gap-1">
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 text-[11px] font-bold animate-pulse">
                  🚨 미점검 (전체 점검 필수)
                </Badge>
                <span className="text-[10px] text-slate-400 font-mono">베이스라인 미수립</span>
              </div>
            );
          }

          return (
            <div className="flex flex-col items-start gap-1">
              <StatusBadge status={overall} size="sm" />
              {latestScan && (
                <span className="text-[10px] text-slate-400">
                  {latestScan.startedAt.slice(5, 16)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'highCritFindings',
        header: '미해결 고위험',
        cell: ({ row }) => {
          const latestScan = getProjectLatestScan(row.original.id);
          if (!latestScan) {
            return (
              <span className="text-slate-400 text-xs font-mono">
                -
              </span>
            );
          }
          const count = getProjectUnresolvedHighCriticalCount(row.original.id);
          if (count === 0) {
            return (
              <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                <FileCheck2 className="w-3.5 h-3.5" /> 0건
              </span>
            );
          }
          return (
            <span className="text-rose-600 font-bold text-xs bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              {count}건 미해결
            </span>
          );
        },
      },
      {
        id: 'securityScore',
        header: '보안 성숙도 (Score)',
        cell: ({ row }) => {
          const p = row.original;
          const latestScan = getProjectLatestScan(p.id);
          if (!latestScan) {
            return (
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-slate-400 italic">
                  -- (미측정)
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">최초 점검 필요</span>
              </div>
            );
          }
          const scoreInfo = calculateProjectSecurityScore(p.id, getProjectFindings(p.id));
          return (
            <div className="flex items-center">
              <SecurityScoreBadge scoreInfo={scoreInfo} showLabel />
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="운영 상태" />,
        cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => <DataTableColumnHeader column={column} title="등록일" />,
        cell: ({ row }) => (
          <span className="text-[11px] text-slate-500 font-mono">
            {row.original.createdAt}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '작업',
        cell: ({ row }) => {
          const p = row.original;
          const isDev = currentUser.role === 'developer';
          const latestScan = getProjectLatestScan(p.id);

          if (!latestScan) {
            return (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={() => {
                    setTargetScanProject(p);
                    setIsBaselineWizardOpen(true);
                  }}
                  className="h-7 px-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-[11px] gap-1 shadow-xs animate-pulse"
                  title="이 프로젝트의 최초 전체 소스코드 점검(Full Baseline Scan)을 실행합니다"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>⚡ 최초 전체 점검</span>
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => {
                    setDetailProject(p);
                    setIsDetailOpen(true);
                  }}
                  title="상세 보기"
                  className="text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-1">
              {(p.id === 'PRJ-AGENTGATE' || p.repository?.includes('agentgate')) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsOnboardingPrModalOpen(true)}
                  title="점검 결과 생성된 보안 에러 PR(3건) 확인"
                  className="h-7 px-2 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px] font-semibold gap-1 shrink-0 bg-rose-50/50"
                >
                  <GitPullRequest className="w-3 h-3 text-rose-500" />
                  <span>PR #1 에러 (3건)</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => triggerScan(p.id, '수동')}
                title="보안 점검 실행 시뮬레이션"
                className="text-indigo-600 hover:bg-indigo-50"
              >
                <Play className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setCanvasProject(p)}
                title="대화면 파이프라인 캔버스 뷰 열기"
                className="text-indigo-600 hover:bg-indigo-50"
              >
                <GitBranch className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  setDetailProject(p);
                  setIsDetailOpen(true);
                }}
                title="상세 보기"
                className="text-slate-600 hover:bg-slate-100"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => handleOpenEdit(p)}
                title="수정"
                className="text-slate-600 hover:bg-slate-100"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => {
                  if (isDev) {
                    toast.warning('프로젝트 삭제는 그룹 보안관리자만 가능합니다 (데모 역할 권한 제한).');
                  } else {
                    setProjectToDelete(p);
                  }
                }}
                title={isDev ? '삭제 권한 없음 (그룹 관리자 전용)' : '삭제'}
                className={isDev ? 'text-slate-300 hover:text-slate-300 cursor-not-allowed' : 'text-rose-600 hover:bg-rose-50'}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          );
        },
      },
    ],
    [getProjectOverallStatus, getProjectLatestScan, getProjectUnresolvedHighCriticalCount, getProjectFindings, triggerScan]
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

  const selectedCount = Object.keys(rowSelection).filter((k) => rowSelection[k]).length;

  const handleBatchScan = () => {
    const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    if (selectedIds.length === 0) return;
    triggerBatchScan(selectedIds);
  };

  const handleExportCsv = () => {
    const headers = [
      '프로젝트 ID',
      '프로젝트명',
      '소속 법인',
      '담당 부서',
      '담당자',
      '담당자 이메일',
      'Git 저장소',
      '기본 브랜치',
      '처리 데이터 유형',
      '운영 상태',
      '등록일',
    ];
    const rows = filteredData.map((p) => [
      p.id,
      p.name,
      p.entityName,
      p.department,
      p.owner,
      p.ownerEmail,
      p.repository,
      p.defaultBranch,
      p.serviceType,
      p.status,
      p.createdAt,
    ]);
    exportToCsv('SecureFlow_프로젝트_목록', headers, rows);
    toast.success(`${filteredData.length}개 프로젝트 현황을 CSV로 다운로드했습니다.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <Breadcrumbs
        currentMenuTitle="프로젝트 관리"
        subtitle="각 법인에서 개발 및 운영 중인 Git 저장소 프로젝트를 등록하고 보안 점검 정책을 할당합니다."
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
              onClick={handleExportCsv}
              className="text-xs text-slate-700 hover:bg-slate-100"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              CSV 목록 다운로드
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchScan}
                className="text-xs border-indigo-300 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                선택 {selectedCount}개 일괄 점검
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" />
              신규 프로젝트 등록
            </Button>
          </div>
        }
      />

      {/* Role permission info banner */}
      {currentUser.role === 'developer' && (
        <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px]">
              개발자 시뮬레이션
            </span>
            <span>
              현재 <strong>{currentUser.name}</strong> 님에게 배정된 프로젝트 관리 및 점검 실행을 수행합니다. (프로젝트 삭제는 그룹 관리자만 가능)
            </span>
          </div>
          <span className="text-[11px] text-indigo-600 font-mono font-semibold">
            담당 프로젝트: {currentUser.assignedProjectIds?.join(', ')}
          </span>
        </div>
      )}

      {/* 🚨 최초 전체 소스코드 점검(Full Baseline Scan) 미실행 알림 배너 */}
      {unscannedProjects.length > 0 ? (
        <div className="rounded-2xl border-2 border-amber-400/90 dark:border-amber-500/70 bg-gradient-to-br from-amber-50 via-rose-50/40 to-amber-50/60 dark:from-amber-950/40 dark:via-[#16121f] dark:to-amber-950/20 p-5 shadow-lg shadow-amber-500/5 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="relative shrink-0 mt-0.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md animate-pulse">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0c1017] animate-ping" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-xs">
                    🚨 최초 전체 점검 필수
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    신규 등록 프로젝트 소스코드 무결성 베이스라인 미수립 경고
                  </h3>
                  <Badge variant="outline" className="text-[11px] font-mono border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/40">
                    미점검 {unscannedProjects.length}개 저장소
                  </Badge>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
                  신규 등록/연동된 저장소 <strong className="text-indigo-600 dark:text-indigo-400 font-mono">[{unscannedProjects.map((p) => p.name).join(', ')}]</strong>의 
                  전체 소스코드 보안 점검이 아직 수행되지 않았습니다. 
                  보안 품질 게이트(Quality Gate) 및 향후 <strong>신규 PR 증분 검증(Delta Scan)</strong>을 가동하려면 
                  기존 전체 코드를 대상으로 하는 <strong>최초 전체 점검(Full Baseline Scan)</strong>을 먼저 실행해야 합니다.
                </p>
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-amber-800 dark:text-amber-300/90 pt-0.5">
                  <span className="flex items-center gap-1 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    최초 점검 전까지는 보안 성숙도 점수가 산출되지 않으며(--), PR 보안 검증 게이트가 대기 상태로 유지됩니다.
                  </span>
                  <button
                    onClick={() => setIsWhyBaselineOpen(!isWhyBaselineOpen)}
                    className="text-indigo-600 dark:text-indigo-400 font-semibold underline underline-offset-2 flex items-center gap-1 hover:text-indigo-700"
                  >
                    <Info className="w-3 h-3" />
                    {isWhyBaselineOpen ? '설명 접기' : '최초 전체 점검이 왜 필수인가요?'}
                  </button>
                </div>

                {isWhyBaselineOpen && (
                  <div className="mt-3 p-3.5 rounded-xl bg-white/95 dark:bg-[#0d1320] border border-amber-300 dark:border-amber-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-2 animate-in fade-in">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      엔터프라이즈 최초 베이스라인 점검 &amp; 기술 부채 격리 원리:
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <li>
                        <strong>초기 보안 기준점 수립:</strong> 기존 48개 소스코드 전체를 4대 엔진(SAST·SCA·Secret·IaC)으로 전수 스캔하여 기준 점수(88점, B+)를 산출합니다.
                      </li>
                      <li>
                        <strong>기존 결함 부채 격리:</strong> 발견된 결함(예: JWT 옵션 미지정, 구버전 패키지)을 '기존 기술 부채'로 등록하여 신규 개발 PR이 블로킹되는 현상을 방지합니다.
                      </li>
                      <li>
                        <strong>PR 증분(Delta) 검증 활성화:</strong> 베이스라인이 확정된 후부터는 개발자가 수정한 코드만 신속하게 증분 검사하는 실시간 보안 게이트가 동작합니다.
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-amber-200 dark:border-amber-900/50">
              <Button
                size="default"
                onClick={() => {
                  const target = unscannedProjects[0];
                  if (target) {
                    setTargetScanProject(target);
                    setIsBaselineWizardOpen(true);
                  }
                }}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md gap-2 animate-pulse"
              >
                <Sparkles className="w-4 h-4" />
                <span>⚡ 지금 최초 전체 점검 실행하기</span>
              </Button>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono hidden sm:inline">
                4대 엔진(SAST·SCA·Secret·IaC) 자동 분석
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <DeltaDebtBurndownCard
            baselineDebtCount={2}
            newVulnerabilitiesCount={agentgateReview?.approvalStatus === '승인' ? 0 : 1}
            totalResolvedCount={agentgateReview?.approvalStatus === '승인' ? 3 : 0}
            onOpenDebtFindings={() => onNavigate?.('findings', { search: 'AgentGate' })}
            onOpenPrChecks={() => setIsOnboardingPrModalOpen(true)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resetBaselineScan(agentgateProject?.id || 'PRJ-AGENTGATE')}
              className="h-6 px-2 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 gap-1"
              title="다시 미점검 상태로 리셋하여 최초 점검 경고 알림 플로우를 테스트합니다"
            >
              <RotateCcw className="w-3 h-3" />
              <span>미점검 상태로 리셋</span>
            </Button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md p-4 shadow-sm dark:shadow-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="프로젝트명, 담당자, 저장소 URL 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Operation Status Filter */}
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="운영 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 운영 상태</SelectItem>
                <SelectItem value="운영 중">운영 중</SelectItem>
                <SelectItem value="개발 중">개발 중</SelectItem>
                <SelectItem value="유지보수">유지보수</SelectItem>
                <SelectItem value="보관(보류)">보관(보류)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scan Status Filter */}
          <div>
            <Select value={scanStatusFilter} onValueChange={setScanStatusFilter}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="점검 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체 점검 상태</SelectItem>
                <SelectItem value="통과">통과 (클린)</SelectItem>
                <SelectItem value="주의">주의 (중간 결함)</SelectItem>
                <SelectItem value="위험">위험 (고위험 결함)</SelectItem>
                <SelectItem value="미점검">미점검</SelectItem>
                <SelectItem value="점검 중">점검 중</SelectItem>
                <SelectItem value="실패">점검 실패</SelectItem>
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
              필터 초기화
            </Button>
          </div>
        </div>

        {/* Date Filter Range (Section 6) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200/80 dark:border-white/[0.06] text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-medium">등록일 기간:</span>
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

          {dateError && (
            <span className="text-xs text-rose-600 flex items-center gap-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {dateError}
            </span>
          )}
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
              table.getRowModel().rows.map((row) => {
                const isUnscanned = !getProjectLatestScan(row.original.id);
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button, input, [role="checkbox"]')) {
                        return;
                      }
                      setCanvasProject(row.original);
                    }}
                    className={cn(
                      'cursor-pointer transition-colors',
                      isUnscanned
                        ? 'bg-amber-500/[0.04] dark:bg-amber-500/[0.08] hover:bg-amber-500/[0.08] dark:hover:bg-amber-500/[0.12] border-l-4 border-l-amber-500'
                        : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.02]'
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-44 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FolderGit2 className="w-10 h-10 mb-2 stroke-[1.2]" />
                    {projects.length === 0 ? (
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">등록된 프로젝트가 없습니다</p>
                        <p className="text-xs text-slate-500 mt-1">상단의 [신규 프로젝트 등록] 버튼을 눌러 추가해주세요.</p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-semibold text-slate-700 text-sm">검색 조건과 일치하는 프로젝트가 없습니다</p>
                        <p className="text-xs text-slate-500 mt-1">검색어나 상태 필터 조건을 완화해보세요.</p>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <DataTablePagination table={table} selectedRowsCount={selectedCount} />
      </div>

      {/* Project Detail Sheet (Section 4.2: 기본 정보, 처리 데이터 유형, 저장소, 최근 점검, 관련 발견사항, 최근 배포 심사) */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl overflow-y-auto">
          {detailProject && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {detailProject.id}
                    </Badge>
                    <StatusBadge status={detailProject.status} size="sm" />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsDetailOpen(false);
                      setCanvasProject(detailProject);
                    }}
                    className="h-7 text-xs border-indigo-200 text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 gap-1.5 font-semibold"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    대화면 캔버스 뷰 열기
                  </Button>
                </div>
                <SheetTitle className="text-xl font-bold mt-1 text-slate-900">
                  {detailProject.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500">
                  {detailProject.description || '등록된 프로젝트 설명이 없습니다.'}
                </SheetDescription>
              </SheetHeader>

              {/* Interactive Pipeline Flow Chart (어떤 사람이 어떤 브랜치로 PR/Push 했고 어디까지 진행되었는지 한눈에 보는 흐름도) */}
              <ProjectPipelineFlowChart
                project={detailProject}
                latestScan={getProjectLatestScan(detailProject.id)}
                findings={getProjectFindings(detailProject.id)}
                review={getProjectDeploymentReview(detailProject.id)}
                policy={policy}
                onTriggerScan={(pId) => triggerScan(pId, '수동')}
                onNavigateFindings={(filter) => {
                  setIsDetailOpen(false);
                  if (onNavigate) onNavigate('findings', filter);
                }}
                onNavigateScans={(scanId) => {
                  setIsDetailOpen(false);
                  if (onNavigate) onNavigate('scans', { scanId });
                }}
                onNavigateReviews={(reviewId) => {
                  setIsDetailOpen(false);
                  if (onNavigate) onNavigate('reviews', { reviewId });
                }}
                onOpenCanvas={() => {
                  setIsDetailOpen(false);
                  setCanvasProject(detailProject);
                }}
              />

              {/* Security Scorecard & SLA Health */}
              {(() => {
                const scoreInfo = calculateProjectSecurityScore(detailProject.id, getProjectFindings(detailProject.id));
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          보안 성숙도 평가 점수 및 SLA 현황
                        </h4>
                      </div>
                      <SecurityScoreBadge scoreInfo={scoreInfo} showLabel />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-sans block">종합 점수</span>
                        <span className="text-lg font-bold text-slate-900">
                          {scoreInfo.score}
                          <span className="text-xs text-slate-400">/100</span>
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-sans block">SLA 준수율</span>
                        <span className="text-lg font-bold text-indigo-600">{scoreInfo.slaComplianceRate}%</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-sans block">미해결 결함</span>
                        <span className="text-lg font-bold text-amber-600">
                          {scoreInfo.breakdown.critCount + scoreInfo.breakdown.highCount + scoreInfo.breakdown.medCount}건
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[10px] text-slate-400 font-sans block">SLA 초과 결함</span>
                        <span className={`text-lg font-bold ${scoreInfo.breakdown.overdueCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {scoreInfo.breakdown.overdueCount}건
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 1. Basic & Data Type Info */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  기본 메타데이터 및 처리 데이터 유형
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">소속 법인</span>
                    <span className="font-semibold text-slate-800">{detailProject.entityName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">담당 부서</span>
                    <span className="font-semibold text-slate-800">{detailProject.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">프로젝트 담당자</span>
                    <span className="font-semibold text-slate-800">
                      {detailProject.owner} ({detailProject.ownerEmail})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">처리 데이터 유형</span>
                    <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {detailProject.serviceType}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block text-[11px]">Git 저장소 URL & 기본 브랜치</span>
                    <span className="font-mono text-[11px] text-slate-700 bg-white p-1.5 rounded border border-slate-200 block truncate">
                      {detailProject.repository} (Branch: {detailProject.defaultBranch})
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Latest Scan Execution */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Scan className="w-4 h-4 text-indigo-600" />
                    최근 보안 점검 결과
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerScan(detailProject.id, '수동')}
                    className="h-7 text-xs text-indigo-700 bg-indigo-50"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    재점검 실행
                  </Button>
                </div>
                {(() => {
                  const latestScan = getProjectLatestScan(detailProject.id);
                  if (!latestScan) {
                    return <p className="text-xs text-slate-400">아직 실행된 점검 이력이 없습니다.</p>;
                  }
                  return (
                    <div className="text-xs space-y-2 bg-slate-50 p-3 rounded-md">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-600 font-semibold">{latestScan.id}</span>
                        <StatusBadge status={latestScan.status} size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                        <span>실행 시각: {latestScan.startedAt}</span>
                        <span>커밋: {latestScan.commitId}</span>
                        <span>트리거: {latestScan.trigger}</span>
                        <span>발견사항 수: {latestScan.findingsCount}건</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 3. Related Findings */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  관련 취약점·발견사항 ({getProjectFindings(detailProject.id).length}건)
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getProjectFindings(detailProject.id).length === 0 ? (
                    <p className="text-xs text-slate-400">발견된 보안 취약점이 없습니다.</p>
                  ) : (
                    getProjectFindings(detailProject.id).map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded border border-slate-100 bg-white hover:bg-slate-50 text-xs flex items-center justify-between"
                      >
                        <div className="truncate mr-2">
                          <div className="font-semibold text-slate-800 truncate">{f.title}</div>
                          <span className="font-mono text-[10px] text-slate-400 truncate block">
                            {f.filePath}:{f.lineNumber}
                          </span>
                        </div>
                        <StatusBadge status={f.status} size="sm" />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Latest Deployment Review */}
              <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  최근 배포 심사 현황
                </h4>
                {(() => {
                  const rev = getProjectDeploymentReview(detailProject.id);
                  if (!rev) {
                    return <p className="text-xs text-slate-400">등록된 배포 심사 요청이 없습니다.</p>;
                  }
                  return (
                    <div className="text-xs bg-slate-50 p-3 rounded-md space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">
                          {rev.targetEnvironment} 배포 ({rev.id})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={rev.securityVerdict} size="sm" />
                          <StatusBadge status={rev.approvalStatus} size="sm" />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{rev.verdictReason}</p>
                    </div>
                  );
                })()}
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

      {/* Add / Edit Dialog (Section 7) */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open && isFormDirty) {
            setShowDiscardConfirm(true);
          } else {
            setIsFormOpen(open);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? '프로젝트 정보 수정' : '신규 프로젝트 등록'}
              </DialogTitle>
              <DialogDescription>
                Git 저장소 메타데이터와 보안 점검 환경을 설정합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              {/* Project Name */}
              <div className="space-y-1">
                <Label htmlFor="proj-name">프로젝트명 <span className="text-rose-500">*</span></Label>
                <Input
                  id="proj-name"
                  placeholder="예: 결제 승인 마이크로서비스"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setIsFormDirty(true);
                  }}
                  className={formErrors.name ? 'border-rose-400' : ''}
                />
                {formErrors.name && (
                  <p className="text-rose-600 text-[11px]">{formErrors.name}</p>
                )}
              </div>

              {/* Entity & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>소속 법인 <span className="text-rose-500">*</span></Label>
                  <Select
                    value={formData.entityId}
                    onValueChange={(val) => {
                      setFormData({ ...formData, entityId: val as EntityId });
                      setIsFormDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {entities.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} ({e.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="proj-dept">담당 부서 <span className="text-rose-500">*</span></Label>
                  <Input
                    id="proj-dept"
                    placeholder="예: 결제시스템팀"
                    value={formData.department}
                    onChange={(e) => {
                      setFormData({ ...formData, department: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className={formErrors.department ? 'border-rose-400' : ''}
                  />
                  {formErrors.department && (
                    <p className="text-rose-600 text-[11px]">{formErrors.department}</p>
                  )}
                </div>
              </div>

              {/* Owner and Email */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="proj-owner">담당자명 <span className="text-rose-500">*</span></Label>
                  <Input
                    id="proj-owner"
                    placeholder="예: 홍길동 책임"
                    value={formData.owner}
                    onChange={(e) => {
                      setFormData({ ...formData, owner: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className={formErrors.owner ? 'border-rose-400' : ''}
                  />
                  {formErrors.owner && (
                    <p className="text-rose-600 text-[11px]">{formErrors.owner}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="proj-email">담당자 이메일</Label>
                  <Input
                    id="proj-email"
                    placeholder="gildong.hong@corp.internal"
                    value={formData.ownerEmail}
                    onChange={(e) => {
                      setFormData({ ...formData, ownerEmail: e.target.value });
                      setIsFormDirty(true);
                    }}
                  />
                </div>
              </div>

              {/* Repository and Default Branch */}
              <div className="space-y-1">
                <Label htmlFor="proj-repo">Git 저장소 URL (.git) <span className="text-rose-500">*</span></Label>
                <Input
                  id="proj-repo"
                  placeholder="git.internal-corp.net/corp/service.git"
                  value={formData.repository}
                  onChange={(e) => {
                    setFormData({ ...formData, repository: e.target.value });
                    setIsFormDirty(true);
                  }}
                  className={`font-mono ${formErrors.repository ? 'border-rose-400' : ''}`}
                />
                {formErrors.repository && (
                  <p className="text-rose-600 text-[11px]">{formErrors.repository}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="proj-branch">기본 브랜치</Label>
                  <Input
                    id="proj-branch"
                    value={formData.defaultBranch}
                    onChange={(e) => {
                      setFormData({ ...formData, defaultBranch: e.target.value });
                      setIsFormDirty(true);
                    }}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label>운영 상태</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(val) => {
                      setFormData({ ...formData, status: val as ProjectStatus });
                      setIsFormDirty(true);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="운영 중">운영 중</SelectItem>
                      <SelectItem value="개발 중">개발 중</SelectItem>
                      <SelectItem value="유지보수">유지보수</SelectItem>
                      <SelectItem value="보관(보류)">보관(보류)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Data Type */}
              <div className="space-y-1">
                <Label htmlFor="proj-type">처리 데이터 유형</Label>
                <Input
                  id="proj-type"
                  placeholder="예: 개인정보·금융결제, 사내 업무도구"
                  value={formData.serviceType}
                  onChange={(e) => {
                    setFormData({ ...formData, serviceType: e.target.value });
                    setIsFormDirty(true);
                  }}
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <Label htmlFor="proj-desc">프로젝트 설명</Label>
                <Input
                  id="proj-desc"
                  placeholder="시스템 개요 및 주요 기능 설명"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    setIsFormDirty(true);
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isFormDirty) {
                    setShowDiscardConfirm(true);
                  } else {
                    setIsFormOpen(false);
                  }
                }}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? '저장 중...' : editingProject ? '수정 완료' : '등록하기'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Discard Unsaved Changes Dialog (Section 7) */}
      <UnsavedChangesDialog
        open={showDiscardConfirm}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          setIsFormDirty(false);
          setIsFormOpen(false);
        }}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      {/* Delete Confirmation Alert Dialog (Section 4.2: 연결된 점검·발견사항·배포 심사도 데모 데이터에서 함께 제거되는 영향 안내) */}
      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle>프로젝트 삭제 확인</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2 text-slate-600">
              <p>
                정말로 프로젝트{' '}
                <strong className="text-slate-900 font-bold">
                  [{projectToDelete?.name}]
                </strong>
                을(를) 삭제하시겠습니까?
              </p>
              <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs leading-relaxed border border-rose-200">
                <strong className="block font-bold mb-1">⚠️ 연쇄 데이터 삭제 경고:</strong>
                본 프로젝트와 연결된 모든{' '}
                <strong>보안점검 이력, 발견사항(취약점), 배포 심사 기록</strong>이 데모
                데이터베이스에서 함께 영구 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              연결 데이터 포함 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Full-screen Interactive DevSecOps Workflow Canvas View (Matches User Images) */}
      {canvasProject && (
        <PipelineCanvasModal
          project={canvasProject}
          onClose={() => setCanvasProject(null)}
          onOpenSheet={() => {
            setDetailProject(canvasProject);
            setIsDetailOpen(true);
          }}
          onSelectProject={(newProj) => setCanvasProject(newProj)}
          onNavigate={(menu, filter) => {
            setCanvasProject(null);
            onNavigate?.(menu, filter);
          }}
        />
      )}

      {/* Onboarding Brownfield PR Checks Simulation Modal */}
      <GitHubPrChecksModal
        isOpen={isOnboardingPrModalOpen}
        onClose={() => setIsOnboardingPrModalOpen(false)}
        prNumber={1}
        prTitle="fix(security): 소스코드 점검 취약점(3건) 자동 조치 및 보안 분석 리포트"
        author="devlee0908"
        authorRole="선임 개발자 (클라우드개발실)"
        authorEmail="devlee0908@github.internal"
        sourceBranch="fix/security-remediation"
        targetBranch="main"
        commitId="f9c2a10"
        projectName={targetScanProject?.name || agentgateProject?.name || 'AgentGate 보안 게이트웨이 (연동 저장소)'}
        repoFullName={targetScanProject?.repository || agentgateProject?.repository || 'devlee0908/agentgate'}
        initialCheckStatus="failed"
        isDeltaBaselineMode={true}
        baselineDebtCount={2}
        detectedIssues={AGENTGATE_ALL_SCAN_ISSUES}
        rejectionInfo={
          agentgateReview?.approvalStatus === '반려'
            ? {
                reviewer: agentgateReview.reviewer || '보안 심사관',
                comment:
                  agentgateReview.reviewComment ||
                  '보안 정책 위반(SQL Injection 결함 미해결)으로 인해 운영 배포가 반려되었습니다.',
                reviewedAt: agentgateReview.reviewedAt,
              }
            : undefined
        }
        onSimulateFixPushed={() => {
          resolveAgentGateRemediation();
          toast.success('AgentGate 신규 PR 수정 커밋 검증 완료! GitHub Checks가 성공(Green)으로 전환되었습니다.');
        }}
        onNavigateToReviews={() => onNavigate?.('reviews')}
      />

      {/* Baseline Onboarding Wizard Modal (Full Codebase Scan -> Baseline -> PR Checks) */}
      {(targetScanProject || agentgateProject) && (
        <BaselineOnboardingWizardModal
          isOpen={isBaselineWizardOpen}
          onClose={() => {
            setIsBaselineWizardOpen(false);
            setTargetScanProject(null);
          }}
          project={targetScanProject || agentgateProject}
          onOpenPrChecks={() => {
            setIsBaselineWizardOpen(false);
            setTargetScanProject(null);
            setIsOnboardingPrModalOpen(true);
          }}
          onNavigateToReviews={() => {
            setIsBaselineWizardOpen(false);
            setTargetScanProject(null);
            onNavigate?.('reviews');
          }}
        />
      )}
    </div>
  );
};
