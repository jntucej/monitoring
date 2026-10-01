import { getDbClient } from "@/lib/db";
import { 
  Notification, 
  NotificationType, 
  NotificationChannel,
  NotificationPreferences,
  NotificationTemplate
} from './notification-types';

// Templates
const TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  visitor_arrival: {
    id: 'visitor_arrival',
    type: 'visitor_arrival',
    titleTemplate: '🚪 Visitor Arrived: {{visitorName}}',
    messageTemplate: '{{visitorName}} has arrived to visit {{hostName}} at {{time}}. Purpose: {{purpose}}',
    defaultChannels: ['push', 'sms'],
    priority: 'medium',
  },
  visitor_checkout: {
    id: 'visitor_checkout',
    type: 'visitor_checkout',
    titleTemplate: '👋 Visitor Departed: {{visitorName}}',
    messageTemplate: '{{visitorName}} has checked out at {{time}}. Total stay: {{duration}} hours.',
    defaultChannels: ['push'],
    priority: 'low',
  },
  visitor_overdue: {
    id: 'visitor_overdue',
    type: 'visitor_overdue',
    titleTemplate: '⚠️ Overdue Visitor: {{visitorName}}',
    messageTemplate: '{{visitorName}} has been on campus for {{duration}} hours. Expected check-out time exceeded.',
    defaultChannels: ['push', 'sms'],
    priority: 'high',
  },
  worker_shift_start: {
    id: 'worker_shift_start',
    type: 'worker_shift_start',
    titleTemplate: '⏰ Shift Starting: {{workerName}}',
    messageTemplate: 'Your shift starts at {{shiftTime}}. Please check in at the gate.',
    defaultChannels: ['push', 'sms'],
    priority: 'medium',
  },
  worker_shift_end: {
    id: 'worker_shift_end',
    type: 'worker_shift_end',
    titleTemplate: '⏰ Shift Ending: {{workerName}}',
    messageTemplate: 'Your shift ends at {{shiftTime}}. Please check out at the gate.',
    defaultChannels: ['push'],
    priority: 'low',
  },
  worker_schedule_change: {
    id: 'worker_schedule_change',
    type: 'worker_schedule_change',
    titleTemplate: '📅 Schedule Change: {{workerName}}',
    messageTemplate: 'Your shift has been changed to {{newShiftTime}}.',
    defaultChannels: ['push', 'sms'],
    priority: 'high',
  },
  faculty_absent: {
    id: 'faculty_absent',
    type: 'faculty_absent',
    titleTemplate: '📋 Faculty Absent: {{facultyName}}',
    messageTemplate: '{{facultyName}} has not checked in today. Expected: {{expectedTime}}.',
    defaultChannels: ['push', 'email'],
    priority: 'medium',
  },
  faculty_late: {
    id: 'faculty_late',
    type: 'faculty_late',
    titleTemplate: '⏰ Faculty Late: {{facultyName}}',
    messageTemplate: '{{facultyName}} checked in late at {{actualTime}}. Expected: {{expectedTime}}.',
    defaultChannels: ['push'],
    priority: 'low',
  },
  gate_offline: {
    id: 'gate_offline',
    type: 'gate_offline',
    titleTemplate: '🚨 Gate Offline: {{gateName}}',
    messageTemplate: '{{gateName}} has been offline for {{duration}} minutes. Please investigate.',
    defaultChannels: ['push', 'sms', 'email'],
    priority: 'critical',
  },
  gate_online: {
    id: 'gate_online',
    type: 'gate_online',
    titleTemplate: '✅ Gate Online: {{gateName}}',
    messageTemplate: '{{gateName}} is back online.',
    defaultChannels: ['push'],
    priority: 'medium',
  },
  emergency_broadcast: {
    id: 'emergency_broadcast',
    type: 'emergency_broadcast',
    titleTemplate: '🚨 EMERGENCY: {{title}}',
    messageTemplate: '{{message}}',
    defaultChannels: ['push', 'sms', 'email'],
    priority: 'critical',
  },
  pass_approved: {
    id: 'pass_approved',
    type: 'pass_approved',
    titleTemplate: '✅ Pass Approved: {{studentName}}',
    messageTemplate: 'Your gate pass request for {{reason}} has been approved.',
    defaultChannels: ['push'],
    priority: 'medium',
  },
  pass_rejected: {
    id: 'pass_rejected',
    type: 'pass_rejected',
    titleTemplate: '❌ Pass Rejected: {{studentName}}',
    messageTemplate: 'Your gate pass request for {{reason}} has been rejected. Reason: {{comment}}',
    defaultChannels: ['push'],
    priority: 'medium',
  },
  entry_recorded: {
    id: 'entry_recorded',
    type: 'entry_recorded',
    titleTemplate: '🚪 Entry Recorded: {{personName}}',
    messageTemplate: '{{personName}} entered campus at {{time}} via {{gateName}}.',
    defaultChannels: ['in_app'],
    priority: 'low',
  },
  exit_recorded: {
    id: 'exit_recorded',
    type: 'exit_recorded',
    titleTemplate: '🚪 Exit Recorded: {{personName}}',
    messageTemplate: '{{personName}} exited campus at {{time}} via {{gateName}}.',
    defaultChannels: ['in_app'],
    priority: 'low',
  },
};

