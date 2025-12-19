<template>
  <div v-if="pending" class="h-screen flex items-center justify-center">
    <div class="flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
      <span class="text-zinc-600 dark:text-zinc-400">Loading dive shop...</span>
    </div>
  </div>
  <div v-else-if="error" class="h-screen flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-red-600 dark:text-red-500 mb-2">Error</h1>
      <p class="text-zinc-600 dark:text-zinc-400">{{ error.message || 'Failed to load dive shop' }}</p>
      <button @click="navigateTo('/shops')" class="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700">
        Back to Dive Shops
      </button>
    </div>
  </div>
  <NuxtLayout name="default">
    <!-- start shop/id here-->
    <div class="flex flex-col justify-between h-full gap-0 divide-y divide-zinc-300 dark:divide-zinc-700">
      <!-- Header -->
      <div class="flex flex-col justify-center z-40 w-full divide-y divide-zinc-300 dark:divide-zinc-700">
        <!-- Title -->
        <header class="flex flex-row justify-start items-stretch gap-0 divide-x divide-zinc-300 dark:divide-zinc-700">
          <div class="p-1 flex lg:hidden items-center ">
            <div @click="toggleMobileMenu"
              class="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full h-full flex items-center justify-center cursor-pointer px-1">
              <Menu class="w-4 h-4 lg:w-6 lg:h-6 text-zinc-900 dark:text-white" />
            </div>
          </div>
          <div class="p-1 flex items-center">
            <div
              class="hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-sm min-w-8 w-full h-full flex items-center justify-center cursor-pointer px-1"
              @click="goBackToShops">
              <ChevronLeft class="w-4 h-4 lg:w-6 lg:h-6 text-zinc-900 dark:text-white" />
            </div>
          </div>
          <!-- Image -->
          <div class="p-1 flex items-center">
            <div
              class="block bg-zinc-200 dark:bg-zinc-700 overflow-hidden rounded-sm min-w-8 w-8 lg:min-w-16 lg:w-16 h-auto aspect-square">
            </div>
          </div>
          <div class="p-1 grow flex items-center overflow-auto">
            <h1 class="text-sm lg:text-3xl font-medium p-0 leading-none lg:px-2 w-full truncate text-zinc-900 dark:text-white">{{
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
            'flex flex-row gap-2 rounded-sm p-2 px-3 w-fit text-xs lg:text-base cursor-pointer transition-color whitespace-nowrap',
            activeTab === tab.id
              ? 'bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/40 dark:hover:bg-zinc-800/50'
          ]">
            {{ tab.label }}
          </button>
        </div>
      </div>
      <!-- Content -->
      <div class="w-full h-0 flex-1 lg:overflow-y-auto">
        <!-- Main Content with Sidebar -->
        <div
          class="flex flex-col lg:flex-row justify-between lg:justify-stretch items-start lg:items-stretch gap-0 divide-y lg:divide-x lg:divide-y-0 divide-zinc-300 dark:divide-zinc-700 w-full h-full">
          <!-- Tab Content -->
          <div class="w-full flex flex-col border-b-0 order-2 lg:order-1 overflow-y-auto">
            <div class="flex flex-col gap-4 h-full w-full p-0">
              <!-- Details Tab -->
              <div v-if="activeTab === 'details'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-col 2xl:flex-row gap-2">
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
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
                  <CardInfo title="Beginner / Training Dives" image="/images/fpo/destinations-beginner.png"
                    :items="['House Reef', 'Lagoon around Bandos']" />
                  <CardInfo title="Shark & Ray / Big Pelagic Dives" image="/images/fpo/destinations-beginner.png"
                    :items="['House Reef', 'Lankan Reef', 'Banana Reef']" />
                  <CardInfo title="Wreck Diving" image="/images/fpo/destinations-beginner.png"
                    :items="['Victory Wreck', 'Other small wrecks']" />
                  <CardInfo title="Deep / Advanced Dives (20-30m)" image="/images/fpo/destinations-beginner.png"
                    :items="['Bandos Rock', 'Banana Reef', 'Victory Wreck']" />
                  <CardInfo title="Current / Drift Dives" image="/images/fpo/destinations-beginner.png"
                    :items="['Banana Reef', 'Bandos Rock', 'Other thilas']" />
                  <CardInfo title="Night Diving" image="/images/fpo/destinations-beginner.png"
                    :items="['House Reef']" />
                  <CardInfo title="Overhangs / Swim-Throughs" image="/images/fpo/destinations-beginner.png"
                    :items="['Banana Reef', 'Other nearby reefs']" />
                </div>
              </div>
              <!-- Courses Tab -->
              <div v-if="activeTab === 'courses'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CardInfo title="Open Water Diver" image="/images/fpo/destinations-beginner.png"
                    :items="['5-10 hrs', 'Contact shop for dates', 'eLearning only']" />
                  <CardInfo title="Advanced Open Water" image="/images/fpo/destinations-beginner.png"
                    :items="['3-5 days', 'Contact shop for dates', 'eLearning + practical']" />
                  <CardInfo title="Rescue Diver" image="/images/fpo/destinations-beginner.png"
                    :items="['3-4 days', 'Contact shop for dates', 'eLearning + practical']" />
                  <CardInfo title="Divemaster" image="/images/fpo/destinations-beginner.png"
                    :items="['2-3 weeks', 'Contact shop for dates', 'Intensive program']" />
                  <CardInfo title="Specialty Courses" image="/images/fpo/destinations-beginner.png"
                    :items="['1-2 days', 'Contact shop for dates', 'Various specialties']" />
                  <CardInfo title="Instructor Course" image="/images/fpo/destinations-beginner.png"
                    :items="['2-3 weeks', 'Contact shop for dates', 'Professional level']" />
                </div>
              </div>
              <!-- More Information Tab -->
              <div v-if="activeTab === 'information'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <div class="flex flex-col lg:flex-row gap-2 rounded-md">
                  <div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-1">
                    <div class="flex flex-col gap-2">
                      <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Equipment Rental</h3>
                      <ul class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300">
                        <li>BCD</li>
                        <li>Boots</li>
                        <li>Camera</li>
                        <li>Children sizes</li>
                        <li>Compass</li>
                        <li>Dive Computer</li>
                        <li>Flashlight</li>
                        <li>Full-foot fins</li>
                        <li>Gauges</li>
                        <li>Large Cylinders (15L / 100 cu. ft.)</li>
                        <li>Mask & Snorkel</li>
                        <li>Open-heel fins</li>
                        <li>Regulator</li>
                        <li>Scooter (DPV)</li>
                        <li>Small Cylinders (10L / 71.2 cu. ft.)</li>
                        <li>Wetsuit – 3mm</li>
                        <li>Wetsuit – shorty</li>
                      </ul>
                    </div>
                  </div>
                  <div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-1">
                    <div class="flex flex-col gap-2">
                      <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Gas Mixture</h3>
                      <ul class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300">
                        <li>Air Fills</li>
                        <li>Nitrox</li>
                      </ul>
                    </div>
                  </div>
                  <div class="w-full p-4 bg-zinc-100 dark:bg-zinc-800/50 rounded-md flex flex-col gap-1">
                    <div class="flex flex-col gap-2">
                      <h3 class="text-sm font-bold text-zinc-900 dark:text-white">Payment Methods</h3>
                      <ul class="text-sm space-y-1 text-zinc-900 dark:text-zinc-300">
                        <li>Bank Transfer</li>
                        <li>VISA</li>
                        <li>Mastercard</li>
                        <li>AMEX</li>
                        <li>Discover</li>
                        <li>Cash (USD)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Reviews Tab -->
              <div v-if="activeTab === 'reviews'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <section class="flex flex-col gap-0">
                  <div class="relative">
                    <!-- Review Items -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full relative">
                      <CardReview reviewer-name="Alexandra Park"
                        reviewer-image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face"
                        review-date="1 week ago" :rating="5"
                        review-text="Incredible experience! The dive masters were so knowledgeable about the local marine life. We saw turtles, rays, and so many colorful fish. The equipment was in perfect condition and the boat ride was smooth." />

                      <CardReview reviewer-name="Roberto Silva"
                        reviewer-image="https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face"
                        review-date="2 weeks ago" :rating="5"
                        review-text="Fantastic dive shop! The staff was incredibly professional and made sure everyone felt safe and comfortable. The underwater visibility was amazing and we saw some rare species. Highly recommend this place!" />

                      <CardReview reviewer-name="Jennifer Lee"
                        reviewer-image="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face"
                        review-date="3 days ago" :rating="4"
                        review-text="Great diving experience overall! The instructors were patient and thorough with the safety briefing. The dive sites were beautiful with lots of coral and fish. Only downside was the group was a bit large, but still had a wonderful time." />

                      <CardReview reviewer-name="Marcus Johnson"
                        reviewer-image="https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face"
                        review-date="1 month ago" :rating="5"
                        review-text="Outstanding service from start to finish! The booking process was easy, the equipment was top quality, and the dive sites were spectacular. The instructor was experienced and made sure we had the best possible dive. Will definitely return!" />

                      <CardReview reviewer-name="Sophie Williams"
                        reviewer-image="https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=150&h=150&fit=crop&crop=face"
                        review-date="4 days ago" :rating="5"
                        review-text="Amazing first diving experience! As a complete beginner, I was nervous but the instructor was so reassuring and professional. The equipment fit perfectly and the underwater world was absolutely breathtaking. Thank you for making my first dive unforgettable!" />

                      <CardReview reviewer-name="Thomas Brown"
                        reviewer-image="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face"
                        review-date="6 days ago" :rating="4"
                        review-text="Really good dive operation with excellent safety standards. The boat was clean and well-maintained, and the dive master was very experienced. The marine life was incredible - saw sharks, turtles, and schools of tropical fish. Highly recommended!" />
                    </div>
                  </div>
                </section>
              </div>
              <!-- Nearby Dive Shops Tab -->
              <div v-if="activeTab === 'nearby'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <section class="flex flex-col gap-4">
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <CardInfo image="/images/fpo/destinations-beginner.png" title="Dive Bandos – Bandos Maldives"
                      :items="['Bandos Island, Maldives']" />
                    <CardInfo image="/images/fpo/destinations-beginner.png" title="Dive Bandos – Bandos Maldives"
                      :items="['Bandos Island, Maldives']" />
                  </div>
                </section>
              </div>
            </div>
          </div>
          <!-- Sidebar -->
          <div
            class="w-full lg:min-w-1/2 lg:w-1/2 xl:min-w-1/3 xl:w-1/3 p-2 h-auto xl:h-full order-2 xl:order-1 sticky bottom-0 2xl:bottom-auto bg-zinc-50 dark:bg-zinc-900">
            <div class="h-full">
              <div class="flex flex-col gap-2">
                <!-- Book Now Button -->
                <div class="flex flex-col gap-2 lg:p-4 bg-zinc-100 dark:bg-zinc-800 rounded-md order-2 lg:order-1">
                  <h2 class="hidden lg:block text-2xl font-semibold text-zinc-900 dark:text-white">Book Now</h2>
                  <p class="hidden lg:block text-sm text-zinc-600 dark:text-zinc-400">Ready to dive? Click below to start your booking.</p>
                  <button @click="openBookingDrawer"
                    class="bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">
                    Start Booking
                  </button>
                </div>
                <!-- Contact Information -->
                <div class="flex flex-col gap-2 border border-zinc-300 dark:border-zinc-700 rounded-md order-1 lg:order-2">
                  <ul class="flex flex-row lg:flex-col justify-between lg:justify-start divide-x lg:divide-y divide-zinc-300 dark:divide-zinc-700">
                    <li class="p-4 w-full flex justify-center lg:justify-start" v-if="contactInfo?.address">
                      <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.address)}`"
                        target="_blank" class="flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 overflow-hidden">
                        <MapPin class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span class="hidden lg:block truncate">{{ contactInfo.address }}</span>
                      </a>
                    </li>
                    <li class="p-4 w-full flex justify-center lg:justify-start">
                      <div v-if="contactInfo?.phone" class="flex flex-row gap-4 items-center">
                        <a :href="`tel:${contactInfo.phone}`" class="flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                          <Phone class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                          <span class="hidden lg:block">{{ contactInfo.phone }}</span>
                        </a>
                      </div>
                      <div v-else class="flex flex-row gap-4 items-center text-zinc-900 dark:text-white">
                        <Phone class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span class="hidden lg:block text-zinc-400 dark:text-zinc-500">No Phone</span>
                      </div>
                    </li>
                    <li class="p-4 w-full flex justify-center lg:justify-start">
                      <div v-if="contactInfo?.email" class="flex flex-row gap-4 items-center">
                        <a :href="`mailto:${contactInfo.email}`" class="flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                          <Mail class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                          <span class="hidden lg:block">{{ contactInfo.email }}</span>
                        </a>
                      </div>
                      <div v-else class="flex flex-row gap-4 items-center text-zinc-900 dark:text-white">
                        <Mail class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span class="hidden lg:block text-zinc-400 dark:text-zinc-500">No Email</span>
                      </div>
                    </li>
                    <li class="p-4 w-full flex justify-center lg:justify-start" v-if="contactInfo?.website">
                      <a :href="contactInfo.website" target="_blank" class="flex flex-row gap-4 items-center text-zinc-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                        <Globe class="min-w-4 max-w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                        <span class="hidden lg:block truncate">{{ contactInfo.website }}</span>
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
    <!-- End shop/id Here-->
  </NuxtLayout>
</template>

<script setup>
import { MapPin, Phone, Mail, Globe, ChevronLeft, Menu } from 'lucide-vue-next'
import CardInfo from '~/components/CardInfo.vue'
import CardReview from '~/components/CardReview.vue'
import { ref, computed } from 'vue'
import { useDrawer } from '~/composables/useDrawer'
import { useDemoMode } from '~/composables/useDemoMode'
import { formatOperatingHours, demoHours, demoLanguages, demoDescription } from '~/utils/formatHours'

// Get the route parameter
const route = useRoute()
const router = useRouter()
const shopId = route.params.id

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

// Fetch dive shop data
const { client } = useSupabase()

const { data: shopData, pending, error } = await useAsyncData(`diveshop-${shopId}`, async () => {
  try {
    console.log('Fetching dive shop data for ID:', shopId)
    
    const { data, error: supabaseError } = await client
      .from('diveshops')
      .select('*')
      .eq('id', shopId)
      .single()

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      throw createError({
        statusCode: 404,
        statusMessage: 'Dive shop not found'
      })
    }

    if (!data) {
      console.log('No dive shop found for ID:', shopId)
      throw createError({
        statusCode: 404,
        statusMessage: 'Dive shop not found'
      })
    }

    console.log('Fetched shop data:', data)
    return data
  } catch (err) {
    console.error('Error fetching dive shop:', err)
    if (err.statusCode) {
      throw err
    }
    throw createError({
      statusCode: 404,
      statusMessage: 'Dive shop not found'
    })
  }
}, {
  server: false,
  lazy: false,
  default: () => null
})

// Computed properties for dynamic truncation
const paragraphs = computed(() => {
  const description = isDemoMode.value ? demoDescription : shopData.value?.description
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
  address: [shopData.value?.street_address, shopData.value?.locale, shopData.value?.country].filter(Boolean).join(', '),
  phone: shopData.value?.phone,
  email: shopData.value?.email,
  website: shopData.value?.website_url
}))

// Set page title
useHead({
  title: shopData.value?.business_name || 'Dive Shop'
})

// Scroll position management
const { saveScrollPosition } = useScrollPosition()

// Function to go back to shops with scroll position preservation
const goBackToShops = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }

  navigateTo('/shops')
}

// Drawer functionality
const { openDrawer, toggleMobileMenu } = useDrawer()

const openBookingDrawer = () => {
  openDrawer('booking-form', {
    shopId: shopId,
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
</script>
