<template>
  <div class="flex flex-col h-full min-h-0">
    <!-- Top bar -->
    <div class="shrink-0 border-b border-zinc-200 dark:border-zinc-700 p-3 flex items-center justify-between gap-4 flex-wrap">
      <div class="flex flex-col gap-0.5 min-w-0">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-lg font-semibold text-zinc-900 dark:text-white">Admin · Dive Shops</h1>
          <span class="text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
            {{ shopTotal }} shops<span v-if="pageRangeLabel"> · {{ pageRangeLabel }}</span>
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
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

        <AdminButton
          variant="primary"
          :disabled="!writeMode || !hasDirtyOnPage || anyRowSaving || saveAllSaving"
          @click="saveAllDirty"
        >
          {{ saveAllSaving ? 'Saving…' : 'Save' }}
        </AdminButton>

        <AdminButton
          variant="secondary"
          :disabled="!writeMode"
          @click="newDrawerOpen = true"
        >
          Add new business
        </AdminButton>

        <AdminButton
          variant="secondary"
          :disabled="currentPage <= 1"
          @click="goPrevPage"
        >
          Previous
        </AdminButton>
        <AdminButton
          variant="secondary"
          :disabled="currentPage >= totalPages"
          @click="goNextPage"
        >
          Next
        </AdminButton>
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

    <!-- Virtualized grid -->
    <div v-else class="flex-1 min-h-0 min-w-0 flex flex-col relative border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
      <div v-if="rows.length === 0" class="flex-1 flex items-center justify-center p-8 text-sm text-zinc-500 dark:text-zinc-400">
        No dive shops on this page.
      </div>
      <ClientOnly v-else>
        <RevoGrid
          hide-attribution
          class="admin-revo-grid h-full min-h-[320px] w-full min-w-0 flex-1"
          :theme="gridTheme"
          :columns="gridColumns"
          :source="rows"
          :row-size="36"
        />
        <template #fallback>
          <div class="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading grid…</div>
        </template>
      </ClientOnly>
    </div>

    <AdminNewBusinessDrawer
      v-model:open="newDrawerOpen"
      :country-options="countryOptions"
      :region-options="regionOptions"
      :course-options="courseOptions"
      :rental-options="rentalOptions"
      :gas-options="gasOptions"
      :dive-site-options="diveSiteOptions"
      :auth-headers="authHeaders"
      :create-region="createRegion"
      :create-simple-lookup="createSimpleLookup"
      :create-dive-site="createDiveSite"
      :on-lookup-created="onLookupCreated"
      @success="onNewBusinessSuccess"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import RevoGrid, { VGridVueTemplate } from '@revolist/vue3-datagrid'
import { useTheme } from '~/composables/useTheme'
import AdminShopGridBusinessCell from '~/components/admin/grid/AdminShopGridBusinessCell.vue'
import AdminShopGridTextCell from '~/components/admin/grid/AdminShopGridTextCell.vue'
import AdminShopGridSelectCell from '~/components/admin/grid/AdminShopGridSelectCell.vue'
import AdminShopGridCountryRegionCell from '~/components/admin/grid/AdminShopGridCountryRegionCell.vue'
import AdminShopGridDeleteCell from '~/components/admin/grid/AdminShopGridDeleteCell.vue'
import AdminButton from '~/components/admin/AdminButton.vue'
import AdminNewBusinessDrawer from '~/components/admin/AdminNewBusinessDrawer.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

useSeoMeta({ robots: 'noindex, nofollow' })

const PAGE_SIZE = 50

const { isAppAdmin, accessToken, init } = useAuth()
const { isDark } = useTheme()

const writeMode = ref(false)
const loading = ref(true)
const loadError = ref('')
const saveAllSaving = ref(false)
const newDrawerOpen = ref(false)

const shops = ref([])
const shopTotal = ref(0)
const currentPage = ref(1)
const lookups = ref({
  countries: [],
  regions: [],
  courses: [],
  rentalEquipment: [],
  gases: [],
  agencies: [],
  diveSites: []
})

const totalPages = computed(() => Math.max(1, Math.ceil(shopTotal.value / PAGE_SIZE)))

