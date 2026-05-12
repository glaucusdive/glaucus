<template>
  <div class="px-1 py-0 min-h-[32px] max-w-full min-w-0 h-full flex flex-col justify-center gap-1">
    <select
      v-if="writeMode"
      class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-white"
      :value="currentId"
      @change="onSelectChange"
    >
      <option value="">—</option>
      <option
        v-for="o in options"
        :key="String(o.id)"
        :value="String(o.id)"
      >{{ o.label }}</option>
    </select>
    <template v-else>
      <span class="block truncate text-xs text-zinc-700 dark:text-zinc-200">{{ displayLabel }}</span>
    </template>
    <button
      v-if="writeMode && isRegion"
      type="button"
      class="shrink-0 self-start text-[10px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
      @click="promptNewRegion"
    >
      + Add region
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'

const props = defineProps<
  ColumnDataSchemaModel<ShopGridRow> & { gridContext: AdminShopGridContext }
>()

const ctx = computed(() => props.gridContext)
const writeMode = computed(() => ctx.value.writeMode.value)
const prop = computed(() => String(props.column.prop))
const model = computed(() => props.model as ShopGridRow)
const isRegion = computed(() => prop.value === 'region_id')

const options = computed(() => ctx.value.optionsFor(prop.value) as { id: string; label: string }[])

const currentId = computed(() => {
  const v = model.value[prop.value] as string | null | undefined
  return v == null || v === '' ? '' : String(v)
})

const displayLabel = computed(() => {
  const id = model.value[prop.value] as string | null | undefined
  if (id == null || id === '') return '—'
  const sid = String(id)
  const o = options.value.find((x) => String(x.id) === sid)
  return o?.label ?? '—'
})

function onSelectChange (e: Event) {
  const v = (e.target as HTMLSelectElement).value
  ctx.value.setSingle(model.value, prop.value, v ? [v] : [])
}

async function promptNewRegion () {
  const name = window.prompt('New region name')
  if (!name || !String(name).trim()) return
  try {
    const created = await ctx.value.createRegion(String(name).trim())
    ctx.value.onLookupCreated('regions', created)
    ctx.value.setSingle(model.value, 'region_id', [created.id])
  } catch {
    // ignore
  }
}
</script>
