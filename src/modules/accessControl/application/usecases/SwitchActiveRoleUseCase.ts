import type { AccessMeResponse } from "../../domain/types/access.types";
import type { IAccessControlRepository } from "../../domain/repositories/IAccessControlRepository";
import { ForbiddenError, NotFoundError, ValidationError } from "../../domain/access.errors";
import { GetMyAccessContextUseCase } from "./GetMyAccessContextUseCase";

export class SwitchActiveRoleUseCase {
  public constructor(
    private readonly repo: IAccessControlRepository,
    private readonly getContext: GetMyAccessContextUseCase
  ) {}

  public async execute(personId: number, targetRoleName: string): Promise<AccessMeResponse> {
    const trimmed = targetRoleName.trim().toLowerCase();
    if (trimmed.length === 0) throw new ValidationError("roleName is required.");

    const person = await this.repo.getPersonWithActiveRole(personId);
    if (!person) throw new NotFoundError(`Person ${personId} not found.`);

    const toRole = await this.repo.getRoleByName(trimmed);
    if (!toRole) throw new NotFoundError(`Role '${trimmed}' not found.`);
    const toRid = toRole.rid;

    // ✅ Self-switch rule: only require assignment
    const assigned = await this.repo.isRoleAssignedToPerson(personId, toRid);
    if (!assigned) throw new ForbiddenError(`Role '${trimmed}' is not assigned to this user.`);

    await this.repo.setActiveRole(personId, toRid);

    return this.getContext.execute(personId);
  }
}
