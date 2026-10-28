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
    return <div className={cn('text-xs font-medium text-zinc-600 dark:text-zinc-400', className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(isSorted === 'asc')}
      className={cn(
        'group flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors focus:outline-none select-none',
        className
      )}
    >
      <span>{title}</span>
      {isSorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
      ) : isSorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5 text-zinc-900 dark:text-zinc-100" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );
}
