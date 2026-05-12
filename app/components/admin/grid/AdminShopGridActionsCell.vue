<template>
  <div class="px-1 py-0 min-h-[28px] max-w-full min-w-0 flex items-center gap-1">
    <button
      type="button"
      class="shrink-0 rounded-md text-[10px] font-medium px-2 py-0.5 cursor-pointer disabled:opacity-50"
      :class="model.id ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-amber-500 text-white'"
      :disabled="!writeMode || model.saving"
      @click.stop="ctx.saveRow(model)"
    >
      {{ model.saving ? '…' : (model.id ? 'Update' : 'Save') }}
    </button>
    <div class="relative shrink-0">
      <button
        type="button"
        class="rounded-md p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer disabled:opacity-50"
        :disabled="!writeMode"
        :aria-expanded="model.menuOpen"
        aria-label="Row actions"
        @click.stop="ctx.toggleMenu(model)"
      >
        <MoreVertical class="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" stroke-width="2" />
      </button>
      <div
        v-if="model.menuOpen"
        class="absolute right-0 top-full mt-0.5 z-50 w-36 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
        @mouseleave="model.menuOpen = false"
      >
        <button
          v-if="model.id"
          type="button"
          class="w-full text-left px-2 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          @click.stop="ctx.deleteRow(model)"
        >Delete shop</button>
        <button
          v-if="!model.id"
          type="button"
          class="w-full text-left px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          @click.stop="ctx.discardRow(model)"
        >Discard</button>
        <button
          v-if="model.id"
          type="button"
          class="w-full text-left px-2 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          @click.stop="ctx.revertRow(model)"
        >Revert changes</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MoreVertical } from 'lucide-vue-next'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'

const props = defineProps<
  ColumnDataSchemaModel<ShopGridRow> & { gridContext: AdminShopGridContext }
>()

const ctx = computed(() => props.gridContext)
const writeMode = computed(() => ctx.value.writeMode.value)
const model = computed(() => props.model as ShopGridRow)
</script>
