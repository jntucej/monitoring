// tests/student/signed-qr.test.tsx
// P0: DigitalIdCard fetches /api/students/qr-token and renders the signed
// short-lived token in the QR (the card's "Signed token" caption proves the
// effect ran), not the raw roll.
import { render, screen, waitFor, cleanup } from "@testing-library/react";

jest.mock("@/hooks/useApi", () => ({
  __esModule: true,
  useApi: () => ({ getHeaders: () => ({}) }),
}));
jest.mock("@/stores/authStore", () => {
  const impl: any = () => ({
    user: { uniqueId: "24JJ1A0101", name: "T", id: "u1" },
    role: "student",
  });
  impl.getState = () => ({
    user: { uniqueId: "24JJ1A0101", name: "T", id: "u1" },
    role: "student",
  });
  return { __esModule: true, useAuthStore: impl };
});
jest.mock("@/lib/rollNumber", () => ({
  __esModule: true,
  parseRollNumber: jest.fn(() => null),
}));

import { DigitalIdCard } from "@/components/student/DigitalIdCard";

describe("DigitalIdCard signed QR (P0)", () => {
  afterEach(cleanup);

  it("renders the signed token, not the raw roll", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn(async (url: any) => {
      const u = String(url);
      if (u.includes("/api/students/qr-token"))
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: { qrToken: "eyJhbGciOiJIUzI1NiJ9.payload.sig" },
          }),
        };
      if (u.includes("/api/mess/my-token"))
        return { ok: true, json: async () => ({ success: true, data: { tokens: [] } }) };
      if (u.includes("/api/students/"))
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: {
              student: {
                name: "T",
                roll: "24JJ1A0101",
                uniqueId: "24JJ1A0101",
                photo: "",
              },
            },
          }),
        };
      return originalFetch(url);
    }) as any;

    render(<DigitalIdCard />);

    // The signed-token caption only appears after the qrToken effect ran.
    await screen.findByText(/Signed token/i, {}, { timeout: 5000 });
    // The mock QR exposes its value — assert it is the signed token, not
    // the raw roll (the roll still renders as the card's display name,
    // which is fine; only the QR value must be the token).
    const qr = document.querySelector('[data-testid="qr-code"]');
    expect(qr?.getAttribute("data-value")).toBe("eyJhbGciOiJIUzI1NiJ9.payload.sig");

    global.fetch = originalFetch;
  }, 15_000);
});
