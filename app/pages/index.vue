<template>
  <NuxtLayout name="default">
    <!-- Loading Screen -->
    <Transition @enter="onLoadingEnter" @leave="onLoadingLeave" :css="false">
      <div v-if="isPageLoading"
        class="fixed inset-0 z-[100] bg-white dark:bg-zinc-900 flex items-center justify-center">
        <img src="/images/glaucus-logo-emblem.svg" alt="Glaucus" class="w-24 h-24" />
      </div>
    </Transition>

    <div class="flex flex-col h-full w-full relative">
      <!-- Header -->
      <div class="min-h-10 flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0">
        <div class="flex items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700">
          <button @click="openMobileMenu"
            class="flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer">
            <Menu class="w-5 h-5" />
          </button>
          <h1
            class="text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white overflow-auto truncate">
            Dive Shop Search</h1>
        </div>
        <div class="flex items-center gap-1 p-1 lg:p-4">
          <button v-if="canStepBack" @click="stepBack"
            class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer"
            title="Remove last message and your last reply so you can redo that step">
            Step back
          </button>
          <button v-if="messages.length > 0" @click="clearConversation"
            class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer">
            New Chat
          </button>
        </div>
      </div>

      <!-- Main Content Area - Split View on Desktop -->
      <div class="flex-1 flex flex-row overflow-hidden relative">
        <!-- Chat Section -->
        <div :class="[
          'flex flex-col h-full transition-all duration-300 ease-in-out relative',
          selectedShopId ? 'w-full lg:w-1/2' : 'w-full'
        ]">
          <!-- Messages Container -->
          <div ref="messagesContainer"
            class="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-2 *:max-w-3xl *:mx-auto *:w-full">

            <div v-if="messages.length === 0" class="flex flex-col items-center justify-center gap-8 h-full">
              <div class="text-center space-y-4 flex flex-col items-center">
                <h2 class="max-w-2xl lg:text-2xl font-bold text-zinc-900 dark:text-white">
                  Tell me what you're looking for in your diving experience, and I'll help you find the best dive shops.
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  <button v-for="example in exampleQueries" :key="example" @click="sendMessage(example)"
                    class="text-left p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900">
                    <p class="text-sm text-zinc-700 dark:text-zinc-300">{{ example }}</p>
                  </button>
                </div>
              </div>
            </div>

            <!-- Message history -->
            <div v-for="(msg, index) in messages" :key="index" class="">
              <!-- User message -->
              <div v-if="msg.role === 'user'" class="flex justify-end">
                <div class="max-w-[80%] bg-blue-600 text-white rounded-lg p-2">
                  <p class="text-sm lg:text-base">{{ msg.content }}</p>
                </div>
              </div>

              <!-- Assistant message -->
              <div v-else-if="msg.role === 'assistant'" class="flex justify-start">
                <div class="md:max-w-[90%] flex-1 min-w-0 flex flex-col gap-2">
                  <!-- AI text response (chevron inside bubble when shown) -->
                  <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2">
                    <p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap flex-1 min-w-0 overflow-hidden text-ellipsis">{{ msg.content }}
                    </p>
                    <button
                      v-if="(bookingShopForDrawer || (msg.shopId && msg.shopName)) && !(msg.shops && msg.shops.length > 0)"
                      type="button"
                      @click="openBookingFormDrawerFromMessage(msg)"
                      class="w-10 shrink-0 self-stretch flex items-center justify-center rounded-sm border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 transition-colors cursor-pointer"
                      aria-label="Open booking form"
                    >
                      <ChevronRight class="w-5 h-5" />
                    </button>
                  </div>

                  <!-- Shop results -->
                  <div v-if="msg.shops && msg.shops.length > 0" class="flex flex-col gap-2 md:p-2">
                    <div class="flex items-center gap-2 text-sm text-zinc-600">
                      <span class="font-medium">Top Results:</span>
                    </div>
                    <div class="grid grid-cols-1 gap-3">
                      <CardSearchResult v-for="shop in msg.shops" :key="shop.id" :shop="shop"
                        :active="selectedShopId === shop.id"
                        @shop-selected="handleShopSelected"
                        @view-details="handleViewDetails" />
                    </div>

                    <!-- Results summary: show which range we're on (e.g. results 11–15 of 16) -->
                    <div v-if="msg.totalResults && msg.totalResults > msg.shops.length" class="text-sm text-zinc-500">
                      {{ getResultsRangeLabel(index) }}
                    </div>
                  </div>

                  <!-- Selectable options: Book chip (white) first, then Load next 5 -->
                  <div v-if="(msg.selectableOptions && msg.selectableOptions.length > 0) || (msg.shops?.length && selectedShopId && selectedShopName)" class="flex flex-wrap gap-2 p-2">
                    <button
                      v-if="msg.shops?.length && selectedShopId && selectedShopName"
                      type="button"
                      @click="sendMessage(selectedShopName ? `Let's book ${selectedShopName}` : 'Let\'s book this')"
                      class="px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                    >
                      Let's book {{ selectedShopName }}
                    </button>
                    <button
                      v-for="(opt, i) in (msg.selectableOptions || []).filter(o => o.label !== 'Load next 20')"
                      :key="i"
                      type="button"
                      @click="sendMessage(opt.value, opt.label)"
                      class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      {{ opt.label }}
                    </button>
                  </div>

                  <!-- Rental gear: equipment chips when available; selected = filled style, click toggles add/remove -->
                  <div v-if="Array.isArray(msg.rentalEquipmentOptions)" class="flex flex-wrap gap-2 p-2">
                    <button
                      v-for="eq in msg.rentalEquipmentOptions"
                      :key="eq.id"
                      type="button"
                      @click="sendMessage(getGearChipClickValue(msg, eq))"
                      :class="isGearChipSelected(msg, eq)
                        ? 'px-3 py-1.5 text-sm rounded-full border border-black dark:border-white text-black dark:text-white transition-colors cursor-pointer font-medium'
                        : 'px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 text-zinc-500 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 dark:hover:text-white transition-colors cursor-pointer'"
                    >
                      {{ eq.name }}
                    </button>
                    <button
                      v-if="!msg.hideNoneForGear"
                      type="button"
                      @click="sendMessage('none')"
                      class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                    >
                      None
                    </button>
                    <button
                      type="button"
                      @click="sendMessage('done')"
                      class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                    >
                      Done
                    </button>
                  </div>

                  <!-- Dive sites: Any + Done first (50/50), then shop-specific site chips (w-fit) -->
                  <div v-if="msg.diveSiteOptions && msg.diveSiteOptions.length > 0" class="flex flex-wrap gap-2">
                    <div class="flex gap-2 w-full">
                      <button
                        type="button"
                        @click="sendMessage('any')"
                        class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                      >
                        Any
                      </button>
                      <button
                        type="button"
                        @click="sendMessage('done')"
                        class="flex-1 min-w-0 px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                    <button
                      v-for="site in msg.diveSiteOptions"
                      :key="site.id"
                      type="button"
                      @click="sendMessage(site.name)"
                      class="w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                    >
                      {{ site.name }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading indicator -->
            <div v-if="isLoading" class="flex justify-start">
              <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
                <div class="flex items-center gap-2">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600"></div>
                  <span class="text-sm text-zinc-900 dark:text-zinc-200">thinking...</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input area -->
          <div class="flex items-stretch justify-center z-100 overflow-hidden">
            <div class="bg-transparent p-0.5 pt-0 backdrop-blur-sm 2xl:min-w-md max-w-4xl w-full rounded-full">
              <div :class="[
                'p-0.5 shrink-0 bg-transparent transition-colors ease-in-out delay-100 rounded-full w-full relative overflow-x-hidden overflow-y-visible gradient-container z-0',
                isLoading ? 'animate-ring-gradient !bg-[#02C8FF]' : ''
              ]">
                <form class="w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 z-10"
                  @submit.prevent="handleSubmit">
                  <div class="flex items-center gap-1.5 w-full min-w-0">
                    <div class="flex-1 min-w-0 h-full">
                      <input ref="chatInputRef" v-model="userInput" type="text" :disabled="isLoading"
                        placeholder="Ask me anything about dive shops..."
                        class="w-full h-full outline-none text-zinc-900 dark:text-white font-medium text-sm tracking-none disabled:cursor-not-allowed indent-2 p-4" />
                    </div>
                    <div class="h-full shrink-0">
                      <button type="submit" :disabled="isLoading || !userInput.trim()"
                        class="p-2 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-600 disabled:cursor-not-allowed font-medium disabled:*:opacity-20">
                        <ArrowUp v-if="!isLoading" class="w-6 h-6" />
                        <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        <!-- Shop Detail Panel - Desktop Split View -->
        <Transition @enter="onShopPanelEnter" @leave="onShopPanelLeave" :css="false">
          <div v-if="selectedShopId && isDesktop"
            class="w-1/2 h-full border-l border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
            <ShopDetailPanel :key="selectedShopId" :shop-id="selectedShopId"
              :is-in-booking-flow="isInBookingFlowForShop(selectedShopId)"
              :is-form-open="isBookingFormOpen"
              :on-start-booking="handleStartBookingFromPanel"
              :on-show-form="handleShowFormFromPanel"
              :on-hide-form="handleHideFormFromPanel"
              @close="closeShopDetail" />
          </div>
        </Transition>

        <!-- Shop Detail Panel - Mobile Drawer (only when user taps "View details", not on card tap) -->
        <Transition @enter="onMobileDrawerEnter" @leave="onMobileDrawerLeave" :css="false">
          <div v-if="mobileDetailShopId && !isDesktop" class="fixed inset-0 z-50 lg:hidden">
            <!-- Backdrop -->
            <div @click="closeShopDetail" class="absolute inset-0 bg-black/50"></div>
            <!-- Drawer -->
            <div
              class="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 h-full overflow-hidden">
              <ShopDetailPanel :key="mobileDetailShopId" :shop-id="mobileDetailShopId"
              :is-in-booking-flow="isInBookingFlowForShop(mobileDetailShopId)"
              :is-form-open="isBookingFormOpen"
              :on-start-booking="handleStartBookingFromPanel"
              :on-show-form="handleShowFormFromPanel"
              :on-hide-form="handleHideFormFromPanel"
              @close="closeShopDetail" />
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch, onUnmounted } from 'vue'
import { Menu, ArrowUp, ChevronRight } from 'lucide-vue-next'
import gsap from 'gsap'
import CardSearchResult from '~/components/CardSearchResult.vue'
import ShopDetailPanel from '~/components/ShopDetailPanel.vue'
import { useSearchCache } from '~/composables/useSearchCache'
import { useDrawer } from '~/composables/useDrawer'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/composables/useSupabase'

