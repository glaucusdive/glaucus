<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader title="Admin · Blog">
      <template #actions>
        <NuxtLink
          to="/admin/blog/new"
          class="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          New post
        </NuxtLink>
      </template>
    </ShellPageHeader>

    <div v-if="loading" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</span>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <div v-else class="flex-1 overflow-y-auto p-4">
      <ul class="flex flex-col gap-2">
        <li v-if="!posts.length" class="text-sm text-zinc-500 dark:text-zinc-400 py-8 text-center">
          No posts yet. Create your first post.
        </li>
        <li
          v-for="post in posts"
          :key="post.id"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="min-w-0 flex-1">
            <p class="font-medium text-zinc-900 dark:text-white truncate">{{ post.title }}</p>
            <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              /blog/{{ post.slug }}
              <span v-if="post.published_at"> · {{ formatDate(post.published_at) }}</span>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="post.status === 'published'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'"
          >
            {{ post.status }}
          </span>
          <NuxtLink
            :to="`/admin/blog/${post.id}`"
            class="shrink-0 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Edit
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { BlogPost } from '~~/shared/blogPost'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({
  title: 'Admin · Blog',
  robots: 'noindex, nofollow'
})

const { accessToken, init } = useAuth()

const loading = ref(true)
const loadError = ref('')
const posts = ref<BlogPost[]>([])

function formatDate (iso: string) {
  try {
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

onMounted(async () => {
  await init()
  try {
    const res = await fetch('/api/admin/blog', {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    posts.value = json.posts ?? []
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load posts'
  } finally {
    loading.value = false
  }
})
</script>
