<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Dashboard">
      <template #actions>
        <FormSelect
          id="dashboard-range"
          v-model="selectedRange"
          class="min-w-[10rem]"
          muted
          focus-ring
          @change="loadDashboard"
        >
          <option value="7d">Past 7 days</option>
          <option value="14d">Past 14 days</option>
          <option value="30d">Past 30 days</option>
          <option value="90d">Past 90 days</option>
          <option value="12m">Past 12 months</option>
          <option value="all">All time</option>
        </FormSelect>
      </template>
    </ShellPageHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="!isAppAdmin" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Admin access required</h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">Sign in with an admin account to view the dashboard.</p>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <div v-else class="flex-1 overflow-y-auto p-4 lg:p-6">
      <div class="flex flex-row flex-wrap gap-4">
        <div
          v-for="stat in statCards"
          :key="stat.label"
          class="min-w-[10rem] flex-1 rounded-md border border-zinc-300 p-4 dark:border-zinc-700"
        >
          <p class="text-3xl font-semibold text-zinc-900 dark:text-white tabular-nums">
            {{ stat.value }}
          </p>
          <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {{ stat.label }}
          </p>
          <p v-if="stat.hint" class="mt-2 text-xs text-amber-600 dark:text-amber-400">
            {{ stat.hint }}
          </p>
        </div>
      </div>

      <p
        v-if="data && !data.posthogConfigured"
        class="mt-6 text-sm text-zinc-500 dark:text-zinc-400"
      >
        Configure PostHog API (<code class="text-xs">POSTHOG_PERSONAL_API_KEY</code>, <code class="text-xs">POSTHOG_PROJECT_ID</code>) for new vs returning user counts.
      </p>
      <p
        v-else-if="data && data.posthogConfigured && !data.posthogAvailable"
        class="mt-6 text-sm text-amber-600 dark:text-amber-400"
      >
        PostHog is configured but the query failed. Check server logs and API key permissions.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({
  title: 'Admin · Dashboard',
  robots: 'noindex, nofollow'
})

interface DashboardResponse {
  range: string
  from: string
  to: string
  bookings: number
  signups: number
  newUsers: number | null
  returningUsers: number | null
  posthogConfigured: boolean
  posthogAvailable: boolean
}

const { isAppAdmin, accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const selectedRange = ref('30d')
const data = ref<DashboardResponse | null>(null)

function formatCount (n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

const statCards = computed(() => {
  const d = data.value
  const posthogHint = d && !d.posthogAvailable
    ? (d.posthogConfigured ? 'PostHog query unavailable' : 'Configure PostHog API')
    : undefined

  return [
    {
      label: 'New users',
      value: formatCount(d?.newUsers),
      hint: posthogHint
    },
    {
      label: 'Returning users',
      value: formatCount(d?.returningUsers),
      hint: posthogHint
    },
    {
      label: 'Bookings',
      value: formatCount(d?.bookings),
      hint: undefined
    },
    {
      label: 'Signups',
      value: formatCount(d?.signups),
      hint: undefined
    }
  ]
})

async function loadDashboard () {
  if (!accessToken.value) return
  loading.value = true
  loadError.value = ''
  try {
    data.value = await $fetch<DashboardResponse>('/api/admin/dashboard', {
      query: { range: selectedRange.value },
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
  } catch (e: any) {
    loadError.value = e?.data?.message || e?.message || 'Failed to load dashboard'
    data.value = null
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await init()
  if (isAppAdmin.value) {
    await loadDashboard()
  } else {
    loading.value = false
  }
})
</script>
