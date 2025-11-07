  <template>
    <NuxtLayout name="default">
      <div class="p-6 flex flex-col items-center justify-start pt-48 gap-8 h-full">
        <div class="max-w-5xl w-full text-center space-y-4 flex flex-col items-center">
          <!-- <h2 class="text-3xl font-bold text-gray-900">Find Your Perfect Dive Shop</h2> -->
          <h2 class="max-w-2xl text-2xl font-bold text-gray-900">
            Tell me what you're looking for in your diving experience, and I'll help you find the best dive shops.
          </h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
            <button v-for="example in exampleQueries" :key="example" @click="handleExampleClick(example)"
              class="text-left p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer">
              <p class="text-sm text-gray-700">{{ example }}</p>
            </button>
          </div>
        </div>

        <div class="w-full lg:w-[50%] h-fit rounded-full overflow-hidden flex flex-row gap-0.5 bg-gray-100 p-1">
          <input type="text" @keyup.enter="navigateToSearch" v-model="searchQuery"
            class="w-full h-fit p-4 lg:p-4 lg:px-8 outline-none bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 text-gray-900 font-semibold text-xl tracking-none rounded-full"
            placeholder="What would you like me to do?" />
          <div @click="navigateToSearch"
            class="p-4 px-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 font-semibold text-xl tracking-none cursor-pointer">
            <span class="hidden lg:block">
              <ArrowUp class="w-6 h-6" />
            </span>
            <span class="block lg:hidden">
              <Search class="w-6 h-6" />
            </span>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </template>

<script setup>
import { ref } from 'vue'
import { Search, ArrowUp } from 'lucide-vue-next'

const searchQuery = ref('')
const exampleQueries = [
  "I want to do wreck diving in Bali from Jan 1-7, 2026",
  "Looking for beginner-friendly dive shops in the Maldives",
  "Find highly rated dive shops in Thailand",
  "Shops in Mexico that offer advanced certification courses"
]

const navigateToSearch = () => {
  if (searchQuery.value.trim()) {
    // Navigate to search page with the query
    navigateTo({
      path: '/search',
      query: { q: searchQuery.value.trim() }
    })
  } else {
    // Just navigate to search page without a query
    navigateTo('/search')
  }
}

const handleExampleClick = (query) => {
  if (!query) return
  navigateTo({
    path: '/search',
    query: { q: query }
  })
}
</script>
