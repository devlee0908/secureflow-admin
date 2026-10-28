import React from 'react';
import { Table } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Info,
} from 'lucide-react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  selectedRowsCount?: number;
  totalRowsCount?: number;
  onSelectAllPages?: () => void;
  isAllPagesSelected?: boolean;
}

export function DataTablePagination<TData>({
  table,
  selectedRowsCount = 0,
  totalRowsCount,
}: DataTablePaginationProps<TData>) {
  const currentPageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();
  const totalItems = totalRowsCount ?? table.getCoreRowModel().rows.length;
  const filteredItems = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-2 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200/80 dark:border-white/[0.08]">
      {/* Selection info */}
      <div className="flex items-center gap-2">
        {selectedRowsCount > 0 ? (
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-white/[0.08] text-zinc-900 dark:text-zinc-100 px-3 py-1 rounded-md border border-zinc-200 dark:border-white/[0.1]">
            <span className="font-semibold">{selectedRowsCount}개 항목 선택됨</span>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              (페이지 이동 시 선택 상태 유지됨)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <Info className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">
              전체 {totalItems}개 중 {filteredItems}개 표시 중
            </span>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="flex items-center space-x-4 lg:space-x-6">
        <div className="flex items-center space-x-2">
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">페이지 당 항목 수</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
              table.setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs font-mono">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-[100px] items-center justify-center text-xs font-medium font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
          페이지 {pageCount > 0 ? currentPageIndex + 1 : 0} / {pageCount}
        </div>

        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="첫 페이지로 이동"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="이전 페이지"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="다음 페이지"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="마지막 페이지로 이동"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
