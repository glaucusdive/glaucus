<template>
  <div class="flex flex-col h-full min-h-0">
    <ShellPageHeader :title="isNew ? 'Admin · New post' : 'Admin · Edit post'">
      <template #actions>
        <NuxtLink
          v-if="!isNew && post?.slug"
          :to="`/blog/${post.slug}`"
          target="_blank"
          class="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          View live
        </NuxtLink>
        <NuxtLink
          to="/admin/blog"
          class="inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          All posts
        </NuxtLink>
      </template>
    </ShellPageHeader>

    <div v-if="loading && !isNew" class="flex-1 flex items-center justify-center p-8">
      <span class="text-sm text-zinc-500">Loading…</span>
    </div>
    <div v-else-if="loadError" class="flex-1 flex items-center justify-center p-8">
      <p class="text-sm text-red-600 dark:text-red-400">{{ loadError }}</p>
    </div>
    <AdminBlogPostForm
      v-else
      :post-id="postId"
      :initial="post"
      @saved="onSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { BlogPost } from '~~/shared/blogPost'
import AdminBlogPostForm from '~/components/admin/AdminBlogPostForm.vue'

definePageMeta({ layout: 'default', middleware: 'admin' })
useSeoMeta({ robots: 'noindex, nofollow' })

const route = useRoute()
const router = useRouter()
const { accessToken, init } = useAuth()

const rawId = computed(() => {
  const p = route.params.id
  return Array.isArray(p) ? p[0] : p
})

const isNew = computed(() => rawId.value === 'new')
const postId = computed(() => (isNew.value ? null : rawId.value))
const post = ref<BlogPost | null>(null)
const loading = ref(!isNew.value)
const loadError = ref('')

async function loadPost () {
  if (isNew.value) return
  loading.value = true
  loadError.value = ''
  try {
    const res = await fetch(`/api/admin/blog/${rawId.value}`, {
      headers: { Authorization: `Bearer ${accessToken.value}` }
    })
    if (!res.ok) throw new Error(await res.text())
    const json = await res.json()
    post.value = json.post
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Failed to load post'
  } finally {
    loading.value = false
  }
}

function onSaved (saved: BlogPost) {
  post.value = saved
  if (isNew.value) {
    router.replace(`/admin/blog/${saved.id}`)
  }
}

onMounted(async () => {
  await init()
  await loadPost()
})
</script>
