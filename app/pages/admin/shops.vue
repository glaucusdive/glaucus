<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Dive Shops">
      

        <template #actions>
          <div class="hidden md:flex flex-row gap-4">
            <!-- Read/Write toggle -->
            <label class="inline-flex items-center gap-2 select-none cursor-pointer">
              <span class="text-xs uppercase tracking-wide"
                :class="writeMode ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-zinc-500 dark:text-zinc-400'">
                {{ writeMode ? 'Write' : 'Read' }}
              </span>
              <button type="button" role="switch" :aria-checked="writeMode"
                class="relative inline-flex h-5 w-9 rounded-full transition-colors cursor-pointer"
                :class="writeMode ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'" @click="writeMode = !writeMode">
                <span class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-y-0.5"
                  :class="writeMode ? 'translate-x-[18px]' : 'translate-x-0.5'" />
              </button>
            </label>

            <AdminButton variant="secondary" :disabled="!writeMode" @click="newDrawerOpen = true">
              Add new business
            </AdminButton>

            <AdminButton variant="primary" :disabled="!writeMode || !hasDirtyOnPage || anyRowSaving || saveAllSaving"
              @click="saveAllDirty">
              {{ saveAllSaving ? 'Saving…' : 'Save' }}
            </AdminButton>
          </div>
          
        </template>
      
    </ShellPageHeader>

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

    <div v-else class="flex flex-1 min-h-0 min-w-0 flex-col bg-white dark:bg-zinc-900">
      <!-- Virtualized grid -->
      <div class="relative flex min-h-0 min-w-0 flex-1 flex-col border-t border-solid border-[color:var(--admin-table-border)]">
        <div v-if="rows.length === 0" class="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500 dark:text-zinc-400">
          <template v-if="appliedSearch">
            No shops match "{{ appliedSearch }}".
          </template>
          <template v-else>
            No dive shops on this page.
          </template>
        </div>
        <ClientOnly v-else>
          <RevoGrid
            hide-attribution
            class="admin-revo-grid h-full min-h-[320px] w-full min-w-0 flex-1"
            :class="{ 'admin-revo-grid--dark': isDark, 'admin-revo-grid--write': writeMode }"
            :theme="gridTheme"
            :columns="gridColumns"
            :source="rows"
            :row-size="56"
            @beforekeydown="onGridBeforeKeydown"
          />
          <template #fallback>
            <div class="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500 dark:text-zinc-400">Loading grid…</div>
          </template>
        </ClientOnly>
      </div>

      <div class="flex flex-row gap-4 items-center border-t border-solid border-[color:var(--admin-table-border)] bg-zinc-50 px-3 py-2.5 dark:bg-zinc-950">
        <div class="hidden md:flex min-w-0 text-xs text-zinc-600 dark:text-zinc-400">
          <template v-if="appliedSearch">
            {{ shopTotal }} matching "{{ appliedSearch }}"<span v-if="pageRangeLabel"> · {{ pageRangeLabel }}</span>
          </template>
          <template v-else>
            {{ shopTotal }} shops<span v-if="pageRangeLabel"> · {{ pageRangeLabel }}</span>
          </template>
        </div>
        <form class="flex grow w-full items-center gap-2 justify-self-center" @submit.prevent="runSearch">
          <FormInput
            id="admin-shops-search"
            v-model="searchDraft"
            type="search"
            variant="admin"
            placeholder="Search shops…"
            class="min-w-0 flex-1"
            @keydown.enter.prevent="runSearch"
          />
          <AdminButton type="submit" variant="primary">
            Go
          </AdminButton>
          <AdminButton
            v-if="appliedSearch"
            type="button"
            variant="secondary"
            @click="clearSearch"
          >
            Clear
          </AdminButton>
        </form>
        <div class="flex items-center justify-end gap-2">
          <AdminButton
            variant="secondary"
            :disabled="currentPage <= 1"
            @click="goPrevPage"
          >
            <span class="flex md:hidden"><</span>
            <span class="hidden md:flex">Previous</span>
          </AdminButton>
          <AdminButton
            variant="secondary"
            :disabled="currentPage >= totalPages"
            @click="goNextPage"
          >
            <span class="flex md:hidden">></span>
            <span class="hidden md:flex">Next</span>
          </AdminButton>
        </div>
      </div>
    </div>

    <AdminNewBusinessDrawer
      v-model:open="newDrawerOpen"
      :country-options="countryOptions"
      :region-options="regionOptions"
      :course-options="courseOptions"
      :rental-options="rentalOptions"
      :gas-options="gasOptions"
      :dive-site-options="diveSiteOptions"
      :business-type-options="businessTypeOptions"
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
import { normalizeAdminLookupId } from '~/utils/adminLookupIds'
import { shouldKeepArrowInInput } from '~/utils/adminGridInputKeydown'
import { adminColumnHeaderTemplate } from '~/utils/revoGridAdminColumnHeader'
import AdminShopGridCell from '~/components/admin/grid/AdminShopGridCell.vue'
import AdminButton from '~/components/admin/AdminButton.vue'
import AdminNewBusinessDrawer from '~/components/admin/AdminNewBusinessDrawer.vue'
import {
  businessTypeIdsFromStored,
  businessTypeNamesFromIds,
  formatDiveBusinessTypeLabel,
  serializeDiveBusinessTypes
} from '~~/shared/diveBusinessTypes'

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
const searchDraft = ref('')
const appliedSearch = ref('')
const lookups = ref({
  countries: [],
  regions: [],
  courses: [],
  rentalEquipment: [],
  gases: [],
  agencies: [],
  diveSites: [],
  diveBusinessTypes: []
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

const countryOptions = computed(() => {
  const map = new Map()
  for (const c of lookups.value.countries) {
    const id = String(c.id ?? '').trim()
    if (!id) continue
    const norm = normalizeAdminLookupId(id)
    map.set(norm, { id, label: c.name ?? 'Unnamed' })
  }
  for (const row of rows.value) {
    const id = row.country_id
    if (id == null || id === '') continue
    const sid = String(id)
    const norm = normalizeAdminLookupId(sid)
    if (!map.has(norm)) {
      const label =
        row.country_name != null && String(row.country_name).trim() !== ''
          ? String(row.country_name).trim()
          : `Country (${sid.slice(0, 8)}…)`
      map.set(norm, { id: sid, label })
    }
  }
  return [...map.values()]
})
const regionOptions = computed(() => {
  const map = new Map()
  for (const r of lookups.value.regions) {
    const id = String(r.id ?? '').trim()
    if (!id) continue
    const norm = normalizeAdminLookupId(id)
    map.set(norm, { id, label: r.name ?? 'Unnamed' })
  }
  for (const row of rows.value) {
    const id = row.region_id
    if (id == null || id === '') continue
    const sid = String(id)
    const norm = normalizeAdminLookupId(sid)
    if (!map.has(norm)) {
      const label =
        row.region_name != null && String(row.region_name).trim() !== ''
          ? String(row.region_name).trim()
          : `Region (${sid.slice(0, 8)}…)`
      map.set(norm, { id: sid, label })
    }
  }
  return [...map.values()]
})
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
const businessTypeOptions = computed(() =>
  lookups.value.diveBusinessTypes.map((t) => ({
    id: String(t.id),
    name: t.name ?? 'Unnamed',
    label: formatDiveBusinessTypeLabel(t.name ?? 'Unnamed')
  }))
)

function businessTypeLookupOptions () {
  return businessTypeOptions.value.map((o) => ({ id: o.id, name: o.name }))
}

function businessTypeIdsForShop (typeRaw) {
  return businessTypeIdsFromStored(typeRaw, businessTypeLookupOptions())
}

function serializeTypeFromIds (ids) {
  const names = businessTypeNamesFromIds(ids || [], businessTypeLookupOptions())
  return serializeDiveBusinessTypes(names)
}
/** Dive site labels for chips: keys normalized; merge page ids + lookups; gaps filled via /api/admin/dive-sites/resolve. */
const diveSiteOptions = computed(() => {
  const map = new Map()
  for (const s of lookups.value.diveSites) {
    const id = String(s.id ?? '').trim()
    if (!id) continue
    const norm = normalizeAdminLookupId(id)
    const label = s.name != null && String(s.name).trim() !== '' ? String(s.name) : 'Unnamed dive site'
    if (!map.has(norm)) map.set(norm, { id, label })
  }
  for (const row of rows.value) {
    for (const raw of row.dive_site_ids || []) {
      const id = String(raw ?? '').trim()
      if (!id) continue
      const norm = normalizeAdminLookupId(id)
      if (!map.has(norm)) {
        // Not in bulk lookups yet (stale FK, casing drift, or not loaded); resolve fetch may fill name — avoid implying DB has no row.
        map.set(norm, { id, label: `Dive site (${id.slice(0, 8)}…)` })
      }
    }
  }
  return [...map.values()]
})

async function mergeResolvedDiveSites (ids) {
  if (!ids.length) return
  try {
    const { sites } = await $fetch('/api/admin/dive-sites/resolve', {
      method: 'POST',
      headers: authHeaders(),
      body: { ids }
    })
    const list = lookups.value.diveSites
    const seen = new Set(list.map((s) => normalizeAdminLookupId(s.id)))
    for (const s of sites || []) {
      const id = s.id != null ? String(s.id).trim() : ''
      if (!id) continue
      const norm = normalizeAdminLookupId(id)
      if (seen.has(norm)) continue
      seen.add(norm)
      list.push({ id: s.id, name: s.name })
    }
  } catch {
    // non-fatal
  }
}

async function fetchMissingDiveSitesForCurrentPage () {
  const known = new Set(
    lookups.value.diveSites.map((s) => normalizeAdminLookupId(s.id))
  )
  const missing = []
  const seenMissing = new Set()
  for (const row of rows.value) {
    for (const raw of row.dive_site_ids || []) {
      const id = String(raw ?? '').trim()
      if (!id) continue
      const norm = normalizeAdminLookupId(id)
      if (known.has(norm)) continue
      if (seenMissing.has(norm)) continue
      seenMissing.add(norm)
      missing.push(id)
    }
  }
  const slice = missing.slice(0, 500)
  if (slice.length) await mergeResolvedDiveSites(slice)
}

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
  'business_type_ids',
  'country_id',
  'region_id',
  'country_name',
  'region_name',
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
  { prop: 'email', name: 'Email', size: 180 }
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
    case 'business_type_ids':
      return businessTypeOptions.value
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
    business_type_ids: businessTypeIdsForShop(shop?.type),
    country_id: shop?.country_id ?? null,
    region_id: shop?.region_id ?? null,
    country_name: shop?.country_name ?? null,
    region_name: shop?.region_name ?? null,
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
    'email', 'country_id', 'region_id'
  ]
  for (const f of fieldsToCheck) {
    const a = row[f] ?? ''
    const b = original[f] ?? ''
    if (String(a) !== String(b)) return true
  }
  const idArrays = ['business_type_ids', 'course_ids', 'rental_equipment_ids', 'gas_ids', 'dive_site_ids']
  for (const f of idArrays) {
    const a = [...(row[f] || [])].sort()
    const b = [...(f === 'business_type_ids' ? businessTypeIdsForShop(original.type) : (original[f] || []))].sort()
    if (a.length !== b.length) return true
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true
  }
  return false
}

