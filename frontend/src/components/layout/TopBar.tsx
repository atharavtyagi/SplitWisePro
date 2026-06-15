import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CommandPalette } from '../CommandPalette';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/groups': 'Groups',
  '/expenses/new': 'New Expense',
  '/settlements': 'Settlements',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
  '/audit': 'Audit Logs',
};

export function TopBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'SplitWise Pro AI';

  const { data: unreadData } = useQuery({
    queryKey: ['unread-count'],
    queryFn: () => api.get('/notifications/unread-count/').then(r => r.data),
    refetchInterval: 30000,
  });

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/8 bg-background-tertiary/60 backdrop-blur-sm shrink-0">
      <h1 className="text-base font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <CommandPalette />
        <a href="/notifications" className="relative p-2 text-gray-500 hover:text-white hover:bg-white/6 rounded-lg transition-all">
          <Bell className="w-4 h-4" />
          {(unreadData?.unread_count ?? 0) > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full shadow-glow-sm" />
          )}
        </a>
        <Avatar src={user?.avatar} name={user?.full_name} size="sm" />
      </div>
    </header>
  );
}
