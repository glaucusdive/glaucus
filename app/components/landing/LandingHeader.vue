<template>
  <header
    ref="headerRootRef"
    class="sticky top-0 p-5 lg:px-20 lg:py-5 bg-gradient-to-b from-black to-black/0"
    :class="mobileMenuOpen ? 'z-50 bg-[#101214]' : 'z-40'"
  >

    <div class="grid grid-cols-12 gap-4 items-center">
      <div class="col-span-6 lg:col-span-2">
        <NuxtLink to="/">
          <Logo />
        </NuxtLink>
      </div>
      <div class="hidden lg:col-span-8 lg:flex lg:justify-center">
        <div class="flex items-center justify-center">
          <div
            class="inline-flex items-center gap-1 rounded-full bg-zinc-800 p-1 text-zinc-100"
            :class="searchOpen ? 'w-full' : 'w-fit'"
          >
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
                <template v-for="item in resolvedNavItems" :key="item.id">
                  <NuxtLink
                    v-if="item.to"
                    :to="item.to"
                    :target="item.target"
                    :rel="item.target === '_blank' ? 'noopener noreferrer' : undefined"
                    :class="[
                      navLinkBase,
                      isNavItemActive(item)
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-300 hover:text-white'
                    ]"
                  >
                    {{ item.label }}
                  </NuxtLink>
                  <NuxtLink
                    v-else
                    :to="landingSectionTo(item.id)"
                    :class="[
                      navLinkBase,
                      isNavItemActive(item)
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-300 hover:text-white'
                    ]"
                  >
                    {{ item.label }}
                  </NuxtLink>
                </template>
              </nav>
            </template>
            <form
              v-else
              role="search"
              class="flex min-w-0 w-full items-center gap-2"
              @submit.prevent="onSearchSubmit"
            >
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
                type="submit"
                :class="[
                  navIconBtn,
                  'bg-white text-zinc-950 transition-opacity hover:opacity-90'
                ]"
                aria-label="Submit search"
              >
                <ArrowUp :width="12" :height="12" :stroke-width="1.5" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-span-6 lg:col-span-2">
        <div class="flex gap-2 items-center justify-end">
          <button
            type="button"
            class="rounded-md h-10 px-4 py-2 text-sm font-medium uppercase bg-white text-zinc-900 hover:bg-zinc-200 whitespace-nowrap"
            @click="goToApp"
          >
            Open Chat
          </button>
          <button type="button"
            class="flex lg:hidden size-10 items-center justify-center rounded-md text-zinc-100  hover:bg-zinc-800 focus-visible:outline-none"
            :aria-expanded="mobileMenuOpen" aria-controls="landing-mobile-nav"
            :aria-label="mobileMenuOpen ? 'Close menu' : 'Open menu'" @click="toggleMobileMenu">
            <Menu v-if="!mobileMenuOpen" :width="22" :height="22" :stroke-width="1.5" aria-hidden="true" />
            <Xmark v-else :width="22" :height="22" :stroke-width="1.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>

    <LandingMobileNavDrawer
      :open="mobileMenuOpen"
      :header-offset-px="mobileDrawerTopPx"
      :nav-items="resolvedNavItems"
      :active-nav-link-id="activeNavLinkId"
      drawer-id="landing-mobile-nav"
      @close="closeMobileMenu"
    />
  </header>
</template>

<script setup>
import { ArrowUp, Menu, Search, Xmark } from '@iconoir/vue'

const defaultNavItems = [
  { id: 'whatisglaucus', label: 'What is Glaucus?' },
  { id: 'feature1', label: 'For Divers' },
  { id: 'for-businesses', label: 'For Businesses', to: '/for-businesses', target: '_blank' },
  { id: 'aboutus', label: 'About us' },
  { id: 'logs', label: 'Logs' }
]

const props = defineProps({
  navItems: {
    type: Array,
    default: null
  }
})

const resolvedNavItems = computed(() =>
  Array.isArray(props.navItems) && props.navItems.length > 0
    ? props.navItems
    : defaultNavItems
)

const navFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40'

const navIconBtn = [
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full',
  '',
  navFocus
].join(' ')

const navSearchIconWrap =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-zinc-100'

const navLinkBase = [
  'inline-flex shrink-0 items-center rounded-full px-2.5 py-1.5',
  'text-xs font-medium uppercase leading-none tracking-wide',
  '',
  navFocus
].join(' ')

const navSearchInput =
  'h-6 min-h-0 min-w-md flex-1 border-0 bg-transparent py-0 text-xs leading-6 text-white shadow-none placeholder:text-zinc-500 focus:outline-none focus:ring-0'

const route = useRoute()

const headerRootRef = ref(null)
const mobileDrawerTopPx = ref(0)

const mobileMenuOpen = ref(false)
const searchOpen = ref(false)
const searchQuery = ref('')

const navSectionIds = computed(() =>
  new Set(resolvedNavItems.value.filter((item) => !item.to).map((item) => item.id))
)

const rawHash = computed(() => (route.hash || '').replace(/^#/, ''))

const searchChromeActive = computed(() => {
  if (searchOpen.value) {
    return true
  }
  const h = rawHash.value
  if (!h || h === 'hero') {
    return true
  }
  if (navSectionIds.value.has(h)) {
    return false
  }
  return true
})

const activeNavLinkId = computed(() => {
  if (searchOpen.value) {
    return null
  }
  const routeItem = resolvedNavItems.value.find(
    (item) => item.to && route.path === item.to
  )
  if (routeItem) {
    return routeItem.id
  }
  if (route.path !== '/') {
    return null
  }
  const h = rawHash.value
  if (!h || h === 'hero') {
    return null
  }
  return navSectionIds.value.has(h) ? h : null
})

function landingSectionTo (id) {
  return `/#${id}`
}

function isNavItemActive (item) {
  return activeNavLinkId.value === item.id
}

function measureMobileDrawerTop () {
  if (!import.meta.client || !headerRootRef.value) {
    return
  }
  mobileDrawerTopPx.value = headerRootRef.value.offsetHeight
}

function onWindowResize () {
  if (mobileMenuOpen.value) {
    measureMobileDrawerTop()
  }
}

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('resize', onWindowResize)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('resize', onWindowResize)
  }
})

async function toggleMobileMenu () {
  if (!mobileMenuOpen.value) {
    await nextTick()
    measureMobileDrawerTop()
    mobileMenuOpen.value = true
  } else {
    mobileMenuOpen.value = false
  }
}

function closeMobileMenu () {
  mobileMenuOpen.value = false
}

function openSearch () {
  searchOpen.value = true
}

function closeSearch () {
  searchOpen.value = false
  searchQuery.value = ''
}

function onSearchSubmit () {
  const q = String(searchQuery.value ?? '').trim()
  if (!q) return
  void navigateTo({ path: '/', query: { chat: '1', q } })
}

function goToApp () {
  void navigateTo({ path: '/', query: { chat: '1' } })
}
</script>
