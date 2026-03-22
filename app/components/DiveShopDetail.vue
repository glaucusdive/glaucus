<template>
  <div class="container-query flex flex-col justify-between h-full gap-0 divide-y divide-zinc-300 dark:divide-zinc-700">
    <!-- Header -->
    <div class="flex flex-col justify-center z-40 w-full divide-y divide-zinc-300 dark:divide-zinc-700">
      <!-- Title -->
      <header class="flex flex-row justify-start items-stretch gap-0 divide-x divide-zinc-300 dark:divide-zinc-700">
        <div class="p-1 flex items-center">
          <div
            class="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full h-full flex items-center justify-center cursor-pointer px-1"
            @click.stop="handleClose">
            <ChevronLeft v-if="!showCloseButton" class="w-4 h-4 cq:lg:w-6 cq:lg:h-6 text-zinc-900 dark:text-white" />
            <X v-else class="w-4 h-4 cq:lg:w-6 cq:lg:h-6 text-zinc-900 dark:text-white" />
          </div>
        </div>
        <div class="p-1 lg:p-2 grow flex items-center overflow-auto">
          <h1 class="text-sm cq:lg:text-3xl font-medium p-0 leading-none cq:lg:px-2 w-full truncate text-zinc-900 dark:text-white">{{
            shopData?.business_name ||
            'Loading...' }}</h1>
        </div>
        <div class="p-1 flex items-center">
          <button @click="toggleDemoMode" class="h-full text-xs px-3 py-1 rounded-sm transition-colors cursor-pointer border border-zinc-800"
            :class="isDemoMode ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'">
            {{ isDemoMode ? 'Demo' : 'Live' }}
          </button>
        </div>
      </header>
      <!-- Tabs -->
      <div class="flex flex-row gap-1 items-center p-1 lg:p-2 overflow-x-auto font-medium">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
          'flex flex-row gap-2 rounded-sm p-2 px-3 w-fit text-xs cq:lg:text-base cursor-pointer transition-color whitespace-nowrap',
          activeTab === tab.id
            ? 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50'
        ]">
          {{ tab.label }}
        </button>
      </div>
    </div>
    <!-- Content -->
    <div class="w-full h-0 flex-1 cq:lg:overflow-y-auto">
      <!-- Main Content with Sidebar -->
      <div
        class="flex flex-col cq:lg:flex-row justify-between cq:lg:justify-stretch items-start cq:lg:items-stretch gap-0 divide-y lg:divide-x lg:divide-y-0 cq:divide-zinc-700 divide-zinc-700 dark:divide-zinc-700 w-full h-full">
        <!-- Tab Content -->
        <div class="w-full flex flex-col border-b-0 cq:lg:order-1 overflow-y-auto">
          <div class="flex flex-col gap-4 h-full w-full p-0">
            <!-- Details Tab -->
            <div v-if="activeTab === 'details'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
              <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                  <div class="flex flex-col cq:lg:flex-row gap-2">
                    <CardInfo title="Hours" :items="displayHours" empty-message="Hours not available" />
                    <CardInfo title="Languages" :items="displayLanguages || []" display-mode="text" empty-message="Languages not available" />
                    <CardInfo title="Details" empty-message="No description available for this dive shop.">
                      <div v-if="paragraphs.length > 0">
                        <div v-if="!showFullDetails">
                          {{ firstParagraph }}
                        </div>
                        <div v-else>
                          <p v-for="(paragraph, index) in paragraphs" :key="index" class="mb-4 last:mb-0">
                            {{ paragraph }}
                          </p>
                        </div>
                        <button v-if="remainingParagraphs.length > 0" @click="showFullDetails = !showFullDetails"
                          class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline mt-2 text-sm cursor-pointer">
                          {{ showFullDetails ? 'Read less' : 'Read more' }}
                        </button>
                      </div>
                      <span v-else class="text-zinc-500 dark:text-zinc-400 italic">
                        No description available for this dive shop.
                      </span>
                    </CardInfo>
                  </div>
                </div>
                <!-- Top reviews (Details tab) -->
                <div class="flex flex-col gap-2 mt-1">
                  <div class="flex flex-row items-center justify-between gap-2 flex-wrap">
                    <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">Top reviews</h3>
                    <button
                      type="button"
                      class="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                      @click="openReviewDrawer"
                    >
                      {{ myReview ? 'Edit your review' : 'Write a review' }}
                    </button>
                  </div>
                  <div v-if="reviewsPending" class="grid grid-cols-1 cq:grid-cols-2 cq:lg:grid-cols-3 gap-2">
                    <div
                      v-for="n in [1, 2, 3]"
                      :key="'sk-' + n"
                      class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-4 animate-pulse"
                    >
                      <div class="flex gap-3">
                        <div class="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                        <div class="flex-1 space-y-2 pt-1">
                          <div class="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-1/2" />
                          <div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3" />
                        </div>
                      </div>
                      <div class="flex gap-1">
                        <div v-for="n in 5" :key="n" class="w-4 h-4 rounded bg-zinc-200 dark:bg-zinc-700" />
                      </div>
                      <div class="space-y-2">
                        <div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded" />
                        <div class="h-2 bg-zinc-200 dark:bg-zinc-700 rounded w-4/5" />
                      </div>
                    </div>
                  </div>
                  <div v-else-if="topReviews.length === 0" class="grid grid-cols-1 cq:grid-cols-2 cq:lg:grid-cols-3 gap-2 w-full">
                    <CardReviewEmpty @open="openReviewDrawer" />
                  </div>
                  <div v-else class="grid grid-cols-1 cq:grid-cols-2 cq:lg:grid-cols-3 gap-2">
                    <CardReview
                      v-for="r in topReviews"
                      :key="r.id"
                      :reviewer-name="r.author_display_name || 'Diver'"
                      :review-date="formatReviewDate(r.created_at)"
                      :rating="r.rating"
                      :review-text="r.body"
                      :show-delete="canDeleteReview(r)"
                      @delete="handleDeleteReview(r)"
                    />
                  </div>
                </div>
              </div>
            </div>
            <!-- Dive Destinations Tab -->
            <div v-if="activeTab === 'destinations'" class="flex flex-col gap-2 p-2 h-full">
              <div v-if="groupedDestinations.length === 0" class="text-zinc-500 dark:text-zinc-400 italic p-4">
                No dive destinations listed.
              </div>
              <div v-else class="grid grid-cols-1 cq:grid-cols-2 cq:lg:grid-cols-1 gap-2">
                <CardInfo
                  v-for="dest in groupedDestinations"
                  :key="dest.title"
                  :title="dest.title"
                  :items="dest.items"
                />
              </div>
            </div>
            <!-- Courses Tab -->
            <div v-if="activeTab === 'courses'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
              <div v-if="coursesList.length === 0" class="text-zinc-500 dark:text-zinc-400 italic p-4">
                No courses listed.
              </div>
              <div v-else class="grid grid-cols-1 cq:grid-cols-2 gap-2">
                <CardInfo
                  v-for="(course, idx) in coursesList"
                  :key="course.title + String(idx)"
                  :title="course.title"
                  :items="course.items.length ? course.items : ['Contact shop for dates']"
                />
              </div>
            </div>
            <!-- More Information Tab -->
            <div v-if="activeTab === 'information'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
              <div class="flex flex-col cq:lg:flex-row gap-2 rounded-md">
                <CardInfo
                  title="Equipment Rental"
                  :items="equipmentList"
                  empty-message="No equipment listed."
                />
                <CardInfo
                  title="Gas Mixture"
                  :items="gasesList"
                  empty-message="No gas mixture listed."
                />
                <!-- TODO: wire when payment_methods + diveshop_payment_methods exist -->
                <!--
                <CardInfo title="Payment Methods" :items="['Bank Transfer', 'VISA', 'Mastercard', 'AMEX', 'Discover', 'Cash (USD)']" />
                -->
              </div>
            </div>
            <div v-if="activeTab === 'reviews'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
              <div class="flex flex-row items-center justify-between gap-2 flex-wrap">
                <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">All reviews</h3>
                <button
                  type="button"
                  class="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                  @click="openReviewDrawer"
                >
                  {{ myReview ? 'Edit your review' : 'Write a review' }}
                </button>
              </div>
              <div v-if="reviewsPending" class="text-sm text-zinc-500 dark:text-zinc-400 p-2">Loading reviews…</div>
              <div v-else-if="reviews.length === 0" class="grid grid-cols-1 cq:grid-cols-2 gap-2 w-full">
                <CardReviewEmpty @open="openReviewDrawer" />
              </div>
              <div v-else class="grid grid-cols-1 cq:grid-cols-2 gap-2 w-full">
                <CardReview
                  v-for="r in reviews"
                  :key="r.id"
                  :reviewer-name="r.author_display_name || 'Diver'"
                  :review-date="formatReviewDate(r.created_at)"
                  :rating="r.rating"
                  :review-text="r.body"
                  :show-delete="canDeleteReview(r)"
                  @delete="handleDeleteReview(r)"
                />
              </div>
            </div>
            <!-- Nearby Dive Shops Tab -->
            <div v-if="activeTab === 'nearby'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
              <section class="flex flex-col gap-4">
                <p v-if="nearbyShops.length === 0" class="text-zinc-500 dark:text-zinc-400 italic p-4">
                  No nearby dive shops in this region.
                </p>
                <div v-else class="grid grid-cols-1 cq:grid-cols-2 gap-2">
                  <NuxtLink
                    v-for="shop in nearbyShops"
                    :key="shop.id"
                    :to="`/shops/${shop.slug || shop.id}`"
                    class="block"
                  >
                    <CardInfo
                      :title="shop.business_name"
                      :items="[
                        [shop.locale, shop.country?.name].filter(Boolean).join(', '),
                        ...(shop.distance_miles != null ? [`${shop.distance_miles} mi away`] : [])
                      ].filter(Boolean)"
                    />
                  </NuxtLink>
                </div>
              </section>
            </div>
          </div>
        </div>
        <!-- Sidebar -->
        <div
          class="w-full cq:lg:min-w-1/2 cq:lg:w-1/2 cq:xl:min-w-1/3 cq:xl:w-1/3 p-2 h-auto cq:xl:h-full cq:lg:order-1 sticky bottom-0 cq:2xl:bottom-auto bg-zinc-50 dark:bg-zinc-900">
          <div class="h-full">
            <div class="flex flex-col gap-2">
              <!-- Book Now / Show form Button -->
              <div class="flex flex-col gap-2 cq:lg:p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md cq:lg:order-1">
                <h2 class="hidden cq:lg:block cq:lg:text-2xl font-semibold text-zinc-900 dark:text-white">Book Now</h2>
                <p class="hidden cq:lg:block text-sm text-zinc-600 dark:text-zinc-400">
                  {{ isInBookingFlow ? (isFormOpen ? 'Booking form is open. Click to hide it.' : 'View or edit your booking details in the form.') : 'Ready to dive? Click below to start your booking.' }}
                </p>
                <button @click="handleBookingButtonClick"
                  class="border border-zinc-400 dark:border-zinc-500 hover:border-zinc-800 dark:hover:border-zinc-200 bg-transparent dark:bg-transparent text-zinc-800 dark:text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">
                  {{ isInBookingFlow ? (isFormOpen ? 'Hide form' : 'Show form') : 'Start Booking' }}
                </button>
              </div>
              <!-- Contact Information -->
              <div class="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-700 rounded-md cq:lg:order-2">
                <ul class="flex flex-row cq:lg:flex-col justify-between lg:justify-start divide-x lg:divide-y divide-zinc-300 dark:divide-zinc-700">
                  <li class="w-full flex justify-center cq:lg:justify-start" v-if="contactInfo?.address">
                    <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.address)}`"
                      target="_blank" class="w-full justify-center p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 overflow-hidden">
                      <MapPin class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      <span class="hidden cq:lg:block truncate">{{ contactInfo.address }}</span>
                    </a>
                  </li>
                  <li class="w-full flex justify-center cq:lg:justify-start" v-if="contactInfo?.phone">
                    <div class="w-full justify-center flex flex-row gap-4 items-center">
                      <a :href="`tel:${contactInfo.phone}`" class="p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        <Phone class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span class="hidden cq:lg:block">{{ contactInfo.phone }}</span>
                      </a>
                    </div>
                  </li>
                  <li class="w-full flex justify-center cq:lg:justify-start" v-if="contactInfo?.email">
                    <div class="flex flex-row gap-4 items-center">
                      <a :href="`mailto:${contactInfo.email}`" class="p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        <Mail class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span class="hidden cq:lg:block">{{ contactInfo.email }}</span>
                      </a>
                    </div>
                  </li>
                  <li class="w-full flex justify-center cq:lg:justify-start" v-if="contactInfo?.website">
                    <a :href="contactInfo.website" target="_blank" class="p-4 flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                      <Globe class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      <span class="hidden cq:lg:block truncate">{{ contactInfo.website }}</span>
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MapPin, Phone, Mail, Globe, ChevronLeft, X } from 'lucide-vue-next'
import CardInfo from '~/components/CardInfo.vue'
import CardReview from '~/components/CardReview.vue'
import CardReviewEmpty from '~/components/CardReviewEmpty.vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDrawer } from '~/composables/useDrawer'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/composables/useSupabase'
import { useDemoMode } from '~/composables/useDemoMode'
import { deleteShopReview } from '~/composables/useShopReviews'
import { formatOperatingHours, demoHours, demoLanguages, demoDescription } from '~/utils/formatHours'

// Props
const props = defineProps({
  /** Route slug (e.g. dive-porter) or legacy UUID — used only to load the shop row */
  shopLookup: {
    type: String,
    required: true
  },
  showCloseButton: {
    type: Boolean,
    default: false
  },
  isInBookingFlow: {
    type: Boolean,
    default: false
  },
  isFormOpen: {
    type: Boolean,
    default: false
  },
  onStartBooking: {
    type: Function,
    default: null
  },
  onShowForm: {
    type: Function,
    default: null
  },
  onHideForm: {
    type: Function,
    default: null
  }
})

// Emits
const emit = defineEmits(['close'])

/** Ignore close clicks until the opening pointer gesture has fully finished (see index nextTick open). */
const canEmitClose = ref(false)
let closeEnableTimer = null
function scheduleCloseEnabled () {
  canEmitClose.value = false
  if (closeEnableTimer) clearTimeout(closeEnableTimer)
  closeEnableTimer = setTimeout(() => {
    closeEnableTimer = null
    canEmitClose.value = true
  }, 400)
}
onMounted(() => {
  scheduleCloseEnabled()
})
watch(() => props.shopLookup, () => {
  scheduleCloseEnabled()
})
onUnmounted(() => {
  if (closeEnableTimer) clearTimeout(closeEnableTimer)
})

// Read more/read less state
const showFullDetails = ref(false)

// Tab system state
const activeTab = ref('details')

const tabs = [
  { id: 'details', label: 'Details' },
  { id: 'destinations', label: 'Dive Destinations' },
  { id: 'courses', label: 'Courses' },
  { id: 'information', label: 'More Information' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'nearby', label: 'Nearby Dive Shops' }
]

// Fetch dive shop (by public slug or legacy UUID)
const { shopData, nearbyShops, pending, error } = useShopDetail(props.shopLookup)

const shopRowId = computed(() => shopData.value?.id ?? '')

const { user, isAppAdmin } = useAuth()
const { client } = useSupabase()
const { reviews, topReviews, pending: reviewsPending, refresh: refreshReviews } = useShopReviews(shopRowId)

const myReview = computed(() => {
  const uid = user.value?.id
  if (!uid) return null
  return reviews.value.find(r => r.user_id === uid) ?? null
})

function canDeleteReview (r) {
  if (isAppAdmin.value) return true
  const uid = user.value?.id
  if (!uid) return false
  return r.user_id === uid
}

async function handleDeleteReview (r) {
  if (!canDeleteReview(r)) return
  const label = r.author_display_name || 'this review'
  if (!confirm(`Delete review by ${label}? This cannot be undone.`)) return
  try {
    await deleteShopReview(client, r.id)
    await refreshReviews()
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Could not delete review.')
  }
}

function formatReviewDate (iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// Computed properties for dynamic truncation (description from notes)
const paragraphs = computed(() => {
  const description = isDemoMode.value ? demoDescription : (shopData.value?.notes ?? shopData.value?.description)
  if (!description) return []
  return description.split('\n\n').filter(para => para.trim() !== '')
})

const firstParagraph = computed(() => {
  return paragraphs.value[0] || ''
})

const remainingParagraphs = computed(() => {
  return paragraphs.value.slice(1)
})

// Contact info for layout
const contactInfo = computed(() => ({
  address: [shopData.value?.street_address, shopData.value?.locale, shopData.value?.country?.name ?? shopData.value?.country].filter(Boolean).join(', '),
  phone: shopData.value?.phone,
  email: shopData.value?.email,
  website: shopData.value?.website_url
}))

// Handle close/back action
const handleClose = () => {
  if (!canEmitClose.value) return
  emit('close')
}

// Drawer functionality
const { openDrawer } = useDrawer()

function openReviewDrawer () {
  const my = myReview.value
  openDrawer('review-form', {
    shopId: shopRowId.value,
    shopName: shopData.value?.business_name || 'Dive Shop',
    initialRating: my?.rating ?? 5,
    initialBody: my?.body ?? '',
    isEditing: !!my,
    reviewId: my?.id ?? null,
    onSubmitted: () => {
      refreshReviews()
    },
    onDeleted: () => {
      refreshReviews()
    }
  })
}

function handleBookingButtonClick () {
  if (props.isInBookingFlow) {
    if (props.isFormOpen && props.onHideForm) {
      props.onHideForm()
      return
    }
    if (props.onShowForm) {
      props.onShowForm()
      return
    }
  }
  if (props.onStartBooking) {
    props.onStartBooking(shopRowId.value, shopData.value?.business_name || 'Dive Shop')
    return
  }
  // Fallback: open form directly (e.g. when used outside index)
  openDrawer('booking-form', {
    shopId: shopRowId.value,
    shopName: shopData.value?.business_name || 'Dive Shop'
  })
}

// Demo mode functionality
const { isDemoMode, toggleDemoMode } = useDemoMode()

// Display hours - switches between demo and real data
const displayHours = computed(() => {
  // If demo mode is on, always show demo data
  if (isDemoMode.value) {
    return formatOperatingHours(demoHours)
  }
  
  // Otherwise show real data if available
  if (shopData.value?.operating_hours) {
    return formatOperatingHours(shopData.value.operating_hours)
  }
  
  // No data available
  return null
})

// Display languages - switches between demo and real data
const displayLanguages = computed(() => {
  if (isDemoMode.value) {
    return demoLanguages
  }
  return shopData.value?.languages || null
})

// Destinations: group dive sites by type from diveshop_dive_sites -> dive_sites -> dive_site_type
const groupedDestinations = computed(() => {
  const rows = shopData.value?.diveshop_dive_sites ?? []
  const byType = new Map()
  for (const row of rows) {
    const site = row.dive_sites ?? row.dive_site
    if (!site?.name) continue
    const typeName = site.dive_site_type?.name ?? site.dive_site_types?.name ?? 'Other'
    if (!byType.has(typeName)) byType.set(typeName, [])
    byType.get(typeName).push(site.name)
  }
  return Array.from(byType.entries()).map(([title, items]) => ({ title, items }))
})

// Courses from diveshop_courses -> courses
const coursesList = computed(() => {
  const rows = shopData.value?.diveshop_courses ?? []
  return rows
    .map(row => row.courses ?? row.course)
    .filter(Boolean)
    .map(c => ({
      title: c.certification_name,
      items: [c.depth_limit, c.description].filter(Boolean).slice(0, 3)
    }))
})

// Equipment from diveshop_rental_equipment -> rental_equipment; filter out placeholder names
const EXCLUDED_EQUIPMENT = new Set(['None listed', 'Yes (unspecified gear)'])
const equipmentList = computed(() => {
  const rows = shopData.value?.diveshop_rental_equipment ?? []
  const names = rows
    .map(row => row.rental_equipment?.name)
    .filter(Boolean)
    .filter(name => !EXCLUDED_EQUIPMENT.has(name))
  return [...new Set(names)]
})

// Gases from diveshop_gases -> gases
const gasesList = computed(() => {
  const rows = shopData.value?.diveshop_gases ?? []
  const names = rows
    .map(row => row.gases?.name ?? row.gas?.name)
    .filter(Boolean)
  return [...new Set(names)]
})
</script>
