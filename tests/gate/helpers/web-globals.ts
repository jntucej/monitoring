// tests/gate/helpers/web-globals.ts
// SECOND-stage shim: web-fetch globals (Request / Response / Headers / FormData /
// fetch) from undici. MUST run AFTER web-globals-codec.ts, because undici's own
// load needs TextEncoder (provided by the codec shim). Installs each global only
// if missing — never clobbering a real one. Test-env shim, not a prod change.
import {
  Request as URequest,
  Response as UResponse,
  Headers as UHeaders,
  FormData as UFormData,
} from 'undici';

const g = globalThis as Record<string, unknown>;
if (typeof g.Request !== 'function') g.Request = URequest;
if (typeof g.Response !== 'function') g.Response = UResponse;
if (typeof g.Headers !== 'function') g.Headers = UHeaders;
if (typeof g.FormData !== 'function') g.FormData = UFormData;
if (typeof g.fetch !== 'function') {
  const undici = require('undici');
  g.fetch = undici.fetch;
}

export {};
