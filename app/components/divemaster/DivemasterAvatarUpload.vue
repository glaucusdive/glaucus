<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-4">
      <div
        class="size-20 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <img
          v-if="previewUrl"
          :src="previewUrl"
          alt="Avatar preview"
          class="size-full object-cover"
          width="80"
          height="80"
        >
      </div>
      <div class="min-w-0 flex-1 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            :disabled="uploading"
            @click="fileInput?.click()"
          >
            {{ uploading ? 'Uploading…' : (previewUrl ? 'Change photo' : 'Upload photo') }}
          </Button>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="sr-only"
            :disabled="uploading"
            @change="onFileInput"
          >
          <button
            v-if="previewUrl"
            type="button"
            class="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer disabled:opacity-50"
            :disabled="uploading"
            @click="clearAvatar"
          >
            Remove photo
          </button>
        </div>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          JPEG, PNG, WebP, or GIF — max 10 MB. Stored in your profile media.
        </p>
      </div>
    </div>
    <p v-if="error" class="text-sm text-red-600 dark:text-red-400">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { DIVEMASTER_MEDIA_BUCKET } from '~~/shared/divemasterProfile'
import { getDivemasterMediaPublicUrl } from '~~/shared/divemasterMediaUrl'

const props = defineProps<{
  modelValue?: string | null
  userId: string
}>()

const emit = defineEmits<{
  'update:modelValue': [url: string]
}>()

const { accessToken } = useAuth()
const { client } = useSupabase()
const config = useRuntimeConfig()

const uploading = ref(false)
const error = ref('')
const previewUrl = ref(props.modelValue || '')
const fileInput = ref<HTMLInputElement | null>(null)

watch(() => props.modelValue, (v) => {
  previewUrl.value = v || ''
})

async function uploadFile (file: File) {
  error.value = ''
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
    const ext = file.type === 'image/png' ? 'png'
      : file.type === 'image/webp' ? 'webp'
        : file.type === 'image/gif' ? 'gif'
          : 'jpg'
    const objectPath = `${props.userId}/avatar.${ext}`

    const { error: upErr } = await client.storage
      .from(DIVEMASTER_MEDIA_BUCKET)
      .upload(objectPath, file, {
        contentType: file.type,
        upsert: true
      })

    if (upErr) {
      await uploadViaApi(file)
      return
    }

    const publicUrl = getDivemasterMediaPublicUrl(config.public.supabaseUrl, objectPath)
    previewUrl.value = `${publicUrl}?t=${Date.now()}`
    emit('update:modelValue', publicUrl)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Upload failed'
  } finally {
    uploading.value = false
  }
}

async function uploadViaApi (file: File) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/settings/divemaster/avatar', {
    method: 'POST',
    headers: accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {},
    body: form
  })
  if (!res.ok) {
    throw new Error((await res.text()) || res.statusText)
  }
  const json = await res.json() as { publicUrl: string }
  previewUrl.value = `${json.publicUrl}?t=${Date.now()}`
  emit('update:modelValue', json.publicUrl)
}

function clearAvatar () {
  previewUrl.value = ''
  emit('update:modelValue', '')
  error.value = ''
}

function onFileInput (e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void uploadFile(file)
  input.value = ''
}
</script>
