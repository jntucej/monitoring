import { ImageResponse } from "next/og";
import { COLLEGE } from "@/lib/college-config";

export const runtime = "edge";

export const alt = `${COLLEGE.officialName} Campus Access Portal`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "64px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "30px",
              fontWeight: 700,
            }}
          >
            J
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "22px", fontWeight: 600 }}>JNTUH UCEJ</div>
            <div style={{ fontSize: "14px", color: "#94a3b8" }}>
              Campus Access Portal
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              fontSize: "58px",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            JNTUH University College of Engineering Jagtial
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#cbd5e1",
              lineHeight: 1.4,
              maxWidth: "1000px",
            }}
          >
            Official campus access, permissions and role-based services
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "16px",
            color: "#94a3b8",
          }}
        >
          <div>NAAC A+ (3.29)</div>
          <div>·</div>
          <div>Autonomous since 2023</div>
          <div>·</div>
          <div>Jagtial, Telangana</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
