import type { NflSeasonType } from '../value-objects/NflSeasonType';

export interface LoadNflSeasonSchedulePayloadDto {
  readonly seasonYear: number;
  readonly seasonTypes: readonly NflSeasonType[];
  readonly requestedByPersonId?: number;
}

export interface ImportNflGameScoresPayloadDto {
  readonly seasonYear: number;
  readonly seasonType: NflSeasonType;
  readonly week: number;
  readonly requestedByPersonId?: number;
}

export type DpaJobPayloadDto =
  | LoadNflSeasonSchedulePayloadDto
  | ImportNflGameScoresPayloadDto;

export interface ProcessJobQueueRequestDto {
  readonly take: number;
}
