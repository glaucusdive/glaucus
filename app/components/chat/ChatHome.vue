<template>
    <div class="flex flex-col h-full w-full relative">
      <!-- Header: min-w-0 + shrink-0 so title truncates instead of clipping Step back -->
      <div
        class="min-h-10 min-w-0 flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0">
        <div
          class="flex min-w-0 flex-1 items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700">
          <button @click="openMobileMenu"
            class="flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer shrink-0">
            <Menu class="w-5 h-5" />
          </button>
          <h1
            class="text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white min-w-0 truncate">
            Dive Shop Search</h1>
        </div>
        <div class="flex shrink-0 items-center gap-1 p-1 lg:p-4">
          <button v-if="canStepBack" @click="stepBack"
            class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer"
            title="Remove last message and your last reply so you can redo that step">
            Step back
          </button>
        </div>
      </div>

      <!-- Main content: full-width chat; shop detail is a bottom sheet overlay -->
      <div class="flex-1 flex flex-row overflow-hidden relative">
        <!-- Chat Section -->
        <div class="relative flex min-w-0 h-full w-full flex-col transition-all duration-300 ease-in-out">

          <!-- Messages Container -->
          <div ref="messagesContainer"
            class="flex-1 overflow-y-auto p-2 md:p-4 flex flex-col gap-2 *:mx-auto *:w-full">

            <div v-if="messages.length === 0" class="flex flex-col items-center justify-center gap-8 h-full w-full">
              <div class="text-center flex flex-col gap-5 items-center max-w-4xl">
                <h2 class="max-w-3xl text-xl sm:text-2xl lg:text-3xl font-bold text-zinc-900 dark:text-white">
                  Tell me what you're looking for in your diving experience, and I'll help you find the best dive shops.
                </h2>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-2 w-full">
                  <button
                    v-for="example in searchPathExamples"
                    :key="example.path"
                    type="button"
                    @click="sendLandingSearchExample(example)"
                    class="text-left p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer bg-white dark:bg-zinc-900"
                  >
                    <span class="block text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-500 mb-2">
                      {{ example.path }}
                    </span>
                    <span class="block text-sm text-zinc-700 dark:text-zinc-300">{{ example.query }}</span>
                  </button>
                </div>

              </div>
            </div>

            <!-- Message history -->
            <div v-for="(msg, index) in messages" :key="index" class="max-w-2xl">
              <!-- User message -->
              <div v-if="msg.role === 'user'" class="flex justify-end">
                <div class="max-w-[80%] bg-blue-600 text-white rounded-lg p-2">
                  <p class="text-sm lg:text-base">{{ msg.content }}</p>
                </div>
              </div>

              <!-- Assistant message -->
              <div v-else-if="msg.role === 'assistant'" class="flex justify-start">
                <div class="md:max-w-[90%] flex-1 min-w-0 flex flex-col gap-2">
                  <!-- Lead-in / narration / ack — always before shop cards when both exist -->
                  <div
                    v-if="msg.preamble"
                    class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 chat-bubble-pop-first"
                  >
                    <p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap">{{ msg.preamble }}</p>
                  </div>
                  <div
                    class="flex flex-col gap-2 min-w-0"
                    :class="{ 'chat-bubble-pop-follow': msg.preamble }"
                  >
                  <!-- AI text response (chevron inside bubble when shown) -->
                  <div
                    v-if="msg.content && !(msg.shops && msg.shops.length > 0)"
                    class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2"
                  >
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
                      <div
                        v-for="(shop, si) in msg.shops"
                        :key="shop.id"
                        class="chat-shop-card-stagger min-w-0"
                        :style="{ animationDelay: `${msg.streamingShopsPending ? 0 : si * 80}ms` }"
                      >
                        <CardSearchResult
                          :shop="shop"
                          :active="selectedShopId === shop.id"
                          :match-badges="msg.searchMatchBadges"
                          :search-filters="msg.filters && typeof msg.filters === 'object' && !Array.isArray(msg.filters) ? msg.filters : undefined"
                          @shop-selected="handleShopSelected"
                          @view-details="handleViewDetails"
                        />
                      </div>
                    </div>

                    <!-- Results summary: show which range we're on (e.g. results 11–15 of 16) -->
                    <div v-if="msg.totalResults && msg.totalResults > msg.shops.length" class="text-sm text-zinc-500">
                      {{ getResultsRangeLabel(index) }}
                    </div>
                  </div>

                  <div
                    v-if="msg.content && msg.shops && msg.shops.length > 0"
                    class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-2 flex items-stretch gap-2"
                  >
                    <p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap flex-1 min-w-0 overflow-hidden text-ellipsis">{{ msg.content }}
                    </p>
                  </div>

                  <!-- Selectable options: filter chips first; primary book CTA on its own row below (flex gap) so it is not confused with filters -->
                  <div
                    v-if="(msg.selectableOptions && msg.selectableOptions.length > 0) || (msg.shops?.length && selectedShopId && selectedShopName)"
                    class="flex flex-col gap-4 p-2 transition-opacity duration-200"
                    :class="index !== activeChipMessageIndex ? 'opacity-50 pointer-events-none' : ''"
                  >
                    <div
                      v-if="(msg.selectableOptions || []).filter(o => o.label !== 'Load next 20').length > 0"
                      class="flex w-full flex-wrap gap-2"
                    >
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
                    <button
                      v-if="msg.shops?.length && selectedShopId && selectedShopName"
                      type="button"
                      @click="sendMessage(selectedShopName ? `Let's book ${selectedShopName}` : 'Let\'s book this')"
                      class="self-start px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                    >
                      Let's book {{ selectedShopName }}
                    </button>
                  </div>

                  <!-- Rental gear: equipment chips when available; selected = filled style, click toggles add/remove; past = faded -->
                  <div
                    v-if="Array.isArray(msg.rentalEquipmentOptions)"
                    class="flex flex-wrap gap-2 p-2 transition-opacity duration-200"
                    :class="index !== activeChipMessageIndex ? 'opacity-50 pointer-events-none' : ''"
                  >
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

                  <!-- Courses: optional Any (hidden when search already inferred picks); course chips; Done = white CTA row below (flex gap) -->
                  <div
                    v-if="msg.courseOptions && msg.courseOptions.length > 0"
                    class="flex flex-col gap-4 p-2 transition-opacity duration-200"
                    :class="index !== activeChipMessageIndex ? 'opacity-50 pointer-events-none' : ''"
                  >
                    <div class="flex w-full flex-wrap gap-2">
                      <button
                        v-if="!shouldHideAnyCourseChip(msg)"
                        type="button"
                        @click="sendMessage('any')"
                        class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                      >
                        Any
                      </button>
                      <button
                        v-for="course in msg.courseOptions"
                        :key="course.id"
                        type="button"
                        @click="sendMessage(course.name)"
                        :class="isCourseChipSelected(msg, course)
                          ? 'w-fit px-3 py-1.5 text-sm rounded-full border border-black dark:border-white bg-white dark:bg-zinc-900 text-black dark:text-white font-medium transition-colors cursor-pointer'
                          : 'w-fit px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer'"
                      >
                        {{ course.name }}
                      </button>
                    </div>
                    <button
                      type="button"
                      @click="sendMessage('done')"
                      class="self-start px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                    >
                      Done
                    </button>
                  </div>

                  <!-- Dive sites: optional Any; site chips; Done = white CTA below -->
                  <div
                    v-if="msg.diveSiteOptions && msg.diveSiteOptions.length > 0"
                    class="flex flex-col gap-4 p-2 transition-opacity duration-200"
                    :class="index !== activeChipMessageIndex ? 'opacity-50 pointer-events-none' : ''"
                  >
                    <div class="flex w-full flex-wrap gap-2">
                      <button
                        v-if="!shouldHideAnyDiveSiteChip(msg)"
                        type="button"
                        @click="sendMessage('any')"
                        class="px-3 py-1.5 text-sm rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer font-medium"
                      >
                        Any
                      </button>
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
                    <button
                      type="button"
                      @click="sendMessage('done')"
                      class="self-start px-3 py-1.5 text-sm rounded-full bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-colors cursor-pointer font-medium"
                    >
                      Done
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading: mapped progress + optional stream preview + dots + brand-friendly line -->
            <div v-if="isLoading" class="flex justify-start max-w-2xl">
              <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3 flex flex-col gap-2 max-w-[min(90%,42rem)] min-w-0">
                <p v-if="searchStreamPreview" class="text-sm text-zinc-800 dark:text-white whitespace-pre-wrap min-w-0">{{ searchStreamPreview }}</p>
                <div class="flex items-center gap-2.5 min-h-[1.25rem]">
                  <div
                    class="chat-loading-bounce-dots flex shrink-0 items-center gap-1"
                    aria-hidden="true"
                  >
                    <span class="chat-loading-bounce-dot bg-zinc-500 dark:bg-zinc-400" />
                    <span class="chat-loading-bounce-dot chat-loading-bounce-dot--2 bg-zinc-500 dark:bg-zinc-400" />
                    <span class="chat-loading-bounce-dot chat-loading-bounce-dot--3 bg-zinc-500 dark:bg-zinc-400" />
                  </div>
                  <span
                    v-if="!searchStreamPreview"
                    class="text-sm text-zinc-600 dark:text-zinc-400"
                  >{{ searchStreamStatus || loadingBrandLine || 'Exploring our directory…' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Input area: max width lives on parent so ChatComposer fills available width -->
          <div class="flex items-stretch justify-center z-1 w-full min-w-0 overflow-hidden">
            <div class="w-full min-w-0 max-w-4xl 2xl:min-w-md">
              <ChatComposer
                ref="chatComposerRef"
                v-model="userInput"
                :loading="isLoading"
                :placeholder="chatComposerPlaceholder"
                @submit="handleSubmit"
              />
            </div>
          </div>

          <!-- Shop detail: teleported full-viewport sheet (above layout chrome); booking form stays layout right drawer -->
          <ClientOnly>
            <Teleport to="body">
              <Transition @enter="onDetailDrawerEnter" @leave="onDetailDrawerLeave" :css="false">
                <div
                  v-if="detailDrawerShopId"
                  class="fixed inset-0 z-[55] flex flex-col justify-end pointer-events-auto"
                  role="dialog"
                  aria-modal="true"
                  :aria-label="detailDrawerAriaLabel"
                >
                  <div
                    data-detail-drawer-backdrop
                    class="absolute inset-0 bg-black/50"
                    @click="closeShopDetail"
                  />
                  <div
                    data-detail-drawer-sheet
                    class="relative z-10 mx-auto flex h-[95dvh] min-h-0 w-[99dvw] max-w-none flex-col overflow-hidden rounded-t-xl border border-b-0 border-zinc-200 bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:border-zinc-600 dark:bg-zinc-900 dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]"
                    @click.stop
                  >
                    <ShopDetailPanel
                      :key="detailDrawerShopId"
                      :shop-lookup="detailDrawerShopId"
                      :booking-cta-scroll-delay-ms="400"
                      :show-booking-cta="false"
                      :is-in-booking-flow="isInBookingFlowForShop(detailDrawerShopId)"
                      :is-form-open="isBookingFormOpen"
                      :on-start-booking="handleStartBookingFromPanel"
                      :on-show-form="handleShowFormFromPanel"
                      :on-hide-form="handleHideFormFromPanel"
                      @close="closeShopDetail"
                    />
                  </div>
                </div>
              </Transition>
            </Teleport>
          </ClientOnly>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch, onUnmounted } from 'vue'
import { Menu, ChevronRight } from 'lucide-vue-next'
import gsap from 'gsap'
import ChatComposer from '~/components/chat/ChatComposer.vue'
import CardSearchResult from '~/components/CardSearchResult.vue'
import ShopDetailPanel from '~/components/ShopDetailPanel.vue'
import { useSearchCache, ensureChatsRoot, readChatsRoot, getActiveSession, persistActiveChatsRoot } from '~/composables/useSearchCache'
import { useChatSessions, notifyChatSidebarUpdated } from '~/composables/useChatSessions'
import { useDrawer } from '~/composables/useDrawer'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/composables/useSupabase'
import { mergeDefaultDiversFromBookingPayload, defaultDiverJsonFromFirst } from '~/utils/mergeProfileDefaultDivers'
import { getLatestBookingPayloadFromMessages, bookingPayloadHasNamedDiver } from '~/utils/chatBookingPayload'
import { isSearchPaginationUserMessage } from '~/utils/searchPaginationIntent'
import {
  findAnchorAssistantIndexForPagination,
  findLastSearchAssistantContextIndex,
  sumAssistantSearchShopsSinceIndex
} from '~/utils/searchPaginationShownCount'
import { initSignedInChatsFromRemote, chatRemoteHydrateTick } from '~/composables/userChatsRemote'
import {
  GUIDED_PREFIX,
  initialGuidedSearchState,
  mergeGuidedSearchState,
  isBookingHandoffUserMessage
} from '~~/shared/guidedFlow'
import {
  BOOKING_PRESEND_CONFIRM_SEND,
  BOOKING_PRESEND_CREATE_ACCOUNT,
  BOOKING_PRESEND_OPEN_FORM,
  BOOKING_RESUME_SESSION_KEY
} from '~~/shared/bookingPreSendTokens'
import { buildSearchMatchBadges } from '~~/shared/searchMatchBadges'
import {
  chatLoadingLinesForKind,
  mapOrchestratorActivityToStatusLine
} from '~/utils/chatLoadingStatus'
import { shouldRouteMessageToGuidedFlow } from '~/utils/chatGuidedFlowRouting'

// Get route to check for initial query
const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const { isSignedIn, accessToken, user } = useAuth()
const { client } = useSupabase()
/** Profile snapshot for agent prefill (name, email, defaultDiver); set when signed in. */
const profilePrefillSnapshot = ref(null)

async function loadProfilePrefill () {
  if (!isSignedIn.value) {
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
}

watch(isSignedIn, async (signedIn) => {
  if (!signedIn) {
    profilePrefillSnapshot.value = null
    return
  }
  await loadProfilePrefill()
}, { immediate: true })

/** Incremental: merge chat bookingPayload into profiles.default_divers (no times_used bump). */
async function syncProfileFromChatPayload (payload) {
  if (!user.value?.id || !payload) return
  const divers = payload.divers
  if (!Array.isArray(divers) || divers.length === 0) return
  const hasNamed = divers.some(d => d?.name && String(d.name).trim())
  if (!hasNamed) return
  try {
    const { data: profile } = await client.from('profiles').select('default_divers').eq('id', user.value.id).single()
    const default_divers = mergeDefaultDiversFromBookingPayload(profile?.default_divers, divers, { bumpTimesUsed: false })
    const patch = {
      default_divers,
      default_diver: defaultDiverJsonFromFirst(default_divers[0]) ?? undefined
    }
    if (payload.name && String(payload.name).trim()) patch.display_name = String(payload.name).trim()
    if (payload.email && String(payload.email).trim()) patch.email = String(payload.email).trim()
    await client.from('profiles').update(patch).eq('id', user.value.id)
    await loadProfilePrefill()
  } catch (e) {
    console.warn('[profile sync from chat]', e)
  }
}

/** After chat-initiated /api/booking succeeds: same default_divers merge as BookingForm (bump times_used). */
async function syncProfileAfterChatBookingSent (body) {
  if (!user.value?.id || !Array.isArray(body.divers) || body.divers.length === 0) return
  try {
    const { data: profile } = await client.from('profiles').select('default_divers').eq('id', user.value.id).single()
    const default_divers = mergeDefaultDiversFromBookingPayload(profile?.default_divers, body.divers, { bumpTimesUsed: true })
    await client.from('profiles').update({
      display_name: body.name ?? undefined,
      email: body.email ?? undefined,
      default_divers,
      default_diver: defaultDiverJsonFromFirst(default_divers[0]) ?? undefined
    }).eq('id', user.value.id)
    await loadProfilePrefill()
  } catch (e) {
    console.warn('[profile sync after chat booking]', e)
  }
}

// State
const userInput = ref('')
const chatComposerRef = ref(null)
const isLoading = ref(false)
/** User-safe status from NDJSON progress (mapped); cleared each turn. */
const searchStreamStatus = ref('')
const searchStreamPreview = ref('')
/** Rotating Glaucus-friendly line while waiting (no raw server jargon). */
const loadingBrandLine = ref('')
let loadingBrandTimer = null

function stopChatLoadingBrand () {
  if (loadingBrandTimer != null) {
    clearInterval(loadingBrandTimer)
    loadingBrandTimer = null
  }
  loadingBrandLine.value = ''
}

function startChatLoadingBrand (kind) {
  stopChatLoadingBrand()
  const lines = [...chatLoadingLinesForKind(kind)]
  if (!lines.length) return
  let i = 0
  loadingBrandLine.value = lines[0]
  loadingBrandTimer = setInterval(() => {
    i = (i + 1) % lines.length
    loadingBrandLine.value = lines[i]
  }, 2200)
}

const messages = ref([])
const messagesContainer = ref(null)
const isRestoringCache = ref(true)
/** After cache restore or session switch, sync profile from the latest booking payload in memory (same merge as each new assistant turn). */
let debounceProfileFromChatTimer = null
watch(
  [isRestoringCache, isSignedIn, messages],
  () => {
    if (import.meta.server) return
    clearTimeout(debounceProfileFromChatTimer)
    debounceProfileFromChatTimer = setTimeout(() => {
      debounceProfileFromChatTimer = null
      if (isRestoringCache.value || !isSignedIn.value) return
      const p = getLatestBookingPayloadFromMessages(messages.value)
      if (!p || !bookingPayloadHasNamedDiver(p)) return
      void syncProfileFromChatPayload(p)
    }, 350)
  },
  { deep: true }
)
const abortController = ref(null)
const selectedShopId = ref(null)
/** Carried-over booking form data when user chose "Pick a new diveshop"; sent with next "Book with X" so details transfer. */
const pendingBookingPayload = ref(null)
/** Shop detail bottom sheet opens when user taps the up-arrow on a result card. */
const detailDrawerShopId = ref(null)

/** Deterministic guided search (no LLM routing); see /api/guided-flow */
const useGuidedSearch = computed(() =>
  String(runtimeConfig.public.useGuidedSearch ?? 'true').toLowerCase() !== 'false'
)
/** When true (env), pre-booking uses orchestrator NLU + search LLM instead of /api/guided-flow. */
const useAiSearchFirst = computed(() =>
  String(runtimeConfig.public.aiSearchFirst ?? 'false').toLowerCase() === 'true'
)
/** User chose “step-by-step chips” for this session (overrides AI-first routing). */
const preferGuidedThisSession = ref(false)
const guidedSearchState = ref(initialGuidedSearchState())
/** From last guided search results — merged into booking when user taps Start booking */
const guidedBookingHints = ref(null)

// Selected shop name for "Book for [name]" chip (from results list or booking message)
const selectedShopName = computed(() => {
  if (!selectedShopId.value) return null
  const msgWithShops = [...messages.value].reverse().find(m => m.shops?.length)
  const shop = msgWithShops?.shops?.find(s => s.id === selectedShopId.value)
  if (shop?.business_name) return shop.business_name
  const bookingMsg = [...messages.value].reverse().find(m => m.shopId === selectedShopId.value && m.shopName)
  return bookingMsg?.shopName ?? null
})

const detailDrawerAriaLabel = computed(() => {
  if (!detailDrawerShopId.value) return 'Shop details'
  if (selectedShopId.value === detailDrawerShopId.value && selectedShopName.value) {
    return `Details for ${selectedShopName.value}`
  }
  return 'Shop details'
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

// Index of the last assistant message that has chips (selectable options, gear, dive sites) — only that message's chips are active; older ones are faded for history
const activeChipMessageIndex = computed(() => {
  const list = messages.value
  for (let i = list.length - 1; i >= 0; i--) {
    const m = list[i]
    if (m.role !== 'assistant') continue
    const hasSelectable = m.selectableOptions && m.selectableOptions.length > 0
    const hasGear = Array.isArray(m.rentalEquipmentOptions) && m.rentalEquipmentOptions.length > 0
    const hasCourses = m.courseOptions && m.courseOptions.length > 0
    const hasDiveSites = m.diveSiteOptions && m.diveSiteOptions.length > 0
    const hasBookChip = m.shops?.length && selectedShopId.value && selectedShopName.value
    if (hasSelectable || hasGear || hasCourses || hasDiveSites || hasBookChip) return i
  }
  return -1
})

// True when we're in the AI booking flow for this shop (so panel shows "Show form" instead of "Start Booking")
function isInBookingFlowForShop (shopId) {
  if (!shopId || bookingShopForDrawer.value?.id !== shopId) return false
  return messages.value.some(m => m.role === 'assistant' && m.intent === 'booking')
}

// Start booking via AI agent (from "Start Booking" in right panel)
async function handleStartBookingFromPanel (shopId, shopName) {
  selectedShopId.value = shopId
  if (useGuidedSearch.value && guidedBookingHints.value && shopId) {
    const hints = guidedBookingHints.value
    const pre = { shopId }
    let hasExtra = false
    if (Array.isArray(hints.desiredCourses) && hints.desiredCourses.length) {
      pre.desiredCourses = [...hints.desiredCourses]
      hasExtra = true
    }
    if (hints.diveSiteTypeLabel) {
      const sites = await diveSiteNamesMatchingTypeForShop(shopId, hints.diveSiteTypeLabel)
      if (sites.length) {
        pre.desiredDiveSites = sites
        hasExtra = true
      }
    }
    if (hasExtra) pendingBookingPayload.value = pre
  }
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
  clearTimeout(debounceProfileFromChatTimer)
  stopChatLoadingBrand()
})

/**
 * Opening from the result chevron often finishes the same pointer gesture on the detail header close control
 * or full-screen backdrop (panel mounts under the cursor). Ignore closes briefly after arming from user open paths.
 */
const SHOP_DETAIL_CLOSE_GUARD_MS = 800
let shopDetailCloseGuardUntil = 0
function armShopDetailCloseGuard () {
  shopDetailCloseGuardUntil = Date.now() + SHOP_DETAIL_CLOSE_GUARD_MS
}

function addDays (date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatFutureDateRange () {
  const start = addDays(new Date(), 45)
  const end = addDays(start, 6)
  const monthDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  const monthDayYear = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      return `${monthDay.format(start)}-${end.getDate()}, ${end.getFullYear()}`
    }
    return `${monthDay.format(start)}-${monthDayYear.format(end)}`
  }

  return `${monthDayYear.format(start)}-${monthDayYear.format(end)}`
}

// Empty-state examples mirror the five supported search paths.
const searchPathExamples = computed(() => [
  {
    path: 'By location',
    query: 'Find dive shops in Bali'
  },
  {
    path: 'By dive shop type',
    query: 'Looking for liveaboards in the Maldives'
  },
  {
    path: 'By certification course',
    query: 'Shops in Mexico that offer advanced certification courses'
  },
  {
    path: 'By dive site type',
    query: `I want to do wreck diving in Bali from ${formatFutureDateRange()}`
  },
  {
    path: 'By business name',
    query: 'Search for a dive shop by business name'
  }
])

/** True when the last assistant turn left us inside a guided mini-flow (past branch pick). */
function isMidGuidedSearchWizard (messageList) {
  const lastAssist = [...messageList].reverse().find(
    (m) => m.role === 'assistant' && m.guidedSearchState && typeof m.guidedSearchState === 'object'
  )
  const step = lastAssist?.guidedSearchState?.step
  return !!(step && step !== 'choose_branch')
}

function sendLandingSearchExample (example) {
  // Always send the natural-language example: same text in the bubble and to the orchestrator (not the category label or guided branch token).
  sendMessage(example.query)
}

const chatComposerPlaceholder = computed(() => {
  if (useAiSearchFirst.value && !preferGuidedThisSession.value) {
    return 'Describe destination, trip style, courses, site types, or a shop name…'
  }
  if (useGuidedSearch.value) {
    return 'Use chips above, or type a place or shop name…'
  }
  return 'Ask me anything about dive shops...'
})

/** Dive sites for this shop whose dive_site_types.name matches the guided label */
async function diveSiteNamesMatchingTypeForShop (shopId, typeLabel) {
  if (!shopId || !typeLabel?.trim()) return []
  try {
    const { data: junction, error: jErr } = await client
      .from('diveshop_dive_sites')
      .select('dive_site_id')
      .eq('diveshop_id', shopId)
    if (jErr || !junction?.length) return []
    const ids = [...new Set(junction.map((r) => r.dive_site_id).filter(Boolean))]
    const { data: sites, error: sErr } = await client
      .from('dive_sites')
      .select('name, dive_site_type:dive_site_types(name)')
      .in('id', ids)
    if (sErr || !sites?.length) return []
    const out = []
    for (const row of sites) {
      const t = row.dive_site_type
      const typeName = (t && typeof t === 'object' ? (Array.isArray(t) ? t[0]?.name : t.name) : null) || ''
      if (String(typeName).trim() === String(typeLabel).trim() && row.name) {
        out.push(String(row.name).trim())
      }
    }
    return [...new Set(out)]
  } catch {
    return []
  }
}

// Cache helpers
const { getCache, setCache, clearCache } = useSearchCache()
const {
  applyNewChatFromPage,
  applySwitchFromPage,
  consumePendingNewChat,
  consumePendingSwitch,
  pendingNewChat,
  pendingSwitchSessionId
} = useChatSessions()

// Drawer (mobile menu + booking form)
const { openMobileMenu, openDrawer, closeDrawer, isOpen, contentType, drawerData, updateBookingPayloadIfOpen } = useDrawer()

const isBookingFormOpen = computed(() => isOpen.value && contentType.value === 'booking-form')

function buildPageCachePayload () {
  const drawerWasOpen = isOpen.value && contentType.value === 'booking-form'
  return {
    messages: messages.value,
    userInput: userInput.value,
    lastQuery: typeof route.query.q === 'string' ? route.query.q : null,
    selectedShopId: selectedShopId.value,
    detailDrawerShopId: detailDrawerShopId.value,
    drawerOpen: drawerWasOpen,
    drawerShopId: drawerWasOpen ? (drawerData.shopId ?? null) : null,
    drawerShopName: drawerWasOpen ? (drawerData.shopName ?? null) : null,
    guidedSearchState: guidedSearchState.value,
    guidedBookingHints: guidedBookingHints.value,
    preferGuidedThisSession: preferGuidedThisSession.value
  }
}

/** Restored sessions (and some server paths) may omit `cardCourseNames`; hydrate for result pills. */
async function backfillSearchShopCardFieldsInMessages () {
  if (import.meta.server) return
  const msgs = messages.value
  const minimal = []
  const seen = new Set()
  for (const m of msgs) {
    if (m.role !== 'assistant' || !Array.isArray(m.shops)) continue
    for (const s of m.shops) {
      const id = s?.id
      if (typeof id !== 'string' || !id || seen.has(id)) continue
      if (Array.isArray(s.cardCourseNames)) continue
      seen.add(id)
      minimal.push({ ...s })
      if (minimal.length >= 40) break
    }
    if (minimal.length >= 40) break
  }
  if (!minimal.length) return
  try {
    const { shops: enriched } = await $fetch('/api/enrich-search-shops-for-cards', {
      method: 'POST',
      body: { shops: minimal }
    })
    const enrById = new Map((enriched || []).map(r => [r.id, r]))
    messages.value = msgs.map((m) => {
      if (m.role !== 'assistant' || !Array.isArray(m.shops)) return m
      let hit = false
      const nextShops = m.shops.map((s) => {
        const e = enrById.get(s?.id)
        if (!e || !Array.isArray(e.cardCourseNames)) return s
        hit = true
        return {
          ...s,
          cardCourseNames: e.cardCourseNames,
          cardDiveSiteTypeNames: e.cardDiveSiteTypeNames
        }
      })
      if (!hit) return m
      let badges = m.searchMatchBadges
      if ((!Array.isArray(badges) || !badges.length) && m.filters && typeof m.filters === 'object' && !Array.isArray(m.filters)) {
        const b = buildSearchMatchBadges(m.filters, null)
        if (b.length) badges = b
      }
      return { ...m, shops: nextShops, ...(Array.isArray(badges) && badges.length ? { searchMatchBadges: badges } : {}) }
    })
  } catch (e) {
    console.warn('[chat] enrich search cards backfill failed', e)
  }
}

async function hydrateFromRecord (cachedState) {
  isRestoringCache.value = true
  closeDrawer()
  messages.value = cachedState.messages || []
  userInput.value = cachedState.userInput || ''
  selectedShopId.value = cachedState.selectedShopId ?? null
  detailDrawerShopId.value = cachedState.detailDrawerShopId ?? cachedState.mobileDetailShopId ?? null
  guidedSearchState.value = cachedState.guidedSearchState
    ? mergeGuidedSearchState(cachedState.guidedSearchState)
    : initialGuidedSearchState()
  guidedBookingHints.value = cachedState.guidedBookingHints ?? null
  preferGuidedThisSession.value = !!cachedState.preferGuidedThisSession
  pendingBookingPayload.value = null
  isLoading.value = false
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }
  isRestoringCache.value = false
  await nextTick()
  void backfillSearchShopCardFieldsInMessages()
  requestAnimationFrame(() => {
    setTimeout(() => {
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
}

watch(chatRemoteHydrateTick, () => {
  if (route.path !== '/') return
  const root = readChatsRoot()
  const active = root ? getActiveSession(root) : null
  if (!active) return
  void hydrateFromRecord(active)
})

function handlePendingNewChatRequest () {
  if (!consumePendingNewChat()) return false
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }
  if (import.meta.client) {
    sessionStorage.removeItem(PENDING_DRAFT_RESUME_KEY)
    sessionStorage.removeItem(FORCE_NEW_CHAT_KEY)
  }
  closeDrawer()
  const stateForArchive = activeSessionToPageState() || buildPageCachePayload()
  const root = applyNewChatFromPage(stateForArchive)
  const s = getActiveSession(root)
  if (s) void hydrateFromRecord(s)
  return true
}

watch(pendingNewChat, () => {
  handlePendingNewChatRequest()
})

watch(pendingSwitchSessionId, (id) => {
  if (!id) return
  const sid = consumePendingSwitch()
  if (!sid) return
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }
  closeDrawer()
  const root = applySwitchFromPage(sid, buildPageCachePayload())
  if (!root) return
  const s = getActiveSession(root)
  if (s) void hydrateFromRecord(s)
})

const persistCache = () => {
  if (isRestoringCache.value) return

  setCache(buildPageCachePayload())
  notifyChatSidebarUpdated()
}

const PENDING_DRAFT_RESUME_KEY = 'glaucus-pending-draft-resume'
const FORCE_NEW_CHAT_KEY = 'glaucus-force-new-chat'

function activeSessionToPageState () {
  const root = readChatsRoot()
  const active = root ? getActiveSession(root) : null
  if (!active) return null
  return {
    messages: active.messages || [],
    userInput: active.userInput || '',
    lastQuery: active.lastQuery || null,
    selectedShopId: active.selectedShopId ?? null,
    detailDrawerShopId: active.detailDrawerShopId ?? active.mobileDetailShopId ?? null,
    drawerOpen: active.drawerOpen ?? false,
    drawerShopId: active.drawerShopId ?? null,
    drawerShopName: active.drawerShopName ?? null,
    guidedSearchState: active.guidedSearchState ?? null,
    guidedBookingHints: active.guidedBookingHints ?? null,
    preferGuidedThisSession: active.preferGuidedThisSession ?? false
  }
}

/** Profile → Resume: go to chat with shop panel + booking messages + form (same as in-flow booking). */
function applyPendingDraftResumeFromProfile () {
  if (import.meta.server) return false
  const raw = sessionStorage.getItem(PENDING_DRAFT_RESUME_KEY)
  if (!raw) return false
  sessionStorage.removeItem(PENDING_DRAFT_RESUME_KEY)
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return false
  }
  const shopId = parsed.shopId && String(parsed.shopId).trim()
  const shopName = (parsed.shopName && String(parsed.shopName).trim()) || 'Dive shop'
  const draftId = parsed.draftId && String(parsed.draftId).trim()
  const payload = parsed.payload && typeof parsed.payload === 'object' ? parsed.payload : null
  if (!shopId || !payload) return false

  isRestoringCache.value = true
  closeDrawer()
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }
  pendingBookingPayload.value = null

  const mergedPayload = { ...payload, shopId: payload.shopId ?? shopId }
  const resumeMessages = [
    { role: 'user', content: `Book with ${shopName}` },
    {
      role: 'assistant',
      content: 'Resume your saved booking. Use the form on the right to continue where you left off.',
      intent: 'booking',
      shopId,
      shopName,
      payload: mergedPayload,
      bookingPayload: mergedPayload
    }
  ]
  messages.value = resumeMessages
  userInput.value = ''
  selectedShopId.value = shopId
  detailDrawerShopId.value = null

  const root = readChatsRoot() ?? ensureChatsRoot()
  persistActiveChatsRoot(root, {
    messages: resumeMessages,
    userInput: '',
    lastQuery: null,
    selectedShopId: shopId,
    detailDrawerShopId: null,
    drawerOpen: true,
    drawerShopId: shopId,
    drawerShopName: shopName
  })

  isRestoringCache.value = false
  notifyChatSidebarUpdated()
  void nextTick(() => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        openDrawer('booking-form', {
          shopId,
          shopName,
          bookingPayload: mergedPayload,
          ...(draftId ? { draftId } : {})
        })
      }, 300)
    })
  })
  return true
}