// Get route to check for initial query
const route = useRoute()
const { isSignedIn } = useAuth()
const { client } = useSupabase()
/** Profile snapshot for agent prefill (name, email, defaultDiver); set when signed in. */
const profilePrefillSnapshot = ref(null)
watch(isSignedIn, async (signedIn) => {
  if (!signedIn) {
    profilePrefillSnapshot.value = null
    return
  }
  try {
    const { data } = await client.from('profiles').select('display_name, email, default_diver, default_divers').single()
    if (data) {
      const defaultDivers = Array.isArray(data.default_divers) && data.default_divers.length > 0
        ? data.default_divers.map((d) => ({
            name: d.name,
            certification_number: d.certification_number,
            number_of_dives: d.number_of_dives,
            height: d.height,
            height_unit: d.height_unit,
            weight: d.weight,
            weight_unit: d.weight_unit,
            gear: Array.isArray(d.gear) ? d.gear.map((g) => ({ gear_type: g.gear_type ?? g.gearType })) : [],
            times_used: typeof d.times_used === 'number' ? d.times_used : undefined
          }))
        : null
      const dd = data.default_diver && typeof data.default_diver === 'object' ? data.default_diver : null
      profilePrefillSnapshot.value = {
        name: data.display_name ?? undefined,
        email: data.email ?? undefined,
        defaultDivers: defaultDivers ?? undefined,
        defaultDiver: !defaultDivers && dd ? {
          name: dd.name,
          certification_number: dd.certification_number,
          number_of_dives: dd.number_of_dives,
          height: dd.height,
          height_unit: dd.height_unit,
          weight: dd.weight,
          weight_unit: dd.weight_unit
        } : undefined
      }
    }
  } catch {
    profilePrefillSnapshot.value = null
  }
}, { immediate: true })

