import { JobStepEntity } from '../entities/JobStep.entity';
import { JobStepStatus } from '../enums/JobStepStatus.enum';
import { JsonValue } from '../types/JsonValue';

export interface CreateJobStepInput {
  readonly jobId: number;
  readonly stepName: string;
  readonly sortOrder: number;
  readonly totalItems: number;
}

export interface UpdateJobStepInput {
  readonly status?: JobStepStatus;
  readonly processedItems?: number;
  readonly totalItems?: number;
  readonly resultJson?: JsonValue | null;
  readonly errorMessage?: string | null;
}

export interface IJobStepRepository {
  createMany(inputs: readonly CreateJobStepInput[]): Promise<readonly JobStepEntity[]>;
  listByJobId(jobId: number): Promise<readonly JobStepEntity[]>;
  markRunning(stepId: number): Promise<JobStepEntity>;
  update(stepId: number, input: UpdateJobStepInput): Promise<JobStepEntity>;
  markCompleted(stepId: number, resultJson: JsonValue | null): Promise<JobStepEntity>;
  markFailed(stepId: number, errorMessage: string): Promise<JobStepEntity>;
}
