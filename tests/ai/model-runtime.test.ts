// tests/ai/ — unit tests for the 3-model AI layer. These run against the
// *schemas and permission engine* (pure, no network) so they pass in CI without
// a live Ollama. A separate live-integration mode exercises the real models.
//
//   npx vitest run tests/ai

import { describe, it, expect } from "vitest";
import { ToolActionSchema, parseToolAction, extractJson } from "../../model-runtime/schemas/m1.js";
import { DocumentExtractionSchema, parseDocumentExtraction } from "../../model-runtime/schemas/doc.js";
import {
  authorize,
  ToolAuthorizations,
  type PermissionContext,
  type CredentialLookup,
} from "../../model-runtime/permission-engine.js";

const ctx: PermissionContext = {
  tenantId: "t1",
  userId: "u1",
  role: "student",
  capabilities: ["documents.read", "provider.document_store"],
};

const creds: CredentialLookup = async (tenantId, userId, provider) =>
  provider === "document_store"
    ? { tenantId, userId, provider, secret: "SUPER_SECRET_DO_NOT_LEAK" }
    : null;

describe("M1 schema", () => {
  it("parses a clean tool JSON", () => {
    const a = parseToolAction(
      JSON.stringify({ action: "get_documents", parameters: { from: "2026-01-01", to: "2026-03-31" }, confidence: 0.9 }),
    );
    expect(a.action).toBe("get_documents");
    expect(a.parameters?.from).toBe("2026-01-01");
  });

  it("recovers JSON wrapped in prose / fences", () => {
    const raw = 'Sure! Here you go:\n```json\n{"action":"search_documents","parameters":{"q":"invoice"}}\n```\nHope that helps.';
    const a = parseToolAction(raw);
    expect(a.action).toBe("search_documents");
    expect(a.parameters?.q).toBe("invoice");
  });

  it("rejects malformed output", () => {
    expect(() => parseToolAction("not json at all")).toThrow();
  });

  it("enforces action non-empty", () => {
    expect(() => ToolActionSchema.parse({ action: "" })).toThrow();
  });
});

describe("Document schema", () => {
  it("accepts a valid extraction", () => {
    const raw = JSON.stringify({
      document_type: "invoice",
      confidence: 0.97,
      document_number: "INV-2026-0042",
      issue_date: "2026-01-15",
      valid_from: null,
      valid_until: "2026-03-15",
      issuer: "Acme Corp",
      recipient: "JNTUH UCEJ",
      amount: { value: 42000, currency: "INR" },
    });
    const d = parseDocumentExtraction(raw, extractJson);
    expect(d.amount?.value).toBe(42000);
    expect(d.issuer).toBe("Acme Corp");
  });

  it("requires document_type", () => {
    expect(() =>
      parseDocumentExtraction(JSON.stringify({ confidence: 1 }), extractJson),
    ).toThrow();
  });

  it("allows null dates", () => {
    const d = parseDocumentExtraction(
      JSON.stringify({ document_type: "id", confidence: 0.5, document_number: null, issue_date: null, valid_from: null, valid_until: null, issuer: null, recipient: null, amount: null }),
      extractJson,
    );
    expect(d.issue_date).toBeNull();
  });
});

describe("Permission engine (deterministic, credential-isolated)", () => {
  it("authorizes a tool the role can use", async () => {
    const d = await authorize({ action: "get_documents", parameters: {} }, ctx, creds);
    expect(d.ok).toBe(true);
    if (d.ok) {
      expect(d.credential.secret).toBe("SUPER_SECRET_DO_NOT_LEAK");
    }
  });

  it("denies an unknown tool", async () => {
    const d = await authorize({ action: "drop_database", parameters: {} }, ctx, creds);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason.code).toBe("NO_SUCH_TOOL");
  });

  it("denies when capability is missing", async () => {
    const weak = { ...ctx, capabilities: [] };
    const d = await authorize({ action: "get_documents", parameters: {} }, weak, creds);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason.code).toBe("MISSING_CAPABILITY");
  });

  it("denies when no credential exists", async () => {
    const noCred: CredentialLookup = async () => null;
    const d = await authorize({ action: "get_documents", parameters: {} }, ctx, noCred);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason.code).toBe("NO_CREDENTIAL");
  });

  it("enforces tenant mismatch on the credential", async () => {
    const wrongTenant: CredentialLookup = async () => ({
      tenantId: "OTHER",
      userId: "u1",
      provider: "document_store",
      secret: "x",
    });
    const d = await authorize({ action: "get_documents", parameters: {} }, ctx, wrongTenant);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.reason.code).toBe("TENANT_MISMATCH");
  });
});
