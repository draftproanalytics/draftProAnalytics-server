export { createProspectIdentityRouter } from './presentation/prospectIdentity.routes';
export { ProspectIdentityService } from './application/ProspectIdentityService';
export { PrismaProspectIdentityRepository } from './infrastructure/PrismaProspectIdentityRepository';
export { scoreProviderNameMatch, normalizeProspectName } from './application/ProspectDuplicateScoringService';
