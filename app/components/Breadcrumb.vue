<template>
  <nav aria-label="Breadcrumb" class="min-w-0">
    <ol class="flex min-w-0 items-center gap-2 text-base font-semibold sm:text-lg lg:text-2xl">
      <li
        v-for="(item, index) in items"
        :key="`${item.label}-${index}`"
        class="flex min-w-0 items-center gap-2"
      >
        <NuxtLink
          v-if="item.to && index < items.length - 1"
          :to="item.to"
          class="truncate text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
        >
          {{ item.label }}
        </NuxtLink>
        <span
          v-else-if="index < items.length - 1"
          class="truncate text-zinc-500 dark:text-zinc-400"
        >
          {{ item.label }}
        </span>
        <span
          v-else
          class="truncate text-zinc-900 dark:text-white"
          aria-current="page"
        >
          {{ item.label }}
        </span>
        <span
          v-if="index < items.length - 1"
          class="shrink-0 text-zinc-400 dark:text-zinc-500"
          aria-hidden="true"
        >/</span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  items: BreadcrumbItem[]
}>()
</script>
