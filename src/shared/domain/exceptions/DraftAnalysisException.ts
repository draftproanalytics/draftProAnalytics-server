// src/shared/domain/exceptions/DraftAnalysisException.ts
export class DraftAnalysisException extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DRAFT_ANALYSIS_ERROR'
  ) {
    super(message);
    this.name = 'DraftAnalysisException';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PatternNotFoundException extends DraftAnalysisException {
  constructor(teamId: string) {
    super(
      `Draft pattern not found for team: ${teamId}`,
      'PATTERN_NOT_FOUND'
    );
    this.name = 'PatternNotFoundException';
  }
}

export class InvalidDraftPickException extends DraftAnalysisException {
  constructor(message: string) {
    super(message, 'INVALID_DRAFT_PICK');
    this.name = 'InvalidDraftPickException';
  }
}