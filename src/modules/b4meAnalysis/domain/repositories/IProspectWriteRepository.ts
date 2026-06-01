import type { WrProspectRecord } from '../contracts/WrFramework.types';
import type { LiveWrProspectPayload } from '../contracts/LiveWrProspect.types';

export interface IProspectWriteRepository {
  upsertWideReceiverFromLivePayload(
    payload: LiveWrProspectPayload
  ): Promise<WrProspectRecord>;
}