
> sports_mgmt_app-server@1.0.0 build
> tsc -p tsconfig.server.json && tsc-alias -p tsconfig.server.json && echo "✅ build ok" && ls -la dist | head

src/application/teamNeed/services/TeamNeedService.ts(34,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/application/teamNeed/services/TeamNeedService.ts(53,58): error TS2345: Argument of type '{ position?: string | undefined; draftYear?: number | undefined; teamId?: number | undefined; priority?: number | undefined; } | undefined' is not assignable to parameter of type 'TeamNeedFilters | undefined'.
  Type '{ position?: string | undefined; draftYear?: number | undefined; teamId?: number | undefined; priority?: number | undefined; }' is not assignable to type 'TeamNeedFilters'.
    Types of property 'draftYear' are incompatible.
      Type 'number | undefined' is not assignable to type 'number'.
        Type 'undefined' is not assignable to type 'number'.
src/domain/prospect/entities/Prospect.ts(225,5): error TS2322: Type 'number | null | undefined' is not assignable to type 'number | null'.
  Type 'undefined' is not assignable to type 'number | null'.
src/domain/prospect/entities/Prospect.ts(464,7): error TS2322: Type 'number | null | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/domain/teamNeed/entities/TeamNeed.ts(38,7): error TS2322: Type 'number | undefined' is not assignable to type 'number'.
  Type 'undefined' is not assignable to type 'number'.
src/modules/teams/domain/services/TeamNeedsAnalyzerService.ts(63,11): error TS2322: Type 'number | null' is not assignable to type 'number'.
  Type 'null' is not assignable to type 'number'.
