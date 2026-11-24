"use client";

// useIsSakuga — shared gate for page-level sakuga-VFX elements.
// The sakuga theme is applied post-login (data-theme="sakuga" on <html>),
// so a single mount-check can miss it. Poll a few ticks after auth AND
// watch for live theme switches so graphite→sakuga / sakuga→graphite
// updates the element in-place without a full navigation.
//
// Pages that add a single VFX element (rating, tabs, toggle, toast,
// input, slider, checkbox, radio, tooltip) use this to decide whether to
// render it. Graphite users never see the element → zero extra nodes.

import { useEffect, useState } from "react";

// ── TSX declarations for sakuga custom elements ─────────────────────────
// Generic props — matches the pattern used in SakugaConsole/SakugaControls.
// The VFX scripts handle all attributes via web-component properties.
type SakugaProps = Record<string, unknown> & { children?: React.ReactNode };

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "sakuga-button": SakugaProps;
      "sakuga-toggle": SakugaProps;
      "sakuga-input": SakugaProps;
      "sakuga-rating": SakugaProps;
      "sakuga-tabs": SakugaProps;
      "sakuga-toast": SakugaProps;
      "sakuga-slider": SakugaProps;
      "sakuga-checkbox": SakugaProps;
      "sakuga-radio": SakugaProps;
      "sakuga-tooltip": SakugaProps;
    }
  }
}

export function useIsSakuga(): boolean {
  const [on, setOn] = useState(false);

  useEffect(() => {
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    let observer: MutationObserver | undefined;

    const read = () =>
      document.documentElement.getAttribute("data-theme") === "sakuga";

    const check = () => {
      setOn(read());
      if (!read() && ++tries < 6) timer = setTimeout(check, 400);
    };
    check();

    observer = new MutationObserver(() => setOn(read()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
  }, []);

  return on;
}
