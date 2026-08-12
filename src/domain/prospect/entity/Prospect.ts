export class Prospect {
  constructor(
    public readonly id: number | undefined,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly position: string,
    public readonly college: string,
    public readonly homeCity?: string,
    public readonly homeState?: string,
    public readonly drafted: boolean = false,
    public readonly draftStatus: 'PRE_DRAFT' | 'DRAFTED' | 'UDFA' = 'PRE_DRAFT',
    public readonly draftYear?: number,
    public readonly teamId?: number,
    public readonly draftPickId?: number,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  static fromDatabase(data: any): Prospect {
    return new Prospect(
      data.id,
      data.firstName,
      data.lastName,
      data.position,
      data.college,
      data.homeCity ?? undefined,
      data.homeState ?? undefined,
      data.drafted,
      data.draftStatus ?? (data.drafted ? 'DRAFTED' : 'PRE_DRAFT'),
      data.draftYear ?? undefined,
      data.teamId ?? undefined,
      data.draftPickId ?? undefined,
      data.createdAt ?? undefined,
      data.updatedAt ?? undefined
    );
  }

  get fullName(): string { return `${this.firstName} ${this.lastName}`; }
  isAvailable(): boolean { return this.draftStatus === 'PRE_DRAFT'; }
}
