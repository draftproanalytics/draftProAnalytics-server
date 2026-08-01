
> sports_mgmt_app-server@1.0.0 build
> tsc -p tsconfig.server.json && tsc-alias -p tsconfig.server.json && echo "✅ build ok" && ls -la dist | head

src/application/prospect/services/ProspectService.ts(24,69): error TS2345: Argument of type '{ firstName: string; lastName: string; college: string; }' is not assignable to parameter of type 'ProspectFilters'.
  Property 'draftYear' is missing in type '{ firstName: string; lastName: string; college: string; }' but required in type 'ProspectFilters'.
src/application/prospect/services/ProspectService.ts(55,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/application/prospect/services/ProspectService.ts(78,58): error TS2345: Argument of type '{ firstName?: string | undefined; lastName?: string | undefined; position?: string | undefined; college?: string | undefined; homeState?: string | undefined; drafted?: boolean | undefined; ... 11 more ...; maxBenchPress?: number | undefined; } | undefined' is not assignable to parameter of type 'ProspectFilters | undefined'.
  Type '{ firstName?: string | undefined; lastName?: string | undefined; position?: string | undefined; college?: string | undefined; homeState?: string | undefined; drafted?: boolean | undefined; ... 11 more ...; maxBenchPress?: number | undefined; }' is not assignable to type 'ProspectFilters'.
    Types of property 'draftYear' are incompatible.
      Type 'number | undefined' is not assignable to type 'number'.
        Type 'undefined' is not assignable to type 'number'.
src/application/prospect/services/ProspectService.ts(112,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/application/prospect/services/ProspectService.ts(279,31): error TS2554: Expected 1-2 arguments, but got 0.
src/application/prospect/services/ProspectService.ts(348,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/application/teamNeed/services/TeamNeedService.ts(34,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/application/teamNeed/services/TeamNeedService.ts(53,58): error TS2345: Argument of type '{ position?: string | undefined; draftYear?: number | undefined; teamId?: number | undefined; priority?: number | undefined; } | undefined' is not assignable to parameter of type 'TeamNeedFilters | undefined'.
  Type '{ position?: string | undefined; draftYear?: number | undefined; teamId?: number | undefined; priority?: number | undefined; }' is not assignable to type 'TeamNeedFilters'.
    Types of property 'draftYear' are incompatible.
      Type 'number | undefined' is not assignable to type 'number'.
        Type 'undefined' is not assignable to type 'number'.
src/application/teamNeed/services/TeamNeedService.ts(154,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/domain/prospect/entities/Prospect.ts(86,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/domain/prospect/entity/Prospect.ts(24,21): error TS1016: A required parameter cannot follow an optional parameter.
src/domain/teamNeed/entities/TeamNeed.ts(38,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/infrastructure/repositories/PrismaProspectRepository.ts(109,25): error TS2345: Argument of type '{ position: string; }' is not assignable to parameter of type 'ProspectFilters'.
  Property 'draftYear' is missing in type '{ position: string; }' but required in type 'ProspectFilters'.
src/infrastructure/repositories/PrismaProspectRepository.ts(113,25): error TS2345: Argument of type '{ college: string; }' is not assignable to parameter of type 'ProspectFilters'.
  Property 'draftYear' is missing in type '{ college: string; }' but required in type 'ProspectFilters'.
src/infrastructure/repositories/PrismaProspectRepository.ts(117,25): error TS2345: Argument of type '{ drafted: false; }' is not assignable to parameter of type 'ProspectFilters'.
  Property 'draftYear' is missing in type '{ drafted: false; }' but required in type 'ProspectFilters'.
src/infrastructure/repositories/PrismaProspectRepository.ts(121,11): error TS2741: Property 'draftYear' is missing in type '{ drafted: true; }' but required in type 'ProspectFilters'.
src/infrastructure/repositories/PrismaProspectRepository.ts(129,25): error TS2345: Argument of type '{ teamId: number; }' is not assignable to parameter of type 'ProspectFilters'.
  Property 'draftYear' is missing in type '{ teamId: number; }' but required in type 'ProspectFilters'.
src/infrastructure/repositories/PrismaProspectRepository.ts(161,11): error TS2741: Property 'draftYear' is missing in type '{}' but required in type 'ProspectFilters'.
src/modules/draftSimulator/infrastructure/persistence/prisma/PrismaTeamNeedRepository.ts(9,46): error TS2322: Type 'null' is not assignable to type 'number | IntFilter<"TeamNeed"> | undefined'.
src/modules/draftSimulator/infrastructure/persistence/prisma/PrismaTeamNeedRepository.ts(25,46): error TS2322: Type 'null' is not assignable to type 'number | IntFilter<"TeamNeed"> | undefined'.
src/modules/postDraftReport/infrastructure/PrismaPostDraftDataProvider.ts(64,58): error TS2322: Type 'null' is not assignable to type 'number | IntFilter<"TeamNeed"> | undefined'.
src/modules/teams/infrastructure/repositories/PrismaTeamNeedRepository.ts(27,16): error TS2353: Object literal may only specify known properties, and 'teamId_position' does not exist in type 'TeamNeedWhereUniqueInput'.
src/modules/teams/infrastructure/repositories/PrismaTeamNeedRepository.ts(32,9): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/modules/teams/infrastructure/repositories/PrismaTeamNeedRepository.ts(53,16): error TS2353: Object literal may only specify known properties, and 'teamId_position' does not exist in type 'TeamNeedWhereUniqueInput'.
src/presentation/controllers/ProspectController.ts(227,72): error TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number'.
  Type 'undefined' is not assignable to type 'number'.
