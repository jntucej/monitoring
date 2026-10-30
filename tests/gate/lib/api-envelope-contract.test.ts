import { describe, it, expect } from "@jest/globals";
import { NextResponse } from "next/server";

interface SuccessEnvelope<T = unknown> {
  success: true;
  data: T;
}

interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

type ApiResponse<T = unknown> = SuccessEnvelope<T> | ErrorEnvelope;

function assertStandardEnvelope(json: unknown): json is ApiResponse {
  if (typeof json !== "object" || json === null) return false;
  const obj = json as Record<string, unknown>;
  if (obj.success === true) {
    return "data" in obj;
  }
  if (obj.success === false) {
    return (
      typeof obj.error === "object" &&
      obj.error !== null &&
      typeof (obj.error as Record<string, unknown>).code === "string" &&
      typeof (obj.error as Record<string, unknown>).message === "string"
    );
  }
  return false;
}

describe("API Error & Response Envelope Contract", () => {
  it("validates successful response contract format", () => {
    const successPayload = {
      success: true,
      data: { id: "test-123", status: "ACTIVE" },
    };
    expect(assertStandardEnvelope(successPayload)).toBe(true);
  });

  it("validates unified error response envelope", () => {
    const errorPayload = {
      success: false,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests",
      },
    };
    expect(assertStandardEnvelope(errorPayload)).toBe(true);
  });

  it("rejects non-standard raw error format", () => {
    const legacyRawError = {
      error: "Unauthorized",
    };
    expect(assertStandardEnvelope(legacyRawError)).toBe(false);
  });
});
