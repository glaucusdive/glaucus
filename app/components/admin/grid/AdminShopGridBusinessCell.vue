<template>
  <div class="flex h-full min-h-0 max-w-full min-w-0 flex-col justify-center gap-0.5 px-0 py-0">
    <div v-if="writeMode" :class="ADMIN_GRID_WRITE_WRAP">
      <input
        v-model="name"
        type="text"
        placeholder="Business name"
        :class="ADMIN_GRID_WRITE_INPUT"
      >
    </div>
    <span
      v-else
      :class="[ADMIN_GRID_READ_DATA, 'text-sm font-medium text-zinc-900 dark:text-white']"
    >{{ name || '—' }}</span>
    <span v-if="model.saveError" class="block truncate px-1 text-[10px] leading-tight text-red-600 dark:text-red-400">{{ model.saveError }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'
import { ADMIN_GRID_READ_DATA, ADMIN_GRID_WRITE_INPUT, ADMIN_GRID_WRITE_WRAP } from '~/components/admin/adminGridEditClasses'

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
