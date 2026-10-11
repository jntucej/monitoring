// worker/jobs/dispatch_notifications.js
import { getSupabaseServiceClient } from '../../src/lib/dbClient.js';
import { sendEmail } from '../../src/lib/integrations/email.js';
import { sendSMS } from '../../src/lib/integrations/sms.js';

export default async function dispatchNotifications() {
  const supabase = getSupabaseServiceClient();
  
  // Process queues
  const queues = ['email', 'sms', 'push'];
  
  for (const queue of queues) {
    const tableName = `notification_${queue}_queue`;
    const { data: backlog, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('status', 'pending')
      .limit(50);
      
    if (error || !backlog) continue;

    for (const item of backlog) {
      try {
        await supabase.from(tableName).update({ status: 'processing' }).eq('id', item.id);
        
        if (queue === 'email') await sendEmail({ to: item.recipient, subject: item.subject, body: item.body });
        else if (queue === 'sms') await sendSMS({ to: item.recipient, body: item.body });
        
        await supabase.from(tableName).update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', item.id);
      } catch (err) {
        console.error(`[Notification] Failed to send ${queue} ${item.id}:`, err);
        const attempts = (item.attempts || 0) + 1;
        await supabase.from(tableName).update({ 
          status: attempts >= 5 ? 'dead' : 'pending',
          attempts
        }).eq('id', item.id);
      }
    }
  }
}
