<template>
  <div class="container-query flex flex-col justify-between h-full gap-0 divide-y divide-zinc-300 dark:divide-zinc-700">
    <!-- Header -->
    <div class="flex flex-col justify-center z-40 w-full divide-y divide-zinc-300 dark:divide-zinc-700">
      <!-- Title -->
      <header class="flex flex-row justify-start items-stretch gap-0 divide-x divide-zinc-300 dark:divide-zinc-700">
        <div class="p-1 flex items-center">
          <div
            class="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full h-full flex items-center justify-center cursor-pointer px-1"
            @click="handleClose">
            <ChevronLeft v-if="!showCloseButton" class="w-4 h-4 cq:lg:w-6 cq:lg:h-6 text-zinc-900 dark:text-white" />
            <X v-else class="w-4 h-4 cq:lg:w-6 cq:lg:h-6 text-zinc-900 dark:text-white" />
          </div>
        </div>
        <!-- Image -->
        <div class="p-1 flex items-center">
          <div
            class="block bg-zinc-200 dark:bg-zinc-700 overflow-hidden rounded-sm min-w-8 w-8 cq:lg:min-w-16 cq:lg:w-16 h-auto aspect-square">
          </div>
        </div>
        <div class="p-1 grow flex items-center overflow-auto">
          <h1 class="text-sm cq:lg:text-3xl font-medium p-0 leading-none cq:lg:px-2 w-full truncate text-zinc-900 dark:text-white">{{
            shopData?.business_name ||
            'Loading...' }}</h1>
        </div>
        <div class="p-1 flex items-center">
          <button @click="toggleDemoMode" class="h-full text-xs px-3 py-1 rounded-sm transition-colors cursor-pointer"
            :class="isDemoMode ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'">
            {{ isDemoMode ? '📊 Demo' : 'Live' }}
          </button>
        </div>
      </header>
      <!-- Tabs -->
      <div class="flex flex-row gap-1 items-center p-1 overflow-x-auto font-medium">
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
            <!-- TODO: wire when shop_reviews table exists -->
            <!--
            <div v-if="activeTab === 'reviews'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
              <section class="flex flex-col gap-0">
                <div class="relative">
                  <div class="grid grid-cols-1 cq:grid-cols-2 gap-2 w-full relative">
                    <CardReview ... />
                  </div>
                </div>
              </section>
            </div>
            -->
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
                    :to="`/shops/${shop.id}`"
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
              <!-- Book Now Button -->
              <div class="flex flex-col gap-2 cq:lg:p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md cq:lg:order-1">
                <h2 class="hidden cq:lg:block cq:lg:text-2xl font-semibold text-zinc-900 dark:text-white">Book Now</h2>
                <p class="hidden cq:lg:block text-sm text-zinc-600 dark:text-zinc-400">Ready to dive? Click below to start your booking.</p>
                <button @click="openBookingDrawer"
                  class="border border-zinc-900 dark:border-zinc-100 hover:border-zinc-800 dark:hover:border-zinc-200 bg-transparent text-white dark:text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">
                  Start Booking
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
import { ref, computed } from 'vue'
import { useDrawer } from '~/composables/useDrawer'
import { useDemoMode } from '~/composables/useDemoMode'
import { formatOperatingHours, demoHours, demoLanguages, demoDescription } from '~/utils/formatHours'

// Props
const props = defineProps({
  shopId: {
    type: String,
    required: true
  },
  showCloseButton: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['close'])

// Read more/read less state
const showFullDetails = ref(false)

// Tab system state
const activeTab = ref('details')

const tabs = [
  { id: 'details', label: 'Details' },
  { id: 'destinations', label: 'Dive Destinations' },
  { id: 'courses', label: 'Courses' },
  { id: 'information', label: 'More Information' },
  // TODO: wire when shop_reviews table exists
  // { id: 'reviews', label: 'Reviews' },
  { id: 'nearby', label: 'Nearby Dive Shops' }
]

// Fetch dive shop data (shared with shops/[id] page via useShopDetail)
const { shopData, nearbyShops, pending, error } = useShopDetail(props.shopId)

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
  emit('close')
}

// Drawer functionality
const { openDrawer } = useDrawer()

const openBookingDrawer = () => {
  openDrawer('booking-form', {
    shopId: props.shopId,
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
