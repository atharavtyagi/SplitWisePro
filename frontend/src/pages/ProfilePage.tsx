import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Camera, Lock, Globe, Clock } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import api from '../lib/api';

const schema = z.object({
  first_name: z.string().min(1), last_name: z.string().min(1),
  bio: z.string().optional(), phone: z.string().optional(),
  preferred_currency: z.string(), timezone: z.string(),
});
type FormData = z.infer<typeof schema>;

const CURRENCIES = [
  { value: 'INR', label: '₹ Indian Rupee' }, { value: 'USD', label: '$ US Dollar' },
  { value: 'EUR', label: '€ Euro' }, { value: 'GBP', label: '£ British Pound' },
];
const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'IST — Asia/Kolkata' },
  { value: 'UTC', label: 'UTC' }, { value: 'US/Eastern', label: 'EST — US/Eastern' },
  { value: 'Europe/London', label: 'GMT — Europe/London' },
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { success, error } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: user?.first_name ?? '', last_name: user?.last_name ?? '',
      bio: user?.bio ?? '', phone: user?.phone ?? '',
      preferred_currency: user?.preferred_currency ?? 'INR',
      timezone: user?.timezone ?? 'Asia/Kolkata',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { data: updated } = await api.patch('/auth/profile/', data);
      updateUser(updated);
      success('Profile updated!');
    } catch { error('Failed', 'Could not update profile'); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <h1 className="text-xl font-bold text-white">Profile Settings</h1>

      {/* Avatar section */}
      <div className="glass rounded-2xl p-6 flex items-center gap-5">
        <div className="relative">
          <Avatar src={user?.avatar} name={user?.full_name} size="xl" />
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary-600 flex items-center justify-center border-2 border-background shadow-glow-sm">
            <Camera className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-lg font-bold text-white">{user?.full_name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-gray-600 mt-1">Member since {user?.date_joined?.split('T')[0]}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Groups', value: user?.groups_count ?? 0 },
          { label: 'Expenses', value: user?.total_expenses ?? 0 },
          { label: 'Total Paid', value: `₹${((user?.total_paid ?? 0) / 1000).toFixed(1)}k` },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Edit form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Personal Information</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First name" leftIcon={<User className="w-4 h-4" />} error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
          </div>
          <Input label="Phone" type="tel" placeholder="+91 98765 43210" leftIcon={<Phone className="w-4 h-4" />} {...register('phone')} />
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Bio</label>
            <textarea {...register('bio')} placeholder="Tell your group members about yourself…" rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 hover:border-white/20 focus:border-primary-500/60 transition-all resize-none" />
          </div>
        </div>

        <div className="glass rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-white">Preferences</h2>
          <Select label="Default Currency" options={CURRENCIES} {...register('preferred_currency')} />
          <Select label="Timezone" options={TIMEZONES} {...register('timezone')} />
        </div>

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>Save Changes</Button>
      </form>
    </div>
  );
}
