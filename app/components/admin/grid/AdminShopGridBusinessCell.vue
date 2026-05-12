<template>
  <div class="flex h-full min-h-0 w-full min-w-0 max-w-full flex-col justify-center gap-0.5">
    <div
      v-if="writeMode"
      class="flex min-h-0 min-w-0 flex-1 flex-col justify-center rounded-none hover:bg-zinc-100 dark:hover:bg-zinc-800"
    >
      <div :class="ADMIN_GRID_WRITE_WRAP">
        <input
          v-model="name"
          type="text"
          placeholder="Business name"
          :class="ADMIN_GRID_WRITE_INPUT"
        >
      </div>
    </div>
    <span
      v-else
      :class="[ADMIN_GRID_READ_DATA, 'text-sm font-normal text-zinc-900 dark:text-white']"
    >{{ name || '—' }}</span>
    <span v-if="model.saveError" class="block truncate text-xs leading-tight text-red-600 dark:text-red-400">{{ model.saveError }}</span>
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
