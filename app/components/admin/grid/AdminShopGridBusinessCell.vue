<template>
  <div class="px-1 py-0 min-h-[32px] max-w-full min-w-0 flex flex-col justify-center gap-0.5">
    <input
      v-if="writeMode"
      v-model="name"
      type="text"
      placeholder="Business name"
      class="w-full min-w-0 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-1.5 py-0.5 text-xs text-zinc-900 dark:text-white"
    />
    <span v-else class="block truncate text-sm font-medium text-zinc-900 dark:text-white">{{ name || '—' }}</span>
    <span v-if="model.saveError" class="block truncate text-[10px] leading-tight text-red-600 dark:text-red-400">{{ model.saveError }}</span>
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
const model = computed(() => props.model as ShopGridRow)

const name = computed({
  get: () => String(model.value.business_name ?? ''),
  set: (v: string) => {
    model.value.business_name = v
  }
})
</script>
