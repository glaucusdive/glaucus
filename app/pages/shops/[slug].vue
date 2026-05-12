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
      <button @click="navigateTo('/')" class="mt-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700">
        Back to Home
      </button>
    </div>
  </div>
  <div v-else class="h-full w-full">
    <DiveShopDetail
      v-if="shopLookup"
      :shop-lookup="shopLookup"
      :show-close-button="false"
      @close="goBackToShops"
    />
  </div>
</template>

<script setup>
import DiveShopDetail from '~/components/DiveShopDetail.vue'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const shopLookup = Array.isArray(route.params.slug) ? route.params.slug[0] : route.params.slug

const { shopData, pending, error } = useShopDetail(shopLookup)

useHead({
  title: computed(() => shopData.value?.business_name || 'Dive Shop')
})

const { saveScrollPosition } = useScrollPosition()

function goBackToShops () {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }

  navigateTo('/')
}
</script>
