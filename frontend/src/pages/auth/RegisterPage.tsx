import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Zap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const schema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^\w+$/, 'Only letters, numbers and underscores'),
  password: z.string().min(8, 'At least 8 characters'),
  password_confirm: z.string(),
}).refine(d => d.password === d.password_confirm, {
  message: 'Passwords do not match', path: ['password_confirm'],
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const password = watch('password', '');
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : /[A-Z]/.test(password) && /\d/.test(password) ? 4 : 3;
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const onSubmit = async (data: FormData) => {
    try {
      await registerUser(data);
      success('Account created!', 'Welcome to SplitWise Pro AI');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = Object.values(err.response?.data ?? {}).flat().join(' ') || 'Registration failed';
      error('Registration failed', String(msg));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text">SplitWise Pro AI</span>
        </div>

        <div className="glass-strong rounded-2xl p-8 border border-white/10">
          <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
          <p className="text-sm text-gray-500 mb-7">Get started — it's free forever</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" placeholder="Aisha" error={errors.first_name?.message} leftIcon={<User className="w-4 h-4" />} {...register('first_name')} />
              <Input label="Last name" placeholder="Sharma" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <Input label="Email" type="email" placeholder="you@example.com" leftIcon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
            <Input label="Username" placeholder="aisha_sharma" leftIcon={<User className="w-4 h-4" />} error={errors.username?.message} {...register('username')} />
            <Input label="Password" type="password" placeholder="Min 8 characters" leftIcon={<Lock className="w-4 h-4" />} error={errors.password?.message} {...register('password')} />

            {password.length > 0 && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : 'bg-white/10'}`} />
                  ))}
                </div>
                <p className="text-[10px] text-gray-500">Password strength: <span className="font-medium text-white">{strengthLabels[strength]}</span></p>
              </div>
            )}

            <Input label="Confirm password" type="password" placeholder="••••••••" leftIcon={<Lock className="w-4 h-4" />} error={errors.password_confirm?.message} {...register('password_confirm')} />

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={isSubmitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
