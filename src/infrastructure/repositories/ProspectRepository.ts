// src/infrastructure/repositories/ProspectRepository.ts
 
import { Prospect } from '@/domain/prospect/entity/Prospect'
import { PrismaClient } from '@prisma/client'
 
export class ProspectRepository {
  constructor(private prisma: PrismaClient) {}

  async findAvailable(draftYear: number): Promise<Prospect[]> {
    const prospects = await this.prisma.prospect.findMany({
      where: {
        drafted: false,
        ...(draftYear && { draftYear })
      },
      orderBy: [
        { position: 'asc' },
        { lastName: 'asc' }
      ]
    })

    return prospects.map(prospect => Prospect.fromDatabase(prospect))
  }

  async findById(id: number): Promise<Prospect> {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id }
    })

    if (!prospect) {
      throw new Error(`Prospect with id ${id} not found`)
    }

    return Prospect.fromDatabase(prospect)
  }

  async updateProspect(id: number, data: Partial<Prospect>): Promise<void> {
    await this.prisma.prospect.update({
      where: { id },
      data: {
        drafted: data.drafted,
        draftPickId: data.draftPickId,
        teamId: data.teamId,
        updatedAt: new Date()
      }
    })
  }

  async findByPosition(position: string, drafted = false): Promise<Prospect[]> {
    const prospects = await this.prisma.prospect.findMany({
      where: {
        position,
        drafted
      },
      orderBy: { lastName: 'asc' }
    })

    return prospects.map(prospect => Prospect.fromDatabase(prospect))
  }

  async create(prospect: Omit<Prospect, 'id'>): Promise<Prospect> {
    const created = await this.prisma.prospect.create({
      data: {
        firstName: prospect.firstName,
        lastName: prospect.lastName,
        position: prospect.position,
        college: prospect.college,
        height: (prospect.height === undefined ? 0 : prospect.height),
        weight: (prospect.weight === undefined ? 0 : prospect.weight),
        handSize: prospect.handSize,
        armLength: prospect.armLength,
        homeCity: prospect.homeCity,
        homeState: prospect.homeState,
        fortyTime: prospect.fortyTime,
        tenYardSplit: prospect.tenYardSplit,
        verticalLeap: prospect.verticalLeap,
        broadJump: prospect.broadJump,
        threeCone: prospect.threeCone,
        twentyYardShuttle: prospect.twentyYardShuttle,
        benchPress: prospect.benchPress,
        drafted: prospect.drafted || false,
        draftYear: prospect.draftYear
      }
    })

    return Prospect.fromDatabase(created)
  }
}
