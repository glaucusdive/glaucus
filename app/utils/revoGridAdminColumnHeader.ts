/**
 * RevoGrid `columnTemplate` receives Stencil’s HyperFunc (`createElement`), not Vue’s `h`.
 * Vue components (e.g. lucide-vue-next) must not be used here — they render as `<undefined>`.
 * Icons are inline SVG built from the same path data as Lucide (lucide-vue-next icon sources).
 */

export type AdminGridHeaderKind = 'text' | 'url' | 'number' | 'options' | 'delete'

const ICON_CLASS = 'h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400'

/** [tag, attrs] tuples — Lucide-compatible paths (keys omitted). */
const ICON_NODES: Record<AdminGridHeaderKind, [string, Record<string, string>][]> = {
  text: [
    ['path', { d: 'M12 4v16' }],
    ['path', { d: 'M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2' }],
    ['path', { d: 'M9 20h6' }]
  ],
  url: [
    ['path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }],
    ['path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }]
  ],
  number: [
    ['line', { x1: '4', x2: '20', y1: '9', y2: '9' }],
    ['line', { x1: '4', x2: '20', y1: '15', y2: '15' }],
    ['line', { x1: '10', x2: '8', y1: '3', y2: '21' }],
    ['line', { x1: '16', x2: '14', y1: '3', y2: '21' }]
  ],
  options: [
    ['path', { d: 'M13 5h8' }],
    ['path', { d: 'M13 12h8' }],
    ['path', { d: 'M13 19h8' }],
    ['path', { d: 'm3 17 2 2 4-4' }],
    ['path', { d: 'm3 7 2 2 4-4' }]
  ],
  delete: [
    ['path', { d: 'M10 11v6' }],
    ['path', { d: 'M14 11v6' }],
    ['path', { d: 'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6' }],
    ['path', { d: 'M3 6h18' }],
    ['path', { d: 'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2' }]
  ]
}

export function adminHeaderKindForProp (prop: string): AdminGridHeaderKind {
  const p = String(prop)
  if (p === 'website_url') return 'url'
  if (p === 'country_id' || p === 'region_id') return 'options'
  if (p === 'course_ids' || p === 'rental_equipment_ids' || p === 'gas_ids' || p === 'dive_site_ids') return 'options'
  if (p === '__actions' || p === '__delete') return 'delete'
  return 'text'
}

function renderStencilIcon (ce: (tag: any, data?: any, children?: any) => any, kind: AdminGridHeaderKind) {
  const nodes = ICON_NODES[kind]
  return ce(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      width: 14,
      height: 14,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: ICON_CLASS,
      'aria-hidden': 'true'
    },
    nodes.map(([tag, attrs]) => ce(tag, attrs))
  )
}

/** RevoGrid `ColumnTemplateFunc` — first arg is Stencil `createElement`, not Vue `h`. */
export function adminColumnHeaderTemplate (ce: (tag: any, data?: any, children?: any) => any, props: { prop?: string; name?: unknown }) {
  const prop = String(props.prop ?? '')
  const name = props.name != null ? String(props.name) : ''
  const kind = adminHeaderKindForProp(prop)
  return ce(
    'div',
    {
      class: 'flex min-h-0 min-w-0 max-w-full items-center gap-1.5 truncate'
    },
    [renderStencilIcon(ce, kind), ce('span', { class: 'min-w-0 flex-1 truncate font-semibold' }, name)]
  )
}
