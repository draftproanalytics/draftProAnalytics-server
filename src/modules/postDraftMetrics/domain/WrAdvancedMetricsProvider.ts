import type { WrAdvancedMetricsResult } from './WrAdvancedMetrics.types';

export interface WrAdvancedMetricsProvider {
  getMetrics(prospectId: number, draftYear: number): Promise<WrAdvancedMetricsResult | null>;
}