const pageRangeLabel = computed(() => {
  if (!shopTotal.value) return ''
  const start = (currentPage.value - 1) * PAGE_SIZE + 1
  const end = Math.min((currentPage.value - 1) * PAGE_SIZE + rows.value.length, shopTotal.value)
  return `${start}–${end}`
})

const hasDirtyOnPage = computed(() => rows.value.some((r) => r.dirty))
const anyRowSaving = computed(() => rows.value.some((r) => r.saving))

const countryOptions = computed(() =>
  lookups.value.countries.map((c) => ({ id: String(c.id), label: c.name ?? 'Unnamed' }))
)
const regionOptions = computed(() =>
  lookups.value.regions.map((r) => ({ id: String(r.id), label: r.name ?? 'Unnamed' }))
)
const courseOptions = computed(() =>
  lookups.value.courses.map((c) => ({
    id: String(c.id),
    label: c.label || c.certification_name || 'Course'
  }))
)
const rentalOptions = computed(() =>
  lookups.value.rentalEquipment.map((r) => ({ id: String(r.id), label: r.name ?? 'Unnamed' }))
)
const gasOptions = computed(() =>
  lookups.value.gases.map((g) => ({ id: String(g.id), label: g.name ?? 'Unnamed' }))
)
/** Includes every dive_site id on the current page so labels never fall back to raw UUIDs when ids match lookups. */
const diveSiteOptions = computed(() => {
  const fromLookups = lookups.value.diveSites.map((s) => ({
    id: String(s.id),
    label: s.name != null && String(s.name).trim() !== '' ? String(s.name) : 'Unnamed dive site'
  }))
  const byId = new Map(fromLookups.map((o) => [o.id, o.label]))
  for (const row of rows.value) {
    for (const raw of row.dive_site_ids || []) {
      const sid = String(raw)
      if (!byId.has(sid)) {
        byId.set(sid, `Unknown site (${sid.slice(0, 8)}…)`)
      }
    }
  }
  return [...byId.entries()].map(([id, label]) => ({ id, label }))
})

/** Shop field keys stored on each grid row (flat). */
const SHOP_DATA_KEYS = [
  'business_name',
  'street_address',
  'website_url',
  'city',
  'state',
  'locale',
  'phone',
  'email',
  'type',
  'google_rating',
  'country_id',
  'region_id',
  'course_ids',
  'rental_equipment_ids',
  'gas_ids',
  'dive_site_ids'
]

const TEXT_GRID_COLS = [
  { prop: 'street_address', name: 'Address', size: 240 },
  { prop: 'website_url', name: 'Website', size: 180 },
  { prop: 'city', name: 'City', size: 140 },
  { prop: 'state', name: 'State', size: 140 },
  { prop: 'locale', name: 'Locale', size: 160 },
  { prop: 'phone', name: 'Phone', size: 150 },
  { prop: 'email', name: 'Email', size: 180 },
  { prop: 'type', name: 'Type', size: 180 },
  { prop: 'google_rating', name: 'Rating', size: 96 }
]

const gridTheme = computed(() => (isDark.value ? 'darkCompact' : 'compact'))

const rows = ref([])

function optionsFor (prop) {
  switch (prop) {
    case 'country_id':
      return countryOptions.value
    case 'region_id':
      return regionOptions.value
    case 'course_ids':
      return courseOptions.value
    case 'rental_equipment_ids':
      return rentalOptions.value
    case 'gas_ids':
      return gasOptions.value
    case 'dive_site_ids':
      return diveSiteOptions.value
    default:
      return []
  }
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
  const d = makeDraft(shop)
  return reactive({
    ...d,
    uid: shop?.id || `new-${Math.random().toString(36).slice(2, 10)}`,
    id: shop?.id || null,
    original: shop || null,
    dirty: !shop,
    saving: false,
    saveError: '',
    __delete: ''
  })
}

function rebuildRowsFromShops () {
  rows.value = shops.value.map(makeRow)
  rows.value.forEach((r) => watchRowDirty(r))
}

function watchRowDirty (row) {
  watch(
    () => row,
    () => {
      row.dirty = isDraftDifferent(row, row.original)
    },
    { deep: true }
  )
}

