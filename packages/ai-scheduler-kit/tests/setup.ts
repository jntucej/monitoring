import { vi, expect } from 'vitest';

// Extend vitest/chai with testing-library matchers manually
expect.extend({
  toBeInTheDocument(received: any) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected element to ${pass ? 'not' : ''} be in the document`,
    };
  },
  toHaveClass(received: any, className: string) {
    const pass = received.classList?.contains(className);
    return {
      pass,
      message: () => `expected element to ${pass ? 'not' : ''} have class "${className}"`,
    };
  },
});

// Polyfill ResizeObserver for jsdom with proper dimensions
class ResizeObserverPolyfill {
  callback: ResizeObserverCallback;
  dimensions: Map<Element, { width: number; height: number }> = new Map();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    const dims = this.dimensions.get(target) || { width: 800, height: 600 };
    this.callback([{ target, contentRect: { width: dims.width, height: dims.height } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }

  unobserve(_target: Element) {}

  disconnect() {
    this.dimensions.clear();
  }

  setDimensions(target: Element, width: number, height: number) {
    this.dimensions.set(target, { width, height });
  }
}

if (typeof (globalThis as any).ResizeObserver === 'undefined') {
  (globalThis as any).ResizeObserver = ResizeObserverPolyfill;
}

// Mock useSchedulerData hook to return not loading
vi.mock('../src/hooks/useSchedulerData', () => ({
  useSchedulerData: () => ({
    loading: false,
    jobs: [],
    resources: [],
    conflicts: [],
    fetchJobs: vi.fn(),
    fetchResources: vi.fn(),
    fetchConflicts: vi.fn(),
  }),
}));

export {};
