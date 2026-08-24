<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Dashboard">
      <template #actions>
        <FormSelect
          id="dashboard-range"
          v-model="selectedRange"
          class="min-w-40"
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
          class="min-w-40 flex-1 rounded-md border border-zinc-300 p-4 dark:border-zinc-700"
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
        Configure PostHog API (<code class="text-xs">POSTHOG_PERSONAL_API_KEY</code>, <code class="text-xs">POSTHOG_PROJECT_ID</code>) for new vs returning visitor counts.
      </p>
      <p
        v-else-if="data && data.posthogConfigured && !data.posthogAvailable"
        class="mt-6 text-sm text-amber-600 dark:text-amber-400"
      >
        PostHog is configured but the query failed. Check server logs and API key permissions.
      </p>

      <section v-if="data" class="mt-8">
        <h2 class="text-base font-semibold text-zinc-900 dark:text-white">
          Users
          <span class="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({{ data.userRows.length }})
          </span>
        </h2>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[40rem] border border-zinc-300 text-sm dark:border-zinc-700 rounded-md overflow-hidden">
            <thead>
              <tr class="border-b border-zinc-300 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-900/50">
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Email</th>
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Signed up</th>
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Last signed in</th>
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Type</th>
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Bookings</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.userRows.length">
                <td colspan="5" class="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No users signed up in this period.
                </td>
              </tr>
              <tr
                v-for="row in data.userRows"
                :key="row.id"
                class="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800"
              >
                <td class="px-4 py-2 text-zinc-900 dark:text-white">
                  {{ row.email || '—' }}
                </td>
                <td class="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                  {{ formatDashboardDate(row.signedUpAt) }}
                </td>
                <td class="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                  {{ formatDashboardDate(row.lastSignedInAt) }}
                </td>
                <td class="px-4 py-2 text-zinc-700 dark:text-zinc-300 capitalize">
                  {{ row.userType }}
                </td>
                <td class="px-4 py-2 text-zinc-900 dark:text-white tabular-nums">
                  {{ row.bookingsSubmitted.toLocaleString() }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="data" class="mt-8">
        <h2 class="text-base font-semibold text-zinc-900 dark:text-white">
          Bookings
          <span class="ml-1 text-sm font-normal text-zinc-500 dark:text-zinc-400">
            ({{ data.bookingRows.length }})
          </span>
        </h2>

        <div class="mt-4 overflow-x-auto">
          <table class="w-full min-w-[28rem] border border-zinc-300 text-sm dark:border-zinc-700 rounded-md overflow-hidden">
            <thead>
              <tr class="border-b border-zinc-300 bg-zinc-50 text-left dark:border-zinc-700 dark:bg-zinc-900/50">
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Name</th>
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">Date booked</th>
                <th class="px-4 py-2 font-medium text-zinc-600 dark:text-zinc-400">View</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!data.bookingRows.length">
                <td colspan="3" class="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                  No bookings in this period.
                </td>
              </tr>
              <tr
                v-for="row in data.bookingRows"
                :key="row.id"
                class="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800"
              >
                <td class="px-4 py-2 text-zinc-900 dark:text-white">
                  {{ row.name }}
                </td>
                <td class="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                  {{ formatDashboardDate(row.sentAt) }}
                </td>
                <td class="px-4 py-2">
                  <Button variant="secondary" @click="openBookingDrawer(row)">
                    View
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <BottomSheetDrawer
      :open="!!selectedBooking"
      :aria-label="bookingDrawerAriaLabel"
      z-index-class="z-[60]"
      sheet-height-class="max-h-[92dvh]"
      @update:open="(v) => { if (!v) closeBookingDrawer() }"
    >
      <header class="flex items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 class="min-w-0 truncate text-base font-semibold text-zinc-900 dark:text-white">
          {{ selectedBooking?.name || 'Booking' }}
        </h2>
        <button
          type="button"
          class="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
          aria-label="Close"
          @click="closeBookingDrawer"
        >
          <span class="text-lg leading-none">×</span>
        </button>
      </header>
      <div v-if="selectedBooking" class="overflow-y-auto grow px-4 py-4">
        <dl class="space-y-3 text-sm">
          <div>
            <dt class="font-medium text-zinc-500 dark:text-zinc-400">Dive shop</dt>
            <dd class="mt-0.5 text-zinc-900 dark:text-white">
              {{ selectedBooking.shopName || '—' }}
            </dd>
          </div>
          <div>
            <dt class="font-medium text-zinc-500 dark:text-zinc-400">Sent to</dt>
            <dd class="mt-0.5 text-zinc-900 dark:text-white">
              {{ selectedBooking.shopEmail || '—' }}
            </dd>
          </div>
          <div>
            <dt class="font-medium text-zinc-500 dark:text-zinc-400">Date booked</dt>
            <dd class="mt-0.5 text-zinc-900 dark:text-white">
              {{ formatDashboardDate(selectedBooking.sentAt) }}
            </dd>
          </div>
          <div>
            <dt class="font-medium text-zinc-500 dark:text-zinc-400">Resend · shop email</dt>
            <dd class="mt-0.5 text-zinc-900 dark:text-white">
              <a
                v-if="selectedBooking.resendShopEmailId"
                :href="resendEmailUrl(selectedBooking.resendShopEmailId)"
                target="_blank"
                rel="noopener noreferrer"
                class="break-all underline hover:no-underline"
              >
                {{ selectedBooking.resendShopEmailId }}
              </a>
              <span v-else>—</span>
            </dd>
          </div>
          <div>
            <dt class="font-medium text-zinc-500 dark:text-zinc-400">Resend · guest confirmation</dt>
            <dd class="mt-0.5 text-zinc-900 dark:text-white">
              <a
                v-if="selectedBooking.resendUserEmailId"
                :href="resendEmailUrl(selectedBooking.resendUserEmailId)"
                target="_blank"
                rel="noopener noreferrer"
                class="break-all underline hover:no-underline"
              >
                {{ selectedBooking.resendUserEmailId }}
              </a>
              <span v-else>—</span>
            </dd>
          </div>
        </dl>
        <pre class="mt-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{{ selectedBookingDetailText }}</pre>
      </div>
    </BottomSheetDrawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BottomSheetDrawer from '~/components/ui/BottomSheetDrawer.vue'
import { bookingReviewDetailLines } from '~~/shared/bookingReviewDetailLines'
import type { BookingReviewPayload } from '~~/shared/bookingReviewDetailLines'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({
  title: 'Admin · Dashboard',
  robots: 'noindex, nofollow'
})

interface DashboardUserRow {
  id: string
  email: string | null
  signedUpAt: string | null
  lastSignedInAt: string | null
  userType: 'normal' | 'admin'
  bookingsSubmitted: number
}

interface DashboardBookingRow {
  id: string
  name: string
  sentAt: string | null
  shopId: string
  shopName: string | null
  shopEmail: string | null
  resendShopEmailId: string | null
  resendUserEmailId: string | null
  payload: Record<string, unknown>
}

interface DashboardResponse {
  range: string
  from: string
  to: string
  bookings: number
  bookingRows: DashboardBookingRow[]
  users: number
  userRows: DashboardUserRow[]
  newVisitors: number | null
  returningVisitors: number | null
  posthogConfigured: boolean
  posthogAvailable: boolean
}

const { isAppAdmin, accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const selectedRange = ref('30d')
const data = ref<DashboardResponse | null>(null)
const selectedBooking = ref<DashboardBookingRow | null>(null)

const bookingDrawerAriaLabel = computed(() =>
  selectedBooking.value ? `Booking for ${selectedBooking.value.name}` : 'Booking details'
)

const selectedBookingDetailText = computed(() => {
  const row = selectedBooking.value
  if (!row) return ''
  const lines = bookingReviewDetailLines(row.payload as BookingReviewPayload)
  return lines.length ? lines.join('\n') : 'No details collected yet.'
})

function openBookingDrawer (row: DashboardBookingRow) {
  selectedBooking.value = row
}

function closeBookingDrawer () {
  selectedBooking.value = null
}

function resendEmailUrl (emailId: string): string {
  return `https://resend.com/emails/${encodeURIComponent(emailId)}`
}

function formatCount (n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString()
}

function formatDashboardDate (iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return '—'
  }
}

const statCards = computed(() => {
  const d = data.value
  const posthogHint = d && !d.posthogAvailable
    ? (d.posthogConfigured ? 'PostHog query unavailable' : 'Configure PostHog API')
    : undefined

  return [
    {
      label: 'New visitors',
      value: formatCount(d?.newVisitors),
      hint: posthogHint
    },
    {
      label: 'Returning visitors',
      value: formatCount(d?.returningVisitors),
      hint: posthogHint
    },
    {
      label: 'Bookings',
      value: formatCount(d?.bookings),
      hint: undefined
    },
    {
      label: 'Users',
      value: formatCount(d?.users),
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
