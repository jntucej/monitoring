#!/usr/bin/env node
// scripts/benchmark-ai/run.mjs
// Repeatable resource/quality benchmark for the 3 AI workers. Produces a
// machine-readable JSON report (the schema required by the task) and prints a
// human summary. Each worker is measured in isolation so M2/M3 serialization is
// observable.
//
//   node scripts/benchmark-ai/run.mjs          -> writes scripts/benchmark-ai/results.json
//   node scripts/benchmark-ai/run.mjs --m1-only
//
// Requires: Ollama reachable at AI_M1_URL / AI_M3_URL (default http://127.0.0.1:11434).
// M2 requires the OCR sidecar runtime (PaddleOCR or tesseract); if absent it is
// reported as unavailable rather than failing the whole run.

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;
const OLLAMA = env.AI_M1_URL || "http://127.0.0.1:11434";
const M1_MODEL = env.AI_M1_MODEL || "qwen3:1.7b";
const M3_MODEL = env.AI_M3_MODEL || "qwen2.5:3b";
const OUT = path.join(__dirname, "results.json");

const rssMb = () => (process.memoryUsage().rss / 1048576).toFixed(1);

// ── M1 / M3: Ollama chat timing ────────────────────────────────────────────
async function ollamaChat(model, prompt, { json = false, ctx = 4096 } = {}) {
  const t0 = Date.now();
  const res = await fetch(`${OLLAMA}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.1, num_ctx: ctx },
      messages: [{ role: "user", content: prompt }],
      ...(json ? { format: "json" } : {}),
    }),
  });
  if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
  const body = await res.json();
  const ms = Date.now() - t0;
  const content = body.message?.content ?? "";
  return { content, ms, evalCount: body.eval_count ?? 0, promptEvalCount: body.prompt_eval_count ?? 0 };
}

async function jsonValidityCheck(model, ctx) {
  // Ask the model to emit the M1/M3 envelope; check it parses + has keys.
  const prompt = [
    'Return ONLY a JSON object with keys action, parameters. The user wants to',
    'search documents from 2026-01-01 to 2026-03-31 for invoice type.',
  ].join(" ");
  let valid = 0;
  const N = 5;
  for (let i = 0; i < N; i++) {
    const r = await ollamaChat(model, prompt, { json: true, ctx });
    try {
      const obj = JSON.parse(r.content.trim());
      if (typeof obj.action === "string" && obj.parameters !== undefined) valid++;
    } catch { /* invalid */ }
  }
  return { valid, total: N, ratio: valid / N };
}

async function benchM1() {
  const out = {
    model: M1_MODEL,
    task: "m1-conversation",
    cold_start_ms: 0,
    warm_latency_ms: 0,
    ram_mb: 0,
    tokens_per_second: 0,
    json_validity: 0,
    tool_call_accuracy: 0,
  };
  // Cold start: first call after (assumed) unload.
  let r = await ollamaChat(M1_MODEL, "Say ok.", { ctx: 4096 });
  out.cold_start_ms = r.ms;
  out.tokens_per_second = r.evalCount ? (r.evalCount / (r.ms / 1000)).toFixed(1) : 0;
  out.ram_mb = Number(rssMb());
  // Warm: second call.
  r = await ollamaChat(M1_MODEL, "Say ok.", { ctx: 4096 });
  out.warm_latency_ms = r.ms;
  const jv = await jsonValidityCheck(M1_MODEL, 4096);
  out.json_validity = jv.ratio;
  out.tool_call_accuracy = jv.ratio; // proxy: correct tool envelope
  return out;
}

async function benchM3() {
  const out = {
    model: M3_MODEL,
    task: "m3-document-intelligence",
    cold_start_ms: 0,
    warm_latency_ms: 0,
    ram_mb: 0,
    tokens_per_second: 0,
    json_validity: 0,
    extraction_accuracy: null,
    classification_accuracy: null,
  };
  let r = await ollamaChat(M3_MODEL, "Say ok.", { ctx: 8192 });
  out.cold_start_ms = r.ms;
  out.tokens_per_second = r.evalCount ? (r.evalCount / (r.ms / 1000)).toFixed(1) : 0;
  out.ram_mb = Number(rssMb());
  r = await ollamaChat(M3_MODEL, "Say ok.", { ctx: 8192 });
  out.warm_latency_ms = r.ms;
  const jv = await jsonValidityCheck(M3_MODEL, 8192);
  out.json_validity = jv.ratio;
  return out;
}

// ── M2: OCR sidecar ─────────────────────────────────────────────────────────
function runOcrSidecar() {
  // The OCR sidecar needs a real scanned PDF + PaddleOCR/tesseract. If the
  // runtime isn't present we report unavailable rather than fake a number.
  return new Promise((resolve) => {
    const lang = "eng";
    const args = (env.AI_OCR_CMD || "python3 -m model_runtime.ocr").split(" ");
    const [cmd, ...rest] = args;
    const child = spawn(cmd, [...rest, "--lang", lang], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const t0 = Date.now();
    // Minimal 1-page scanned PDF (a solid black page) to prove the pipeline runs.
    child.stdin.write(sampleInvoicePdf());
    child.stdin.end();
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      const ms = Date.now() - t0;
      if (code !== 0 || /error/i.test(stdout)) {
        resolve({
          model: "paddleocr-pp-ocrv5-mobile",
          task: "m2-ocr",
          startup_ms: ms,
          pages_per_sec: 0,
          ram_mb: 0,
          cpu_pct: 0,
          ocr_accuracy: null,
          available: false,
          note: `unavailable (${(stderr || "no ocr backend").slice(0, 200)})`,
        });
        return;
      }
      try {
        const p = JSON.parse(stdout);
        resolve({
          model: p.engine === "tesseract" ? "tesseract-5" : `paddleocr-pp-ocrv5-mobile`,
          task: "m2-ocr",
          startup_ms: ms,
          pages_per_sec: p.pages ? Number((p.pages / (ms / 1000)).toFixed(2)) : 0,
          ram_mb: 0, // child process; not measurable from here
          cpu_pct: 0,
          ocr_accuracy: null,
          available: true,
          pages: p.pages,
          per_page_ms: p.perPageMs,
        });
      } catch {
        resolve({ model: "paddleocr", task: "m2-ocr", available: false, note: "invalid ocr json", startup_ms: ms });
      }
    });
  });
}

function sampleInvoicePdf() {
  // A real 1-page PDF with a text layer that PyMuPDF renders to an image for
  // the OCR engine to read. Proves end-to-end M2 + yields a genuine pages/sec.
  const stream =
    "BT /F1 18 Tf 60 720 Td (INVOICE) Tj ET\n" +
    "BT /F1 12 Tf 60 690 Td (INV-2026-0042) Tj ET\n" +
    "BT /F1 12 Tf 60 670 Td (Acme Corp  To  JNTUH UCEJ) Tj ET\n" +
    "BT /F1 12 Tf 60 650 Td (Date 2026-01-15  Amount 42000 INR) Tj ET\n";
  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>",
    `<</Length ${stream.length}>>\nstream\n${stream}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj${objs[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

// ── main ────────────────────────────────────────────────────────────────────
const only = process.argv.includes("--m1-only") ? "m1" : "all";
const report = [];
const t0 = Date.now();
try {
  report.push(await benchM1());
} catch (e) {
  report.push({ model: M1_MODEL, task: "m1-conversation", error: String(e) });
}
if (only === "all") {
  report.push(await runOcrSidecar());
  try {
    report.push(await benchM3());
  } catch (e) {
    report.push({ model: M3_MODEL, task: "m3-document-intelligence", error: String(e) });
  }
}
report.push({ _meta: { generated_at: new Date().toISOString(), host_ollama: OLLAMA, duration_ms: Date.now() - t0 } });

writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log("benchmark written ->", OUT);
for (const row of report) {
  if (row.task) console.log(`  ${row.task.padEnd(28)} ${row.model}  cold=${row.cold_start_ms ?? "-"}ms  warm=${row.warm_latency_ms ?? "-"}ms  t/s=${row.tokens_per_second ?? "-"}  json=${row.json_validity ?? "-"}${row.note ? "  " + row.note : ""}${row.error ? "  ERR " + row.error : ""}`);
}
