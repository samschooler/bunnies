# Tileset Reference Guide

## Grass.png Tileset
**Dimensions**: 176x112 pixels (11 columns × 7 rows = 77 tiles)
**Tile size**: 16x16 pixels
**First GID**: 1

### Tile Layout (Row × Column = GID)

```
Row 0 (GIDs 1-11):
  Col 0 (GID 1):   Solid grass tile
  Col 1 (GID 2):   Grass with small stones/dots - variant 1
  Col 2 (GID 3):   Large grass center tile (top-left of 3x3 pattern)
  Col 3 (GID 4):   Large grass center tile (top-center of 3x3)
  Col 4 (GID 5):   Large grass center tile (top-right of 3x3)
  Col 5 (GID 6):   Grass variant with flowers/details
  Col 6 (GID 7):   Grass edge piece
  Col 7 (GID 8):   Grass edge piece
  Col 8 (GID 9):   Grass edge piece
  Col 9 (GID 10):  Grass corner piece
  Col 10 (GID 11): Grass corner piece

Row 1 (GIDs 12-22):
  Col 0 (GID 12):  Grass variant
  Col 1 (GID 13):  SOLID GRASS CENTER - main fill tile (use this!)
  Col 2 (GID 14):  Large grass center (middle-left of 3x3)
  Col 3 (GID 15):  Large grass center (middle-center of 3x3)
  Col 4 (GID 16):  Large grass center (middle-right of 3x3)
  Col 5 (GID 17):  Grass with details
  Col 6 (GID 18):  Grass edge
  Col 7 (GID 19):  Grass edge
  Col 8 (GID 20):  Grass edge
  Col 9 (GID 21):  Grass corner
  Col 10 (GID 22): Grass corner

Row 2 (GIDs 23-33):
  Col 0 (GID 23):  Grass variant
  Col 1 (GID 24):  Grass variant
  Col 2 (GID 25):  Large grass center (bottom-left of 3x3)
  Col 3 (GID 26):  Large grass center (bottom-center of 3x3)
  Col 4 (GID 27):  Large grass center (bottom-right of 3x3)
  Col 5 (GID 28):  Grass with details
  Col 6 (GID 29):  Grass edge
  Col 7 (GID 30):  Grass edge
  Col 8 (GID 31):  Grass edge
  Col 9 (GID 32):  Grass corner
  Col 10 (GID 33): Grass corner

Row 3 (GIDs 34-44):
  Small decorative elements and edge pieces

Row 4 (GIDs 45-55):
  More edge and corner variations

Row 5 (GIDs 56-66):
  Additional grass variations and transitions

Row 6 (GIDs 67-77):
  Final row of variations
```

### Key Tiles to Use:

**Grass Center:**
- **GID 13**: Main solid grass fill tile (center piece)

**Island Edges (Grass-to-Water Transitions):**
- **GID 1**: Top-left corner
- **GID 2**: Top edge
- **GID 3**: Top-right corner
- **GID 12**: Left edge
- **GID 14**: Right edge
- **GID 18**: Inner corner transition
- **GID 23**: Bottom-left corner
- **GID 24**: Bottom edge
- **GID 28**: Outer corner variant
- **GID 60**: Right edge variant (row 5, col 5)

**Decorative Weeds/Grass:**
- **GID 57**: Small grass tuft (row 5, col 2)
- **GID 61**: Weed variant (row 5, col 6)
- **GID 64**: Weed variant (row 5, col 9)
- **GID 67**: Weed variant (row 6, col 1)
- **GID 68**: Weed variant (row 6, col 2)
- **GID 73**: Weed variant (row 6, col 7)
- **GID 74**: Weed variant (row 6, col 8)

**Large Patterns:**
- **GIDs 3-5, 14-16, 25-27**: Large 3×3 grass pattern for variety

---

## Tilled_Dirt.png Tileset
**Dimensions**: 176x112 pixels (11 columns × 7 rows = 77 tiles)
**Tile size**: 16x16 pixels
**First GID**: 78

### Tile Layout (mirroring Grass structure)

