<template>
  <div class="flex flex-col gap-3">
    <div
      v-if="previewUrl"
      class="relative overflow-hidden rounded-lg border border-zinc-700"
    >
      <img :src="previewUrl" :alt="altHint" class="block max-h-48 w-full object-cover" />
    </div>

    <div
      class="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors"
      :class="dragActive
        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
        : 'border-zinc-300 dark:border-zinc-700'"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
    >
      <p class="text-sm font-medium text-zinc-900 dark:text-white">
        {{ kind === 'hero' ? 'Upload hero image' : 'Upload inline image' }}
      </p>
      <p class="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
        JPEG, PNG, WebP, or GIF — max 10 MB
      </p>
      <label class="cursor-pointer">
        <span
          class="inline-flex rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
          :class="uploading ? 'opacity-50 pointer-events-none' : ''"
        >
          {{ uploading ? 'Uploading…' : 'Browse files' }}
        </span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          class="sr-only"
          :disabled="uploading || !postId"
          @change="onFileInput"
        >
      </label>
      <p v-if="!postId" class="text-xs text-amber-600 dark:text-amber-400">
        Save the post as a draft first to enable uploads.
      </p>
      <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BLOG_MEDIA_BUCKET } from '~~/shared/blogMediaUrl'
import { getBlogMediaPublicUrl } from '~~/shared/blogMediaUrl'

const props = defineProps<{
  postId: string | null
  kind?: 'hero' | 'inline'
  modelValue?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [url: string]
  uploaded: [payload: { publicUrl: string; path: string }]
  'inline-snippet': [markdown: string]
}>()

const kind = computed(() => props.kind ?? 'hero')
const dragActive = ref(false)
const uploading = ref(false)
const error = ref('')
const previewUrl = ref(props.modelValue || '')

watch(() => props.modelValue, (v) => {
  previewUrl.value = v || ''
})

const altHint = computed(() =>
  kind.value === 'hero' ? 'Hero image preview' : 'Inline image preview'
)

const { accessToken } = useAuth()
const config = useRuntimeConfig()
const { client } = useSupabase()

async function uploadFile (file: File) {
  error.value = ''
  if (!props.postId) {
    error.value = 'Save the post first'
    return
  }
  if (!file.type.startsWith('image/')) {
    error.value = 'Please choose an image file'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = 'File exceeds 10 MB'
    return
  }

  uploading.value = true
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const objectPath = kind.value === 'hero'
      ? `posts/${props.postId}/hero.${ext}`
      : `posts/${props.postId}/inline/${crypto.randomUUID()}.${ext}`

    const { error: upErr } = await client.storage
      .from(BLOG_MEDIA_BUCKET)
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: kind.value === 'hero'
      })

    if (upErr) {
      await uploadViaApi(file)
      return
    }

    const publicUrl = getBlogMediaPublicUrl(config.public.supabaseUrl, objectPath)
    finishUpload(publicUrl, objectPath, file.name)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

async function uploadViaApi (file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('postId', props.postId!)
  form.append('kind', kind.value)

  const res = await fetch('/api/admin/blog/upload', {
    method: 'POST',
    headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {},
    body: form
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  const json = await res.json()
  finishUpload(json.publicUrl, json.path, file.name)
}

function finishUpload (publicUrl: string, path: string, fileName: string) {
  previewUrl.value = publicUrl
  emit('update:modelValue', publicUrl)
  emit('uploaded', { publicUrl, path })
  if (kind.value === 'inline') {
    const alt = fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
    emit('inline-snippet', `![${alt}](${publicUrl})`)
  }
}

function onFileInput (e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) uploadFile(file)
  input.value = ''
}

function onDrop (e: DragEvent) {
  dragActive.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) uploadFile(file)
}
</script>
