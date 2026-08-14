import type { Prisma } from '@prisma/client';
import type { IProspectIdentityRepository } from '../domain/IProspectIdentityRepository';

export class ProspectIdentityService {
  public constructor(private readonly repository: IProspectIdentityRepository) {}

  public listDuplicates(status?: string) { return this.repository.listDuplicateCandidates(status); }
  public listIdentityReviews(status?: string) { return this.repository.listIdentityReviews(status); }
  public listMergeAudits(limit = 100) { return this.repository.listMergeAudits(limit); }
  public detectDuplicates() { return this.repository.detectDuplicateCandidates(); }
  public getPreflightStatus(draftYear: number, position: string) { return this.repository.getPreflightStatus(draftYear, position); }
  public previewMerge(survivorId: number, duplicateId: number) { return this.repository.previewMerge(survivorId, duplicateId); }
  public merge(survivorId: number, duplicateId: number, actorPersonId: number | null, reason: string) {
    if (survivorId === duplicateId) throw new Error('Survivor and duplicate must be different prospects.');
    if (reason.trim().length < 3) throw new Error('A merge reason is required.');
    return this.repository.merge(survivorId, duplicateId, actorPersonId, reason.trim());
  }
  public resolveDuplicate(reviewId: number, status: string, actorPersonId: number | null, resolution: string, notes: string | null) {
    return this.repository.resolveDuplicateReview(reviewId, status, actorPersonId, resolution, notes);
  }
  public resolveIdentity(reviewId: number, status: string, actorPersonId: number | null, resolution: string, notes: string | null) {
    return this.repository.resolveIdentityReview(reviewId, status, actorPersonId, resolution, notes);
  }
  public hasOpenIdentityIssue(prospectId: number) { return this.repository.hasOpenIdentityIssue(prospectId); }
  public deleteProspect(prospectId: number, actorPersonId: number | null, reason: string) {
    if (reason.trim().length < 3) throw new Error('A delete reason is required.');
    return this.repository.deleteProspect(prospectId, actorPersonId, reason.trim());
  }
  public createProviderIdentityReview(input: {
    prospectId: number | null; candidateProspectId?: number | null; provider: string; requestedName: string;
    resolvedName: string | null; confidenceScore: number | null; reason: string; providerPayloadJson?: Prisma.InputJsonValue;
  }) { return this.repository.createIdentityReview(input); }
}
