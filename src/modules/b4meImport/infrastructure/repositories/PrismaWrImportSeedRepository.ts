import type { PrismaClient } from '@prisma/client';
import type {
  IWrImportSeedRepository,
  WrImportSeedRecord
} from '../../domain/repositories/IWrImportSeedRepository';

export class PrismaWrImportSeedRepository implements IWrImportSeedRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async findWideReceiversByYear(draftYear: number): Promise<WrImportSeedRecord[]> {
    const rows = await this.prisma.prospect.findMany({
      where: {
        position: 'WR',
        draftYear
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        college: true,
        draftYear: true
      }
    });

    return rows.map((row) => ({
      prospectId: row.id,
      playerName: `${row.firstName} ${row.lastName}`.trim(),
      draftYear: row.draftYear,
      school: row.college
    }));
  }
}