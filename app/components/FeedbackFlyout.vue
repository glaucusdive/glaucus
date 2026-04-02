<template>
  <div ref="rootRef" class="relative z-0 w-full h-full">
    <button
      type="button"
      class="relative z-[2101] w-full h-full flex items-center justify-center border border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-full cursor-pointer text-zinc-900 dark:text-white bg-zinc-50 dark:bg-black"
      aria-label="Help and feedback"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggleOpen"
    >
      <CircleHelp class="w-6 h-6" stroke-width="1.25" aria-hidden="true" />
    </button>

    <div
      v-if="open"
      class="z-[2000] flex flex-col overflow-y-auto overflow-x-hidden rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg
        max-lg:fixed max-lg:left-2 max-lg:w-[min(24rem,calc(100vw-1rem))]
        max-lg:bottom-[calc(0.5rem+3rem+0.5rem+env(safe-area-inset-bottom,0px))]
        max-lg:max-h-[min(44rem,calc(100dvh-5.5rem-env(safe-area-inset-bottom,0px)))]
        lg:absolute lg:bottom-full lg:left-0 lg:mb-2 lg:h-fit lg:w-[min(24rem,calc(100vw-1rem))] lg:max-h-[min(44rem,calc(100dvh-3rem))]"
      role="dialog"
      aria-labelledby="feedback-flyout-title"
      @click.stop
    >
      <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 shrink-0">
        <h2 id="feedback-flyout-title" class="text-sm font-semibold text-zinc-900 dark:text-white">
          Send feedback
        </h2>
        <button
          type="button"
          class="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 cursor-pointer"
          aria-label="Close"
          @click="close"
        >
          <X class="w-4 h-4" stroke-width="2" />
        </button>
      </div>

      <div v-if="successInfo" class="p-3 text-sm text-zinc-700 dark:text-zinc-300 flex flex-col gap-2">
        <p>Thanks — tracked as <strong class="text-zinc-900 dark:text-white">{{ successInfo.identifier }}</strong>.</p>
        <a
          v-if="successInfo.url"
          :href="successInfo.url"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-600 dark:text-blue-400 underline font-medium"
        >
          Open in Linear
        </a>
        <button
          type="button"
          class="mt-1 text-left text-sm font-medium text-zinc-900 dark:text-white underline cursor-pointer"
          @click="resetAfterSuccess"
        >
          Send another
        </button>
      </div>

      <form v-else class="flex flex-col gap-4 p-2" @submit.prevent="handleSubmit">
        <div class="flex flex-col gap-1">
          <legend class="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400 px-0.5">Type</legend>
          <select
            id="feedback-kind"
            v-model="kind"
            class="rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
          </select>
        </div>

        <hr class="border-zinc-200 dark:border-zinc-800" />

        <div class="flex flex-col gap-1">
          <label for="feedback-name" class="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Name</label>
          <input
            id="feedback-name"
            v-model="name"
            type="text"
            required
            autocomplete="name"
            maxlength="200"
            class="rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
        </div>

        <div class="flex flex-col gap-1">
          <label for="feedback-email" class="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Email</label>
          <input
            id="feedback-email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            class="rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          >
        </div>

        <hr class="border-zinc-200 dark:border-zinc-800" />

        <div class="flex flex-col gap-1">
          <label for="feedback-subject"
            class="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Subject</label>
          <input id="feedback-subject" v-model="subject" type="text" required minlength="3" maxlength="200"
            placeholder="Short summary for the issue title"
            class="rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500">
        </div>

        <div class="flex flex-col gap-1">
          <label for="feedback-message" class="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Message</label>
          <textarea
            id="feedback-message"
            v-model="message"
            required
            rows="5"
            minlength="10"
            maxlength="10000"
            placeholder="Describe your idea or what went wrong…"
            class="rounded-md w-full p-2 text-sm resize-y min-h-[100px] bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="feedback-photo" class="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">Screenshot (optional)</label>
          <input
            id="feedback-photo"
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            class="block w-full text-sm text-zinc-600 dark:text-zinc-400 file:mr-2 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-2 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-zinc-50 dark:file:border-zinc-600 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700 cursor-pointer"
            @change="onFileSelected"
          >
          <p class="text-[11px] text-zinc-500 dark:text-zinc-500 leading-snug">
            JPEG, PNG, WebP, or GIF, up to 4&nbsp;MB. Shown inline on the Linear issue.
          </p>
          <div v-if="attachmentPreviewUrl" class="relative rounded-md border border-zinc-200 dark:border-zinc-600 overflow-hidden max-h-32 w-full bg-zinc-100 dark:bg-zinc-800">
            <img :src="attachmentPreviewUrl" alt="Attachment preview" class="w-full h-full object-contain max-h-32">
            <button
              type="button"
              class="absolute top-1 right-1 rounded bg-zinc-900/80 text-white text-xs px-1.5 py-0.5 cursor-pointer"
              @click="clearAttachment"
            >
              Remove
            </button>
          </div>
        </div>

        <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>

        <div class="sticky bottom-0 w-full">
          <button type="submit" :disabled="submitting"
            class="mt-1 border border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium py-2.5 px-3 rounded-md text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full">
            {{ submitting ? 'Sending…' : 'Submit' }}
          </button>
        </div>
        
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { CircleHelp, X } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

