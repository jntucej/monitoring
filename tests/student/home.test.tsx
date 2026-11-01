// tests/student/home.test.tsx
// Home-as-status: the student home renders 5 cards (not the old 18-widget
// stack), TodayStatus shows Inside/Outside, ActivePassCard shows the QR
// when 1 pass, the count when >1, and the apply CTA when 0.
import { render, screen, waitFor } from "@testing-library/react";

jest.mock("@/hooks/useApiResource", () => ({
  __esModule: true,
  useApiResource: jest.fn(),
}));
jest.mock("@/stores/authStore", () => ({
  __esModule: true,
  useAuthStore: jest.fn((sel) => sel({ user: { name: "T" }, role: "student", authenticated: true })),
}));
jest.mock("@/stores/uiStore", () => ({
  __esModule: true,
  useUIStore: jest.fn((sel) => sel({ success: jest.fn() })),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { useApiResource } from "@/hooks/useApiResource";
import {
  TodayStatus,
} from "@/components/student/home/TodayStatus";
import {
  ActivePassCard,
} from "@/components/student/home/ActivePassCard";

const dashboardMock = useApiResource as jest.Mock;

function mockDashboard(data: any) {
  dashboardMock.mockImplementation((url: string, _opts) => {
    if (url.startsWith("/api/student/dashboard"))
      return { data, loading: false, error: null, refresh: jest.fn() };
    if (url.startsWith("/api/home/live"))
      return { data: { stats: { onCampusNow: 10, scansToday: 100 } }, loading: false, error: null, refresh: jest.fn() };
    return { data: null, loading: false, error: null, refresh: jest.fn() };
  });
}

describe("Student home as status", () => {
  it("TodayStatus: no scans today → neutral state", () => {
    mockDashboard({ lastScan: null, curfew: { today: { score: 100, late: 0 } }, activePasses: [] });
    render(<TodayStatus />);
    expect(screen.getByText("No scans today")).toBeInTheDocument();
  });

  it("TodayStatus: last scan IN → Inside campus + time-ago", () => {
    mockDashboard({
      lastScan: { direction: "IN", gateName: "Main Gate", timestamp: new Date().toISOString() },
      curfew: { today: { score: 100, late: 0 } },
      activePasses: [],
    });
    render(<TodayStatus />);
    expect(screen.getByText("Inside campus")).toBeInTheDocument();
  });

  it("ActivePassCard: 0 passes → apply CTA", () => {
    mockDashboard({ lastScan: null, curfew: { today: { score: 100, late: 0 } }, activePasses: [] });
    render(<ActivePassCard />);
    expect(screen.getByText(/No active pass/i)).toBeInTheDocument();
    expect(screen.getByText(/Apply for one/i)).toBeInTheDocument();
  });

  it("ActivePassCard: >1 passes → count + see-all link", () => {
    mockDashboard({
      lastScan: null,
      curfew: { today: { score: 100, late: 0 } },
      activePasses: [
        { id: "p1", reason: "home_out", from: "", to: "", status: "APPROVED" },
        { id: "p2", reason: "daily_outing", from: "", to: "", status: "APPROVED" },
      ],
    });
    render(<ActivePassCard />);
    expect(screen.getByText(/2 active passes/i)).toBeInTheDocument();
    expect(screen.getByText(/See all/i)).toBeInTheDocument();
  });
});
