# Sprite Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace circle-based player rendering with animated sprite characters using directional walking animations.

**Architecture:** Add Phaser spritesheet loading, create 8 directional animations (idle/walk × 4 directions), replace circle sprites with animated character sprites in player containers, implement dynamic animation selection based on velocity and direction.

**Tech Stack:** Phaser 3, TypeScript, Sprout Lands sprite assets

---

## Task 1: Add Spritesheet Loading

**Files:**
- Modify: `apps/game-display/src/scenes/MainScene.ts:33-35`

**Step 1: Add preload method to MainScene**

Add the preload method above the `create()` method:

```typescript
preload() {
  this.load.spritesheet('character',
    '/assets/sprout-land/Characters/Basic Charakter Spritesheet.png', {
    frameWidth: 48,
    frameHeight: 48
  });
}
```

**Step 2: Verify spritesheet loads in browser**

Action: Start dev server and check browser console
Run: `cd apps/game-display && npm run dev`
Expected: No errors, spritesheet loads successfully

**Step 3: Set pixel-perfect rendering filter**

Add to the end of the `preload()` method:

```typescript
// Set pixel-perfect filter after load
this.load.on('complete', () => {
  this.textures.get('character').setFilter(Phaser.Textures.FilterMode.NEAREST);
});
```

**Step 4: Commit spritesheet loading**

```bash
git add apps/game-display/src/scenes/MainScene.ts
git commit -m "feat: add character spritesheet loading with pixel-perfect filter"
```

---

## Task 2: Create Animation Definitions

**Files:**
- Modify: `apps/game-display/src/scenes/MainScene.ts:37-59`

**Step 1: Add createAnimations method**

Add this private method after `createGrid()`:

```typescript
private createAnimations(): void {
  // Idle animations (frames 0-1 of each row)
  this.anims.create({
    key: 'idle-down',
    frames: this.anims.generateFrameNumbers('character', { start: 0, end: 1 }),
    frameRate: 4,
    repeat: -1
  });

  this.anims.create({
    key: 'idle-up',
    frames: this.anims.generateFrameNumbers('character', { start: 4, end: 5 }),
    frameRate: 4,
    repeat: -1
  });

  this.anims.create({
    key: 'idle-left',
    frames: this.anims.generateFrameNumbers('character', { start: 8, end: 9 }),
    frameRate: 4,
    repeat: -1
  });

  this.anims.create({
    key: 'idle-right',
    frames: this.anims.generateFrameNumbers('character', { start: 12, end: 13 }),
    frameRate: 4,
    repeat: -1
  });

  // Walk animations (frames 2-3 of each row)
  this.anims.create({
    key: 'walk-down',
    frames: this.anims.generateFrameNumbers('character', { start: 2, end: 3 }),
    frameRate: 8,
    repeat: -1
  });

  this.anims.create({
    key: 'walk-up',
    frames: this.anims.generateFrameNumbers('character', { start: 6, end: 7 }),
    frameRate: 8,
    repeat: -1
  });

  this.anims.create({
    key: 'walk-left',
    frames: this.anims.generateFrameNumbers('character', { start: 10, end: 11 }),
    frameRate: 8,
    repeat: -1
  });

  this.anims.create({
    key: 'walk-right',
    frames: this.anims.generateFrameNumbers('character', { start: 14, end: 15 }),
    frameRate: 8,
    repeat: -1
  });
}
```

**Step 2: Call createAnimations in create method**

Add this line in `create()` after `createGrid()` and before the event listener:

```typescript
this.createAnimations();
```

**Step 3: Verify animations are created**

Action: Check browser console for animation creation
Expected: No errors, 8 animations registered

**Step 4: Commit animation definitions**

```bash
git add apps/game-display/src/scenes/MainScene.ts
git commit -m "feat: add sprite animations for idle and walk states"
```

---

## Task 3: Update PlayerContainer Interface

**Files:**
- Modify: `apps/game-display/src/scenes/MainScene.ts:21-27`

**Step 1: Replace interface with sprite-based version**

Replace the entire `PlayerContainer` interface:

```typescript
interface PlayerContainer {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  coinText: Phaser.GameObjects.Text;
  currentDirection: string;
}
```

**Step 2: Verify TypeScript compiles**

Action: Check for TypeScript errors
Expected: Errors in createPlayerSprite and updatePlayerSprite (will fix in next tasks)

