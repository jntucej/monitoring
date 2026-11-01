// tests/student/notifications-merge.test.tsx
// The merged notifications feed: one page, three tabs, both sources.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

jest.mock("@/hooks/useApiResource", () => ({
  __esModule: true,
  useApiResource: jest.fn(),
}));
jest.mock("@/components/shared/AuthGuard", () => ({
  __esModule: true,
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/components/shared/LoadingStates", () => ({
  __esModule: true,
  PageLoading: () => <div />,
}));
jest.mock("@/components/shared/WidgetBoundary", () => ({
  __esModule: true,
  WidgetBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock("@/components/shared/EmptyState", () => ({
  __esModule: true,
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty">{title}</div>,
}));
jest.mock("@/components/ui/modal", () => ({
  __esModule: true,
  Modal: () => null,
}));
jest.mock("@/stores/uiStore", () => ({
  __esModule: true,
  useUIStore: jest.fn((sel: any) => sel({ success: jest.fn(), error: jest.fn() })),
}));

import { useApiResource } from "@/hooks/useApiResource";
import NotificationsPage from "@/app/(student)/student/notifications/page";

const resourceMock = useApiResource as jest.Mock;
const NOW = new Date().toISOString();

function mockSources(alerts: any[], announcements: any[]) {
  resourceMock.mockImplementation((url: string) => {
    if (url === "/api/notifications")
      return { data: { data: alerts }, loading: false, error: null, refresh: jest.fn() };
    if (url === "/api/announcements/active")
      return { data: { data: announcements }, loading: false, error: null, refresh: jest.fn() };
    return { data: null, loading: false, error: null, refresh: jest.fn() };
  });
}

describe("student notifications merge", () => {
  it("merges both sources into the All tab, newest first", async () => {
    mockSources(
      [{ id: "a1", title: "Alert one", message: "m", created_at: NOW }],
      [{ id: "b1", title: "Announcement one", message: "m", created_at: NOW }],
    );
    render(<NotificationsPage />);
    await screen.findByText("Alert one");
    expect(screen.getByText("Announcement one")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("filters on the Alerts / Announcements tabs", async () => {
    mockSources(
      [{ id: "a1", title: "Alert only", message: "m", created_at: NOW }],
      [{ id: "b1", title: "Announcement only", message: "m", created_at: NOW }],
    );
    render(<NotificationsPage />);
    await screen.findByText("Alert only");

    fireEvent.click(screen.getByText("announcements"));
    expect(screen.queryByText("Alert only")).not.toBeInTheDocument();
    expect(screen.getByText("Announcement only")).toBeInTheDocument();

    fireEvent.click(screen.getByText("alerts"));
    expect(screen.getByText("Alert only")).toBeInTheDocument();
    expect(screen.queryByText("Announcement only")).not.toBeInTheDocument();
  });

  it("empty state when no items on either source", async () => {
    mockSources([], []);
    render(<NotificationsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("empty")).toHaveTextContent("Nothing here"),
    );
  });
});
