import type { TeamNeedDto, TeamNeedSource, TeamNeedStatus } from '../../dtos/TeamNeedDtos'

export interface UpsertTeamNeedInput {
  teamId: number;
  position: string;
  priority: number;
  draftYear: number;
  needScore?: number | null;
  source?: TeamNeedSource;
  status?: TeamNeedStatus;
}

export interface ITeamNeedRepository {
  listByTeamIdAndDraftYear(teamId: number, draftYear: number): Promise<TeamNeedDto[]>;
  upsert(input: UpsertTeamNeedInput): Promise<TeamNeedDto>;
  deleteByTeamIdDraftYearAndPosition(teamId: number, draftYear: number, position: string): Promise<void>;
  review(id: number, status: 'APPROVED' | 'REJECTED', reviewedByPersonId?: number): Promise<TeamNeedDto>;
}
