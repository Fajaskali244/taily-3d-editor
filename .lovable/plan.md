

# Lumo Hybrid Studio: Gap Analysis Report

## Executive Summary

After auditing your current codebase against the "Lumo Spec Sheet", **your project is approximately 75-80% complete** for the Hybrid Studio workflow. The core infrastructure is already in place, with the primary gaps being UX flow connections, the "Assembly Phase" integration, and some checkout enhancements.

---

## 1. Feature Status Matrix

| Spec Requirement | Status | Location | Gap Details |
|------------------|--------|----------|-------------|
| Hunyuan API Integration | ✅ Complete | `supabase/functions/hunyuan3d/` | Fully implemented with TC3-HMAC-SHA256 signing |
| `generation_tasks` Table | ✅ Complete | Database schema | All required columns present |
| `designs.layout_type` | ✅ Complete | `designs` table | `layout_type` column exists |
| `designs.attached_asset_id` | ✅ Complete | `designs` table | FK to `generation_tasks` present |
| `designs.asset_transform` | ✅ Complete | `designs` table | JSONB column with default transform |
| `cart_items.print_file_url` | ✅ Complete | `cart_items` table | Column exists |
| HybridViewer Component | ✅ Complete | `src/components/Three/HybridViewer.tsx` | Uses Drei `<Resize>`, `<Center>`, `<TransformControls>` |
| AI Input Form (Image/Text) | ✅ Complete | `src/pages/Create.tsx` | Both tabs implemented |
| Review/Polling Page | ✅ Complete | `src/pages/Review.tsx` | `useTaskPoller` + `ModelViewer` |
| Sample Models | ✅ Complete | `src/pages/TestHybrid.tsx` | 5 Lumo assets preloaded |
| "Turn into Keychain" Button | ⚠️ Partial | Review page | Navigation to Assembly missing |
| Assembly Phase Integration | ⚠️ Partial | `/test-hybrid` route | Exists but not wired to user workflow |
| Save Transform to Database | ❌ Missing | TestHybrid.tsx | Only copies to clipboard |
| Thickness Validation | ❌ Missing | HybridViewer | Not implemented |
| Continue to Checkout Flow | ❌ Missing | TestHybrid/Studio | No checkout button |
| Static Render for Checkout | ❌ Missing | Checkout flow | No preview generation |
| AI Gen Fee in Pricing | ❌ Missing | `checkout-create` | No generation fee added |
| Route `/studio` | ❌ Missing | routes.tsx | Still at `/test-hybrid` |
| Navigation Link to Studio | ❌ Missing | Navigation.tsx | No menu item |

---

## 2. Phase-by-Phase Gap Analysis

### Phase 1: The AI Lab (Generation) — ✅ 95% Complete

**What's Working:**
- `Create.tsx` has both Image-to-3D and Text-to-3D input forms
- Files are uploaded to `user-uploads` bucket with signed URLs
- `hunyuan3d` edge function submits jobs to Tencent Hunyuan API
- Polling via `useTaskPoller` shows real-time progress
- GLB assets are mirrored to `design-files` storage

