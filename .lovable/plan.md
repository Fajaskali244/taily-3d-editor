
# Garbage Collection Plan: Lumo v2.0 Codebase Cleanup

## Overview

This plan removes all legacy "Taily" (bead/charm customization) files and updates pricing logic for the new flat-fee AI/Stock model.

---

## Phase 1: Frontend File Deletion (7 files)

### Files to Delete

| File | Status | Reason |
|------|--------|--------|
| `src/pages/DesignView.tsx` | Imported in routes.tsx | Legacy bead viewer - will update routes |
| `src/components/ThreeViewer.tsx` | No imports found | Legacy bead renderer with procedural meshes |
| `src/components/MeshyModelPreview.tsx` | No imports found | Replaced by Hunyuan integration |
| `src/components/RefreshModelButton.tsx` | No imports found | Legacy Meshy re-mirror button |
| `src/components/UploadDropzone.tsx` | No imports found | Unused file |
| `src/components/3d/constants.ts` | No imports found | Legacy bead layout constants |
| `src/components/3d/ModelGLB.tsx` | No imports found | Simple wrapper - HybridViewer uses Drei directly |

---

## Phase 2: Asset Cleanup (22 files to delete)

### Files to Delete from `src/assets/`

**Bead textures:**
- `black-cat-bead.png`
- `black-pattern-beads.jpg`
- `blue-flower-bead.png`
- `blue-glitter-beads.jpg`
- `blue-glitter-beads-new.png`
- `crescent-moon-beads.png`
- `owl-beads.jpg`
- `owl-face-bead-new.png`
- `pink-cat-eye-bead.png`
- `sports-beads.jpg`
- `sports-beads-new.png`
- `sports-beads-collection.png`

**Charm textures:**
- `dripping-heart-charm.png`
- `heart-charm.jpg`
- `heart-charm-new.png`
- `moon-charm.jpg`
- `moon-charm-new.png`
- `star-charm.jpg`
- `star-charm-new.png`
- `star-charm-four-point.png`

**Legacy keyring images:**
- `classic-keyring.jpg`
- `premium-keyring.jpg`

### Files to Keep (6 files)

- `lumo-logo.png` (branding)
- `lumo-logo-new.png` (branding)
- `carabiner-keyring.png` (UI reference)
- `basic-keyring-new.png` (UI reference)
- `premium-keyring-new.png` (UI reference)
- `round-keyring.png` (UI reference)

---

## Phase 3: Router Cleanup

### Changes to `src/routes.tsx`

1. Remove import: `import DesignView from "@/pages/DesignView"`
2. Replace route `{ path: "design/:id", element: <DesignView /> }` with redirect to `/my-designs`

---

## Phase 4: Edge Function Pricing Updates

### Current State (Legacy Bead/Charm Pricing)

**cart-price/index.ts:**
```typescript
const PRICING = {
  base: 25000,      // Basic keyring
  premium: 35000,   // Premium keyring 
  bead: 10000,      // Per bead
  charm: 15000,     // Per charm
  engraving: 10000  // Flat rate
}
// Iterates over placed[] array counting beads and charms
```

**checkout-create/index.ts:**
```typescript
const beadCount = placed.filter((item) => item.kind === 'bead').length
const charmCount = placed.filter((item) => item.kind === 'charm').length
const beads = beadCount * 7000
const charms = charmCount * 15000
```

### New State (Flat Fee + AI Fee)

**New Pricing Constants:**
```typescript
const PRICING = {
  base: 50000,    // Base keyring assembly price
  ai_fee: 20000   // Additional fee for AI-generated models (layout_type === 'hybrid')
}
```

**New Logic:**
1. Get `layout_type` from the `designs` table for each cart item
2. Calculate: `unit_price = PRICING.base + (layout_type === 'hybrid' ? PRICING.ai_fee : 0)`
3. Remove all bead/charm iteration logic

---

## Summary of Changes

### Deletions (29 files total)

| Category | Count |
|----------|-------|
| Pages | 1 (`DesignView.tsx`) |
| Components | 5 (`ThreeViewer`, `MeshyModelPreview`, `RefreshModelButton`, `UploadDropzone`, `3d/ModelGLB`) |
| Constants | 1 (`3d/constants.ts`) |
| Assets | 22 (all bead/charm images) |

### Modifications (3 files)

1. **`src/routes.tsx`**: Remove DesignView import, add redirect
2. **`supabase/functions/cart-price/index.ts`**: Replace bead/charm pricing with flat fee + AI fee
3. **`supabase/functions/checkout-create/index.ts`**: Same pricing logic update

---

## Post-Cleanup Verification

After implementation:
1. Run build to verify no broken imports
2. Test `/studio?stockId=axolotl` loads correctly  
3. Test "Add to Cart" flow to verify new pricing calculates correctly
4. Confirm `/design/:id` redirects to `/my-designs`
5. Verify `Index.tsx` (landing page) compiles without issues (already confirmed: no ThreeViewer import)
