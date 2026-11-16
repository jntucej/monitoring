// src/lib/telegram.ts
/**
 * Telegram Bot API client helpers.
 */

export interface TelegramSendMessageOptions {
  replyMarkup?: Record<string, unknown>;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
}

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options?: TelegramSendMessageOptions
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not configured");
    return false;
  }

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };

    if (options?.parseMode) {
      body.parse_mode = options.parseMode;
    }

    if (options?.replyMarkup) {
      body.reply_markup = options.replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    return res.ok;
  } catch (err) {
    console.error("[Telegram] Error sending message:", err);
    return false;
  }
}
