import React from 'react';
import { Column } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-xs font-semibold text-slate-700', className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(isSorted === 'asc')}
      className={cn(
        'group flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors focus:outline-none select-none',
        className
      )}
    >
      <span>{title}</span>
      {isSorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5 text-indigo-600" />
      ) : isSorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5 text-indigo-600" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
