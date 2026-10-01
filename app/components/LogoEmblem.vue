<template>
  <img
    src="/images/glaucus-logo-emblem.svg"
    alt=""
    class="shrink-0"
    :class="imgClass"
    width="40"
    height="40"
    style="width: 40px; height: 40px; flex-shrink: 0"
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
