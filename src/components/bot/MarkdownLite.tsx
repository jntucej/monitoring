// src/components/bot/MarkdownLite.tsx
//
// A ~1KB dependency-free renderer for the narrow markdown subset the bot
// actually produces: **bold**, *italic*, `inline code`, [link](url), and
// paragraphs. No tables, no fenced code blocks — the knowledge-base
// answers are prose + emphasis, not documentation.
//
// Why not react-markdown? It pulls in ~200KB of unified/rehype plugins
// for a bubble that only needs emphasis. This component is safe to ship:
// it renders text as React elements (never dangerouslySetInnerHTML), so
// any raw HTML in the LLM output is escaped by React, not interpreted.
//
// The content is passed as one string; parsing is a single-pass line
// split: blank lines → <p>, "- " prefixes → <ul><li>.

import { type ReactElement } from "react";

function parseInline(text: string): ReactElement[] {
  // Order matters: code first (its contents are not re-parsed), then
  // bold, then italic, then links.
  const out: ReactElement[] = [];
  const re = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))/g;
  let m: RegExpExecArray | null;
  let last = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<span key={`t${last}`}>{text.slice(last, m.index)}</span>);
    const full = m[0];
    if (full.startsWith("**")) {
      out.push(<strong key={`b${m.index}`}>{full.slice(2, -2)}</strong>);
    } else if (full.startsWith("*")) {
      out.push(<em key={`i${m.index}`}>{full.slice(1, -1)}</em>);
    } else if (full.startsWith("`")) {
      out.push(
        <code
          key={`c${m.index}`}
          className="px-1 py-0.5 rounded bg-bg-base text-text-primary text-[0.85em] font-mono"
        >
          {full.slice(1, -1)}
        </code>,
      );
    } else {
      // [label](url)
      const match = full.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (match) {
        const [, label, url] = match;
        // Only allow http(s) — never render arbitrary scheme URLs the LLM
        // could be tricked into emitting.
        if (/^https?:\/\//.test(url)) {
          out.push(
            <a key={`a${m.index}`} href={url} target="_blank" rel="noopener noreferrer"
               className="text-action-success hover:underline underline-offset-2">
              {label}
            </a>,
          );
        } else {
          out.push(<span key={`a${m.index}`}>{label}</span>);
        }
      } else {
        out.push(<span key={`a${m.index}`}>{full}</span>);
      }
    }
    last = m.index + full.length;
  }
  if (last < text.length) out.push(<span key={`e${last}`}>{text.slice(last)}</span>);
  return out;
}

export function MarkdownLite({ content }: { content: string }) {
  if (!content) return null;
  // Split into blocks on double-newline (paragraphs) and list lines.
  const blocks = content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-1.5">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim());
        const isList = lines.length && lines.every((l) => /^[-*]\s/.test(l) || l === "");
        if (isList) {
          const items = lines.filter((l) => /^[-*]\s/.test(l));
          return (
            <ul key={bi} className="space-y-0.5 pl-4 list-disc text-[0.95em]">
              {items.map((item, ii) => (
                <li key={ii}>{parseInline(item.replace(/^[-*]\s+/, ""))}</li>
              ))}
            </ul>
          );
        }
        // A paragraph may still contain a single hard newline (render as
        // a space — the bot's prose wraps naturally).
        const text = lines.join(" ");
        return <p key={bi}>{parseInline(text)}</p>;
      })}
    </div>
  );
}
