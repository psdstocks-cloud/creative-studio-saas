import clsx from 'clsx';
import React from 'react';

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  isIndeterminate?: boolean;
  showLabel?: boolean;
}

export const ProgressBar = ({ value = 0, isIndeterminate = false, showLabel = false, className, ...rest }: ProgressBarProps) => {
  const clampedValue = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percentage = Math.round(clampedValue * 100);

  return (
    <div
      className={clsx('relative h-2 w-full overflow-hidden rounded-full bg-slate-800/60', className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={isIndeterminate ? undefined : percentage}
      aria-busy={isIndeterminate}
      {...rest}
    >
      <div
        className={clsx(
          'h-full rounded-full bg-blue-500 transition-all duration-300 ease-out',
          isIndeterminate && 'w-full animate-pulse'
        )}
        style={isIndeterminate ? undefined : { width: `${percentage}%` }}
      />
      {showLabel && !isIndeterminate ? (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-blue-100">
          {percentage}%
        </span>
      ) : null}
    </div>
  );
};

export default ProgressBar;
