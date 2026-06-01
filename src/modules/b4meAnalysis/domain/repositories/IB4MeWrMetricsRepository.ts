import type { WrMetricsRecord } from '../contracts/WrFramework.types';

export interface IB4MeWrMetricsRepository {
  findByProspectId(prospectId: number): Promise<WrMetricsRecord | null>;
}