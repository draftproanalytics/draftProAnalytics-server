import type { PrismaClient, Prisma } from '@prisma/client';
import type { IProspectLookupRepository } from '../../domain/repositories/IProspectLookupRepository';
import type { WrProspectRecord } from '../../domain/contracts/WrFramework.types';

function buildPlayerNameFilter(playerName: string | null): Prisma.ProspectWhereInput {
  if (playerName === null || playerName.trim().length === 0) {
    return {};
  }

  const normalized: string = playerName.trim();
  const parts: string[] = normalized.split(/\s+/).filter((part) => part.length > 0);

  if (parts.length === 1) {
    const token: string = parts[0];

    return {
      OR: [
        { firstName: { contains: token } },
        { lastName: { contains: token } }
      ]
    };
  }

  const firstToken: string = parts[0];
  const lastToken: string = parts[parts.length - 1];

  return {
    OR: [
      {
        AND: [
          { firstName: { contains: firstToken } },
          { lastName: { contains: lastToken } }
        ]
      },
      {
        AND: [
          { firstName: { contains: lastToken } },
          { lastName: { contains: firstToken } }
        ]
      }
    ]
  };
}

export class PrismaProspectLookupRepository implements IProspectLookupRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async searchWideReceivers(
    playerName: string | null,
    draftYear: number | null
  ): Promise<WrProspectRecord[]> {
    const rows = await this.prisma.prospect.findMany({
      where: {
        AND: [
          { position: 'WR' },
          draftYear !== null ? { draftYear } : {},
          buildPlayerNameFilter(playerName)
        ]
      },
      orderBy: [{ draftYear: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        college: true,
        draftYear: true,
        position: true
      }
    });

    return rows.map((row) => ({
      id: row.id,
      playerName: `${row.firstName} ${row.lastName}`.trim(),
      school: row.college,
      draftYear: row.draftYear,
      position: row.position
    }));
  }
}