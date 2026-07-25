import { JobStepStatus } from '../enums/JobStepStatus.enum';
import { JsonValue } from '../types/JsonValue';

export interface JobStepEntity {
  readonly id: number;
  readonly jobId: number;
  readonly stepName: string;
  readonly status: JobStepStatus;
  readonly sortOrder: number;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly totalItems: number;
  readonly processedItems: number;
  readonly resultJson: JsonValue | null;
  readonly errorMessage: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
