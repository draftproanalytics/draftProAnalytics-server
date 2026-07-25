import { JobStatus } from '../enums/JobStatus.enum';
import { JsonValue } from '../types/JsonValue';

export interface JobEntity {
  readonly id: number;
  readonly type: string;
  readonly status: JobStatus;
  readonly payload: JsonValue | null;
  readonly resultJson: JsonValue | null;
  readonly resultCode: string | null;
  readonly errorMessage: string | null;
  readonly progressPercent: number;
  readonly totalItems: number;
  readonly processedItems: number;
  readonly requestedByPersonId: number | null;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly cancelAt: Date | null;
  readonly cancelReason: string | null;
  //readonly updatedAt: Date;
}
