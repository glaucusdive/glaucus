# Glaucus design system

Living reference for visual and interaction patterns in this repo. Prefer these rules over one-off styling unless a screen has an explicit exception (document the exception in code comments or a short PR note).

---

## Visual theme

- **Atmosphere:** Calm, product-focused, and readable. Favor clarity over ornament.
- **Modes:** **Class-based dark mode** (`dark` on `<html>`). Light and dark are both first-class; default shell in [app/assets/css/main.css](app/assets/css/main.css) uses light page background with dark text, and dark mode uses white on near-black.
- **Landing / marketing:** Deep charcoal backgrounds (`zinc-950`) with light foreground and restrained accent (see Color palette). Hero and nav specs may introduce peach/pink or purple accents as defined in Figma—when implementing, add tokens here and in Tailwind usage so names stay semantic (e.g. `accent`, `surface-pill`), not only raw hex in components.

---

## Color palette

Semantic roles map to **Tailwind zinc** plus a few **documented literals** where the product already depends on them.

| Role | Light (typical) | Dark (typical) | Notes |
|------|-----------------|----------------|--------|
| **Page background** | `zinc-50` | `black` / `zinc-950` | Base from `main.css`; landing may force `zinc-950`. |
| **Surface / elevated** | `white`, `zinc-100` | `zinc-900`, `zinc-950` | Cards, panels, modals. |
| **Primary text** | `black`, `zinc-900` | `white`, `zinc-50` | |
| **Muted text** | `zinc-500`, `zinc-600` | `zinc-400`, `zinc-500` | Labels, placeholders, secondary copy. |
| **Border / divider** | `zinc-200`, `zinc-300` | `zinc-700`, `zinc-800` | Prefer opacity dividers on dark pills, e.g. `bg-white/10`. |
| **Primary action (inverse on dark)** | — | `white` bg, `zinc-900` text | See landing CTA pattern in `LandingHome.vue`. |
| **Accent (gradient utility)** | — | — | Special effects: cyan / magenta gradient (`#02C8FF`, `#FF00F6`) in `.gradient-container` / `.animate-ring-gradient` in `main.css`. Use sparingly. |

**Landing nav pill:** `bg-zinc-800`, `rounded-full`, internal spacing `gap-1` / `p-1` (see [LandingHome.vue](app/components/landing/LandingHome.vue)). Prefer these utilities over arbitrary hex/radius unless Figma diverges and the doc is updated.

Add new brand colors here **before** scattering hex across components.

---

## Typography

- **Stack:** Inherited from **Nuxt UI** and Tailwind defaults unless a global font is configured later. Do not introduce a second body font family without updating this doc.
- **Weights:** `font-medium` for UI chrome and buttons; `font-semibold` / `font-bold` for headings and emphasis.
- **Scale:** Use Tailwind type scale (`text-sm`, `text-base`, `text-lg`, …). Landing nav labels: uppercase, tight line-height, small size per Figma (e.g. `text-xs` with `uppercase` / `tracking-wide` as needed).
- **Product copy:** Avoid the `§` character in user-facing strings (rendering issues).

---

## Component styling

### Buttons

- Use **Nuxt UI** `UButton` (or project primitives) where the app already does; for bespoke landing CTAs, keep **rounded corners**, clear **hover** (`transition-colors`), and **focus-visible** ring (Tailwind `focus-visible:outline-none focus-visible:ring-2` pattern) so keyboard users get a visible target.
- **Primary on dark:** Light-filled button with dark label is the current landing pattern; mirror for other high-contrast CTAs.

### Inputs

- Align with Nuxt UI form controls when inside the app shell. For custom inputs (e.g. landing nav search), use **transparent or subtle fill**, **muted placeholder**, **full focus ring**, and **min-width 0** on flex children so truncation works.

### Cards and surfaces

- Prefer **border** and **background** steps on the zinc scale over heavy shadows.
- **Do not** add ad-hoc drop shadows on cards unless this doc is updated with a shadow token.

### States (hover, focus, disabled)

- **Hover:** Slightly shift background or opacity; keep transitions short (`transition-colors`).
- **Focus:** Always visible for interactive elements; never `outline-none` without a replacement ring.
- **Disabled:** Lower contrast and `pointer-events-none` / `disabled:` attributes as appropriate; do not rely on color alone.

### Cursors

- **`cursor-pointer`** on every **clickable / primary-action** control: `<button>`, `<a href>`, `<summary>`, and custom elements with `role="button"` (unless `aria-disabled="true"`). Global defaults live in [app/assets/css/main.css](app/assets/css/main.css) (`@layer base`) for buttons, `a[href]`, and `summary`; add **`cursor-pointer`** explicitly when Tailwind utilities override base (e.g. a `class` that sets `cursor-default`).
- **Do not** use `cursor-pointer` on plain **text inputs / textareas** (use default or `cursor-text` so the affordance matches editing).
- **`@click` on `<div>`** (or other non-semantic wrappers): prefer a real `<button>` or add `role="button"` + keyboard handling + `cursor-pointer`.

---

## Spacing and layout

- **Scale:** Tailwind spacing scale (`gap-2`, `p-4`, etc.). Prefer **`gap`** on flex/grid over margin hacks when laying out siblings.
- **Edge padding:** Landing header uses horizontal padding at `lg` (e.g. `lg:px-20`); keep page edges consistent within each template.
- **Grid:** Landing header uses a **12-column grid** at `lg` with `gap-4` (`lg:grid-cols-12`). Reuse this rhythm for other full-width marketing sections unless design specifies otherwise.
- **Responsive:** Default mobile-first; add `lg:` (and up) breakpoints for dense nav and multi-column layouts. **Hide or simplify** complex controls below `lg` when they do not fit (e.g. pill nav).

