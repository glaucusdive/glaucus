<template>
  <DiveShopDetail
    :shop-lookup="shopLookup"
    :show-close-button="true"
    :is-in-booking-flow="isInBookingFlow"
    :is-form-open="isFormOpen"
    :on-start-booking="onStartBooking"
    :on-show-form="onShowForm"
    :on-hide-form="onHideForm"
    @close="$emit('close')"
  />
</template>

<script setup>
import DiveShopDetail from '~/components/DiveShopDetail.vue'

defineProps({
  shopLookup: {
    type: String,
    required: true
  },
  isInBookingFlow: {
    type: Boolean,
    default: false
  },
  isFormOpen: {
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
  },
  onHideForm: {
    type: Function,
    default: null
  }
})

defineEmits(['close'])
</script>

