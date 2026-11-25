"""model_runtime — M2 OCR sidecar package.

Exposes the `model_runtime.ocr` module so it can be launched with
`python3 -m model_runtime.ocr` (the documented AI_OCR_CMD default).
__all__ is declared so `python3 -m model_runtime.ocr` runs cleanly without the
package `__init__` re-importing the submodule.
"""
__all__ = ["ocr"]

