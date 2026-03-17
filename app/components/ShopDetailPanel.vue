<template>
  <DiveShopDetail
    :shop-id="shopId"
    :show-close-button="true"
    :is-in-booking-flow="isInBookingFlow"
    :on-start-booking="onStartBooking"
    :on-show-form="onShowForm"
    @close="$emit('close')"
  />
</template>

<script setup>
import DiveShopDetail from '~/components/DiveShopDetail.vue'

defineProps({
  shopId: {
    type: String,
    required: true
  },
  isInBookingFlow: {
    type: Boolean,
    default: false
  },
  onStartBooking: {
    type: Function,
    default: null
  },
  onShowForm: {
    type: Function,
    default: null
  }
})

defineEmits(['close'])
</script>

