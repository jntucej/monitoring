"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { parseVoiceCommand, VoiceCommand } from "@/lib/voice";
import { Mic, MicOff, Check, AlertCircle } from "lucide-react";

interface VoiceAssistantModalProps {
  onExecuteCommand: (cmd: VoiceCommand) => void;
}

export function VoiceAssistantModal({ onExecuteCommand }: VoiceAssistantModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedCommand, setParsedCommand] = useState<VoiceCommand | null>(null);
  const [recognition, setRecognition] = useState<any>(null);

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
          setParsedCommand(parseVoiceCommand(text));
        };

        recog.onend = () => {
          setIsListening(false);
        };

        setRecognition(recog);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      setParsedCommand(null);
      recognition.start();
      setIsListening(true);
    }
  };

  const handleConfirm = () => {
    if (parsedCommand) {
      onExecuteCommand(parsedCommand);
      setTranscript("");
      setParsedCommand(null);
    }
  };

  return (
    <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-elevated)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button
          variant={isListening ? "danger" : "secondary"}
          size="sm"
          onClick={toggleListening}
          className="gap-2 text-xs"
        >
          {isListening ? <MicOff className="h-4 w-4 animate-pulse text-red-400" /> : <Mic className="h-4 w-4 text-purple-400" />}
          {isListening ? "Listening..." : "Voice Assistant"}
        </Button>

        {transcript && (
          <div className="text-xs space-y-1">
            <span className="font-mono text-[var(--text-secondary)]">"{transcript}"</span>
            {parsedCommand && (
              <Badge variant="success" className="ml-2 text-xs">
                {parsedCommand.action} {parsedCommand.roll_number ? `[${parsedCommand.roll_number}]` : ""}
              </Badge>
            )}
          </div>
        )}
      </div>

      {parsedCommand && parsedCommand.action !== "UNKNOWN" && (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={handleConfirm} className="gap-1 text-xs">
            <Check className="h-3.5 w-3.5" /> Execute
          </Button>
        </div>
      )}
    </div>
  );
}