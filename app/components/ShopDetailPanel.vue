<template>
  <DiveShopDetail 
    :shop-id="shopId" 
    :show-close-button="true"
    @close="$emit('close')" 
  />
</template>

<script setup>
import DiveShopDetail from '~/components/DiveShopDetail.vue'

// Props
const props = defineProps({
  shopId: {
    type: String,
    required: true
  }
})

// Emits
const emit = defineEmits(['close'])
</script>