**Minor Gaps:**
- The "Quality" preset selector (`draft`/`standard`/`high`) is shown in UI but **not used** by Hunyuan API (Hunyuan doesn't support quality presets like Meshy did)
- Could remove or repurpose this UI element

---

### Phase 2: The Assembly (Combine Step) — ⚠️ 60% Complete

**What's Working:**
- `HybridViewer.tsx` correctly loads a static base (carabiner fallback or GLB)
- AI-generated charm is wrapped in `<Resize height scale={2.5}>` and `<Center top>`
- `TransformControls` allows Move/Rotate/Scale via gizmo
- Transform state is tracked as `AssetTransform` (position/rotation/scale)
- `TestHybrid.tsx` page exists with sample model selection and drag-drop upload

**Critical Gaps:**

| Gap | Description | Priority |
|-----|-------------|----------|
| **Missing: "Turn into Keychain" button** | Review page should have a CTA that navigates to `/studio?taskId={id}` after approval | HIGH |
| **Missing: Save to Database** | Current "Save Configuration" only copies JSON to clipboard. Should persist `asset_transform` to `designs` table | HIGH |
| **Missing: Continue to Checkout** | No button to proceed from Assembly to checkout flow | HIGH |
| **Missing: Real Carabiner GLB** | `DEFAULT_CARABINER_URL` is empty string, falls back to procedural mesh | MEDIUM |
| **Missing: Thickness Validation** | Spec calls for "Check Thickness" button — not implemented | LOW |
| **Route Name** | Path is `/test-hybrid` instead of `/studio` | MEDIUM |

---

### Phase 3: Checkout — ⚠️ 50% Complete

**What's Working:**
- `checkout-create` edge function calculates pricing (base + beads + charms)
- Creates orders with idempotency keys
- Integrates with `shipping_addresses` and `payment_events`
- Xendit payment proxy exists (`xendit-payment-proxy`)

**Critical Gaps:**

| Gap | Description | Priority |
|-----|-------------|----------|
| **No AI Generation Fee** | Pricing logic doesn't include any fee for AI-generated charms | HIGH |
| **No Static Render Preview** | Spec calls for a static render of combined object before checkout | MEDIUM |
| **No Cart Integration** | No clear path from Assembly → Add to Cart → Checkout | HIGH |
| **No Hybrid Design Handling** | Cart/checkout doesn't differentiate `layout_type: 'hybrid'` | MEDIUM |

---

## 3. Database Schema Status

### `generation_tasks` Table — ✅ Complete

```text
All required columns present:
- id (UUID, PK)
- user_id (FK to auth.users)
- source (ENUM: 'image' | 'text' | 'multi-image')
- mode (TEXT: 'image-to-3d' | 'text-to-3d')
- prompt (TEXT)
- input_image_urls (TEXT[])
- meshy_task_id (used for Hunyuan job ID despite name)
- status (ENUM: PENDING | IN_PROGRESS | SUCCEEDED | FAILED | DELETED)
- progress (INT)
- thumbnail_url, model_glb_url (TEXT)
- error (JSONB)
- created_at, started_at, finished_at (TIMESTAMPTZ)
```

### `designs` Table — ✅ Complete

```text
Hybrid-specific columns exist:
- layout_type (TEXT, default 'standard')
- attached_asset_id (UUID, FK → generation_tasks)
- asset_transform (JSONB, default {"scale": 1, "position": [0,-1.5,0], "rotation": [0,0,0]})
- generation_task_id (UUID, FK → generation_tasks)
- chosen_glb_url, chosen_thumbnail_url (TEXT)
```

### `cart_items` Table — ✅ Complete

```text
- print_file_url (TEXT, nullable) — exists for merged STL storage
- snapshot (JSONB) — can store hybrid assembly data
```

---

## 4. Edge Function Status

| Function | Status | Purpose |
|----------|--------|---------|
| `hunyuan3d` | ✅ Complete | Create/status/re-mirror for Tencent Hunyuan 3D |
| `checkout-create` | ⚠️ Partial | Needs AI gen fee logic |
| `cart-price` | ✅ Exists | Recalculates cart pricing |
| `xendit-payment-proxy` | ✅ Exists | Payment gateway integration |
| `send-order-confirmation` | ✅ Exists | Email notifications |

---

## 5. Recommended Implementation Order

### Sprint 1: Complete Assembly Phase (High Priority)

1. **Create `/studio` route** — Rename `/test-hybrid` to `/studio` in `routes.tsx`
2. **Add "Turn into Keychain" button** on Review page — Navigate to `/studio?taskId={id}`
3. **Implement Save to Database** — On "Save Configuration", persist `asset_transform` to `designs` table
4. **Add "Continue to Checkout" button** — Create cart item with `layout_type: 'hybrid'`

### Sprint 2: Checkout Enhancements (Medium Priority)

5. **Upload real Carabiner GLB** to `design-files` bucket and update `DEFAULT_CARABINER_URL`
6. **Add AI Generation Fee** to `checkout-create` pricing logic (e.g., +20,000 IDR for hybrid designs)
7. **Add Navigation Link** to Navigation.tsx for "Studio"

### Sprint 3: Polish (Low Priority)

8. **Static Render Preview** — Capture screenshot of 3D canvas before checkout
9. **Thickness Validation** — Add mesh analysis to warn about thin geometry
10. **Remove unused Quality Preset** — Hunyuan doesn't use draft/standard/high

---

## 6. Specific Code Changes Required

### A. Add "Turn into Keychain" Button (Review.tsx)
```tsx
// After "Approve for Print" button
<Button
  variant="secondary"
  onClick={() => navigate(`/studio?taskId=${task.id}`)}
  disabled={!isSucceeded || !task.model_glb_url}
>
  Turn into Keychain →
</Button>
```

### B. Read taskId in TestHybrid.tsx
```tsx
const [searchParams] = useSearchParams()
const taskId = searchParams.get('taskId')

// Load model from generation_tasks if taskId provided
useEffect(() => {
  if (taskId) {
    fetchTask(taskId).then(task => {
      if (task.model_glb_url) setModelUrl(task.model_glb_url)
    })
  }
}, [taskId])
```

### C. Save Transform to Database
```tsx
const handleSaveToDatabase = async () => {
  await supabase.from('designs').update({
    asset_transform: transform,
    layout_type: 'hybrid'
  }).eq('generation_task_id', taskId)
  toast.success('Design saved!')
  navigate('/checkout')  // or add to cart
}
```

### D. Update Checkout Pricing (checkout-create/index.ts)
```typescript
// Add after line 99
const designData = await supabaseAdmin
  .from('designs')
  .select('layout_type')
  .eq('id', ci.design_id)
  .single()

const aiGenFee = designData.data?.layout_type === 'hybrid' ? 20000 : 0
const unit = base + beads + charms + aiGenFee
```

---

## 7. Summary

| Category | Complete | Remaining |
|----------|----------|-----------|
| Database Schema | 100% | — |
| AI Generation API | 100% | — |
| HybridViewer Component | 95% | Carabiner GLB, Thickness check |
| UX Flow Integration | 40% | Critical gaps in navigation |
| Checkout Logic | 70% | AI fee, static preview |

**Total Estimated Effort:** 3-5 development days to reach production-ready state.

