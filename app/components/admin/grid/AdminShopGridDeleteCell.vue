<template>
  <div class="flex h-full min-h-0 max-w-full min-w-0 items-center justify-center px-0 py-0">
    <button
      type="button"
      class="rounded p-1.5 text-red-600 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 dark:hover:bg-zinc-800/50"
      :disabled="!writeMode || model.saving"
      aria-label="Delete shop"
      @click="ctx.deleteRow(model)"
    >
      <Trash2 class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'

const props = defineProps<
  ColumnDataSchemaModel<ShopGridRow> & { gridContext: AdminShopGridContext }
>()

const ctx = computed(() => props.gridContext)
const writeMode = computed(() => ctx.value.writeMode.value)
const model = computed(() => props.model as ShopGridRow)
</script>
