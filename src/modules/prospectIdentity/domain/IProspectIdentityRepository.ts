import type { Prisma } from '@prisma/client';
import type { DuplicateCandidate, MergePreview, ProspectIdentityPreflightStatus } from './prospectIdentity.types';

export interface IdentityReviewCommand {
  readonly prospectId: number | null;
  readonly candidateProspectId?: number | null;
  readonly provider: string;
  readonly requestedName: string;
  readonly resolvedName: string | null;
  readonly confidenceScore: number | null;
  readonly reason: string;
  readonly providerPayloadJson?: Prisma.InputJsonValue;
}

export interface IProspectIdentityRepository {
  listDuplicateCandidates(status?: string): Promise<readonly DuplicateCandidate[]>;
  listIdentityReviews(status?: string): Promise<readonly unknown[]>;
  listMergeAudits(limit: number): Promise<readonly unknown[]>;
  detectDuplicateCandidates(): Promise<{ scanned: number; candidates: number; createdOrUpdated: number }>;
  getPreflightStatus(draftYear: number, position: string): Promise<ProspectIdentityPreflightStatus>;
  previewMerge(survivorProspectId: number, duplicateProspectId: number): Promise<MergePreview>;
  merge(survivorProspectId: number, duplicateProspectId: number, actorPersonId: number | null, reason: string): Promise<{ auditId: number }>;
  resolveDuplicateReview(reviewId: number, status: string, actorPersonId: number | null, resolution: string, notes: string | null): Promise<void>;
  createIdentityReview(command: IdentityReviewCommand): Promise<number>;
  resolveIdentityReview(reviewId: number, status: string, actorPersonId: number | null, resolution: string, notes: string | null): Promise<void>;
  hasOpenIdentityIssue(prospectId: number): Promise<boolean>;
  hasOpenDuplicateIssue(prospectId: number): Promise<boolean>;
  deleteProspect(prospectId: number, actorPersonId: number | null, reason: string): Promise<{ auditId: number }>;
}

export type ProspectIdentityTransaction = Prisma.TransactionClient;
