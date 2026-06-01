import { JobLogLevel } from '../../domain/enums/JobLogLevel.enum';
import { JobStatus } from '../../domain/enums/JobStatus.enum';
import { JobStepStatus } from '../../domain/enums/JobStepStatus.enum';
import { JsonValue } from '../../domain/types/JsonValue';

export interface JobListItemDto {
  readonly id: string;
  readonly type: string;
  readonly status: JobStatus;
  readonly progressPercent: number;
  readonly totalItems: number;
  readonly processedItems: number;
  readonly resultCode: string | null;
  readonly errorMessage: string | null;
  readonly createdAt: string;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
}

export interface JobDetailDto extends JobListItemDto {
  readonly payload: JsonValue | null;
  readonly resultJson: JsonValue | null;
  readonly requestedByPersonId: number | null;
  readonly cancelAt: string | null;
  readonly cancelReason: string | null;
  //readonly updatedAt: string;
}

export interface JobLogDto {
  readonly id: string;
  readonly jobId: string;
  readonly level: JobLogLevel;
  readonly message: string;
  readonly contextJson: JsonValue | null;
  readonly createdAt: string;
}

export interface JobStepDto {
  readonly id: string;
  readonly jobId: string;
  readonly stepName: string;
  readonly status: JobStepStatus;
  readonly sortOrder: number;
  readonly totalItems: number;
  readonly processedItems: number;
  readonly resultJson: JsonValue | null;
  readonly errorMessage: string | null;
  readonly startedAt: string | null;
  readonly finishedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ListJobsResponseDto {
  readonly items: readonly JobListItemDto[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}
