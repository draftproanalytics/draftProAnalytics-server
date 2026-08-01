export interface ImportNflversePlayerProductionPayloadDto {
  readonly seasonYear: number;
  readonly teamId?: number;
  readonly summaryLevel: 'reg' | 'post' | 'regpost';
  readonly requestedByPersonId?: number;
}

export interface NflversePlayerProductionRecordDto {
  readonly externalPlayerId: string;
  readonly playerName: string;
  readonly teamAbbreviation?: string;
  readonly position?: string;
  readonly positionGroup?: string;
  readonly metrics: Readonly<Record<string, string | number | null>>;
}
