<template>
  <div
    class="min-h-dvh w-full"
    :class="BOOKING_EMAIL_TEST_MODE ? 'shadow-[inset_0_0_0_2px_rgb(245_158_11)]' : ''"
  >
    <slot />
  </div>
</template>

<script setup>
import { BOOKING_EMAIL_TEST_MODE } from '#shared/bookingEmailTestMode'
</script>
