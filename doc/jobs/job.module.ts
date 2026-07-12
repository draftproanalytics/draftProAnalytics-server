import { PrismaClient } from '@prisma/client';
import { CancelJobUseCase } from './application/usecases/CancelJob.usecase';
import { CreateJobUseCase } from './application/usecases/CreateJob.usecase';
import { GetJobUseCase } from './application/usecases/GetJob.usecase';
import { ListJobLogsUseCase } from './application/usecases/ListJobLogs.usecase';
import { ListJobsUseCase } from './application/usecases/ListJobs.usecase';
import { ListJobStepsUseCase } from './application/usecases/ListJobSteps.usecase';
import { RunJobUseCase } from './application/usecases/RunJob.usecase';
import { IJobHandler } from './application/runners/IJobHandler';
import { PrismaJobLogRepository } from './infrastructure/repositories/PrismaJobLogRepository';
import { PrismaJobRepository } from './infrastructure/repositories/PrismaJobRepository';
import { PrismaJobStepRepository } from './infrastructure/repositories/PrismaJobStepRepository';
import { JobController } from './presentation/controllers/JobController';

export interface JobModule {
  readonly createJobUseCase: CreateJobUseCase;
  readonly jobController: JobController;
}

export const createJobModule = (
  prisma: PrismaClient,
  handlers: readonly IJobHandler[] = [],
): JobModule => {
  const jobRepository = new PrismaJobRepository(prisma);
  const jobLogRepository = new PrismaJobLogRepository(prisma);
  const jobStepRepository = new PrismaJobStepRepository(prisma);

  const createJobUseCase = new CreateJobUseCase(jobRepository);
  const listJobsUseCase = new ListJobsUseCase(jobRepository);
  const getJobUseCase = new GetJobUseCase(jobRepository);
  const runJobUseCase = new RunJobUseCase(jobRepository, jobLogRepository, handlers);
  const cancelJobUseCase = new CancelJobUseCase(jobRepository);
  const listJobLogsUseCase = new ListJobLogsUseCase(jobLogRepository);
  const listJobStepsUseCase = new ListJobStepsUseCase(jobStepRepository);

  return {
    createJobUseCase,
    jobController: new JobController(
      listJobsUseCase,
      getJobUseCase,
      runJobUseCase,
      cancelJobUseCase,
      listJobLogsUseCase,
      listJobStepsUseCase,
    ),
  };
};
