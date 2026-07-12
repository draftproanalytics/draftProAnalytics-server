import type { B4MeImportJobPayload, B4MeImportResultSummary } from '../contracts/B4MeImportJobPayload';

export interface JobRecord {
  readonly id: number;
  readonly type: string;
  readonly status: string;
  readonly payload: B4MeImportJobPayload | null;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly resultCode: string | null;
  readonly resultJson: B4MeImportResultSummary | Record<string, unknown> | null;
}

export interface IJobRepository {
  create(type: string, payload: B4MeImportJobPayload): Promise<JobRecord>;
  findById(jobId: number): Promise<JobRecord | null>;
  markStarted(jobId: number): Promise<void>;
  markCompleted(
    jobId: number,
    resultCode: string,
    result: B4MeImportResultSummary
  ): Promise<void>;
  markFailed(
    jobId: number,
    resultCode: string,
    errorMessage: string
  ): Promise<void>;
}
