// src/domain/teamNeed/entities/TeamNeed.ts
import { ValidationError } from '@/shared/errors/AppError';

export interface TeamNeedProps {
  id?: number;
  teamId?: number;
  position?: string;
  priority?: number;
  draftYear: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class TeamNeed {
  private constructor(private props: TeamNeedProps) {
    this.validate();
  }

  public static create(props: TeamNeedProps): TeamNeed {
    return new TeamNeed(props);
  }

  // 🚨 CRITICAL: fromPersistence MUST match actual Prisma return types
  public static fromPersistence(data: {
    id: number;
    teamId: number | null;
    position: string | null;
    priority: number | null;
    draftYear: number;
    createdAt: Date | null;
    updatedAt: Date | null;
  }): TeamNeed {
    return new TeamNeed({
      id: data.id,
      teamId: data.teamId || undefined,
      position: data.position || undefined,
      priority: data.priority || undefined,
      draftYear: data.draftYear,
      createdAt: data.createdAt || undefined,
      updatedAt: data.updatedAt || undefined,
    });
  }

  private validate(): void {
    // Validate teamId is positive when provided
    if (this.props.teamId !== undefined && this.props.teamId <= 0) {
      throw new ValidationError('Team ID must be positive');
    }

    // Validate position length
    if (this.props.position && this.props.position.length > 10) {
      throw new ValidationError('Position cannot exceed 10 characters');
    }

    // Validate priority range
    if (this.props.priority !== undefined && (this.props.priority < 1 || this.props.priority > 10)) {
      throw new ValidationError('Priority must be between 1 and 10');
    }

    // Validate draft year range
    if (!Number.isInteger(this.props.draftYear) || this.props.draftYear < 2000 || this.props.draftYear > 2030) {
      throw new ValidationError('Draft year must be between 2000 and 2030');
    }
  }

  // Getters
  public get id(): number | undefined {
    return this.props.id;
  }

  public get teamId(): number | undefined {
    return this.props.teamId;
  }

  public get position(): string | undefined {
    return this.props.position;
  }

  public get priority(): number | undefined {
    return this.props.priority;
  }

  public get draftYear(): number {
    return this.props.draftYear;
  }

  public get createdAt(): Date | undefined {
    return this.props.createdAt;
  }

  public get updatedAt(): Date | undefined {
    return this.props.updatedAt;
  }

  // Business methods
  public updatePriority(newPriority: number): void {
    if (newPriority < 1 || newPriority > 10) {
      throw new ValidationError('Priority must be between 1 and 10');
    }
    this.props.priority = newPriority;
  }

  public updatePosition(newPosition: string): void {
    if (newPosition.length > 10) {
      throw new ValidationError('Position cannot exceed 10 characters');
    }
    this.props.position = newPosition;
  }

  public updateDraftYear(newDraftYear: number): void {
    if (newDraftYear < 2000 || newDraftYear > 2030) {
      throw new ValidationError('Draft year must be between 2000 and 2030');
    }
    this.props.draftYear = newDraftYear;
  }

  public isHighPriority(): boolean {
    return this.props.priority !== undefined && this.props.priority <= 3;
  }

  public isForCurrentDraft(): boolean {
    const currentYear = new Date().getFullYear();
    return this.props.draftYear === currentYear || this.props.draftYear === currentYear + 1;
  }

  // 🔧 toPersistence: Convert entity back to Prisma format
  public toPersistence(): {
    id?: number;
    teamId?: number;
    position?: string;
    priority?: number;
    draftYear: number;
    createdAt?: Date;
    updatedAt?: Date;
  } {
    const data = {
      id: this.props.id,
      teamId: this.props.teamId,
      position: this.props.position,
      priority: this.props.priority,
      draftYear: this.props.draftYear,
      createdAt: this.props.createdAt,
      updatedAt: this.props.updatedAt,
    };
    
    // Filter out undefined values
    return Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    ) as any;
  }

  public equals(other: TeamNeed): boolean {
    return this.props.id === other.props.id;
  }
}