import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GateModeBanner } from "@/components/operator/GateModeBanner";

// The banner mounts a Modal (framer-motion). Stub the real one so the test
// renders the override form without the 3D/motion dependency.
jest.mock("@/components/ui/modal", () => {
  // Render the real form body but skip framer-motion's modal chrome.
  const ReactLib = require("react");
  return {
    Modal: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: ReactLib.ReactNode }) =>
      isOpen ? (
        <div data-testid="override-modal">
          <h3>{title}</h3>
          {children}
        </div>
      ) : null,
  };
});

const noop = async () => {};

describe("GateModeBanner", () => {
  it("OPEN → pill shown, no override CTA, no alert", () => {
    render(
      <GateModeBanner mode="OPEN" lockdown={null} scanningAllowed
        onOverrideMaintenance={noop} onDismissLockdown={() => {}} />,
    );
    expect(screen.getByLabelText(/Gate mode: OPEN/)).toBeInTheDocument();
    expect(screen.queryByText("Override")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("CURFEW → pill + advisory copy, scans still allowed, no override", () => {
    render(
      <GateModeBanner mode="CURFEW" lockdown={null} scanningAllowed
        onOverrideMaintenance={noop} onDismissLockdown={() => {}} />,
    );
    expect(screen.getByLabelText(/Gate mode: CURFEW/)).toBeInTheDocument();
    expect(screen.getByText(/curfew advisory/i)).toBeInTheDocument();
    expect(screen.queryByText("Override")).not.toBeInTheDocument();
  });

  it("MAINTENANCE → Override opens the modal, requires a reason, then posts", async () => {
    const onOverride = jest.fn().mockResolvedValue(undefined);
    // scanningAllowed=true keeps the submit button enabled so the min-length
    // validation inside the handler is what blocks the empty post.
    render(
      <GateModeBanner mode="MAINTENANCE" lockdown={null} scanningAllowed
        onOverrideMaintenance={onOverride} onDismissLockdown={() => {}} />,
    );
    fireEvent.click(screen.getByText("Override"));
    expect(await screen.findByText(/Gate mode is/i)).toBeInTheDocument();

    // empty reason → native form validation blocks the submit (Input has
    // required), so the custom alert only appears after a typed value.
    fireEvent.change(screen.getByLabelText(/Reason/i), { target: { value: "verified gate ok" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /override and re-enable/i }));
    });
    expect(onOverride).toHaveBeenCalledWith("verified gate ok");
  });

  it("LOCKDOWN → red pill + message; dismiss hides message not the pill", () => {
    const onDismiss = jest.fn();
    render(
      <GateModeBanner mode="OPEN"
        lockdown={{ id: "L1", scopes: ["MAIN"], message: "Drill until 14:00" }}
        scanningAllowed={false}
        onOverrideMaintenance={noop} onDismissLockdown={onDismiss} />,
    );
    expect(screen.getByLabelText(/Gate mode: LOCKDOWN/)).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/Campus lockdown/i);
    expect(alert).toHaveTextContent(/Drill until 14:00/);
    fireEvent.click(screen.getByText(/dismiss message/i));
    expect(onDismiss).toHaveBeenCalled();
  });
});
