import type { BotLang } from "@/lib/rag/config";

export interface BotStrings {
  title: string; subtitle: string; placeholder: string;
  send: string; stop: string; newChat: string; close: string; open: string;
  listening: string; thinking: string; speaking: string;
  tryAsking: string; micUnsupported: string; ttsUnsupported: string;
  voiceReplies: string; voiceOn: string; voiceOff: string;
  suggestions: string[]; quickChips: { label: string; prompt: string }[];
  feedbackThanks: string; errorGeneric: string; errorNetwork: string; retry: string;
  citations: string; offline: string; keyboardHint: string;
}

export const BOT_STRINGS: Record<BotLang, BotStrings> = {
  en: {
    title: "Harbor",
    subtitle: "Gate Monitor assistant · ask me anything",
    placeholder: "Ask Harbor…",
    send: "Send", stop: "Stop", newChat: "New chat", close: "Close Harbor", open: "Open Harbor assistant",
    listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…",
    tryAsking: "Try asking:",
    micUnsupported: "Voice input isn't supported on this browser. Type your question instead.",
    ttsUnsupported: "Voice output isn't available on this device.",
    voiceReplies: "Speak replies", voiceOn: "Voice replies on", voiceOff: "Voice replies off",
    suggestions: [
      "How do I request an out-of-campus pass?",
      "What are the hostel curfew rules?",
      "How does a warden approve a home_out pass?",
      "What does the OVERDUE flag mean?",
    ],
    quickChips: [
      { label: "📋 Pass rules", prompt: "Explain the pass types and approval flow." },
      { label: "🌙 Curfew",     prompt: "What are the hostel curfew times?" },
      { label: "🔍 Gate scan",  prompt: "How does a gate scan work?" },
      { label: "🚨 Emergency",  prompt: "What happens during a lockdown?" },
    ],
    feedbackThanks: "Thanks — noted!",
    errorGeneric: "Something went wrong. Try again.",
    errorNetwork: "Network hiccup — check your connection and retry.",
    retry: "Retry",
    citations: "Sources",
    offline: "You're offline",
    keyboardHint: "Enter to send · Shift+Enter for new line",
  },
  te: {
    title: "Harbor",
    subtitle: "గేట్ మానిటర్ సహాయకుడు · ఏదైనా అడగండి",
    placeholder: "Harbor ని అడగండి…",
    send: "పంపు", stop: "ఆపు", newChat: "కొత్త చాట్", close: "Harbor మూసివేయి", open: "Harbor తెరవండి",
    listening: "వినుతున్నాను…", thinking: "ఆలోచిస్తున్నాను…", speaking: "మాట్లాడుతున్నాను…",
    tryAsking: "ఇలా అడగండి:",
    micUnsupported: "ఈ బ్రౌజర్‌లో వాయిస్ ఇన్‌పుట్ లేదు. టైప్ చేయండి.",
    ttsUnsupported: "ఈ పరికరంలో వాయిస్ అవుట్‌పుట్ అందుబాటులో లేదు.",
    voiceReplies: "వాయిస్‌లో సమాధానం", voiceOn: "వాయిస్ ఆన్", voiceOff: "వాయిస్ ఆఫ్",
    suggestions: [
      "క్యాంపస్ బయటికి వెళ్లడానికి పాస్ ఎలా అడగాలి?",
      "హాస్టల్ కర్ఫ్యూ నియమాలు ఏమిటి?",
      "వార్డెన్ home_out పాస్‌ని ఎలా ఆమోదిస్తారు?",
      "OVERDUE ఫ్లాగ్ అంటే ఏమిటి?",
    ],
    quickChips: [
      { label: "📋 పాస్ నియమాలు", prompt: "పాస్ రకాలు మరియు ఆమోదం ప్రక్రియను వివరించండి." },
      { label: "🌙 కర్ఫ్యూ",       prompt: "హాస్టల్ కర్ఫ్యూ సమయాలు ఏమిటి?" },
      { label: "🔍 గేట్ స్కాన్",   prompt: "గేట్ స్కాన్ ఎలా పనిచేస్తుంది?" },
      { label: "🚨 అత్యవసరం",     prompt: "లాక్‌డౌన్ సమయంలో ఏమి జరుగుతుంది?" },
    ],
    feedbackThanks: "ధన్యవాదాలు!",
    errorGeneric: "ఏదో తప్పు జరిగింది. మళ్ళీ ప్రయత్నించండి.",
    errorNetwork: "నెట్‌వర్క్ సమస్య — కనెక్షన్ తనిఖీ చేసి మళ్ళీ ప్రయత్నించండి.",
    retry: "మళ్ళీ ప్రయత్నించండి",
    citations: "మూలాలు",
    offline: "మీరు ఆఫ్‌లైన్‌లో ఉన్నారు",
    keyboardHint: "పంపడానికి Enter · కొత్త లైన్‌కు Shift+Enter",
  },
};
