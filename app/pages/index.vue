  <template>
    <div class="min-h-screen bg-gray-50 h-full">
      <div class="mx-auto h-full min-h-screen">
        <div class="bg-white h-full min-h-screen">
          <!-- Always render a consistent container div -->
          <div class="h-full min-h-screen">
            <!-- Loading State -->
            <div v-if="pending" class="flex justify-center items-center h-full min-h-screen">
              <div class="flex flex-col items-center justify-center">
                <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-gray-500 mx-auto mb-4" />
                <span class="text-gray-600">Loading dive shops...</span>
              </div>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="flex justify-center items-center h-full min-h-screen">
              <UAlert title="Error loading data" :description="error.message" color="red" variant="soft"
                class="max-w-md" />
            </div>

            <!-- Data Table -->
            <div v-else-if="diveshops && diveshops.length > 0" class="h-full min-h-screen">
              <div class="px-6 py-4 border-b border-gray-200 w-full">
                <div class="flex items-center justify-between">
                  <h2 class="text-xl font-semibold text-gray-900">Dive Shops Directory</h2>
                  <UBadge color="green" variant="soft">
                    {{ diveshops.length }} shops
                  </UBadge>
                </div>
              </div>

              <div class="overflow-x-auto lg:overflow-x-visible">
                <!-- Header -->
                <div class="grid auto-cols-auto grid-flow-col gap-4 px-6 py-3 bg-gray-50 sticky top-0 z-10 w-fit lg:w-full">
                  <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-96">Business
                    Name
                  </div>
                  <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Location</div>
                  <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Contact</div>
                  <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Website</div>
                  <div class="text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Rating</div>
                </div>
                <!-- Rows -->
                <div v-for="shop in diveshops" :key="shop.id"
                  class="grid auto-cols-auto grid-flow-col gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50 w-fit lg:w-full">
                  <div class="font-medium text-gray-900 w-96">{{ shop.business_name }}</div>
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

            <!-- Empty State -->
            <div v-else-if="diveshops && diveshops.length === 0"
              class="text-center h-full min-h-screen flex flex-col justify-center items-center">
              <UIcon name="i-heroicons-information-circle" class="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">No dive shops found</h3>
              <p class="text-gray-500">There are no dive shops in the database.</p>
            </div>

            <!-- Initial State (during SSR or before data loads) -->
            <div v-else class="text-center h-full min-h-screen flex flex-col justify-center items-center">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 class="text-lg font-medium text-gray-900 mb-2">Loading...</h3>
              <p class="text-gray-500">Please wait while we load the dive shops data.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>

<script setup>
const { client } = useSupabase()



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