```
Row 0 (GIDs 78-88):
  Col 0 (GID 78):  TOP-LEFT corner edge
  Col 1 (GID 79):  TOP edge
  Col 2 (GID 80):  TOP-RIGHT corner edge
  Col 3-10: Additional edge variations

Row 1 (GIDs 89-99):
  Col 0 (GID 89):  LEFT edge
  Col 1 (GID 90):  CENTER fill (main tilled dirt tile)
  Col 2 (GID 91):  RIGHT edge
  Col 3-10: Variations

Row 2 (GIDs 100-110):
  Col 0 (GID 100): BOTTOM-LEFT corner edge
  Col 1 (GID 101): BOTTOM edge
  Col 2 (GID 102): BOTTOM-RIGHT corner edge
  Col 3-10: Variations

Rows 3-6: Additional patterns and variations
```

### Edge Mapping for Rectangular Dirt Patch:
```
+-----+-----+-----+-----+
| 78  | 79  | 79  | 80  |  <- Top row
+-----+-----+-----+-----+
| 89  | 90  | 90  | 91  |  <- Middle rows
+-----+-----+-----+-----+
| 89  | 90  | 90  | 91  |
+-----+-----+-----+-----+
| 100 | 101 | 101 | 102 |  <- Bottom row
+-----+-----+-----+-----+
```

---

## Fences.png Tileset
**Dimensions**: 64x64 pixels (4 columns × 4 rows = 16 tiles)
**Tile size**: 16x16 pixels
**First GID**: 159

### Tile Layout

```
Row 0 (GIDs 159-162):
  Col 0 (GID 159): Unused
  Col 1 (GID 160): TOP-LEFT corner piece
  Col 2 (GID 161): Unused
  Col 3 (GID 162): TOP-RIGHT corner piece

Row 1 (GIDs 163-166):
  Col 0 (GID 163): VERTICAL fence post (sides)
  Col 1 (GID 164): Unused
  Col 2 (GID 165): Unused
  Col 3 (GID 166): Unused

Row 2 (GIDs 167-170):
  Col 0 (GID 167): Unused
  Col 1 (GID 168): BOTTOM-LEFT corner piece
  Col 2 (GID 169): Unused
  Col 3 (GID 170): BOTTOM-RIGHT corner piece

Row 3 (GIDs 171-174):
  Col 0 (GID 171): Unused
  Col 1 (GID 172): Unused
  Col 2 (GID 173): HORIZONTAL fence rail (top and bottom)
  Col 3 (GID 174): Unused
```

### Fence Patterns:

**Enclosed Area** (correct pattern):
```
+-----+-----+-----+-----+-----+-----+
| 160 | 173 | 173 | 173 | 173 | 162 |  <- Top row
+-----+-----+-----+-----+-----+-----+
| 163 |     |     |     |     | 163 |  <- Side rows
+-----+-----+-----+-----+-----+-----+
| 163 |     |     |     |     | 163 |
+-----+-----+-----+-----+-----+-----+
| 163 |     |     |     |     | 163 |
+-----+-----+-----+-----+-----+-----+
| 168 | 173 | 173 | 173 | 173 | 170 |  <- Bottom row
+-----+-----+-----+-----+-----+-----+
```

### Key Fence GIDs:
- **160**: Top-left corner
- **162**: Top-right corner
- **163**: Vertical posts (left and right sides)
- **168**: Bottom-left corner
- **170**: Bottom-right corner
- **173**: Horizontal rails (top and bottom)

---

## Water.png Tileset
**Dimensions**: 64x16 pixels (4 columns × 1 row = 4 tiles)
**Tile size**: 16x16 pixels
**First GID**: 155

### Tile Layout

```
Row 0 (GIDs 155-158):
  Col 0 (GID 155): Water tile variant 1
  Col 1 (GID 156): Water tile variant 2
  Col 2 (GID 157): Water tile variant 3
  Col 3 (GID 158): Water tile variant 4
```

### Water Pattern:
Alternate the 4 water tiles in a checkerboard or random pattern for visual variety.

---

## Notes

1. **Bitmask Tilesets**: The bitmask reference images show that Grass and Tilled_Dirt use autotiling patterns where edges automatically blend with neighboring tiles.

2. **GID Calculation**: GID = firstgid + (row × columns) + column
   - Example: Grass tile at row 1, col 1 = 1 + (1 × 11) + 1 = 13

3. **Common Mistakes**:
   - Using random tile indices instead of proper edge pieces
   - Not using corner tiles for rectangular patches
   - Forgetting that GIDs are 1-indexed in Tiled JSON format

4. **Best Practices**:
   - Use GID 13 for solid grass backgrounds
   - Use GID 90 for tilled dirt centers
   - Always use proper edges (78-80, 89, 91, 100-102) for dirt patches
   - Keep fences simple with GIDs 160 (horizontal), 163/165 (vertical)