// Send a notification
export async function sendNotification(
  type: NotificationType,
  recipientId: string,
  recipientType: 'person' | 'role' | 'department' | 'all',
  data: Record<string, any>,
  channels?: NotificationChannel[]
): Promise<Notification | null> {
  try {
    const template = TEMPLATES[type];
    if (!template) {
      console.error(`No template found for notification type: ${type}`);
      return null;
    }

    // Check preferences
    const { data: prefs } = await getDbClient()
      .from('notification_preferences')
      .select('*')
      .eq('user_id', recipientId)
      .single();

    const userPrefs = prefs as NotificationPreferences | null;
    const enabledChannels = channels || template.defaultChannels;
    const finalChannels = enabledChannels.filter(channel => {
      if (!userPrefs) return true;
      return userPrefs.channels[channel] !== false;
    });

    // Render template
    let title = template.titleTemplate;
    let message = template.messageTemplate;

    for (const [key, value] of Object.entries(data)) {
      title = title.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newNotifObj: Notification = {
      id: notifId,
      type,
      priority: template.priority,
      title,
      message,
      recipientId,
      recipientType,
      channels: finalChannels,
      data,
      read: false,
      createdAt: new Date().toISOString(),
    };

    // Create notification record in DB
    const { data: notification, error } = await getDbClient()
      .from('notifications')
      .insert({
        id: notifId,
        type,
        priority: template.priority,
        title,
        message,
        recipient_id: recipientId,
        recipient_type: recipientType,
        channels: finalChannels,
        data: data,
        read: false,
        created_at: newNotifObj.createdAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification in DB, returning memory instance:', error);
      return newNotifObj;
    }

    const createdNotif: Notification = {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      recipientId: notification.recipient_id,
      recipientType: notification.recipient_type,
      channels: notification.channels || finalChannels,
      data: notification.data,
      read: notification.read,
      createdAt: notification.created_at,
    };

    // Send via channels
    await deliverNotification(createdNotif, finalChannels);

    return createdNotif;
  } catch (error) {
    console.error('Error sending notification:', error);
    return null;
  }
}

// Deliver via channels
async function deliverNotification(notification: Notification, channels: NotificationChannel[]) {
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'push':
          await sendPushNotification(notification);
          break;
        case 'sms':
          await sendSMSNotification(notification);
          break;
        case 'email':
          await sendEmailNotification(notification);
          break;
        case 'in_app':
          break;
      }
    } catch (error) {
      console.error(`Error delivering via ${channel}:`, error);
    }
  }

  await getDbClient()
    .from('notifications')
    .update({ delivered_at: new Date().toISOString() })
    .eq('id', notification.id);
}

async function sendPushNotification(notification: Notification) {
  console.log(`[PUSH] ${notification.title}: ${notification.message}`);
  await getDbClient()
    .from('notification_push_queue')
    .insert({
      notification_id: notification.id,
      user_id: notification.recipientId,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      created_at: new Date().toISOString(),
    });
}

async function sendSMSNotification(notification: Notification) {
  console.log(`[SMS] ${notification.title}: ${notification.message}`);
  const { data: person } = await getDbClient()
    .from('users')
    .select('phone')
    .eq('unique_id', notification.recipientId)
    .single();

  if (person?.phone) {
    await getDbClient()
      .from('notification_sms_queue')
      .insert({
        notification_id: notification.id,
        phone_number: person.phone,
        message: `${notification.title}\n${notification.message}`,
        created_at: new Date().toISOString(),
      });
  }
}

