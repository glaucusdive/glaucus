<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
    <header class="flex flex-col justify-between gap-5 border-b border-zinc-200 pb-6 dark:border-zinc-800 sm:flex-row sm:items-end">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400">Glaucus directory</p>
        <h1 class="mt-2 text-2xl font-semibold text-zinc-900 dark:text-white">DivePros</h1>
      </div>
      <a
        :href="router.resolve(addProfileLocation).href"
        @click="openProfileSetup"
        class="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
      >
        <Plus class="h-4 w-4" aria-hidden="true" />
        Add your profile
      </a>
    </header>

    <section aria-labelledby="divepro-directory-heading" class="flex flex-col gap-5">
      <h2 id="divepro-directory-heading" class="sr-only">Dive professional directory</h2>
      <form role="search" class="flex w-full max-w-2xl items-center gap-2" @submit.prevent="submitSearch">
        <label for="divepro-directory-search" class="sr-only">Search DivePros by name or location</label>
        <div class="relative min-w-0 flex-1">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input
            id="divepro-directory-search"
            v-model="searchInput"
            type="search"
            autocomplete="off"
            placeholder="Search by name or location"
            class="h-11 w-full rounded-md border border-zinc-300 bg-white py-2 pl-10 pr-3 text-base text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-400 lg:text-sm"
          >
        </div>
        <Button type="submit" variant="primary" :disabled="pending">Search</Button>
        <NuxtLink v-if="searchTerm" to="/for-dive-pros" class="inline-flex h-11 items-center rounded-md px-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800">
          Clear
        </NuxtLink>
      </form>

      <p v-if="pending" class="text-sm text-zinc-500 dark:text-zinc-400" role="status">Loading DivePros…</p>
      <div v-else-if="error" class="flex flex-wrap items-center gap-3" role="alert">
        <p class="text-sm text-red-600 dark:text-red-400">Could not load DivePros. Please try again.</p>
        <Button type="button" variant="secondary" @click="refresh()">
          <RotateCw class="size-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
      <template v-else>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <p>{{ directory.total }} {{ directory.total === 1 ? 'DivePro' : 'DivePros' }}<span v-if="searchTerm"> matching “{{ searchTerm }}”</span></p>
          <p v-if="directory.profiles.length">Showing {{ resultStart }}–{{ resultEnd }} of {{ directory.total }}</p>
        </div>

        <div v-if="directory.profiles.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <NuxtLink
            v-for="professional in directory.profiles"
            :key="professional.username"
            :to="`/divemaster/${professional.username}`"
            class="group flex min-h-40 min-w-0 flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/70"
          >
            <div class="flex min-w-0 items-start gap-3">
              <img
                v-if="photoUrl(professional) && !failedPhotos[professional.username]"
                :src="photoUrl(professional)"
                :alt="`${displayName(professional)} profile photo`"
                width="64"
                height="64"
                loading="lazy"
                decoding="async"
                class="size-16 shrink-0 rounded-md object-cover"
                @error="failedPhotos[professional.username] = true"
              >
              <span v-else class="grid size-16 shrink-0 place-items-center rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400" aria-hidden="true">
                <UserRound class="size-7" />
              </span>
              <div class="min-w-0 flex-1 [overflow-wrap:anywhere]">
                <h3 class="text-base font-semibold text-zinc-900 group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{{ displayName(professional) }}</h3>
                <p v-if="professional.headline" class="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{{ professional.headline }}</p>
              </div>
            </div>
            <p v-if="professional.location" class="flex min-w-0 items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <MapPin class="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />
              <span class="min-w-0 [overflow-wrap:anywhere]">{{ professional.location }}</span>
            </p>
            <span class="mt-auto inline-flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300">
              View profile <ArrowUpRight class="size-4" aria-hidden="true" />
            </span>
          </NuxtLink>
        </div>
        <p v-else class="rounded-md border border-zinc-200 p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          {{ currentPage > totalPages ? 'No profiles on this page.' : searchTerm ? 'No DivePros match that search.' : 'No DivePros are listed yet.' }}
        </p>

        <nav v-if="totalPages > 1 || currentPage > 1" aria-label="DivePros directory pages" class="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <NuxtLink v-if="currentPage > 1" :to="pageLocation(Math.min(currentPage - 1, totalPages))" rel="prev" class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <ChevronLeft class="size-4" aria-hidden="true" /> Previous
          </NuxtLink>
          <span v-else class="min-h-10" />
          <span class="text-sm text-zinc-600 dark:text-zinc-400">Page {{ currentPage }} of {{ totalPages }}</span>
          <NuxtLink v-if="currentPage < totalPages" :to="pageLocation(currentPage + 1)" rel="next" class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800">
            Next <ChevronRight class="size-4" aria-hidden="true" />
          </NuxtLink>
          <span v-else class="min-h-10" />
        </nav>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ArrowUpRight, ChevronLeft, ChevronRight, MapPin, Plus, RotateCw, Search, UserRound } from 'lucide-vue-next'
