// src/infrastructure/repositories/PrismaPersonRepository.ts
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { IPersonRepository } from '@/domain/person/repositories/IPersonRepository';
import { PersonFilters } from '@/domain/person/repositories/PersonFilters';
import { Person } from '@/domain/person/entities/Person';
import { NewPersonInput } from '@/domain/person/entities/Person';

import { EmailVerificationTokenDTO } from '@/domain/auth/dtos/EmailVerificationTokenDTO';
import { PasswordResetTokenDTO } from '@/domain/auth/dtos/PasswordResetTokenDTO';
import { RefreshTokenDTO } from '@/domain/auth/dtos/RefreshTokenDTO';

import { PaginationParams, PaginatedResponse } from '@/shared/types/common';

import { prisma } from '@/infrastructure/database/prisma';
import { PersonMapper } from '@/domain/person/mapper/PersonMapper';
import { createLogger } from '@/utils/Logger';

export class PrismaPersonRepository implements IPersonRepository {
  private logger = createLogger('PrismaPersonRepository');

  constructor(private readonly db: PrismaClient = prisma) {}

  // ───────────────────────────────────────────
  // PERSON: findAll with filters + pagination
  // ───────────────────────────────────────────
  async findAll(
    filters: PersonFilters = {},
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<Person>> {
    const where: Prisma.PersonWhereInput = {};

    if (filters.userName) {
      where.userName = { contains: filters.userName };
    }
    if (filters.emailAddress) {
      where.emailAddress = { contains: filters.emailAddress };
    }
    if (filters.firstName) {
      where.firstName = { contains: filters.firstName };
    }
    if (filters.lastName) {
      where.lastName = { contains: filters.lastName };
    }
    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters.emailVerified !== undefined) {
      where.emailVerified = filters.emailVerified;
    }

    const page: number = pagination?.page ?? 1;
    const limit: number = pagination?.limit ?? 25;

    // Optional: use a transaction so count + rows are consistent
    const [total, rows] = await this.db.$transaction([
      this.db.person.count({ where }),
      this.db.person.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { pid: 'asc' },
      }),
    ]);

    const pages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      data: rows.map(Person.fromPersistence),
      pagination: {
        page,
        limit,
        total,
        pages,
      },
    };
  }

  // ───────────────────────────────────────────
  // PERSON: finders
  // ───────────────────────────────────────────
  async findById(pid: number): Promise<Person | null> {
    const record = await this.db.person.findUnique({ where: { pid } });
    return record ? Person.fromPersistence(record) : null;
  }

  async findByEmail(email: string): Promise<Person | null> {
    // Check if emailAddress is a unique field in your Prisma schema
    // If not, use findFirst instead
    const record = await this.db.person.findFirst({
      where: { emailAddress: email },
    });
    return record ? Person.fromPersistence(record) : null;
  }

  async findByUserName(userName: string): Promise<Person | null> {
    // Check if userName is a unique field in your Prisma schema
    // If not, use findFirst instead
    const record = await this.db.person.findFirst({
      where: { userName },
    });
    this.logger.debug('Person found: ' + record?.firstName + ' ' + record?.lastName);
    return record ? Person.fromPersistence(record) : null;
  }

  // ───────────────────────────────────────────
  // PERSON: exists
  // ───────────────────────────────────────────
  async exists(pid: number): Promise<boolean> {
    return (await this.db.person.count({ where: { pid } })) > 0;
  }

  async existsByEmailAddress(emailAddress: string): Promise<boolean> {
    return (await this.db.person.count({ where: { emailAddress } })) > 0;
  }

  async existsByUserName(userName: string): Promise<boolean> {
    return (await this.db.person.count({ where: { userName } })) > 0;
  }

  // ───────────────────────────────────────────
  // PERSON: create / update / delete
  // ───────────────────────────────────────────
  async createPerson(input: NewPersonInput): Promise<Person> {
    const publicRid = input.activeRid ?? 1;

    const record = await this.db.$transaction(async (tx) => {
      const publicRole = await tx.roles.findUnique({
        where: {
          rid: publicRid,
        },
        select: {
          rid: true,
          roleName: true,
          isActive: true,
        },
      });

      if (!publicRole) {
        throw new Error(`Default role rid=${publicRid} does not exist`);
      }

      if (publicRole.isActive === false) {
        throw new Error(`Default role rid=${publicRid} is inactive`);
      }

      const created = await tx.person.create({
        data: {
          userName: input.userName,
          emailAddress: input.emailAddress,
          passwordHash: input.passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          activeRid: publicRid,
          isActive: true,
          emailVerified: false,
        },
      });

      await tx.personRole.create({
        data: {
          personId: created.pid,
          roleId: publicRid,
          assignedByPersonId: null,
          isActive: true,
        },
      });

      return created;
    });

    return Person.fromPersistence(record);
  }

  async updatePerson(person: Person): Promise<Person> {
    const updated = await this.db.person.update({
      where: { pid: person.pid },
      data: person.toPersistence(),
    });
    //return PersonMapper.mapFromDatabaseRow(updated)
    return Person.fromPersistence(updated);
  }

  async delete(pid: number): Promise<void> {
    await this.db.person.delete({ where: { pid } });
  }

  // ───────────────────────────────────────────
  // EMAIL VERIFICATION TOKENS
  // ───────────────────────────────────────────
  async createEmailVerificationToken(dto: EmailVerificationTokenDTO): Promise<void> {
    await this.db.emailVerificationToken.create({
      data: {
        personId: dto.personId,
        token: dto.token,
        createdAt: dto.createdAt,
        expiresAt: dto.expiresAt,
        // id is auto-generated, don't include it
      },
    });
  }

  async findEmailVerificationToken(token: string): Promise<EmailVerificationTokenDTO | null> {
    const record = await this.db.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record) return null;

    return {
      id: record.id,
      personId: record.personId,
      token: record.token,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  async markEmailVerified(personId: number): Promise<void> {
    await this.db.person.update({
      where: { pid: personId },
      data: { emailVerified: true, verifiedAt: new Date() },
    });
  }

  async deleteEmailVerificationToken(id: number): Promise<void> {
    await this.db.emailVerificationToken.delete({ where: { id } });
  }

  // ───────────────────────────────────────────
  // PASSWORD RESET TOKENS
  // ───────────────────────────────────────────
  async createPasswordResetToken(dto: PasswordResetTokenDTO): Promise<void> {
    await this.db.passwordResetToken.create({
      data: {
        personId: dto.personId,
        token: dto.token,
        createdAt: dto.createdAt,
        expiresAt: dto.expiresAt,
        // id is auto-generated, don't include it
      },
    });
  }

  async findPasswordResetToken(token: string): Promise<PasswordResetTokenDTO | null> {
    const record = await this.db.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record) return null;

    return {
      id: record.id,
      personId: record.personId,
      token: record.token,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  async updatePassword(personId: number, hashedPassword: string): Promise<void> {
    await this.db.person.update({
      where: { pid: personId },
      data: { passwordHash: hashedPassword },
    });
  }

  async deletePasswordResetToken(id: number): Promise<void> {
    await this.db.passwordResetToken.delete({ where: { id } });
  }

  // ───────────────────────────────────────────
  // REFRESH TOKENS
  // ───────────────────────────────────────────
  async createRefreshToken(dto: RefreshTokenDTO): Promise<void> {
    await this.db.refreshToken.create({
      data: {
        personId: dto.personId,
        tokenHash: dto.token,
        createdAt: dto.createdAt,
        expiresAt: dto.expiresAt,
        // id is auto-generated, don't include it
      },
    });
  }

  async findRefreshToken(token: string): Promise<RefreshTokenDTO | null> {
    // Check if token or tokenHash is the unique field in your schema
    const record = await this.db.refreshToken.findFirst({
      where: {
        OR: [{ tokenHash: token }, { tokenHash: token }],
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      personId: record.personId,
      token: record.tokenHash || '', // Adjust based on your schema
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
    };
  }

  async saveRefreshToken(dto: RefreshTokenDTO): Promise<void> {
    await this.db.refreshToken.update({
      where: { id: dto.id! },
      data: {
        personId: dto.personId,
        tokenHash: dto.token, // Adjust based on your schema
        expiresAt: dto.expiresAt,
      },
    });
  }

  async deleteRefreshToken(id: number): Promise<void> {
    await this.db.refreshToken.delete({ where: { id } });
  }
}
