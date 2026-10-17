<template>
  <dialog
    ref="dialogElement"
    class="shop-qr-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-visible border-0 bg-transparent p-0 text-zinc-900"
    @click="closeOnBackdrop"
    @close="onDialogClose"
  >
    <section class="qr-print-sheet max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white sm:p-6">
      <header class="qr-screen-actions mb-5 flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 id="shop-qr-title" class="text-lg font-semibold">Share shop profile</h2>
          <p class="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">{{ shopName }}</p>
        </div>
        <button
          ref="closeButton"
          type="button"
          class="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-zinc-300 dark:hover:bg-zinc-800"
          aria-label="Close share dialog"
          @click="closeDialog"
        >
          <X class="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div class="grid grid-cols-1 items-center gap-6 sm:grid-cols-[280px_minmax(0,1fr)]">
        <div ref="qrElement" class="mx-auto flex w-fit items-center justify-center rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-700">
          <QrcodeVue
            :value="url"
            :size="256"
            :margin="4"
            level="H"
            render-as="svg"
            background="#ffffff"
            foreground="#000000"
            id="shop-profile-qr"
          />
        </div>

        <div class="flex min-w-0 flex-col gap-3">
          <p class="text-sm font-medium">Scan to open this shop profile</p>
          <p class="break-all rounded-md bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{{ url }}</p>
          <div class="qr-screen-actions grid grid-cols-2 gap-2">
            <Button type="button" variant="secondary" @click="copyLink">
              <Copy class="mr-2 h-4 w-4" aria-hidden="true" />
              Copy link
            </Button>
            <Button type="button" variant="secondary" @click="shareLink">
              <Share2 class="mr-2 h-4 w-4" aria-hidden="true" />
              Share
            </Button>
            <Button type="button" variant="secondary" @click="downloadQr">
              <Download class="mr-2 h-4 w-4" aria-hidden="true" />
              Download
            </Button>
            <Button type="button" variant="secondary" @click="printQr">
              <Printer class="mr-2 h-4 w-4" aria-hidden="true" />
              Print
            </Button>
          </div>
          <p v-if="statusMessage" class="qr-screen-actions text-sm text-emerald-700 dark:text-emerald-300" role="status" aria-live="polite">
            {{ statusMessage }}
          </p>
          <p v-if="errorMessage" class="qr-screen-actions text-sm text-red-600 dark:text-red-400" role="alert">
            {{ errorMessage }}
          </p>
        </div>
      </div>

      <footer class="qr-print-sheet-label mt-5 hidden text-center">
        <p class="text-lg font-semibold">{{ shopName }}</p>
        <p class="mt-1 break-all text-sm">{{ url }}</p>
      </footer>
    </section>
  </dialog>
</template>

<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { Copy, Download, Printer, Share2, X } from 'lucide-vue-next'
import QrcodeVue from 'qrcode.vue'
import { copyTextToClipboard } from '~/utils/copyTextToClipboard'

const props = defineProps<{
  open: boolean
  shopName: string
  url: string
  fileName: string
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const dialogElement = ref<HTMLDialogElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const qrElement = ref<HTMLElement | null>(null)
const statusMessage = ref('')
const errorMessage = ref('')

watch(() => props.open, async (open) => {
  statusMessage.value = ''
  errorMessage.value = ''
  await nextTick()
  const dialog = dialogElement.value
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    closeButton.value?.focus()
  } else if (!open && dialog.open) {
    dialog.close()
  }
})

function closeDialog () {
  emit('update:open', false)
}

function closeOnBackdrop (event: MouseEvent) {
  if (event.target === dialogElement.value) closeDialog()
}

function onDialogClose () {
  if (props.open) emit('update:open', false)
}

function qrSvg (): string | null {
  const svg = qrElement.value?.querySelector('svg')
  if (!svg) return null
  return new XMLSerializer().serializeToString(svg)
}

async function copyLink () {
  const copied = await copyTextToClipboard(props.url)
  statusMessage.value = copied ? 'Link copied.' : ''
  errorMessage.value = copied ? '' : 'Could not copy the link. Select and copy the URL above.'
}

async function shareLink () {
  errorMessage.value = ''
  if (!navigator.share) {
    await copyLink()
    return
  }
  try {
    await navigator.share({ title: props.shopName, text: `View ${props.shopName} on Glaucus`, url: props.url })
    statusMessage.value = 'Profile shared.'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    errorMessage.value = 'Could not open the share menu. Copy the link instead.'
  }
}

function downloadQr () {
  const svg = qrSvg()
  if (!svg) {
    errorMessage.value = 'The QR code is still loading. Try again in a moment.'
    return
  }
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = `${props.fileName || 'dive-shop'}-glaucus-qr.svg`
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  statusMessage.value = 'QR code downloaded.'
  errorMessage.value = ''
}

function escapeHtml (value: string): string {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]!)
}

function printQr () {
  const svg = qrSvg()
  if (!svg) {
    errorMessage.value = 'The QR code is still loading. Try again in a moment.'
    return
  }
  const popup = window.open('', '_blank')
  if (!popup) {
    errorMessage.value = 'Your browser blocked the print window. Allow pop-ups or download the QR instead.'
    return
  }

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  const safeName = escapeHtml(props.shopName)
  const safeUrl = escapeHtml(props.url)
  popup.onload = () => {
    popup.focus()
    popup.print()
  }
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeName} QR</title><style>@page{margin:16mm}*{box-sizing:border-box}body{margin:0;color:#111;font-family:Arial,sans-serif;text-align:center}main{display:flex;min-height:90vh;flex-direction:column;align-items:center;justify-content:center;gap:16px}img{width:min(78vw,90mm);height:auto}h1{margin:0;font-size:22pt}p{margin:0;font-size:11pt;overflow-wrap:anywhere}</style></head><body><main><h1>${safeName}</h1><img src="${svgUrl}" alt="QR code for ${safeName} profile"><p>${safeUrl}</p></main></body></html>`)
  popup.document.close()
  errorMessage.value = ''
}

onUnmounted(() => {
  if (dialogElement.value?.open) dialogElement.value.close()
})
</script>
