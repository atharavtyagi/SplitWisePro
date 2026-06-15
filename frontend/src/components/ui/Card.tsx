import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
  onClick?: () => void;
}

export function Card({ children, className, hover = false, gradient = false, onClick }: CardProps) {
  const base = 'glass rounded-2xl p-5';
  const hoverClass = hover ? 'cursor-pointer hover:border-primary-500/30 hover:shadow-card-hover transition-all duration-300' : '';
  const gradientClass = gradient ? 'bg-gradient-card border-primary-500/20' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -2 } : undefined}
      className={cn(base, hoverClass, gradientClass, className)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export function StatCard({
  title, value, subtitle, icon, color = 'purple', trend,
}: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ReactNode; color?: string; trend?: { value: number; label: string };
}) {
  const colorMap: Record<string, string> = {
    purple: 'bg-primary-500/10 text-primary-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    blue: 'bg-blue-500/10 text-blue-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
  };

  return (
    <Card gradient>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-400 font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={`p-2.5 rounded-xl ${colorMap[color] ?? colorMap.purple}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
