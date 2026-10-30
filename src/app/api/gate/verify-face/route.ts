import { NextRequest, NextResponse } from "next/server";
import { findPersonByUniqueId } from "@/lib/db";
import { withAuthorization } from "@/middleware/authorization";
import { withRateLimit } from "@/lib/rate-limit";
import { matchFace, isFaceMatchConfigured } from "@/lib/face-match";
import { logAuditEvent } from "@/lib/audit";
import { isDeviceTypeEnabled } from "@/lib/device-settings";

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { uniqueId, roll, photoBase64, image, gateId } = body;
    const targetRoll = (uniqueId || roll || "").trim().toUpperCase();

    // Authoritative server-side device settings check
    const enabled = await isDeviceTypeEnabled("face", gateId ?? null);
    if (!enabled) {
      return NextResponse.json(
        { success: false, error: { code: "DEVICE_DISABLED", message: "Face verification is disabled by administrator policy" } },
        { status: 403 }
      );
    }

    if (!targetRoll) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "uniqueId or roll is required" } },
        { status: 400 }
      );
    }

    const person = await findPersonByUniqueId(targetRoll);
    if (!person) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Person not found" } },
        { status: 404 }
      );
    }

    const hasPhoto = Boolean(person.photoUrl || person.photo);
    const liveSample = photoBase64 || image;
    const providedLiveSample = Boolean(liveSample);

    let verified = false;
    let confidence = 0;
    let match = false;

    // If face matching is not configured, deny access (fail closed)
    if (!isFaceMatchConfigured()) {
      await logAuditEvent({
              action: "FACE_MATCH_DENIED",
              userId: person.id,
              userName: (person.fullName ?? person.name ?? "Unknown") as string,
              userRole: person.role || "unknown",
              details: { reason: "FACE_MATCH_NOT_CONFIGURED", targetRoll },
            });

      return NextResponse.json(
        { success: false, error: { code: "FACE_MATCH_NOT_CONFIGURED", message: "Face verification service unavailable" } },
        { status: 503 }
      );
    }

    // Require both stored photo and live sample
    if (!hasPhoto) {
      await logAuditEvent({
              action: "FACE_MATCH_DENIED",
              userId: person.id,
              userName: (person.fullName ?? person.name ?? "Unknown") as string,
              userRole: (person.role ?? "unknown") as string,
              details: { reason: "NO_STORED_PHOTO", targetRoll },
            });

      return NextResponse.json(
        { success: false, error: { code: "NO_STORED_PHOTO", message: "No reference photo on file" } },
        { status: 403 }
      );
    }

    if (!providedLiveSample) {
      await logAuditEvent({
              action: "FACE_MATCH_DENIED",
              userId: person.id,
              userName: (person.fullName ?? person.name ?? "Unknown") as string,
              userRole: (person.role ?? "unknown") as string,
              details: { reason: "NO_LIVE_SAMPLE", targetRoll },
            });

      return NextResponse.json(
        { success: false, error: { code: "NO_LIVE_SAMPLE", message: "Live face sample required" } },
        { status: 400 }
      );
    }

    // Perform face matching
    try {
      const result = await matchFace(person.photoUrl || person.photo!, liveSample!);
      verified = result.match;
      confidence = result.score;
      match = result.match;

      if (verified) {
        await logAuditEvent({
                  action: "FACE_MATCH_ALLOWED",
                  userId: person.id,
                  userName: (person.fullName ?? person.name ?? "Unknown") as string,
                  userRole: (person.role ?? "unknown") as string,
                  details: { score: confidence, targetRoll },
                });
      } else {
        await logAuditEvent({
                  action: "FACE_MATCH_DENIED",
                  userId: person.id,
                  userName: (person.fullName ?? person.name ?? "Unknown") as string,
                  userRole: (person.role ?? "unknown") as string,
                  details: { score: confidence, reason: "LOW_SCORE", targetRoll },
                });
      }
    } catch (faceError: any) {
      await logAuditEvent({
              action: "FACE_MATCH_DENIED",
              userId: person.id,
              userName: (person.fullName ?? person.name ?? "Unknown") as string,
              userRole: (person.role ?? "unknown") as string,
              details: { reason: "MATCHER_ERROR", error: faceError.message, targetRoll },
            });

      return NextResponse.json(
        { success: false, error: { code: "FACE_MATCH_FAILED", message: "Face verification failed" } },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      verified,
      confidence,
      match,
      person: {
        id: person.id,
        uniqueId: person.uniqueId,
        name: person.fullName || person.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Internal error" } },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(
  withAuthorization(handlePost, { requiredRole: ["operator", "admin", "sysadmin"] }),
  { keyPrefix: "verify_face", maxRequests: 60 }
);
