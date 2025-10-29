import * as React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const baseButtonClass =
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 ring-offset-slate-900';

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-400',
  destructive: 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400',
  outline: 'border border-slate-700/80 bg-transparent text-slate-200 hover:bg-slate-800/70 focus-visible:ring-slate-500',
  secondary: 'bg-slate-700 text-slate-50 hover:bg-slate-600/80 focus-visible:ring-slate-500',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800/70 focus-visible:ring-slate-500',
  link: 'text-blue-400 underline-offset-4 hover:underline',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8 text-base',
  icon: 'h-10 w-10',
};

interface ButtonVariantsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export const buttonVariants = ({ variant = 'default', size = 'default', className }: ButtonVariantsOptions = {}) =>
  cn(baseButtonClass, variantClasses[variant], sizeClasses[size], className);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return <button ref={ref} className={buttonVariants({ variant, size, className })} {...props} />;
  },
);

Button.displayName = 'Button';

export { Button };
