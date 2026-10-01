<template>
  <div class="flex h-full min-h-0 flex-col bg-zinc-50 dark:bg-zinc-900">
    <ShellPageHeader>
      <Breadcrumb :items="breadcrumbItems" />
    </ShellPageHeader>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div v-if="pending" class="flex items-center justify-center py-24">
        <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading profile…</span>
      </div>
      <div v-else-if="error" class="flex flex-col items-center justify-center py-24 px-4 text-center">
        <h1 class="text-2xl font-semibold text-zinc-900 dark:text-white mb-2">Profile not found</h1>
        <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-4">This divemaster profile is not available.</p>
        <NuxtLink to="/" class="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
          Back home
        </NuxtLink>
      </div>
      <div v-else-if="profile" class="mx-auto flex flex-col divide-y divide-zinc-700 *:p-4">
      <!-- Basic info -->
      <header class="flex flex-col sm:flex-row gap-6 items-center">
        <div
          class="size-28 sm:size-32 shrink-0 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700"
        >
          <img
            v-if="profile.avatar_url"
            :src="profile.avatar_url"
            :alt="displayName"
            class="size-full object-cover"
            width="128"
            height="128"
          >
        </div>
        <div class="min-w-0 flex-1 flex flex-col gap-2">
          <div class="flex flex-col gap-0">
            <h1 class="text-3xl font-semibold text-zinc-900 dark:text-white">{{ displayName }}</h1>
            <div class="flex flex-row items-baseline gap-2">
              <p class="text-sm text-zinc-400">@{{ profile.username }}</p>
              <p class="text-sm text-zinc-500">/</p>
              <p v-if="profile.location" class="text-sm text-zinc-400">{{ profile.location }}</p>
            </div>
          </div>
          <p v-if="profile.bio" class="text-sm text-zinc-300 max-w-2xl whitespace-pre-wrap">{{ profile.bio }}</p>
        </div>
      </header>

      <!-- Certifications -->
      <section v-if="profile.certifications.length" class="space-y-4">
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Certifications</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="cert in profile.certifications"
            :key="cert.id || cert.name"
            class="flex flex-col rounded-md border border-zinc-800 bg-transparent overflow-hidden transition-colors hover:border-zinc-700"
          >
            <div v-if="cert.image_url" class="relative aspect-video w-full bg-transparent p-1">
              <img
                :src="cert.image_url"
                :alt="cert.name"
                class="inset-0 aspect-video w-full object-cover rounded-xs"
                loading="lazy"
              >
            </div>
            <div class="flex flex-col gap-1 p-6 grow">
              <h3 class="text-lg text-zinc-900 dark:text-white">{{ cert.name }}</h3>
              <p class="text-sm text-zinc-500 dark:text-zinc-400">
                <span v-if="cert.agency">{{ cert.agency }}</span>
                <span v-if="cert.agency && cert.issued_at"> / </span>
                <span v-if="cert.issued_at">Issued {{ formatMonthYear(cert.issued_at) }}</span>
              </p>
              <p v-if="cert.cert_number" class="text-xs text-zinc-500">#{{ cert.cert_number }}</p>
              <div
                v-if="(cert.students_certified ?? 0) > 0"
                class="mt-auto pt-4"
              >
                <p class="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-white">{{ cert.students_certified }}</p>
                <p class="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">Students certified</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Past jobs -->
      <section v-if="profile.jobs.length" class="space-y-4">
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Experience</h2>
        <ul class="space-y-4">
          <li
            v-for="job in profile.jobs"
            :key="job.id || `${job.title}-${job.organization}`"
            class="rounded-md border border-zinc-800 bg-transparent p-4 transition-colors hover:border-zinc-700"
          >
            <div class="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
              <h3 class="font-medium text-zinc-900 dark:text-white">{{ job.title }}</h3>
              <p class="text-sm text-zinc-500 dark:text-zinc-400 tabular-nums">
                {{ formatJobDates(job.start_date, job.end_date, job.is_current) }}
              </p>
            </div>
            <p class="text-sm text-zinc-700 dark:text-zinc-300 flex flex-row gap-2">
              {{ job.organization }}
              <span v-if="job.location" class="text-zinc-500"> / </span>
              <span v-if="job.location">{{ job.location }}</span>
            </p>
            <p v-if="job.description" class="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
              {{ job.description }}
            </p>
          </li>
        </ul>
      </section>

      <!-- Dive sites grid -->
      <section v-if="profile.dive_sites.length" class="space-y-4">
        <h2 class="text-xl font-semibold text-zinc-900 dark:text-white">Past dive sites</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div
            v-for="site in profile.dive_sites"
            :key="site.dive_site_id"
            class="flex flex-col rounded-md border border-zinc-800 bg-transparent overflow-hidden transition-colors hover:border-zinc-700"
          >
            <div class="relative aspect-video w-full bg-transparent p-1">
              <img
                v-if="site.image_url"
                :src="site.image_url"
                :alt="site.name || 'Dive site'"
                class="inset-0 aspect-video object-cover rounded-xs"
                loading="lazy"
              >
              <div
                v-else
                class="rounded-xs bg-zinc-800 aspect-video"
                aria-hidden="true"
              />
            </div>
            <div class="p-6 space-y-1">
              <h3 class="text-lg text-zinc-900 dark:text-white">{{ site.name }}</h3>
              <p v-if="site.country_name" class="text-sm text-zinc-500 dark:text-zinc-400">{{ site.country_name }}</p>
              <p v-if="site.note" class="text-sm text-zinc-500">{{ site.note }}</p>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicDivemasterProfile } from '~~/shared/divemasterProfile'

