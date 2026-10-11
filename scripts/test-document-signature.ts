import assert from "node:assert";
import { computeSignatureHash, sha256Hex } from "../src/lib/document-signature";

async function main() {
  assert.strictEqual(typeof sha256Hex("PDF-FAKE-BYTES"), "string");
  const doc = Buffer.from("PDF-FAKE-BYTES");

  const a = await computeSignatureHash({ documentBytes: doc, ticketNumber: "EXM-1001", signerId: "p1", timestampMs: 1000 });
  const b = await computeSignatureHash({ documentBytes: doc, ticketNumber: "EXM-1001", signerId: "p1", timestampMs: 1000 });
  assert.strictEqual(a, b, "deterministic for identical inputs");

  const c = await computeSignatureHash({ documentBytes: doc, ticketNumber: "EXM-1001", signerId: "p1", timestampMs: 1001 });
  assert.notStrictEqual(a, c, "differs when timestamp differs");

  const tampered = Buffer.from("PDF-FAKE-BYTEZ");
  const d = await computeSignatureHash({ documentBytes: tampered, ticketNumber: "EXM-1001", signerId: "p1", timestampMs: 1000 });
  assert.notStrictEqual(a, d, "differs when bytes differ");

  console.log("✅ Signature binding invariants hold");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

