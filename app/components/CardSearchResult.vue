<template>
  <div
    :class="[
      'relative border rounded-lg p-4 bg-white dark:bg-zinc-900',
      partner
        ? 'border-blue-500 dark:border-violet-400'
        : active
          ? 'bg-zinc-50 border-blue-400'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600'
    ]"
  >
    <!-- Main content: not a single click target; use Book this or the detail chevron -->
    <div class="flex flex-col gap-4 min-w-0">
      <!-- Header: name + rating, Book this top-right -->
      <div class="flex flex-row justify-between items-start gap-2">
        <div class="min-w-0 flex-1">
          <p
            v-if="partner"
            class="mb-1 text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-violet-300"
          >
            Partner
          </p>
          <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
            {{ shop.business_name }}
          </h3>
          <div v-if="typeof shop.reviewCount === 'number'" class="mt-1 flex items-center gap-2">
            <span class="flex items-center gap-1" aria-label="Glaucus review rating">
              <template v-for="(state, index) in reviewStarStates" :key="index">
                <Star v-if="state === 'full'" class="w-4 h-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                <StarHalf v-else-if="state === 'half'" class="w-4 h-4 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                <Star v-else class="w-4 h-4 text-yellow-500 fill-none stroke-current" aria-hidden="true" />
              </template>
              <span v-if="typeof shop.reviewRating === 'number'" class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                {{ shop.reviewRating.toFixed(1) }}
              </span>
            </span>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">
              {{ shop.reviewCount > 0 ? `(${formatReviewCount(shop.reviewCount)})` : '0 reviews' }}
            </span>
          </div>
        </div>
        <button
          v-if="!bookingDisabled"
          type="button"
          class="shrink-0 cursor-pointer rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
          @click.stop="$emit('start-booking', shop)"
        >
          Book this
        </button>
      </div>

      <!-- Location -->
      <div class="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-100">
        <MapPin class="w-4 h-4 shrink-0 mt-0.5" />
        <div class="flex flex-col">
          <span class="font-medium">{{ locationLine }}</span>
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
        <NuxtLink
          :to="`/shops/${encodeURIComponent(shop.slug || shop.id)}`"
          class="self-end inline-flex h-8 shrink-0 items-center gap-1.5 px-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
          :aria-label="`View ${shop.business_name} profile`"
          @click.stop
        >
          <span>View profile</span>
          <ArrowRight class="h-4 w-4" aria-hidden="true" />
        </NuxtLink>
      </div>
    </div>

    
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Star, StarHalf, MapPin, Globe, Phone, Mail, ArrowRight } from 'lucide-vue-next'
import { computeCardSearchPills } from '~~/shared/cardSearchPills'
import { matchBadgesForShopCard } from '~~/shared/searchMatchBadges'
import { formatShopCityState } from '~~/shared/bookShopPick'

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
  /** Older search cards cannot start a booking once a later assistant turn is current. */
  bookingDisabled: {
    type: Boolean,
    default: false
  },
  /** Partner strip card: accent border + Partner label (organic duplicates stay unmarked). */
  partner: {
    type: Boolean,
    default: false
  },
  /** Echo of assistant message `filters` so pills can match wreck / activity style vs browse mode. */
  searchFilters: {
    type: Object,
    default: undefined
  }
})

defineEmits(['start-booking'])

const locationLine = computed(() => {
  const cityState = formatShopCityState(props.shop || {})
  const country = props.shop?.country?.name ?? props.shop?.country
  return [cityState, country].filter(Boolean).join(', ')
})

function formatReviewCount (count) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(count)
}

const cardMatchBadges = computed(() =>
  matchBadgesForShopCard(
    Array.isArray(props.matchBadges) ? props.matchBadges : undefined,
    props.searchFilters && typeof props.searchFilters === 'object' && !Array.isArray(props.searchFilters)
      ? props.searchFilters
      : null,
    props.shop?.searchMatchGroup
  )
)

const reviewStarStates = computed(() => {
  const rating = props.shop?.reviewRating
  if (typeof rating !== 'number' || !Number.isFinite(rating) || rating <= 0) {
    return Array.from({ length: 5 }, () => 'empty')
  }

  const roundedRating = Math.round(Math.min(5, rating) * 2) / 2
  const fullCount = Math.floor(roundedRating)
  const halfCount = roundedRating - fullCount >= 0.5 ? 1 : 0
  return [
    ...Array.from({ length: fullCount }, () => 'full'),
    ...(halfCount ? ['half'] : []),
    ...Array.from({ length: 5 - fullCount - halfCount }, () => 'empty')
  ]
})

const cardPills = computed(() =>
  computeCardSearchPills({
    shopTypeRaw: typeof props.shop?.type === 'string' ? props.shop.type : undefined,
    cardCourseNames: Array.isArray(props.shop?.cardCourseNames) ? props.shop.cardCourseNames : undefined,
    cardDiveSiteTypeNames: Array.isArray(props.shop?.cardDiveSiteTypeNames)
      ? props.shop.cardDiveSiteTypeNames
      : undefined,
    matchBadges: cardMatchBadges.value,
    searchFilters: props.searchFilters && typeof props.searchFilters === 'object' && !Array.isArray(props.searchFilters)
      ? props.searchFilters
      : null
  })
)
</script>
