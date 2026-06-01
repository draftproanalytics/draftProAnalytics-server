export interface WrImportSeedRecord {
  readonly prospectId: number;
  readonly playerName: string;
  readonly draftYear: number | null;
  readonly school: string | null;
}

export interface IWrImportSeedRepository {
  findWideReceiversByYear(draftYear: number): Promise<WrImportSeedRecord[]>;
}