const rootRef = ref(null)
const open = ref(false)
const kind = ref('bug')
const subject = ref('')
const name = ref('')
const email = ref('')
const message = ref('')
const submitting = ref(false)
const submitError = ref('')
const successInfo = ref(null)
const fileInputRef = ref(null)
const selectedFile = ref(null)
const attachmentPreviewUrl = ref(null)

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024

const route = useRoute()
const { user } = useAuth()

function prefillFromUser () {
  const u = user.value
  if (!u) return
  if (u.email && !email.value.trim()) {
    email.value = u.email
  }
  const meta = u.user_metadata
  if (meta && typeof meta === 'object') {
    const dn = meta.display_name ?? meta.full_name ?? meta.name
    if (typeof dn === 'string' && dn.trim() && !name.value.trim()) {
      name.value = dn.trim()
    }
  }
}

function toggleOpen () {
  open.value = !open.value
}

function close () {
  open.value = false
  submitError.value = ''
  successInfo.value = null
}

function resetAfterSuccess () {
  successInfo.value = null
  subject.value = ''
  message.value = ''
  kind.value = 'bug'
  clearAttachment()
}

function revokePreview () {
  if (attachmentPreviewUrl.value) {
    URL.revokeObjectURL(attachmentPreviewUrl.value)
    attachmentPreviewUrl.value = null
  }
}

function clearAttachment () {
  revokePreview()
  selectedFile.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function onFileSelected (e) {
  revokePreview()
  const input = e.target
  const file = input?.files?.[0] ?? null
  if (!file) {
    selectedFile.value = null
    return
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    submitError.value = 'Photo must be 4MB or smaller.'
    input.value = ''
    selectedFile.value = null
    return
  }
  const okType = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.type)
  if (!okType) {
    submitError.value = 'Please choose a JPEG, PNG, WebP, or GIF image.'
    input.value = ''
    selectedFile.value = null
    return
  }
  submitError.value = ''
  selectedFile.value = file
  attachmentPreviewUrl.value = URL.createObjectURL(file)
}

function onDocPointerDown (e) {
  if (!open.value) return
  const el = rootRef.value
  if (!el || typeof el.contains !== 'function') return
  const target = e.target
  if (target instanceof Node && !el.contains(target)) {
    close()
  }
}

function onKeydown (e) {
  if (e.key === 'Escape' && open.value) {
    e.preventDefault()
    close()
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    prefillFromUser()
  }
})

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  revokePreview()
})

async function handleSubmit () {
  submitError.value = ''
  submitting.value = true
  try {
    let pageUrl = route.fullPath || '/'
    if (typeof window !== 'undefined') {
      pageUrl = `${window.location.origin}${route.fullPath || '/'}`
    }
    const fd = new FormData()
    fd.append('kind', kind.value)
    fd.append('subject', subject.value.trim())
    fd.append('name', name.value.trim())
    fd.append('email', email.value.trim())
    fd.append('message', message.value.trim())
    fd.append('pageUrl', pageUrl)
    if (selectedFile.value) {
      fd.append('file', selectedFile.value, selectedFile.value.name)
    }
    const res = await $fetch('/api/feedback', {
      method: 'POST',
      body: fd
    })
    successInfo.value = { identifier: res.identifier, url: res.url }
  } catch (err) {
    const msg = err?.data?.statusMessage || err?.data?.message || err?.message || 'Something went wrong.'
    submitError.value = typeof msg === 'string' ? msg : 'Something went wrong.'
  } finally {
    submitting.value = false
  }
}
</script>
