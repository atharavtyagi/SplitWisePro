import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Plus, Users, CreditCard, ArrowLeftRight,
  Clock, Upload, UserPlus, Trash2, Crown, Sparkles,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { Badge, StatusBadge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonCard, SkeletonTable } from '../../components/ui/Skeleton';
import { Input } from '../../components/ui/Input';
import BalanceExplainModal from '../../components/BalanceExplainModal';
import ImportWizard from '../ImportWizard';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { formatCurrency, formatDate, timeAgo, CATEGORY_ICONS, SPLIT_LABELS } from '../../lib/utils';
import { Group, GroupMember, Expense, Balance, TimelineEvent } from '../../types';

type Tab = 'overview' | 'expenses' | 'balances' | 'members' | 'timeline' | 'import';
const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: 'expenses', label: 'Expenses', icon: <CreditCard className="w-3.5 h-3.5" /> },
  { id: 'balances', label: 'Balances', icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { id: 'members', label: 'Members', icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock className="w-3.5 h-3.5" /> },
  { id: 'import', label: 'Import', icon: <Upload className="w-3.5 h-3.5" /> },
];

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [explainUser, setExplainUser] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const { data: group, isLoading } = useQuery<Group>({
    queryKey: ['group', id],
    queryFn: () => api.get(`/groups/${id}/`).then(r => r.data),
    enabled: !!id,
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['expenses', id],
    queryFn: () => api.get(`/expenses/?group=${id}`).then(r => r.data.results ?? r.data),
    enabled: tab === 'expenses' || tab === 'overview',
  });

  const { data: members = [] } = useQuery<GroupMember[]>({
    queryKey: ['members', id],
    queryFn: () => api.get(`/groups/${id}/members/`).then(r => r.data),
    enabled: !!id,
  });

  const { data: balances = [] } = useQuery<Balance[]>({
    queryKey: ['balances', id],
    queryFn: () => api.get(`/expenses/balances/?group=${id}`).then(r => r.data),
    enabled: tab === 'balances',
  });

  const { data: timeline = [] } = useQuery<TimelineEvent[]>({
    queryKey: ['timeline', id],
    queryFn: () => api.get(`/groups/${id}/timeline/`).then(r => r.data),
    enabled: tab === 'timeline',
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/groups/${id}/invite_member/`, { email: inviteEmail }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members', id] });
      success('Member invited!', inviteEmail);
      setShowInvite(false);
      setInviteEmail('');
    },
    onError: (e: any) => error('Failed', e.response?.data?.error ?? 'Could not invite member'),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => api.delete(`/groups/${id}/remove-member/${userId}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['members', id] }); success('Member removed'); },
    onError: () => error('Failed', 'Could not remove member'),
  });

  if (isLoading) return <div className="space-y-4"><SkeletonCard /><SkeletonTable /></div>;
  if (!group) return <EmptyState emoji="❌" title="Group not found" action={<Button onClick={() => navigate('/groups')}>Back to Groups</Button>} />;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/groups')} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-white font-bold shadow-glow-sm">
              {group.name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{group.name}</h1>
              {group.description && <p className="text-sm text-gray-500">{group.description}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/new?group=${id}`)} leftIcon={<Plus className="w-4 h-4" />}>Add Expense</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 glass rounded-xl overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
              ${tab === t.id ? 'bg-gradient-primary text-white shadow-glow-sm' : 'text-gray-500 hover:text-white hover:bg-white/6'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-white">{formatCurrency(group.total_expenses, group.currency)}</p>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Members</p>
              <p className="text-xl font-bold text-white">{group.member_count}</p>
            </div>
            <div className={`glass rounded-2xl p-4 text-center ${group.outstanding_balance < 0 ? 'border-red-500/20' : 'border-green-500/20'}`}>
              <p className="text-xs text-gray-500 mb-1">Your Balance</p>
              <p className={`text-xl font-bold ${group.outstanding_balance < 0 ? 'text-red-400' : group.outstanding_balance > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                {group.outstanding_balance === 0 ? 'Settled ✓' : formatCurrency(group.outstanding_balance, group.currency)}
              </p>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Expenses</h3>
            {expenses.length === 0 ? (
              <EmptyState emoji="💸" title="No expenses yet" action={<Button size="sm" onClick={() => navigate(`/expenses/new?group=${id}`)}>Add First Expense</Button>} />
            ) : (
              <div className="space-y-2">
                {expenses.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/4 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-sm">{CATEGORY_ICONS[e.category] ?? '📌'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{e.title}</p>
                      <p className="text-xs text-gray-500">Paid by {e.paid_by.full_name} · {formatDate(e.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(e.amount, e.currency)}</p>
                      <StatusBadge status={e.split_type} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/8 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-white">{expenses.length} Expenses</h3>
            <Button size="sm" onClick={() => navigate(`/expenses/new?group=${id}`)} leftIcon={<Plus className="w-3.5 h-3.5" />}>Add</Button>
          </div>
          {expenses.length === 0 ? (
            <EmptyState emoji="💸" title="No expenses yet" action={<Button size="sm" onClick={() => navigate(`/expenses/new?group=${id}`)}>Add First Expense</Button>} />
          ) : (
            <div className="divide-y divide-white/5">
              {expenses.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-base">{CATEGORY_ICONS[e.category] ?? '📌'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{e.title}</p>
                    <p className="text-xs text-gray-500">Paid by <span className="text-gray-400">{e.paid_by.full_name}</span> · {formatDate(e.date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-white">{formatCurrency(e.amount, e.currency)}</p>
                    <StatusBadge status={e.split_type} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'balances' && (
        <div className="space-y-3">
          {balances.map(b => (
            <div key={b.user.id} className={`glass rounded-2xl p-4 flex items-center gap-4 border ${b.net_balance < 0 ? 'border-red-500/15' : b.net_balance > 0 ? 'border-green-500/15' : 'border-white/8'}`}>
              <Avatar src={b.user.avatar} name={b.user.full_name} size="md" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{b.user.full_name}</p>
                <p className="text-xs text-gray-500">{b.net_balance < 0 ? 'Owes' : b.net_balance > 0 ? 'Is owed' : 'Settled up'}</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${b.net_balance < 0 ? 'text-red-400' : b.net_balance > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                  {b.net_balance === 0 ? '✓ Settled' : formatCurrency(Math.abs(b.net_balance), group.currency)}
                </p>
              </div>
              <Button size="sm" variant="outline" leftIcon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => setExplainUser(b.user.id)}>
                Explain
              </Button>
            </div>
          ))}
          {balances.length === 0 && <EmptyState emoji="⚖️" title="No balances yet" description="Add expenses to see who owes what" />}
        </div>
      )}

      {tab === 'members' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowInvite(true)} leftIcon={<UserPlus className="w-4 h-4" />}>Invite Member</Button>
          </div>
          {members.map(m => (
            <div key={m.id} className="glass rounded-2xl p-4 flex items-center gap-4">
              <Avatar src={m.user.avatar} name={m.user.full_name} size="md" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">{m.user.full_name}</p>
                  {m.role === 'admin' && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
                <p className="text-xs text-gray-500">{m.user.email} · Joined {formatDate(m.joined_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.role} />
                {m.is_active ? <Badge variant="success" size="sm">Active</Badge> : <Badge variant="default" size="sm">Left</Badge>}
                {m.user.id !== user?.id && m.is_active && (
                  <Button size="sm" variant="ghost" onClick={() => removeMember.mutate(m.user.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'timeline' && (
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Membership Timeline</h3>
          {timeline.length === 0 ? <EmptyState emoji="📅" title="No timeline events" /> : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-white/10" />
              {timeline.map((event, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="relative flex items-center gap-3 mb-5">
                  <div className={`absolute -left-4 w-3 h-3 rounded-full border-2 ${event.event_type === 'joined' ? 'bg-green-500 border-green-400' : 'bg-red-500 border-red-400'}`} />
                  <Avatar src={event.user.avatar} name={event.user.full_name} size="sm" />
                  <div>
                    <p className="text-sm text-white">
                      <span className="font-semibold">{event.user.full_name}</span>
                      <span className={` ml-1 ${event.event_type === 'joined' ? 'text-green-400' : 'text-red-400'}`}>
                        {event.event_type === 'joined' ? 'joined' : 'left'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(event.date)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'import' && (
        <div className="glass rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">📥</div>
          <h3 className="text-lg font-semibold text-white mb-2">Import Expenses from CSV</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">Upload your CSV file. Our AI will detect anomalies, duplicates, and guide you through the import process.</p>
          <Button onClick={() => setShowImport(true)} leftIcon={<Upload className="w-4 h-4" />} size="lg">Start Import Wizard</Button>
        </div>
      )}

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Member">
        <div className="space-y-4">
          <Input label="Email address" type="email" placeholder="member@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="ghost" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button className="flex-1" onClick={() => inviteMutation.mutate()} isLoading={inviteMutation.isPending}>Invite</Button>
          </div>
        </div>
      </Modal>

      {/* Balance Explain Modal */}
      {explainUser && (
        <BalanceExplainModal
          userId={explainUser} groupId={id!}
          userName={members.find(m => m.user.id === explainUser)?.user.full_name ?? ''}
          onClose={() => setExplainUser(null)}
        />
      )}

      {/* Import Wizard */}
      {showImport && <ImportWizard groupId={id!} onClose={() => setShowImport(false)} />}
    </div>
  );
}
