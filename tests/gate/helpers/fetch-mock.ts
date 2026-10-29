// tests/gate/helpers/fetch-mock.ts
type Handler = (req: { url: string; method: string; body?: any }) =>
  | { status: number; body: any }
  | Promise<{ status: number; body: any }>;

const routes = new Map<string, Handler>();
let fallbackHandler: Handler | null = null;

export function route(method: string, path: string | RegExp, handler: Handler) {
  if (typeof path === 'string') {
    routes.set(`${method.toUpperCase()} ${path}`, handler);
  } else {
    // for regex or dynamic paths, store with regex pattern
    routes.set(`${method.toUpperCase()} REGEX:${path.source}`, handler);
  }
}

export function setFallback(handler: Handler) { fallbackHandler = handler; }
export function resetFetchMock() { routes.clear(); fallbackHandler = null; }

export function installFetchMock() {
  (global as any).fetch = jest.fn(async (input: any, init: any = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    const method = (init.method ?? 'GET').toUpperCase();
    const body = init.body && typeof init.body === 'string' ? (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : init.body;
    // try exact then by pathname
    const key = `${method} ${url}`;
    const pathKey = `${method} ${new URL(url, 'http://localhost:3000').pathname}`;
    let handler = routes.get(key) ?? routes.get(pathKey);

    if (!handler) {
      for (const [rKey, rHandler] of routes.entries()) {
        if (rKey.startsWith(`${method} REGEX:`)) {
          const pattern = new RegExp(rKey.slice(`${method} REGEX:`.length));
          if (pattern.test(url) || pattern.test(pathKey)) {
            handler = rHandler;
            break;
          }
        }
      }
    }

    handler = handler ?? fallbackHandler;
    if (!handler) throw new Error(`No fetch handler for ${key}`);
    const { status, body: resBody } = await handler({ url, method, body });
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => resBody,
      text: async () => JSON.stringify(resBody),
    };
  });
}
