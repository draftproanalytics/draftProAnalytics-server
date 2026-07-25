import { JobLogLevel } from '../enums/JobLogLevel.enum';
import { JsonValue } from '../types/JsonValue';

export interface JobLogEntity {
  readonly id: number;
  readonly jobId: number;
  readonly level: JobLogLevel;
  readonly message: string;
  readonly contextJson: JsonValue | null;
  readonly createdAt: Date;
}
