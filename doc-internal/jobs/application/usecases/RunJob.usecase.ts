import { JobLogLevel } from '../../domain/enums/JobLogLevel.enum';
import { JobStatus } from '../../domain/enums/JobStatus.enum';
import { IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { JsonValue } from '../../domain/types/JsonValue';
import { IJobHandler } from '../runners/IJobHandler';
import { JobDetailDto } from '../dto/Job.dto';
import { JobMapper } from '../mappers/JobMapper';

export class RunJobUseCase {
  public constructor(
    private readonly jobRepository: IJobRepository,
    private readonly jobLogRepository: IJobLogRepository,
    private readonly handlers: readonly IJobHandler[],
  ) {}

  public async execute(id: number): Promise<JobDetailDto> {
    const existingJob = await this.jobRepository.findById(id);
    if (existingJob === null) {
      throw new Error(`Job ${id.toString()} was not found.`);
    }

    if (existingJob.status !== JobStatus.Pending) {
      throw new Error(`Job ${id.toString()} cannot be run because it is ${existingJob.status}.`);
    }

    const handler = this.handlers.find((candidate) => candidate.canHandle(existingJob.type));
    if (handler === undefined) {
      const failed = await this.jobRepository.markFailed(id, {
        resultCode: 'NO_HANDLER',
        errorMessage: `No handler registered for job type ${existingJob.type}.`,
        resultJson: null,
      });
      return JobMapper.toDetail(failed);
    }

    const runningJob = await this.jobRepository.markRunning(id);
    await this.jobLogRepository.append({
      jobId: id,
      level: JobLogLevel.Info,
      message: `Started job ${runningJob.type}.`,
      contextJson: null,
    });

    try {
      const result = await handler.execute(runningJob);
      const completed = await this.jobRepository.markCompleted(id, {
        resultCode: result.resultCode,
        resultJson: result.resultJson as JsonValue | null,
      });

      await this.jobLogRepository.append({
        jobId: id,
        level: JobLogLevel.Info,
        message: `Completed job ${runningJob.type}.`,
        contextJson: result.resultJson as JsonValue | null,
      });

      return JobMapper.toDetail(completed);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown job execution failure.';
      const failed = await this.jobRepository.markFailed(id, {
        resultCode: 'FAILED',
        errorMessage: message,
        resultJson: { message },
      });

      await this.jobLogRepository.append({
        jobId: id,
        level: JobLogLevel.Error,
        message,
        contextJson: null,
      });

      return JobMapper.toDetail(failed);
    }
  }
}
