import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, LayoutDashboard, Users, CreditCard, ArrowLeftRight, Upload, User, Bell, FileText, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const toggle = useCallback(() => setIsOpen(v => !v), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggle]);

  const commands: CommandItem[] = [
    { id: 'dashboard', label: 'Go to Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, action: () => { navigate('/dashboard'); setIsOpen(false); }, shortcut: 'D' },
    { id: 'groups', label: 'Go to Groups', icon: <Users className="w-4 h-4" />, action: () => { navigate('/groups'); setIsOpen(false); }, shortcut: 'G' },
    { id: 'expenses', label: 'New Expense', icon: <CreditCard className="w-4 h-4" />, action: () => { navigate('/expenses/new'); setIsOpen(false); }, shortcut: 'E' },
    { id: 'settlements', label: 'Go to Settlements', icon: <ArrowLeftRight className="w-4 h-4" />, action: () => { navigate('/settlements'); setIsOpen(false); } },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, action: () => { navigate('/notifications'); setIsOpen(false); } },
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" />, action: () => { navigate('/profile'); setIsOpen(false); } },
    { id: 'audit', label: 'Audit Logs', icon: <FileText className="w-4 h-4" />, action: () => { navigate('/audit'); setIsOpen(false); } },
  ];

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  return (
    <>
      {/* Trigger hint shown in top bar */}
      <button
        onClick={toggle}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-xs text-gray-500 hover:text-gray-300 hover:border-white/15 transition-all border border-white/8"
        id="command-palette-trigger"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search...</span>
        <kbd className="flex items-center gap-0.5 bg-white/8 px-1 py-0.5 rounded text-[10px] font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative z-10 w-full max-w-lg glass-strong rounded-2xl border border-white/12 shadow-[0_30px_80px_rgba(0,0,0,0.9)] overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/8">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
                />
                <kbd className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
              </div>

              <div className="max-h-72 overflow-y-auto py-1.5">
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-gray-600 py-8">No commands found</p>
                ) : (
                  filtered.map(cmd => (
                    <button
                      key={cmd.id}
                      onClick={cmd.action}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/6 hover:text-white transition-colors group"
                    >
                      <span className="text-gray-500 group-hover:text-primary-400 transition-colors">{cmd.icon}</span>
                      <span className="flex-1 text-left">{cmd.label}</span>
                      {cmd.shortcut && (
                        <kbd className="text-[10px] text-gray-600 bg-white/5 px-1.5 py-0.5 rounded font-mono">{cmd.shortcut}</kbd>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-white/8 flex items-center gap-4 text-[10px] text-gray-600">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>ESC Close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
