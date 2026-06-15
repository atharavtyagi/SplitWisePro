import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Users, CreditCard, TrendingDown, TrendingUp, Clock, Activity } from 'lucide-react';
import { StatCard } from '../components/ui/Card';
import { SkeletonStats } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import api from '../lib/api';
import { formatCurrency, timeAgo, CATEGORY_COLORS, CATEGORY_ICONS } from '../lib/utils';
import { DashboardStats, SpendingTrend, CategoryData, ActivityLog } from '../types';

const CHART_COLORS = ['#7C3AED', '#A855F7', '#C084FC', '#818CF8', '#60A5FA', '#34D399'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl border border-white/10 p-3 text-xs shadow-card">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="font-semibold text-white">
          {p.name}: <span style={{ color: p.color }}>{typeof p.value === 'number' && p.name !== 'count' ? formatCurrency(p.value) : p.value}</span>
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard/').then(r => r.data),
  });

  const { data: trend = [] } = useQuery<SpendingTrend[]>({
    queryKey: ['spending-trend'],
    queryFn: () => api.get('/analytics/spending-trend/').then(r => r.data),
  });

  const { data: categories = [] } = useQuery<CategoryData[]>({
    queryKey: ['category-distribution'],
    queryFn: () => api.get('/analytics/category-distribution/').then(r => r.data),
  });

  const { data: activity = [] } = useQuery<ActivityLog[]>({
    queryKey: ['activity'],
    queryFn: () => api.get('/audit/activity/').then(r => r.data.results ?? r.data),
  });

  const ACTION_ICONS: Record<string, string> = {
    expense_added: '💸', expense_edited: '✏️', expense_deleted: '🗑️',
    settlement_created: '💳', settlement_completed: '✅',
    member_joined: '👋', member_left: '👋', import_completed: '📥',
    group_created: '📁', group_updated: '📝', duplicate_resolved: '🔍',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      {statsLoading ? <SkeletonStats /> : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Groups" value={stats?.total_groups ?? 0} icon={<Users className="w-5 h-5" />} color="purple" />
          <StatCard title="Total Expenses" value={formatCurrency(stats?.total_expenses ?? 0)} icon={<CreditCard className="w-5 h-5" />} color="blue" />
          <StatCard title="You Owe" value={formatCurrency(stats?.amount_you_owe ?? 0)} icon={<TrendingDown className="w-5 h-5" />} color="red" subtitle="Outstanding" />
          <StatCard title="Owed to You" value={formatCurrency(stats?.amount_owed_to_you ?? 0)} icon={<TrendingUp className="w-5 h-5" />} color="green" subtitle="To receive" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Spending Trend */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Monthly Spending</h2>
          {trend.length === 0 ? (
            <EmptyState emoji="📊" title="No spending data yet" description="Add expenses to see your trends" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#7C3AED" strokeWidth={2} fill="url(#colorTotal)" name="Spending" dot={{ fill: '#7C3AED', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Distribution */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">By Category</h2>
          {categories.length === 0 ? (
            <EmptyState emoji="🏷️" title="No categories yet" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categories} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="total">
                    {categories.map((c, i) => (
                      <Cell key={c.category} fill={CATEGORY_COLORS[c.category] ?? CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {categories.slice(0, 5).map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CATEGORY_ICONS[c.category] ?? '📌'}</span>
                      <span className="text-gray-400 capitalize">{c.category}</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(c.total)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary-400" />
          <h2 className="text-sm font-semibold text-white">Recent Activity</h2>
        </div>
        {activity.length === 0 ? (
          <EmptyState emoji="🎯" title="No activity yet" description="Your activity feed will appear here" />
        ) : (
          <div className="space-y-3">
            {activity.slice(0, 10).map((log, i) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/4 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm shrink-0">
                  {ACTION_ICONS[log.action_type] ?? '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{log.description}</p>
                  <p className="text-xs text-gray-600">{timeAgo(log.timestamp)}</p>
                </div>
                <Avatar src={log.user?.avatar} name={log.user?.full_name} size="xs" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
