// tests/gate/jest.setup.ui.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';

process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';

// In jsdom environment, copy node's native Request, Response, Headers from globalThis
const g = globalThis as any;
if (typeof g.Request === 'undefined' && typeof (global as any).Request !== 'undefined') {
  g.Request = (global as any).Request;
  g.Response = (global as any).Response;
  g.Headers = (global as any).Headers;
}

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
