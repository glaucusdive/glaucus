<template>
  <main class="bg-zinc-950">
    <header class="sticky top-0 z-10 lg:px-20 lg:py-5">
      <div class="grid gap-4 lg:grid-cols-12 lg:items-center">
        <div class="lg:col-span-3">
          <NuxtLink to="/" class="flex h-auto w-[120px] flex-row items-center justify-center gap-2">
            <img src="/images/glaucus-logo-emblem.svg" alt="Logo" class="h-full w-[40px] -rotate-45" />
            <Logo class="*:fill-black *:dark:fill-white" />
          </NuxtLink>
        </div>
        <div class="lg:col-span-6">
          <div class="hidden lg:flex lg:items-center lg:justify-center">
            <div class="inline-flex items-center gap-1 rounded-full bg-zinc-800 p-1 text-zinc-100 max-w-xl" :class="searchOpen ? 'w-full' : 'w-fit'">
              <template v-if="!searchOpen">
                <button
                  type="button"
                  :class="[
                    navIconBtn,
                    searchChromeActive ? 'bg-white/10 hover:bg-white/15' : 'hover:bg-white/10'
                  ]"
                  :aria-expanded="searchOpen"
                  aria-label="Open search"
                  @click="openSearch"
                >
                  <Search :width="12" :height="12" :stroke-width="1.5" aria-hidden="true" />
                </button>
                <nav class="flex w-fit items-center gap-1" aria-label="Landing sections">
                  <a
                    v-for="item in navItems"
                    :key="item.id"
                    :href="`#${item.id}`"
                    :class="[
                      navLinkBase,
                      activeNavLinkId === item.id
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-300 hover:text-white'
                    ]"
                  >
                    {{ item.label }}
                  </a>
                </nav>
              </template>
              <div v-else role="search" class="flex min-w-0 w-full items-center gap-1">
                <span :class="navSearchIconWrap" aria-hidden="true">
                  <Search :width="12" :height="12" :stroke-width="1.5" />
                </span>
                <input
                  v-model="searchQuery"
                  type="text"
                  inputmode="search"
                  enterkeyhint="search"
                  :class="navSearchInput"
                  placeholder="Find a dive shop in Bali"
                  aria-label="Search"
                />
                <button
                  v-if="!searchQuery.trim()"
                  type="button"
                  :class="[navIconBtn, 'text-zinc-400 hover:bg-white/10 hover:text-zinc-200']"
                  aria-label="Close search"
                  @click="closeSearch"
                >
                  <Xmark :width="12" :height="12" :stroke-width="1.5" aria-hidden="true" />
                </button>
                <button
                  v-else
                  type="button"
                  :class="[
                    navIconBtn,
                    'bg-white text-zinc-950 transition-opacity hover:opacity-90'
                  ]"
                  aria-label="Submit search"
                  @click="onSearchSubmit"
                >
                  <ArrowUp :width="12" :height="12" :stroke-width="1.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="lg:col-span-3">
          <div class="flex lg:items-center lg:justify-end">
            <button
              type="button"
              class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium uppercase text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              @click="goToApp"
            >
              Open Chat
            </button>
          </div>
        </div>
      </div>
    </header>
    <section id="hero"></section>
    <section id="whatisglaucus"></section>
    <section id="features"></section>
    <section id="aboutus"></section>
    <section id="logs"></section>
    <section id="contact"></section>
  </main>
</template>

<script setup>
import { ArrowUp, Search, Xmark } from '@iconoir/vue'

const navFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

const navIconBtn = [
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full',
  'transition-colors',
  navFocus
].join(' ')

const navSearchIconWrap =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-100'

const navLinkBase = [
  'inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5',
  'text-xs font-medium uppercase leading-none tracking-wide',
  'transition-colors',
  navFocus
].join(' ')

const navSearchInput =
  'h-6 min-h-0 min-w-0 flex-1 border-0 bg-transparent py-0 text-xs leading-6 text-white shadow-none placeholder:text-zinc-500 focus:outline-none focus:ring-0'

const navItems = [
  { id: 'whatisglaucus', label: 'What is Glaucus?' },
  { id: 'features', label: 'Features' },
  { id: 'aboutus', label: 'About us' },
  { id: 'logs', label: 'Logs' },
  { id: 'contact', label: 'Contact' }
]

const route = useRoute()

const searchOpen = ref(false)
const searchQuery = ref('')

const navSectionIds = new Set(navItems.map((item) => item.id))

const rawHash = computed(() => (route.hash || '').replace(/^#/, ''))

/** Search icon “active” only on hero (no section) or #hero, or while search panel is open — never when a nav section hash is set. */
const searchChromeActive = computed(() => {
  if (searchOpen.value) {
    return true
  }
  const h = rawHash.value
  if (!h || h === 'hero') {
    return true
  }
  if (navSectionIds.has(h)) {
    return false
  }
  return true
})

const activeNavLinkId = computed(() => {
  if (searchOpen.value) {
    return null
  }
  const h = rawHash.value
  if (!h || h === 'hero') {
    return null
  }
  return navSectionIds.has(h) ? h : null
})

function openSearch () {
  searchOpen.value = true
}

function closeSearch () {
  searchOpen.value = false
  searchQuery.value = ''
}

function onSearchSubmit (e) {
  e?.preventDefault?.()
}

function goToApp () {
  void navigateTo('/auth')
}
</script>
