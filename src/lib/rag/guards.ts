// L5 — AI security: OWASP LLM Top 10 (2026) — prompt-injection defenses.
//
// Four layers, per the 2026 research consensus:
//   1. Input-side: provenance tagging + channel isolation (tagChunk)
//   2. Tool layer: capability minimization (operator_actions workflow is
//      the tool layer — gate_app read-only is the capability boundary)
//   3. Output-side: schema validation + content sanitization
//      (sanitizeModelOutput — strip image-markdown exfiltration vector)
//   4. Composition: end-to-end adversarial eval in CI (Promptfoo)
//
// The model is a probabilistic filter, not a boundary. Vendor-side tuning
// still shows 30-50% attack success on adversarial corpora. These guards
// are a depth layer, not the whole answer.

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Trust markers — wrap every retrieved chunk so the model can distinguish
 * data from instructions. The system prompt tells the model to treat
 * content inside these markers strictly as inert factual text.
 */
export function tagChunk(chunk: { id: string; title: string; content: string }): string {
  return [
    `<untrusted_document id="${chunk.id}" title="${escapeAttr(chunk.title)}">`,
    chunk.content,
    `</untrusted_document>`,
  ].join("\n");
}

/**
 * Input-side: strip instruction-like lines and known injection tokens from
 * retrieved text before it reaches the model. Reduces the attack surface
 * without removing legitimate document content.
 */
export function sanitizeRetrieved(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "")
    .replace(/```[\s\S]*?```/g, "[code omitted]")
    .replace(/^(ignore|disregard|forget|system:|assistant:)\s.*$/gim, "")
    .replace(/\b(run|execute|invoke|call|fetch)\(\s*['"`]https?:/gi, "url(")
    .slice(0, 4000);
}

/**
 * Output-side: reject/sandbox image-markdown (the #1 exfiltration vector in
 * agent incidents — ~1/3 of publicized agent breaches used it to smuggle
 * data out via a tracking pixel in a markdown image tag).
 *
 * Only allow same-origin images (relative URLs or data: URIs under a
 * length cap). Everything else is stripped.
 */
export function sanitizeModelOutput(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\(([^)]+)\)/g, (_m, url: string) => {
      // Allow only relative URLs (same-origin) — absolute URLs are blocked
      // unless they point at the app's own origin.
      if (/^https?:\/\//.test(url)) {
        // Strip absolute http(s) URLs entirely — the UI can render relative
        // asset URLs but not remote tracking pixels.
        return "[image removed]";
      }
      if (url.startsWith("data:")) {
        // Cap data: URIs to prevent embedded exfiltration payloads
        return url.length > 2000 ? "[image removed]" : `[image](${url})`;
      }
      // Relative URLs (same-origin) are safe
      return `[image](${url})`;
    })
    .replace(/data:[^;]+;base64,[A-Za-z0-9+/=]{100,}/g, "[base64 removed]");
}