function isDraftDifferent (row, original) {
  if (!original) return true
  const fieldsToCheck = [
    'business_name', 'street_address', 'website_url', 'city', 'state', 'locale', 'phone',
    'email', 'type', 'country_id', 'region_id'
  ]
  for (const f of fieldsToCheck) {
    const a = row[f] ?? ''
    const b = original[f] ?? ''
    if (String(a) !== String(b)) return true
  }
  const numFields = ['google_rating']
  for (const f of numFields) {
    const a = row[f] === '' || row[f] == null ? null : Number(row[f])
    const b = original[f] === '' || original[f] == null ? null : Number(original[f])
    if (a !== b) return true
  }
  const idArrays = ['course_ids', 'rental_equipment_ids', 'gas_ids', 'dive_site_ids']
  for (const f of idArrays) {
    const a = [...(row[f] || [])].sort()
    const b = [...(original[f] || [])].sort()
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true
  }
  return false
}

function setSingle (row, field, value) {
  row[field] = Array.isArray(value) && value.length > 0 ? value[0] : null
}

function confirmLeavePage () {
  if (!hasDirtyOnPage.value) return true
  return confirm('You have unsaved changes on this page. Leave and discard them?')
}

function goPrevPage () {
  if (currentPage.value <= 1) return
  if (!confirmLeavePage()) return
  currentPage.value -= 1
  void loadShopsPage()
}

function goNextPage () {
  if (currentPage.value >= totalPages.value) return
  if (!confirmLeavePage()) return
  currentPage.value += 1
  void loadShopsPage()
}

function authHeaders () {
  if (!accessToken.value) return {}
  return { Authorization: `Bearer ${accessToken.value}` }
}

