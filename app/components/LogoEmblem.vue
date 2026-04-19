<template>
  <img
    src="/images/glaucus-logo-emblem.svg"
    alt=""
    class="shrink-0 -rotate-45"
    :class="imgClass"
  />
</template>

<script setup>
defineProps({
  /** e.g. `h-full w-[40px]` for header lockup, `h-24 w-24` for large loading mark */
  imgClass: {
    type: String,
    default: 'h-full w-[40px]'
  }
})
</script>
