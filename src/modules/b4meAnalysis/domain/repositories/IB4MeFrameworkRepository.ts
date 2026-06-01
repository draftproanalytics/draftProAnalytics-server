import type { B4MePositionGroup } from '../enums/B4MeEnums';
import type {
  B4MeEvaluationMetadataRecord,
  B4MeFrameworkCatalogRecord
} from '../contracts/B4MeFrameworkContracts';

export interface IB4MeFrameworkRepository {
  findActiveFrameworkByPositionGroup(
    positionGroup: B4MePositionGroup
  ): Promise<B4MeFrameworkCatalogRecord | null>;

  findEvaluationMetadataByProspectId(
    prospectId: bigint
  ): Promise<B4MeEvaluationMetadataRecord | null>;
}
