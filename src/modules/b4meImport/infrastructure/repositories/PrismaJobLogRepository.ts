import type { PrismaClient } from '@prisma/client';
import type { IJobLogRepository, JobLogRecord } from '../../domain/repositories/IJobLogRepository';

export class PrismaJobLogRepository implements IJobLogRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(
    jobId: number,
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string
  ): Promise<void> {
    await this.prisma.jobLog.create({
      data: {
        jobId,
        level,
        message
      }
    });
  }

  public async findByJobId(jobId: number): Promise<readonly JobLogRecord[]> {
    const rows = await this.prisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' }
    });

    return rows.map((row) => ({
      id: row.id,
      jobId: row.jobId,
      level: row.level,
      message: row.message,
      createdAt: row.createdAt
    }));
  }
}
