export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, "CONFLICT");
  }
}

export class AssignmentConflictError extends ConflictError {
  constructor(
    message = "Staff member is no longer available for this time slot",
  ) {
    super(message);
    this.code = "ASSIGNMENT_CONFLICT";
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Cannot transition from ${from} to ${to}`, 400, "INVALID_TRANSITION");
  }
}