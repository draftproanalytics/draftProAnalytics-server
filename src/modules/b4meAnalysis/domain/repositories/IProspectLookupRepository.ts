import type { WrProspectRecord } from '../contracts/WrFramework.types';

export interface IProspectLookupRepository {
  searchWideReceivers(playerName: string | null, draftYear: number | null): Promise<WrProspectRecord[]>;
}