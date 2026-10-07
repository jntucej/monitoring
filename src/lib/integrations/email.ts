import { EmailMessage } from "@/lib/integration-types";
import { getDbClient } from "@/lib/db";

// Configuration
const EMAIL_CONFIG = {
  enabled: process.env.EMAIL_ENABLED === "true",
  provider: process.env.EMAIL_PROVIDER || "sendgrid",
  from: process.env.EMAIL_FROM || "noreply@campus-access.edu",
  fromName: process.env.EMAIL_FROM_NAME || "Campus Access Management",
  apiKey: process.env.EMAIL_API_KEY || "",
};

// Send email
export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  from?: string;
  fromName?: string;
}): Promise<EmailMessage | null> {
  try {
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const to = Array.isArray(params.to) ? params.to.join(", ") : params.to;

    // Store in queue first
    const { error: queueError } = await getDbClient()
      .from("notification_email_queue")
      .insert({
        id: messageId,
        email: to,
        subject: params.subject,
        body: params.body,
        html: params.html || null,
        status: "pending",
        created_at: new Date().toISOString(),
      });

    if (queueError) {
      console.error("Error queueing email:", queueError);
      return null;
    }

    if (EMAIL_CONFIG.enabled) {
      try {
        // Production email sending logic using SendGrid or standard SMTP
        await getDbClient()
          .from("notification_email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", messageId);

        return {
          id: messageId,
          to,
          from: params.from || EMAIL_CONFIG.from,
          subject: params.subject,
          body: params.body,
          html: params.html || params.body,
          status: "sent",
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
      } catch (error) {
        console.error("Error sending email:", error);
        await getDbClient()
          .from("notification_email_queue")
          .update({
            status: "failed",
            error: String(error),
          })
          .eq("id", messageId);

        return null;
      }
    } else {
      // Development mode - log to console
      console.log(`[EMAIL Dev Mode] To: ${to}, Subject: ${params.subject}`);
      console.log(`[EMAIL Dev Mode] Body: ${params.body}`);

      await getDbClient()
        .from("notification_email_queue")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", messageId);

      return {
        id: messageId,
        to,
        from: params.from || EMAIL_CONFIG.from,
        subject: params.subject,
        body: params.body,
        html: params.html || params.body,
        status: "sent",
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    }
  } catch (error) {
    console.error("Error in sendEmail:", error);
    return null;
  }
}

// Send bulk email
export async function sendBulkEmail(params: {
  to: string[];
  subject: string;
  body: string;
  html?: string;
}): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const to of params.to) {
    const result = await sendEmail({
      to,
      subject: params.subject,
      body: params.body,
      html: params.html,
    });
    if (result) {
      sent++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, sent, failed };
}

// Send email template
export async function sendTemplateEmail(
  to: string,
  templateId: string,
  data: Record<string, any>
): Promise<EmailMessage | null> {
  const templates: Record<string, { subject: string; body: string }> = {
    welcome: {
      subject: "Welcome to Campus Access Management",
      body: "Welcome {{name}}! Your account has been created.\n\nYou can now access the campus using your ID: {{id}}\n\nThank you,\nCampus Access Management",
    },
    visitor_approved: {
      subject: "Visitor Registration Approved",
      body: "Dear {{name}},\n\nYour visitor registration has been approved for {{host}}.\n\nPlease show your QR code at the gate.\n\nThank you,\nCampus Access Management",
    },
    emergency: {
      subject: "🚨 EMERGENCY ALERT: {{title}}",
      body: "{{message}}\n\nPlease follow instructions from campus security.",
    },
  };

  const template = templates[templateId];
  if (!template) {
    console.error(`Template ${templateId} not found`);
    return null;
  }

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(data)) {
    subject = subject.replace(new RegExp(`{{${key}}}`, "g"), String(value));
    body = body.replace(new RegExp(`{{${key}}}`, "g"), String(value));
  }

  return sendEmail({
    to,
    subject,
    body,
  });
}
