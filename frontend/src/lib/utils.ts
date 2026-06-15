import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  const symbols: Record<string, string> = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥',
    AED: 'د.إ', SGD: 'S$', AUD: 'A$', CAD: 'C$',
  };
  const symbol = symbols[currency] ?? currency + ' ';
  const formatted = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}

export function formatDate(date: string): string {
  try { return format(new Date(date), 'dd MMM yyyy'); }
  catch { return date; }
}

export function timeAgo(date: string): string {
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); }
  catch { return date; }
}

export function getInitials(name: string): string {
  return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

export const CATEGORY_ICONS: Record<string, string> = {
  food: '🍕', transport: '🚗', accommodation: '🏨', entertainment: '🎬',
  shopping: '🛍️', utilities: '⚡', healthcare: '🏥', travel: '✈️',
  education: '📚', other: '📌',
};

export const CATEGORY_COLORS: Record<string, string> = {
  food: '#F59E0B', transport: '#3B82F6', accommodation: '#8B5CF6',
  entertainment: '#EC4899', shopping: '#10B981', utilities: '#F97316',
  healthcare: '#EF4444', travel: '#06B6D4', education: '#84CC16', other: '#6B7280',
};

export const SPLIT_LABELS: Record<string, string> = {
  equal: 'Equal Split', exact: 'Exact Amounts',
  percent: 'By Percentage', shares: 'By Shares', settlement: 'Settlement',
};

export const ANOMALY_LABELS: Record<string, string> = {
  duplicate: 'Duplicate', near_duplicate: 'Near Duplicate',
  missing_field: 'Missing Field', negative_amount: 'Negative Amount',
  refund: 'Refund', settlement_as_expense: 'Settlement as Expense',
  unknown_member: 'Unknown Member', future_date: 'Future Date',
  invalid_currency: 'Invalid Currency', invalid_split: 'Invalid Split',
  outside_membership: 'Outside Membership', same_event: 'Same Event',
  malformed_row: 'Malformed Row', incorrect_total: 'Incorrect Total',
  missing_participants: 'Missing Participants',
};

export const ANOMALY_SEVERITY: Record<string, 'error' | 'warning' | 'info'> = {
  duplicate: 'error', near_duplicate: 'warning', missing_field: 'error',
  negative_amount: 'warning', refund: 'info', settlement_as_expense: 'info',
  unknown_member: 'error', future_date: 'warning', invalid_currency: 'error',
  invalid_split: 'error', outside_membership: 'warning', same_event: 'error',
  malformed_row: 'error', incorrect_total: 'error', missing_participants: 'warning',
};

export function currencySymbol(code: string): string {
  const map: Record<string, string> = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', JPY: '¥',
  };
  return map[code] ?? code;
}
