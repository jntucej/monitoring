"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { parseVoiceCommand, VoiceCommand } from "@/lib/voice";
import { Mic, MicOff, Check, Sparkles } from "lucide-react";

interface VoiceAssistantModalProps {
  onExecuteCommand: (cmd: VoiceCommand) => void;
}

export function VoiceAssistantModal({ onExecuteCommand }: VoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedCommand, setParsedCommand] = useState<VoiceCommand | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [manualText, setManualText] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recog = new SpeechRecognition();
        recog.continuous = false;
        recog.interimResults = true;
        recog.lang = "en-US";

        recog.onresult = (event: any) => {
          const current = event.resultIndex;
          const text = event.results[current][0].transcript;
          setTranscript(text);
          const cmd = parseVoiceCommand(text);
          setParsedCommand(cmd);
          if (cmd.confidence > 0.88 && cmd.roll_number) {
            onExecuteCommand(cmd);
          }
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      }
    }
  }, [onExecuteCommand]);

  const toggleListening = () => {
    if (!recognition) {
      // Demo voice command simulation for non-supporting browsers
      const sample = "entry for 24JJ1A0501";
      setTranscript(sample);
      const cmd = parseVoiceCommand(sample);
      setParsedCommand(cmd);
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setParsedCommand(null);
      try {
        recognition.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    const cmd = parseVoiceCommand(manualText);
    setTranscript(manualText);
    setParsedCommand(cmd);
    onExecuteCommand(cmd);
    setManualText("");
  };

  const handleConfirm = () => {
    if (parsedCommand) {
      onExecuteCommand(parsedCommand);
      setTranscript("");
      setParsedCommand(null);
    }
  };

  return (
    <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-950/10 backdrop-blur-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <Button
          variant={isListening ? "danger" : "secondary"}
          size="sm"
          onClick={toggleListening}
          className="gap-2 text-xs font-bold"
        >
          {isListening ? <MicOff className="h-4 w-4 animate-pulse text-rose-400" /> : <Mic className="h-4 w-4 text-purple-400" />}
          {isListening ? "Listening..." : "Voice Assistant"}
        </Button>

        <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 flex-1 sm:flex-initial">
          <input
            type="text"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder="or type command e.g. 'entry 24JJ1A0501'"
            className="px-2.5 py-1 text-xs rounded-lg bg-[var(--bg-base)] border border-[var(--border)] font-mono text-[var(--text-primary)] outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button type="submit" className="p-1 rounded-md bg-purple-500/20 text-purple-300 text-xs hover:bg-purple-500/30">
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </form>

        {transcript && (
          <div className="text-xs space-y-1">
            <span className="font-mono text-purple-300">"{transcript}"</span>
            {parsedCommand && (
              <Badge variant="success" className="ml-2 text-[10px]">
                {parsedCommand.action} {parsedCommand.roll_number ? `[${parsedCommand.roll_number}]` : ""}
              </Badge>
            )}
          </div>
        )}
      </div>

      {parsedCommand && parsedCommand.action !== "UNKNOWN" && (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleConfirm} className="gap-1 text-xs">
            <Check className="h-3.5 w-3.5" /> Execute Voice Action
          </Button>
        </div>
      )}
    </div>
  );
}
