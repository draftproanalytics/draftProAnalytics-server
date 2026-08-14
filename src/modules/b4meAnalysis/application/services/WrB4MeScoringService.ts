import type {
  Big4MetricResult,
  CoachabilityTier,
  ContactArchetype,
  RfaTier,
  RvaTier,
  WrBaseScoreResult,
  WrCoachabilityResult,
  WrComputedEvaluation,
  WrDecisionTraceEntry,
  WrMetricsRecord,
  WrModifierResult,
  WrOptionalFilterResult,
  WrProspectRecord,
  WrProspectSearchFilters,
  WrRfaResult,
  WrRvaResult
} from '../../domain/contracts/WrFramework.types';

function round(value: number): number {
  return Number(value.toFixed(2));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export class WrB4MeScoringService {
  public compute(
    prospect: WrProspectRecord,
    metrics: WrMetricsRecord,
    filters: WrProspectSearchFilters
  ): WrComputedEvaluation {
    const base = this.buildBase(metrics);
    const modifiers = this.buildModifiers(metrics, base);
    const optionalFilters = this.buildOptionalFilters(metrics, modifiers.contactArchetype, filters);
    const coachability = this.buildCoachability(metrics, modifiers.contactArchetype, filters);
    const rfa = this.buildRfa(metrics, filters);

    const basePlusContextScore = round(
      base.baseScore +
      modifiers.mod1Delta +
      modifiers.mod2Delta +
      modifiers.mod3Delta +
      optionalFilters.competitionDelta +
      optionalFilters.injuryDelta +
      optionalFilters.qbOffenseDelta +
      optionalFilters.sampleSizeDelta +
      optionalFilters.archetypeConfidenceDelta
    );

    const developmentAdjustedScore = round(
      basePlusContextScore +
      (filters.enableCoachabilityAdjustment ? coachability.adjustment : 0) +
      (filters.enableRfaAdjustment ? rfa.adjustment : 0)
    );

    const rva = this.buildRva(developmentAdjustedScore, metrics, modifiers.contactArchetype, filters);

    const finalB4MeScore = filters.scoringMode === 'BASE_ONLY'
      ? round(base.baseScore + modifiers.mod1Delta + modifiers.mod2Delta + modifiers.mod3Delta)
      : filters.scoringMode === 'BASE_PLUS_CONTEXT'
        ? basePlusContextScore
        : round(developmentAdjustedScore + (filters.enableRvaAdjustment ? (rva.finalRvaScore - 3) * 0.35 : 0));

    const decisionTrace = this.buildDecisionTrace(base, modifiers, optionalFilters, coachability, rfa, rva, finalB4MeScore, filters);
    const scoreExplanation = this.buildScoreExplanation(prospect.playerName, finalB4MeScore, modifiers, coachability, rfa, rva, filters);
    const projectionNote = this.buildProjectionNote(modifiers.contactArchetype, coachability.tier, rfa.tier, rva.tier);

    return {
      rawMetrics: metrics,
      base,
      modifiers,
      optionalFilters,
      coachability,
      rfa,
      rva,
      decisionTrace,
      finalB4MeScore,
      scoreExplanation,
      projectionNote
    };
  }

  private buildBase(metrics: WrMetricsRecord): WrBaseScoreResult {
    const items: Big4MetricResult[] = [
      this.buildResearchIndicator(metrics, {
        key: 'YPRR',
        metricField: 'yprr',
        label: 'Yards Per Route Run',
        threshold: 3.0,
        comparison: '>=',
        value: metrics.yprr
      }),
      this.buildResearchIndicator(metrics, {
        key: 'PFF_GRADE',
        metricField: 'pffOverallGrade',
        label: 'PFF Overall Grade',
        threshold: 83.0,
        comparison: '>=',
        value: metrics.pffOverallGrade
      }),
      this.buildResearchIndicator(metrics, {
        key: 'CCR',
        metricField: 'contestedCatchRate',
        label: 'Contested Catch Rate',
        threshold: 50.0,
        comparison: '>=',
        value: metrics.contestedCatchRate
      }),
      this.buildResearchIndicator(metrics, {
        key: 'BLOS_RATE',
        metricField: 'behindLosTargetRate',
        label: 'Behind-LOS Target Rate',
        threshold: 18.0,
        comparison: '<',
        value: metrics.behindLosTargetRate
      })
    ];

    const sourceBackedItems = items.filter((item) => item.sourceBacked);
    const rawBoxCount = sourceBackedItems.filter((item) => item.passed === true).length;

    return {
      metricResults: items,
      rawBoxCount,
      availableMetricCount: sourceBackedItems.length,
      derivedMetricCount: items.filter((item) => item.status === 'DERIVED_ESTIMATE').length,
      baseScore: rawBoxCount
    };
  }

  private buildResearchIndicator(
    metrics: WrMetricsRecord,
    input: {
      readonly key: Big4MetricResult['key'];
      readonly metricField: Big4MetricResult['metricField'];
      readonly label: string;
      readonly threshold: number;
      readonly comparison: Big4MetricResult['comparison'];
      readonly value: number | null;
    }
  ): Big4MetricResult {
    if (input.value === null) {
      return { ...input, status: 'UNAVAILABLE', passed: null, sourceBacked: false };
    }

    const metadata = metrics.sourceMetadataJson;
    const isDerived = metadata?.derivedFields.includes(input.metricField) ?? false;
    if (isDerived) {
      return { ...input, status: 'DERIVED_ESTIMATE', passed: null, sourceBacked: false };
    }

    const isObserved = metadata?.observedFields.includes(input.metricField) ?? false;
    if (!isObserved) {
      return { ...input, status: 'UNVERIFIED', passed: null, sourceBacked: false };
    }

    const passed = input.comparison === '>='
      ? input.value >= input.threshold
      : input.value < input.threshold;

    return {
      ...input,
      status: passed ? 'HIT' : 'MISS',
      passed,
      sourceBacked: true
    };
  }

  private buildModifiers(metrics: WrMetricsRecord, base: WrBaseScoreResult): WrModifierResult {
    let mod1Delta = 0;
    let mod1Label = 'No Mod-1 adjustment.';

    const failedBlos = !(metrics.behindLosTargetRate !== null && metrics.behindLosTargetRate < 18.0);
    const contestedPass = (metrics.contestedCatchRate ?? 0) >= 50.0;

    if (failedBlos && contestedPass) {
      mod1Delta = 0.5;
      mod1Label = 'Mod-1 discounted the behind-LOS penalty because contested-catch strength suggests physical usage, not pure scheme dependency.';
    } else if (failedBlos && !contestedPass) {
      mod1Delta = -0.25;
      mod1Label = 'Mod-1 confirmed screen dependency risk because behind-LOS usage is high and contested-catch rate is weak.';
    } else if ((metrics.behindLosTargetRate ?? 100) < 15 && contestedPass) {
      mod1Delta = 0.25;
      mod1Label = 'Mod-1 premium profile: low schemed usage plus strong contested-catch results.';
    }

    const divergenceScore = metrics.pffRank !== null && metrics.yprrRank !== null
      ? metrics.yprrRank - metrics.pffRank
      : null;

    let mod2Delta = 0;
    let mod2Label = 'No Mod-2 divergence adjustment.';

    if (divergenceScore !== null && divergenceScore >= 5) {
      mod2Delta = 0.35;
      mod2Label = 'Mod-2 scheme-suppression signal: PFF rank outpaces YPRR rank by at least five slots.';
    } else if (divergenceScore !== null && divergenceScore <= -5) {
      mod2Delta = -0.35;
      mod2Label = 'Mod-2 scheme-inflation signal: YPRR rank materially outpaces PFF grade rank.';
    }

    const contactMetric = metrics.missedTacklesForcedPerReception;
    let contactArchetype: ContactArchetype = 'UNKNOWN';
    let mod3Delta = 0;
    let keyFlag: string | null = null;

    if (contactMetric !== null && contactMetric >= 0.18) {
      contactArchetype = 'CONTACT';
      mod3Delta = 0.35;
      keyFlag = 'Physical transferability advantage';
    } else if (contactMetric !== null && contactMetric <= 0.08) {
      contactArchetype = 'AVOIDANCE';
      mod3Delta = -0.35;
      keyFlag = 'Avoidance archetype / press survivability concern';
    } else if (contactMetric !== null) {
      contactArchetype = 'MIXED';
    }

    return {
      mod1Delta: round(mod1Delta),
      mod1Label,
      mod2Delta: round(mod2Delta),
      mod2Label,
      divergenceScore,
      mod3Delta: round(mod3Delta),
      contactArchetype,
      keyFlag,
      explanations: [mod1Label, mod2Label, keyFlag ?? 'No Mod-3 flag.']
    };
  }

  private buildOptionalFilters(
    metrics: WrMetricsRecord,
    contactArchetype: ContactArchetype,
    filters: WrProspectSearchFilters
  ): WrOptionalFilterResult {
    let competitionDelta = 0;
    let injuryDelta = 0;
    let qbOffenseDelta = 0;
    let sampleSizeDelta = 0;
    let archetypeConfidenceDelta = 0;
    const explanations: string[] = [];

    if (filters.enableCompetitionDiscount && metrics.competitionLevel === 'FCS') {
      competitionDelta = -0.35;
      explanations.push('Competition discount applied for FCS competition.');
    } else if (filters.enableCompetitionDiscount && metrics.competitionLevel === 'GROUP_OF_FIVE') {
      competitionDelta = -0.15;
      explanations.push('Light competition discount applied for Group of Five competition.');
    }

    const gamesPlayed = metrics.gamesPlayed ?? 0;
    const gamesMissed = metrics.gamesMissed ?? 0;
    if (filters.enableInjuryAvailabilityAdjustment && gamesPlayed > 0) {
      const availability = gamesPlayed / Math.max(1, gamesPlayed + gamesMissed);
      if (availability < 0.75) {
        injuryDelta = -0.3;
        explanations.push('Injury / availability penalty applied due to low seasonal availability.');
      }
    }

    if (filters.enableQbOffenseContextAdjustment && metrics.qbPlayQuality !== null) {
      if (metrics.qbPlayQuality <= 0.45) {
        qbOffenseDelta = 0.2;
        explanations.push('QB / offense context credit applied for weak passing environment.');
      } else if (metrics.qbPlayQuality >= 0.8) {
        qbOffenseDelta = -0.1;
        explanations.push('Minor QB / offense discount applied for favorable passing environment.');
      }
    }

    if (filters.enableSampleSizeAdjustment && (metrics.routesRun ?? 0) < 250) {
      sampleSizeDelta = -0.25;
      explanations.push('Sample-size penalty applied because routes run are below 250.');
    }

    if (
      filters.enableArchetypeConfidenceAdjustment &&
      contactArchetype === 'MIXED' &&
      ((metrics.slotRate ?? 0) > 60 || (metrics.boundaryRate ?? 0) < 20)
    ) {
      archetypeConfidenceDelta = -0.1;
      explanations.push('Archetype-confidence penalty applied because usage alignment clouds projection clarity.');
    }

    return {
      competitionDelta: round(competitionDelta),
      injuryDelta: round(injuryDelta),
      qbOffenseDelta: round(qbOffenseDelta),
      sampleSizeDelta: round(sampleSizeDelta),
      archetypeConfidenceDelta: round(archetypeConfidenceDelta),
      explanations
    };
  }

  private buildCoachability(
    metrics: WrMetricsRecord,
    contactArchetype: ContactArchetype,
    filters: WrProspectSearchFilters
  ): WrCoachabilityResult {
    const releaseDepth = metrics.releasePackageDepth ?? 0;
    const pressRate = metrics.pressManWinRate ?? 0;

    let tier: CoachabilityTier = 'NEUTRAL';
    let adjustment = 0;
    let pressManSurvivability = 'Unknown';
    let summary = 'Neutral coachability outlook.';

    if (contactArchetype === 'CONTACT' && (releaseDepth >= 3 || pressRate >= 0.55)) {
      tier = 'POSITIVE';
      adjustment = filters.enableCoachabilityAdjustment ? 0.45 : 0;
      pressManSurvivability = 'Promising';
      summary = 'Positive coachability: physical foundation exists and release/press indicators are workable.';
    } else if (contactArchetype === 'AVOIDANCE' && releaseDepth <= 1 && pressRate < 0.45) {
      tier = 'NEGATIVE';
      adjustment = filters.enableCoachabilityAdjustment ? -0.3 : 0;
      pressManSurvivability = 'Fragile';
      summary = 'Negative coachability: speed/avoidance profile still lacks strong press answers.';
    } else {
      pressManSurvivability = 'Developing';
    }

    return {
      tier,
      pressManSurvivability,
      adjustment: round(adjustment),
      summary
    };
  }

  private buildRfa(metrics: WrMetricsRecord, filters: WrProspectSearchFilters): WrRfaResult {
    const route = metrics.routeFamilyDiversity ?? 0;
    const role = metrics.rolePortabilityIndex ?? 0;
    const align = metrics.alignmentFlexibilityIndex ?? 0;
    const total = route + role + align;

    let tier: RfaTier = 'LOW';
    let adjustment = 0;
    let summary = 'Low route / role flexibility.';

    if (total >= 18) {
      tier = 'HIGH';
      adjustment = filters.enableRfaAdjustment ? 0.35 : 0;
      summary = 'High RFA: can survive alignment, route-family, and deployment changes.';
    } else if (total >= 11) {
      tier = 'MODERATE';
      adjustment = filters.enableRfaAdjustment ? 0.15 : 0;
      summary = 'Moderate RFA: some portability, but not completely scheme-proof.';
    }

    return {
      tier,
      adjustment: round(adjustment),
      summary
    };
  }

  private buildRva(
    developmentAdjustedScore: number,
    metrics: WrMetricsRecord,
    contactArchetype: ContactArchetype,
    filters: WrProspectSearchFilters
  ): WrRvaResult {
    const talent = clamp(developmentAdjustedScore, 0, 5);
    const fit = clamp(((metrics.boundaryRate ?? 0) >= 45 ? 4.0 : 3.1) + (contactArchetype === 'CONTACT' ? 0.35 : 0), 0, 5);
    const durability = clamp(5 - ((metrics.gamesMissed ?? 0) * 0.4), 0, 5);
    const roleUtility = clamp(((metrics.rolePortabilityIndex ?? 0) / 2.5), 0, 5);
    const costEfficiency = clamp(5 - Math.max(0, (metrics.pffRank ?? 20) / 10), 0, 5);
    const opportunityCost = clamp(contactArchetype === 'AVOIDANCE' ? 2.4 : 3.8, 0, 5);

    const finalRvaScore = round((talent * 0.28) + (fit * 0.18) + (durability * 0.16) + (roleUtility * 0.16) + (costEfficiency * 0.12) + (opportunityCost * 0.10));

    let tier: RvaTier = 'FIT_DEPENDENT';
    if (finalRvaScore >= 4.2) {
      tier = 'STRONG_VALUE';
    } else if (finalRvaScore >= 3.5) {
      tier = 'SOLID_VALUE';
    } else if (finalRvaScore < 2.8) {
      tier = 'WEAK_VALUE';
    }

    return {
      talent: round(talent),
      fit: round(fit),
      durability: round(durability),
      roleUtility: round(roleUtility),
      costEfficiency: round(costEfficiency),
      opportunityCost: round(opportunityCost),
      finalRvaScore,
      tier,
      summary: `${tier} based on talent-transfer, portability, availability, and draft-cost sensitivity.`,
      draftValueInterpretation: tier === 'STRONG_VALUE' ? 'Draftable above consensus if market allows.' : tier === 'WEAK_VALUE' ? 'Requires narrower cost window or role protection.' : 'Value depends on role and board texture.',
      opportunityCostSummary: opportunityCost < 3 ? 'Opportunity cost is elevated because the profile may require protection.' : 'Opportunity cost is manageable because the profile is more portable.',
      availabilitySummary: durability < 3 ? 'Availability profile needs caution.' : 'Availability profile is acceptable.',
      injuryHistorySummary: (metrics.gamesMissed ?? 0) >= 3 ? 'Missed-game history is meaningful enough to matter.' : 'No major missed-game warning from current inputs.',
      acquisitionCostSummary: costEfficiency < 3 ? 'Price may outrun clean value.' : 'Cost profile remains reasonable versus traits.',
      repeatExpenditureRisk: contactArchetype === 'AVOIDANCE' ? 'Higher repeat-expenditure risk if role insulation is required.' : 'Lower repeat-expenditure risk because the profile carries more portable traits.'
    };
  }

  private buildDecisionTrace(
    base: WrBaseScoreResult,
    modifiers: WrModifierResult,
    optionalFilters: WrOptionalFilterResult,
    coachability: WrCoachabilityResult,
    rfa: WrRfaResult,
    rva: WrRvaResult,
    finalB4MeScore: number,
    filters: WrProspectSearchFilters
  ): readonly WrDecisionTraceEntry[] {
    return [
      {
        stage: 'BASE_BIG4',
        label: 'Base Big 4',
        delta: round(base.baseScore),
        summary: `${base.rawBoxCount} of ${base.availableMetricCount} source-backed research thresholds met; ${base.derivedMetricCount} derived estimates excluded from HIT/MISS.`,
        details: base.metricResults.map((item) => `${item.label}: ${item.status} (${item.value ?? 'n/a'})`)
      },
      {
        stage: 'MOD_1',
        label: 'Mod-1',
        delta: modifiers.mod1Delta,
        summary: modifiers.mod1Label,
        details: [modifiers.mod1Label]
      },
      {
        stage: 'MOD_2',
        label: 'Mod-2',
        delta: modifiers.mod2Delta,
        summary: modifiers.mod2Label,
        details: [modifiers.mod2Label]
      },
      {
        stage: 'MOD_3',
        label: 'Mod-3',
        delta: modifiers.mod3Delta,
        summary: `Archetype: ${modifiers.contactArchetype}`,
        details: modifiers.explanations
      },
      {
        stage: 'OPTIONAL_LIMITATIONS',
        label: 'Optional Limitations',
        delta: round(
          optionalFilters.competitionDelta +
          optionalFilters.injuryDelta +
          optionalFilters.qbOffenseDelta +
          optionalFilters.sampleSizeDelta +
          optionalFilters.archetypeConfidenceDelta
        ),
        summary: 'Optional limitation corrections applied.',
        details: optionalFilters.explanations.length > 0 ? optionalFilters.explanations : ['No optional limitation corrections applied.']
      },
      {
        stage: 'COACHABILITY',
        label: 'Coachability',
        delta: filters.enableCoachabilityAdjustment ? coachability.adjustment : 0,
        summary: coachability.summary,
        details: [coachability.pressManSurvivability]
      },
      {
        stage: 'RFA',
        label: 'RFA',
        delta: filters.enableRfaAdjustment ? rfa.adjustment : 0,
        summary: rfa.summary,
        details: [rfa.summary]
      },
      {
        stage: 'RVA',
        label: 'RVA',
        delta: filters.enableRvaAdjustment ? round((rva.finalRvaScore - 3) * 0.35) : 0,
        summary: rva.summary,
        details: [rva.draftValueInterpretation, rva.opportunityCostSummary]
      },
      {
        stage: 'FINAL',
        label: 'Final',
        delta: finalB4MeScore,
        summary: `Final B4Me score ${finalB4MeScore}.`,
        details: [`RVA tier: ${rva.tier}`, `Projection: ${this.buildProjectionNote(modifiers.contactArchetype, coachability.tier, rfa.tier, rva.tier)}`]
      }
    ];
  }

  private buildScoreExplanation(
    playerName: string,
    finalB4MeScore: number,
    modifiers: WrModifierResult,
    coachability: WrCoachabilityResult,
    rfa: WrRfaResult,
    rva: WrRvaResult,
    filters: WrProspectSearchFilters
  ): string {
    return `${playerName} finished with a ${finalB4MeScore.toFixed(2)} B4Me score. Archetype: ${modifiers.contactArchetype}. Coachability: ${coachability.tier}. RFA: ${rfa.tier}. RVA: ${filters.enableRvaAdjustment ? rva.tier : 'deferred'}.`;
  }

  private buildProjectionNote(
    archetype: ContactArchetype,
    coachability: CoachabilityTier,
    rfa: RfaTier,
    rva: RvaTier
  ): string {
    if (rva === 'STRONG_VALUE' && archetype === 'CONTACT' && (rfa === 'HIGH' || coachability === 'POSITIVE')) {
      return 'portable';
    }

    if (rva === 'WEAK_VALUE') {
      return 'weak-value';
    }

    if (archetype === 'AVOIDANCE' && coachability === 'NEGATIVE') {
      return 'capped';
    }

    return 'fit-dependent';
  }
}
