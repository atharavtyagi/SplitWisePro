export interface User {
  id: string; email: string; username: string;
  first_name: string; last_name: string; full_name: string;
  avatar?: string; bio?: string; phone?: string;
  preferred_currency: string; timezone: string;
  groups_count: number; total_expenses: number;
  total_paid: number; total_owed: number; date_joined: string;
}

export interface UserMini {
  id: string; email: string; username: string;
  first_name: string; last_name: string; full_name: string; avatar?: string;
}

export interface Group {
  id: string; name: string; description: string; currency: string;
  image?: string; created_by: UserMini; member_count: number;
  total_expenses: number; outstanding_balance: number;
  is_member: boolean; created_at: string; updated_at: string;
}

export interface GroupMember {
  id: string; user: UserMini; role: 'admin' | 'member';
  joined_at: string; left_at?: string; is_active: boolean;
}

export interface TimelineEvent {
  user: UserMini; event_type: 'joined' | 'left'; date: string; role: string;
}

export interface Expense {
  id: string; group: string; title: string; description: string;
  amount: number; currency: string; category: string; date: string;
  paid_by: UserMini; split_type: 'equal' | 'exact' | 'percent' | 'shares' | 'settlement';
  participants: ExpenseParticipant[]; notes: string;
  is_settlement: boolean; created_at: string; updated_at: string;
}

export interface ExpenseParticipant {
  id: string; user: UserMini; share_amount: number;
  share_percent: number; shares: number; is_settled: boolean;
}

export interface Settlement {
  id: string; group: string; payer: UserMini; receiver: UserMini;
  amount: number; currency: string; status: 'pending' | 'completed' | 'cancelled';
  notes: string; settled_at?: string; created_at: string;
}

export interface Balance {
  user: UserMini; net_balance: number; is_owed: boolean; owes: boolean;
}

export interface BalanceExplanationItem {
  expense_id: string; expense_title: string; expense_amount: number;
  paid_by_name: string; user_share: number; date: string;
  category: string; is_payer: boolean; currency: string;
}

export interface OptimizedSettlement {
  payer: UserMini; receiver: UserMini; amount: number; currency: string;
}

export interface ImportSession {
  id: string; status: string; original_filename: string;
  total_rows: number; valid_rows: number; imported_rows: number;
  skipped_rows: number; error_rows: number; error_message?: string;
  anomalies: ImportAnomaly[]; created_at: string; completed_at?: string;
}

export interface ImportAnomaly {
  id: string; row_number: number; row_number_b?: number;
  issue_type: string; description: string; suggested_action: string;
  row_data: Record<string, string>; row_data_b?: Record<string, string>;
  ai_explanation: string; user_decision?: string;
  status: 'pending' | 'resolved' | 'ignored';
}

export interface Notification {
  id: string; notification_type: string; title: string;
  message: string; is_read: boolean; created_at: string;
}

export interface ActivityLog {
  id: string; user: UserMini; group?: string;
  action_type: string; description: string; timestamp: string;
}

export interface AuditLog {
  id: string; user: UserMini; action: string; entity_type: string;
  entity_id: string; old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>; ip_address?: string; timestamp: string;
}

export interface DashboardStats {
  total_groups: number; total_expenses: number;
  amount_you_owe: number; amount_owed_to_you: number; pending_settlements: number;
}

export interface SpendingTrend { month: string; total: number; count: number; }
export interface CategoryData { category: string; total: number; count: number; }
export interface GroupSpending { group: string; group_id: string; total: number; }
