import type { NflGameEventDto } from '../dtos/NflGameEvent.dto';
import type { NflSeasonType } from '../value-objects/NflSeasonType';

export interface FetchNflWeekEventsQuery {
  readonly seasonYear: number;
  readonly seasonType: NflSeasonType;
  readonly week: number;
}

export interface INflScheduleProvider {
  fetchWeekEvents(query: FetchNflWeekEventsQuery): Promise<readonly NflGameEventDto[]>;
}