async function sendEmailNotification(notification: Notification) {
  console.log(`[EMAIL] ${notification.title}: ${notification.message}`);
  const { data: person } = await getDbClient()
    .from('users')
    .select('email')
    .eq('unique_id', notification.recipientId)
    .single();

  if (person?.email) {
    await getDbClient()
      .from('notification_email_queue')
      .insert({
        notification_id: notification.id,
        email: person.email,
        subject: notification.title,
        body: notification.message,
        created_at: new Date().toISOString(),
      });
  }
}

// Get user notifications
export async function getNotifications(
  userId: string,
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<Notification[]> {
  let query = getDbClient()
    .from('notifications')
    .select('*')
    .or(`recipient_id.eq.${userId},recipient_id.eq.all`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('read', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }

  return (data || []).map((n: any) => ({
    id: n.id,
    type: n.type,
    priority: n.priority,
    title: n.title,
    message: n.message,
    recipientId: n.recipient_id,
    recipientType: n.recipient_type,
    channels: n.channels || [],
    data: n.data,
    read: n.read,
    deliveredAt: n.delivered_at,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

// Mark notification as read
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const { error } = await getDbClient()
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
  return true;
}

// Mark all notifications as read
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const { error } = await getDbClient()
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .or(`recipient_id.eq.${userId},recipient_id.eq.all`)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
  return true;
}

// Get unread count
export async function getUnreadCount(userId: string): Promise<number> {
  const { count, error } = await getDbClient()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .or(`recipient_id.eq.${userId},recipient_id.eq.all`)
    .eq('read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
  return count || 0;
}

// Get notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  const { data, error } = await getDbClient()
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      userId,
      channels: { push: true, sms: true, email: true, in_app: true },
      types: {
        visitor_arrival: true,
        visitor_checkout: true,
        visitor_overdue: true,
        worker_shift_start: true,
        worker_shift_end: true,
        worker_schedule_change: true,
        faculty_absent: true,
        faculty_late: true,
        gate_offline: true,
        gate_online: true,
        emergency_broadcast: true,
        pass_approved: true,
        pass_rejected: true,
      },
    };
  }

  return {
    userId: data.user_id,
    channels: data.channels || { push: true, sms: true, email: true, in_app: true },
    types: data.types || {},
    quietHours: data.quiet_hours,
  };
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  const { error } = await getDbClient()
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      channels: preferences.channels,
      types: preferences.types,
      quiet_hours: preferences.quietHours,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error updating notification preferences:', error);
    return false;
  }
  return true;
}

// Send visitor arrival notification
export async function notifyVisitorArrival(
  visitorName: string,
  hostName: string,
  hostId: string,
  purpose: string,
  visitorId: string
): Promise<Notification | null> {
  return sendNotification(
    'visitor_arrival',
    hostId,
    'person',
    {
      visitorName,
      hostName,
      time: new Date().toLocaleString(),
      purpose,
      visitorId,
    }
  );
}

// Send overdue visitor notification
export async function notifyOverdueVisitor(
  visitorName: string,
  visitorId: string,
  hostName: string,
  hostId: string,
  duration: number
): Promise<Notification | null> {
  return sendNotification(
    'visitor_overdue',
    hostId,
    'person',
    {
      visitorName,
      visitorId,
      hostName,
      duration: duration.toFixed(1),
      time: new Date().toLocaleString(),
    }
  );
}

// Send worker shift notification
export async function notifyWorkerShift(
  workerName: string,
  workerId: string,
  shiftTime: string,
  type: 'start' | 'end'
): Promise<Notification | null> {
  return sendNotification(
    type === 'start' ? 'worker_shift_start' : 'worker_shift_end',
    workerId,
    'person',
    {
      workerName,
      workerId,
      shiftTime,
    }
  );
}

// Send emergency broadcast
export async function sendEmergencyBroadcast(
  title: string,
  message: string,
  recipientType: 'all' | 'role' | 'department' = 'all',
  targetId?: string
): Promise<Notification | null> {
  return sendNotification(
    'emergency_broadcast',
    targetId || 'all',
    recipientType,
    {
      title,
      message,
      time: new Date().toLocaleString(),
    },
    ['push', 'sms', 'email']
  );
}

// Send faculty absence alert
export async function notifyFacultyAbsence(
  facultyName: string,
  facultyId: string,
  hodId: string,
  expectedTime: string
): Promise<Notification | null> {
  return sendNotification(
    'faculty_absent',
    hodId,
    'person',
    {
      facultyName,
      facultyId,
      expectedTime,
      date: new Date().toLocaleDateString(),
    }
  );
}
