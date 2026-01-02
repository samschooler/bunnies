# Diagonal Movement Controller Design

**Date:** 2025-12-31
**Target:** Touch/mouse D-pad controller
**Goal:** Enable diagonal movement by allowing multiple arrow buttons to be pressed simultaneously

## Problem

The current controller implementation only supports single-direction movement because it tracks one active direction at a time using a single state variable. When a user presses a second button, it replaces the first direction rather than combining them.

## Solution Overview

Replace single-direction tracking with multi-button tracking using a Set. This allows the controller to maintain state for all currently pressed buttons and calculate a combined velocity vector that supports eight-directional movement (four cardinal + four diagonal).

## Implementation Details

### 1. State Management

**Current:**
```typescript
const [activeDirection, setActiveDirection] = useState<string | null>(null);
```

**New:**
```typescript
const [activeDirections, setActiveDirections] = useState<Set<string>>(new Set());
```

This Set tracks all currently pressed direction buttons by name ("up", "down", "left", "right").

### 2. Event Handlers

**Direction Start Handler:**
```typescript
const handleDirectionStart = (dx: number, dy: number, direction: string) => {
  setActiveDirections(prev => new Set(prev).add(direction));
};
```

**Direction End Handler:**
```typescript
const handleDirectionEnd = (direction: string) => {
  setActiveDirections(prev => {
    const next = new Set(prev);
    next.delete(direction);
    return next;
  });
};
```

### 3. Vector Calculation

A `useEffect` recalculates the input vector whenever `activeDirections` changes:

```typescript
useEffect(() => {
  let dx = 0, dy = 0;

  if (activeDirections.has('up')) dy -= 1;
  if (activeDirections.has('down')) dy += 1;
  if (activeDirections.has('left')) dx -= 1;
  if (activeDirections.has('right')) dx += 1;

  // Normalize diagonal movement to match cardinal speed
  if (dx !== 0 && dy !== 0) {
    const norm = Math.sqrt(2);
    dx /= norm;
    dy /= norm;
  }

  currentInputRef.current = { dx, dy };
}, [activeDirections]);
```

**Speed normalization:** Diagonal vectors are scaled by 1/√2 ≈ 0.707 so that diagonal movement speed matches cardinal movement speed. Without normalization, diagonal movement would be √2 ≈ 1.41 times faster.

### 4. Button Updates

Each button's event handlers pass the direction identifier:

```typescript
<button
  className={`dpad-button up ${activeDirections.has('up') ? 'active' : ''}`}
  onTouchStart={() => handleDirectionStart(0, -1, 'up')}
  onTouchEnd={() => handleDirectionEnd('up')}
  onMouseDown={() => handleDirectionStart(0, -1, 'up')}
  onMouseUp={() => handleDirectionEnd('up')}
  onMouseLeave={() => handleDirectionEnd('up')}
>
  ▲
</button>
```

This pattern applies to all four directional buttons.

## Behavior

### Supported Directions
- **Cardinal:** Up, Down, Left, Right (when single button pressed)
- **Diagonal:** Up-Left, Up-Right, Down-Left, Down-Right (when two adjacent buttons pressed)

### Edge Cases
- Opposite directions (Up+Down or Left+Right) cancel out to zero movement
- Pressing 3+ buttons calculates the vector sum (e.g., Up+Down+Right = Right)
- All directions have equal speed due to normalization

## Files Modified

- `apps/controller/src/components/GameController.tsx` - All changes contained in this single file

## Testing Considerations

- Touch: Press two adjacent D-pad buttons simultaneously
- Mouse: Not truly simultaneous, but releasing one button while another is pressed should maintain movement in the remaining direction
- Verify diagonal speed matches cardinal speed visually
- Confirm opposite directions cancel properly
