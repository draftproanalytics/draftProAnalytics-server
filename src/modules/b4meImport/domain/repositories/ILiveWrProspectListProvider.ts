import type { WrImportCandidate } from '../contracts/WrImportCandidate';

export interface ILiveWrProspectListProvider {
  listByDraftYear(draftYear: number): Promise<readonly WrImportCandidate[]>;
}
