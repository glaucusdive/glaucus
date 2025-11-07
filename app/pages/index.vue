  <template>
    <NuxtLayout name="default">
      <div class="p-2 flex justify-center items-center h-full">
        <div class="w-full lg:w-[50%] h-fit rounded-full overflow-hidden flex flex-row gap-0.5 bg-gray-100 p-1">
          <input type="text"
            @keyup.enter="navigateToSearch"
            v-model="searchQuery"
            class="w-full h-fit p-4 lg:p-4 lg:px-8 outline-none bg-gray-100 hover:bg-gray-200 focus:bg-gray-200 text-gray-900 font-semibold text-xl tracking-none rounded-full"
            placeholder="Search for a dive shop" />
          <div 
            @click="navigateToSearch"
            class="p-4 px-8 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 font-semibold text-xl tracking-none cursor-pointer">
            <span class="hidden lg:block">Search</span>
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
import { Search } from 'lucide-vue-next'

const searchQuery = ref('')

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
</script>
