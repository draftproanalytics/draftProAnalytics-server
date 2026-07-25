import { JobEntity } from '../../domain/entities/Job.entity';

export interface JobRunResult {
  readonly resultCode: string;
  readonly resultJson: Record<string, unknown> | null;
}

export interface IJobHandler {
  canHandle(jobType: string): boolean;
  execute(job: JobEntity): Promise<JobRunResult>;
}
