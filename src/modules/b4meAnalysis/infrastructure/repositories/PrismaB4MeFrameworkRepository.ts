import type { PrismaClient } from '@prisma/client';

export interface ActiveWrFrameworkRecord {
  readonly id: bigint;
  readonly frameworkVersion: string;
  readonly frameworkType: string;
  readonly methodologyLineage: string;
  readonly validationStatus: string;
  readonly validationNote: string | null;
  readonly knownLimitations: string | null;
  readonly scoringModeDefault: string;
}

export class PrismaB4MeFrameworkRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findActiveWrFramework(): Promise<ActiveWrFrameworkRecord | null> {
    const record = await this.prisma.b4MeFrameworkCatalog.findFirst({
      where: {
        positionGroup: 'WR',
        isActive: true
      },
      orderBy: {
        id: 'desc'
      }
    });

    if (!record) {
      return null;
    }

    return {
      id: record.id,
      frameworkVersion: record.frameworkVersion,
      frameworkType: record.frameworkType,
      methodologyLineage: record.methodologyLineage,
      validationStatus: record.validationStatus,
      validationNote: record.validationNote,
      knownLimitations: record.knownLimitations,
      scoringModeDefault: record.scoringModeDefault
    };
  }
}