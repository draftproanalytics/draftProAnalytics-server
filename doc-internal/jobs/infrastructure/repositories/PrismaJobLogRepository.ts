import { Prisma, PrismaClient } from '@prisma/client';
import { JobLogEntity } from '../../domain/entities/JobLog.entity';
import { AppendJobLogInput, IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import { PrismaJobMapper } from '../mappers/PrismaJobMapper';

export class PrismaJobLogRepository implements IJobLogRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async append(input: AppendJobLogInput): Promise<JobLogEntity> {
    const row = await this.prisma.jobLog.create({
      data: {
        jobId: input.jobId,
        level: input.level,
        message: input.message,
        contextJson: input.contextJson === null ? Prisma.JsonNull : input.contextJson as Prisma.InputJsonValue,
      },
    });
    return PrismaJobMapper.toLogEntity(row);
  }

  public async listByJobId(jobId: number): Promise<readonly JobLogEntity[]> {
    const rows = await this.prisma.jobLog.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(PrismaJobMapper.toLogEntity);
  }
}
