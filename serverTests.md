
> sports_mgmt_app-server@1.0.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.0.16 [39m[90m/home/dthompson/aiAssistWS/draftProAnalytics-server[39m

 [31m❯[39m src/modules/b4meAnalysis/__tests__/B4MeMethodologyService.test.ts [2m([22m[2m2 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 15[2mms[22m[39m
[31m     [31m×[31m builds filter badges and methodology metadata[39m[32m 12[2mms[22m[39m
     [32m✓[39m builds safe deferred team-context placeholder[32m 1[2mms[22m[39m
 [31m❯[39m src/modules/b4meAnalysis/__tests__/B4MeDeterministicScoreService.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 14[2mms[22m[39m
[31m     [31m×[31m builds a deterministic decision-view score when enabled[39m[32m 11[2mms[22m[39m
     [32m✓[39m returns enhanced score when decision view is disabled[32m 0[2mms[22m[39m
     [32m✓[39m labels scores consistently[32m 1[2mms[22m[39m
 [31m❯[39m tests/draftOrder.computeCurrent.idempotency.int.test.ts [2m([22m[2m1 test[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 432[2mms[22m[39m
[31m     [31m×[31m creates snapshot and returns same id on repeated execute (idempotent)[39m[33m 335[2mms[22m[39m
 [31m❯[39m tests/draftOrder.job.compute.current.int.test.ts [2m([22m[2m1 test[22m[2m)[22m[33m 451[2mms[22m[39m
     [33m[2m✓[22m[39m queues and runs DRAFT_ORDER_COMPUTE(current) and writes snapshotId to job result [33m 386[2mms[22m[39m
[90mstdout[2m | tests/draftOrder.persistence.int.test.ts[2m > [22m[2mDraftOrderSnapshot persistence (integration)[2m > [22m[2mcreates snapshot w/ entries+audits, prints assignments, and deletes with cascade
[22m[39m
[DraftOrder TEST] Planned assignments: [
  {
    draftSlot: [33m1[39m,
    teamId: [33m109[39m,
    teamName: [32m'TEST DraftOrder Team A msm14k53-k3kerxg8'[39m
  },
  {
    draftSlot: [33m2[39m,
    teamId: [33m110[39m,
    teamName: [32m'TEST DraftOrder Team B msm14k53-k3kerxg8'[39m
  }
]

[90mstdout[2m | tests/draftOrder.persistence.int.test.ts[2m > [22m[2mDraftOrderSnapshot persistence (integration)[2m > [22m[2mcreates snapshot w/ entries+audits, prints assignments, and deletes with cascade
[22m[39m[DraftOrder TEST] Persisted snapshot id: [33m52[39m
[DraftOrder TEST] Persisted assignments: [
  {
    draftSlot: [33m1[39m,
    teamId: [33m109[39m,
    teamName: [32m'TEST DraftOrder Team A msm14k53-k3kerxg8'[39m,
    audits: [33m1[39m
  },
  {
    draftSlot: [33m2[39m,
    teamId: [33m110[39m,
    teamName: [32m'TEST DraftOrder Team B msm14k53-k3kerxg8'[39m,
    audits: [33m1[39m
  }
]

 [32m✓[39m tests/draftOrder.persistence.int.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 176[2mms[22m[39m
 [32m✓[39m tests/postDraftReport/EvaluateWrProspectService.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/espn/espnPlayers.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 43[2mms[22m[39m
 [32m✓[39m tests/postDraftMetrics/WrMetricValidation.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 4[2mms[22m[39m
 [32m✓[39m tests/postDraftMetrics/CsvWrMetricParser.test.ts [2m([22m[2m2 tests[22m[2m)[22m[32m 4[2mms[22m[39m

[2m Test Files [22m [1m[31m7 failed[39m[22m[2m | [22m[1m[32m5 passed[39m[22m[90m (12)[39m
[2m      Tests [22m [1m[31m3 failed[39m[22m[2m | [22m[1m[32m14 passed[39m[22m[90m (17)[39m
[2m   Start at [22m 11:41:02
[2m   Duration [22m 1.85s[2m (transform 950ms, setup 0ms, import 1.76s, tests 1.15s, environment 2ms)[22m

