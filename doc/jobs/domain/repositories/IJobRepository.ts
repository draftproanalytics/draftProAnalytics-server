import { JobEntity } from '../entities/Job.entity';
import { JobStatus } from '../enums/JobStatus.enum';
import { JsonValue } from '../types/JsonValue';

export interface CreateJobInput {
  readonly type: string;
  readonly payload: JsonValue | null;
  readonly requestedByPersonId: number | null;
}

export interface ListJobsQuery {
  readonly type?: string;
  readonly status?: JobStatus;
  readonly page: number;
  readonly pageSize: number;
}

export interface ListJobsResult {
  readonly items: readonly JobEntity[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface CompleteJobInput {
  readonly resultCode: string;
  readonly resultJson: JsonValue | null;
}

export interface FailJobInput {
  readonly resultCode: string;
  readonly errorMessage: string;
  readonly resultJson: JsonValue | null;
}

export interface UpdateJobProgressInput {
  readonly progressPercent: number;
  readonly totalItems: number;
  readonly processedItems: number;
}

export interface IJobRepository {
  create(input: CreateJobInput): Promise<JobEntity>;
  findById(id: number): Promise<JobEntity | null>;
  list(query: ListJobsQuery): Promise<ListJobsResult>;
  markRunning(id: number): Promise<JobEntity>;
  markCompleted(id: number, input: CompleteJobInput): Promise<JobEntity>;
  markFailed(id: number, input: FailJobInput): Promise<JobEntity>;
  markCanceled(id: number, cancelReason: string): Promise<JobEntity>;
  updateProgress(id: number, input: UpdateJobProgressInput): Promise<JobEntity>;
}
