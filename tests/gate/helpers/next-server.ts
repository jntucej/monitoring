// tests/gate/helpers/next-server.ts
export class NextRequest extends Request {
  nextUrl: URL;
  cookies: {
    get: (name: string) => { value: string } | undefined;
    getAll: () => Array<{ name: string; value: string }>;
  };
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
      getAll: () =>
        Object.entries(cookieMap).map(([name, value]) => ({ name, value })),
    };
    if (init?.geo) this.geo = init.geo;
  }
}

export class NextResponse extends Response {
  cookies: {
    set: (name: string, value: string, options?: any) => void;
    delete: (name: string) => void;
  };

  private _setCookies: string[] = [];

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    super(body, init);
    const self = this;
    this.cookies = {
      set: (name: string, value: string, options: any = {}) => {
        let cookieStr = `${name}=${value}`;
        if (options.maxAge !== undefined) cookieStr += `; Max-Age=${options.maxAge}`;
        if (options.httpOnly) cookieStr += '; HttpOnly';
        if (options.secure) cookieStr += '; Secure';
        if (options.path) cookieStr += `; Path=${options.path}`;
        if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`;
        self._setCookies.push(cookieStr);
        self.headers.append('set-cookie', cookieStr);
      },
      delete: (name: string) => {
        const cookieStr = `${name}=; Max-Age=0; Path=/`;
        self._setCookies.push(cookieStr);
        self.headers.append('set-cookie', cookieStr);
      },
    };
  }

  static json(body: unknown, init?: ResponseInit): NextResponse {
    return new NextResponse(JSON.stringify(body), {
      ...init,
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  }

  static next(init?: ResponseInit): NextResponse { return new NextResponse(null, init); }
}
