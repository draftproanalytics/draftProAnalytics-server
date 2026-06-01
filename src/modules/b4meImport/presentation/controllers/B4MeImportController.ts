import type { Request, Response } from 'express';
import type { CreateWrImportJobUseCase } from '../../application/usecases/CreateWrImportJob.usecase';
import type { RunWrImportJobUseCase } from '../../application/usecases/RunWrImportJob.usecase';
import type { IJobRepository } from '../../domain/repositories/IJobRepository';
import type { IJobLogRepository } from '../../domain/repositories/IJobLogRepository';
import type {
  B4MeWrImportPlayerJobPayload,
  B4MeWrImportYearJobPayload
} from '../../domain/contracts/B4MeImportJobPayload';
import type { B4MeScoringMode } from '../../../b4meAnalysis/domain/enums/B4MeScoringMode';

function parseScoringModes(value: unknown): B4MeScoringMode[] {
  if (!Array.isArray(value)) {
    return ['BASE_PLUS_CONTEXT'];
  }

  return value.filter(
    (item): item is B4MeScoringMode =>
      item === 'BASE_ONLY' ||
      item === 'BASE_PLUS_CONTEXT' ||
      item === 'FULL_DECISION_SCORE'
  );
}

function parseBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return true;
    }
    if (normalized === 'false' || normalized === '0') {
      return false;
    }
  }

  return defaultValue;
}

function parseRequiredNumber(value: unknown, fieldName: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return parsed;
}

export class B4MeImportController {
  public constructor(
    private readonly createJobUseCase: CreateWrImportJobUseCase,
    private readonly runJobUseCase: RunWrImportJobUseCase,
    private readonly jobRepository: IJobRepository,
    private readonly jobLogRepository: IJobLogRepository
  ) {}

  public async createWrYearJob(request: Request, response: Response): Promise<void> {
    const payload: B4MeWrImportYearJobPayload = {
      positionGroup: 'WR',
      draftYear: parseRequiredNumber(request.body.draftYear, 'draftYear'),
      overwriteMetrics: parseBoolean(request.body.overwriteMetrics, true),
      recomputeEvaluations: parseBoolean(request.body.recomputeEvaluations, true),
      scoringModes: parseScoringModes(request.body.scoringModes)
    };

    const job = await this.createJobUseCase.execute('B4ME_WR_IMPORT_YEAR', payload);
    response.status(201).json(job);
  }

  public async createWrPlayerJob(request: Request, response: Response): Promise<void> {
    if (typeof request.body.playerName !== 'string' || request.body.playerName.trim().length === 0) {
      throw new Error('playerName is required.');
    }

    const payload: B4MeWrImportPlayerJobPayload = {
      positionGroup: 'WR',
      draftYear:
        request.body.draftYear === null || request.body.draftYear === undefined
          ? null
          : parseRequiredNumber(request.body.draftYear, 'draftYear'),
      playerName: request.body.playerName.trim(),
      overwriteMetrics: parseBoolean(request.body.overwriteMetrics, true),
      recomputeEvaluations: parseBoolean(request.body.recomputeEvaluations, true),
      scoringModes: parseScoringModes(request.body.scoringModes)
    };

    const job = await this.createJobUseCase.execute('B4ME_WR_IMPORT_PLAYER', payload);
    response.status(201).json(job);
  }

  public async runJob(request: Request, response: Response): Promise<void> {
    const jobId = parseRequiredNumber(request.params.id, 'jobId');
    const job = await this.runJobUseCase.execute(jobId);
    response.status(200).json(job);
  }

  public async getJob(request: Request, response: Response): Promise<void> {
    const jobId = parseRequiredNumber(request.params.id, 'jobId');
    const job = await this.jobRepository.findById(jobId);

    if (job === null) {
      response.status(404).json({ message: `Job ${jobId} not found.` });
      return;
    }

    response.status(200).json(job);
  }

  public async getJobLogs(request: Request, response: Response): Promise<void> {
    const jobId = parseRequiredNumber(request.params.id, 'jobId');
    const logs = await this.jobLogRepository.findByJobId(jobId);
    response.status(200).json(logs);
  }
}
