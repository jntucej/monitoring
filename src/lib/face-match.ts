// Face matching integration — feature-flagged, fails closed
import { AppError } from "@/server/http/errors";

export interface FaceMatchResult {
  match: boolean;
  score: number;
}

const FACE_MATCH_URL = process.env.FACE_MATCH_URL;
const FACE_MATCH_THRESHOLD = Number(process.env.FACE_MATCH_THRESHOLD ?? 0.82);

export async function matchFace(
  storedPhotoUrl: string,
  liveSampleBase64: string
): Promise<FaceMatchResult> {
  if (!FACE_MATCH_URL) {
    throw new AppError(
      "FACE_MATCH_NOT_CONFIGURED",
      "Face matching service not configured",
      503
    );
  }

  const res = await fetch(FACE_MATCH_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ storedPhotoUrl, liveSampleBase64 }),
  });

  if (!res.ok) {
    throw new AppError("FACE_MATCH_FAILED", "Face matcher service error", 502);
  }

  const { score } = await res.json();
  return { match: score >= FACE_MATCH_THRESHOLD, score };
}

export function isFaceMatchConfigured(): boolean {
  return Boolean(FACE_MATCH_URL);
}