// State
const userInput = ref('')
const chatInputRef = ref(null)
const isLoading = ref(false)
const messages = ref([])
const messagesContainer = ref(null)
const isRestoringCache = ref(true)
const abortController = ref(null)
const selectedShopId = ref(null)
/** Carried-over booking form data when user chose "Pick a new diveshop"; sent with next "Book with X" so details transfer. */
const pendingBookingPayload = ref(null)
/** On mobile, drawer opens only when user taps "View details"; card tap only selects for booking. */
const mobileDetailShopId = ref(null)
const isPageLoading = ref(true)

// Selected shop name for "Book for [name]" chip (from results list or booking message)
const selectedShopName = computed(() => {
  if (!selectedShopId.value) return null
  const msgWithShops = [...messages.value].reverse().find(m => m.shops?.length)
  const shop = msgWithShops?.shops?.find(s => s.id === selectedShopId.value)
  if (shop?.business_name) return shop.business_name
  const bookingMsg = [...messages.value].reverse().find(m => m.shopId === selectedShopId.value && m.shopName)
  return bookingMsg?.shopName ?? null
})

// Latest booking payload from chat (for pre-filling the booking-form drawer and sending to API)
const lastBookingPayload = computed(() => {
  const m = [...messages.value].reverse().find(m => {
    if (m.role !== 'assistant' || m.intent !== 'booking') return false
    return m.payload != null || (m && 'bookingPayload' in m && m.bookingPayload != null)
  })
  const p = m && (m.payload !== undefined ? m.payload : m.bookingPayload)
  return p ?? undefined
})

