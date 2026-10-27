import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { {{ cookiecutter.pulse_name }} } from "./{{ cookiecutter.pulse_name }}";

describe("<{{ cookiecutter.pulse_name }} />", () => {
  it("renders with role=status and an accessible label", () => {
    render(<{{ cookiecutter.pulse_name }} label="gate online" />);
    const node = screen.getByRole("status", { name: /gate online/i });
    expect(node).toBeInTheDocument();
  });

  it("falls back to 'live status' when no label is passed", () => {
    render(<{{ cookiecutter.pulse_name }} />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "live status"
    );
  });

  it("honors size and color props", () => {
    const { container } = render(
      <{{ cookiecutter.pulse_name }} color="rose" size={12} />
    );
    const node = container.firstChild as HTMLElement;
    expect(node.style.width).toBe("12px");
    expect(node.style.height).toBe("12px");
    expect(node.style.backgroundColor).toMatch(/244, 63, 94|f43f5e/i);
  });

  it("applies the requested variant class", () => {
    const { container } = render(<{{ cookiecutter.pulse_name }} variant="badge" />);
    expect(container.firstChild).toHaveClass("pulse-badge");
  });

  it("carries a per-instance delay via CSS custom property", () => {
    const { container } = render(<{{ cookiecutter.pulse_name }} delayMs={120} />);
    const node = container.firstChild as HTMLElement;
    // CSS variable is set inline; verify it made it onto the style attribute.
    expect(node.getAttribute("style")).toContain("--pulse-delay: 120ms");
  });
});