import { DIVEMASTER_DIRECTORY_PAGE_SIZE, normalizeDivemasterDirectorySearch, parseDivemasterDirectoryPage, type DirectoryDivemaster, type DivemasterDirectoryResponse } from '~~/shared/divemasterDirectory'

const route = useRoute()
const router = useRouter()
const { isSignedIn, loading: authLoading, init: initAuth } = useAuth()
const addProfileLocation = computed(() => isSignedIn.value
  ? { path: '/settings/profile' }
  : { path: '/auth', query: { signup: '1', redirect: '/settings/profile' } })
const siteConfig = useSiteConfig()
const searchTerm = computed(() => normalizeDivemasterDirectorySearch(route.query.q))
const currentPage = computed(() => parseDivemasterDirectoryPage(route.query.page))
const searchInput = ref(searchTerm.value)
const failedPhotos = reactive<Record<string, boolean>>({})
const canonicalUrl = computed(() => {
  const origin = String(siteConfig.url || 'https://glaucusdive.com').replace(/\/$/, '')
  return `${origin}/for-dive-pros${!searchTerm.value && currentPage.value > 1 ? `?page=${currentPage.value}` : ''}`
})

useSeoMeta({
  title: 'DivePros',
  description: 'Find dive professionals by name or location in the Glaucus directory.',
  ogTitle: 'DivePros',
  ogDescription: 'Find dive professionals by name or location in the Glaucus directory.',
  ogUrl: canonicalUrl,
  robots: computed(() => searchTerm.value ? 'noindex, follow' : 'index, follow')
})
useHead(() => ({ link: [{ rel: 'canonical', href: canonicalUrl.value }] }))
watch(searchTerm, value => { searchInput.value = value })

const emptyDirectory = (): DivemasterDirectoryResponse => ({ profiles: [], page: currentPage.value, pageSize: DIVEMASTER_DIRECTORY_PAGE_SIZE, total: 0 })
const { data, pending, error, refresh } = await useAsyncData<DivemasterDirectoryResponse>(
  () => `divemaster-directory-${currentPage.value}-${searchTerm.value}`,
  () => $fetch('/api/divemasters', { query: { page: currentPage.value, ...(searchTerm.value ? { q: searchTerm.value } : {}) } }),
  { default: emptyDirectory }
)
const directory = computed(() => data.value ?? emptyDirectory())
const totalPages = computed(() => Math.max(1, Math.ceil(directory.value.total / directory.value.pageSize)))
const resultStart = computed(() => (currentPage.value - 1) * directory.value.pageSize + 1)
const resultEnd = computed(() => resultStart.value + directory.value.profiles.length - 1)

function displayName (professional: DirectoryDivemaster) {
  return professional.display_name || professional.username
}

function photoUrl (professional: DirectoryDivemaster): string | undefined {
  try {
    const url = new URL(professional.avatar_url || '')
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}

function pageLocation (page: number) {
  return { path: '/for-dive-pros', query: { ...(searchTerm.value ? { q: searchTerm.value } : {}), ...(page > 1 ? { page: String(page) } : {}) } }
}

async function openProfileSetup (event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  if (authLoading.value) await initAuth()
  await navigateTo(addProfileLocation.value)
}

async function submitSearch () {
  const q = normalizeDivemasterDirectorySearch(searchInput.value)
  await navigateTo({ path: '/for-dive-pros', query: q ? { q } : undefined })
}
</script>