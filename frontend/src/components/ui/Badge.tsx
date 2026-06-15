import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  default: 'bg-white/10 text-gray-300 border-white/10',
  success: 'bg-green-500/15 text-green-400 border-green-500/25',
  warning: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  danger: 'bg-red-500/15 text-red-400 border-red-500/25',
  info: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  purple: 'bg-primary-500/15 text-primary-400 border-primary-500/25',
};

const sizes = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 font-medium rounded-full border', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    pending: { variant: 'warning', label: 'Pending' },
    completed: { variant: 'success', label: 'Completed' },
    cancelled: { variant: 'danger', label: 'Cancelled' },
    active: { variant: 'success', label: 'Active' },
    review: { variant: 'warning', label: 'Needs Review' },
    failed: { variant: 'danger', label: 'Failed' },
    imported: { variant: 'success', label: 'Imported' },
    equal: { variant: 'info', label: 'Equal' },
    exact: { variant: 'purple', label: 'Exact' },
    percent: { variant: 'warning', label: 'Percent' },
    shares: { variant: 'default', label: 'Shares' },
    settlement: { variant: 'success', label: 'Settlement' },
    admin: { variant: 'purple', label: 'Admin' },
    member: { variant: 'default', label: 'Member' },
  };
  const config = map[status] ?? { variant: 'default' as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
