<template>
  <NuxtLayout name="default">
    <div class="flex flex-col h-full w-full">
      <!-- Header -->
      <div
        class="flex flex-row justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
        <div class="flex items-center gap-3">
          <button @click="openMobileMenu" class="lg:hidden hover:bg-zinc-100 dark:hover:bg-zinc-700 bg-zinc-100 dark:bg-zinc-800 rounded-sm p-1">
            <Menu class="w-5 h-5" />
          </button>
          <h1 class="text-xl lg:text-2xl font-semibold text-zinc-900 dark:text-white">Dive Shop Search</h1>
        </div>
        <button v-if="messages.length > 0" @click="clearConversation"
          class="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-md cursor-pointer">
          New Search
        </button>
      </div>

      <!-- Messages Container -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-6">

        <!-- Welcome message when empty -->
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center px-4">
          <div class="max-w-2xl space-y-4">
            <h2 class="text-3xl font-bold text-zinc-900">Find Your Perfect Dive Shop</h2>
            <p class="text-lg text-zinc-600">
              Tell me what you're looking for in your diving experience, and I'll help you find the best dive shops.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
              <button v-for="example in exampleQueries" :key="example" @click="sendMessage(example)"
                class="text-left p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 hover:bg-zinc-50 transition-colors">
                <p class="text-sm text-zinc-700">{{ example }}</p>
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
          <div class="bg-zinc-800 rounded-lg px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-600"></div>
              <span class="text-sm text-zinc-200">Searching dive shops...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input area -->
      <div class="p-2">
        <div class="p-2 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded-full max-w-4xl mx-auto w-full">
          <form @submit.prevent="handleSubmit">
            <div class="flex gap-2 items-center justify-stretch">
              <input v-model="userInput" type="text" :disabled="isLoading"
                placeholder="Describe what you're looking for..."
                class="w-full h-full px-4 outline-none text-zinc-900 dark:text-white font-medium text-base tracking-none disabled:cursor-not-allowed" />
              <button type="submit" :disabled="isLoading || !userInput.trim()"
                class="p-4 px-8 flex items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-xl tracking-none cursor-pointer text-zinc-900 dark:text-white disabled:bg-zinc-100 disabled:dark:bg-zinc-800 disabled:cursor-not-allowed font-medium disabled:*:opacity-20">
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
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Send message to AI
const sendMessage = async (messageText) => {
  const message = messageText || userInput.value.trim()
  
  if (!message || isLoading.value) return
  
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
  
  try {
    // Call API
    const response = await $fetch('/api/ai-search', {
      method: 'POST',
      body: {
        message: message,
        history: messages.value.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({
          role: m.role,
          content: m.content
        }))
      }
    })
    
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
    console.error('Search error:', error)
    messages.value.push({
      role: 'assistant',
      content: 'Sorry, I encountered an error while searching. Please try again.',
      shops: [],
      totalResults: 0,
      hasMoreResults: false
    })
  } finally {
    isLoading.value = false
    await scrollToBottom()
    persistCache()
  }
}

// Handle form submit
const handleSubmit = () => {
  sendMessage()
}

// Clear conversation
const clearConversation = () => {
  messages.value = []
  userInput.value = ''
  clearCache()
}

// Set page title
useHead({
  title: 'AI Dive Shop Search - Glaucus'
})
</script>

