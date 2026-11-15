// tests/gate/helpers/web-globals-codec.ts
// FIRST-stage shim: install the codec + stream + structured-clone globals that
// `undici`'s fetch internals require AT IMPORT TIME (they do `new TextEncoder()`
// and reference `ReadableStream` at module load, before our fetch shim runs).
// Runs before web-globals.ts in jest.setup.* order. All from zero-dep Node builtins.
import { TextEncoder, TextDecoder } from 'node:util';
import { webcrypto } from 'node:crypto';
import { ReadableStream, WritableStream, TransformStream } from 'node:stream/web';
import { Blob, File } from 'node:buffer';

const g = globalThis as Record<string, unknown>;
if (typeof g.TextEncoder !== 'function') g.TextEncoder = TextEncoder;
if (typeof g.TextDecoder !== 'function') g.TextDecoder = TextDecoder;
if (typeof g.ReadableStream === 'undefined') g.ReadableStream = ReadableStream;
if (typeof g.WritableStream === 'undefined') g.WritableStream = WritableStream;
if (typeof g.TransformStream === 'undefined') g.TransformStream = TransformStream;
if (typeof g.Blob === 'undefined') g.Blob = Blob;
if (typeof g.File === 'undefined') g.File = File;

// WebCrypto (jsdom lacks crypto.subtle).
const cryptoAny = g.crypto as { subtle?: unknown } | undefined;
if (typeof g.crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
} else if (typeof cryptoAny?.subtle === 'undefined') {
  try {
    Object.defineProperty(g.crypto as object, 'subtle', { value: webcrypto.subtle, configurable: true });
  } catch {
    /* frozen crypto — only subtle missing; rare */
  }
}

export {};
