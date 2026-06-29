<template>
  <nav v-if="items.length" class="flex flex-col gap-1" aria-label="Table of contents">
    <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
      Table of Contents
    </p>
    <ul class="flex flex-col gap-1 border-l border-zinc-800">
      <li v-for="item in items" :key="item.id">
        <a
          :href="`#${item.id}`"
          class="block border-l-2 py-1.5 pl-3 text-sm transition-colors"
          :class="activeId === item.id
            ? 'border-white text-white'
            : 'border-transparent text-zinc-500 hover:text-zinc-300'"
          @click.prevent="scrollTo(item.id)"
        >
          {{ item.title }}
        </a>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import type { BlogTocItem } from '~~/shared/blogToc'

defineProps<{
  items: BlogTocItem[]
  activeId?: string | null
}>()

function scrollTo (id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>
