import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeftRight, CheckCircle, Plus, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { Select } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';
import { formatCurrency, formatDate, timeAgo } from '../lib/utils';
import { Settlement, Group, OptimizedSettlement } from '../types';

export default function SettlementsPage() {
  const { success, error } = useToast();
  const qc = useQueryClient();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showOptimizer, setShowOptimizer] = useState(false);

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups/').then(r => r.data.results ?? r.data),
  });

  const { data: settlements = [], isLoading } = useQuery<Settlement[]>({
    queryKey: ['settlements', selectedGroup],
    queryFn: () => api.get(`/settlements/${selectedGroup ? `?group=${selectedGroup}` : ''}`).then(r => r.data.results ?? r.data),
  });

  const { data: optimized = [] } = useQuery<OptimizedSettlement[]>({
    queryKey: ['optimized', selectedGroup],
    queryFn: () => api.get(`/settlements/optimize/?group=${selectedGroup}`).then(r => r.data),
    enabled: !!selectedGroup && showOptimizer,
  });

  const markSettled = useMutation({
    mutationFn: (id: string) => api.patch(`/settlements/${id}/mark_settled/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settlements'] }); success('Marked as settled!'); },
    onError: () => error('Failed', 'Could not update settlement'),
  });

  const createFromOptimized = useMutation({
    mutationFn: (s: OptimizedSettlement) => api.post('/settlements/', {
      payer_id: s.payer.id, receiver_id: s.receiver.id,
      amount: s.amount, currency: s.currency, group: selectedGroup,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settlements'] }); success('Settlement created!'); },
    onError: () => error('Failed', 'Could not create settlement'),
  });

  const groupOptions = [
    { value: '', label: 'All Groups' },
    ...groups.map(g => ({ value: g.id, label: g.name })),
  ];

  const pending = settlements.filter(s => s.status === 'pending');
  const completed = settlements.filter(s => s.status === 'completed');

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Settlements</h1>
          <p className="text-sm text-gray-500">{pending.length} pending · {completed.length} completed</p>
        </div>
        <div className="flex gap-2">
          {selectedGroup && (
            <Button variant="outline" size="sm" onClick={() => setShowOptimizer(true)} leftIcon={<Sparkles className="w-4 h-4" />}>
              Optimize
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-xs">
        <Select options={groupOptions} value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} />
      </div>

      {isLoading ? <SkeletonTable /> : (
        <div className="space-y-4">
          {/* Pending */}
          {pending.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <h2 className="text-sm font-semibold text-white">Pending ({pending.length})</h2>
              </div>
              <div className="divide-y divide-white/5">
                {pending.map(s => (
                  <div key={s.id} className="px-4 py-4 flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar src={s.payer.avatar} name={s.payer.full_name} size="sm" />
                      <div>
                        <p className="text-sm font-medium text-white">{s.payer.full_name}</p>
                        <p className="text-xs text-gray-500">payer</p>
                      </div>
                      <ArrowLeftRight className="w-4 h-4 text-gray-600 mx-2" />
                      <div>
                        <p className="text-sm font-medium text-white">{s.receiver.full_name}</p>
                        <p className="text-xs text-gray-500">receiver</p>
                      </div>
                      <Avatar src={s.receiver.avatar} name={s.receiver.full_name} size="sm" />
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-bold text-white">{formatCurrency(s.amount, s.currency)}</p>
                      <p className="text-xs text-gray-500">{timeAgo(s.created_at)}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => markSettled.mutate(s.id)} isLoading={markSettled.isPending}
                      leftIcon={<CheckCircle className="w-3.5 h-3.5" />}>
                      Mark Settled
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="glass rounded-2xl overflow-hidden opacity-75">
              <div className="px-4 py-3 border-b border-white/8">
                <h2 className="text-sm font-semibold text-white">Completed ({completed.length})</h2>
              </div>
              <div className="divide-y divide-white/5">
                {completed.slice(0, 10).map(s => (
                  <div key={s.id} className="px-4 py-3 flex items-center gap-4">
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar src={s.payer.avatar} name={s.payer.full_name} size="sm" />
                      <span className="text-sm text-gray-400">{s.payer.full_name}</span>
                      <ArrowLeftRight className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-sm text-gray-400">{s.receiver.full_name}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-400">{formatCurrency(s.amount, s.currency)}</p>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {settlements.length === 0 && (
            <EmptyState emoji="✅" title="No settlements" description="Once members have balances, settlements will appear here" />
          )}
        </div>
      )}

      {/* Optimizer Modal */}
      <Modal isOpen={showOptimizer} onClose={() => setShowOptimizer(false)} title="Optimized Settlements" size="lg">
        <div className="space-y-3">
          <p className="text-sm text-gray-400">The minimum number of transactions to settle all debts in this group:</p>
          {optimized.length === 0 ? (
            <EmptyState emoji="🎉" title="Everyone is settled!" description="No transactions needed" />
          ) : (
            <>
              {optimized.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-3 p-4 glass rounded-xl border border-primary-500/15">
                  <Avatar src={s.payer.avatar} name={s.payer.full_name} size="sm" />
                  <div className="flex-1">
                    <p className="text-sm text-white">
                      <span className="font-semibold">{s.payer.full_name}</span>
                      <span className="text-gray-500"> pays </span>
                      <span className="font-semibold">{s.receiver.full_name}</span>
                    </p>
                  </div>
                  <p className="text-base font-bold text-primary-400">{formatCurrency(s.amount, s.currency)}</p>
                  <Button size="sm" onClick={() => createFromOptimized.mutate(s)} isLoading={createFromOptimized.isPending} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Record
                  </Button>
                </motion.div>
              ))}
              <p className="text-xs text-gray-500 text-center">{optimized.length} transaction{optimized.length !== 1 ? 's' : ''} needed to settle all debts</p>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
