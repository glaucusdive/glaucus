<template>
  <div class="h-full min-h-0 overflow-hidden">
  <DiveShopDetail
    :shop-lookup="shopLookup"
    :show-close-button="true"
    :is-in-booking-flow="isInBookingFlow"
    :is-form-open="isFormOpen"
    :show-booking-cta="showBookingCta"
    :on-start-booking="onStartBooking"
    :on-show-form="onShowForm"
    :on-hide-form="onHideForm"
    :booking-cta-scroll-delay-ms="bookingCtaScrollDelayMs"
    @close="$emit('close')"
  />
  </div>
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
  },
  bookingCtaScrollDelayMs: {
    type: Number,
    default: 0
  },
  showBookingCta: {
    type: Boolean,
    default: true
  }
})

defineEmits(['close'])
</script>

