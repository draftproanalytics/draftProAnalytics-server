import type { NflGameEventDto } from '../dtos/NflGameEvent.dto';

export interface UpsertGameResultDto {
  readonly insertedOrUpdated: number;
  readonly skipped: number;
  readonly skippedReasons: readonly string[];
}

export interface IGameScheduleRepository {
  upsertImportedGames(events: readonly NflGameEventDto[]): Promise<UpsertGameResultDto>;
}