**Step 3: Commit interface update**

```bash
git add apps/game-display/src/scenes/MainScene.ts
git commit -m "refactor: update PlayerContainer interface for sprite rendering"
```

---

## Task 4: Update createPlayerSprite Method

**Files:**
- Modify: `apps/game-display/src/scenes/MainScene.ts:126-172`

**Step 1: Remove particle texture generation from create()**

In the `create()` method, delete these lines:

```typescript
// Create particle texture
const graphics = this.add.graphics();
graphics.fillStyle(0xffffff, 1);
graphics.fillCircle(4, 4, 4);
graphics.generateTexture('particle', 8, 8);
graphics.destroy();
```

**Step 2: Replace createPlayerSprite implementation**

Replace the entire `createPlayerSprite` method:

```typescript
private createPlayerSprite(player: MovementPlayerData): void {
  const container = this.add.container(
    player.customData.x,
    player.customData.y
  );

  // Create animated sprite
  const sprite = this.add.sprite(0, 0, 'character');
  sprite.setScale(2.0); // 2x scale for pixel art
  sprite.setOrigin(0.5, 0.5);
  sprite.play('idle-down'); // Default animation

  // Calculate sprite dimensions for text positioning
  const spriteHeight = sprite.displayHeight;

  // Name text (positioned above the sprite)
  const nameY = -(spriteHeight / 2) - 8;
  const nameText = this.add.text(0, nameY, player.name, {
    fontSize: '14px',
    color: '#ffffff',
    backgroundColor: '#00000088',
    padding: { x: 4, y: 2 }
  });
  nameText.setOrigin(0.5, 1); // Bottom-center origin

  // Coin counter text (above name text)
  const coinY = nameY - 16;
  const coinText = this.add.text(0, coinY, `Coins: ${player.customData.coins}`, {
    fontSize: '12px',
    color: '#FFD700',
    backgroundColor: '#00000088',
    padding: { x: 4, y: 2 }
  });
  coinText.setOrigin(0.5, 1); // Bottom-center origin

  container.add([sprite, nameText, coinText]);

  this.playerSprites.set(player.id, {
    container,
    sprite,
    nameText,
    coinText,
    currentDirection: 'down'
  });
}
```

**Step 3: Verify TypeScript compiles**

Action: Check for TypeScript errors
Expected: No interface errors for createPlayerSprite

**Step 4: Test player sprite creation**

Action: View in browser, check that player sprites render
Expected: See animated character sprites instead of circles

**Step 5: Commit sprite creation changes**

```bash
git add apps/game-display/src/scenes/MainScene.ts
git commit -m "feat: replace circle rendering with animated sprites in createPlayerSprite"
```

---

## Task 5: Update updatePlayerSprite Method

**Files:**
- Modify: `apps/game-display/src/scenes/MainScene.ts:174-215`

**Step 1: Replace updatePlayerSprite implementation**

Replace the entire `updatePlayerSprite` method:

```typescript
private updatePlayerSprite(player: MovementPlayerData): void {
  const playerData = this.playerSprites.get(player.id);
  if (!playerData) return;

  const { container, sprite, coinText, currentDirection } = playerData;

  // Smooth movement using tweens
  this.tweens.add({
    targets: container,
    x: player.customData.x,
    y: player.customData.y,
    duration: 100,
    ease: 'Linear'
  });

  // Calculate velocity magnitude
  const speed = Math.sqrt(
    player.customData.vx * player.customData.vx +
    player.customData.vy * player.customData.vy
  );

  // Determine direction (prioritize horizontal)
  let direction = currentDirection;
  if (player.customData.vx !== 0) {
    direction = player.customData.vx > 0 ? 'right' : 'left';
  } else if (player.customData.vy !== 0) {
    direction = player.customData.vy > 0 ? 'down' : 'up';
  }

  // Store the new direction
  playerData.currentDirection = direction;

  // Determine animation state
  const movementThreshold = 1;
  const state = speed > movementThreshold ? 'walk' : 'idle';
  const animationKey = `${state}-${direction}`;

  // Play animation if different from current
  if (sprite.anims.currentAnim?.key !== animationKey) {
    sprite.play(animationKey, true);
  }

  // Adjust animation speed based on velocity
  if (state === 'walk') {
    const maxSpeed = 250; // Should match MovementPlayer.baseMaxSpeed
    const normalizedSpeed = Math.min(speed / maxSpeed, 1);
    const baseFrameRate = 8;
    const frameRate = Math.max(2, normalizedSpeed * baseFrameRate);
    sprite.anims.setTimeScale(frameRate / baseFrameRate);
  }

  // Update coin counter
  coinText.setText(`Coins: ${player.customData.coins}`);

  // Update opacity based on connection status
  container.setAlpha(player.connected ? 1 : 0.5);
}
```

