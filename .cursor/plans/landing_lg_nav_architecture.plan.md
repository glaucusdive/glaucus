# Landing header nav (lg) — structure only

## Amendments

- **Icons:** Use **`@iconoir/vue`** ([iconoir-vue](https://github.com/iconoir-icons/iconoir/tree/main/packages/iconoir-vue)) for the landing nav (search, close, submit arrow). Add the dependency when implementing. Design system (colors, layout, icons): [docs/design.md](../../docs/design.md).

## Original plan summary

- Sticky `<header>` with `bg-zinc-950`, `z-10`, centered pill in `lg:col-span-6`.
- Pill: `inline-flex items-center gap-1 p-1 rounded-[30px] bg-[#222228]`, `max-w-[556px]`, dividers as flex items.
- Anchors: `#whatisglaucus`, `#features`, `#aboutus`, `#logs`, `#contact`; `activeSectionId` ref (static default) for active link styling; scroll-spy later.
- Search: `searchOpen` + `searchQuery` refs; branches for menu vs search-empty vs search-filled; minimal handlers; a11y (`aria-expanded`, labels).
- Pill hidden below `lg` where appropriate.
