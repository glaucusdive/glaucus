<template>
  <div v-if="pending" class="h-screen flex items-center justify-center">
    <div class="flex flex-col items-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
      <span class="text-gray-600">Loading dive shop...</span>
    </div>
  </div>
  <div v-else-if="error" class="h-screen flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-2xl font-bold text-red-600 mb-2">Error</h1>
      <p class="text-gray-600">{{ error.message || 'Failed to load dive shop' }}</p>
      <button @click="navigateTo('/shops')" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Back to Dive Shops
      </button>
    </div>
  </div>
  <NuxtLayout name="default">
    <!-- start shop/id here-->
    <div class="flex flex-col justify-between h-full gap-0 divide-y divide-gray-300">
      <!-- Header -->
      <div class="flex flex-col justify-center z-50 w-full divide-y divide-gray-300">
        <!-- Title -->
        <header class="flex flex-row justify-start items-stretch gap-0 divide-x divide-gray-300">
          <div class="p-1 flex items-center">
            <div class="hover:bg-gray-100 rounded-sm w-full h-full flex items-center justify-center cursor-pointer px-1" @click="goBackToShops">
              <ChevronLeft class="w-6 h-6" />
            </div>
          </div>
          <!-- Image -->
          <div class="p-1 flex items-center">
            <div class="hidden lg:block bg-gray-200 overflow-hidden rounded-sm w-16 h-auto aspect-square"></div>
          </div>

          <div class="p-1 grow flex items-center">
            <h1 class="text-3xl font-medium p-0 leading-none px-2">{{ shopData?.business_name || 'Loading...' }}</h1>
          </div>
        </header>
        <!-- Tabs -->
        <div class="flex flex-row gap-1 items-center p-1 overflow-x-auto font-medium">
          <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
            'flex flex-row gap-2 rounded-sm p-2 px-3 w-fit cursor-pointer transition-color whitespace-nowrap',
            activeTab === tab.id
              ? 'bg-gray-200/50 text-neutral-900'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-gray-200/40'
          ]">
            {{ tab.label }}
          </button>
        </div>
      </div>
      <!-- Content -->
      <div class="w-full h-0 flex-1 overflow-y-auto">
        <!-- Main Content with Sidebar -->
        <div
          class="flex flex-col lg:flex-row items-stretch gap-0 divide-y lg:divide-x lg:divide-y-0 divide-gray-300 w-full h-full overflow-y-auto lg:overflow-y-visible">
          <!-- Tab Content -->
          <div class="w-full flex flex-col grow border-b-0 h-full order-2 lg:order-1">
            <div class="flex flex-col gap-4 h-full w-full p-0">
              <!-- Details Tab -->
              <div v-if="activeTab === 'details'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <section class="flex flex-col gap-4 p-2">
                  <div class="flex flex-col gap-2">
                    <section class="flex flex-col xl:flex-row gap-2 p-2 *:w-full">
                      <div class="flex flex-col gap-2">
                        <h2 class="text-lg font-semibold">Hours</h2>
                        <ul class="text-base space-y-1">
                          <li>Mon: 07:30 AM - 05:00 PM</li>
                          <li>Tue: 07:30 AM - 05:00 PM</li>
                          <li>Wed: 07:30 AM - 05:00 PM</li>
                          <li>Thu: 07:30 AM - 05:00 PM</li>
                          <li>Fri: 07:30 AM - 05:00 PM</li>
                          <li>Sat: 07:30 AM - 05:00 PM</li>
                          <li>Sun: 07:30 AM - 05:00 PM</li>
                        </ul>
                      </div>
                      <div class="flex flex-col gap-2">
                        <h3 class="text-lg font-semibold">Languages</h3>
                        <div class="text-base">
                          English
                        </div>
                      </div>
                    </section>
                    <div class="text-lg p-2 flex flex-col gap-2 justify-start">
                      <h2 class="text-lg font-semibold">Details</h2>
                      <div class="text-base">
                        <div v-if="shopData?.description">
                          <div v-if="!showFullDetails">
                            {{ firstParagraph }}
                          </div>
                          <div v-else>
                            <p v-for="(paragraph, index) in paragraphs" :key="index" class="mb-4 last:mb-0">
                              {{ paragraph }}
                            </p>
                          </div>
                          <button v-if="remainingParagraphs.length > 0" @click="showFullDetails = !showFullDetails"
                            class="text-blue-600 hover:text-blue-800 underline mt-2 text-sm cursor-pointer">
                            {{ showFullDetails ? 'Read less' : 'Read more' }}
                          </button>
                        </div>
                        <div v-else class="text-gray-500 italic">
                          No description available for this dive shop.
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              <!-- Dive Destinations Tab -->
              <div v-if="activeTab === 'destinations'" class="flex flex-col gap-2 p-2 h-full overflow-y-auto">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
                  <CardListItem title="Beginner / Training Dives" image="/images/fpo/destinations-beginner.png"
                    :items="['House Reef', 'Lagoon around Bandos']" />
                  <CardListItem title="Shark & Ray / Big Pelagic Dives" image="/images/fpo/destinations-beginner.png"
                    :items="['House Reef', 'Lankan Reef', 'Banana Reef']" />
                  <CardListItem title="Wreck Diving" image="/images/fpo/destinations-beginner.png"
                    :items="['Victory Wreck', 'Other small wrecks']" />
                  <CardListItem title="Deep / Advanced Dives (20-30m)" image="/images/fpo/destinations-beginner.png"
                    :items="['Bandos Rock', 'Banana Reef', 'Victory Wreck']" />
                  <CardListItem title="Current / Drift Dives" image="/images/fpo/destinations-beginner.png"
                    :items="['Banana Reef', 'Bandos Rock', 'Other thilas']" />
                  <CardListItem title="Night Diving" image="/images/fpo/destinations-beginner.png"
                    :items="['House Reef']" />
                  <CardListItem title="Overhangs / Swim-Throughs" image="/images/fpo/destinations-beginner.png"
                    :items="['Banana Reef', 'Other nearby reefs']" />
                </div>
              </div>
              <!-- Courses Tab -->
              <div v-if="activeTab === 'courses'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <CardCarouselItem title="Open Water Diver" image="/images/fpo/destinations-beginner.png"
                    :details="['5-10 hrs', 'Contact shop for dates', 'eLearning only']" />
                  <CardCarouselItem title="Advanced Open Water" image="/images/fpo/destinations-beginner.png"
                    :details="['3-5 days', 'Contact shop for dates', 'eLearning + practical']" />
                  <CardCarouselItem title="Rescue Diver" image="/images/fpo/destinations-beginner.png"
                    :details="['3-4 days', 'Contact shop for dates', 'eLearning + practical']" />
                  <CardCarouselItem title="Divemaster" image="/images/fpo/destinations-beginner.png"
                    :details="['2-3 weeks', 'Contact shop for dates', 'Intensive program']" />
                  <CardCarouselItem title="Specialty Courses" image="/images/fpo/destinations-beginner.png"
                    :details="['1-2 days', 'Contact shop for dates', 'Various specialties']" />
                  <CardCarouselItem title="Instructor Course" image="/images/fpo/destinations-beginner.png"
                    :details="['2-3 weeks', 'Contact shop for dates', 'Professional level']" />
                </div>
              </div>
              <!-- More Information Tab -->
              <div v-if="activeTab === 'information'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                <div class="flex flex-col lg:flex-row gap-6 p-6 border border-gray-300 rounded-md *:w-full">
                  <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Equipment Rental</h3>
                      <ul class="text-base space-y-1">
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
                  <div class="flex flex-col gap-6">
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Gas Mixture</h3>
                      <ul class="text-base space-y-1">
                        <li>Air Fills</li>
                        <li>Nitrox</li>
                      </ul>
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Payment Methods</h3>
                      <ul class="text-base space-y-1">
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
                    <CardDiveShop image="/images/fpo/destinations-beginner.png" title="Dive Bandos – Bandos Maldives"
                      location="Bandos Island, Maldives" />
                    <CardDiveShop image="/images/fpo/destinations-beginner.png" title="Dive Bandos – Bandos Maldives"
                      location="Bandos Island, Maldives" />
                  </div>
                </section>
              </div>
            </div>
          </div>
          <!-- Sidebar -->
          <div class="w-full lg:min-w-1/3 lg:w-1/3 p-2 h-full order-1 lg:order-2">
            <div class="h-full">
              <div class="flex flex-col gap-2">
                <!-- Book Now -->
                <div class="flex flex-col gap-2 p-6 bg-gray-100 rounded-md">
                  <h2 class="text-2xl font-semibold">Book Now</h2>
                  <form class="flex flex-col gap-4">
                    <div class="flex flex-col gap-4">
                      <h3>What type of dive do you want to do?</h3>
                      <div class="flex flex-col gap-2">
                        <fieldset class="flex flex-row gap-2">
                          <input type="radio" name="dive-type" id="certification"
                            class="border border-gray-300 rounded-md p-2" />
                          <label for="certification">Certification</label>
                        </fieldset>
                        <hr class="border-gray-300" />
                        <fieldset class="flex flex-row gap-2">
                          <input type="radio" name="dive-type" id="recreation"
                            class="border border-gray-300 rounded-md p-2" />
                          <label for="recreation">Recreation</label>
                        </fieldset>
                      </div>
                    </div>
                    <button type="submit" class="bg-blue-500 text-white rounded-md p-2 cursor-pointer">Book</button>
                  </form>
                </div>
                <!-- Contact Information -->
                <div class="flex flex-col gap-2 p-6 border border-gray-300 rounded-md">
                  <ul class="space-y-2">
                    <li v-if="contactInfo?.address">
                      <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactInfo.address)}`"
                        target="_blank" class="flex flex-row gap-4 items-center">
                        <MapPin class="min-w-4 max-w-4 h-4" />
                        <span>{{ contactInfo.address }}</span>
                      </a>
                    </li>
                    <li>
                      <div class="flex flex-row gap-4 items-center">
                        <Phone class="min-w-4 max-w-4 h-4" />
                        <span v-if="contactInfo?.phone">{{ contactInfo.phone }}</span>
                        <span v-else class="text-gray-400">No Phone</span>
                      </div>
                    </li>
                    <li>
                      <div class="flex flex-row gap-4 items-center">
                        <Mail class="min-w-4 max-w-4 h-4" />
                        <span v-if="contactInfo?.email">{{ contactInfo.email }}</span>
                        <span v-else class="text-gray-400">No Email</span>
                      </div>
                    </li>
                    <li v-if="contactInfo?.website">
                      <a :href="contactInfo.website" target="_blank" class="flex flex-row gap-4 items-center">
                        <Globe class="min-w-4 max-w-4 h-4" />
                        <span class="truncate">{{ contactInfo.website }}</span>
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
import { MapPin, Phone, Mail, Globe, ChevronLeft } from 'lucide-vue-next'
import CardCarouselItem from '~/components/CardCarouselItem.vue'
import CardListItem from '~/components/CardListItem.vue'
import CardDiveShop from '~/components/CardDiveShop.vue'
import CardReview from '~/components/CardReview.vue'
import { ref, computed } from 'vue'

// Get the route parameter
const route = useRoute()
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
  if (!shopData.value?.description) return []
  return shopData.value.description.split('\n\n').filter(para => para.trim() !== '')
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
  // Save current scroll position before navigating
  saveScrollPosition('shops')
  navigateTo('/shops')
}
</script>
