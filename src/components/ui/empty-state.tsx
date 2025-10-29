import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { Button } from './button';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {Icon && (
          <div className="mb-4 rounded-full bg-slate-800/50 p-3">
            <Icon className="h-6 w-6 text-slate-400" />
          </div>
        )}
        <h3 className="mb-2 text-lg font-semibold text-slate-200">{title}</h3>
        {description && <p className="mb-4 max-w-sm text-sm text-slate-400">{description}</p>}
        {action && (
          <Button onClick={action.onClick} variant="outline" size="sm">
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
