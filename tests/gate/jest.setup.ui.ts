// tests/gate/jest.setup.ui.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// In jsdom environment, Request/Response/Headers/FormData/TextEncoder are NOT
// available (jsdom has no fetch / codecs). Jest's global doesn't inherit Node's,
// so the "copy from globalThis" trick is a no-op. Load the shared shims in order
// (codecs first so undici can load, then fetch). Installs each global only if
// missing. Test-env shim, not prod.
import './helpers/web-globals-codec';
import './helpers/web-globals';

afterEach(() => cleanup());

// Silence noisy React act warnings from framer-motion's mocked children.
const origError = console.error;
console.error = (...args: any[]) => {
  const msg = String(args[0] ?? '');
  if (msg.includes('not wrapped in act')) return;
  origError(...args);
};

// matchMedia is used by useBreakpoint / useMediaQuery.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener(){}, removeListener(){},
    addEventListener(){}, removeEventListener(){},
    dispatchEvent: jest.fn(),
  })),
});

// ResizeObserver used by some chart / layout components.
class ResizeObserverStub {
  observe(){} unobserve(){} disconnect(){}
}
(global as any).ResizeObserver = ResizeObserverStub;
