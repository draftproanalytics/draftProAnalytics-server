import type { LiveWrProspectPayload } from '../contracts/LiveWrProspect.types';

export interface IB4MeWrMetricsWriteRepository {
  upsertFromLivePayload(prospectId: number, payload: LiveWrProspectPayload): Promise<void>;
}