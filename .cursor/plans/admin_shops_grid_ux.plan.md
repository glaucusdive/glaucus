---
name: Admin shops grid UX
overview: Restyle the RevoGrid to match the default layout panel, raise row height, horizontal-scroll tag columns, toolbar Save + add-business drawer, per-row Delete, server-backed pagination (50 rows per page), and a small AdminButton component.
todos:
  - id: revo-theme-css
    content: Override RevoGrid row/cell backgrounds in shops.vue :deep() for light/dark panel match + transparent where possible
  - id: pagination-api-ui
    content: Add limit/offset (page size 50) to GET /api/admin/shops + total count; wire shops.vue pagination and unsaved guard on page change
  - id: toolbar-save-add
    content: "Toolbar: AdminButton Save (save all dirty on current page), Add new business opens drawer; remove inline addNewRow/hasUnsavedNew"
  - id: drawer-form
    content: Teleport bottom sheet + AdminNewBusinessDrawer form (text + AdminSelectChip + POST) reusing shops API helpers
  - id: row-height-tags
    content: row-size 36; AdminSelectChip nowrap + scroll; AdminShopGridSelectCell overflow-x
  - id: delete-column
    content: Replace __actions with __delete column + AdminShopGridDeleteCell + AdminButton danger
  - id: grid-context-cleanup
    content: Trim AdminShopGridContext / gridContext; remove AdminShopGridActionsCell import/column
  - id: admin-button
    content: Add AdminButton.vue (primary/danger) and use for Save, Delete, drawer submit
---

# Admin shops grid, drawer, and pagination

## Context

- Grid: [`app/pages/admin/shops.vue`](app/pages/admin/shops.vue) (`RevoGrid`, `:row-size="32"`, themes `compact` / `darkCompact`).
- Tags: [`app/components/admin/AdminSelectChip.vue`](app/components/admin/AdminSelectChip.vue) (`flex-wrap` today).
- No shared `Button.vue`; primary blue pattern `bg-blue-500 hover:bg-blue-400 text-white` (e.g. [`app/components/chat/ChatHome.vue`](app/components/chat/ChatHome.vue)).
- Shop detail **shell** to mirror: Teleport + backdrop + sheet in [`app/components/chat/ChatHome.vue`](app/components/chat/ChatHome.vue) — not [`ShopDetailPanel`](app/components/ShopDetailPanel.vue) (requires `shopLookup`).
- List API today: [`server/api/admin/shops/index.get.ts`](server/api/admin/shops/index.get.ts) loads **all** diveshops with nested relations (no pagination).

**Panel background (user choice):** Match default layout card — light `bg-white`, dark `dark:bg-zinc-900` ([`app/layouts/default.vue`](app/layouts/default.vue)); prefer transparent cells where Revo allows so the grid inherits the panel.

---

## 1. Cell / row backgrounds (light + dark)

- Extend scoped `:deep(revo-grid)` in [`shops.vue`](app/pages/admin/shops.vue) to remove zebra striping and align row/cell backgrounds with the panel (transparent or explicit `white` / `zinc-900`).
- Use RevoGrid theme docs / DOM inspection for correct selectors or CSS variables.

## 2. Pagination (max 50 rows) — **performance**

**Backend** — [`server/api/admin/shops/index.get.ts`](server/api/admin/shops/index.get.ts):

- Accept query params e.g. `limit` and `offset` (or `page` 1-based with fixed `pageSize=50`).
- Enforce **`limit` capped at 50** (default 50); validate `offset` / `page` as non-negative integers.
- Use Supabase **`.range(offset, offset + limit - 1)`** on the same `select` + `order('business_name')` as today.
- Return **`total`** as the full row count (e.g. same filter query with `{ count: 'exact', head: true }` or a separate count query) so the UI can show “739 shops” and total pages.
- Response shape: `{ shops: rows, total, limit, offset }` (or include `page` / `pageSize` for clarity).

**Frontend** — [`app/pages/admin/shops.vue`](app/pages/admin/shops.vue):

- State: `page` (or `offset`), `pageSize = 50`, `total` from API.
- `loadShopsPage()` (or extend `loadAll`): fetch `/api/admin/shops?limit=50&offset=…` (and keep existing parallel fetch for `/api/admin/lookups` unchanged — lookups stay full lists for chips).
- `RevoGrid` `:source` = current page rows only.
- **Toolbar:** show total count + current range (e.g. “1–50 of 739”) and **Prev / Next** (and optional page input if cheap).
- **Unsaved edits:** If any row on the current page has `dirty`, block page change (or prompt confirm discard) before loading another page so PATCH work is not silently dropped.

**Save all:** Only considers **dirty rows on the current page** (consistent with paginated source).

## 3. Top bar: Save + “Add new business”

- **Save:** `AdminButton` primary; `saveAllDirty` loops current-page dirty rows and `await saveRow(row)`; disable when `!writeMode`, no dirty rows, or any `saving`.
- **Add new business:** Opens drawer (§5); label replaces “+ Add row”. Remove inline `addNewRow` / `hasUnsavedNew` for the grid.

## 4. Row height

- `:row-size="32"` → **`36`**; optionally align cell `min-h-*` in grid cell components.

## 5. “Add new business” drawer (reuse detail shell)

- Local `Teleport` sheet in `shops.vue` or [`AdminNewBusinessDrawer.vue`](app/components/admin/AdminNewBusinessDrawer.vue): same backdrop/sheet pattern as ChatHome.
- Form: scalar fields + `AdminSelectChip` for relation fields; `POST /api/admin/shops`; on success close, reset form, **`loadShopsPage()`** (or jump to page containing the new shop — optional nice-to-have).

## 6. Tag columns: no wrap, horizontal scroll

- `AdminSelectChip`: prop (e.g. `scrollChips` or extend `compact`) → chip row `flex-nowrap overflow-x-auto min-w-0`.
- `AdminShopGridSelectCell`: outer `min-w-0 overflow-x-auto`.

## 7. Last column: Delete

- New `__delete` column + `AdminShopGridDeleteCell.vue` + `AdminButton` danger calling `gridContext.deleteRow`.
- Trim `gridContext` (remove unused actions-menu helpers); remove [`AdminShopGridActionsCell.vue`](app/components/admin/grid/AdminShopGridActionsCell.vue) from columns.

## 8. `AdminButton.vue`

- Variants `primary` | `danger` | `secondary`; use for Save, Delete, drawer submit.

---

## Verification

- Pagination: only 50 rows requested per load; total and navigation correct; dirty guard on page change.
- Light/dark backgrounds match panel; row height ~36px; tags scroll horizontally.
- Save / Delete / add-business drawer behave as specified.
