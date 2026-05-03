<template>
  <div
    :class="[
      'relative flex flex-col gap-3 border rounded-lg p-4 pr-14 pb-12 hover:shadow-md transition-all bg-white dark:bg-zinc-900',
      active
        ? 'border-white dark:border-white'
        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
    ]"
  >
    <!-- Main content: tap selects shop for booking -->
    <div
      class="flex flex-col gap-3 min-w-0 cursor-pointer"
      @click="$emit('shop-selected', shop)"
    >
      <!-- Header with name and rating -->
      <div class="flex flex-row justify-between items-start gap-2">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white hover:text-blue-600">
          {{ shop.business_name }}
        </h3>
        <div v-if="shop.google_rating" class="flex items-center gap-1 shrink-0">
          <Star class="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{{ shop.google_rating }}</span>
        </div>
      </div>

      <!-- Shop type, courses, site types, plus non-redundant search context (dates, activity, etc.) -->
      <div
        v-if="cardPills.length > 0"
        class="flex flex-wrap gap-1.5"
        aria-label="Shop highlights"
      >
        <span
          v-for="(b, bi) in cardPills"
          :key="'pill-' + bi"
          class="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-800 dark:text-blue-200 border border-blue-500/25 dark:border-blue-400/30"
        >
          {{ b }}
        </span>
      </div>

      <!-- Location -->
      <div class="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <MapPin class="w-4 h-4 shrink-0 mt-0.5" />
        <div class="flex flex-col">
          <span class="font-medium">{{ [shop.locale, shop.country?.name ?? shop.country].filter(Boolean).join(', ') }}</span>
          <span v-if="shop.street_address" class="text-zinc-50 dark:text-zinc-400">{{ shop.street_address }}</span>
        </div>
      </div>

      <!-- Languages -->
      <div v-if="shop.languages && shop.languages.length > 0" class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-100">
        <Languages class="w-4 h-4 shrink-0" />
        <span>{{ shop.languages.join(', ') }}</span>
      </div>

      <!-- Contact info -->
      <div class="flex flex-wrap gap-3 text-sm">
        <a
          v-if="shop.website_url"
          :href="shop.website_url"
          target="_blank"
          rel="noopener noreferrer"
          @click.stop
          class="flex items-center gap-1 text-blue-600 hover:text-blue-800"
        >
          <Globe class="w-4 h-4" />
          <span>Website</span>
        </a>
        <a
          v-if="shop.phone"
          :href="`tel:${shop.phone}`"
          @click.stop
          class="flex items-center gap-1 text-blue-600 hover:text-blue-800"
        >
          <Phone class="w-4 h-4" />
          <span>Call</span>
        </a>
        <a
          v-if="shop.email"
          :href="`mailto:${shop.email}`"
          @click.stop
          class="flex items-center gap-1 text-blue-600 hover:text-blue-800"
        >
          <Mail class="w-4 h-4" />
          <span>Email</span>
        </a>
      </div>
    </div>

    <!-- Slide-up detail drawer cue: small control, bottom-right -->
    <button
      type="button"
      class="absolute bottom-3 right-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-zinc-50/90 text-zinc-500 shadow-sm backdrop-blur-sm transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 dark:border-zinc-600/80 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
      @click.stop="$emit('view-details', shop)"
      aria-label="View shop details"
    >
      <ChevronUp class="w-4 h-4" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Star, MapPin, Languages, Globe, Phone, Mail, ChevronUp } from 'lucide-vue-next'

const props = defineProps({
  shop: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  /** Extra labels from the active search (dates, activity, etc.) — appended after per-shop pills when not redundant. */
  matchBadges: {
    type: Array,
    default: undefined
  }
})

defineEmits(['shop-selected', 'view-details'])

function formatShopTypePart (part) {
  if (part === 'Dive Shop') return 'Dive Shop / Day Trip'
  return part
}

const MAX_PILLS = 10

const cardPills = computed(() => {
  const seen = new Set()
  const out = []
  const add = (label) => {
    const t = String(label).trim()
    if (!t) return
    const k = t.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    out.push(t)
  }

  const raw = props.shop?.type
  if (raw && typeof raw === 'string') {
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean).map(formatShopTypePart)
    for (const p of parts) add(p)
  }

  const courses = props.shop?.cardCourseNames
  if (Array.isArray(courses)) {
    for (const c of courses) add(c)
  }

  const dtypes = props.shop?.cardDiveSiteTypeNames
  if (Array.isArray(dtypes)) {
    for (const d of dtypes) add(d)
  }

  for (const b of props.matchBadges || []) {
    if (typeof b !== 'string') continue
    const bt = b.trim()
    if (!bt) continue
    const courseDir = /^Course \(directory\):\s*(.+)$/i.exec(bt)
    if (courseDir) {
      const name = courseDir[1].trim().toLowerCase()
      if (seen.has(name)) continue
    }
    add(bt)
  }

  return out.slice(0, MAX_PILLS)
})
</script>