// Shop to use for booking-form drawer (selected shop, or from any message in conversation)
const bookingShopForDrawer = computed(() => {
  if (selectedShopId.value && selectedShopName.value) return { id: selectedShopId.value, name: selectedShopName.value }
  const m = [...messages.value].reverse().find(m => m.role === 'assistant' && (m.shopId || m.shops?.length))
  if (m?.shopId && m?.shopName) return { id: m.shopId, name: m.shopName }
  const shop = m?.shops?.[0]
  if (shop) return { id: shop.id, name: shop.business_name }
  return null
})

// True when we're in the AI booking flow for this shop (so panel shows "Show form" instead of "Start Booking")
function isInBookingFlowForShop (shopId) {
  if (!shopId || bookingShopForDrawer.value?.id !== shopId) return false
  return messages.value.some(m => m.role === 'assistant' && m.intent === 'booking')
}

// Start booking via AI agent (from "Start Booking" in right panel)
function handleStartBookingFromPanel (shopId, shopName) {
  selectedShopId.value = shopId
  sendMessage(shopName ? `Let's book ${shopName}` : "Let's book this")
}

// Open booking form drawer (from "Show form" in right panel when already in booking flow)
function handleShowFormFromPanel () {
  openBookingFormDrawer()
}

function handleHideFormFromPanel () {
  closeDrawer()
}

// Desktop detection
const getInitialDesktop = () => {
  if (typeof window === 'undefined') {
    return true
  }
  return window.innerWidth >= 1024
}

const isDesktop = ref(getInitialDesktop())

const updateIsDesktop = () => {
  if (typeof window === 'undefined') return
  isDesktop.value = window.innerWidth >= 1024
}

onMounted(() => {
  updateIsDesktop()
  window.addEventListener('resize', updateIsDesktop)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateIsDesktop)
})

// Example queries for initial state
const exampleQueries = [
  "I want to do wreck diving in Bali from Jan 1-7, 2026",
  "Looking for beginner-friendly dive shops in the Maldives",
  "Find highly rated dive shops in Thailand",
  "Shops in Mexico that offer advanced certification courses"
]

// Cache helpers
const { getCache, setCache, clearCache } = useSearchCache()

// Drawer (mobile menu + booking form)
const { openMobileMenu, openDrawer, closeDrawer, isOpen, contentType, drawerData, updateBookingPayloadIfOpen } = useDrawer()

const isBookingFormOpen = computed(() => isOpen.value && contentType.value === 'booking-form')

const persistCache = () => {
  if (isRestoringCache.value) return

  const drawerWasOpen = isOpen.value && contentType.value === 'booking-form'
  setCache({
    messages: messages.value,
    userInput: userInput.value,
    lastQuery: typeof route.query.q === 'string' ? route.query.q : null,
    selectedShopId: selectedShopId.value,
    mobileDetailShopId: mobileDetailShopId.value,
    drawerOpen: drawerWasOpen,
    drawerShopId: drawerWasOpen ? (drawerData.shopId ?? null) : null,
    drawerShopName: drawerWasOpen ? (drawerData.shopName ?? null) : null
  })
}

