<template>
  <NuxtLink
    v-if="!disabled"
    :to="to"
    :class="[
      'text-sm font-medium bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200 px-4 py-2 rounded-sm transition-colors',
      isActive ? '!bg-zinc-200/50 dark:!bg-zinc-800/50 !text-black dark:!text-white' : 'text-zinc-600 dark:text-zinc-400'
    ]"
    @click="handleClick"
  >
    <slot />
  </NuxtLink>
  <span
    v-else
    :class="[
      'text-sm font-medium bg-transparent px-4 py-2 rounded-sm transition-colors opacity-50 cursor-not-allowed text-zinc-600 dark:text-zinc-400'
    ]"
  >
    <slot />
  </span>
</template>

<script setup>
const props = defineProps({
  to: {
    type: String,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['click'])

const route = useRoute()
const isActive = computed(() => route.path === props.to)

const handleClick = (event) => {
  emit('click', event)
}
</script>
