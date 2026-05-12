<template>
  <div class="flex h-full min-h-0 min-w-0 max-w-full items-center overflow-x-hidden overflow-y-hidden">
    <AdminMultiSelectCheckboxDropdown
      :model-value="chipValue"
      :options="optionsList"
      :disabled="!writeMode"
      :allow-add="config.allowAdd"
      :singular-label="config.singularLabel"
      :on-create="onCreateFn ?? undefined"
      @update:model-value="onChipUpdate"
      @created="onCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import AdminMultiSelectCheckboxDropdown from '~/components/admin/AdminMultiSelectCheckboxDropdown.vue'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'

const props = defineProps<
  ColumnDataSchemaModel<ShopGridRow> & { gridContext: AdminShopGridContext }
>()

const ctx = computed(() => props.gridContext)
const writeMode = computed(() => ctx.value.writeMode.value)
const prop = computed(() => String(props.column.prop))
const model = computed(() => props.model as ShopGridRow)

const config = computed(() => {
  const p = prop.value
  if (p === 'course_ids') return { multiple: true, singularLabel: 'course', allowAdd: false, kind: null }
  if (p === 'rental_equipment_ids') return { multiple: true, singularLabel: 'rental', allowAdd: true, kind: 'rental_equipment' as const }
  if (p === 'gas_ids') return { multiple: true, singularLabel: 'gas', allowAdd: true, kind: 'gases' as const }
  if (p === 'dive_site_ids') return { multiple: true, singularLabel: 'dive site', allowAdd: true, kind: 'dive_sites' as const }
  return { multiple: true, singularLabel: 'item', allowAdd: false, kind: null as string | null }
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
  if (config.value.multiple) {
    return Array.isArray(v) ? v.map((x) => String(x)) : []
  }
  const id = v as string | null | undefined
  return id ? [String(id)] : []
})

function onChipUpdate (v: string[]) {
  const p = prop.value
  if (config.value.multiple) {
    (model.value as Record<string, unknown>)[p] = Array.isArray(v) ? [...v] : []
  } else {
    ctx.value.setSingle(model.value, p, v as unknown[])
  }
}

const onCreateFn = computed(() => {
  if (!config.value.allowAdd || !config.value.kind) return null
  const kind = config.value.kind
  const c = ctx.value
  if (kind === 'regions') {
    return (name: string) => c.createRegion(name)
  }
  if (kind === 'rental_equipment' || kind === 'gases') {
    return (name: string) => c.createSimpleLookup(kind, name)
  }
  if (kind === 'dive_sites') {
    return (name: string) => c.createDiveSite(name, (model.value.country_id as string | null) ?? null)
  }
  return null
})

function onCreated (opt: { id: string; label: string }) {
  const p = prop.value
  const c = ctx.value
  if (p === 'rental_equipment_ids') c.onLookupCreated('rentalEquipment', opt)
  else if (p === 'gas_ids') c.onLookupCreated('gases', opt)
  else if (p === 'dive_site_ids') c.onLookupCreated('diveSites', opt)
}
</script>
