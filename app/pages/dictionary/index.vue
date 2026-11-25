<template>
  <div class="bg-[#101214] text-white">
    <section class="border-b border-zinc-800 px-4 pt-20 pb-10 sm:px-8 lg:px-20 lg:pt-40 lg:pb-20">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 lg:col-start-3 lg:col-span-8 flex flex-col gap-4 text-center">
          <h1 class="text-3xl font-semibold text-pretty lg:text-5xl">
            Dive dictionary
          </h1>
          <p class="text-lg text-zinc-400 text-pretty">
            Short definitions for scuba physiology, gases, gear, and safety terms.
          </p>
        </div>
      </div>
    </section>

    <section class="border-b border-zinc-800 px-4 pt-10 pb-10 sm:px-8 lg:px-20 lg:pb-20">
      <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12 flex flex-col gap-6">
          <form
            role="search"
            class="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            @submit.prevent="submitSearch"
          >
            <div class="relative min-w-0 w-full max-w-2xl">
              <label for="dictionary-search" class="sr-only">Search dictionary terms</label>
              <Search
                class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                id="dictionary-search"
                v-model="searchInput"
                type="search"
                autocomplete="off"
                placeholder="What do you want to look up?"
                class="h-11 w-full rounded-md border border-zinc-700 bg-zinc-900/80 py-2 pl-10 pr-3 text-base text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
            </div>
            <div class="flex items-center gap-3">
              <p class="text-sm text-zinc-400" aria-live="polite">
                {{ visibleCount }} {{ visibleCount === 1 ? 'term' : 'terms' }}
              </p>
              <Button type="submit" variant="primary">
                Search
              </Button>
              <NuxtLink
                v-if="searchTerm"
                to="/dictionary"
                class="inline-flex h-11 items-center rounded-md px-3 text-sm text-zinc-300 hover:bg-zinc-800"
              >
                Clear
              </NuxtLink>
            </div>
          </form>

          <nav
            v-if="!searchTerm"
            class="flex w-full items-center justify-between gap-1 border-b border-zinc-800 pb-4"
            aria-label="Jump to letter"
          >
            <a
              v-for="letter in DICTIONARY_LETTERS"
              :key="letter"
              :href="letterCounts[letter] ? `#letter-${letter}` : undefined"
              :class="[
                'flex-1 text-center text-xs font-medium uppercase tracking-wide sm:text-sm',
                letterCounts[letter]
                  ? activeLetter === letter
                    ? 'text-white underline decoration-2 underline-offset-8'
                    : 'text-zinc-400 hover:text-white'
                  : 'pointer-events-none text-zinc-700'
              ]"
              :aria-disabled="!letterCounts[letter] ? 'true' : undefined"
              @click="onLetterClick(letter, $event)"
            >
              {{ letter }}
            </a>
          </nav>

          <div
            v-if="!gridItems.length"
            class="py-12 text-center text-zinc-500"
          >
            No terms match that search.
          </div>

          <div
            v-else
            class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <template v-for="item in gridItems" :key="item.key">
              <div
                v-if="item.kind === 'letter'"
                :id="`letter-${item.letter}`"
                class="flex min-h-40 flex-col items-start justify-start gap-1 bg-transparent p-5 scroll-mt-28"
              >
                <span class="text-5xl font-semibold leading-none text-white">
                  {{ item.letter }}
                </span>
                <span class="text-sm text-zinc-500">
                  {{ item.count }} {{ item.count === 1 ? 'term' : 'terms' }}
                </span>
              </div>
              <NuxtLink
                v-else
                :to="`/dictionary/${item.term.slug}`"
                class="flex min-h-40 flex-col items-start justify-start gap-2 rounded-xl bg-zinc-900/80 p-5 transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <h2 class="text-base font-semibold text-white text-pretty">
                  {{ item.term.term }}
                </h2>
                <p class="line-clamp-2 text-sm text-zinc-400 text-pretty">
                  {{ item.term.definition }}
                </p>
              </NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { Search } from 'lucide-vue-next'
import {
  DICTIONARY_LETTERS,
  dictionaryLetterCounts,
  filterTerms,
  groupTermsByLetter,
  listDictionaryTerms,
  normalizeDictionarySearch
} from '~~/shared/diveDictionary'

definePageMeta({ layout: 'blog' })

const route = useRoute()
const siteConfig = useSiteConfig()
const siteUrl = computed(() => siteConfig.url || 'https://glaucusdive.com')

const searchTerm = computed(() => normalizeDictionarySearch(route.query.q))
const searchInput = ref(searchTerm.value)
const activeLetter = ref('')

watch(searchTerm, (value) => {
  searchInput.value = value
})

const allTerms = listDictionaryTerms()
const filteredTerms = computed(() => filterTerms(searchTerm.value, allTerms))
const letterGroups = computed(() => groupTermsByLetter(filteredTerms.value))
const letterCounts = computed(() => dictionaryLetterCounts(filteredTerms.value))
const visibleCount = computed(() => filteredTerms.value.length)

const gridItems = computed(() => {
  if (searchTerm.value) {
    return filteredTerms.value.map(term => ({
      kind: 'term',
      key: term.slug,
      term
    }))
  }
  const items = []
  for (const group of letterGroups.value) {
    items.push({
      kind: 'letter',
      key: `letter-${group.letter}`,
      letter: group.letter,
      count: group.terms.length
    })
    for (const term of group.terms) {
      items.push({
        kind: 'term',
        key: term.slug,
        term
      })
    }
  }
  return items
})

const canonicalUrl = computed(() => `${siteUrl.value}/dictionary`)

useSeoMeta({
  title: 'Dive dictionary',
  description: 'Scuba diving glossary — physiology, gases, gear, and safety terms.',
  ogTitle: 'Dive dictionary',
  ogDescription: 'Short definitions for scuba physiology, gases, gear, and safety terms.',
  ogType: 'website',
  robots: computed(() => (searchTerm.value ? 'noindex, follow' : 'index, follow'))
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Dive dictionary',
        description: 'Scuba diving glossary — physiology, gases, gear, and safety terms.',
        url: canonicalUrl.value,
        numberOfItems: allTerms.length
      })
    }
  ]
}))

function submitSearch () {
  const q = normalizeDictionarySearch(searchInput.value)
  if (!q) {
    void navigateTo('/dictionary')
    return
  }
  void navigateTo({ path: '/dictionary', query: { q } })
}

function onLetterClick (letter, event) {
  if (!letterCounts.value[letter]) {
    event.preventDefault()
    return
  }
  activeLetter.value = letter
}

let letterObserver = null

onMounted(() => {
  if (!import.meta.client || searchTerm.value) return
  letterObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      const first = visible[0]
      if (!first?.target?.id) return
      const match = first.target.id.match(/^letter-([A-Z])$/)
      if (match) activeLetter.value = match[1]
    },
    { rootMargin: '-20% 0px -60% 0px', threshold: 0.1 }
  )
  for (const letter of DICTIONARY_LETTERS) {
    const el = document.getElementById(`letter-${letter}`)
    if (el) letterObserver.observe(el)
  }
})

onUnmounted(() => {
  letterObserver?.disconnect()
  letterObserver = null
})
</script>
