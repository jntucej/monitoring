import { ImageResponse } from "next/og";
import { COLLEGE } from "@/lib/college-config";

export const runtime = "nodejs";

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
          background: "linear-gradient(135deg, var(--bg-base) 0%, #1e293b 100%)",
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
              background: "var(--action-success)",
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
            <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>
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
              color: "var(--text-secondary)",
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
            color: "var(--text-muted)",
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
