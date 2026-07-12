import { JobLogEntity } from '../entities/JobLog.entity';
import { JobLogLevel } from '../enums/JobLogLevel.enum';
import { JsonValue } from '../types/JsonValue';

export interface AppendJobLogInput {
  readonly jobId: number;
  readonly level: JobLogLevel;
  readonly message: string;
  readonly contextJson: JsonValue | null;
}

export interface IJobLogRepository {
  append(input: AppendJobLogInput): Promise<JobLogEntity>;
  listByJobId(jobId: number): Promise<readonly JobLogEntity[]>;
}
