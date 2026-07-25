import { Job_status, Prisma, PrismaClient } from '@prisma/client';
import { JobEntity } from '../../domain/entities/Job.entity';
import { JobStatus } from '../../domain/enums/JobStatus.enum';
import {
  CompleteJobInput,
  CreateJobInput,
  FailJobInput,
  IJobRepository,
  ListJobsQuery,
  ListJobsResult,
  UpdateJobProgressInput,
} from '../../domain/repositories/IJobRepository';
import { PrismaJobMapper } from '../mappers/PrismaJobMapper';

const toPrismaJson = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull => {
  if (value === null || value === undefined) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

export class PrismaJobRepository implements IJobRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async create(input: CreateJobInput): Promise<JobEntity> {
    const row = await this.prisma.job.create({
      data: {
        type: input.type,
        payload: input.payload === null ? Prisma.JsonNull : input.payload as Prisma.InputJsonValue,
        requestedByPersonId: input.requestedByPersonId,
      },
    });
    return PrismaJobMapper.toJobEntity(row);
  }

  public async findById(id: number): Promise<JobEntity | null> {
    const row = await this.prisma.job.findUnique({ where: { id } });
    return row === null ? null : PrismaJobMapper.toJobEntity(row);
  }

  public async list(query: ListJobsQuery): Promise<ListJobsResult> {
    const where: Prisma.JobWhereInput = {
      ...(query.type === undefined ? {} : { type: query.type }),
      ...(query.status === undefined ? {} : { status: query.status as Job_status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      items: items.map(PrismaJobMapper.toJobEntity),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  public async markRunning(id: number): Promise<JobEntity> {
    const row = await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.Running as Job_status,
        startedAt: new Date(),
        progressPercent: 0,
      },
    });
    return PrismaJobMapper.toJobEntity(row);
  }

  public async markCompleted(id: number, input: CompleteJobInput): Promise<JobEntity> {
    const row = await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.Completed as Job_status,
        finishedAt: new Date(),
        progressPercent: 100,
        resultCode: input.resultCode,
        resultJson: toPrismaJson(input.resultJson),
      },
    });
    return PrismaJobMapper.toJobEntity(row);
  }

  public async markFailed(id: number, input: FailJobInput): Promise<JobEntity> {
    const row = await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.Failed as Job_status,
        finishedAt: new Date(),
        resultCode: input.resultCode,
        errorMessage: input.errorMessage,
        resultJson: toPrismaJson(input.resultJson),
      },
    });
    return PrismaJobMapper.toJobEntity(row);
  }

  public async markCanceled(id: number, cancelReason: string): Promise<JobEntity> {
    const now = new Date();
    const row = await this.prisma.job.update({
      where: { id },
      data: {
        status: JobStatus.Canceled as Job_status,
        cancelAt: now,
        finishedAt: now,
        cancelReason,
      },
    });
    return PrismaJobMapper.toJobEntity(row);
  }

  public async updateProgress(id: number, input: UpdateJobProgressInput): Promise<JobEntity> {
    const row = await this.prisma.job.update({
      where: { id },
      data: {
        progressPercent: input.progressPercent,
        totalItems: input.totalItems,
        processedItems: input.processedItems,
      },
    });
    return PrismaJobMapper.toJobEntity(row);
  }
}