// Restore cache or run initial query
onMounted(async () => {
  const cachedState = getCache()
  const initialQuery = typeof route.query.q === 'string' ? route.query.q : null

  if (cachedState && Array.isArray(cachedState.messages) && cachedState.messages.length > 0) {
    messages.value = cachedState.messages
    userInput.value = cachedState.userInput || ''
    // Restore layout: selected dive shop panel and/or booking form drawer
    if (cachedState.selectedShopId) selectedShopId.value = cachedState.selectedShopId
    if (cachedState.mobileDetailShopId) mobileDetailShopId.value = cachedState.mobileDetailShopId

    if (!initialQuery || initialQuery === cachedState.lastQuery) {
      isRestoringCache.value = false
      // Wait for hydration to complete before hiding loading screen
      await nextTick()
      requestAnimationFrame(() => {
        setTimeout(() => {
          isPageLoading.value = false
          // Reopen booking form drawer if it was open when cache was saved (e.g. after sign-in)
          if (cachedState.drawerOpen && cachedState.drawerShopId) {
            const payload = [...(cachedState.messages || [])].reverse().find((m) => {
              if (m?.role !== 'assistant' || m?.intent !== 'booking') return false
              return m.payload != null || (m && 'bookingPayload' in m && m.bookingPayload != null)
            })
            const bookingPayload = payload && (payload.payload !== undefined ? payload.payload : payload.bookingPayload)
            openDrawer('booking-form', {
              shopId: cachedState.drawerShopId,
              shopName: cachedState.drawerShopName || 'Dive shop',
              bookingPayload: bookingPayload ?? undefined
            })
          }
        }, 300)
      })
      return
    }
  }

  if (cachedState && initialQuery && initialQuery !== cachedState.lastQuery) {
    clearCache()
    messages.value = []
    userInput.value = ''
  }

  if (initialQuery) {
    isRestoringCache.value = false
    await sendMessage(initialQuery)
    // Wait for hydration to complete before hiding loading screen
    await nextTick()
    requestAnimationFrame(() => {
      setTimeout(() => {
        isPageLoading.value = false
      }, 300)
    })
    return
  }

  isRestoringCache.value = false
  // Wait for hydration to complete before hiding loading screen
  await nextTick()
  requestAnimationFrame(() => {
    setTimeout(() => {
      isPageLoading.value = false
    }, 300)
  })
})

// Persist cache when state changes
watch([messages, userInput], persistCache, { deep: true })
watch([selectedShopId, mobileDetailShopId, isOpen, drawerData], persistCache, { deep: true })

