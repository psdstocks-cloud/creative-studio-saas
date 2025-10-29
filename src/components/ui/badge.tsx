import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-slate-900 text-slate-50 hover:bg-slate-900/80',
        secondary: 'border-transparent bg-slate-800 text-slate-100 hover:bg-slate-800/80',
        destructive: 'border-transparent bg-rose-500 text-slate-50 hover:bg-rose-500/80',
        success: 'border-transparent bg-emerald-500 text-slate-50 hover:bg-emerald-500/80',
        warning: 'border-transparent bg-amber-500 text-slate-900 hover:bg-amber-500/80',
        outline: 'text-slate-200 border-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
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
