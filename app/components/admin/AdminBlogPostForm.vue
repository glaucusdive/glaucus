<template>
  <div class="w-full overflow-auto">
    <form
      id="admin-blog-post-form"
      class="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_min(360px,32%)] gap-6 lg:gap-8 p-4 lg:p-6 w-full max-w-none"
      @submit.prevent="onSubmit"
    >
      <!-- Left: body (primary on desktop) -->
      <section class="order-2 xl:order-1 flex flex-col gap-4 min-w-0">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Body (Markdown)
        </h3>

        <FormTextarea
          id="blog-body"
          v-model="form.body_markdown"
          :rows="28"
          class="font-mono text-sm min-h-[50vh]"
        />

        <BlogImageUpload
          class="w-full"
          :post-id="postId"
          kind="inline"
          @inline-snippet="insertMarkdown"
        />

        <details class="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Markdown cheat sheet
          </summary>
          <dl class="mt-3 grid gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div><dt class="font-mono text-xs text-zinc-500">## Heading</dt><dd>Section heading (appears in table of contents)</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">**bold**</dt><dd><strong>Bold</strong> text</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">*italic*</dt><dd><em>Italic</em> text</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">[link text](url)</dt><dd>Hyperlink</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">![alt](url)</dt><dd>Image (use Upload inline image below)</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">- item</dt><dd>Bullet list</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">1. item</dt><dd>Numbered list</dd></div>
            <div><dt class="font-mono text-xs text-zinc-500">YouTube URL on its own line</dt><dd>Embedded video player</dd></div>
          </dl>
        </details>
      </section>

      <!-- Right: metadata sidebar (first on mobile) -->
      <aside class="order-1 xl:order-2 flex flex-col gap-6 xl:sticky xl:top-20 xl:self-start min-w-0">
        <section class="flex flex-col gap-4">
          <FormField label="Title" required field-id="blog-title">
            <FormInput
              id="blog-title"
              v-model="form.title"
              type="text"
              required
            />
          </FormField>

          <FormField label="Slug" field-id="blog-slug">
            <FormInput
              id="blog-slug"
              v-model="form.slug"
              type="text"
              placeholder="Auto-generated from title if empty"
            />
          </FormField>

          <FormField label="Excerpt" field-id="blog-excerpt">
            <FormTextarea
              id="blog-excerpt"
              v-model="form.excerpt"
              :rows="3"
            />
          </FormField>

          <FormField label="Status" field-id="blog-status">
            <FormSelect id="blog-status" v-model="form.status">
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </FormSelect>
          </FormField>
        </section>

        <section class="flex flex-col gap-4">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Hero image
          </h3>
          <BlogImageUpload
            class="w-full"
            :post-id="postId"
            kind="hero"
            v-model="form.hero_image_url"
          />
          <FormField label="Hero image alt text" :required="form.status === 'published'" field-id="blog-hero-alt">
            <FormInput
              id="blog-hero-alt"
              v-model="form.hero_image_alt"
              type="text"
              placeholder="Describe the hero image for accessibility and SEO"
            />
          </FormField>
        </section>

        <div v-if="tocPreview.length" class="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            TOC preview (H2 headings)
          </p>
          <ul class="list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
            <li v-for="item in tocPreview" :key="item.id">{{ item.title }}</li>
          </ul>
        </div>
      </aside>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { BlogPost, BlogPostStatus } from '~~/shared/blogPost'
import { extractBlogToc } from '~~/shared/blogToc'
import BlogImageUpload from '~/components/blog/BlogImageUpload.vue'

const props = defineProps<{
  postId: string | null
  initial?: Partial<BlogPost> | null
}>()

const emit = defineEmits<{
  saved: [post: BlogPost]
  'update:saving': [value: boolean]
  'update:saveError': [value: string]
}>()

const { accessToken } = useAuth()

const form = reactive({
  title: '',
  slug: '',
  excerpt: '',
  hero_image_url: '',
  hero_image_alt: '',
  body_markdown: '',
  status: 'draft' as BlogPostStatus
})

watch(
  () => props.initial,
  (v) => {
    if (!v) return
    form.title = v.title ?? ''
    form.slug = v.slug ?? ''
    form.excerpt = v.excerpt ?? ''
    form.hero_image_url = v.hero_image_url ?? ''
    form.hero_image_alt = v.hero_image_alt ?? ''
    form.body_markdown = v.body_markdown ?? ''
    form.status = v.status === 'published' ? 'published' : 'draft'
  },
  { immediate: true }
)

const saving = ref(false)
const saveError = ref('')

watch(saving, (v) => emit('update:saving', v), { immediate: true })
watch(saveError, (v) => emit('update:saveError', v), { immediate: true })

const tocPreview = computed(() => extractBlogToc(form.body_markdown))

function insertMarkdown (snippet: string) {
  const ta = document.getElementById('blog-body') as HTMLTextAreaElement | null
  if (!ta) {
    form.body_markdown += `\n\n${snippet}\n`
    return
  }
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const before = form.body_markdown.slice(0, start)
  const after = form.body_markdown.slice(end)
  const insert = `${before}${before.endsWith('\n') || before === '' ? '' : '\n'}${snippet}\n${after}`
  form.body_markdown = insert
}

async function onSubmit () {
  saveError.value = ''
  saving.value = true
  try {
    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt,
      hero_image_url: form.hero_image_url,
      hero_image_alt: form.hero_image_alt,
      body_markdown: form.body_markdown,
      status: form.status
    }

    const isNew = !props.postId
    const url = isNew ? '/api/admin/blog' : `/api/admin/blog/${props.postId}`
    const method = isNew ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.value}`
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.statusMessage || err.message || res.statusText)
    }

    const json = await res.json()
    emit('saved', json.post)
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Save failed'
  } finally {
    saving.value = false
  }
}
</script>
