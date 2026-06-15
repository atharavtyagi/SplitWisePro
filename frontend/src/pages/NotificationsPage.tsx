import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import { timeAgo } from '../lib/utils';
import api from '../lib/api';
import { Notification } from '../types';

const TYPE_ICONS: Record<string, string> = {
  expense_added: '💸', settlement_request: '💳', settlement_completed: '✅',
  member_joined: '👋', member_left: '🚪', import_completed: '📥',
  import_failed: '❌', group_invitation: '📬', system: '🔔',
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then(r => r.data.results ?? r.data),
    refetchInterval: 30000,
  });

  const markAll = useMutation({
    mutationFn: () => api.post('/notifications/mark-all-read/'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markOne = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/`, { is_read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = notifications.filter(n => !n.is_read);

  return (
    <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          {unread.length > 0 && <p className="text-sm text-primary-400">{unread.length} unread</p>}
        </div>
        {unread.length > 0 && (
          <Button size="sm" variant="ghost" onClick={() => markAll.mutate()} leftIcon={<CheckCheck className="w-4 h-4" />}>
            Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : notifications.length === 0 ? (
        <EmptyState emoji="🔔" title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => (
            <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => !n.is_read && markOne.mutate(n.id)}
              className={`glass rounded-xl p-4 flex items-start gap-4 cursor-pointer transition-all hover:bg-white/6
                ${!n.is_read ? 'border border-primary-500/25 bg-primary-500/5' : 'border border-white/5'}`}>
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">
                {TYPE_ICONS[n.notification_type] ?? '🔔'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-white">{n.title}</p>
                  {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />}
                </div>
                <p className="text-sm text-gray-400">{n.message}</p>
                <p className="text-xs text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
