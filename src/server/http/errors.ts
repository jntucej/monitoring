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

export class BadRequestError  extends AppError { constructor(m: string, code?: string, d?: Record<string, unknown>) { super(code ?? "BAD_REQUEST", m, 400, d); } }
export class UnauthorizedError extends AppError { constructor(m = "Unauthorized", code?: string, d?: Record<string, unknown>) { super(code ?? "UNAUTHORIZED", m, 401, d); } }
export class ForbiddenError   extends AppError { constructor(m = "Forbidden", code?: string, d?: Record<string, unknown>) { super(code ?? "FORBIDDEN", m, 403, d); } }
export class NotFoundError    extends AppError { constructor(m = "Not found", code?: string, d?: Record<string, unknown>) { super(code ?? "NOT_FOUND", m, 404, d); } }
export class ConflictError    extends AppError { constructor(m: string, code?: string, d?: Record<string, unknown>) { super(code ?? "CONFLICT", m, 409, d); } }

export class LockedError extends AppError {
  constructor(m = "Resource is locked", code?: string, d?: Record<string, unknown>) { super(code ?? "LOCKED", m, 423, d); }
}

export class ServiceUnavailableError extends AppError {
  constructor(m = "Service unavailable", code?: string, d?: Record<string, unknown>) { super(code ?? "SERVICE_UNAVAILABLE", m, 503, d); }
}
