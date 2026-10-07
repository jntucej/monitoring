export interface VoiceCommand {
  raw_text: string;
  action: "SCAN" | "MANUAL_ENTRY" | "SHOW_STATS" | "ENTRY" | "EXIT" | "UNKNOWN";
  roll_number?: string;
  confidence: number;
}

export function parseVoiceCommand(text: string): VoiceCommand {
  const normalized = text.toLowerCase().trim();
  
  // Extract potential roll numbers (e.g., 24JJ1A0501, 22ME01, 101)
  const rollMatch = normalized.match(/([a-z0-9]{5,10})/i);
  const roll = rollMatch ? rollMatch[1].toUpperCase() : undefined;

  if (normalized.includes("scan")) {
    return { raw_text: text, action: "SCAN", roll_number: roll, confidence: 0.92 };
  }
  if (normalized.includes("manual entry") || normalized.includes("manual")) {
    return { raw_text: text, action: "MANUAL_ENTRY", roll_number: roll, confidence: 0.89 };
  }
  if (normalized.includes("stats") || normalized.includes("show stats") || normalized.includes("dashboard")) {
    return { raw_text: text, action: "SHOW_STATS", confidence: 0.95 };
  }
  if (normalized.includes("entry for") || normalized.includes("entry")) {
    return { raw_text: text, action: "ENTRY", roll_number: roll, confidence: 0.90 };
  }
  if (normalized.includes("exit for") || normalized.includes("exit")) {
    return { raw_text: text, action: "EXIT", roll_number: roll, confidence: 0.90 };
  }

  return { raw_text: text, action: "UNKNOWN", confidence: 0.50 };
}
