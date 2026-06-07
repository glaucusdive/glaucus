<template>
  <!-- Business name + save error -->
  <div
    v-if="kind === 'business'"
    class="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col justify-center gap-0.5 p-0"
  >
    <div class="flex min-h-0 min-w-0 flex-1 items-center gap-4">
      <div v-if="writeMode" class="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
        <div :class="ADMIN_GRID_WRITE_WRAP">
          <input
            v-model="businessName"
            type="text"
            placeholder="Business name"
            :class="ADMIN_GRID_WRITE_INPUT"
            @keydown="onAdminGridInputKeydown"
          >
        </div>
      </div>
      <span
        v-else
        :class="[ADMIN_GRID_READ_DATA, 'min-w-0 flex-1 truncate text-sm font-normal text-zinc-900 dark:text-white']"
      >{{ businessName || '—' }}</span>
      <button
        v-if="model.id"
        type="button"
        class="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        aria-label="Copy partner link"
        title="Copy partner link"
        @pointerenter="onPrefetchPortalLink"
        @focus="onPrefetchPortalLink"
        @click.stop="onCopyPortalLink"
      >
        <Link class="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
    <span v-if="model.saveError" class="block truncate text-xs leading-tight text-red-600 dark:text-red-400">{{ model.saveError }}</span>
  </div>

  <!-- Delete -->
  <div
    v-else-if="kind === 'delete'"
    class="flex h-full min-h-0 w-full min-w-0 max-w-full items-center justify-center p-0"
  >
    <button
      type="button"
      class="rounded p-0.5 text-red-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-zinc-800/50"
      :disabled="!writeMode || model.saving"
      aria-label="Delete shop"
      @click="ctx.deleteRow(model)"
    >
      <Trash2 class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>

  <!-- Option / FK chips (country, region, courses, gear, gases, dive sites) -->
  <div
    v-else-if="kind === 'select'"
    class="flex h-full min-h-0 min-w-0 max-w-full items-center overflow-x-hidden overflow-y-hidden p-0"
  >
    <AdminMultiSelectCheckboxDropdown
      class="min-h-0 min-w-0 flex-1"
      :model-value="chipValue"
      :options="optionsList"
      :disabled="!writeMode"
      :allow-add="selectConfig.allowAdd"
      :singular-label="selectConfig.singularLabel"
      :single-select="!selectConfig.multiple"
      :on-create="onCreateFn ?? undefined"
      @update:model-value="onChipUpdate"
      @created="onSelectCreated"
    />
  </div>

  <!-- Plain text / number fields -->
  <div
    v-else
    class="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col justify-center p-0"
  >
    <div v-if="writeMode" class="flex min-h-0 min-w-0 flex-1 items-stretch">
      <div :class="ADMIN_GRID_WRITE_WRAP">
        <input
          v-model="textField"
          type="text"
          :class="ADMIN_GRID_WRITE_INPUT"
          @keydown="onAdminGridInputKeydown"
        >
      </div>
    </div>
    <span
      v-else
      :class="[ADMIN_GRID_READ_DATA, 'text-sm font-normal text-zinc-700 dark:text-zinc-200']"
    >{{ displayRead }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trash2, Link } from 'lucide-vue-next'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import AdminMultiSelectCheckboxDropdown from '~/components/admin/AdminMultiSelectCheckboxDropdown.vue'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'
import { ADMIN_GRID_READ_DATA, ADMIN_GRID_WRITE_INPUT, ADMIN_GRID_WRITE_WRAP } from '~/components/admin/adminGridEditClasses'
import { onAdminGridInputKeydown } from '~/utils/adminGridInputKeydown'

const SELECT_PROPS = new Set([
  'country_id',
  'region_id',
  'business_type_ids',
  'course_ids',
  'rental_equipment_ids',
  'gas_ids',
  'dive_site_ids'
])

const props = defineProps<
  ColumnDataSchemaModel<ShopGridRow> & { gridContext: AdminShopGridContext }
>()

const ctx = computed(() => props.gridContext)
const writeMode = computed(() => ctx.value.writeMode.value)
const prop = computed(() => String(props.column.prop))
const model = computed(() => props.model as ShopGridRow)

