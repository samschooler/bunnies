# Store Configuration Guide

This document explains how the store configuration system works and how to modify it.

## Overview

The store configuration is defined in `packages/shared-types/src/storeConfig.ts` as a TypeScript object. It defines all available upgrades, their costs, effects, and premium colors.

## Structure

### Upgrades

Each upgrade in the `upgrades` object has the following structure:

```typescript
{
  name: string;              // Display name shown to users
  description: string;       // Description of what the upgrade does
  costFormula: {
    type: 'multiplier' | 'fixed';
    baseProperty?: string;   // Used with 'multiplier' type
    multiplier?: number;     // Used with 'multiplier' type
    fixedCost?: number;      // Used with 'fixed' type
  };
  effect: {
    property: string;        // Which player property to modify
    increment: number;       // How much to increase it by
  };
}
```

### Premium Colors

Each color in the `premiumColors` array has:

```typescript
{
  id: string;       // Unique identifier
  name: string;     // Display name
  color: string;    // Hex color code
  cost: number;     // Fixed cost in coins
}
```

## Cost Formulas

### Multiplier Type

The cost increases based on the current value of a player property.

**Formula:** `Math.floor(currentValue * multiplier)`

**Example:** Size upgrade
```typescript
costFormula: {
  type: 'multiplier',
  baseProperty: 'size',     // Read from player.size
  multiplier: 30            // Cost = floor(size * 30)
}
```

- At size 1.0: cost = 30 coins
- At size 1.2: cost = 36 coins
- At size 1.4: cost = 42 coins

This creates exponential scaling - the more you upgrade, the more expensive it gets.

### Fixed Type

The cost is always the same, regardless of player state.

**Example:** Hypothetical health upgrade
```typescript
costFormula: {
  type: 'fixed',
  fixedCost: 100
}
```

Always costs 100 coins, no matter how many times you buy it.

## Effects

The `effect` object determines what happens when a player purchases an upgrade.

```typescript
effect: {
  property: 'size',    // Which property on MovementPlayer to modify
  increment: 0.2       // How much to add to it
}
```

**Important:** The `property` must match a property name on the `MovementPlayer` class in `apps/server/src/games/MovementPlayer.ts`.

### Current Properties:
- `size` - Player visual size and collision radius
- `speedUpgrade` - Movement speed multiplier

## How to Add a New Upgrade

### 1. Add to the config

Edit `packages/shared-types/src/storeConfig.ts`:

```typescript
export const STORE_CONFIG: StoreConfig = {
  upgrades: {
    size: { /* existing */ },
    speed: { /* existing */ },
    // Add your new upgrade:
    health: {
      name: 'Health Upgrade',
      description: 'Increase your maximum health',
      costFormula: {
        type: 'multiplier',
        baseProperty: 'health',
        multiplier: 20
      },
      effect: {
        property: 'maxHealth',
        increment: 10
      }
    }
  },
  // ...
}
```

### 2. Add property to MovementPlayer

Edit `apps/server/src/games/MovementPlayer.ts`:

```typescript
export class MovementPlayer extends BasePlayer {
  public x: number;
  public y: number;
  // ... existing properties
  public maxHealth: number = 100;  // Add this

  // ... rest of class
}
```

### 3. Update getState() to include the property

Still in `MovementPlayer.ts`:

```typescript
getState(): MovementPlayerData {
  return {
    id: this.id,
    name: this.name,
    color: this.color,
    connected: this.connected,
    joinedAt: this.joinedAt,
    customData: {
      x: this.x,
      y: this.y,
      vx: this.vx,
      vy: this.vy,
      coins: this.coins,
      size: this.size,
      speed: this.speedUpgrade,
      maxHealth: this.maxHealth  // Add this
    }
  };
}
```

### 4. Update client types

Edit `apps/controller/src/components/GameController.tsx`:

```typescript
interface PlayerState {
  coins: number;
  size: number;
  speed: number;
  color: string;
  maxHealth: number;  // Add this
}
```

### 5. Update calculateUpgradeCost call

Make sure the property is passed to the cost calculator:

In `apps/server/src/games/MovementPlayer.ts`:

```typescript
const cost = calculateUpgradeCost(upgradeType, {
  size: this.size,
  speed: this.speedUpgrade,
  health: this.maxHealth  // Add this
});
```

### 6. Rebuild

```bash
npm run build
```

That's it! The new upgrade will automatically appear in the store UI.

## How to Add a New Premium Color

Simply add a new entry to the `premiumColors` array:

```typescript
premiumColors: [
  // ... existing colors
  {
    id: 'emerald',
    name: 'Emerald Green',
    color: '#50C878',
    cost: 75  // Can be any price
  }
]
```

Rebuild and the new color will appear in the store.

## Helper Function: calculateUpgradeCost()

This function is exported from `storeConfig.ts` and used by both client and server to calculate costs.

**Usage:**

```typescript
import { calculateUpgradeCost } from '@party-game/shared-types';

const cost = calculateUpgradeCost('size', {
  size: player.size,
  speed: player.speedUpgrade
});
```

It automatically applies the cost formula defined in the config.

## Client-Side Rendering

The client automatically renders all upgrades from the config:

```tsx
{Object.entries(STORE_CONFIG.upgrades).map(([key, upgrade]) => {
  const cost = calculateUpgradeCost(key, playerState);
  // ... render upgrade button with cost
})}
```

This means:
- No need to manually add UI for new upgrades
- UI automatically updates when config changes
- Cost calculations are always consistent

## File Locations

- **Config Definition**: `packages/shared-types/src/storeConfig.ts`
- **Server Logic**: `apps/server/src/games/MovementPlayer.ts` (purchaseUpgrade method)
- **Client UI**: `apps/controller/src/components/GameController.tsx`
- **Player Class**: `apps/server/src/games/MovementPlayer.ts`

## Examples

### Exponential Cost (Current Size/Speed)

```typescript
costFormula: {
  type: 'multiplier',
  baseProperty: 'size',
  multiplier: 30
}
```

Gets more expensive as you upgrade.

### Fixed Cost (Good for consumables)

```typescript
costFormula: {
  type: 'fixed',
  fixedCost: 50
}
```

Always the same price.

### Linear Increment

```typescript
effect: {
  property: 'size',
  increment: 0.2  // Add 0.2 each time
}
```

### Large Increment

```typescript
effect: {
  property: 'maxHealth',
  increment: 25  // Add 25 health each time
}
```

## Tips

1. **Balance**: Multiplier-based costs prevent players from becoming too powerful too quickly
2. **Fixed costs**: Good for sidegrades or cosmetic items
3. **Property names**: Must match exactly what's in the MovementPlayer class
4. **Type safety**: TypeScript will catch mistakes in property names during build
5. **Testing**: Change values and rebuild to test different balance configurations
