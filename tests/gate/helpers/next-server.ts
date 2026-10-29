// tests/gate/helpers/next-server.ts
export class NextRequest extends Request {
  nextUrl: URL;
  cookies: { get: (name: string) => { value: string } | undefined };
  geo?: { latitude?: string; longitude?: string; city?: string };

  constructor(input: string | URL, init?: RequestInit & {
    cookies?: Record<string, string>;
    geo?: { latitude?: string; longitude?: string };
  }) {
    super(input, init);
    this.nextUrl = new URL(typeof input === 'string' ? input : input.toString());
    const cookieMap = init?.cookies ?? {};
    this.cookies = {
      get: (name: string) =>
        name in cookieMap ? { value: cookieMap[name] } : undefined,
    };
    if (init?.geo) this.geo = init.geo;
  }
}

export class NextResponse extends Response {
  static json(body: unknown, init?: ResponseInit): NextResponse {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  }

  static next(init?: ResponseInit): NextResponse { return new NextResponse(null, init); }
}
