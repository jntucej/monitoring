export type NotificationType =
  | 'visitor_arrival'
  | 'visitor_checkout'
  | 'visitor_overdue'
  | 'worker_shift_start'
  | 'worker_shift_end'
  | 'worker_schedule_change'
  | 'faculty_absent'
  | 'faculty_late'
  | 'gate_offline'
  | 'gate_online'
  | 'emergency_broadcast'
  | 'pass_approved'
  | 'pass_rejected'
  | 'entry_recorded'
  | 'exit_recorded';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

export type NotificationChannel = 'push' | 'sms' | 'email' | 'in_app';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  recipientId: string;
  recipientType: 'person' | 'role' | 'department' | 'all';
  channels: NotificationChannel[];
  data?: Record<string, any>;
  read: boolean;
  deliveredAt?: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  channels: {
    push: boolean;
    sms: boolean;
    email: boolean;
    in_app: boolean;
  };
  types: {
    visitor_arrival: boolean;
    visitor_checkout: boolean;
    visitor_overdue: boolean;
    worker_shift_start: boolean;
    worker_shift_end: boolean;
    worker_schedule_change: boolean;
    faculty_absent: boolean;
    faculty_late: boolean;
    gate_offline: boolean;
    gate_online: boolean;
    emergency_broadcast: boolean;
    pass_approved: boolean;
    pass_rejected: boolean;
  };
  quietHours?: {
    start: string; // "22:00"
    end: string;   // "06:00"
  };
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  titleTemplate: string;
  messageTemplate: string;
  defaultChannels: NotificationChannel[];
  priority: NotificationPriority;
}
