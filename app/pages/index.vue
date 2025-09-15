<template>
  <div class="grid lg:grid-cols-[200px_auto] min-h-screen *:h-full">
    <div class="bg-neutral-100 hidden lg:block">
      <div class="flex flex-col justify-start gap-56 p-4 sticky top-0 h-full max-h-screen">
        <div class="w-[120px] h-auto">
          <img src="/images/logo-glaucus.svg" class="w-full h-full object-cover" />
        </div>
        <nav class="flex flex-col gap-4 *:text-base">
          <a href="#">Dive Shops</a>
          <a href="#">Shop</a>
          <a href="#">Community</a>
          <a href="#">Your Profile</a>
        </nav>
      </div>
    </div>
    <div class="bg-neutral-50 grid grid-cols-12 gap-4 content-start p-4">
      <div class="col-span-12 order-1">
        <section class="bg-white p-2 flex flex-col lg:flex-row gap-0 lg:min-h-[500px] rounded-md overflow-hidden *:w-full">
          <div class="bg-white flex flex-col justify-end p-4">
            <h1 class="text-4xl font-semibold">Dive Bandos – Bandos Maldives</h1>
          </div>
          <div class="bg-neutral-100 overflow-hidden rounded-sm order-first lg:order-last">
            <img src="https://bandosmaldives.com/wp-content/uploads/2024/06/BM_Dive-2024-11.jpg"
              class="w-full h-full object-cover" />
          </div>
        </section>
      </div>
      <div class="col-span-12 lg:col-span-8 order-3 lg:order-2">
        <div class="flex flex-col gap-4">
          <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-4 p-6">
              <h2 class="text-2xl font-semibold">Details</h2>
              <div class="text-lg">
                Dive Bandos is one of the longest established centres in the country, offering lush underwater gardens,
                colourful fishes and magnificent seascapes.

                We tend to our underwater environments with the recent introduction of our Coral Gardening Project,
                which
                guests can take part in too.

                Dive Bandos is a spacious facility complete with air-conditioned audio-visual classrooms, library, hot
                water
                showers, and spacious storage rooms.

                The equipment we employ includes internationally-reputed brands such as Mares, Scubapro, Aqua Lung, Dive
                Rite and Suunto.

                Please contact the dive center upon your arrival to book the program.
              </div>
            </div>
            <div class="flex flex-row gap-2 p-6 border border-neutral-200 rounded-md *:w-full">
              <div class="flex flex-col gap-2">
                <h3 class="text-xl font-semibold">Hours</h3>
                <ul class="text-lg space-y-1">
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
                <h3 class="text-xl font-semibold">Languages</h3>
                <div class="text-lg">
                  English
                </div>
              </div>
            </div>
          </section>
          <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-4 p-6 bg-neutral-50 sticky top-0">
                <h2 class="text-2xl font-semibold">Dive Destinations</h2>
              </div>
              <div class="">
                <div
                  class="flex flex-col gap-6 *:w-full *:flex *:flex-row *:gap-6 *:border *:border-neutral-200 *:rounded-md *:p-6">
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Beginner / Training Dives</h3>
                      <ul class="text-lg space-y-1">
                        <li>House Reef</li>
                        <li>Lagoon around Bandos</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Shark & Ray / Big Pelagic Dives</h3>
                      <ul class="text-lg space-y-1">
                        <li>House Reef</li>
                        <li>Lankan Reef</li>
                        <li>Banana Reef</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Wreck Diving</h3>
                      <ul class="text-lg space-y-1">
                        <li>Victory Wreck</li>
                        <li>Other small wrecks</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Deep / Advanced Dives (20-30m)</h3>
                      <ul class="text-lg space-y-1">
                        <li>Bandos Rock</li>
                        <li>Banana Reef</li>
                        <li>Victory Wreck</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Current / Drift Dives</h3>
                      <ul class="text-lg space-y-1">
                        <li>Banana Reef</li>
                        <li>Bandos Rock</li>
                        <li>Other "thilas"</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Night Diving</h3>
                      <ul class="text-lg space-y-1">
                        <li>House Reef</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Overhangs / Swim-Throughs</h3>
                      <ul class="text-lg space-y-1">
                        <li>Banana Reef</li>
                        <li>Other nearby reefs</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-4">
              <div class="flex flex-row gap-4 items-center justify-between">
                <div class="flex flex-col gap-4 p-6 bg-neutral-50 sticky top-0">
                  <h2 class="text-2xl font-semibold">Courses</h2>
                </div>
                <div class="flex flex-row gap-0 border border-neutral-200 rounded-md divide-x divide-neutral-200">
                  <!-- Carousel Controls -->
                  <button @click="carouselPrevious" :class="[
                      'flex items-center justify-center p-2',
                      canGoPrevious ? 'hover:bg-neutral-100 cursor-pointer' : 'cursor-auto text-neutral-300'
                    ]">
                    <ChevronLeft class="w-4 h-4" />
                  </button>
                  <button @click="carouselNext" :class="[
                      'flex items-center justify-center p-2',
                      canGoNext ? 'hover:bg-neutral-100 cursor-pointer' : 'cursor-auto text-neutral-300'
                    ]">
                    <ChevronRight class="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div class="overflow-hidden">
                <!-- Carousel Items -->
                <div ref="carouselContainer"
                  class="flex flex-row gap-6 transition-transform duration-300 ease-in-out *:flex *:flex-col *:gap-6 *:border *:border-neutral-200 *:rounded-md *:p-6">
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Open Water Diver</h3>
                      <ul class="text-lg space-y-1">
                        <li>5-10 hrs</li>
                        <li>Contact shop for dates</li>
                        <li>eLearning only</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Advanced Open Water</h3>
                      <ul class="text-lg space-y-1">
                        <li>3-5 days</li>
                        <li>Contact shop for dates</li>
                        <li>eLearning + practical</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Rescue Diver</h3>
                      <ul class="text-lg space-y-1">
                        <li>3-4 days</li>
                        <li>Contact shop for dates</li>
                        <li>eLearning + practical</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Divemaster</h3>
                      <ul class="text-lg space-y-1">
                        <li>2-3 weeks</li>
                        <li>Contact shop for dates</li>
                        <li>Intensive program</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Specialty Courses</h3>
                      <ul class="text-lg space-y-1">
                        <li>1-2 days</li>
                        <li>Contact shop for dates</li>
                        <li>Various specialties</li>
                      </ul>
                    </div>
                  </div>
                  <div>
                    <div class="w-52 h-32 bg-neutral-100 rounded-sm overflow-hidden">
                      <img src="/images/fpo/destinations-beginner.png" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex flex-col gap-2">
                      <h3 class="text-lg font-semibold">Instructor Course</h3>
                      <ul class="text-lg space-y-1">
                        <li>2-3 weeks</li>
                        <li>Contact shop for dates</li>
                        <li>Professional level</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section class="flex flex-col gap-4">
            <div class="flex flex-col gap-4 p-6 bg-neutral-50 sticky top-0">
              <h2 class="text-2xl font-semibold">More Information</h2>
            </div>
            <div class="flex flex-row gap-2 p-6 border border-neutral-200 rounded-md *:w-full">
              <div class="flex flex-col gap-6">
                <div class="flex flex-col gap-2">
                  <h3 class="text-xl font-semibold">Equipment Rental</h3>
                   <ul class="text-lg space-y-1">
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
                  <h3 class="text-xl font-semibold">Gas Mixture</h3>
                  <ul class="text-lg space-y-1">
                    <li>Air Fills</li>
                    <li>Nitrox</li>
                  </ul>
                </div>
                <div class="flex flex-col gap-2">
                  <h3 class="text-xl font-semibold">Payment Methods</h3>
                  <ul class="text-lg space-y-1">
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
          </section>
        </div>
      </div>
      <div class="col-span-12 lg:col-span-4 order-2 lg:order-3">
        <div class="flex flex-col gap-4 sticky top-4">
          <section class="flex flex-col gap-4 p-6 bg-neutral-100 rounded-md">
            <h2 class="text-2xl font-semibold">Book Now</h2>
            <form class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <h3>What type of dive do you want to do?</h3>
                <fieldset class="flex flex-row gap-2">
                  <input type="radio" name="dive-type" id="certification"
                    class="border border-gray-300 rounded-md p-2" />
                  <label for="certification">Certification</label>
                </fieldset>
                <hr class="border-neutral-200" />
                <fieldset class="flex flex-row gap-2">
                  <input type="radio" name="dive-type" id="recreation" class="border border-gray-300 rounded-md p-2" />
                  <label for="recreation">Recreation</label>
                </fieldset>
              </div>
              <button type="submit" class="bg-blue-500 text-white rounded-md p-2 cursor-pointer">Book</button>
            </form>
          </section>
          <section class="flex flex-col gap-2 p-6 border border-neutral-200 rounded-md">
            <ul class="space-y-2">
              <li>
                <a href="#" class="flex flex-row gap-4 items-center">
                  <MapPin class="w-4 h-4" />
                  <span>Bandos Island, Maldives</span>
                </a>
              </li>
              <li>
                <a href="#" class="flex flex-row gap-4 items-center">
                  <Phone class="w-4 h-4" />
                  <span>+960 664-0088</span>
                </a>
              </li>
              <li>
                <a href="#" class="flex flex-row gap-4 items-center">
                  <Mail class="w-4 h-4" />
                  <span>resv@bandos.com.mv</span>
                </a>
              </li>
              <li>
                <a href="#" class="flex flex-row gap-4 items-center">
                  <Globe class="w-4 h-4" />
                  <span>http://www.bandosmaldives.com/</span>
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { MapPin, Phone, Mail, Globe, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

// Carousel functionality - wrapped in a modular function
function createCarousel(containerRef, itemsPerSlide = 3) {
  const currentIndex = ref(0)
  const totalItems = ref(0)
  const canGoNext = ref(true)
  const canGoPrevious = ref(false)

  function updateButtonStates() {
    canGoPrevious.value = currentIndex.value > 0
    canGoNext.value = currentIndex.value < (totalItems.value - itemsPerSlide)
  }

  function updateCarouselPosition() {
    if (containerRef.value) {
      const containerWidth = containerRef.value.parentElement.offsetWidth
      const gapSize = 24 // 6 * 4 = 24px per gap (gap-6 = 1.5rem = 24px)
      
      // Calculate item width for display (showing itemsPerSlide items)
      const totalGaps = itemsPerSlide - 1
      const totalGapWidth = gapSize * totalGaps
      const availableWidth = containerWidth - totalGapWidth
      const itemWidth = availableWidth / itemsPerSlide
      
      // Calculate translation: slide by 1 item at a time
      const translateX = -(currentIndex.value * (itemWidth + gapSize))
      
      containerRef.value.style.transform = `translateX(${translateX}px)`
      updateButtonStates()
    }
  }

  function carouselNext() {
    const maxIndex = totalItems.value - itemsPerSlide
    if (currentIndex.value < maxIndex) {
      currentIndex.value += 1 // Always slide by 1, regardless of itemsPerSlide
      updateCarouselPosition()
    }
  }

  function carouselPrevious() {
    if (currentIndex.value > 0) {
      currentIndex.value -= 1 // Always slide by 1, regardless of itemsPerSlide
      updateCarouselPosition()
    }
  }

  function setItemWidths() {
    if (containerRef.value) {
      const containerWidth = containerRef.value.parentElement.offsetWidth
      const gapSize = 24 // 6 * 4 = 24px per gap (gap-6 = 1.5rem = 24px)
      
      // Calculate item width for displaying itemsPerSlide items
      const totalGaps = itemsPerSlide - 1
      const totalGapWidth = gapSize * totalGaps
      const availableWidth = containerWidth - totalGapWidth
      const itemWidth = availableWidth / itemsPerSlide
      
      Array.from(containerRef.value.children).forEach(item => {
        item.style.width = `${itemWidth}px`
        item.style.flexShrink = '0'
      })
    }
  }

  function initializeCarousel() {
    if (containerRef.value) {
      totalItems.value = containerRef.value.children.length
      setItemWidths()
      updateCarouselPosition()
    }
  }

  return {
    carouselNext,
    carouselPrevious,
    initializeCarousel,
    canGoNext,
    canGoPrevious
  }
}

// Initialize carousel
const carouselContainer = ref(null)
const { carouselNext, carouselPrevious, initializeCarousel, canGoNext, canGoPrevious } = createCarousel(carouselContainer, 3)

onMounted(() => {
  initializeCarousel()
})
</script>