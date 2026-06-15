import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import api from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Group } from '../../types';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  currency: z.string().min(3).max(3),
});
type FormData = z.infer<typeof schema>;

const CURRENCY_OPTIONS = [
  { value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' }, { value: 'GBP', label: '£ GBP' },
];

export default function GroupsPage() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const { success, error } = useToast();
  const qc = useQueryClient();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups/').then(r => r.data.results ?? r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema), defaultValues: { currency: 'INR' },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/groups/', data).then(r => r.data),
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      success('Group created!', group.name);
      setShowCreate(false);
      reset();
      navigate(`/groups/${group.id}`);
    },
    onError: () => error('Failed', 'Could not create group'),
  });

  const filtered = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Groups</h1>
          <p className="text-sm text-gray-500">{groups.length} group{groups.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>New Group</Button>
      </div>

      <Input
        placeholder="Search groups…" value={search} onChange={e => setSearch(e.target.value)}
        leftIcon={<Search className="w-4 h-4" />}
      />

      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState emoji="👥" title={search ? 'No groups match your search' : 'No groups yet'}
          description={search ? 'Try a different search term' : 'Create your first group to start splitting expenses'}
          action={!search ? <Button onClick={() => setShowCreate(true)} leftIcon={<Plus className="w-4 h-4" />}>Create Group</Button> : undefined}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((group, i) => (
            <motion.div key={group.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card hover onClick={() => navigate(`/groups/${group.id}`)} className="group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center text-sm font-bold text-white shadow-glow-sm">
                      {group.name[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm leading-tight">{group.name}</h3>
                      <p className="text-xs text-gray-500">{formatDate(group.created_at)}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 transition-colors" />
                </div>
                {group.description && <p className="text-xs text-gray-500 mb-4 line-clamp-2">{group.description}</p>}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white/4 rounded-xl p-2.5">
                    <p className="text-[10px] text-gray-500 mb-0.5">Total Expenses</p>
                    <p className="text-sm font-bold text-white">{formatCurrency(group.total_expenses, group.currency)}</p>
                  </div>
                  <div className={`rounded-xl p-2.5 ${group.outstanding_balance < 0 ? 'bg-red-500/10' : group.outstanding_balance > 0 ? 'bg-green-500/10' : 'bg-white/4'}`}>
                    <p className="text-[10px] text-gray-500 mb-0.5">Your Balance</p>
                    <p className={`text-sm font-bold ${group.outstanding_balance < 0 ? 'text-red-400' : group.outstanding_balance > 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      {group.outstanding_balance === 0 ? 'Settled' : formatCurrency(group.outstanding_balance, group.currency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  </div>
                  <Badge variant="default" size="sm">{group.currency}</Badge>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Create New Group">
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4">
          <Input label="Group Name" placeholder="e.g. Goa Trip 2025" error={errors.name?.message} {...register('name')} required />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description <span className="text-gray-600">(optional)</span></label>
            <textarea {...register('description')} placeholder="What's this group for?" rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 hover:border-white/20 focus:border-primary-500/60 transition-all resize-none" />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Currency</label>
            <select {...register('currency')} className="w-full bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              {CURRENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
            <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>Create Group</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
