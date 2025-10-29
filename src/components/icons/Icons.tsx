import React from 'react';

const iconProps = {
  className: 'w-6 h-6',
  strokeWidth: 1.5,
  stroke: 'currentColor',
  fill: 'none',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

interface IconProps {
  className?: string;
}

export const HomeIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
    <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
  </svg>
);

export const MenuIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="14" y2="18" />
  </svg>
);

export const ImageIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="15" y1="8" x2="15.01" y2="8" />
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <path d="M4 15l4 -4a3 5 0 0 1 3 0l5 5" />
    <path d="M14 14l1 -1a3 5 0 0 1 3 0l2 2" />
  </svg>
);

export const SparklesIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm0 -12a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2zm-11 6a2 2 0 0 1 2 2a2 2 0 0 1 2 -2a2 2 0 0 1 -2 -2a2 2 0 0 1 -2 2z" />
  </svg>
);

export const CodeBracketIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M7 8l-4 4l4 4" />
    <path d="M17 8l4 4l-4 4" />
    <line x1="14" y1="4" x2="10" y2="20" />
  </svg>
);

export const ServerIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="3" y="4" width="18" height="8" rx="3" />
    <rect x="3" y="12" width="18" height="8" rx="3" />
    <line x1="7" y1="8" x2="7" y2="8.01" />
    <line x1="7" y1="16" x2="7" y2="16.01" />
  </svg>
);

export const ArrowTopRightOnSquareIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
    <path d="M11 13l9 -9" />
    <path d="M15 4h5v5" />
  </svg>
);

export const CogIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const LinkIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 14a3.5 3.5 0 0 0 5 0l4 -4a3.5 3.5 0 0 0 -5 -5l-.5 .5" />
    <path d="M14 10a3.5 3.5 0 0 0 -5 0l-4 4a3.5 3.5 0 0 0 5 5l.5 -.5" />
  </svg>
);

export const CheckCircleIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9" />
    <path d="M9 12l2 2l4 -4" />
  </svg>
);

export const ArrowPathIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4.05 11a8 8 0 1 1 .5 4m-.5 5v-5h5" />
  </svg>
);

export const CpuChipIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="5" y="5" width="14" height="14" rx="1" />
    <path d="M9 9h6v6h-6z" />
    <path d="M3 10h2" />
    <path d="M3 14h2" />
    <path d="M10 3v2" />
    <path d="M14 3v2" />
    <path d="M21 10h-2" />
    <path d="M21 14h-2" />
    <path d="M14 21v-2" />
    <path d="M10 21v-2" />
  </svg>
);

export const XMarkIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const XCircleIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9" />
    <path d="M10 10l4 4m0 -4l-4 4" />
  </svg>
);

export const WalletIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M17 8v-3a1 1 0 0 0 -1 -1h-10a2 2 0 0 0 0 4h12a1 1 0 0 1 1 1v3m0 4v3a1 1 0 0 1 -1 1h-12a2 2 0 0 1 -2 -2v-12" />
    <path d="M20 12v4h-4a2 2 0 0 1 0 -4h4" />
  </svg>
);

export const UserCircleIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <circle cx="12" cy="12" r="9" />
    <path d="M9 17a3 3 0 0 1 6 0" />
    <path d="M12 12a3 3 0 1 0 0 -6a3 3 0 0 0 0 6z" />
  </svg>
);

export const SignOutIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M14 8v-2a2 2 0 0 0 -2 -2h-7a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2 -2v-2" />
    <path d="M7 12h14l-3 -3m0 6l3 -3" />
  </svg>
);

export const EnvelopeIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <polyline points="3 7 12 13 21 7" />
  </svg>
);

export const TagIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M11 3h5a2 2 0 0 1 2 2v5l-9 9l-6 -6z" />
    <path d="M9 7v.01" />
  </svg>
);

export const LockClosedIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <circle cx="12" cy="16" r="1" />
    <path d="M8 11v-4a4 4 0 0 1 8 0v4" />
  </svg>
);

export const EyeIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 12c2.5 -4 5.5 -6 9 -6s6.5 2 9 6c-2.5 4 -5.5 6 -9 6s-6.5 -2 -9 -6z" />
    <circle cx="12" cy="12" r="2.5" />
  </svg>
);

export const EyeSlashIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M3 12c2.5 -4 5.5 -6 9 -6s6.5 2 9 6c-2.5 4 -5.5 6 -9 6s-6.5 -2 -9 -6z" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </svg>
);

export const EnvelopeCheckIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M15 19h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v4" />
    <path d="M3 7l9 6l9 -6" />
    <path d="M15 19l2 2l4 -4" />
  </svg>
);

export const ExclamationTriangleIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M12 9v2m0 4v.01" />
    <path d="M5 19h14a2 2 0 0 0 1.84 -2.75l-7.1 -12.25a2 2 0 0 0 -3.5 0l-7.1 12.25a2 2 0 0 0 1.75 2.75" />
  </svg>
);

export const ArrowDownTrayIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
    <polyline points="7 11 12 16 17 11" />
    <line x1="12" y1="4" x2="12" y2="16" />
  </svg>
);

export const MagnifyingGlassIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
    <path d="M21 21l-6 -6" />
  </svg>
);

export const DocumentDuplicateIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

export const ChevronUpIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <polyline points="6 15 12 9 18 15" />
  </svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg {...iconProps} className={className || iconProps.className} viewBox="0 0 24 24">
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <polyline points="15 6 9 12 15 18" />
  </svg>
);
