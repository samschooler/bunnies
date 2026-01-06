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

export interface PlaceableItem {
  id: string;           // e.g., 'grass-rock'
  name: string;         // Display name
  description: string;  // Description for UI
  cost: number;         // Coin cost
  spritesheet: string;  // e.g., 'grass-biom-sprites'
  frame?: number;       // Sprite frame index (alternative to column/row)
  column?: number;      // Column in spritesheet (0-indexed)
  row?: number;         // Row in spritesheet (0-indexed)
  columns?: number;     // Total columns in spritesheet (for frame calculation from column/row)
  color?: string;       // Optional color tint (hex color)
  alwaysUnderPlayer?: boolean; // If true, always render below player (default: false = depth sort)
}

export interface PlacedObject {
  id: string;           // Unique ID (e.g., 'obj-123')
  itemId: string;       // References PlaceableItem.id
  x: number;            // World X position
  y: number;            // World Y position
  mapId: string;        // 'main' or 'interior-{playerId}'
  placedBy: string;     // Player ID
  placedAt: number;     // Timestamp
}

export interface StoreConfig {
  upgrades: Record<string, Upgrade>;
  premiumColors: PremiumColor[];
  placeableItems: PlaceableItem[];
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
  ],
  placeableItems: [
    {
      id: 'decorative-mushroom',
      name: 'Decorative Mushroom',
      description: 'A nice mushroom for your farm',
      cost: 5,
      spritesheet: 'grass-biom-sprites',
      column: 7,
      row: 0,
      columns: 9, // Basic_Grass_Biom_things is 9x5 grid
      alwaysUnderPlayer: true
    },
    {
      id: 'decorative-yellow-flower',
      name: 'Yellow Flower',
      description: 'The cutest flower in the world',
      cost: 10,
      spritesheet: 'grass-biom-sprites',
      column: 7,
      row: 2,
      columns: 9, // Basic_Grass_Biom_things is 9x5 grid
      alwaysUnderPlayer: true
    },
    {
      id: 'decorative-pink-flower',
      name: 'Yellow Flower',
      description: 'The cutest flower in the world',
      cost: 10,
      spritesheet: 'grass-biom-sprites',
      column: 7,
      row: 3,
      columns: 9, // Basic_Grass_Biom_things is 9x5 grid
      alwaysUnderPlayer: true
    },
    {
      id: 'decorative-rock',
      name: 'Decorative Rock',
      description: 'A nice rock for your farm',
      cost: 100,
      spritesheet: 'grass-biom-sprites',
      column: 8,
      row: 1,
      columns: 9, // Basic_Grass_Biom_things is 9x5 grid
      alwaysUnderPlayer: true
    },
    {
      id: 'wooden-chair',
      name: 'Wooden Chair',
      description: 'A cozy chair for your home',
      cost: 50,
      spritesheet: 'basic-furniture-sprites',
      column: 2,
      row: 6,
      columns: 6, // Basic_Furniture is 6 columns wide
      alwaysUnderPlayer: false // Depth-sorts with player
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
