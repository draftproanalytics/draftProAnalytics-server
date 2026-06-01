
import type { LiveWrProspectPayload } from '../../domain/contracts/LiveWrProspect.types';
import { ILiveWrProspectProvider } from '../../domain/repositories/ILiveWrProspectProvider';

export class NullLiveWrProspectProvider implements ILiveWrProspectProvider {
  public async findByPlayerName(
    _playerName: string,
    _draftYear: number | null
  ): Promise<LiveWrProspectPayload | null> {
    return null;
  }
}