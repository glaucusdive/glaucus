<template>
  <NuxtLayout name="default">
    <!-- Header -->
    <!-- <template #header>
      <div class="flex flex-col justify-center z-50 w-full divide-y divide-gray-300">
        <div class="flex flex-row justify-between items-end gap-2 p-2">
          <h1 class="text-6xl font-medium w-[12ch]">Dive Shops Directory</h1>
        </div>
      </div>
    </template> -->

    <!-- Loading State -->
    <div v-if="pending" class="flex items-center justify-center p-8">
      <div class="flex flex-col items-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <span class="text-gray-600">Loading dive shops...</span>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-8">
      <div class="text-center">
        <h1 class="text-2xl font-bold text-red-600 mb-2">Error</h1>
        <p class="text-gray-600">{{ error.message || 'Failed to load dive shops' }}</p>
      </div>
    </div>

    <!-- Data Table -->
    <div v-else-if="diveshops && diveshops.length > 0" class="h-full w-full flex flex-col">
      <div
        class="sticky left-0 top-0 z-10 border-b border-gray-200 w-full lg:h-[72px] flex flex-row justify-start items-center divide-x divide-gray-200 shrink-0">
        <div class="p-1 flex lg:hidden items-center h-full">
          <div @click="toggleMobileMenu"
            class="hover:bg-gray-100 rounded-sm min-w-8 w-full min-h-8 h-full flex items-center justify-center cursor-pointer px-1">
            <Menu class="w-4 h-4 lg:w-6 lg:h-6" />
          </div>
        </div>
        <div class="p-1 px-2 lg:p-4 flex items-center justify-between h-full grow">
          <h2 class="text-xl font-semibold text-gray-900 whitespace-nowrap">Dive Shops Directory</h2>
          <div class="flex items-center gap-2 text-xs whitespace-nowrap">
            {{ diveshops.length }} shops
          </div>
        </div>
      </div>

      <div class="overflow-scroll h-full w-full">
        <div class="w-fit">
          <!-- Header -->
          <div class="bg-gray-100 grid auto-cols-auto grid-flow-col gap-4 px-6 py-3 sticky top-0 z-10 w-fit lg:w-full">
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-96">Business
              Name
            </div>
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Location</div>
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Contact</div>
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Website</div>
            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Rating</div>
          </div>

          <!-- Data Rows -->
          <div v-for="shop in diveshops" :key="shop.id"
            class="grid auto-cols-auto grid-flow-col gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50 w-fit lg:w-full cursor-pointer"
            @click="navigateToShop(shop)">
            <div class="font-medium text-gray-900 w-96 hover:text-blue-600">{{ shop.business_name }}</div>
            <div class="w-64">
              <div class="text-sm text-gray-900">{{ shop.locale }}, {{ shop.country }}</div>
              <div v-if="shop.street_address" class="text-sm text-gray-500">{{ shop.street_address }}</div>
              <div v-if="shop.region" class="text-xs text-gray-400">{{ shop.region }}</div>
            </div>
            <div class="space-y-1 w-64">
              <div v-if="shop.phone" class="flex items-center gap-1">
                <UIcon name="i-heroicons-phone" class="h-4 w-4 text-gray-400" />
                <a :href="`tel:${shop.phone}`" class="text-blue-600 hover:text-blue-800 text-sm">
                  {{ shop.phone }}
                </a>
              </div>
              <div v-if="shop.email" class="flex items-center gap-1">
                <UIcon name="i-heroicons-envelope" class="h-4 w-4 text-gray-400" />
                <a :href="`mailto:${shop.email}`" class="text-blue-600 hover:text-blue-800 text-sm">
                  {{ shop.email }}
                </a>
              </div>
            </div>
            <div class="w-48">
              <div v-if="shop.website_url" class="flex items-center gap-1">
                <UIcon name="i-heroicons-globe-alt" class="h-4 w-4 text-gray-400" />
                <a :href="shop.website_url" target="_blank" rel="noopener noreferrer"
                  class="text-blue-600 hover:text-blue-800 text-sm">
                  Visit Website
                </a>
              </div>
              <span v-else class="text-gray-400 text-sm">No website</span>
            </div>
            <div class="w-48">
              <div v-if="shop.google_rating" class="flex items-center gap-1">
                <UIcon name="i-heroicons-star" class="h-4 w-4 text-yellow-500" />
                <span class="text-sm font-medium">{{ shop.google_rating }}</span>
              </div>
              <span v-else class="text-gray-400 text-sm">No rating</span>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Empty State -->
    <div v-else-if="diveshops && diveshops.length === 0"
      class="text-center flex flex-col justify-center items-center p-8">
      <UIcon name="i-heroicons-information-circle" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No dive shops found</h3>
      <p class="text-gray-500">There are no dive shops in the database.</p>
    </div>

    <!-- Initial State (during SSR or before data loads) -->
    <div v-else class="text-center flex flex-col justify-center items-center p-8">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
      <p class="text-gray-500">Please wait while we load the dive shops data.</p>
    </div>
  </NuxtLayout>
</template>

<script setup>
import { Menu } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'

const { client } = useSupabase()
const { restoreScrollPosition, saveScrollPosition } = useScrollPosition()
const { toggleMobileMenu } = useDrawer()

// Restore scroll position when component mounts
onMounted(() => {
  restoreScrollPosition('shops')
})

// Function to navigate to individual dive shop page
const navigateToShop = (shop) => {
  // Use the shop ID for reliable routing
  console.log('Navigating to shop:', shop.business_name, 'ID:', shop.id)
  
  // Save scroll position immediately before navigation
  saveScrollPosition('shops')
  
  navigateTo(`/shops/${shop.id}`)
}

// Fetch diveshops data
const { data: diveshops, pending, error } = await useAsyncData('diveshops', async () => {
  try {
    console.log('Fetching dive shops data...')
    const { data, error: supabaseError } = await client
      .from('diveshops')
      .select('*')
      .order('business_name')

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      throw supabaseError
    }

    console.log('Fetched data:', data)
    return data || []
  } catch (err) {
    console.error('Error fetching dive shops:', err)
    throw err
  }
}, {
  server: false,    // Don't cache on server
  lazy: false,      // Fetch immediately
  default: () => [] // Default empty array
})
</script>
