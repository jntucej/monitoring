import { BadRequestError } from "@/server/http/errors";

/**
 * Magic-byte signature sniffing for uploaded attachments.
 *
 * The client's Content-Type and filename extension are attacker-controlled
 * and are NOT trusted for the stored extension. The extension is derived
 * from the file's actual bytes. SVG is deliberately absent from the
 * allowlist: SVG is XSS-capable when served inline and must never be
 * accepted, regardless of the claimed Content-Type.
 *
 * Allowed types: pdf, jpg, png, webp, heic, mp4, webm. Anything else is
 * rejected with an unsupported-type error — callers map that to 415/400.
 */

export type SniffedExt =
  | "pdf"
  | "jpg"
  | "png"
  | "webp"
  | "heic"
  | "mp4"
  | "webm";

/** Map a sniffed extension to the exact Content-Type it must be served as. */
export const SNIFFED_CONTENT_TYPES: Record<SniffedExt, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  mp4: "video/mp4",
  webm: "video/webm",
};

const HEIC_BRANDS = ["heic", "heix", "hevc", "mif1", "mif2", "msf1", "msf2"];

function unsupportedFile(errMsg: string): never {
  // BadRequestError constructor signature: (message, code?, details?)
  // — pass the code and status through the AppError base properly.
  const e = new BadRequestError(errMsg, "UNSUPPORTED_FILE_TYPE");
  e.status = 415;
  return e;
}

export function sniffExtension(buf: Buffer): SniffedExt {
  if (buf.length < 12) {
    throw unsupportedFile("file too small");
  }

  // %PDF
  if (
    buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46
  ) {
    return "pdf";
  }

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "jpg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return "png";
  }

  // RIFF container: WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 &&
    buf[2] === 0x46 && buf[3] === 0x46 &&
    buf.slice(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  // ISO-BMFF (HEIC / MP4 / WebM) — read the ftyp brand at offset 4.
  if (
    buf[4] === 0x66 && buf[5] === 0x74 &&
    buf[6] === 0x79 && buf[7] === 0x70 // "ftyp"
  ) {
    const brand = buf.slice(8, 12).toString("ascii");
    if (HEIC_BRANDS.includes(brand)) return "heic";
    if (brand === "isom" || brand === "mp41" || brand === "mp42" || brand === "M4V ") {
      return "mp4";
    }
    if (brand === "webm" || brand === "matr") return "webm";
  }

  throw unsupportedFile("unsupported file type");
}
