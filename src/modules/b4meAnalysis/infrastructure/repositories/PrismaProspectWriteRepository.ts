import type { PrismaClient } from '@prisma/client';
import type { IProspectWriteRepository } from '../../domain/repositories/IProspectWriteRepository';
import type { LiveWrProspectPayload } from '../../domain/contracts/LiveWrProspect.types';
import type { WrProspectRecord } from '../../domain/contracts/WrFramework.types';

export class PrismaProspectWriteRepository implements IProspectWriteRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async upsertWideReceiverFromLivePayload(
    payload: LiveWrProspectPayload
  ): Promise<WrProspectRecord> {
    const existing = await this.prisma.prospect.findFirst({
      where: {
        position: 'WR',
        draftYear: payload.draftYear,
        firstName: payload.firstName,
        lastName: payload.lastName
      }
    });

    const row = existing
      ? await this.prisma.prospect.update({
          where: { id: existing.id },
          data: {
            college: payload.school ?? existing.college,
            draftYear: payload.draftYear ?? existing.draftYear,
            position: 'WR'
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            college: true,
            draftYear: true,
            position: true
          }
        })
      : await this.prisma.prospect.create({
          data: {
            firstName: payload.firstName,
            lastName: payload.lastName,
            college: payload.school ?? '',
            position: 'WR',
            draftYear: payload.draftYear,
            homeCity: null,
            homeState: null,
   
            createdAt: new Date(),
            updatedAt: new Date()
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            college: true,
            draftYear: true,
            position: true
          }
        });

    return {
      id: row.id,
      playerName: `${row.firstName} ${row.lastName}`.trim(),
      school: row.college,
      draftYear: row.draftYear,
      position: row.position
    };
  }
}