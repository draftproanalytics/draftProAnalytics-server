import type { PrismaClient } from '@prisma/client';
import type { IB4MeWrMetricsWriteRepository } from '../../domain/repositories/IB4MeWrMetricsWriteRepository';
import type { IB4MeEvaluationOrchestratorRepository } from '../../domain/repositories/IB4MeEvaluationOrchestratorRepository';

export interface SaveManualWrObservedMetricsCommand {
  readonly prospectId: number;
  readonly yprr: number;
  readonly pffOverallGrade: number;
  readonly contestedCatchRate: number;
  readonly behindLosTargetRate: number;
  readonly metricSeasonYear: number;
  readonly sourceName: string;
  readonly sourceUrl: string | null;
  readonly notes: string | null;
  readonly enteredByPersonId: number;
}

export class SaveManualWrObservedMetricsUseCase {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly metricsWriteRepository: IB4MeWrMetricsWriteRepository,
    private readonly evaluationRepository: IB4MeEvaluationOrchestratorRepository
  ) {}

  public async execute(command: SaveManualWrObservedMetricsCommand): Promise<void> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: command.prospectId },
      select: { id: true, position: true, draftYear: true }
    });

    if (prospect === null) throw new Error(`Prospect ${command.prospectId} was not found.`);
    if (prospect.position.toUpperCase() !== 'WR') throw new Error('Manual B4Me WR metrics can only be entered for a WR prospect.');
    if (![command.yprr, command.pffOverallGrade, command.contestedCatchRate, command.behindLosTargetRate, command.metricSeasonYear].every(Number.isFinite)) {
      throw new Error('All four observed metrics and the metric season are required numeric values.');
    }
    if (command.yprr < 0 || command.yprr > 10) throw new Error('YPRR must be between 0 and 10.');
    if (command.pffOverallGrade < 0 || command.pffOverallGrade > 100) throw new Error('PFF Overall Grade must be between 0 and 100.');
    if (command.contestedCatchRate < 0 || command.contestedCatchRate > 100) throw new Error('Contested Catch Rate must be between 0 and 100.');
    if (command.behindLosTargetRate < 0 || command.behindLosTargetRate > 100) throw new Error('Behind-LOS Target Rate must be between 0 and 100.');
    if (!Number.isInteger(command.metricSeasonYear) || command.metricSeasonYear < 2000 || command.metricSeasonYear > 2100) throw new Error('Metric season year is invalid.');
    if (command.sourceName.trim().length === 0 || command.sourceName.trim().length > 200) throw new Error('Source name is required and must be 200 characters or fewer.');
    if (command.sourceUrl !== null && command.sourceUrl.length > 1000) throw new Error('Source URL must be 1000 characters or fewer.');
    if (command.sourceUrl !== null) {
      let parsedUrl: URL;
      try { parsedUrl = new URL(command.sourceUrl); } catch { throw new Error('Source URL must be a valid URL.'); }
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') throw new Error('Source URL must use http or https.');
    }
    if (command.notes !== null && command.notes.length > 2000) throw new Error('Notes must be 2000 characters or fewer.');

    await this.metricsWriteRepository.saveManualObservedMetrics(command);
    await this.evaluationRepository.deleteStoredWrEvaluationsForProspect(command.prospectId);
  }
}
