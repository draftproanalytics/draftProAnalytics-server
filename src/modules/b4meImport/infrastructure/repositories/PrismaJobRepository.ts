import type { Prisma, PrismaClient, Job_status } from '@prisma/client';
import type {
  B4MeImportJobPayload,
  B4MeImportResultSummary
} from '../../domain/contracts/B4MeImportJobPayload';
import type { IJobRepository, JobRecord } from '../../domain/repositories/IJobRepository';

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function parseJsonObject<T>(value: Prisma.JsonValue | null): T | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as T;
}

export class PrismaJobRepository implements IJobRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(type: string, payload: B4MeImportJobPayload): Promise<JobRecord> {
    const row = await this.prisma.job.create({
      data: {
        type,
        payload: toInputJson(payload),
        status: 'pending' as Job_status
      }
    });

    return this.mapRow(row);
  }

  public async findById(jobId: number): Promise<JobRecord | null> {
    const row = await this.prisma.job.findUnique({
      where: { id: jobId }
    });

    return row === null ? null : this.mapRow(row);
  }

  public async markStarted(jobId: number): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'in_progress' as Job_status,
        startedAt: new Date()
      }
    });
  }

  public async markCompleted(
    jobId: number,
    resultCode: string,
    result: B4MeImportResultSummary
  ): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'completed' as Job_status,
        finishedAt: new Date(),
        resultCode,
        resultJson: toInputJson(result)
      }
    });
  }

  public async markFailed(
    jobId: number,
    resultCode: string,
    errorMessage: string
  ): Promise<void> {
    await this.prisma.job.update({
      where: { id: jobId },
      data: {
        status: 'failed' as Job_status,
        finishedAt: new Date(),
        resultCode,
        resultJson: toInputJson({
          error: errorMessage
        })
      }
    });
  }

  private mapRow(row: {
    id: number;
    type: string;
    status: Job_status;
    payload: Prisma.JsonValue | null;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    resultCode: string | null;
    resultJson: Prisma.JsonValue | null;
  }): JobRecord {
    return {
      id: row.id,
      type: row.type,
      status: String(row.status),
      payload: parseJsonObject<B4MeImportJobPayload>(row.payload),
      createdAt: row.createdAt,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      resultCode: row.resultCode,
      resultJson: parseJsonObject<B4MeImportResultSummary | Record<string, unknown>>(row.resultJson)
    };
  }
}
