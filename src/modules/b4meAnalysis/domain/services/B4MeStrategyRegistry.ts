import type { B4MePositionGroup } from '../enums/B4MeEnums';

export interface B4MePositionStrategy {
  readonly positionGroup: B4MePositionGroup;
  readonly frameworkType: string;
  supportsFullEnhancedEngine(): boolean;
}

export class WrB4MeStrategy implements B4MePositionStrategy {
  public readonly positionGroup: B4MePositionGroup = 'WR';
  public readonly frameworkType = 'ENHANCED_B4ME';

  public supportsFullEnhancedEngine(): boolean {
    return true;
  }
}

export class PlaceholderPositionStrategy implements B4MePositionStrategy {
  public constructor(
    public readonly positionGroup: B4MePositionGroup,
    public readonly frameworkType: string = 'POSITION_ENGINE_PLACEHOLDER'
  ) {}

  public supportsFullEnhancedEngine(): boolean {
    return false;
  }
}

export class B4MeStrategyRegistry {
  private readonly strategies = new Map<B4MePositionGroup, B4MePositionStrategy>();

  public register(strategy: B4MePositionStrategy): void {
    this.strategies.set(strategy.positionGroup, strategy);
  }

  public get(positionGroup: B4MePositionGroup): B4MePositionStrategy {
    const strategy = this.strategies.get(positionGroup);

    if (!strategy) {
      throw new Error(`No B4Me strategy registered for position group: ${positionGroup}`);
    }

    return strategy;
  }
}
