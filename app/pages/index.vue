<template>
  <div class="h-screen overflow-hidden">
    <div class="h-full w-screen flex">
      <!-- Sidebar -->
      <div class="w-56 shrink-0 bg-neutral-50 hidden lg:flex flex-col justify-center gap-56 p-2 h-full relative">
        <div class="w-[100px] h-auto absolute top-4 left-3">
          <img src="/images/logo-glaucus.svg" class="w-full h-full object-cover" />
        </div>
        <nav
          class="w-full flex flex-col gap-1 *:text-neutral-600 *:text-sm *:font-medium *:bg-transparent *:hover:bg-neutral-100 *:hover:text-neutral-700 *:px-4 *:py-2 *:rounded-sm">
          <a class="!bg-neutral-200/50 !text-black" href="#">Dive Shops</a>
          <a href="#">Shop</a>
          <a href="#">Community</a>
          <a href="#">Your Profile</a>
        </nav>
      </div>
      <!-- Main -->
      <div class="p-2 pl-0 w-full flex-1 h-full">
        <div class="border border-neutral-200 rounded-xl h-full">
          <div class="flex flex-col justify-between h-full gap-0 divide-y divide-neutral-200">
            <!-- Header -->
            <div class="flex flex-col justify-center z-50 w-full divide-y divide-neutral-200">
              <div class="flex flex-row justify-between items-end gap-2 p-2">
                <h1 class="text-6xl font-medium w-[12ch]">Dive Bandos – Bandos Maldives</h1>

                <!-- Image -->
                <div class="hidden lg:block bg-neutral-100 overflow-hidden rounded-sm w-[400px] h-[400px]">
                  <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover aspect-square" />
                </div>
              </div>
              <!-- Tabs -->
              <div class="flex flex-row gap-1 items-center p-2 overflow-x-auto font-medium">
                <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" :class="[
                  'flex flex-row gap-2 rounded-md p-2 px-3 w-fit cursor-pointer transition-color whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                ]">
                  {{ tab.label }}
                </button>
              </div>
            </div>
            <!-- Content -->
            <div
              class="flex flex-col lg:flex-row items-stretch gap-0 divide-y lg:divide-x lg:divide-y-0 divide-neutral-200 w-full lg:h-0 lg:flex-1 overflow-y-auto lg:overflow-y-visible">
              <!-- Business Main -->
              <div class="w-full flex flex-col border-b-0 h-full order-2 lg:order-1">
                <!-- Tab Content -->
                <div class="flex flex-col gap-4 h-full w-full">
                  <!-- Details Tab -->
                  <div v-if="activeTab === 'details'" class="flex flex-col gap-4 p-2 h-full overflow-y-auto">
                    <section class="flex flex-col gap-4">
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
                        </div>
                      </div>
                    </section>
                  </div>
                  <!-- Dive Destinations Tab -->
                  <div v-if="activeTab === 'destinations'" class="flex flex-col gap-2 p-2 h-full overflow-y-auto">
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
                      <CardListItem title="Beginner / Training Dives" image="/images/fpo/destinations-beginner.png"
                        :items="['House Reef', 'Lagoon around Bandos']" />
                      <CardListItem title="Shark & Ray / Big Pelagic Dives"
                        image="/images/fpo/destinations-beginner.png"
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
                    <div class="flex flex-col lg:flex-row gap-6 p-6 border border-neutral-200 rounded-md *:w-full">
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
                        <CardDiveShop image="/images/fpo/destinations-beginner.png"
                          title="Dive Bandos – Bandos Maldives" location="Bandos Island, Maldives" />
                        <CardDiveShop image="/images/fpo/destinations-beginner.png"
                          title="Dive Bandos – Bandos Maldives" location="Bandos Island, Maldives" />
                      </div>
                    </section>
                  </div>
                </div>
              </div>
              <!-- Business Sidebar -->
              <div class="w-full lg:w-[360px] p-2 h-full order-1 lg:order-2">
                <div class="h-full">
                  <div class="flex flex-col gap-2">
                    <!-- Book Now -->
                    <div class="flex flex-col gap-2 p-6 bg-neutral-100 rounded-md">
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
                            <hr class="border-neutral-200" />
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
                    <div class="flex flex-col gap-2 p-6 border border-neutral-200 rounded-md">
                      <ul class="space-y-2">
                        <li>
                          <a href="#" class="flex flex-row gap-4 items-center">
                            <MapPin class="min-w-4 max-w-4 h-4" />
                            <span>Bandos Island, Maldives</span>
                          </a>
                        </li>
                        <li>
                          <a href="#" class="flex flex-row gap-4 items-center">
                            <Phone class="min-w-4 max-w-4 h-4" />
                            <span>+960 664-0088</span>
                          </a>
                        </li>
                        <li>
                          <a href="#" class="flex flex-row gap-4 items-center">
                            <Mail class="min-w-4 max-w-4 h-4" />
                            <span>resv@bandos.com.mv</span>
                          </a>
                        </li>
                        <li>
                          <a href="#" class="flex flex-row gap-4 items-center">
                            <Globe class="min-w-4 max-w-4 h-4" />
                            <span class="truncate">http://www.bandosmaldives.com/</span>
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
      </div>
    </div>
  </div>

</template>

<script setup>
import { MapPin, Phone, Mail, Globe, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import CardCarouselItem from '~/components/CardCarouselItem.vue'
import CardListItem from '~/components/CardListItem.vue'
import CardDiveShop from '~/components/CardDiveShop.vue'
import CardReview from '~/components/CardReview.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'

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

// Full description text
const fullDescription = `Dive Bandos is one of the longest established centres in the country, offering lush underwater gardens, colourful fishes and magnificent seascapes.

We tend to our underwater environments with the recent introduction of our Coral Gardening Project, which guests can take part in too.

Dive Bandos is a spacious facility complete with air-conditioned audio-visual classrooms, library, hot water showers, and spacious storage rooms.

The equipment we employ includes internationally-reputed brands such as Mares, Scubapro, Aqua Lung, Dive Rite and Suunto.

Please contact the dive center upon your arrival to book the program.`

// Computed properties for dynamic truncation
const paragraphs = computed(() => {
  return fullDescription.split('\n\n').filter(para => para.trim() !== '')
})

const firstParagraph = computed(() => {
  return paragraphs.value[0] || ''
})

const remainingParagraphs = computed(() => {
  return paragraphs.value.slice(1)
})


// // Carousel functionality - wrapped in a modular function
// function createCarousel(containerRef) {
//   const currentIndex = ref(0)
//   const totalItems = ref(0)
//   const canGoNext = ref(true)
//   const canGoPrevious = ref(false)
//   const itemsPerSlide = ref(3) // Will be updated responsively

//   function getItemsPerSlide() {
//     if (typeof window === 'undefined') return 3 // SSR fallback
    
//     const width = window.innerWidth
//     if (width <= 375) return 1.5
//     if (width <= 640) return 2.5
//     return 3
//   }

//   function updateButtonStates() {
//     canGoPrevious.value = currentIndex.value > 0
//     canGoNext.value = currentIndex.value < (totalItems.value - Math.floor(itemsPerSlide.value))
//   }

//   function updateCarouselPosition() {
//     if (containerRef.value) {
//       const containerWidth = containerRef.value.parentElement.offsetWidth
//       const gapSize = 24 // 6 * 4 = 24px per gap (gap-6 = 1.5rem = 24px)
      
//       // Calculate item width for display (showing itemsPerSlide items)
//       const currentItemsPerSlide = itemsPerSlide.value
//       const totalGaps = Math.floor(currentItemsPerSlide) - 1
//       const totalGapWidth = gapSize * totalGaps
//       const availableWidth = containerWidth - totalGapWidth
//       const itemWidth = availableWidth / currentItemsPerSlide
      
//       // Calculate translation: slide by 1 item at a time
//       const translateX = -(currentIndex.value * (itemWidth + gapSize))
      
//       containerRef.value.style.transform = `translateX(${translateX}px)`
//       updateButtonStates()
//     }
//   }

//   function carouselNext() {
//     const maxIndex = totalItems.value - Math.floor(itemsPerSlide.value)
//     if (currentIndex.value < maxIndex) {
//       currentIndex.value += 1 // Always slide by 1, regardless of itemsPerSlide
//       updateCarouselPosition()
//     }
//   }

//   function carouselPrevious() {
//     if (currentIndex.value > 0) {
//       currentIndex.value -= 1 // Always slide by 1, regardless of itemsPerSlide
//       updateCarouselPosition()
//     }
//   }

//   function setItemWidths() {
//     if (containerRef.value && containerRef.value.parentElement) {
//       const containerWidth = containerRef.value.parentElement.offsetWidth
      
//       // Only proceed if container has a valid width
//       if (containerWidth > 0) {
//         const gapSize = 24 // 6 * 4 = 24px per gap (gap-6 = 1.5rem = 24px)
        
//         // Calculate item width for displaying itemsPerSlide items
//         const currentItemsPerSlide = itemsPerSlide.value
//         const totalGaps = Math.floor(currentItemsPerSlide) - 1
//         const totalGapWidth = gapSize * totalGaps
//         const availableWidth = containerWidth - totalGapWidth
//         const itemWidth = availableWidth / currentItemsPerSlide
        
//         Array.from(containerRef.value.children).forEach(item => {
//           item.style.width = `${itemWidth}px`
//           item.style.flexShrink = '0'
//           item.style.minWidth = `${itemWidth}px`
//         })
//       }
//     }
//   }

//   let resizeTimeout = null

//   function updateResponsiveSettings() {
//     // Debounce resize events to prevent excessive calculations
//     if (resizeTimeout) {
//       clearTimeout(resizeTimeout)
//     }
    
//     resizeTimeout = setTimeout(() => {
//       const newItemsPerSlide = getItemsPerSlide()
//       const shouldUpdate = newItemsPerSlide !== itemsPerSlide.value
      
//       if (shouldUpdate) {
//         itemsPerSlide.value = newItemsPerSlide
//       }
      
//       // Always update widths and position on resize, even if itemsPerSlide hasn't changed
//       // This handles cases where container size changes but breakpoint doesn't
//       setItemWidths()
//       updateCarouselPosition()
//     }, 100) // 100ms debounce
//   }

//   function initializeCarousel() {
//     if (containerRef.value) {
//       totalItems.value = containerRef.value.children.length
//       itemsPerSlide.value = getItemsPerSlide()
      
//       // Use a small delay to ensure DOM is fully rendered
//       setTimeout(() => {
//         setItemWidths()
//         updateCarouselPosition()
//       }, 50)
      
//       // Add resize listener
//       window.addEventListener('resize', updateResponsiveSettings)
//     }
//   }

//   function cleanup() {
//     window.removeEventListener('resize', updateResponsiveSettings)
//     if (resizeTimeout) {
//       clearTimeout(resizeTimeout)
//     }
//   }

//   return {
//     carouselNext,
//     carouselPrevious,
//     initializeCarousel,
//     cleanup,
//     canGoNext,
//     canGoPrevious
//   }
// }

// // Initialize carousel
// const carouselContainer = ref(null)
// const { carouselNext, carouselPrevious, initializeCarousel, cleanup, canGoNext, canGoPrevious } = createCarousel(carouselContainer)

// onMounted(() => {
//   initializeCarousel()
// })

// onUnmounted(() => {
//   cleanup()
// })
</script>
