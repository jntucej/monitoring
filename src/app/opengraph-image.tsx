// src/app/opengraph-image.tsx
//
// Open Graph image route — returns the shared OG PNG for any URL.
// Uses the Node runtime (NOT edge). In a standalone Node Docker build,
// edge-runtime image routes can silently fall back or 500; running this on
// Node sidesteps that entirely.

import { ImageResponse } from "next/og";
import { readFileSync } from "fs";

// Next.js static image route contract
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export const alt = "Gate Monitor — campus access platform";

export default function OpengraphImage({
  params,
}: {
  params: Promise<{ host?: string }>;
}) {
  void params;
  const img = readFileSync("public/og-default.png");
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img src={`data:image/png;base64,${img.toString("base64")}`} style={{ width: "100%", height: "100%" }} />
    </div>,
  );
}
