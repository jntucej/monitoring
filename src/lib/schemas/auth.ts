// src/lib/schemas/auth.ts
// U5: Zod schemas for the high-risk auth routes.
//
// Only field presence / type / bounded length are asserted. The actual
// credential check happens in the route (bcrypt / DB), so a schema failure
// here means "malformed input", never "wrong password" — no oracle.

import { z } from "zod";

// Login: accepts either `login` or `email` as the identifier (the route merges
// `login || email`), plus `password`. Bounded so a 50 MB identifier string
// can't blow up the downstream DB query.
export const LoginSchema = z
  .object({
    login: z.string().max(320).optional(),
    email: z.string().max(320).optional(),
    password: z.string().max(512).optional(),
  })
  .refine((b) => (b.login ?? b.email ?? "").length > 0 || (b.password ?? "").length > 0, {
    message: "Login identifier/email and password are required.",
  })
  .refine((b) => (b.login ?? b.email ?? "").length > 0, {
    message: "Login identifier or email is required.",
    path: ["login"],
  })
  .refine((b) => (b.password ?? "").length > 0, {
    message: "Password is required.",
    path: ["password"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;

// Change-password: legacy clients may send camelCase OR snake_case keys. The
// route reads `currentPassword ?? current_password ?? oldPassword`. We model
// that union here so validation passes for any accepted spelling, while the
// route keeps reading exactly the same fields it always did.
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(512).optional(),
    current_password: z.string().min(1).max(512).optional(),
    oldPassword: z.string().min(1).max(512).optional(),
    newPassword: z.string().min(1).max(512).optional(),
    new_password: z.string().min(1).max(512).optional(),
    password: z.string().min(1).max(512).optional(),
  })
  .refine(
    (b) =>
      Boolean(b.currentPassword ?? b.current_password ?? b.oldPassword),
    { message: "Current password is required.", path: ["currentPassword"] }
  )
  .refine(
    (b) => Boolean(b.newPassword ?? b.new_password ?? b.password),
    { message: "New password is required.", path: ["newPassword"] }
  );

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
