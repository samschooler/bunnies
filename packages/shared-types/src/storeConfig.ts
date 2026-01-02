export interface CostFormula {
  type: 'multiplier' | 'fixed';
  baseProperty?: string;
  multiplier?: number;
  fixedCost?: number;
}

export interface UpgradeEffect {
  property: string;
  increment: number;
}

export interface Upgrade {
  name: string;
  description: string;
  costFormula: CostFormula;
  effect: UpgradeEffect;
}

export interface PremiumColor {
  id: string;
  name: string;
  color: string;
  cost: number;
}

export interface StoreConfig {
  upgrades: Record<string, Upgrade>;
  premiumColors: PremiumColor[];
}

export const STORE_CONFIG: StoreConfig = {
  upgrades: {
    size: {
      name: 'Size Upgrade',
      description: 'Increase your player size',
      costFormula: {
        type: 'multiplier',
        baseProperty: 'size',
        multiplier: 30
      },
      effect: {
        property: 'size',
        increment: 0.2
      }
    },
    speed: {
      name: 'Speed Upgrade',
      description: 'Increase your movement speed',
      costFormula: {
        type: 'multiplier',
        baseProperty: 'speed',
        multiplier: 25
      },
      effect: {
        property: 'speedUpgrade',
        increment: 0.2
      }
    }
  },
  premiumColors: [
    {
      id: 'gold',
      name: 'Gold',
      color: '#FFD700',
      cost: 50
    },
    {
      id: 'purple',
      name: 'Purple',
      color: '#9B59B6',
      cost: 50
    },
    {
      id: 'cyan',
      name: 'Cyan',
      color: '#00CED1',
      cost: 50
    },
    {
      id: 'hotpink',
      name: 'Hot Pink',
      color: '#FF69B4',
      cost: 50
    },
    {
      id: 'lime',
      name: 'Lime',
      color: '#32CD32',
      cost: 50
    }
  ]
};

/**
 * Calculate the cost of an upgrade based on the current player state
 */
export function calculateUpgradeCost(
  upgradeType: string,
  playerState: Record<string, any>
): number {
  const upgrade = STORE_CONFIG.upgrades[upgradeType];
  if (!upgrade) return 0;

  const formula = upgrade.costFormula;
  if (formula.type === 'fixed') {
    return formula.fixedCost || 0;
  } else if (formula.type === 'multiplier' && formula.baseProperty) {
    const baseValue = playerState[formula.baseProperty] || 1;
    return Math.floor(baseValue * (formula.multiplier || 1));
  }
  return 0;
}