**Step 2: Verify TypeScript compiles**

Action: Check for TypeScript errors
Expected: No errors

**Step 3: Test animation switching**

Action: Move player in browser, verify animations change based on direction
Expected: Character faces direction of movement, animates when moving

**Step 4: Commit animation logic**

```bash
git add apps/game-display/src/scenes/MainScene.ts
git commit -m "feat: implement directional animation logic in updatePlayerSprite"
```

---

## Task 6: Clean Up Player Removal

**Files:**
- Modify: `apps/game-display/src/scenes/MainScene.ts:92-99`

**Step 1: Remove particle cleanup from handleStateUpdate**

In the `handleStateUpdate` method, update the player removal code:

Replace:
```typescript
this.playerSprites.forEach((playerData, playerId) => {
  if (!players[playerId]) {
    playerData.container.destroy();
    playerData.particles.destroy();
    this.playerSprites.delete(playerId);
  }
});
```

With:
```typescript
this.playerSprites.forEach((playerData, playerId) => {
  if (!players[playerId]) {
    playerData.container.destroy();
    this.playerSprites.delete(playerId);
  }
});
```

**Step 2: Verify TypeScript compiles**

Action: Check for TypeScript errors
Expected: No errors, all particle references removed

**Step 3: Test player disconnect**

Action: Disconnect a player in browser
Expected: Player sprite removed cleanly without errors

**Step 4: Commit cleanup**

```bash
git add apps/game-display/src/scenes/MainScene.ts
git commit -m "refactor: remove particle system from player cleanup"
```

---

## Task 7: Final Testing & Verification

**Files:**
- None (testing only)

**Step 1: Test all player states**

Action: Test in browser
- Join with multiple players
- Move in all 4 directions
- Stop moving (idle animation)
- Move diagonally (horizontal priority)
- Disconnect player
- Collect coins

Expected: All animations work correctly, no console errors

**Step 2: Verify pixel-perfect rendering**

Action: Inspect sprites in browser
Expected: Sharp pixel edges, no blurring or anti-aliasing

**Step 3: Test animation speed scaling**

Action: Move at different speeds
Expected: Faster movement = faster animation, minimum framerate maintained

**Step 4: Visual regression check**

Verify:
- Text positioned above sprites
- Coin counter updates
- Disconnected players show at 50% opacity
- Smooth movement tweening
- No particle trails

**Step 5: Create final commit if needed**

If any small adjustments were made during testing:

```bash
git add .
git commit -m "fix: minor adjustments from sprite animation testing"
```

---

## Summary of Changes

**Files Modified:**
- `apps/game-display/src/scenes/MainScene.ts`

**Lines Changed:**
- Added `preload()` method (~10 lines)
- Added `createAnimations()` method (~60 lines)
- Updated `PlayerContainer` interface (~5 lines)
- Removed particle texture generation (~6 lines)
- Replaced `createPlayerSprite()` (~35 lines)
- Replaced `updatePlayerSprite()` (~50 lines)
- Updated player cleanup (~5 lines)

**Total:** ~165 lines changed/added, ~50 lines removed

**Breaking Changes:**
- Player colors no longer visible (all use same sprite)
- Player size upgrades no longer affect visual size
- Particle trails removed

**Testing Checklist:**
- [ ] Spritesheet loads without errors
- [ ] All 8 animations created successfully
- [ ] Players spawn with idle-down animation
- [ ] Direction changes when moving
- [ ] Idle animation when stopped
- [ ] Walk animation when moving
- [ ] Animation speed scales with velocity
- [ ] Horizontal direction prioritized for diagonals
- [ ] Text positioned above sprite
- [ ] Coins counter updates
- [ ] Disconnected players at 50% opacity
- [ ] No anti-aliasing on sprites
- [ ] No console errors
