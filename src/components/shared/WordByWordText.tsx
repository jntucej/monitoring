import { useMemo } from "react";
import type { ElementType } from "react";

export interface WordByWordTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  delay?: number;
}

/**
 * WordByWordText — renders `text` as plain static words.
 * Motion removed (single-theme performance pass): the animated
 * word-stagger is gone, but the component keeps its API so
 * imports keep compiling.
 */
export function WordByWordText({ text, className = "", as = "span", delay = 0 }: WordByWordTextProps) {
  const words = useMemo(() => text.split(" "), [text]);
  const Tag = as as any;
  void delay;
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <span key={i} className="inline-block whitespace-pre">
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </Tag>
  );
}

export default WordByWordText;