// Restore cache or run initial query
onMounted(async () => {
  if (import.meta.client && tryRestoreBookingSessionAfterAuth()) {
    isRestoringCache.value = false
    notifyChatSidebarUpdated()
    return
  }
  if (import.meta.client && sessionStorage.getItem(FORCE_NEW_CHAT_KEY) === '1') {
    sessionStorage.removeItem(FORCE_NEW_CHAT_KEY)
    sessionStorage.removeItem(PENDING_DRAFT_RESUME_KEY)
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
      isLoading.value = false
    }
    closeDrawer()
    const stateForArchive = activeSessionToPageState() || buildPageCachePayload()
    const root = applyNewChatFromPage(stateForArchive)
    const s = getActiveSession(root)
    if (s) void hydrateFromRecord(s)
    return
  }

  if (handlePendingNewChatRequest()) {
    return
  }
  if (isSignedIn.value && user.value?.id) {
    await initSignedInChatsFromRemote(client, user.value.id)
  } else {
    ensureChatsRoot()
  }
  if (handlePendingNewChatRequest()) {
    return
  }
  if (applyPendingDraftResumeFromProfile()) {
    return
  }
  const root = readChatsRoot()
  const activeRecord = root ? getActiveSession(root) : null
  const cachedState = activeRecord && Array.isArray(activeRecord.messages) && activeRecord.messages.length > 0
    ? activeRecord
    : null
  const initialQuery = typeof route.query.q === 'string' ? route.query.q : null
  const flatCache = getCache()

  if (cachedState && cachedState.messages.length > 0) {
    messages.value = cachedState.messages
    userInput.value = cachedState.userInput || ''
    if (cachedState.selectedShopId) selectedShopId.value = cachedState.selectedShopId
    const restoredDetail = cachedState.detailDrawerShopId ?? cachedState.mobileDetailShopId
    if (restoredDetail) detailDrawerShopId.value = restoredDetail

    if (!initialQuery || initialQuery === cachedState.lastQuery) {
      isRestoringCache.value = false
      notifyChatSidebarUpdated()
      await nextTick()
      void backfillSearchShopCardFieldsInMessages()
      requestAnimationFrame(() => {
        setTimeout(() => {
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

  if (flatCache && initialQuery && initialQuery !== flatCache.lastQuery) {
    clearCache()
    ensureChatsRoot()
    messages.value = []
    userInput.value = ''
  }

  if (initialQuery) {
    isRestoringCache.value = false
    notifyChatSidebarUpdated()
    await sendMessage(initialQuery)
    return
  }

  isRestoringCache.value = false
  notifyChatSidebarUpdated()
})

// Persist cache when state changes
watch([messages, userInput, preferGuidedThisSession, guidedSearchState, guidedBookingHints], persistCache, { deep: true })
watch([selectedShopId, detailDrawerShopId, isOpen, drawerData], persistCache, { deep: true })

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

/** Stable key for grouping assistant search rows (same search vs new search). */
function searchFiltersFingerprint (filters) {
  if (filters == null || typeof filters !== 'object' || Array.isArray(filters)) return ''
  const keys = Object.keys(filters).filter((k) => {
    const v = filters[k]
    if (v == null) return false
    if (typeof v === 'string') return v.trim().length > 0
    if (Array.isArray(v)) return v.length > 0
    if (typeof v === 'object') return Object.keys(v).length > 0
    return true
  }).sort()
  const norm = {}
  for (const k of keys) {
    const v = filters[k]
    if (Array.isArray(v)) norm[k] = [...v].map(String).sort()
    else norm[k] = v
  }
  return JSON.stringify(norm)
}

// Pagination status: which range this message's results represent (1-based). Scoped to the same filter set.
function getResultsRange (msgIndex) {
  const msg = messages.value[msgIndex]
  const fp = searchFiltersFingerprint(msg?.filters)
  let previous = 0
  for (let i = 0; i < msgIndex; i++) {
    const m = messages.value[i]
    if (m?.role === 'assistant' && m.shops?.length && searchFiltersFingerprint(m.filters) === fp) {
      previous += m.shops.length
    }
  }
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

/** Course chips reflect bookingPayload.desiredCourses (e.g. search-inferred prefill). */
function getSelectedCourseNamesForMessage (msg) {
  const payload = msg.payload ?? msg.bookingPayload
  const list = payload?.desiredCourses
  if (!Array.isArray(list)) return new Set()
  return new Set(list.map(c => String(c).trim().toLowerCase()).filter(Boolean))
}
function isCourseChipSelected (msg, course) {
  return getSelectedCourseNamesForMessage(msg).has((course.name ?? '').toString().trim().toLowerCase())
}

/** Hide “Any” when courses were already chosen (e.g. search inference) — redundant with pre-selected chips. */
function shouldHideAnyCourseChip (msg) {
  const payload = msg.payload ?? msg.bookingPayload
  const dc = payload?.desiredCourses
  return Array.isArray(dc) && dc.length > 0
}

/** Hide “Any” when dive sites were pre-filled (e.g. guided type → site names). */
function shouldHideAnyDiveSiteChip (msg) {
  const payload = msg.payload ?? msg.bookingPayload
  const ds = payload?.desiredDiveSites
  return Array.isArray(ds) && ds.length > 0
}

/** When user taps entity clarification chip, backend needs the original phrase from the prior assistant message. */
function getPendingEntityClarifyPhraseForOutgoing (outgoingMessage) {
  if (!/^entity_clarify:/i.test(String(outgoingMessage).trim())) return undefined
  const arr = messages.value
  for (let i = arr.length - 2; i >= 0; i--) {
    const m = arr[i]
    if (m?.role === 'assistant' && m.entityClarifyPending?.phrase) {
      return m.entityClarifyPending.phrase
    }
  }
  return undefined
}

function openBookingFormDrawerFromPreSend () {
  const shop = bookingShopForDrawer.value
  if (!shop) return
  armShopDetailCloseGuard()
  nextTick(() => {
    selectedShopId.value = shop.id
    detailDrawerShopId.value = null
    openDrawer('booking-form', {
      shopId: shop.id,
      shopName: shop.name,
      bookingPayload: lastBookingPayload.value ?? undefined
    })
  })
}

function persistBookingResumeSnapshot () {
  if (import.meta.server) return
  try {
    const snap = {
      v: 1,
      messages: JSON.parse(JSON.stringify(messages.value)),
      selectedShopId: selectedShopId.value,
      detailDrawerShopId: detailDrawerShopId.value,
      pendingBookingPayload: pendingBookingPayload.value
        ? JSON.parse(JSON.stringify(pendingBookingPayload.value))
        : null
    }
    sessionStorage.setItem(BOOKING_RESUME_SESSION_KEY, JSON.stringify(snap))
  } catch (e) {
    console.warn('[booking resume] persist failed', e)
  }
}

function stripBookingResumeQuery () {
  const q = { ...route.query }
  delete q.bookingResume
  void router.replace({ path: route.path, query: q })
}

/** Restore chat after returning from /auth with ?bookingResume=1 */
function tryRestoreBookingSessionAfterAuth () {
  if (import.meta.server || route.query.bookingResume !== '1') return false
  stripBookingResumeQuery()
  const raw = sessionStorage.getItem(BOOKING_RESUME_SESSION_KEY)
  if (!raw) return false
  try {
    const snap = JSON.parse(raw)
    if (!snap?.v || !Array.isArray(snap.messages)) return false
    sessionStorage.removeItem(BOOKING_RESUME_SESSION_KEY)
    messages.value = snap.messages
    if (snap.selectedShopId) selectedShopId.value = snap.selectedShopId
    const snapDetail = snap.detailDrawerShopId ?? snap.mobileDetailShopId
    if (snapDetail != null) detailDrawerShopId.value = snapDetail
    pendingBookingPayload.value = snap.pendingBookingPayload ?? null
    const p = getLatestBookingPayloadFromMessages(messages.value)
    const lastBookingAssist = [...messages.value].reverse().find(m => m.role === 'assistant' && m.intent === 'booking' && m.shopName)
    const sid = selectedShopId.value || p?.shopId || lastBookingAssist?.shopId
    const shopName = lastBookingAssist?.shopName || 'Dive shop'
    if (sid && p) {
      messages.value.push({
        role: 'assistant',
        content: 'Welcome back — you\'re signed in. Tap Send booking request to email the dive shop.',
        shops: [],
        totalResults: 0,
        hasMoreResults: false,
        intent: 'booking',
        bookingReady: true,
        payload: { ...p, shopId: sid, preSendReviewAck: true, preSendSignupSkipped: true },
        shopId: sid,
        shopName,
        selectableOptions: [{ label: 'Send booking request', value: BOOKING_PRESEND_CONFIRM_SEND }]
      })
    }
    persistCache()
    return true
  } catch (e) {
    console.warn('[booking resume] restore failed', e)
    return false
  }
}

/**
 * POST /api/guided-orchestrator with `progressStream` — NDJSON `progress` lines then one `result` payload.
 */
async function postGuidedOrchestratorNdjson ({ url, headers, body, signal, onProgress }) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(headers && typeof headers === 'object' ? headers : {})
    },
    body: JSON.stringify({ ...body, progressStream: true }),
    signal
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')
  const decoder = new TextDecoder()
  let buffer = ''
  let payload = null
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() || ''
    for (const line of parts) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const obj = JSON.parse(trimmed)
      if (obj.type === 'progress' && typeof obj.label === 'string') {
        onProgress?.(obj.label)
      } else if (obj.type === 'result') {
        payload = obj.payload
      } else if (obj.type === 'error') {
        throw new Error(typeof obj.message === 'string' ? obj.message : 'Orchestrator error')
      }
    }
  }
  const tail = buffer.trim()
  if (tail) {
    const obj = JSON.parse(tail)
    if (obj.type === 'result') payload = obj.payload
    else if (obj.type === 'error') throw new Error(typeof obj.message === 'string' ? obj.message : 'Orchestrator error')
  }
  if (payload == null) throw new Error('No result from orchestrator stream')
  return payload
}

// Send message to AI. Optional displayText: show this in the chat bubble while sending messageText to the API (e.g. chip label vs value).
const sendMessage = async (messageText, displayText) => {
  const message = messageText ?? userInput.value.trim()
  
  if (!message) return

  const rawTrim = String(message).trim()

  // Cancel any in-progress request
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
    searchStreamStatus.value = ''
    searchStreamPreview.value = ''
    stopChatLoadingBrand()
  }

  const textToShow = displayText ?? message

  if (rawTrim === BOOKING_PRESEND_OPEN_FORM) {
    messages.value.push({ role: 'user', content: textToShow })
    userInput.value = ''
    await scrollToBottom()
    openBookingFormDrawerFromPreSend()
    persistCache()
    return
  }

  if (rawTrim === BOOKING_PRESEND_CREATE_ACCOUNT) {
    messages.value.push({ role: 'user', content: textToShow })
    userInput.value = ''
    await scrollToBottom()
    persistBookingResumeSnapshot()
    const redirect = encodeURIComponent('/?bookingResume=1')
    await navigateTo({ path: '/auth/signup', query: { signup: '1', redirect } })
    persistCache()
    return
  }

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
    const liveDrawerPayload = (isOpen.value && contentType.value === 'booking-form' && drawerData.value?.liveBookingPayload)
      ? drawerData.value.liveBookingPayload
      : null
    const lastPayload = liveDrawerPayload || lastBookingPayload.value

    const arr = messages.value
    const lastUserIndex = arr.length - 1

    const lastSearchContextIndex = findLastSearchAssistantContextIndex(arr, lastUserIndex)

    /** Echo for server pagination + filter-relax fast path (needs filters even when totalResults is 0). */
    const lastSearchContext = lastSearchContextIndex >= 0 ? arr[lastSearchContextIndex] : undefined

    let shopsAlreadyShownCount = 0
    if (isSearchPaginationUserMessage(rawTrim)) {
      const anchor = findAnchorAssistantIndexForPagination(arr, lastUserIndex)
      if (anchor >= 0) {
        shopsAlreadyShownCount = sumAssistantSearchShopsSinceIndex(arr, anchor, lastUserIndex)
      }
    }

    const pendingEntityClarifyPhrase = getPendingEntityClarifyPhraseForOutgoing(message)

    const bookingHandoff = isBookingHandoffUserMessage(message)
    startChatLoadingBrand(inBookingFlow || bookingHandoff ? 'booking' : 'search')

    const aiSearchBody = {
      message: message,
      history: messages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
        role: m.role,
        content: m.role === 'assistant' && m.preamble
          ? `${m.preamble}\n\n${m.content}`
          : m.content
      })),
      selectedShopId: selectedShopId.value || undefined,
      lastShops,
      shopsAlreadyShownCount,
      ...(lastSearchContext
        ? {
            lastSearchFilters: lastSearchContext.filters,
            lastSearchTotalResults: lastSearchContext.totalResults
          }
        : {}),
      lastIntent,
      lastBookingShopId,
      ...(inBookingFlow && lastBookingShopName ? { lastBookingShopName } : {}),
      ...(inBookingFlow && lastPayload ? { bookingPayload: lastPayload } : {}),
      ...(pendingBookingPayload.value ? { pendingBookingPayload: pendingBookingPayload.value } : {}),
      ...(profilePrefillSnapshot.value ? { profilePrefill: profilePrefillSnapshot.value } : {}),
      ...(pendingEntityClarifyPhrase ? { pendingEntityClarifyPhrase } : {})
    }

    const aiHeaders = {}
    const bearer =
      accessToken.value || (await client.auth.getSession()).data.session?.access_token || null
    if (bearer) aiHeaders.Authorization = `Bearer ${bearer}`

    const trimmedMsg = message.trim()
    const startsGuidedToken = trimmedMsg.toLowerCase().startsWith(GUIDED_PREFIX)
    const midGuidedWizard = isMidGuidedSearchWizard(messages.value)

    const useGuidedTurn = shouldRouteMessageToGuidedFlow({
      useGuidedSearch: useGuidedSearch.value,
      useAiSearchFirst: useAiSearchFirst.value,
      preferGuidedThisSession: preferGuidedThisSession.value,
      inBookingFlow,
      pendingEntityClarifyPhrase,
      messageTrimmed: trimmedMsg,
      startsWithGuidedPrefix: startsGuidedToken,
      midGuidedWizard,
      guidedStep: guidedSearchState.value?.step ?? null
    })

    if (useGuidedTurn) {
      searchStreamStatus.value = ''
      searchStreamPreview.value = ''

      let guidedRes
      try {
        guidedRes = await $fetch('/api/guided-flow', {
          method: 'POST',
          body: {
            guidedSearchState: guidedSearchState.value,
            message,
            shopsAlreadyShownCount,
            ...(lastSearchContext
              ? {
                  lastSearchFilters: lastSearchContext.filters,
                  lastSearchTotalResults: lastSearchContext.totalResults
                }
              : {})
          },
          signal: currentAbortController.signal,
          ...(Object.keys(aiHeaders).length ? { headers: aiHeaders } : {})
        })
      } catch (fetchErr) {
        if (fetchErr?.name === 'AbortError' || currentAbortController.signal.aborted) {
          return
        }
        console.error('[chat] guided-flow error:', fetchErr)
        if (!currentAbortController.signal.aborted) {
          messages.value.push({
            role: 'assistant',
            content: 'Sorry, something went wrong with search. Please try again.',
            shops: [],
            totalResults: 0,
            hasMoreResults: false
          })
        }
        return
      }

      if (currentAbortController.signal.aborted) {
        return
      }

      if (guidedRes?.success) {
        const mergedState = guidedRes.guidedSearchState
          ? mergeGuidedSearchState(guidedRes.guidedSearchState)
          : initialGuidedSearchState()
        guidedSearchState.value = mergedState
        if (
          guidedRes.bookingHints &&
          (guidedRes.bookingHints.desiredCourses?.length ||
            guidedRes.bookingHints.diveSiteTypeLabel)
        ) {
          guidedBookingHints.value = guidedRes.bookingHints
        } else {
          guidedBookingHints.value = null
        }
        if (guidedRes.openShopId) {
          selectedShopId.value = guidedRes.openShopId
        }
        const hintsSnap =
          guidedRes.bookingHints &&
          (guidedRes.bookingHints.desiredCourses?.length ||
            guidedRes.bookingHints.diveSiteTypeLabel)
            ? { ...guidedRes.bookingHints }
            : null
        const guidedFilters =
          guidedRes.filters && typeof guidedRes.filters === 'object' && !Array.isArray(guidedRes.filters)
            ? guidedRes.filters
            : {}
        const guidedFacets =
          guidedRes.bookingHints?.desiredCourses?.[0]?.trim()
            ? {
                certification_course_hint: guidedRes.bookingHints.desiredCourses[0].trim(),
                dive_site_type_label: guidedRes.bookingHints.diveSiteTypeLabel?.trim() ?? null,
                activity_terms: null
              }
            : guidedRes.bookingHints?.diveSiteTypeLabel?.trim()
              ? {
                  dive_site_type_label: guidedRes.bookingHints.diveSiteTypeLabel.trim(),
                  certification_course_hint: null,
                  activity_terms: null
                }
              : null
        const guidedShopCount = (guidedRes.shops || []).length
        const guidedBadges = guidedShopCount ? buildSearchMatchBadges(guidedFilters, guidedFacets) : []
        const serverGuidedBadges = Array.isArray(guidedRes.searchMatchBadges)
          ? guidedRes.searchMatchBadges.filter((x) => typeof x === 'string' && String(x).trim())
          : []
        const searchMatchBadges = guidedBadges.length ? guidedBadges : serverGuidedBadges
        messages.value.push({
          role: 'assistant',
          content: guidedRes.message || '',
          shops: guidedRes.shops || [],
          totalResults: guidedRes.totalResults ?? 0,
          hasMoreResults: guidedRes.hasMoreResults ?? false,
          intent: 'search',
          selectableOptions: guidedRes.selectableOptions,
          filters: guidedFilters,
          guidedSearchState: mergedState,
          guidedBookingHintsSnapshot: hintsSnap,
          ...(searchMatchBadges.length ? { searchMatchBadges } : {})
        })
      } else {
        messages.value.push({
          role: 'assistant',
          content:
            (guidedRes && guidedRes.message) ||
            'Sorry, guided search returned an error. Please try again.',
          shops: [],
          totalResults: 0,
          hasMoreResults: false
        })
      }
      return
    }

    searchStreamStatus.value = ''
    searchStreamPreview.value = ''

    const maxAiAttempts = 3
    const baseAiRetryMs = 350
    let response = null

    const useProgressStream =
      !inBookingFlow &&
      !isBookingHandoffUserMessage(message)

    for (let attempt = 1; attempt <= maxAiAttempts && !response; attempt++) {
      if (currentAbortController.signal.aborted) {
        return
      }
      try {
        if (useProgressStream) {
          response = await postGuidedOrchestratorNdjson({
            url: '/api/guided-orchestrator',
            headers: aiHeaders,
            body: aiSearchBody,
            signal: currentAbortController.signal,
            onProgress: (label) => {
              const friendly = mapOrchestratorActivityToStatusLine(label)
              if (friendly) searchStreamStatus.value = friendly
            }
          })
        } else {
          response = await $fetch('/api/guided-orchestrator', {
            method: 'POST',
            signal: currentAbortController.signal,
            body: aiSearchBody,
            ...(Object.keys(aiHeaders).length ? { headers: aiHeaders } : {})
          })
        }
      } catch (fetchErr) {
        if (fetchErr?.name === 'AbortError' || currentAbortController.signal.aborted) {
          return
        }
        if (attempt >= maxAiAttempts) {
          throw fetchErr
        }
        console.warn(`[chat] guided-orchestrator request failed (${attempt}/${maxAiAttempts}), retrying:`, fetchErr)
        await new Promise(r => setTimeout(r, baseAiRetryMs * Math.pow(2, attempt - 1)))
        continue
      }
      if (response?.success) {
        break
      }
      if (attempt >= maxAiAttempts) {
        break
      }
      console.warn(`[chat] guided-orchestrator success:false (${attempt}/${maxAiAttempts}), retrying`)
      await new Promise(r => setTimeout(r, baseAiRetryMs * Math.pow(2, attempt - 1)))
    }
    
    // Check if this request was cancelled
    if (currentAbortController.signal.aborted) {
      return
    }
    
    if (response.success) {
      if (response.searchFlowReset) {
        closeDrawer()
        selectedShopId.value = null
        pendingBookingPayload.value = null
        detailDrawerShopId.value = null
        const resetContent = (response.message && String(response.message).trim())
          ? response.message
          : 'How can I help?'
        const resetShops = response.shops || []
        const resetApiBadges = Array.isArray(response.searchMatchBadges)
          ? response.searchMatchBadges.filter((x) => typeof x === 'string' && String(x).trim())
          : []
        const resetFilterObj =
          response.filters && typeof response.filters === 'object' && !Array.isArray(response.filters)
            ? response.filters
            : null
        const resetFallbackBadges =
          resetShops.length > 0 && resetFilterObj && !resetApiBadges.length
            ? buildSearchMatchBadges(resetFilterObj, null)
            : []
        const resetSearchMatchBadges = resetApiBadges.length ? resetApiBadges : resetFallbackBadges
        messages.value = [
          { role: 'user', content: textToShow },
          {
            role: 'assistant',
            content: resetContent,
            ...(response.messagePreamble ? { preamble: response.messagePreamble } : {}),
            shops: resetShops,
            totalResults: response.totalResults,
            hasMoreResults: response.hasMoreResults,
            intent: response.intent,
            bookingReady: response.bookingReady,
            payload: undefined,
            shopId: undefined,
            shopName: undefined,
            selectableOptions: response.selectableOptions,
            rentalEquipmentOptions: response.rentalEquipmentOptions || undefined,
            hideNoneForGear: response.hideNoneForGear ?? false,
            courseOptions: response.courseOptions || undefined,
            diveSiteOptions: response.diveSiteOptions || undefined,
            ...(response.filters && typeof response.filters === 'object' ? { filters: response.filters } : {}),
            ...(response.entityClarifyPending ? { entityClarifyPending: response.entityClarifyPending } : {}),
            ...(resetSearchMatchBadges.length ? { searchMatchBadges: resetSearchMatchBadges } : {})
          }
        ]
        isLoading.value = false
        abortController.value = null
        await scrollToBottom()
        return
      }

      const storedPayload = response.bookingPayload ?? response.payload
      const trimmedMessage = String(message).trim()
      const structuredConfirmSend = trimmedMessage === BOOKING_PRESEND_CONFIRM_SEND
      const userSaidConfirmSend = structuredConfirmSend ||
        /^(yes|yeah|yep|ok|okay|sure|send|submit|confirm|go ahead|do it|please send|ready)$/i.test(trimmedMessage) ||
        /^(i\s*'?m\s+)?ready\s+to\s+send\b/i.test(trimmedMessage) ||
        /\bsend\s+(the\s+)?(booking\s+)?form\b/i.test(trimmedMessage) ||
        /^(send|submit)\s+(booking\s+)?(request)?$/i.test(trimmedMessage) ||
        /^(just\s+)?send(?:\s+it)?$/i.test(trimmedMessage) ||
        /^(send anyway|still send|send it anyway|yes send anyway|confirm send anyway)$/i.test(trimmedMessage)
      const hasValidDivers = Array.isArray(storedPayload?.divers) && storedPayload.divers.length >= 1 &&
        storedPayload.divers.some(d => d?.name && String(d.name).trim())
      // When user said "send" (or similar) and we got bookingReady with payload, submit the booking now
      if (response.bookingReady && storedPayload?.shopId && hasValidDivers && userSaidConfirmSend) {
        try {
          const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token || null
          const body = {
            shopId: storedPayload.shopId,
            name: storedPayload.name ?? '',
            email: storedPayload.email ?? '',
            startDate: storedPayload.startDate ?? '',
            endDate: storedPayload.endDate ?? '',
            desiredCourses: Array.isArray(storedPayload.desiredCourses) ? storedPayload.desiredCourses : [],
            desiredDiveSites: Array.isArray(storedPayload.desiredDiveSites) ? storedPayload.desiredDiveSites : [],
            divers: (storedPayload.divers ?? []).map(d => ({
              name: d.name ?? '',
              certificationNumber: d.certificationNumber ?? '',
              numberOfDives: d.numberOfDives ?? '',
              height: d.height ?? '',
              heightUnit: d.heightUnit ?? 'ft-in',
              weight: d.weight ?? '',
              weightUnit: d.weightUnit ?? 'lbs',
              gear: (d.gear ?? []).map(g => ({ gearType: g?.gearType ?? '' }))
            }))
          }
          const bookRes = await $fetch('/api/booking', {
            method: 'POST',
            body,
            ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
          })
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
            void syncProfileAfterChatBookingSent(body)
            if (runtimeConfig.public.bookingSignupTiming === 'after_send' && !isSignedIn.value) {
              messages.value.push({
                role: 'assistant',
                content: 'Want to save your divers for next time? Create a free account — it only takes a minute.',
                shops: [],
                totalResults: 0,
                hasMoreResults: false,
                intent: response.intent,
                bookingReady: false,
                selectableOptions: [
                  { label: 'Create account', value: BOOKING_PRESEND_CREATE_ACCOUNT }
                ]
              })
            }
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

      const shopsOut = response.shops || []
      const apiBadges = Array.isArray(response.searchMatchBadges)
        ? response.searchMatchBadges.filter((x) => typeof x === 'string' && String(x).trim())
        : []
      const filterObj =
        response.filters && typeof response.filters === 'object' && !Array.isArray(response.filters)
          ? response.filters
          : null
      const fallbackBadges =
        shopsOut.length > 0 && filterObj && !apiBadges.length
          ? buildSearchMatchBadges(filterObj, null)
          : []
      const searchMatchBadges = apiBadges.length ? apiBadges : fallbackBadges

      messages.value.push({
        role: 'assistant',
        content,
        ...(response.messagePreamble ? { preamble: response.messagePreamble } : {}),
        shops: shopsOut,
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
        courseOptions: response.courseOptions || undefined,
        diveSiteOptions: response.diveSiteOptions || undefined,
        ...(response.filters && typeof response.filters === 'object' ? { filters: response.filters } : {}),
        ...(response.entityClarifyPending ? { entityClarifyPending: response.entityClarifyPending } : {}),
        ...(searchMatchBadges.length ? { searchMatchBadges } : {})
      })
      if (
        shopsOut.length &&
        shopsOut.some(s => s && s.id && !Array.isArray(s.cardCourseNames))
      ) {
        void nextTick().then(() => backfillSearchShopCardFieldsInMessages())
      }
      if (response.intent === 'booking' && storedPayload) {
        updateBookingPayloadIfOpen(storedPayload)
        if (isSignedIn.value) {
          void syncProfileFromChatPayload(storedPayload)
        }
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
      searchStreamStatus.value = ''
      searchStreamPreview.value = ''
      stopChatLoadingBrand()
      isLoading.value = false
      abortController.value = null
      await scrollToBottom()
      persistCache()
      await nextTick()
      chatComposerRef.value?.focus()
    }
  }
}

// Handle form submit
const handleSubmit = () => {
  sendMessage()
}

// Step back: remove the last user↔assistant pair (either order) so user can redo that turn
const canStepBack = computed(() => {
  const m = messages.value
  if (m.length < 2) return false
  const last = m[m.length - 1]
  const prev = m[m.length - 2]
  const roles = new Set([last.role, prev.role])
  return roles.has('user') && roles.has('assistant')
})
const stepBack = () => {
  if (!canStepBack.value) return
  messages.value = messages.value.slice(0, -2)
  if (useGuidedSearch.value) {
    const lastAssist = [...messages.value].reverse().find(
      (m) => m.role === 'assistant' && m.guidedSearchState && typeof m.guidedSearchState === 'object'
    )
    guidedSearchState.value = lastAssist?.guidedSearchState
      ? mergeGuidedSearchState(lastAssist.guidedSearchState)
      : initialGuidedSearchState()
    const lastHints = [...messages.value].reverse().find(
      (m) => m.role === 'assistant' && m.guidedBookingHintsSnapshot != null
    )
    guidedBookingHints.value = lastHints?.guidedBookingHintsSnapshot ?? null
  }
  persistCache()
}

// Handle shop selection (card tap: select for booking; does not open detail drawer)
const handleShopSelected = (shop) => {
  armShopDetailCloseGuard()
  // Defer until after this click finishes so the new panel/backdrop never receives the same pointer gesture.
  nextTick(() => {
    if (detailDrawerShopId.value && detailDrawerShopId.value !== shop.id) {
      detailDrawerShopId.value = null
    }
    selectedShopId.value = shop.id
    // Selection does not push a new message — scroll the chat column so chips / bottom of results stay in view.
    void scrollToBottom()
  })
}

// Handle detail affordance on card (opens bottom sheet)
const handleViewDetails = (shop) => {
  armShopDetailCloseGuard()
  nextTick(() => {
    selectedShopId.value = shop.id
    detailDrawerShopId.value = shop.id
    void scrollToBottom()
  })
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
  armShopDetailCloseGuard()
  const payload = msg.payload !== undefined ? msg.payload : msg.bookingPayload
  nextTick(() => {
    selectedShopId.value = shop.id
    detailDrawerShopId.value = null
    openDrawer('booking-form', {
      shopId: shop.id,
      shopName: shop.name,
      bookingPayload: payload ?? lastBookingPayload.value
    })
  })
}

// Close shop detail bottom sheet only (keep selected shop for booking chip)
const closeShopDetail = () => {
  if (Date.now() < shopDetailCloseGuardUntil) return
  detailDrawerShopId.value = null
}

// GSAP: shop detail bottom sheet
function onDetailDrawerEnter (el, done) {
  const backdrop = el.querySelector('[data-detail-drawer-backdrop]')
  const sheet = el.querySelector('[data-detail-drawer-sheet]')
  if (!backdrop || !sheet) {
    done()
    return
  }
  gsap.from(backdrop, {
    opacity: 0,
    duration: 0.25,
    ease: 'power2.out'
  })
  gsap.from(sheet, {
    y: '100%',
    duration: 0.35,
    ease: 'power3.out',
    onComplete: done
  })
}

function onDetailDrawerLeave (el, done) {
  const backdrop = el.querySelector('[data-detail-drawer-backdrop]')
  const sheet = el.querySelector('[data-detail-drawer-sheet]')
  if (!backdrop || !sheet) {
    done()
    return
  }
  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  })
  gsap.to(sheet, {
    y: '100%',
    duration: 0.28,
    ease: 'power3.in',
    onComplete: done
  })
}

useHead({ title: 'Dive Shop Search | Glaucus' })
</script>

<style scoped>
@keyframes chat-bubble-pop-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chat-bubble-pop-first {
  animation: chat-bubble-pop-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.chat-bubble-pop-follow {
  opacity: 0;
  animation: chat-bubble-pop-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) 0.52s both;
}

@media (prefers-reduced-motion: reduce) {
  .chat-bubble-pop-first,
  .chat-bubble-pop-follow {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

@keyframes chat-loading-dot-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  40% {
    transform: translateY(-5px);
    opacity: 1;
  }
}

.chat-loading-bounce-dot {
  display: block;
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  animation: chat-loading-dot-bounce 0.7s ease-in-out infinite;
}

.chat-loading-bounce-dot--2 {
  animation-delay: 0.15s;
}

.chat-loading-bounce-dot--3 {
  animation-delay: 0.3s;
}

@media (prefers-reduced-motion: reduce) {
  .chat-loading-bounce-dot {
    animation: none;
    opacity: 0.75;
    transform: none;
  }
}
</style>