const kind = computed(() => {
  const p = prop.value
  if (p === 'business_name') return 'business' as const
  if (p === '__delete') return 'delete' as const
  if (SELECT_PROPS.has(p)) return 'select' as const
  return 'text' as const
})

const businessName = computed({
  get: () => String(model.value.business_name ?? ''),
  set: (v: string) => {
    model.value.business_name = v
  }
})

const textField = computed({
  get: () => {
    const v = model.value[prop.value]
    if (v == null) return ''
    return String(v)
  },
  set: (v: string) => {
    (model.value as Record<string, unknown>)[prop.value] = v
  }
})

const displayRead = computed(() => {
  const v = model.value[prop.value]
  if (v == null || v === '') return ''
  if (prop.value === 'street_address') return String(v).replace(/\s+/g, ' ').trim()
  return String(v)
})

type SelectKind = 'regions' | 'rental_equipment' | 'gases' | 'dive_sites' | 'dive_business_types' | null

const selectConfig = computed(() => {
  const p = prop.value
  if (p === 'country_id') return { multiple: false, singularLabel: 'country', allowAdd: false, kind: null as SelectKind }
  if (p === 'region_id') return { multiple: false, singularLabel: 'region', allowAdd: true, kind: 'regions' as const }
  if (p === 'business_type_ids') {
    return { multiple: true, singularLabel: 'business type', allowAdd: true, kind: 'dive_business_types' as const }
  }
  if (p === 'course_ids') return { multiple: true, singularLabel: 'course', allowAdd: false, kind: null as SelectKind }
  if (p === 'rental_equipment_ids') return { multiple: true, singularLabel: 'rental', allowAdd: true, kind: 'rental_equipment' as const }
  if (p === 'gas_ids') return { multiple: true, singularLabel: 'gas', allowAdd: true, kind: 'gases' as const }
  if (p === 'dive_site_ids') return { multiple: true, singularLabel: 'dive site', allowAdd: true, kind: 'dive_sites' as const }
  return { multiple: true, singularLabel: 'item', allowAdd: false, kind: null as SelectKind }
})

const options = computed(() => ctx.value.optionsFor(prop.value))

const optionsList = computed(() =>
  (options.value as { id: string; label?: string; name?: string }[]).map((o) => ({
    id: String(o.id),
    label: o.label != null && String(o.label) !== '' ? String(o.label) : (o.name != null ? String(o.name) : String(o.id))
  }))
)

const chipValue = computed(() => {
  const p = prop.value
  const v = model.value[p]
  if (selectConfig.value.multiple) {
    return Array.isArray(v) ? v.map((x) => String(x)) : []
  }
  const id = v as string | null | undefined
  return id ? [String(id)] : []
})

function onChipUpdate (v: string[]) {
  const p = prop.value
  if (selectConfig.value.multiple) {
    (model.value as Record<string, unknown>)[p] = Array.isArray(v) ? [...v] : []
  } else {
    ctx.value.setSingle(model.value, p, v as unknown[])
  }
}

const onCreateFn = computed(() => {
  if (!selectConfig.value.allowAdd || !selectConfig.value.kind) return null
  const k = selectConfig.value.kind
  const c = ctx.value
  if (k === 'regions') {
    return (name: string) => c.createRegion(name)
  }
  if (k === 'rental_equipment' || k === 'gases' || k === 'dive_business_types') {
    return (name: string) => c.createSimpleLookup(k, name)
  }
  if (k === 'dive_sites') {
    return (name: string) => c.createDiveSite(name, (model.value.country_id as string | null) ?? null)
  }
  return null
})

function onSelectCreated (opt: { id: string; label: string }) {
  const p = prop.value
  const c = ctx.value
  if (p === 'region_id') c.onLookupCreated('regions', opt)
  else if (p === 'business_type_ids') c.onLookupCreated('diveBusinessTypes', opt)
  else if (p === 'rental_equipment_ids') c.onLookupCreated('rentalEquipment', opt)
  else if (p === 'gas_ids') c.onLookupCreated('gases', opt)
  else if (p === 'dive_site_ids') c.onLookupCreated('diveSites', opt)
}

function onPrefetchPortalLink () {
  void ctx.value.prefetchPortalLink(model.value)
}

function onCopyPortalLink () {
  void ctx.value.copyPortalLink(model.value)
}
</script>
