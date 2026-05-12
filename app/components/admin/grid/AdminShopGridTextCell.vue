<template>
  <div class="px-1 py-0 min-h-[32px] max-w-full min-w-0 flex items-center">
    <textarea
      v-if="writeMode && multiline"
      v-model="text"
      rows="2"
      class="w-full min-w-0 max-h-16 resize-y rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-white leading-snug"
    />
    <input
      v-else-if="writeMode"
      v-model="text"
      :type="inputType"
      :step="inputType === 'number' ? 'any' : undefined"
      class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-white"
    />
    <span v-else class="block w-full min-w-0 truncate text-xs text-zinc-700 dark:text-zinc-200">{{ displayRead }}</span>
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

const multiline = computed(() => prop.value === 'street_address')
const inputType = computed(() => (prop.value === 'google_rating' ? 'number' : 'text'))

const model = computed(() => props.model as ShopGridRow)

const text = computed({
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
  if (multiline.value) return String(v).replace(/\s+/g, ' ').trim()
  return String(v)
})
</script>
