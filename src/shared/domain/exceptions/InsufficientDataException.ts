// src/shared/domain/exceptions/InsufficientDataException.ts
export class InsufficientDataException extends Error {
  constructor(
    message: string,
    public readonly requiredDataPoints: number,
    public readonly actualDataPoints: number
  ) {
    super(message);
    this.name = 'InsufficientDataException';
    Error.captureStackTrace(this, this.constructor);
  }
}