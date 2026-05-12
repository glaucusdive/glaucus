<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Top bar -->
    <div class="shrink-0 border-b border-zinc-200 dark:border-zinc-700 p-3 flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <h1 class="text-lg font-semibold text-zinc-900 dark:text-white">Admin · Dive Shops</h1>
        <span class="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {{ shops.length }} shops
        </span>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <!-- Read/Write toggle -->
        <label class="inline-flex items-center gap-2 select-none cursor-pointer">
          <span class="text-xs uppercase tracking-wide" :class="writeMode ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'">
            {{ writeMode ? 'Write' : 'Read' }}
          </span>
          <button
            type="button"
            role="switch"
            :aria-checked="writeMode"
            class="relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer"
            :class="writeMode ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'"
            @click="writeMode = !writeMode"
          >
            <span
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-y-0.5"
              :class="writeMode ? 'translate-x-[18px]' : 'translate-x-0.5'"
            />
          </button>
        </label>

        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium px-3 py-1.5 cursor-pointer disabled:opacity-50"
          :disabled="!writeMode || hasUnsavedNew"
          @click="addNewRow"
        >+ Add row</button>
      </div>
    </div>

    <!-- Loading / error / forbidden -->
    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="!isAppAdmin" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Admin access required</h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">Sign in with an admin account to manage dive shops.</p>
    </div>
    <div v-else-if="loadError" class="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>

    <!-- Table -->
    <div v-else class="flex-1 min-h-0 overflow-auto relative">
      <table class="w-max border-collapse text-sm">
        <thead>
          <tr class="text-zinc-600 dark:text-zinc-300">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-2 py-2 text-left font-medium text-xs uppercase tracking-wide border-b border-zinc-200 dark:border-zinc-700 sticky top-0 whitespace-nowrap bg-zinc-100 dark:bg-zinc-800"
              :class="col.headerSticky"
            >{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.uid"
            class="border-b border-zinc-200 dark:border-zinc-700 group"
            :class="rowBg(row)"
          >
            <!-- Business Name (sticky left) -->
            <td class="px-2 py-1.5 sticky left-0 z-10 align-top max-w-[200px] w-[200px]" :class="rowBg(row)">
              <input
                v-if="writeMode"
                v-model="row.draft.business_name"
                type="text"
                placeholder="Business name"
                class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-white"
              />
              <span v-else class="block font-medium text-zinc-900 dark:text-white overflow-hidden truncate w-full">{{ row.draft.business_name || '—' }}</span>
              <div v-if="row.saveError" class="block mt-1 text-xs text-red-600 dark:text-red-400 overflow-hidden truncate w-full">{{ row.saveError }}</div>
            </td>

            <!-- Text columns -->
            <td v-for="col in textColumns" :key="col.key" class="px-2 py-1.5 align-top" :class="col.tdClass">
              <textarea
                v-if="writeMode && col.multiline"
                v-model="row.draft[col.key]"
                rows="1"
                class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-white resize-y min-h-[28px]"
              />
              <input
                v-else-if="writeMode"
                v-model="row.draft[col.key]"
                :type="col.inputType || 'text'"
                :step="col.inputType === 'number' ? 'any' : undefined"
                class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-sm text-zinc-900 dark:text-white"
              />
              <span v-else class="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap break-words">{{ row.draft[col.key] ?? '' }}</span>
            </td>

            <!-- Country select -->
            <td class="px-2 py-1.5 align-top min-w-[180px]">
              <AdminSelectChip
                :model-value="row.draft.country_id ? [row.draft.country_id] : []"
                :options="countryOptions"
                :disabled="!writeMode"
                :multiple="false"
                :allow-add="false"
                singular-label="country"
                @update:model-value="v => setSingle(row, 'country_id', v)"
              />
            </td>

            <!-- Region select with add -->
            <td class="px-2 py-1.5 align-top min-w-[160px]">
              <AdminSelectChip
                :model-value="row.draft.region_id ? [row.draft.region_id] : []"
                :options="regionOptions"
                :disabled="!writeMode"
                :multiple="false"
                singular-label="region"
                :on-create="createRegion"
                @update:model-value="v => setSingle(row, 'region_id', v)"
                @created="onLookupCreated('regions', $event)"
              />
            </td>

            <!-- Courses multi -->
            <td class="px-2 py-1.5 align-top min-w-[240px]">
              <AdminSelectChip
                v-model="row.draft.course_ids"
                :options="courseOptions"
                :disabled="!writeMode"
                singular-label="course"
                :allow-add="false"
              />
            </td>

            <!-- Rental equipment -->
            <td class="px-2 py-1.5 align-top min-w-[200px]">
              <AdminSelectChip
                v-model="row.draft.rental_equipment_ids"
                :options="rentalOptions"
                :disabled="!writeMode"
                singular-label="rental"
                :on-create="(name) => createSimpleLookup('rental_equipment', name)"
                @created="onLookupCreated('rentalEquipment', $event)"
              />
            </td>

            <!-- Gases -->
            <td class="px-2 py-1.5 align-top min-w-[160px]">
              <AdminSelectChip
                v-model="row.draft.gas_ids"
                :options="gasOptions"
                :disabled="!writeMode"
                singular-label="gas"
                :on-create="(name) => createSimpleLookup('gases', name)"
                @created="onLookupCreated('gases', $event)"
              />
            </td>

            <!-- Dive Sites -->
            <td class="px-2 py-1.5 align-top min-w-[260px]">
              <AdminSelectChip
                v-model="row.draft.dive_site_ids"
                :options="diveSiteOptions"
                :disabled="!writeMode"
                singular-label="dive site"
                :on-create="(name) => createDiveSite(name, row.draft.country_id)"
                @created="onLookupCreated('diveSites', $event)"
              />
            </td>

            <!-- Actions (sticky right) -->
            <td class="px-2 py-1.5 sticky right-0 z-10 align-top min-w-[160px]" :class="rowBg(row)">
              <div class="flex items-center gap-1">
                <button
                  type="button"
                  class="rounded-md text-xs font-medium px-2.5 py-1 cursor-pointer disabled:opacity-50"
                  :class="row.id ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-amber-500 text-white'"
                  :disabled="!writeMode || row.saving"
                  @click="saveRow(row)"
                >
                  {{ row.saving ? '…' : (row.id ? 'Update' : 'Save') }}
                </button>

                <!-- Three-dot menu -->
                <div class="relative">
                  <button
                    type="button"
                    class="rounded-md p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50"
                    :disabled="!writeMode"
                    :aria-expanded="row.menuOpen"
                    aria-label="Row actions"
                    @click="toggleMenu(row)"
                  >
                    <MoreVertical class="w-4 h-4 text-zinc-600 dark:text-zinc-300" stroke-width="2" />
                  </button>
                  <div
                    v-if="row.menuOpen"
                    class="absolute right-0 top-full mt-1 z-40 w-40 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
                    @mouseleave="row.menuOpen = false"
                  >
                    <button
                      v-if="row.id"
                      type="button"
                      class="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      @click="deleteRow(row)"
                    >Delete shop</button>
                    <button
                      v-if="!row.id"
                      type="button"
                      class="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      @click="discardRow(row)"
                    >Discard</button>
                    <button
                      v-if="row.id"
                      type="button"
                      class="w-full text-left px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      @click="revertRow(row)"
                    >Revert changes</button>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="columns.length" class="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No dive shops.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { MoreVertical } from 'lucide-vue-next'
import AdminSelectChip from '~/components/admin/AdminSelectChip.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

useSeoMeta({ robots: 'noindex, nofollow' })

const route = useRoute()
const { isAppAdmin, accessToken, init } = useAuth()

const writeMode = ref(false)
const loading = ref(true)
const loadError = ref('')

const shops = ref([])
const lookups = ref({
  countries: [],
  regions: [],
  courses: [],
  rentalEquipment: [],
  gases: [],
  agencies: [],
  diveSites: []
})

const countryOptions = computed(() => lookups.value.countries.map((c) => ({ id: c.id, label: c.name })))
const regionOptions = computed(() => lookups.value.regions.map((r) => ({ id: r.id, label: r.name })))
const courseOptions = computed(() => lookups.value.courses.map((c) => ({ id: c.id, label: c.label || c.certification_name })))
const rentalOptions = computed(() => lookups.value.rentalEquipment.map((r) => ({ id: r.id, label: r.name })))
const gasOptions = computed(() => lookups.value.gases.map((g) => ({ id: g.id, label: g.name })))
const diveSiteOptions = computed(() => lookups.value.diveSites.map((s) => ({ id: s.id, label: s.name })))

const textColumns = [
  { key: 'street_address', label: 'Address', multiline: true, tdClass: 'min-w-[240px]' },
  { key: 'website_url', label: 'Website', tdClass: 'min-w-[180px]' },
  { key: 'city', label: 'City', tdClass: 'min-w-[140px]' },
  { key: 'state', label: 'State', tdClass: 'min-w-[140px]' },
  { key: 'locale', label: 'Locale', tdClass: 'min-w-[160px]' },
  { key: 'phone', label: 'Phone', tdClass: 'min-w-[150px]' },
  { key: 'email', label: 'Email', tdClass: 'min-w-[180px]' },
  { key: 'type', label: 'Type', tdClass: 'min-w-[180px]' },
  { key: 'google_rating', label: 'Rating', inputType: 'number', tdClass: 'min-w-[100px]' }
]

const columns = computed(() => [
  { key: 'business_name', label: 'Business Name', headerSticky: 'sticky left-0 z-20' },
  ...textColumns.map((c) => ({ key: c.key, label: c.label })),
  { key: 'country_id', label: 'Country' },
  { key: 'region_id', label: 'Region' },
  { key: 'course_ids', label: 'Courses' },
  { key: 'rental_equipment_ids', label: 'Rental Gear' },
  { key: 'gas_ids', label: 'Gases' },
  { key: 'dive_site_ids', label: 'Dive Sites' },
  { key: 'actions', label: 'Actions', headerSticky: 'sticky right-0 z-20' }
])

const rows = ref([])

const hasUnsavedNew = computed(() => rows.value.some((r) => !r.id))

function rowBg (row) {
  if (!row.id) return 'bg-amber-50 dark:bg-amber-950/30'
  if (row.dirty) return 'bg-blue-50 dark:bg-blue-950/30'
  return 'bg-white dark:bg-zinc-900'
}

function makeDraft (shop) {
  return {
    business_name: shop?.business_name ?? '',
    street_address: shop?.street_address ?? '',
    website_url: shop?.website_url ?? '',
    city: shop?.city ?? '',
    state: shop?.state ?? '',
    locale: shop?.locale ?? '',
    phone: shop?.phone ?? '',
    email: shop?.email ?? '',
    type: shop?.type ?? '',
    google_rating: shop?.google_rating ?? '',
    country_id: shop?.country_id ?? null,
    region_id: shop?.region_id ?? null,
    course_ids: Array.isArray(shop?.course_ids) ? [...shop.course_ids] : [],
    rental_equipment_ids: Array.isArray(shop?.rental_equipment_ids) ? [...shop.rental_equipment_ids] : [],
    gas_ids: Array.isArray(shop?.gas_ids) ? [...shop.gas_ids] : [],
    dive_site_ids: Array.isArray(shop?.dive_site_ids) ? [...shop.dive_site_ids] : []
  }
}

function makeRow (shop) {
  const draft = makeDraft(shop)
  return reactive({
    uid: shop?.id || `new-${Math.random().toString(36).slice(2, 10)}`,
    id: shop?.id || null,
    original: shop || null,
    draft,
    dirty: false,
    saving: false,
    saveError: '',
    menuOpen: false
  })
}

function rebuildRowsFromShops () {
  rows.value = shops.value.map(makeRow)
  rows.value.forEach((r) => watchRowDirty(r))
}

function watchRowDirty (row) {
  watch(
    () => row.draft,
    () => {
      row.dirty = isDraftDifferent(row.draft, row.original)
    },
    { deep: true }
  )
}

function isDraftDifferent (draft, original) {
  if (!original) return true
  const fieldsToCheck = [
    'business_name', 'street_address', 'website_url', 'city', 'state', 'locale', 'phone',
    'email', 'type', 'country_id', 'region_id'
  ]
  for (const f of fieldsToCheck) {
    const a = draft[f] ?? ''
    const b = original[f] ?? ''
    if (String(a) !== String(b)) return true
  }
  const numFields = ['google_rating']
  for (const f of numFields) {
    const a = draft[f] === '' || draft[f] == null ? null : Number(draft[f])
    const b = original[f] === '' || original[f] == null ? null : Number(original[f])
    if (a !== b) return true
  }
  const idArrays = ['course_ids', 'rental_equipment_ids', 'gas_ids', 'dive_site_ids']
  for (const f of idArrays) {
    const a = [...(draft[f] || [])].sort()
    const b = [...(original[f] || [])].sort()
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true
  }
  return false
}

function setSingle (row, field, value) {
  row.draft[field] = Array.isArray(value) && value.length > 0 ? value[0] : null
}

function addNewRow () {
  const r = makeRow(null)
  r.dirty = true
  rows.value.unshift(r)
  watchRowDirty(r)
}

function toggleMenu (row) {
  const next = !row.menuOpen
  rows.value.forEach((r) => { r.menuOpen = false })
  row.menuOpen = next
}

function discardRow (row) {
  rows.value = rows.value.filter((r) => r.uid !== row.uid)
}

function revertRow (row) {
  row.draft = makeDraft(row.original)
  row.dirty = false
  row.menuOpen = false
}

function authHeaders () {
  if (!accessToken.value) return {}
  return { Authorization: `Bearer ${accessToken.value}` }
}

function draftToPayload (draft) {
  return {
    business_name: String(draft.business_name || '').trim(),
    street_address: emptyToNull(draft.street_address),
    website_url: emptyToNull(draft.website_url),
    city: emptyToNull(draft.city),
    state: emptyToNull(draft.state),
    locale: emptyToNull(draft.locale),
    phone: emptyToNull(draft.phone),
    email: emptyToNull(draft.email),
    type: emptyToNull(draft.type),
    country_id: draft.country_id || null,
    region_id: draft.region_id || null,
    google_rating: numericOrNull(draft.google_rating),
    course_ids: draft.course_ids || [],
    rental_equipment_ids: draft.rental_equipment_ids || [],
    gas_ids: draft.gas_ids || [],
    dive_site_ids: draft.dive_site_ids || []
  }
}

function emptyToNull (v) {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function numericOrNull (v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

async function saveRow (row) {
  row.saveError = ''
  if (!row.draft.business_name || !row.draft.business_name.trim()) {
    row.saveError = 'Business name is required'
    return
  }
  row.saving = true
  try {
    const payload = draftToPayload(row.draft)
    if (row.id) {
      await $fetch(`/api/admin/shops/${row.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: payload
      })
    } else {
      const res = await $fetch('/api/admin/shops', {
        method: 'POST',
        headers: authHeaders(),
        body: payload
      })
      row.id = res.id
      row.uid = res.id
    }
    await refreshSingleShop(row)
    row.dirty = false
  } catch (e) {
    row.saveError = extractErrorMessage(e)
  } finally {
    row.saving = false
  }
}

async function deleteRow (row) {
  if (!row.id) {
    discardRow(row)
    return
  }
  if (!confirm(`Delete "${row.draft.business_name}"? This also removes related bookings and reviews.`)) return
  row.saving = true
  row.saveError = ''
  try {
    await $fetch(`/api/admin/shops/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    rows.value = rows.value.filter((r) => r.uid !== row.uid)
    shops.value = shops.value.filter((s) => s.id !== row.id)
  } catch (e) {
    row.saveError = extractErrorMessage(e)
  } finally {
    row.saving = false
    row.menuOpen = false
  }
}

async function refreshSingleShop (row) {
  if (!row.id) return
  try {
    const { shops: list } = await $fetch('/api/admin/shops', {
      method: 'GET',
      headers: authHeaders()
    })
    const fresh = list.find((s) => s.id === row.id)
    if (fresh) {
      row.original = fresh
      row.draft = makeDraft(fresh)
      const idx = shops.value.findIndex((s) => s.id === row.id)
      if (idx >= 0) shops.value[idx] = fresh
      else shops.value.push(fresh)
    }
  } catch {
    // non-fatal: row was saved, list just won't refresh
  }
}

function extractErrorMessage (e) {
  if (e && typeof e === 'object') {
    const data = e.data || e.response?._data
    if (data && typeof data === 'object') {
      if (typeof data.statusMessage === 'string' && data.statusMessage) return data.statusMessage
      if (typeof data.message === 'string' && data.message) return data.message
    }
    if (typeof e.statusMessage === 'string' && e.statusMessage) return e.statusMessage
    if (typeof e.message === 'string' && e.message) return e.message
  }
  return 'Save failed'
}

async function createSimpleLookup (kind, name) {
  const { item } = await $fetch(`/api/admin/lookups/${kind}`, {
    method: 'POST',
    headers: authHeaders(),
    body: { name }
  })
  return { id: item.id, label: item.name || item.label || name }
}

async function createRegion (name) {
  return await createSimpleLookup('regions', name)
}

async function createDiveSite (name, country_id) {
  if (!country_id) {
    throw new Error('Set a country first, then add a new dive site')
  }
  const { item } = await $fetch('/api/admin/lookups/dive_sites', {
    method: 'POST',
    headers: authHeaders(),
    body: { name, country_id }
  })
  return { id: item.id, label: item.name }
}

function onLookupCreated (kindKey, opt) {
  const list = lookups.value[kindKey]
  if (!list) return
  if (kindKey === 'rentalEquipment' || kindKey === 'gases' || kindKey === 'regions' || kindKey === 'diveSites' || kindKey === 'countries') {
    list.push({ id: opt.id, name: opt.label })
  } else {
    list.push(opt)
  }
}

async function loadAll () {
  loading.value = true
  loadError.value = ''
  try {
    const [lookupsRes, shopsRes] = await Promise.all([
      $fetch('/api/admin/lookups', { headers: authHeaders() }),
      $fetch('/api/admin/shops', { headers: authHeaders() })
    ])
    lookups.value = {
      countries: lookupsRes.countries || [],
      regions: lookupsRes.regions || [],
      courses: lookupsRes.courses || [],
      rentalEquipment: lookupsRes.rentalEquipment || [],
      gases: lookupsRes.gases || [],
      agencies: lookupsRes.agencies || [],
      diveSites: lookupsRes.diveSites || []
    }
    shops.value = shopsRes.shops || []
    rebuildRowsFromShops()
  } catch (e) {
    loadError.value = extractErrorMessage(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await init()
  if (!isAppAdmin.value) {
    loading.value = false
    return
  }
  await loadAll()
})
</script>
