<template>
  <div class="flex h-full min-h-0 w-full min-w-0 max-w-full items-stretch">
    <div v-if="writeMode" class="flex min-h-0 min-w-0 flex-1 items-stretch" :class="ADMIN_GRID_WRITE_WRAP">
      <textarea
        v-if="multiline"
        v-model="text"
        rows="2"
        :class="ADMIN_GRID_WRITE_TEXTAREA"
      />
      <input
        v-else
        v-model="text"
        :type="inputType"
        :step="inputType === 'number' ? 'any' : undefined"
        :class="ADMIN_GRID_WRITE_INPUT"
      >
    </div>
    <span
      v-else
      :class="[ADMIN_GRID_READ_DATA, 'text-sm font-normal text-zinc-700 dark:text-zinc-200']"
    >{{ displayRead }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'
import {
  ADMIN_GRID_READ_DATA,
  ADMIN_GRID_WRITE_INPUT,
  ADMIN_GRID_WRITE_TEXTAREA,
  ADMIN_GRID_WRITE_WRAP
} from '~/components/admin/adminGridEditClasses'

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
