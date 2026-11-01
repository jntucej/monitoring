/**
 * Minimal type declarations for modules that ship without bundled
 * declarations. Add @types/<pkg> to devDependencies and delete the matching
 * block here when the official types are installed.
 */

// nodemailer: the worker uses it from .js (no types needed); the web-side
// src/lib/alerting.ts imports it, so provide just the surface used.
declare module "nodemailer" {
  export interface Transporter {
    sendMail(opts: {
      from?: string;
      to: string;
      subject: string;
      text?: string;
      html?: string;
    }): Promise<{ messageId: string }>;
  }
  export function createTransport(opts: {
    host: string;
    port: number;
    secure?: boolean;
    pool?: boolean;
    auth?: { user: string; pass: string };
  }): Transporter;
}
