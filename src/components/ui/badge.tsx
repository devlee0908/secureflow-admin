import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900",
        secondary: "border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
        destructive: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        outline: "border-zinc-200 dark:border-white/[0.1] text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/[0.03]",
        success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400",
        danger: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-400",
        info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-400",
        neutral: "border-zinc-200 dark:border-white/[0.1] bg-zinc-100/80 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
