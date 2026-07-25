import { JobStep_status, Prisma, PrismaClient } from '@prisma/client';
import { JobStepEntity } from '../../domain/entities/JobStep.entity';
import { JobStepStatus } from '../../domain/enums/JobStepStatus.enum';
import {
  CreateJobStepInput,
  IJobStepRepository,
  UpdateJobStepInput,
} from '../../domain/repositories/IJobStepRepository';
import { JsonValue } from '../../domain/types/JsonValue';
import { PrismaJobMapper } from '../mappers/PrismaJobMapper';

export class PrismaJobStepRepository implements IJobStepRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async createMany(inputs: readonly CreateJobStepInput[]): Promise<readonly JobStepEntity[]> {
    await this.prisma.jobStep.createMany({
      data: inputs.map((input) => ({
        jobId: input.jobId,
        stepName: input.stepName,
        sortOrder: input.sortOrder,
        totalItems: input.totalItems,
      })),
    });

    return this.listByJobId(inputs[0]?.jobId ?? 0);
  }

  public async listByJobId(jobId: number): Promise<readonly JobStepEntity[]> {
    const rows = await this.prisma.jobStep.findMany({
      where: { jobId },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map(PrismaJobMapper.toStepEntity);
  }

  public async markRunning(stepId: number): Promise<JobStepEntity> {
    const row = await this.prisma.jobStep.update({
      where: { id: stepId },
      data: { status: JobStepStatus.Running as JobStep_status, startedAt: new Date() },
    });
    return PrismaJobMapper.toStepEntity(row);
  }

  public async update(stepId: number, input: UpdateJobStepInput): Promise<JobStepEntity> {
    const row = await this.prisma.jobStep.update({
      where: { id: stepId },
      data: {
        ...(input.status === undefined ? {} : { status: input.status as JobStep_status }),
        ...(input.processedItems === undefined ? {} : { processedItems: input.processedItems }),
        ...(input.totalItems === undefined ? {} : { totalItems: input.totalItems }),
        ...(input.resultJson === undefined ? {} : { resultJson: input.resultJson === null ? Prisma.JsonNull : input.resultJson as Prisma.InputJsonValue }),
        ...(input.errorMessage === undefined ? {} : { errorMessage: input.errorMessage }),
      },
    });
    return PrismaJobMapper.toStepEntity(row);
  }

  public async markCompleted(stepId: number, resultJson: JsonValue | null): Promise<JobStepEntity> {
    const row = await this.prisma.jobStep.update({
      where: { id: stepId },
      data: {
        status: JobStepStatus.Completed as JobStep_status,
        finishedAt: new Date(),
        resultJson: resultJson === null ? Prisma.JsonNull : resultJson as Prisma.InputJsonValue,
      },
    });
    return PrismaJobMapper.toStepEntity(row);
  }

  public async markFailed(stepId: number, errorMessage: string): Promise<JobStepEntity> {
    const row = await this.prisma.jobStep.update({
      where: { id: stepId },
      data: {
        status: JobStepStatus.Failed as JobStep_status,
        finishedAt: new Date(),
        errorMessage,
      },
    });
    return PrismaJobMapper.toStepEntity(row);
  }
}
