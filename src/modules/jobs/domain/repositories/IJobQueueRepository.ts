import type { Job_status, Prisma } from '@prisma/client';
import type { DpaJobType } from '../enums/DpaJobType';
import type { JobLogDto, JobSummaryDto } from '../dtos/JobSummary.dto';

export interface CreateQueuedJobCommand {
  readonly type: DpaJobType;
  readonly payload: Prisma.InputJsonValue;
  readonly requestedByPersonId?: number;
}

export interface CreateJobStepCommand {
  readonly jobId: number;
  readonly stepName: string;
  readonly sortOrder: number;
  readonly totalItems?: number;
}

export interface CompleteJobCommand {
  readonly jobId: number;
  readonly resultCode: string;
  readonly resultJson: Prisma.InputJsonValue;
}

export interface FailJobCommand {
  readonly jobId: number;
  readonly errorMessage: string;
  readonly resultJson?: Prisma.InputJsonValue;
}

export interface UpdateJobProgressCommand {
  readonly jobId: number;
  readonly progressPercent: number;
  readonly totalItems: number;
  readonly processedItems: number;
}

export interface AppendJobLogCommand {
  readonly jobId: number;
  readonly level: 'info' | 'warn' | 'error';
  readonly message: string;
  readonly contextJson?: Prisma.InputJsonValue;
}

export interface ListJobsQuery {
  readonly status?: Job_status;
  readonly type?: string;
  readonly limit: number;
}

export interface IJobQueueRepository {
  enqueueJob(command: CreateQueuedJobCommand): Promise<JobSummaryDto>;
  listJobs(query: ListJobsQuery): Promise<readonly JobSummaryDto[]>;
  readJob(jobId: number): Promise<JobSummaryDto | null>;
  readJobLogs(jobId: number): Promise<readonly JobLogDto[]>;
  claimNextExecutableJob(executableTypes: readonly string[]): Promise<JobSummaryDto | null>;
  markJobRunning(jobId: number): Promise<void>;
  completeJob(command: CompleteJobCommand): Promise<void>;
  failJob(command: FailJobCommand): Promise<void>;
  cancelJob(jobId: number, reason: string): Promise<void>;
  updateJobProgress(command: UpdateJobProgressCommand): Promise<void>;
  appendJobLog(command: AppendJobLogCommand): Promise<void>;
  createJobStep(command: CreateJobStepCommand): Promise<number>;
  markStepRunning(stepId: number): Promise<void>;
  completeStep(stepId: number, resultJson?: Prisma.InputJsonValue): Promise<void>;
  failStep(stepId: number, errorMessage: string): Promise<void>;
}
