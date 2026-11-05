// Native BarcodeDetector API (Chrome/Edge) — used by the operator Scanner,
// which falls back to a manual ~15fps tick when the browser lacks it.
// Kept in its own global script file (no `export` at bottom) so it truly
// augments `window` / `HTMLVideoElement` for every module in the project,
// instead of the module-scoped `declare global` inside modules.d.ts.
interface BarcodeDetectorOptions {
  formats: string[];
}
interface BarcodeDetectorResult {
  rawValue: string;
  format?: string;
}
class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(
    source: ImageBitmap | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): Promise<BarcodeDetectorResult[]>;
  static getSupportedFormats(): Promise<string[]>;
}
interface Window {
  BarcodeDetector: typeof BarcodeDetector | undefined;
}
interface HTMLVideoElement {
  requestVideoFrameCallback(callback: () => void): number;
}