function rowToPayload (row) {
  return {
    business_name: String(row.business_name || '').trim(),
    street_address: emptyToNull(row.street_address),
    website_url: emptyToNull(row.website_url),
    city: emptyToNull(row.city),
    state: emptyToNull(row.state),
    locale: emptyToNull(row.locale),
    phone: emptyToNull(row.phone),
    email: emptyToNull(row.email),
    type: emptyToNull(row.type),
    country_id: row.country_id || null,
    region_id: row.region_id || null,
    google_rating: numericOrNull(row.google_rating),
    course_ids: row.course_ids || [],
    rental_equipment_ids: row.rental_equipment_ids || [],
    gas_ids: row.gas_ids || [],
    dive_site_ids: row.dive_site_ids || []
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
  if (!row.business_name || !String(row.business_name).trim()) {
    row.saveError = 'Business name is required'
    return
  }
  row.saving = true
  try {
    const payload = rowToPayload(row)
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

async function saveAllDirty () {
  if (!writeMode.value || saveAllSaving.value) return
  saveAllSaving.value = true
  try {
    for (const row of rows.value) {
      if (row.dirty) {
        await saveRow(row)
      }
    }
  } finally {
    saveAllSaving.value = false
  }
}

async function deleteRow (row) {
  if (!row.id) return
  if (!confirm(`Delete "${row.business_name}"? This also removes related bookings and reviews.`)) return
  row.saving = true
  row.saveError = ''
  try {
    await $fetch(`/api/admin/shops/${row.id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    shopTotal.value = Math.max(0, shopTotal.value - 1)
    rows.value = rows.value.filter((r) => r.uid !== row.uid)
    shops.value = shops.value.filter((s) => s.id !== row.id)
    if (rows.value.length === 0 && currentPage.value > 1 && shopTotal.value > 0) {
      currentPage.value -= 1
      await loadShopsPage()
    }
  } catch (e) {
    row.saveError = extractErrorMessage(e)
  } finally {
    row.saving = false
  }
}

async function refreshSingleShop (row) {
  if (!row.id) return
  try {
    const { shop: fresh } = await $fetch(`/api/admin/shops/${row.id}`, {
      method: 'GET',
      headers: authHeaders()
    })
    if (fresh) {
      const d = makeDraft(fresh)
      for (const k of SHOP_DATA_KEYS) {
        row[k] = d[k]
      }
      row.original = fresh
      const idx = shops.value.findIndex((s) => s.id === row.id)
      if (idx >= 0) shops.value[idx] = fresh
      else shops.value.push(fresh)
    }
  } catch {
    // non-fatal
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

/** Passed into VGridVueTemplate (RevoGrid mounts cells outside parent provide scope). */
const gridContext = {
  writeMode,
  deleteRow,
  setSingle,
  createRegion,
  createSimpleLookup,
  createDiveSite,
  onLookupCreated,
  optionsFor
}

const gridColumns = [
  {
    prop: 'business_name',
    name: 'Business Name',
    size: 200,
    pin: 'colPinStart',
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridBusinessCell, { gridContext })
  },
  ...TEXT_GRID_COLS.map((c) => ({
    prop: c.prop,
    name: c.name,
    size: c.size,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridTextCell, { gridContext })
  })),
  {
    prop: 'country_id',
    name: 'Country',
    size: 180,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCountryRegionCell, { gridContext })
  },
  {
    prop: 'region_id',
    name: 'Region',
    size: 160,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCountryRegionCell, { gridContext })
  },
  {
    prop: 'course_ids',
    name: 'Courses',
    size: 260,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridSelectCell, { gridContext })
  },
  {
    prop: 'rental_equipment_ids',
    name: 'Rental Gear',
    size: 200,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridSelectCell, { gridContext })
  },
  {
    prop: 'gas_ids',
    name: 'Gases',
    size: 160,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridSelectCell, { gridContext })
  },
  {
    prop: 'dive_site_ids',
    name: 'Dive Sites',
    size: 280,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridSelectCell, { gridContext })
  },
  {
    prop: '__delete',
    name: 'Delete',
    size: 100,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridDeleteCell, { gridContext })
  }
]

async function loadShopsPage () {
  const offset = (currentPage.value - 1) * PAGE_SIZE
  try {
    const shopsRes = await $fetch('/api/admin/shops', {
      method: 'GET',
      headers: authHeaders(),
      query: { limit: PAGE_SIZE, offset }
    })
    loadError.value = ''
    shops.value = shopsRes.shops || []
    shopTotal.value = typeof shopsRes.total === 'number' ? shopsRes.total : shops.value.length
    rebuildRowsFromShops()
  } catch (e) {
    loadError.value = extractErrorMessage(e)
  }
}

async function loadInitial () {
  loading.value = true
  loadError.value = ''
  try {
    const [lookupsRes, shopsRes] = await Promise.all([
      $fetch('/api/admin/lookups', { headers: authHeaders() }),
      $fetch('/api/admin/shops', {
        headers: authHeaders(),
        query: { limit: PAGE_SIZE, offset: (currentPage.value - 1) * PAGE_SIZE }
      })
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
    shopTotal.value = typeof shopsRes.total === 'number' ? shopsRes.total : shops.value.length
    rebuildRowsFromShops()
  } catch (e) {
    loadError.value = extractErrorMessage(e)
  } finally {
    loading.value = false
  }
}

async function onNewBusinessSuccess () {
  currentPage.value = 1
  await loadShopsPage()
}

onMounted(async () => {
  await init()
  if (!isAppAdmin.value) {
    loading.value = false
    return
  }
  await loadInitial()
})
</script>

<style scoped>
.admin-revo-grid :deep(revo-grid) {
  width: 100%;
  min-height: 320px;
  background: transparent !important;
}

.admin-revo-grid :deep(.viewport-wrapper),
.admin-revo-grid :deep(.viewports-wrapper),
.admin-revo-grid :deep(.main-viewport),
.admin-revo-grid :deep(.inner-content-table),
.admin-revo-grid :deep(.table-body),
.admin-revo-grid :deep(.data-view),
.admin-revo-grid :deep(.revo-draggable),
.admin-revo-grid :deep(.revo-drag) {
  background: transparent !important;
}

.admin-revo-grid :deep(.row),
.admin-revo-grid :deep(.rgRow),
.admin-revo-grid :deep([data-rg-row]) {
  background: transparent !important;
}

.admin-revo-grid :deep(.focused-cell),
.admin-revo-grid :deep(.data-cell),
.admin-revo-grid :deep(.rgCell) {
  background: transparent !important;
}
</style>