function setSingle (row, field, value) {
  row[field] = Array.isArray(value) && value.length > 0 ? value[0] : null
  const v = row[field]
  if (field === 'country_id') {
    if (v == null || v === '') {
      row.country_name = null
      return
    }
    const sid = String(v)
    const found = countryOptions.value.find(
      (o) => normalizeAdminLookupId(o.id) === normalizeAdminLookupId(sid)
    )
    row.country_name = found?.label ?? row.country_name ?? null
  }
  if (field === 'region_id') {
    if (v == null || v === '') {
      row.region_name = null
      return
    }
    const sid = String(v)
    const found = regionOptions.value.find(
      (o) => normalizeAdminLookupId(o.id) === normalizeAdminLookupId(sid)
    )
    row.region_name = found?.label ?? row.region_name ?? null
  }
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

function shopsListQuery () {
  const offset = (currentPage.value - 1) * PAGE_SIZE
  const query = { limit: PAGE_SIZE, offset }
  const q = appliedSearch.value.trim()
  if (q) query.q = q
  return query
}

function runSearch () {
  if (!confirmLeavePage()) return
  appliedSearch.value = searchDraft.value.trim()
  currentPage.value = 1
  void loadShopsPage()
}

function clearSearch () {
  if (!confirmLeavePage()) return
  searchDraft.value = ''
  appliedSearch.value = ''
  currentPage.value = 1
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
    type: serializeTypeFromIds(row.business_type_ids),
    country_id: row.country_id || null,
    region_id: row.region_id || null,
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
  if (kindKey === 'rentalEquipment' || kindKey === 'gases' || kindKey === 'regions' || kindKey === 'diveSites' || kindKey === 'countries' || kindKey === 'diveBusinessTypes') {
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

function withAdminHeader (col) {
  return { ...col, columnTemplate: adminColumnHeaderTemplate }
}

/** Let arrow/home/end move the caret inside grid text inputs instead of changing cells. */
function onGridBeforeKeydown (e) {
  if (!writeMode.value) return
  const original = e?.detail?.original
  if (!(original instanceof KeyboardEvent)) return
  const target = original.target
  if (!(target instanceof HTMLInputElement)) return
  if (!target.closest('.admin-revo-grid')) return
  if (shouldKeepArrowInInput(original, target)) {
    e.preventDefault()
  }
}

const gridColumns = [
  withAdminHeader({
    prop: 'business_name',
    name: 'Business Name',
    size: 200,
    pin: 'colPinStart',
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  ...TEXT_GRID_COLS.map((c) =>
    withAdminHeader({
      prop: c.prop,
      name: c.name,
      size: c.size,
      readonly: true,
      resize: true,
      cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
    })
  ),
  withAdminHeader({
    prop: 'business_type_ids',
    name: 'Business type',
    size: 220,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: 'country_id',
    name: 'Country',
    size: 180,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: 'region_id',
    name: 'Region',
    size: 160,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: 'course_ids',
    name: 'Courses',
    size: 260,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: 'rental_equipment_ids',
    name: 'Rental Gear',
    size: 200,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: 'gas_ids',
    name: 'Gases',
    size: 160,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: 'dive_site_ids',
    name: 'Dive Sites',
    size: 280,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  }),
  withAdminHeader({
    prop: '__delete',
    name: 'Delete',
    size: 100,
    readonly: true,
    resize: true,
    cellTemplate: VGridVueTemplate(AdminShopGridCell, { gridContext })
  })
]

async function loadShopsPage () {
  try {
    const shopsRes = await $fetch('/api/admin/shops', {
      method: 'GET',
      headers: authHeaders(),
      query: shopsListQuery()
    })
    loadError.value = ''
    shops.value = shopsRes.shops || []
    shopTotal.value = typeof shopsRes.total === 'number' ? shopsRes.total : shops.value.length
    rebuildRowsFromShops()
    await fetchMissingDiveSitesForCurrentPage()
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
        query: shopsListQuery()
      })
    ])
    lookups.value = {
      countries: lookupsRes.countries || [],
      regions: lookupsRes.regions || [],
      courses: lookupsRes.courses || [],
      rentalEquipment: lookupsRes.rentalEquipment || [],
      gases: lookupsRes.gases || [],
      agencies: lookupsRes.agencies || [],
      diveSites: lookupsRes.diveSites || [],
      diveBusinessTypes: lookupsRes.diveBusinessTypes || []
    }
    shops.value = shopsRes.shops || []
    shopTotal.value = typeof shopsRes.total === 'number' ? shopsRes.total : shops.value.length
    rebuildRowsFromShops()
    await fetchMissingDiveSitesForCurrentPage()
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
/*
 * RevoGrid: map library variables to the global admin table border token (main.css).
 */
.admin-revo-grid :deep(revo-grid) {
  --revo-grid-header-border: var(--admin-table-border) !important;
  --revo-grid-cell-border: var(--admin-table-border) !important;
  width: 100%;
  min-height: 320px;
  background: transparent !important;
  overscroll-behavior: contain;
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
  overscroll-behavior: contain;
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

/* One horizontal line per row boundary: cells only (RevoGrid also draws .rgRow top inset — doubles the line). */
.admin-revo-grid :deep(revo-grid revogr-data .rgRow) {
  box-shadow: none !important;
}

/*
 * Header: do not stack extra borders on .rgHeaderCell — RevoGrid + .header-rgRow already use box-shadow.
 * One left-edge inset per header cell + stretch inner .header-content to full row height.
 */
.admin-revo-grid :deep(revo-grid revogr-header .header-rgRow:not(.group)),
.admin-revo-grid :deep(revo-grid revogr-header .header-rgRow.group) {
  box-shadow: none !important;
}

.admin-revo-grid :deep(revo-grid revogr-header .rgHeaderCell) {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25;
  min-height: 0;
  height: 100%;
  max-height: none;
  display: flex !important;
  align-items: stretch;
  align-self: stretch;
  box-shadow: none !important;
}

.admin-revo-grid :deep(revo-grid revogr-header .rgHeaderCell .header-content) {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  width: 100%;
  height: 100%;
}

/*
 * Body cells: typography only. Horizontal inset line + vertical borders + padding live in the unscoped
 * block so they beat RevoGrid’s global compact/darkCompact stylesheet (scoped :deep loses on box-shadow too).
 */
.admin-revo-grid :deep(revo-grid revogr-data .rgCell) {
  box-sizing: border-box;
  font-size: 0.875rem;
  font-weight: 400;
}

.admin-revo-grid :deep(revo-grid .footer-wrapper revogr-data) {
  box-shadow: none !important;
}

/* Write mode: row hover on the real gridcell (after default transparent bg so :hover wins). */
.admin-revo-grid.admin-revo-grid--write :deep(revo-grid revogr-data .rgCell:hover) {
  background-color: rgb(244 244 245) !important;
}

.admin-revo-grid.admin-revo-grid--write.admin-revo-grid--dark :deep(revo-grid revogr-data .rgCell:hover) {
  background-color: var(--admin-table-border) !important;
}
</style>

<style>
/*
 * RevoGrid compact/darkCompact global stylesheet wins over many scoped :deep() rules.
 * Unscoped + !important. Re-declare --admin-table-border on the host so it always resolves under the grid
 * (some theme paths read vars / shadows as if the token were missing).
 */
revo-grid.admin-revo-grid[theme='compact'] {
  --admin-table-border: rgb(228 228 231);
  border-right: 1px solid var(--admin-table-border);
}
revo-grid.admin-revo-grid[theme='darkCompact'] {
  --admin-table-border: rgb(42 38 39);
  border-right: 1px solid var(--admin-table-border);
}

revo-grid.admin-revo-grid[theme='compact'] revogr-data .rgRow,
revo-grid.admin-revo-grid[theme='darkCompact'] revogr-data .rgRow {
  box-shadow: none !important;
}

/* Kill theme header lines (wrong color / double with first body row). */
revo-grid.admin-revo-grid[theme='compact'] revogr-header,
revo-grid.admin-revo-grid[theme='darkCompact'] revogr-header {
  line-height: 1.25 !important;
  box-shadow: none !important;
  border-bottom: none !important;
}

revo-grid.admin-revo-grid[theme='compact'] revogr-header .header-rgRow:not(.group),
revo-grid.admin-revo-grid[theme='darkCompact'] revogr-header .header-rgRow:not(.group),
revo-grid.admin-revo-grid[theme='compact'] revogr-header .header-rgRow.group,
revo-grid.admin-revo-grid[theme='darkCompact'] revogr-header .header-rgRow.group {
  min-height: 56px !important;
  height: 56px !important;
  box-shadow: none !important;
  border-bottom: none !important;
}

revo-grid.admin-revo-grid[theme='compact'] revogr-header .rgHeaderCell,
revo-grid.admin-revo-grid[theme='darkCompact'] revogr-header .rgHeaderCell {
  box-sizing: border-box !important;
  padding: 1rem !important;
  border: none !important;
  border-top: none !important;
  border-bottom: none !important;
  border-left: none !important;
  border-right: 1px solid var(--admin-table-border) !important;
  box-shadow: none !important;
}

/* Body: horizontal rules via border-top only (one line between header and row 1; no double with header shadow). */
revo-grid.admin-revo-grid[theme='compact'] revogr-data .rgCell,
revo-grid.admin-revo-grid[theme='darkCompact'] revogr-data .rgCell {
  box-sizing: border-box !important;
  padding: 1rem !important;
  border: none !important;
  border-right: 1px solid var(--admin-table-border) !important;
  border-top: 1px solid var(--admin-table-border) !important;
  box-shadow: none !important;
}

revo-grid.admin-revo-grid[theme='compact'] .rowHeaders revogr-data .rgCell,
revo-grid.admin-revo-grid[theme='darkCompact'] .rowHeaders revogr-data .rgCell {
  box-sizing: border-box !important;
  padding: 1rem !important;
  border: none !important;
  border-right: 1px solid var(--admin-table-border) !important;
  border-top: 1px solid var(--admin-table-border) !important;
  box-shadow: none !important;
}
</style>
