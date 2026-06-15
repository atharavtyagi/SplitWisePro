import React from 'react';
import { cn, getInitials } from '../../lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
};

export function Avatar({ src, name = '', size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src} alt={name}
        className={cn('rounded-full object-cover ring-2 ring-white/10', sizeMap[size], className)}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div className={cn(
      'rounded-full flex items-center justify-center font-semibold shrink-0 ring-2 ring-white/10',
      'bg-gradient-primary text-white',
      sizeMap[size], className
    )}>
      {getInitials(name)}
    </div>
  );
}

export function AvatarGroup({ users, max = 3 }: { users: { name?: string; avatar?: string }[]; max?: number }) {
  const visible = users.slice(0, max);
  const overflow = users.length - max;
  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <Avatar key={i} src={u.avatar} name={u.name} size="sm" className="ring-2 ring-background" />
      ))}
      {overflow > 0 && (
        <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-background flex items-center justify-center text-[10px] font-semibold text-gray-300">
          +{overflow}
        </div>
      )}
    </div>
  );
}
