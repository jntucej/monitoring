import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          // unslop-ignore: ImageResponse has no access to CSS variables;
          // hex is the only option in this render context.
          background: "#10b981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "20px",
          fontWeight: 700,
          borderRadius: "6px",
        }}
      >
        J
      </div>
    ),
    { ...size },
  );
}
