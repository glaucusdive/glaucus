<template>
  <div class="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col justify-center gap-1">
    <div v-if="writeMode" :class="ADMIN_GRID_WRITE_WRAP">
      <select
        class="min-h-0 min-w-0 flex-1 cursor-pointer appearance-none border-0 bg-transparent px-0 py-0 text-sm font-normal text-zinc-900 outline-none ring-0 focus:ring-0 dark:text-white"
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
    </div>
    <template v-else>
      <span :class="[ADMIN_GRID_READ_DATA, 'text-sm font-normal text-zinc-700 dark:text-zinc-200']">{{ displayLabel }}</span>
    </template>
    <button
      v-if="writeMode && isRegion"
      type="button"
      class="shrink-0 self-start text-[10px] text-blue-600 hover:underline dark:text-blue-400"
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
import { ADMIN_GRID_READ_DATA, ADMIN_GRID_WRITE_WRAP } from '~/components/admin/adminGridEditClasses'

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
