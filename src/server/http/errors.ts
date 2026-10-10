export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class BadRequestError  extends AppError { constructor(m: string, d?: any) { super("BAD_REQUEST", m, 400, d); } }
export class UnauthorizedError extends AppError { constructor(m = "Unauthorized") { super("UNAUTHORIZED", m, 401); } }
export class ForbiddenError   extends AppError { constructor(m = "Forbidden")    { super("FORBIDDEN", m, 403); } }
export class NotFoundError    extends AppError { constructor(m = "Not found")    { super("NOT_FOUND", m, 404); } }
export class ConflictError    extends AppError { constructor(m: string)          { super("CONFLICT", m, 409); } }

export class LockedError extends AppError {
  constructor(m = "Resource is locked") { super("LOCKED", m, 423); }
}
