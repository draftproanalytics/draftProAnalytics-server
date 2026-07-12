import type { LiveWrProspectPayload } from '../contracts/LiveWrProspect.types';

export interface ILiveWrProspectProvider {
  findByPlayerName(
    playerName: string,
    draftYear: number | null
  ): Promise<LiveWrProspectPayload | null>;
}

