"""model_runtime package — M2 OCR sidecar + PDF text-layer extraction.

Reads a scanned PDF from stdin, OCRs it with PaddleOCR (PP-OCRv5 mobile) when
available, falls back to Tesseract, and prints JSON to stdout:
    {"text": "...", "engine": "paddle"|"tesseract", "pages": N, "perPageMs": X}

This process is launched per-burst by model-runtime/ocr/index.ts and killed
afterwards, so it holds no resident memory between jobs.
"""
from __future__ import annotations

import io
import json
import os
import shutil
import sys
import tempfile
import time
from dataclasses import dataclass


@dataclass
class OcrResult:
    text: str
    engine: str
    pages: int
    per_page_ms: float


def _render_pdf_pages(pdf_bytes: bytes) -> list[bytes]:
    """Return JPEG/PNG page images. Uses pdf2image (poppler) if present, else PyMuPDF."""
    # PyMuPDF (fitz/pymupdf) is the most self-contained option.
    try:
        import warnings
        warnings.filterwarnings("ignore")
        try:
            import pymupdf as fitz  # type: ignore
        except ImportError:
            import fitz  # type: ignore

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        imgs = []
        for page in doc:
            pix = page.get_pixmap(dpi=200)
            imgs.append(pix.tobytes("png"))
        doc.close()
        return imgs
    except Exception:
        pass

    # Fallback: pdf2image + poppler pdftoppm.
    import pdf2image  # type: ignore

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(pdf_bytes)
        path = tmp.name
    pages = pdf2image.convert_from_path(path, dpi=200)
    out = []
    for p in pages:
        buf = io.BytesIO()
        p.save(buf, format="PNG")
        out.append(buf.getvalue())
    return out


def _ocr_image(image: bytes, engine: list[str]) -> str:
    """Run OCR on one page image. `engine[0]` is set to the backend that
    actually produced text (so callers never misreport which engine ran)."""
    # PaddleOCR (PP-OCRv5 mobile) — preferred, CPU-friendly, Indic support.
    try:
        from paddleocr import PaddleOCR  # type: ignore

        ocr = PaddleOCR(
            use_angle_cls=False,
            lang="ch",
            ocr_version="PP-OCRv5",
            device="cpu",
            show_log=False,
        )
        from PIL import Image  # type: ignore
        import io

        img = Image.open(io.BytesIO(image))
        result = ocr.ocr(img, cls=False)
        parts = []
        # PaddleOCR 3.x returns a list of (line, (conf)); normalize both shapes.
        for row in result or []:
            if isinstance(row, (list, tuple)) and len(row) == 2 and isinstance(row[1], str):
                parts.append(row[1])
            elif isinstance(row, (list, tuple)):
                for cell in row:
                    if isinstance(cell, (list, tuple)) and len(cell) >= 2:
                        parts.append(str(cell[1]))
        text = "\n".join(parts)
        engine[0] = "paddle"
        return text
    except Exception:
        # PaddleOCR unavailable or failed -> fall through to Tesseract.
        pass

    # Tesseract fallback (CPU, English-optimized).
    if shutil.which("tesseract"):
        from PIL import Image  # type: ignore
        import io
        import subprocess

        img = Image.open(io.BytesIO(image))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        proc = subprocess.run(
            ["tesseract", "-", "stdout", "-l", "eng"],
            input=buf.getvalue(),
            capture_output=True,
        )
        if proc.returncode != 0:
            raise RuntimeError(f"tesseract failed: {proc.stderr.decode()[:200]}")
        engine[0] = "tesseract"
        return proc.stdout.decode("utf-8", "ignore")
    raise RuntimeError("no OCR backend available (install PaddleOCR or tesseract)")


def extract_pdf(pdf_bytes: bytes, lang: str = "eng") -> OcrResult:
    t0 = time.perf_counter()
    images = _render_pdf_pages(pdf_bytes)
    if not images:
        raise ValueError("PDF produced no renderable pages")

    texts: list[str] = []
    engine = ["tesseract"]  # default; _ocr_image overwrites with the real backend
    for i, img in enumerate(images):
        text = _ocr_image(img, engine)
        texts.append(text.strip())
        del img  # free the page before the next one (memory protection)

    total_ms = time.perf_counter() - t0
    return OcrResult(
        text="\n\n".join(t for t in texts if t),
        engine=engine[0],
        pages=len(images),
        per_page_ms=round(total_ms / max(1, len(images)) * 1000, 1),
    )


def main() -> int:
    pdf = sys.stdin.buffer.read()
    if not pdf:
        print(json.dumps({"error": "empty input"}))
        return 1
    args = sys.argv[1:]
    lang = "eng"
    if "--lang" in args:
        lang = args[args.index("--lang") + 1]
    try:
        res = extract_pdf(pdf, lang)
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"error": str(exc)}))
        return 2
    # Emit ONLY the result; drop any diagnostic lines the OCR libs emitted.
    payload = json.dumps(res.__dict__)
    sys.stdout.write(payload + "\n")
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