definePageMeta({ layout: 'default' })

const route = useRoute()
const username = computed(() => {
  const raw = route.params.username
  return Array.isArray(raw) ? raw[0] : String(raw || '')
})

type DivemasterFetch = PublicDivemasterProfile | { redirectTo: string }

function isRedirect (value: DivemasterFetch | null | undefined): value is { redirectTo: string } {
  return !!value && typeof value === 'object' && 'redirectTo' in value
}

const { data: fetchResult, pending, error } = await useAsyncData(
  () => `divemaster-${username.value}`,
  () => $fetch<DivemasterFetch>(`/api/divemaster/${encodeURIComponent(username.value || '')}`),
  { watch: [username] }
)

if (import.meta.server && isRedirect(fetchResult.value)) {
  await navigateTo(`/divemaster/${fetchResult.value.redirectTo}`, { redirectCode: 301, replace: true })
}

watch(
  fetchResult,
  async (val) => {
    if (!import.meta.client || !isRedirect(val)) return
    await navigateTo(`/divemaster/${val.redirectTo}`, { redirectCode: 301, replace: true })
  },
  { immediate: true }
)

const profile = computed(() => {
  const val = fetchResult.value
  if (!val || isRedirect(val)) return null
  return val
})

const displayName = computed(() => profile.value?.display_name || profile.value?.username || 'Divemaster')

const breadcrumbItems = computed(() => [
  { label: 'Divemaster' },
  { label: displayName.value }
])

const seoTitle = computed(() => `${displayName.value} / Divemaster`)
const seoDescription = computed(() => {
  const p = profile.value
  if (!p) return 'Divemaster profile on Glaucus Dive'
  return p.bio || `${displayName.value} is a divemaster on Glaucus Dive.`
})

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogImage: computed(() => profile.value?.avatar_url || undefined)
})

function formatMonthYear (iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function formatJobDates (
  start: string | null | undefined,
  end: string | null | undefined,
  isCurrent?: boolean
) {
  const s = formatMonthYear(start)
  if (isCurrent) return s ? `${s} – Present` : 'Present'
  const e = formatMonthYear(end)
  if (s && e) return `${s} – ${e}`
  return s || e || ''
}
</script>
