import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, CreditCard, ArrowLeftRight,
  Upload, Bell, User, FileText, LogOut, ChevronLeft, ChevronRight,
  Zap, Settings,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar } from '../ui/Avatar';

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/expenses/new', icon: CreditCard, label: 'New Expense' },
  { to: '/settlements', icon: ArrowLeftRight, label: 'Settlements' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/audit', icon: FileText, label: 'Audit Logs' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 220 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col h-screen bg-background-tertiary border-r border-white/8 shrink-0 z-20"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-white/8 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow-sm">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-bold gradient-text whitespace-nowrap">SplitWise Pro</p>
              <p className="text-[9px] text-gray-600 -mt-0.5 whitespace-nowrap">AI</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group relative
               ${isActive
                ? 'bg-gradient-primary text-white shadow-glow-sm'
                : 'text-gray-500 hover:text-white hover:bg-white/6'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="whitespace-nowrap overflow-hidden"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-white/8 p-3">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white/6 transition-all"
        >
          <Avatar src={user?.avatar} name={user?.full_name} size="sm" />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex-1 text-left overflow-hidden"
              >
                <p className="text-xs font-semibold text-white truncate">{user?.full_name}</p>
                <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-xl text-gray-600 hover:text-red-400 hover:bg-red-500/8 transition-all mt-1"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-background-tertiary border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-primary-500/50 transition-all shadow-md"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