---

## Icons

- Use **[Iconoir Vue](https://github.com/iconoir-icons/iconoir/tree/main/packages/iconoir-vue)** (`@iconoir/vue`) for **new** iconography: named PascalCase components, standard SVG props (`width`, `height`, `color`, `stroke-width`).
- Optional: wrap subtrees with **`IconoirProvider`** for shared defaults.
- **Existing** `UIcon` / Heroicons usage may remain until migrated; avoid adding **additional** icon libraries for UI icons.

Install: `npm i @iconoir/vue` — see the [iconoir-vue README](https://github.com/iconoir-icons/iconoir/blob/main/packages/iconoir-vue/README.md).

---

## Design guardrails

**Do**

- Prefer **flexbox/grid + `gap`** for spacing between siblings; use padding for **inside** a control or container.
- Keep **semantic HTML** (`header`, `nav`, `main`, `button` vs `div` clicks).
- Use **`cursor-pointer`** on actionable controls (see **Cursors** above); rely on base CSS or add the utility where needed.
- Match **dark/light** tokens to the active theme; test both.
- Document **Figma literals** (hex, radius) here when they are part of the brand.

**Don’t**

- Don’t use **`§`** in UI copy.
- Don’t introduce **extra icon packs** for routine UI (stick to Iconoir for new work).
- Don’t rely on **color alone** for state (pair with weight, icon, or label).
- Don’t add **heavy box shadows** on cards without a documented token.

---

## Design engineer strategy

### Mindset (abstract)

These are **whys**—how this differs from a default “make it work” implementation habit (e.g. duplicate mobile/desktop blocks, flex-first shells, or large refactors when a few classes would do).

- **One tree, changing parameters.** Parallel layouts are tempting because each breakpoint reads like its own comp—but they **fork truth**: two logos, two CTAs, two spacing stories that will drift. A single structure with **spans and visibility** changes exists so **what the product *is* (which controls exist) stays invariant**; only **how much grid they occupy** changes. Maintenance tracks one DOM story.

- **The grid is the contract, not flex.** Flex-first rows optimize **local** packing; a **column system** optimizes **relationship to the rest of the page**. Deferring to grid at the shell is choosing **predictable alignment to a shared spatial language** over ad-hoc distribution. Flex remains for **inside a cell**, where the job is alignment of siblings, not redefining page grammar.

- **Small diffs over “clean” rewrites.** Large structural refactors feel satisfying to the implementer but cost **review time, risk, and revertability**. Prefer the smallest edit that satisfies the design because **the price of a change is operational**, not line count.

- **Rhythm is part of the spec.** Controls that sit in one row but differ in height aren’t “wrong” functionally—they read as **unpolished** before anyone opens DevTools. Matching hit-target height is **optical accountability**: the bar communicates intention, not accident.

- **Radius carries meaning.** One default radius is efficient; **different radii** cheaply distinguish **nav brand language** (pill) from **dense chrome** (icon control) without new components. Shape is a **semantic layer** next to color and weight.

- **Constraints beat vague flexibility.** “More flexible” layout often means **weaker guarantees** about how this row relates to the next. A fixed column system trades some micro-freedom for **reviewable, repeatable alignment** across the surface.

### Patterns (concrete)

From landing header work ([LandingHeader.vue](app/components/landing/LandingHeader.vue)); prefer this when building or refactoring UI.

- **Grid first, flex inside cells.** The shell is **`grid grid-cols-12`** (with `gap-*` and `items-center`) for the whole breakpoint range. Use **flex only where a cell needs it** (e.g. `justify-end` + `gap-2` for actions, or aligning the pill). Avoid a second parallel “mobile layout” block when **column spans + `hidden` / `lg:`** can express the same thing.
- **One DOM for chrome.** **One logo, one CTA, one menu control**—vary **spans** (`col-span-6 lg:col-span-2`, etc.) and **visibility** (`hidden lg:flex`) instead of duplicating markup for small vs large screens.
- **Minimal change surface.** Prefer adjusting spans, visibility, and inner alignment over rewriting structure or adding wrappers. Keep behavior/state in script stable when the visual layout changes.
- **Rhythm across controls.** Match related hit targets in a row (e.g. **CTA `h-10`** next to **`size-10`** icon button) so the bar feels intentional, not accidentally misaligned.
- **Radius as vocabulary.** Use shape to signal role: e.g. **pill / `rounded-full`** for nav chrome, **tighter radius (`rounded-sm`)** for a dense chrome icon next to a **rounded-md** button—subtle hierarchy without extra components.
- **Utility order (house style).** Keep Tailwind class order consistent within the file (e.g. spacing/grid sizing grouped in a way that reads top-to-bottom: `gap-4 grid grid-cols-12 items-center`).

---

## Related files

- Global base styles: [app/assets/css/main.css](app/assets/css/main.css)
- Tailwind entry: [tailwind.config.js](tailwind.config.js) (minimal; Nuxt UI supplies most tokens)
- Example landing shell: [app/components/landing/LandingHome.vue](app/components/landing/LandingHome.vue); header: [app/components/landing/LandingHeader.vue](app/components/landing/LandingHeader.vue)
