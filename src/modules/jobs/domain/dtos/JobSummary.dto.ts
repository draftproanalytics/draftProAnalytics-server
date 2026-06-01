import type { Prisma } from '@prisma/client';

export interface JobSummaryDto {
  readonly id: number;
  readonly type: string;
  readonly status: string;
  readonly payload: Prisma.JsonValue | null;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
  readonly finishedAt: Date | null;
  readonly cancelAt: Date | null;
  readonly cancelReason: string | null;
  readonly resultCode: string | null;
  readonly resultJson: Prisma.JsonValue | null;
  readonly errorMessage: string | null;
  readonly progressPercent: number;
  readonly totalItems: number;
  readonly processedItems: number;
  readonly requestedByPersonId: number | null;
}

export interface JobLogDto {
  readonly id: number;
  readonly jobId: number;
  readonly level: string;
  readonly message: string;
  readonly contextJson: Prisma.JsonValue | null;
  readonly createdAt: Date;
}