// Auto-scroll to bottom when new messages arrive
const scrollToBottom = async () => {
  await nextTick()
  // Use requestAnimationFrame to ensure DOM is fully rendered
  requestAnimationFrame(() => {
    if (messagesContainer.value) {
      const container = messagesContainer.value
      // Use scrollTo for better browser compatibility
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  })
  // Fallback: try again after a short delay in case content is still loading
  setTimeout(() => {
    if (messagesContainer.value) {
      const container = messagesContainer.value
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, 150)
}

// Watch for message updates and auto-scroll
watch(messages, () => {
  scrollToBottom()
}, { deep: true, flush: 'post' })

// Also watch the length to catch array mutations
watch(() => messages.value.length, () => {
  scrollToBottom()
})

// Pagination status: which range this message's results represent (1-based). E.g. first page 1–5, second 6–10.
function getResultsRange (msgIndex) {
  let previous = 0
  for (let i = 0; i < msgIndex; i++) {
    const m = messages.value[i]
    if (m?.role === 'assistant' && m.shops?.length) previous += m.shops.length
  }
  const msg = messages.value[msgIndex]
  const count = msg?.shops?.length ?? 0
  const total = msg?.totalResults ?? 0
  return { start: previous + 1, end: previous + count, total }
}

function getResultsRangeLabel (msgIndex) {
  const { start, end, total } = getResultsRange(msgIndex)
  if (start === end) return `Showing result ${start} of ${total} dive shops found`
  return `Showing results ${start}–${end} of ${total} dive shops found`
}

/** Current diver's selected gear names (for messages showing gear chips) — used to show selected state and toggle remove */
function getSelectedGearNamesForMessage (msg) {
  const payload = msg.payload ?? msg.bookingPayload
  const divers = payload?.divers ?? []
  const current = divers.find(d => !d.gearAsked)
  const gear = current?.gear ?? []
  return new Set(gear.map(g => (g.gearType ?? g.gear_type ?? '').toString().trim().toLowerCase()).filter(Boolean))
}
function getGearChipClickValue (msg, eq) {
  const selected = getSelectedGearNamesForMessage(msg)
  const name = (eq.name ?? '').toString().trim()
  if (selected.has(name.toLowerCase())) return `remove ${name}`
  return name
}
function isGearChipSelected (msg, eq) {
  return getSelectedGearNamesForMessage(msg).has((eq.name ?? '').toString().trim().toLowerCase())
}

// Send message to AI. Optional displayText: show this in the chat bubble while sending messageText to the API (e.g. chip label vs value).
const sendMessage = async (messageText, displayText) => {
  const message = messageText ?? userInput.value.trim()
  
  if (!message) return
  
  // Cancel any in-progress request
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }

  const textToShow = displayText ?? message

  // Add user message to chat (show label in bubble when provided, e.g. "Load next 5" instead of "Show more")
  messages.value.push({
    role: 'user',
    content: textToShow
  })
  
  // Clear input
  userInput.value = ''
  
  // Scroll to bottom
  await scrollToBottom()
  
  // Set loading state
  isLoading.value = true
  
  // Create new AbortController for this request
  abortController.value = new AbortController()
  const currentAbortController = abortController.value
  
  try {
    // Call API with abort signal
    const lastShopsFromHistory = messages.value.filter(m => m.role === 'assistant' && m.shops?.length).pop()?.shops
    const lastShops = lastShopsFromHistory?.map(s => ({ id: s.id, business_name: s.business_name })) ?? undefined

    const lastAssistantMessage = [...messages.value].reverse().find(m => m.role === 'assistant')
    const inBookingFlow = lastAssistantMessage?.intent === 'booking' && lastAssistantMessage?.shopId
    const lastIntent = inBookingFlow ? 'booking' : undefined
    const lastBookingShopId = inBookingFlow ? lastAssistantMessage.shopId : undefined
    const lastBookingShopName = inBookingFlow ? (lastAssistantMessage.shopName ?? selectedShopName.value) : undefined
    const lastPayload = lastBookingPayload.value

    const shopsAlreadyShownCount = messages.value
      .filter(m => m.role === 'assistant' && m.shops?.length)
      .reduce((sum, m) => sum + (m.shops?.length ?? 0), 0)

    const response = await $fetch('/api/ai-search', {
      method: 'POST',
      signal: currentAbortController.signal,
      body: {
        message: message,
        history: messages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
          role: m.role,
          content: m.content
        })),
        selectedShopId: selectedShopId.value || undefined,
        lastShops,
        shopsAlreadyShownCount,
        lastIntent,
        lastBookingShopId,
        ...(inBookingFlow && lastBookingShopName ? { lastBookingShopName } : {}),
        ...(inBookingFlow && lastPayload ? { bookingPayload: lastPayload } : {}),
        ...(pendingBookingPayload.value ? { pendingBookingPayload: pendingBookingPayload.value } : {}),
        ...(profilePrefillSnapshot.value ? { profilePrefill: profilePrefillSnapshot.value } : {})
      }
    })
    
    // Check if this request was cancelled
    if (currentAbortController.signal.aborted) {
      return
    }
    
    if (response.success) {
      const storedPayload = response.bookingPayload ?? response.payload
      const userSaidConfirmSend = /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(String(message).trim()) ||
        /^(send|submit)\s+(booking\s+)?(request)?$/i.test(String(message).trim())
      const hasValidDivers = Array.isArray(storedPayload?.divers) && storedPayload.divers.length >= 1 &&
        storedPayload.divers.some(d => d?.name && String(d.name).trim())
      // When user said "send" (or similar) and we got bookingReady with payload, submit the booking now
      if (response.bookingReady && storedPayload?.shopId && hasValidDivers && userSaidConfirmSend) {
        try {
          const body = {
            shopId: storedPayload.shopId,
            name: storedPayload.name ?? '',
            email: storedPayload.email ?? '',
            startDate: storedPayload.startDate ?? '',
            endDate: storedPayload.endDate ?? '',
            desiredDiveSites: Array.isArray(storedPayload.desiredDiveSites) ? storedPayload.desiredDiveSites : [],
            divers: (storedPayload.divers ?? []).map(d => ({
              name: d.name ?? '',
              certificationNumber: d.certificationNumber ?? '',
              numberOfDives: d.numberOfDives ?? '',
              height: d.height ?? '',
              heightUnit: d.heightUnit ?? 'cm',
              weight: d.weight ?? '',
              weightUnit: d.weightUnit ?? 'kg',
              gear: (d.gear ?? []).map(g => ({ gearType: g?.gearType ?? '' }))
            }))
          }
          const bookRes = await $fetch('/api/booking', { method: 'POST', body })
          if (bookRes?.sent) {
            messages.value.push({
              role: 'assistant',
              content: 'Request sent. Check your email for confirmation.',
              shops: [],
              totalResults: 0,
              hasMoreResults: false,
              intent: response.intent,
              bookingReady: false,
              payload: undefined,
              shopId: response.shopId,
              shopName: response.shopName
            })
            return
          }
        } catch (bookErr) {
          const err = bookErr && typeof bookErr === 'object' ? bookErr : {}
          const data = err.data && typeof err.data === 'object' ? err.data : {}
          const errMsg = data.resendError ?? data.message ?? data.statusMessage ?? err.statusMessage ?? err.message ?? 'Failed to send email to the dive shop.'
          messages.value.push({
            role: 'assistant',
            content: `${errMsg} You can try again using the arrow to open the form and submit, or contact the dive shop directly.`,
            shops: [],
            totalResults: 0,
            hasMoreResults: false,
            intent: response.intent,
            bookingReady: true,
            payload: storedPayload,
            shopId: response.shopId,
            shopName: response.shopName
          })
          return
        }
      }
      const content = (response.message && String(response.message).trim()) ? response.message : 'Got it — what would you like to tell me next?'
      messages.value.push({
        role: 'assistant',
        content,
        shops: response.shops || [],
        totalResults: response.totalResults,
        hasMoreResults: response.hasMoreResults,
        intent: response.intent,
        bookingReady: response.bookingReady,
        payload: storedPayload,
        shopId: response.shopId,
        shopName: response.shopName,
        selectableOptions: response.selectableOptions,
        rentalEquipmentOptions: response.rentalEquipmentOptions || undefined,
        hideNoneForGear: response.hideNoneForGear ?? false,
        diveSiteOptions: response.diveSiteOptions || undefined
      })
      if (response.intent === 'booking' && storedPayload) {
        updateBookingPayloadIfOpen(storedPayload)
      }
      // Carry-over payload when user chose "Pick a new diveshop" — clear current shop and store payload for next booking
      if (response.pendingBookingPayload) {
        pendingBookingPayload.value = response.pendingBookingPayload
        selectedShopId.value = null
      } else {
        pendingBookingPayload.value = null
      }
      // Keep the shop being booked visible on the right; clear selection when backend says no shop (e.g. "Pick a new diveshop")
      if (response.intent === 'booking' && response.shopId) {
        selectedShopId.value = response.shopId
      } else if (response.intent === 'booking' && response.shopId == null) {
        selectedShopId.value = null
      }
    } else {
      // Add error message
      messages.value.push({
        role: 'assistant',
        content: response.message || 'Sorry, I encountered an error while searching. Please try again.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false
      })
    }
  } catch (error) {
    // Ignore abort errors
    if (error.name === 'AbortError' || currentAbortController.signal.aborted) {
      return
    }
    
    console.error('Search error:', error)
    
    // Only add error message if request wasn't cancelled
    if (!currentAbortController.signal.aborted) {
      messages.value.push({
        role: 'assistant',
        content: 'Sorry, I encountered an error while searching. Please try again.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false
      })
    }
  } finally {
    // Only clear loading state if this is still the current request
    if (abortController.value === currentAbortController) {
      isLoading.value = false
      abortController.value = null
      await scrollToBottom()
      persistCache()
      await nextTick()
      chatInputRef.value?.focus()
    }
  }
}

