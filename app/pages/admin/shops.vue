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

    <!-- Virtualized grid -->
    <div v-else class="flex-1 min-h-0 min-w-0 flex flex-col relative border-t border-zinc-200 dark:border-zinc-700">
      <div v-if="rows.length === 0" class="flex-1 flex items-center justify-center p-8 text-sm text-zinc-500 dark:text-zinc-400">
        No dive shops.
      </div>
      <ClientOnly v-else>
        <RevoGrid
          hide-attribution
          class="admin-revo-grid h-full min-h-[320px] w-full min-w-0 flex-1"
          :theme="gridTheme"
          :columns="gridColumns"
          :source="rows"
          :row-size="32"
        />
        <template #fallback>
          <div class="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading grid…</div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import RevoGrid, { VGridVueTemplate } from '@revolist/vue3-datagrid'
import { useTheme } from '~/composables/useTheme'
import AdminShopGridBusinessCell from '~/components/admin/grid/AdminShopGridBusinessCell.vue'
import AdminShopGridTextCell from '~/components/admin/grid/AdminShopGridTextCell.vue'
import AdminShopGridSelectCell from '~/components/admin/grid/AdminShopGridSelectCell.vue'
import AdminShopGridActionsCell from '~/components/admin/grid/AdminShopGridActionsCell.vue'

definePageMeta({ layout: 'default', middleware: 'auth' })

useSeoMeta({ robots: 'noindex, nofollow' })

const { isAppAdmin, accessToken, init } = useAuth()
const { isDark } = useTheme()

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

const hasUnsavedNew = computed(() => rows.value.some((r) => !r.id))

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
    menuOpen: false,
    __actions: ''
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

function addNewRow () {
  const r = makeRow(null)
  r.dirty = true
  rows.value.unshift(r)
  watchRowDirty(r)
}

function toggleMenu (row) {
  const next = !row.menuOpen
  rows.value.forEach((rr) => { rr.menuOpen = false })
  row.menuOpen = next
}

function discardRow (row) {
  rows.value = rows.value.filter((r) => r.uid !== row.uid)
}

function revertRow (row) {
  const d = makeDraft(row.original)
  for (const k of SHOP_DATA_KEYS) {
    row[k] = d[k]
  }
  row.dirty = false
  row.menuOpen = false
  row.saveError = ''
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

async function deleteRow (row) {
  if (!row.id) {
    discardRow(row)
    return
  }
  if (!confirm(`Delete "${row.business_name}"? This also removes related bookings and reviews.`)) return
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
  saveRow,
  deleteRow,
  discardRow,
  revertRow,
  toggleMenu,
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
    cellTemplate: VGridVueTemplate(AdminShopGridSelectCell, { gridContext })
  },
  {
    prop: 'region_id',
    name: 'Region',
    size: 160,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridSelectCell, { gridContext })
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
    prop: '__actions',
    name: 'Actions',
    size: 168,
    pin: 'colPinEnd',
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridActionsCell, { gridContext })
  }
]

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

<style scoped>
.admin-revo-grid :deep(revo-grid) {
  width: 100%;
  min-height: 320px;
}
</style>
