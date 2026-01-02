# Sprite-Based Directional Animation Design

**Date:** 2026-01-02
**Status:** Approved

## Overview

Replace the current circle-based player rendering with animated sprite characters using the "Basic Charakter Spritesheet.png" from the Sprout Lands asset pack. Players will display directional walking animations that respond to movement with pixel-perfect rendering.

## Requirements

- Use Basic Charakter Spritesheet (192x192, 4×4 grid, 48px per frame)
- Character sprite is 16×16 within each frame (significant padding)
- Render at 2x scale (32px) with no anti-aliasing
- Support 4 directions: down, up, left, right
- 2 animation states per direction: idle (frames 0-1) and walk (frames 2-3)
- Animation speed tied to player movement speed
- Horizontal direction prioritized for diagonal movement
- Text positioned above sprite
- Remove particle trail effects

## Spritesheet Layout

```
Row 0 (frames 0-3):   Walking down  [idle, idle, walk, walk]
Row 1 (frames 4-7):   Walking up    [idle, idle, walk, walk]
Row 2 (frames 8-11):  Walking left  [idle, idle, walk, walk]
Row 3 (frames 12-15): Walking right [idle, idle, walk, walk]
```

Each frame: 48×48 pixels
Character size: 16×16 pixels (centered with padding)

## Architecture Changes

### 1. Sprite Loading (MainScene.preload)

```typescript
preload() {
  this.load.spritesheet('character',
    '/assets/sprout-land/Characters/Basic Charakter Spritesheet.png', {
    frameWidth: 48,
    frameHeight: 48
  });
  this.textures.get('character').setFilter(Phaser.Textures.FilterMode.NEAREST);
}
```

**Key settings:**
- `frameWidth/frameHeight: 48` - matches spritesheet grid
- `FilterMode.NEAREST` - disables anti-aliasing for pixel-perfect rendering

### 2. Animation Configuration (MainScene.create)

Create 8 animations total:

**Idle animations** (2 frames each, slow loop):
- `idle-down`: frames [0, 1]
- `idle-up`: frames [4, 5]
- `idle-left`: frames [8, 9]
- `idle-right`: frames [12, 13]

**Walk animations** (2 frames each, speed-based):
- `walk-down`: frames [2, 3]
- `walk-up`: frames [6, 7]
- `walk-left`: frames [10, 11]
- `walk-right`: frames [14, 15]

Base frame rate: 8 fps (adjusted dynamically based on velocity)

### 3. Player Container Updates

**Updated PlayerContainer interface:**
```typescript
interface PlayerContainer {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;  // replaces circle
  nameText: Phaser.GameObjects.Text;
  coinText: Phaser.GameObjects.Text;
  currentDirection: string;  // tracks facing direction
}
```

**Removed:**
- `circle: Phaser.GameObjects.Arc`
- `particles: Phaser.GameObjects.Particles.ParticleEmitter`
- Particle texture generation
- All particle-related updates

**Container structure:**
```
Container (x, y from player position)
├─ Sprite (scale: 2.0, origin: 0.5, 0.5)
├─ Name Text (y: -sprite.height/2 - nameHeight)
└─ Coin Text (y: nameY - 16)
```

## Animation Logic

### Direction Determination

Prioritize horizontal direction when moving diagonally:

```typescript
let direction = currentDirection; // preserve last direction

if (vx !== 0) {
  direction = vx > 0 ? 'right' : 'left';
} else if (vy !== 0) {
  direction = vy > 0 ? 'down' : 'up';
}
```

### State Selection

```typescript
const speed = Math.sqrt(vx * vx + vy * vy);
const movementThreshold = 1; // pixels per second

const state = speed > movementThreshold ? 'walk' : 'idle';
const animationKey = `${state}-${direction}`;
```

### Dynamic Frame Rate

Tie animation speed to movement velocity:

```typescript
const baseFrameRate = 8; // fps at max speed
const normalizedSpeed = Math.min(speed / maxSpeed, 1);
const frameRate = Math.max(2, normalizedSpeed * baseFrameRate);

sprite.anims.play(animationKey, true);
sprite.anims.setTimeScale(frameRate / baseFrameRate);
```

Faster movement = faster animation, minimum 2 fps for slow movement.

## Rendering Details

### Pixel-Perfect Settings
- Scale: 2.0 (fixed, independent of size upgrades)
- Filter: NEAREST (no anti-aliasing)
- Origin: 0.5, 0.5 (centered in container)
- Rendered size: 32×32 pixels (from 16×16 character)

### Text Layout
- Name text: above sprite, centered
- Coin text: above name text, centered
- Both use semi-transparent black backgrounds
- Y positions calculated relative to sprite height

### Visual Effects
**Retained:**
- Smooth movement tweens (100ms linear)
- Alpha transparency for disconnected players (0.5 opacity)
- Coin counter updates

**Removed:**
- Particle trails
- Color-based player differentiation (all use same sprite)
- Size-based visual scaling (size upgrades no longer affect rendered size)

## Edge Cases & Behavior

### Spawning
- Default animation: `idle-down`
- Initial direction: 'down'

### Zero Velocity
- Continue showing last direction's idle animation
- Preserve direction state between movements

### Size Upgrades
- Sprite scale remains 2.0 (visual size no longer changes)
- Size upgrades affect gameplay (collision, etc.) but not sprite rendering

### Color Changes
- Sprite color comes from spritesheet (fixed)
- Player color property no longer affects visual appearance
- Could be used for UI elements (name background tint, etc.)

### Disconnected Players
- Still rendered with 0.5 alpha
- Animations continue to play based on last state

## Migration Notes

### Breaking Changes
- Player visual size no longer tied to size upgrade value
- Player colors no longer visible (all use same sprite)
- Particle trails removed

### Preserved Behavior
- Movement physics unchanged
- Text labels unchanged (repositioned only)
- Coin collection visual feedback unchanged
- Smooth movement tweening unchanged

## Future Enhancements (Out of Scope)

- Multiple character sprites with color variations
- Player skin/costume selection
- Footstep particle effects or dust clouds
- Attack/action animations
- Emotion/emote animations above players
