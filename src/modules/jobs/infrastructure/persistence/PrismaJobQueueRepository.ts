import type { Job_status, Prisma, PrismaClient } from '@prisma/client';
import type { JobLogDto, JobSummaryDto } from '../../domain/dtos/JobSummary.dto';
import type {
  AppendJobLogCommand,
  CompleteJobCommand,
  CreateJobStepCommand,
  CreateQueuedJobCommand,
  FailJobCommand,
  IJobQueueRepository,
  ListJobsQuery,
  UpdateJobProgressCommand,
} from '../../domain/repositories/IJobQueueRepository';

const mapJob = (job: {
  id: number;
  type: string;
  payload: Prisma.JsonValue | null;
  status: Job_status;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  cancelAt: Date | null;
  cancelReason: string | null;
  resultCode: string | null;
  resultJson: Prisma.JsonValue | null;
  errorMessage: string | null;
  progressPercent: number;
  totalItems: number;
  processedItems: number;
  requestedByPersonId: number | null;
}): JobSummaryDto => ({
  id: job.id,
  type: job.type,
  payload: job.payload,
  status: job.status,
  createdAt: job.createdAt,
  startedAt: job.startedAt,
  finishedAt: job.finishedAt,
  cancelAt: job.cancelAt,
  cancelReason: job.cancelReason,
  resultCode: job.resultCode,
  resultJson: job.resultJson,
  errorMessage: job.errorMessage,
  progressPercent: job.progressPercent,
  totalItems: job.totalItems,
  processedItems: job.processedItems,
  requestedByPersonId: job.requestedByPersonId,
});

export class PrismaJobQueueRepository implements IJobQueueRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async enqueueJob(command: CreateQueuedJobCommand): Promise<JobSummaryDto> {
    const job = await this.prisma.job.create({
      data: {
        type: command.type,
        payload: command.payload,
        status: 'pending',
        requestedByPersonId: command.requestedByPersonId,
      },
    });

    await this.appendJobLog({
      jobId: job.id,
      level: 'info',
      message: `Queued job ${command.type}.`,
      contextJson: command.payload,
    });

    return mapJob(job);
  }

  public async listJobs(query: ListJobsQuery): Promise<readonly JobSummaryDto[]> {
    const jobs = await this.prisma.job.findMany({
      where: {
        status: query.status,
        type: query.type,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: query.limit,
    });

    return jobs.map(mapJob);
  }

  public async readJob(jobId: number): Promise<JobSummaryDto | null> {
    const job = await this.prisma.job.findUnique({
      where: {
        id: jobId,
      },
    });

    return job ? mapJob(job) : null;
  }

  public async readJobLogs(jobId: number): Promise<readonly JobLogDto[]> {
    return this.prisma.jobLog.findMany({
      where: {
        jobId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  public async claimNextExecutableJob(executableTypes: readonly string[]): Promise<JobSummaryDto | null> {
    const pendingJob = await this.prisma.job.findFirst({
      where: {
        status: 'pending',
        type: {
          in: [...executableTypes],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (!pendingJob) {
      return null;
    }

    const claimResult = await this.prisma.job.updateMany({
      where: {
        id: pendingJob.id,
        status: 'pending',
      },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });

    if (claimResult.count !== 1) {
      return null;
    }

    const claimedJob = await this.readJob(pendingJob.id);
    return claimedJob;
  }

  public async markJobRunning(jobId: number): Promise<void> {
    await this.prisma.job.update({
      where: {
        id: jobId,
      },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });
  }

  public async completeJob(command: CompleteJobCommand): Promise<void> {
    await this.prisma.job.update({
      where: {
        id: command.jobId,
      },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        progressPercent: 100,
        resultCode: command.resultCode,
        resultJson: command.resultJson,
      },
    });

    await this.appendJobLog({
      jobId: command.jobId,
      level: 'info',
      message: `Completed job with result ${command.resultCode}.`,
      contextJson: command.resultJson,
    });
  }

  public async failJob(command: FailJobCommand): Promise<void> {
    await this.prisma.job.update({
      where: {
        id: command.jobId,
      },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: command.errorMessage,
        resultJson: command.resultJson,
      },
    });
  }

  public async cancelJob(jobId: number, reason: string): Promise<void> {
    await this.prisma.job.update({
      where: {
        id: jobId,
      },
      data: {
        status: 'canceled',
        cancelAt: new Date(),
        finishedAt: new Date(),
        cancelReason: reason,
      },
    });

    await this.appendJobLog({
      jobId,
      level: 'warn',
      message: `Canceled job: ${reason}`,
    });
  }

  public async updateJobProgress(command: UpdateJobProgressCommand): Promise<void> {
    await this.prisma.job.update({
      where: {
        id: command.jobId,
      },
      data: {
        progressPercent: command.progressPercent,
        totalItems: command.totalItems,
        processedItems: command.processedItems,
      },
    });
  }

  public async appendJobLog(command: AppendJobLogCommand): Promise<void> {
    await this.prisma.jobLog.create({
      data: {
        jobId: command.jobId,
        level: command.level,
        message: command.message,
        contextJson: command.contextJson,
      },
    });
  }

  public async createJobStep(command: CreateJobStepCommand): Promise<number> {
    const step = await this.prisma.jobStep.create({
      data: {
        jobId: command.jobId,
        stepName: command.stepName,
        sortOrder: command.sortOrder,
        totalItems: command.totalItems ?? 0,
        status: 'pending',
      },
    });

    return step.id;
  }

  public async markStepRunning(stepId: number): Promise<void> {
    await this.prisma.jobStep.update({
      where: {
        id: stepId,
      },
      data: {
        status: 'in_progress',
        startedAt: new Date(),
      },
    });
  }

  public async completeStep(stepId: number, resultJson?: Prisma.InputJsonValue): Promise<void> {
    await this.prisma.jobStep.update({
      where: {
        id: stepId,
      },
      data: {
        status: 'completed',
        finishedAt: new Date(),
        resultJson,
      },
    });
  }

  public async failStep(stepId: number, errorMessage: string): Promise<void> {
    await this.prisma.jobStep.update({
      where: {
        id: stepId,
      },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage,
      },
    });
  }
}
