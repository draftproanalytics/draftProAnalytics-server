import { Request, Response } from 'express';
import { CancelJobUseCase } from '../../application/usecases/CancelJob.usecase';
import { GetJobUseCase } from '../../application/usecases/GetJob.usecase';
import { ListJobLogsUseCase } from '../../application/usecases/ListJobLogs.usecase';
import { ListJobsUseCase } from '../../application/usecases/ListJobs.usecase';
import { ListJobStepsUseCase } from '../../application/usecases/ListJobSteps.usecase';
import { RunJobUseCase } from '../../application/usecases/RunJob.usecase';
import { cancelJobBodySchema, jobIdParamsSchema, listJobsQuerySchema } from '../validators/job.validators';

export class JobController {
  public constructor(
    private readonly listJobsUseCase: ListJobsUseCase,
    private readonly getJobUseCase: GetJobUseCase,
    private readonly runJobUseCase: RunJobUseCase,
    private readonly cancelJobUseCase: CancelJobUseCase,
    private readonly listJobLogsUseCase: ListJobLogsUseCase,
    private readonly listJobStepsUseCase: ListJobStepsUseCase,
  ) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const query = listJobsQuerySchema.parse(request.query);
    const result = await this.listJobsUseCase.execute(query);
    response.status(200).json(result);
  };

  public getById = async (request: Request, response: Response): Promise<void> => {
    const params = jobIdParamsSchema.parse(request.params);
    const result = await this.getJobUseCase.execute(Number(params.id));
    if (result === null) {
      response.status(404).json({ message: 'Job not found.' });
      return;
    }
    response.status(200).json(result);
  };

  public run = async (request: Request, response: Response): Promise<void> => {
    const params = jobIdParamsSchema.parse(request.params);
    const result = await this.runJobUseCase.execute(Number(params.id));
    response.status(200).json(result);
  };

  public cancel = async (request: Request, response: Response): Promise<void> => {
    const params = jobIdParamsSchema.parse(request.params);
    const body = cancelJobBodySchema.parse(request.body);
    const result = await this.cancelJobUseCase.execute(Number(params.id), body.cancelReason);
    response.status(200).json(result);
  };

  public logs = async (request: Request, response: Response): Promise<void> => {
    const params = jobIdParamsSchema.parse(request.params);
    const result = await this.listJobLogsUseCase.execute(Number(params.id));
    response.status(200).json(result);
  };

  public steps = async (request: Request, response: Response): Promise<void> => {
    const params = jobIdParamsSchema.parse(request.params);
    const result = await this.listJobStepsUseCase.execute(Number(params.id));
    response.status(200).json(result);
  };
}
