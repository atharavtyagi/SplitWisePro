import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Avatar } from './ui/Avatar';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { SkeletonTable } from './ui/Skeleton';
import api from '../lib/api';
import { formatCurrency, CATEGORY_ICONS, formatDate } from '../lib/utils';
import { BalanceExplanationItem } from '../types';

interface Props {
  userId: string;
  groupId: string;
  userName: string;
  onClose: () => void;
}

export default function BalanceExplainModal({ userId, groupId, userName, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ['explain-balance', userId, groupId],
    queryFn: () => api.get(`/expenses/explain-balance/?user=${userId}&group=${groupId}`).then(r => r.data),
  });

  const breakdown: BalanceExplanationItem[] = data?.breakdown ?? [];
  const totalOwed = data?.total_owed ?? 0;
  const totalPaid = data?.total_paid ?? 0;

  return (
    <Modal isOpen onClose={onClose} title={`Why does ${userName} owe this amount?`} size="lg">
      {isLoading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
              <p className="text-xs text-gray-400">Total Paid</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              <p className="text-xs text-gray-400">Total Owed</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(totalOwed)}</p>
            </div>
          </div>

          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-3 flex items-center justify-between">
            <p className="text-sm text-gray-300">Net Balance</p>
            <p className={`text-base font-bold ${totalPaid - totalOwed >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(Math.abs(totalPaid - totalOwed))}
              <span className="text-xs font-normal ml-1 text-gray-500">
                {totalPaid - totalOwed >= 0 ? '(owed to them)' : '(they owe)'}
              </span>
            </p>
          </div>

          {/* Expense Breakdown — No magic numbers */}
          <div>
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Every amount is traceable to a specific expense
            </p>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {breakdown.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">No expense records found</p>
              ) : (
                breakdown.map((item, i) => (
                  <motion.div key={item.expense_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/4 hover:bg-white/6 transition-colors">
                    <div className="text-lg">{CATEGORY_ICONS[item.category] ?? '📌'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{item.expense_title}</p>
                      <p className="text-xs text-gray-500">
                        Paid by <span className="text-gray-400">{item.paid_by_name}</span> · {formatDate(item.date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {item.is_payer ? (
                        <p className="text-sm font-semibold text-green-400">+{formatCurrency(item.expense_amount, item.currency)}</p>
                      ) : (
                        <p className="text-sm font-semibold text-red-400">-{formatCurrency(item.user_share, item.currency)}</p>
                      )}
                      <Badge variant={item.is_payer ? 'success' : 'danger'} size="sm">{item.is_payer ? 'Paid' : 'Share'}</Badge>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <Button variant="ghost" className="w-full" onClick={onClose}>Close</Button>
        </div>
      )}
    </Modal>
  );
}
