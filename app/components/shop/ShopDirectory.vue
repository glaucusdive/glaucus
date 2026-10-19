<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
    <header class="flex flex-col justify-between gap-5 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Glaucus directory</p>
        <h1 class="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">Browse dive shops</h1>
        <p class="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Explore dive businesses, compare what they offer, and open a profile for details.
        </p>
      </div>
      <NuxtLink
        to="/for-businesses/list-your-shop"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        List your shop
      </NuxtLink>
    </header>

    <section aria-labelledby="directory-heading" class="flex flex-col gap-5">
      <h2 id="directory-heading" class="sr-only">Dive shop directory</h2>

      <form role="search" class="flex w-full max-w-2xl items-center gap-2" @submit.prevent="submitSearch">
        <label for="shop-directory-search" class="sr-only">Search dive shops by name or location</label>
        <div class="relative min-w-0 flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            id="shop-directory-search"
            v-model="searchInput"
            type="search"
            autocomplete="off"
            placeholder="Search by shop or location"
            class="h-11 w-full rounded-md border border-zinc-300 bg-white py-2 pl-10 pr-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400"
          >
        </div>
        <Button type="submit" variant="primary" :disabled="pending">Search</Button>
        <NuxtLink
          v-if="searchTerm"
          to="/for-businesses"
          class="inline-flex h-11 items-center rounded-md px-3 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Clear
        </NuxtLink>
      </form>

      <p v-if="pending" class="text-sm text-zinc-500 dark:text-zinc-400" role="status">
        Loading dive shops…
      </p>
      <p v-else-if="error" class="text-sm text-red-600 dark:text-red-400" role="alert">
        {{ error.message || 'Could not load dive shops. Please try again.' }}
      </p>
      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            {{ directory.total }} {{ directory.total === 1 ? 'shop' : 'shops' }}
            <span v-if="searchTerm"> matching “{{ searchTerm }}”</span>
          </p>
          <p v-if="directory.total > 0">
            Showing {{ resultStart }}–{{ resultEnd }} of {{ directory.total }}
          </p>
        </div>

        <div v-if="directory.shops.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="shop in directory.shops"
            :key="shop.id"
            :to="`/shops/${shop.slug || shop.id}`"
            class="group flex min-h-40 min-w-0 flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"
          >
            <div class="flex items-start justify-between gap-3">
              <h3 class="min-w-0 flex-1 text-base font-semibold text-zinc-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">
                {{ shop.business_name }}
              </h3>
              <span v-if="shop.google_rating" class="inline-flex shrink-0 items-center gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                <Star class="h-4 w-4 fill-current text-amber-500" aria-hidden="true" />
                {{ shop.google_rating }}
              </span>
            </div>

            <p v-if="shopLocation(shop)" class="flex min-w-0 items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <span class="min-w-0">{{ shopLocation(shop) }}</span>
            </p>
            <p v-if="shop.type" class="line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">
              {{ shop.type }}
            </p>

            <span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              View shop profile
              <ArrowUpRight class="h-4 w-4" aria-hidden="true" />
            </span>
          </NuxtLink>
        </div>

        <p v-else class="rounded-md border border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {{ searchTerm ? 'No shops match that search. Try another name or location.' : 'No dive shops are listed yet.' }}
        </p>

        <nav
          v-if="totalPages > 1"
          aria-label="Shop directory pages"
          class="flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
        >
          <NuxtLink
            v-if="currentPage > 1"
            :to="pageLocation(currentPage - 1)"
            rel="prev"
            class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            Previous
          </NuxtLink>
          <span v-else class="min-h-10" />

          <span class="text-sm text-zinc-600 dark:text-zinc-400">Page {{ currentPage }} of {{ totalPages }}</span>

          <NuxtLink
            v-if="currentPage < totalPages"
            :to="pageLocation(currentPage + 1)"
            rel="next"
            class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Next
            <ChevronRight class="h-4 w-4" aria-hidden="true" />
          </NuxtLink>
          <span v-else class="min-h-10" />
        </nav>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Plus, Search, Star } from 'lucide-vue-next'
import { normalizeShopDirectorySearch, parseShopDirectoryPage } from '~~/shared/shopDirectory'

interface DirectoryShop {
  id: string
  slug: string | null
  business_name: string
  type: string | null
  city: string | null
  state: string | null
  google_rating: number | null
  country: { name: string } | null
}

interface ShopDirectoryResponse {
  shops: DirectoryShop[]
  page: number
  pageSize: number
  total: number
}

const route = useRoute()
const siteConfig = useSiteConfig()
const searchTerm = computed(() => normalizeShopDirectorySearch(route.query.q))
const currentPage = computed(() => parseShopDirectoryPage(route.query.page))
const canonicalUrl = computed(() => {
  const origin = String(siteConfig.url || 'https://glaucusdive.com').replace(/\/$/, '')
  if (searchTerm.value || currentPage.value <= 1) return `${origin}/for-businesses`
  return `${origin}/for-businesses?page=${currentPage.value}`
})

useSeoMeta({
  title: 'Browse Dive Shops',
  description: 'Browse dive shops, resorts, and liveaboards in the Glaucus directory.',
  ogTitle: 'Browse Dive Shops',
  ogDescription: 'Browse dive shops, resorts, and liveaboards in the Glaucus directory.',
  ogUrl: canonicalUrl,
  robots: computed(() => searchTerm.value ? 'noindex, follow' : 'index, follow')
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }]
}))

const searchInput = ref(searchTerm.value)

watch(searchTerm, (value) => {
  searchInput.value = value
})

const { data: directoryData, pending, error } = await useAsyncData<ShopDirectoryResponse>(
  () => `shop-directory-${currentPage.value}-${searchTerm.value}`,
  async () => await $fetch<ShopDirectoryResponse>('/api/shops', {
    query: {
      page: currentPage.value,
      ...(searchTerm.value ? { q: searchTerm.value } : {})
    }
  }),
  { default: () => ({ shops: [], page: 1, pageSize: 24, total: 0 }) }
)

const directory = computed(() => directoryData.value ?? { shops: [], page: 1, pageSize: 24, total: 0 })
const totalPages = computed(() => Math.max(1, Math.ceil(directory.value.total / directory.value.pageSize)))
const resultStart = computed(() => (currentPage.value - 1) * directory.value.pageSize + 1)
const resultEnd = computed(() => Math.min(currentPage.value * directory.value.pageSize, directory.value.total))

function shopLocation (shop: DirectoryShop): string {
  return [shop.city, shop.state, shop.country?.name].filter(Boolean).join(', ')
}

function pageLocation (page: number) {
  return {
    path: '/for-businesses',
    query: {
      ...(searchTerm.value ? { q: searchTerm.value } : {}),
      ...(page > 1 ? { page: String(page) } : {})
    }
  }
}

async function submitSearch () {
  const q = normalizeShopDirectorySearch(searchInput.value)
  await navigateTo({
    path: '/for-businesses',
    query: q ? { q } : undefined
  })
}
</script>
