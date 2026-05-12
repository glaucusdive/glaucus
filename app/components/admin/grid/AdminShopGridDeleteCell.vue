<template>
  <div class="px-1 flex items-center justify-center min-h-[32px] max-w-full min-w-0">
    <AdminButton
      variant="danger"
      class="text-xs py-0.5 px-2"
      :disabled="!writeMode || model.saving"
      @click="ctx.deleteRow(model)"
    >
      Delete
    </AdminButton>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ColumnDataSchemaModel } from '@revolist/vue3-datagrid'
import AdminButton from '~/components/admin/AdminButton.vue'
import type { AdminShopGridContext, ShopGridRow } from './adminShopGridContext'

const props = defineProps<
  ColumnDataSchemaModel<ShopGridRow> & { gridContext: AdminShopGridContext }
>()

const ctx = computed(() => props.gridContext)
const writeMode = computed(() => ctx.value.writeMode.value)
const model = computed(() => props.model as ShopGridRow)
</script>
