<template>
  <div
    :class="[
      'relative border rounded-lg p-4 bg-white dark:bg-zinc-900',
      active
        ? 'bg-zinc-50 border-blue-400'
        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
    ]"
  >
    <!-- Main content: tap selects shop for booking -->
    <div
      class="flex flex-col gap-4 min-w-0 cursor-pointer"
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

      <!-- Location -->
      <div class="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-100">
        <MapPin class="w-4 h-4 shrink-0 mt-0.5" />
        <div class="flex flex-col">
          <span class="font-medium">{{ [shop.locale, shop.country?.name ?? shop.country].filter(Boolean).join(', ')
            }}</span>
          <span v-if="shop.street_address" class="text-zinc-600 dark:text-zinc-100">{{ shop.street_address }}</span>
        </div>
      </div>

      <!-- Contact info -->
      <div class="flex flex-wrap gap-3 text-sm">
        <a v-if="shop.website_url" :href="shop.website_url" target="_blank" rel="noopener noreferrer" @click.stop
          class="flex items-center gap-1 text-blue-500 hover:text-blue-400">
          <Globe class="w-4 h-4" />
          <span>Website</span>
        </a>
        <a v-if="shop.phone" :href="`tel:${shop.phone}`" @click.stop
          class="flex items-center gap-1 text-blue-500 hover:text-blue-400">
          <Phone class="w-4 h-4" />
          <span>Call</span>
        </a>
        <a v-if="shop.email" :href="`mailto:${shop.email}`" @click.stop
          class="flex items-center gap-1 text-blue-500 hover:text-blue-400">
          <Mail class="w-4 h-4" />
          <span>Email</span>
        </a>
      </div>

      <div class="flex flex-row items-end justify-between gap-4">
        <!-- Shop type, courses, site types, plus non-redundant search context (dates, activity, etc.) -->
        <div v-if="cardPills.length > 0" class="flex flex-wrap gap-1.5" aria-label="Shop highlights">
          <span
            v-for="(b, bi) in cardPills"
            :key="'pill-' + bi"
            class="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-800 dark:text-blue-200 border border-blue-500/25 dark:border-blue-400/30"
          >
            {{ b }}
          </span>
        </div>
        <!-- Slide-up detail drawer cue: small control, bottom-right -->
        <button type="button"
          class="self-end flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-transparent text-zinc-800 border-zinc-200  hover:border-zinc-300 dark:border-zinc-600/80 dark:bg-zinc-800/90 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          @click.stop="$emit('view-details', shop)" aria-label="View shop details">
          <ChevronUp class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>

    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Star, MapPin, Languages, Globe, Phone, Mail, ChevronUp } from 'lucide-vue-next'
import { computeCardSearchPills } from '~~/shared/cardSearchPills'

const props = defineProps({
  shop: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  },
  /** Extra labels from the active search (dates, activity, etc.). */
  matchBadges: {
    type: Array,
    default: undefined
  },
  /** Echo of assistant message `filters` so pills can match wreck / activity style vs browse mode. */
  searchFilters: {
    type: Object,
    default: undefined
  }
})

defineEmits(['shop-selected', 'view-details'])

const cardPills = computed(() =>
  computeCardSearchPills({
    shopTypeRaw: typeof props.shop?.type === 'string' ? props.shop.type : undefined,
    cardCourseNames: Array.isArray(props.shop?.cardCourseNames) ? props.shop.cardCourseNames : undefined,
    cardDiveSiteTypeNames: Array.isArray(props.shop?.cardDiveSiteTypeNames)
      ? props.shop.cardDiveSiteTypeNames
      : undefined,
    matchBadges: Array.isArray(props.matchBadges) ? props.matchBadges : undefined,
    searchFilters: props.searchFilters && typeof props.searchFilters === 'object' && !Array.isArray(props.searchFilters)
      ? props.searchFilters
      : null
  })
)
</script>