// Handle form submit
const handleSubmit = () => {
  sendMessage()
}

// Step back: remove last assistant + last user message so user can redo that step (for testing)
const canStepBack = computed(() => {
  const m = messages.value
  if (m.length < 2) return false
  const last = m[m.length - 1]
  const prev = m[m.length - 2]
  return last.role === 'assistant' && prev.role === 'user'
})
const stepBack = () => {
  if (!canStepBack.value) return
  messages.value = messages.value.slice(0, -2)
  persistCache()
}

// Clear conversation
const clearConversation = () => {
  // Cancel any in-progress request
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  
  messages.value = []
  userInput.value = ''
  isLoading.value = false
  selectedShopId.value = null
  pendingBookingPayload.value = null
  mobileDetailShopId.value = null
  clearCache()
}

// Handle shop selection (card tap: select for booking; on mobile does not open drawer)
const handleShopSelected = (shop) => {
  selectedShopId.value = shop.id
}

// Handle "View details" button (opens drawer on mobile; on desktop panel already shows when selected)
const handleViewDetails = (shop) => {
  selectedShopId.value = shop.id
  mobileDetailShopId.value = shop.id
}

// Open layout booking-form drawer with current shop and chat-collected payload
const openBookingFormDrawer = () => {
  const shop = bookingShopForDrawer.value
  if (!shop) return
  openDrawer('booking-form', {
    shopId: shop.id,
    shopName: shop.name,
    bookingPayload: lastBookingPayload.value
  })
}

