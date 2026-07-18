import type { Job_status } from '@prisma/client';
import type { Request, Response } from 'express';
import { DpaJobType } from '../../domain/enums/DpaJobType';
import type { CancelDpaJobUseCase } from '../../application/use-cases/CancelDpaJobUseCase';
import type { EnqueueImportNflGameScoresJobUseCase } from '../../application/use-cases/EnqueueImportNflGameScoresJobUseCase';
import type { EnqueueLoadEspnDraftClassPlayersJobUseCase } from '../../application/use-cases/EnqueueLoadEspnDraftClassPlayersJobUseCase';
import type { EnqueueLoadEspnDraftResultsJobUseCase } from '../../application/use-cases/EnqueueLoadEspnDraftResultsJobUseCase';
import type { EnqueueSyncEspnDraftPicksToDpaJobUseCase } from '../../application/use-cases/EnqueueSyncEspnDraftPicksToDpaJobUseCase';
import type { EnqueueEnrichPlayerTeamPositionsJobUseCase } from '../../application/use-cases/EnqueueEnrichPlayerTeamPositionsJobUseCase';
import type { EnqueueLoadEspnTeamRostersJobUseCase } from '../../application/use-cases/EnqueueLoadEspnTeamRostersJobUseCase';
import type { EnqueueLoadNflSeasonScheduleJobUseCase } from '../../application/use-cases/EnqueueLoadNflSeasonScheduleJobUseCase';
import type { EnqueueSyncPostSeasonResultsJobUseCase } from '../../application/use-cases/EnqueueSyncPostSeasonResultsJobUseCase';
import type { ListDpaJobsUseCase } from '../../application/use-cases/ListDpaJobsUseCase';
import type { ProcessDpaJobQueueUseCase } from '../../application/use-cases/ProcessDpaJobQueueUseCase';
import type { ReadDpaJobUseCase } from '../../application/use-cases/ReadDpaJobUseCase';
import {
  parseImportNflGameScoresPayload,
  parseLoadNflSeasonSchedulePayload,
  parseEspnDraftYearPayload,
  parseEspnDraftResultsPayload,
  parseEnrichPlayerTeamPositionsPayload,
  parseSyncEspnDraftPicksToDpaPayload,
  parseLoadEspnTeamRostersPayload,
  parseSyncPostSeasonResultsPayload,
} from '../../application/validators/NflImportValidators';

interface CancelJobRequestBody {
  readonly reason?: unknown;
}

interface ProcessQueueRequestBody {
  readonly take?: unknown;
}

const parseIntegerParam = (value: string, fieldName: string): number => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }

  return parsedValue;
};

const parseLimit = (value: unknown): number => {
  if (typeof value !== 'string') {
    return 50;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? Math.min(parsedValue, 100) : 50;
};

const parseJobStatus = (value: unknown): Job_status | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const allowedStatuses: readonly Job_status[] = [
    'pending',
    'in_progress',
    'completed',
    'failed',
    'canceled',
  ];

  return allowedStatuses.includes(value as Job_status) ? (value as Job_status) : undefined;
};

export class DpaJobsNflImportController {
  public constructor(
    private readonly enqueueLoadNflSeasonScheduleJobUseCase: EnqueueLoadNflSeasonScheduleJobUseCase,
    private readonly enqueueImportNflGameScoresJobUseCase: EnqueueImportNflGameScoresJobUseCase,
    private readonly enqueueLoadEspnDraftClassPlayersJobUseCase: EnqueueLoadEspnDraftClassPlayersJobUseCase,
    private readonly enqueueLoadEspnDraftResultsJobUseCase: EnqueueLoadEspnDraftResultsJobUseCase,
    private readonly enqueueEnrichPlayerTeamPositionsJobUseCase: EnqueueEnrichPlayerTeamPositionsJobUseCase,
    private readonly enqueueSyncEspnDraftPicksToDpaJobUseCase: EnqueueSyncEspnDraftPicksToDpaJobUseCase,
    private readonly enqueueLoadEspnTeamRostersJobUseCase: EnqueueLoadEspnTeamRostersJobUseCase,
    private readonly enqueueSyncPostSeasonResultsJobUseCase: EnqueueSyncPostSeasonResultsJobUseCase,
    private readonly processDpaJobQueueUseCase: ProcessDpaJobQueueUseCase,
    private readonly listDpaJobsUseCase: ListDpaJobsUseCase,
    private readonly readDpaJobUseCase: ReadDpaJobUseCase,
    private readonly cancelDpaJobUseCase: CancelDpaJobUseCase,
  ) {}

  public enqueueLoadNflSeasonSchedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseLoadNflSeasonSchedulePayload(req.body);
      const job = await this.enqueueLoadNflSeasonScheduleJobUseCase.execute(payload);
      res.status(202).json(job);
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public enqueueImportNflGameScores = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseImportNflGameScoresPayload(req.body);
      const job = await this.enqueueImportNflGameScoresJobUseCase.execute(payload);
      res.status(202).json(job);
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };


  public enqueueLoadEspnDraftClassPlayers = async (req: Request, res: Response): Promise<void> => {
    try { res.status(202).json(await this.enqueueLoadEspnDraftClassPlayersJobUseCase.execute(parseEspnDraftYearPayload(req.body))); }
    catch (error) { this.writeBadRequest(res, error); }
  };
  public enqueueLoadEspnDraftResults = async (req: Request, res: Response): Promise<void> => {
    try { res.status(202).json(await this.enqueueLoadEspnDraftResultsJobUseCase.execute(parseEspnDraftResultsPayload(req.body))); }
    catch (error) { this.writeBadRequest(res, error); }
  };

  public enqueueLoadEspnTeamRosters = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseLoadEspnTeamRostersPayload(req.body);
      res.status(202).json(await this.enqueueLoadEspnTeamRostersJobUseCase.execute(payload));
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public enqueueSyncEspnDraftPicksToDpa = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseSyncEspnDraftPicksToDpaPayload(req.body);
      res.status(202).json(await this.enqueueSyncEspnDraftPicksToDpaJobUseCase.execute(payload));
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public enqueueEnrichPlayerTeamPositions = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseEnrichPlayerTeamPositionsPayload(req.body);
      res.status(202).json(await this.enqueueEnrichPlayerTeamPositionsJobUseCase.execute(payload));
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public enqueueSyncPostSeasonResults = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = parseSyncPostSeasonResultsPayload(req.body);
      res.status(202).json(await this.enqueueSyncPostSeasonResultsJobUseCase.execute(payload));
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public processQueue = async (req: Request, res: Response): Promise<void> => {
    try {
      const body = req.body as ProcessQueueRequestBody;
      const take = typeof body.take === 'number' ? body.take : 1;
      const result = await this.processDpaJobQueueUseCase.execute(take);
      res.status(200).json(result);
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public listJobs = async (req: Request, res: Response): Promise<void> => {
    const status = parseJobStatus(req.query.status);
    const type = typeof req.query.type === 'string' ? req.query.type : undefined;
    const limit = parseLimit(req.query.limit);

    const jobs = await this.listDpaJobsUseCase.execute({
      status,
      type,
      limit,
    });

    res.status(200).json(jobs);
  };

  public readJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = parseIntegerParam(req.params.jobId, 'jobId');
      const job = await this.readDpaJobUseCase.readJob(jobId);

      if (!job) {
        res.status(404).json({ message: 'Job not found.' });
        return;
      }

      res.status(200).json(job);
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public readJobLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = parseIntegerParam(req.params.jobId, 'jobId');
      const logs = await this.readDpaJobUseCase.readLogs(jobId);
      res.status(200).json(logs);
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public cancelJob = async (req: Request, res: Response): Promise<void> => {
    try {
      const jobId = parseIntegerParam(req.params.jobId, 'jobId');
      const body = req.body as CancelJobRequestBody;
      const reason = typeof body.reason === 'string' && body.reason.trim() !== ''
        ? body.reason.trim()
        : 'Canceled by user.';

      await this.cancelDpaJobUseCase.execute(jobId, reason);
      res.status(204).send();
    } catch (error) {
      this.writeBadRequest(res, error);
    }
  };

  public readSupportedJobTypes = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      importJobs: [
        DpaJobType.LoadNflSeasonSchedule,
        DpaJobType.ImportNflGameScores,
        DpaJobType.LoadEspnDraftClassPlayers,
        DpaJobType.LoadEspnDraftResults,
        DpaJobType.EnrichPlayerTeamPositions,
        DpaJobType.SyncEspnDraftPicksToDpa,
        DpaJobType.LoadEspnTeamRosters,
        DpaJobType.SyncPostSeasonResultsFromGames,
      ],
      queueJobs: [
        DpaJobType.ProcessJobQueue,
      ],
    });
  };

  private writeBadRequest(res: Response, error: unknown): void {
    const message = error instanceof Error ? error.message : 'Invalid request.';
    res.status(400).json({ message });
  }
}
