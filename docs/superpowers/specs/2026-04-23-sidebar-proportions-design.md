# Design: Proportions & Alignment Refinement (Sidebar)

## Overview
Refining the sidebar geometry to move from a "floaty" feel to a "snug/precision" aesthetic by shrinking the button footprint while maintaining the fixed-axis anchor.

## Proposed Changes

### 1. Button Geometry (Snug Direction)
- **Footprint**: Reduce all core sidebar buttons (`New Chat`, `Collapse`, `User Profile`) from **40px** to **32px**.
- **Icon Sizing**: Maintain icons at **20px**.
- **Padding**: This creates a uniform **6px** inner gutter, making the icons feel snug and intentionally placed.
- **Border Radius**: Adjust to **8px** (radius-md) for a sharp, modern look.

### 2. Fixed Axis Persistence (Zero-Drift)
- **Anchor Box**: The `btn-icon-box` will remain at **60px wide**.
- **Centering**: The 32px buttons will be horizontally centered within this 60px box.
- **Animation**: Because the anchor box width is constant, icons will remain perfectly locked in their screen coordinates during expansion/compression.

### 3. Sidebar Metrics
- **Mini-Width**: Remains **60px**.
- **Expanded-Width**: Remains **260px**.
- **Vertical Rhythm**: Maintain the **36px vertical distance** from start-to-start for all list items and headers.

### 4. Technical Implementation
- **Positioning**: Use `position: fixed` for the User Profile popup to prevent container clipping.
- **Flexbox**: Use `justify-content: center` within the fixed-width icon boxes to ensure alignment.

## Success Criteria
- [ ] No "jumping" or "drifting" of icons during sidebar transition.
- [ ] Profile popup renders fully visible on top of all UI layers.
- [ ] Sidebar feels dense and precise, not empty or floaty.

---
*Next Step: After approval, I will generate a detailed execution plan.*