// Open booking form from chevron on a specific message (use message's shop context so it works when global computed lags)
function openBookingFormDrawerFromMessage (msg) {
  const shop = bookingShopForDrawer.value || (msg.shopId && msg.shopName ? { id: msg.shopId, name: msg.shopName } : null)
  if (!shop) return
  // On desktop, show the dive shop detail pane; on mobile, ensure detail is available if they tap "View details"
  selectedShopId.value = shop.id
  mobileDetailShopId.value = shop.id
  const payload = msg.payload !== undefined ? msg.payload : msg.bookingPayload
  openDrawer('booking-form', {
    shopId: shop.id,
    shopName: shop.name,
    bookingPayload: payload ?? lastBookingPayload.value
  })
}

// Close shop detail (desktop: clear selection; mobile: close drawer only, keep selection for book chip)
const closeShopDetail = () => {
  if (isDesktop.value) {
    selectedShopId.value = null
  }
  mobileDetailShopId.value = null
}

// GSAP animations for shop panel
const onShopPanelEnter = (el, done) => {
  gsap.from(el, {
    x: '100%',
    duration: 0.3,
    ease: 'power3.out',
    onComplete: done
  })
}

const onShopPanelLeave = (el, done) => {
  gsap.to(el, {
    x: '100%',
    duration: 0.3,
    ease: 'power3.in',
    onComplete: done
  })
}

// GSAP animations for mobile drawer
const onMobileDrawerEnter = (el, done) => {
  const drawer = el.querySelector('.absolute.right-0')
  const backdrop = el.querySelector('.absolute.inset-0')
  
  gsap.from(backdrop, {
    opacity: 0,
    duration: 0.3,
    ease: 'power2.out'
  })
  
  gsap.from(drawer, {
    x: '100%',
    duration: 0.4,
    ease: 'power3.out',
    onComplete: done
  })
}

const onMobileDrawerLeave = (el, done) => {
  const drawer = el.querySelector('.absolute.right-0')
  const backdrop = el.querySelector('.absolute.inset-0')
  
  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  })
  
  gsap.to(drawer, {
    x: '100%',
    duration: 0.3,
    ease: 'power3.in',
    onComplete: done
  })
}

// GSAP animations for loading screen
const onLoadingEnter = (el, done) => {
  gsap.from(el, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.out',
    onComplete: done
  })
}

const onLoadingLeave = (el, done) => {
  gsap.to(el, {
    opacity: 0,
    duration: 0.4,
    ease: 'power2.in',
    onComplete: done
  })
}

// Set page title
useHead({
  title: 'AI Dive Shop Search - Glaucus'
})
</script>
