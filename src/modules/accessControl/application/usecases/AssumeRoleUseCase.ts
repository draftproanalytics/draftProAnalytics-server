import type { AccessMeResponse } from "../../domain/types/access.types";
import type { IAccessControlRepository } from "../../domain/repositories/IAccessControlRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "../../domain/access.errors";
import { GetMyAccessContextUseCase } from "./GetMyAccessContextUseCase";

export class AssumeRoleUseCase {
  public constructor(
    private readonly repo: IAccessControlRepository,
    private readonly getMe: GetMyAccessContextUseCase
  ) {}

  public async execute(personId: number, toRid: number): Promise<AccessMeResponse> {
    if (!Number.isFinite(toRid) || toRid <= 0) {
      throw new ValidationError("toRid must be a positive number.");
    }

    const person = await this.repo.getPersonWithActiveRole(personId);
    if (!person) throw new NotFoundError(`Person ${personId} not found.`);

    // ✅ Self-switch rule: only require assignment
    const assigned = await this.repo.isRoleAssignedToPerson(personId, toRid);
    if (!assigned) throw new ForbiddenError("Requested role is not assigned to this user.");

    await this.repo.setActiveRole(personId, toRid);

    return this.getMe.execute(personId);
  }
}
