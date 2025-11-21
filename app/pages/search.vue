<template>
  <NuxtLayout name="default">
    <div class="flex flex-col h-full w-full relative">
      <!-- Header -->
      <div class="flex flex-row justify-between items-stretch border-b border-zinc-200 dark:border-zinc-700 shrink-0">
        <div class="flex items-center gap-2 h-full p-0 lg:p-4 divide-x divide-zinc-200 dark:divide-zinc-700">
          <button @click="openMobileMenu"
            class="flex items-center justify-center aspect-square h-full lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-800/50 p-1 cursor-pointer">
            <Menu class="w-5 h-5" />
          </button>
          <h1
            class="text-base sm:text-lg lg:text-2xl font-semibold text-zinc-900 dark:text-white overflow-auto truncate">
            Dive Shop Search</h1>
        </div>
        <div class="flex items-center gap-2 p-1 lg:p-4">
          <button v-if="messages.length > 0" @click="clearConversation"
            class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer">
            New Search
          </button>
        </div>
      </div>

      <!-- Messages Container -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 pb-28 space-y-6 *:max-w-4xl *:mx-auto *:w-full">

        <div v-if="messages.length === 0" class="flex flex-col items-center justify-start pt-56 gap-8 h-full">
          <div class="text-center space-y-4 flex flex-col items-center">
            <h2 class="max-w-2xl text-2xl font-bold text-zinc-900 dark:text-white">
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
        <div v-for="(msg, index) in messages" :key="index" class="space-y-4">
          <!-- User message -->
          <div v-if="msg.role === 'user'" class="flex justify-end">
            <div class="max-w-[80%] bg-blue-600 text-white rounded-lg px-4 py-3">
              <p class="text-sm lg:text-base">{{ msg.content }}</p>
            </div>
          </div>

          <!-- Assistant message -->
          <div v-else-if="msg.role === 'assistant'" class="flex justify-start">
            <div class="max-w-[90%] space-y-4">
              <!-- AI text response -->
              <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
                <p class="text-sm lg:text-base text-zinc-800 dark:text-white whitespace-pre-wrap">{{ msg.content }}</p>
              </div>

              <!-- Shop results -->
              <div v-if="msg.shops && msg.shops.length > 0" class="space-y-3">
                <div class="flex items-center gap-2 text-sm text-zinc-600">
                  <span class="font-medium">Top Results:</span>
                </div>
                <div class="grid grid-cols-1 gap-3">
                  <CardSearchResult v-for="shop in msg.shops" :key="shop.id" :shop="shop" />
                </div>

                <!-- Results summary - only show when shops are displayed -->
                <div v-if="msg.totalResults && msg.totalResults > msg.shops.length" class="text-sm text-zinc-500">
                  Showing top {{ msg.shops.length }} results from {{ msg.totalResults }} dive shops found
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="flex justify-start">
          <div class="bg-zinc-100 dark:bg-zinc-800 rounded-lg px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600"></div>
              <span class="text-sm text-zinc-900 dark:text-zinc-200">Searching dive shops...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="p-2 absolute bottom-0 left-1/2 translate-x-[-50%] bg-transparent backdrop-blur-sm w-fit rounded-full">
        <div
          :class="[
            'p-0.5 shrink-0 bg-transparent transition-colors ease-in-out delay-100 rounded-full w-4xl relative overflow-hidden gradient-container z-0',
            isLoading ? 'animate-ring-gradient !bg-[#02C8FF]' : ''
          ]">
          <form class="w-full h-full bg-zinc-100 dark:bg-zinc-700 rounded-full p-1 z-10" @submit.prevent="handleSubmit">
            <div class="flex gap-2 items-center justify-stretch">
              <input v-model="userInput" type="text" :disabled="isLoading"
                placeholder="Describe what you're looking for..."
                class="w-full h-full px-4 outline-none text-zinc-900 dark:text-white font-medium text-base tracking-none disabled:cursor-not-allowed" />
              <button type="submit" :disabled="isLoading || !userInput.trim()"
                class="p-4 px-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-zinc-900 disabled:bg-zinc-100 disabled:dark:bg-zinc-600 disabled:cursor-not-allowed font-medium disabled:*:opacity-20">
                <ArrowUp v-if="!isLoading" class="w-6 h-6" />
                <div v-else class="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { ref, nextTick, onMounted, watch } from 'vue'
import { Menu, ArrowUp } from 'lucide-vue-next'
import CardSearchResult from '~/components/CardSearchResult.vue'
import { useSearchCache } from '~/composables/useSearchCache'
import { useDrawer } from '~/composables/useDrawer'

// Get route to check for initial query
const route = useRoute()

// State
const userInput = ref('')
const isLoading = ref(false)
const messages = ref([])
const messagesContainer = ref(null)
const isRestoringCache = ref(true)
const abortController = ref(null)

// Example queries for initial state
const exampleQueries = [
  "I want to do wreck diving in Bali from Jan 1-7, 2026",
  "Looking for beginner-friendly dive shops in the Maldives",
  "Find highly rated dive shops in Thailand",
  "Shops in Mexico that offer advanced certification courses"
]

// Cache helpers
const { getCache, setCache, clearCache } = useSearchCache()

// Mobile menu
const { openMobileMenu } = useDrawer()

const persistCache = () => {
  if (isRestoringCache.value) return

  setCache({
    messages: messages.value,
    userInput: userInput.value,
    lastQuery: typeof route.query.q === 'string' ? route.query.q : null
  })
}

// Restore cache or run initial query
onMounted(async () => {
  const cachedState = getCache()
  const initialQuery = typeof route.query.q === 'string' ? route.query.q : null

  if (cachedState && Array.isArray(cachedState.messages) && cachedState.messages.length > 0) {
    messages.value = cachedState.messages
    userInput.value = cachedState.userInput || ''

    if (!initialQuery || initialQuery === cachedState.lastQuery) {
      isRestoringCache.value = false
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
    return
  }

  isRestoringCache.value = false
})

// Persist cache when state changes
watch([messages, userInput], persistCache, { deep: true })

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

// Send message to AI
const sendMessage = async (messageText) => {
  const message = messageText || userInput.value.trim()
  
  if (!message) return
  
  // Cancel any in-progress request
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isLoading.value = false
  }
  
  // Add user message to chat
  messages.value.push({
    role: 'user',
    content: message
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
    const response = await $fetch('/api/ai-search', {
      method: 'POST',
      signal: currentAbortController.signal,
      body: {
        message: message,
        history: messages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
          role: m.role,
          content: m.content
        }))
      }
    })
    
    // Check if this request was cancelled
    if (currentAbortController.signal.aborted) {
      return
    }
    
    if (response.success) {
      // Add assistant response to chat
      messages.value.push({
        role: 'assistant',
        content: response.message,
        shops: response.shops || [],
        totalResults: response.totalResults,
        hasMoreResults: response.hasMoreResults
      })
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
    }
  }
}

// Handle form submit
const handleSubmit = () => {
  sendMessage()
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
  clearCache()
}

// Set page title
useHead({
  title: 'AI Dive Shop Search - Glaucus'
})
</script>

