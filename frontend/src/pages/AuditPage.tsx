import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Filter } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { SkeletonTable } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Avatar } from '../components/ui/Avatar';
import { Select } from '../components/ui/Input';
import { formatDate, timeAgo } from '../lib/utils';
import api from '../lib/api';
import { AuditLog } from '../types';

const ACTION_COLORS: Record<string, string> = {
  create: 'success', update: 'info', delete: 'danger',
  import_completed: 'success', settlement: 'purple',
};

export default function AuditPage() {
  const [filter, setFilter] = React.useState('');
  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs', filter],
    queryFn: () => api.get(`/audit/logs/${filter ? `?entity_type=${filter}` : ''}`).then(r => r.data.results ?? r.data),
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Audit Logs</h1>
          <p className="text-sm text-gray-500">Full traceable history of every action</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="w-40">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="w-full bg-background-tertiary border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
              <option value="">All Types</option>
              <option value="expense">Expenses</option>
              <option value="settlement">Settlements</option>
              <option value="group">Groups</option>
              <option value="import_session">Imports</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? <SkeletonTable /> : logs.length === 0 ? (
        <EmptyState emoji="📋" title="No audit logs" description="Actions you take will be recorded here" />
      ) : (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="divide-y divide-white/5">
            {logs.map((log, i) => (
              <motion.div key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="px-4 py-3.5 flex items-start gap-4 hover:bg-white/3 transition-colors">
                <Avatar src={log.user?.avatar} name={log.user?.full_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-white">{log.user?.full_name}</p>
                    <Badge variant={ACTION_COLORS[log.action] as any ?? 'default'} size="sm">{log.action}</Badge>
                    <span className="text-xs text-gray-500">{log.entity_type}: <span className="text-gray-400 font-mono">{log.entity_id.slice(0, 8)}…</span></span>
                  </div>
                  {(log.new_value || log.old_value) && (
                    <div className="mt-1.5 text-xs text-gray-600 bg-white/4 rounded-lg px-2 py-1.5 font-mono overflow-hidden max-w-lg">
                      {log.new_value ? JSON.stringify(log.new_value).slice(0, 120) : '(deleted)'}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 shrink-0">{timeAgo(log.timestamp)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
