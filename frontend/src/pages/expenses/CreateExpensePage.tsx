import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Trash2, Equal, DollarSign, Percent, Layers } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { GroupMember } from '../../types';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string(),
  category: z.string(),
  date: z.string(),
  paid_by_id: z.string().min(1, 'Please select who paid'),
  split_type: z.enum(['equal', 'exact', 'percent', 'shares']),
  notes: z.string().optional(),
  participants: z.array(z.object({
    user_id: z.string(),
    share_amount: z.coerce.number().optional(),
    share_percent: z.coerce.number().optional(),
    shares: z.coerce.number().optional(),
    included: z.boolean(),
  })),
});
type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  { value: 'food', label: '🍕 Food & Dining' }, { value: 'transport', label: '🚗 Transport' },
  { value: 'accommodation', label: '🏨 Accommodation' }, { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'shopping', label: '🛍️ Shopping' }, { value: 'utilities', label: '⚡ Utilities' },
  { value: 'healthcare', label: '🏥 Healthcare' }, { value: 'travel', label: '✈️ Travel' },
  { value: 'education', label: '📚 Education' }, { value: 'other', label: '📌 Other' },
];
const CURRENCIES = [
  { value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '€ EUR' }, { value: 'GBP', label: '£ GBP' },
];
const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal Split', icon: <Equal className="w-4 h-4" /> },
  { value: 'exact', label: 'Exact Amounts', icon: <DollarSign className="w-4 h-4" /> },
  { value: 'percent', label: 'Percentages', icon: <Percent className="w-4 h-4" /> },
  { value: 'shares', label: 'By Shares', icon: <Layers className="w-4 h-4" /> },
];

export default function CreateExpensePage() {
  const [params] = useSearchParams();
  const groupId = params.get('group');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const qc = useQueryClient();

  const { data: members = [] } = useQuery<GroupMember[]>({
    queryKey: ['members', groupId],
    queryFn: () => api.get(`/groups/${groupId}/members/`).then(r => r.data),
    enabled: !!groupId,
  });

  const today = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, watch, control, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'INR', category: 'other', date: today,
      split_type: 'equal', paid_by_id: user?.id ?? '',
      participants: [],
    },
  });

  const { fields } = useFieldArray({ control, name: 'participants' });

  React.useEffect(() => {
    if (members.length > 0) {
      setValue('participants', members.filter(m => m.is_active).map(m => ({
        user_id: m.user.id, share_amount: 0, share_percent: 0, shares: 1, included: true,
      })));
    }
  }, [members, setValue]);

  const splitType = watch('split_type');
  const amount = watch('amount') ?? 0;
  const participants = watch('participants') ?? [];
  const includedCount = participants.filter(p => p.included).length;
  const equalShare = includedCount > 0 ? amount / includedCount : 0;

  const onSubmit = async (data: FormData) => {
    try {
      const participantData = data.split_type === 'equal'
        ? data.participants.filter(p => p.included).map(p => ({ user_id: p.user_id, share_amount: equalShare, share_percent: 100 / includedCount, shares: 1 }))
        : data.participants.filter(p => p.included).map(p => ({
          user_id: p.user_id,
          share_amount: data.split_type === 'exact' ? p.share_amount : 0,
          share_percent: data.split_type === 'percent' ? p.share_percent : 0,
          shares: data.split_type === 'shares' ? p.shares : 1,
        }));

      await api.post('/expenses/', {
        ...data, group: groupId, participants: participantData,
      });
      qc.invalidateQueries({ queryKey: ['expenses', groupId] });
      success('Expense added!', data.title);
      navigate(groupId ? `/groups/${groupId}` : '/dashboard');
    } catch (e: any) {
      error('Failed', Object.values(e.response?.data ?? {}).flat().join(' ') || 'Could not create expense');
    }
  };

  const memberMap = Object.fromEntries(members.map(m => [m.user.id, m.user]));

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
        <h1 className="text-xl font-bold text-white">Add Expense</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="glass rounded-2xl p-5 space-y-4">
          <Input label="Title" placeholder="e.g. Dinner at Bistro" error={errors.title?.message} {...register('title')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} required />
            <Select label="Currency" options={CURRENCIES} {...register('currency')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" options={CATEGORIES} {...register('category')} />
            <Input label="Date" type="date" {...register('date')} />
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Paid by</label>
            <select {...register('paid_by_id')} className="w-full bg-background-tertiary border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              {members.filter(m => m.is_active).map(m => (
                <option key={m.user.id} value={m.user.id}>{m.user.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Split Type */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium text-gray-300 mb-3">Split Type</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {SPLIT_TYPES.map(st => (
              <button key={st.value} type="button" onClick={() => setValue('split_type', st.value as any)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all
                  ${splitType === st.value ? 'bg-primary-500/20 border-primary-500/50 text-white' : 'border-white/8 text-gray-500 hover:border-white/15 hover:text-gray-300'}`}>
                {st.icon}{st.label}
              </button>
            ))}
          </div>

          {/* Participants */}
          <p className="text-sm font-medium text-gray-300 mb-2">Participants</p>
          <div className="space-y-2">
            {fields.map((field, i) => {
              const u = memberMap[field.user_id];
              return (
                <div key={field.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/4">
                  <Controller control={control} name={`participants.${i}.included`}
                    render={({ field: f }) => (
                      <input type="checkbox" checked={f.value} onChange={e => f.onChange(e.target.checked)}
                        className="w-4 h-4 accent-primary-500 rounded" />
                    )} />
                  <Avatar src={u?.avatar} name={u?.full_name} size="xs" />
                  <span className="text-sm text-gray-300 flex-1">{u?.full_name ?? 'Unknown'}</span>
                  {splitType === 'equal' && watch(`participants.${i}.included`) && (
                    <span className="text-sm text-primary-400 font-medium">{formatCurrency(equalShare)}</span>
                  )}
                  {splitType === 'exact' && (
                    <input type="number" step="0.01" placeholder="0.00" {...register(`participants.${i}.share_amount`)}
                      className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right" />
                  )}
                  {splitType === 'percent' && (
                    <div className="flex items-center gap-1">
                      <input type="number" step="0.1" placeholder="0" {...register(`participants.${i}.share_percent`)}
                        className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right" />
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  )}
                  {splitType === 'shares' && (
                    <input type="number" step="1" min="1" placeholder="1" {...register(`participants.${i}.shares`)}
                      className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white text-right" />
                  )}
                </div>
              );
            })}
          </div>
          {splitType === 'equal' && (
            <p className="text-xs text-gray-500 mt-2">Each of the {includedCount} selected members pays {formatCurrency(equalShare)}</p>
          )}
        </div>

        <Input label="Notes" placeholder="Any extra details…" {...register('notes')} />

        <div className="flex gap-3">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" className="flex-1" size="lg" isLoading={isSubmitting} leftIcon={<Plus className="w-4 h-4" />}>
            Add Expense
          </Button>
        </div>
      </form>
    </div>
  );
}
