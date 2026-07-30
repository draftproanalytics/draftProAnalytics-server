// src/infrastructure/repositories/ProspectRepository.ts
 
import { Prospect } from '@/domain/prospect/entity/Prospect'
import { PrismaClient } from '@prisma/client'
 
export interface ProspectRepository {
  findAvailable(draftYear: number): Promise<Prospect[]>;
  findById(id: number): Promise<Prospect>;
  updateProspect(id: number, data: Partial<Prospect>): Promise<void>;
  findByPosition(position: string, drafted: boolean): Promise<Prospect[]>;
  create(prospect: Omit<Prospect, 'id'>): Promise<Prospect>;
}
