// model-runtime/ocr/index.ts
// M2 OCR worker. Text layer first, OCR only when the PDF is scanned.
// OCR is a *dedicated* engine (PaddleOCR via the Python sidecar, Tesseract
// fallback) — never a general-purpose LLM. The sidecar is launched per burst
// and stopped afterwards so it holds no resident memory.

import { spawn } from "node:child_process";
import type { AiConfig } from "../config";
import { log } from "../logger";

const logger = log("m2-ocr");

export interface OcrResult {
  text: string;
  engine: "paddle" | "tesseract";
  pages: number;
  perPageMs: number;
}

export interface OcrInput {
  /** Raw PDF bytes (a scanned document, no usable text layer). */
  pdf: Buffer;
  /** Language hint for the OCR engine, default "eng". */
  lang?: string;
  timeoutMs?: number;
}

/**
 * Run OCR over a scanned PDF by invoking the documented launcher
 * (`AI_OCR_CMD`, default `python3 -m model_runtime.ocr`). The launcher writes
 * JSON to stdout: { text, engine, pages }. This module is the Node boundary —
 * the Python sidecar is the only process that actually runs the OCR model.
 */
export function runOcr(cfg: AiConfig, input: OcrInput): Promise<OcrResult> {
  const timeoutMs = input.timeoutMs ?? 120_000;
  const args = cfg.ocrCmd.split(" ");
  const [cmd, ...rest] = args;
  const child = spawn(cmd, [...rest, "--lang", input.lang ?? "eng"], {
    stdio: ["pipe", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (d) => (stdout += d));
  child.stderr.on("data", (d) => (stderr += d));

  const timer = setTimeout(() => {
    child.kill("SIGKILL");
  }, timeoutMs);

  return new Promise((resolve, reject) => {
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        logger.warn({ code, stderr: stderr.slice(0, 400) }, "ocr sidecar failed");
        reject(new Error(`OCR sidecar exited ${code}: ${stderr.slice(0, 300)}`));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as OcrResult;
        logger.info({ engine: parsed.engine, pages: parsed.pages, perPageMs: parsed.perPageMs }, "ocr complete");
        resolve(parsed);
      } catch (e) {
        reject(new Error("OCR sidecar produced invalid JSON: " + (e as Error).message));
      }
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error("OCR sidecar spawn error: " + e.message));
    });
    child.stdin.write(input.pdf);
    child.stdin.end();
  });
}

/**
 * Pipeline stage: extract text. If the PDF carries a real text layer, return it
 * (caller supplies the extractor) and skip OCR entirely. Only when no useful
 * text layer exists do we OCR — never OCR a normal digital PDF.
 */
export function hasUsableTextLayer(text: string | undefined, minChars = 80): boolean {
  return (text?.trim().length ?? 0) >= minChars;
}
