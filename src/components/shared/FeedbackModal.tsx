"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send } from "lucide-react";
import { scaleIn } from "@/lib/animations";

interface FeedbackModalProps {
  theme: string;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
}

export function FeedbackModal({ theme, onClose, onSubmit }: FeedbackModalProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    await onSubmit(comment.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="feedback-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      >
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="surface-card w-full max-w-md max-h-[90dvh] overflow-y-auto bg-bg-surface p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">Theme Feedback</h3>
            <button onClick={onClose} aria-label="Close modal" className="surface-card p-2 min-w11 min-h11 flex items-center justify-center hover:bg-bg-elevated">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            You switched to <strong>{theme}</strong> theme. Please share any issues you notice.
          </p>
          <form onSubmit={handleSubmit}>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe any visual or functional problems..."
              className="surface-card w-full p-3 bg-bg-base text-sm text-text-primary placeholder-[var(--text-muted)] focus:ring-2 focus:ringfocus-ring outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={onClose}
                className="surface-card px-4 py-2 bg-bg-elevated text-text-muted hover:text-text-primary text-sm font-medium"
              >
                Skip
              </button>
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="surface-card px-4 py-2 bg-action-primary text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submitting ? "Sending..." : "Send Feedback"}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
