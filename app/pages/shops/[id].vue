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
    <div class="h-full w-full">
      <DiveShopDetail 
        v-if="shopId" 
        :shop-id="shopId" 
        :show-close-button="false"
        @close="goBackToShops" 
      />
    </div>
    <!-- End shop/id Here-->
  </NuxtLayout>
</template>

<script setup>
import DiveShopDetail from '~/components/DiveShopDetail.vue'

const route = useRoute()
const router = useRouter()
const shopId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id

// Shared fetch with DiveShopDetail (single request via useShopDetail)
const { shopData, pending, error } = useShopDetail(shopId)

useHead({
  title: computed(() => shopData.value?.business_name || 'Dive Shop')
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
</script>
