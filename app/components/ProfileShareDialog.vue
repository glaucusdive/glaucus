<template>
  <dialog
    ref="dialogElement"
    aria-labelledby="profile-qr-title"
    class="shop-qr-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-visible border-0 bg-transparent p-0 text-zinc-900"
    @click="closeOnBackdrop"
    @close="onDialogClose"
  >
    <section class="qr-print-sheet max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg border border-zinc-200 bg-white p-5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white sm:p-6">
      <header class="qr-screen-actions mb-5 flex items-start justify-between gap-4">
        <div class="min-w-0">
          <h2 id="profile-qr-title" class="text-lg font-semibold">Share {{ profileType }} profile</h2>
          <p class="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">{{ profileName }}</p>
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

      <div class="flex flex-col gap-4">
        <p v-if="canUseFlyer" class="text-sm text-zinc-600 dark:text-zinc-400">Flyer preview — your PDF and printout use this same design.</p>
        <img v-if="canUseFlyer && flyerImage" :src="flyerImage" :alt="`Flyer preview for ${profileName}`" width="1240" height="1754" class="mx-auto h-auto w-full max-w-sm rounded border border-zinc-200 bg-white">
        <p v-if="canUseFlyer && generating" role="status" class="text-sm">Preparing flyer…</p>
        <div v-if="canUseFlyer" ref="qrElement" class="hidden" aria-hidden="true">
          <QrcodeVue
            :value="url"
            :size="256"
            :margin="4"
            level="H"
            render-as="svg"
            background="#ffffff"
            foreground="#000000"
            id="profile-qr"
          />
        </div>

        <div class="flex min-w-0 flex-col gap-3">
          <p class="text-sm font-medium">{{ canUseFlyer ? 'Scan to open' : 'Share' }} this {{ profileType }} profile</p>
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
            <Button v-if="canUseFlyer" type="button" variant="secondary" :disabled="!flyerImage || downloading || generating" @click="downloadPdf">
              <Download class="mr-2 h-4 w-4" aria-hidden="true" />
              {{ downloading ? 'Preparing PDF…' : 'Download PDF' }}
            </Button>
            <Button v-if="canUseFlyer" type="button" variant="secondary" :disabled="!flyerImage || generating" @click="printQr">
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
        <p class="text-lg font-semibold">{{ profileName }}</p>
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
import { createProfileFlyer, type ProfileFlyerDetails } from '~/utils/profileFlyer'

const props = defineProps<{
  open: boolean
  profileName: string
  profileType: 'shop' | 'divemaster'
  url: string
  fileName: string
  details?: ProfileFlyerDetails
  canUseFlyer?: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
}>()

const dialogElement = ref<HTMLDialogElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)
const qrElement = ref<HTMLElement | null>(null)
const statusMessage = ref('')
const errorMessage = ref('')
const flyerImage = ref('')
const generating = ref(false)
const downloading = ref(false)
let flyerRequest = 0

watch(() => [props.open, props.canUseFlyer, props.profileName, props.profileType, props.fileName, props.url, props.details] as const, async ([open]) => {
  const request = ++flyerRequest
  flyerImage.value = ''
  generating.value = false
  downloading.value = false
  statusMessage.value = ''
  errorMessage.value = ''
  await nextTick()
  if (request !== flyerRequest) return
  const dialog = dialogElement.value
  if (!dialog) return
  if (open && !dialog.open) {
    dialog.showModal()
    closeButton.value?.focus()
  } else if (!open && dialog.open) {
    dialog.close()
  }
  if (!open || !props.canUseFlyer) return
  generating.value = true
  try {
    const svg = qrSvg()
    if (!svg) throw new Error('The QR code is not available. Close and reopen the share dialog.')
    const image = await createProfileFlyer(props.profileName, props.url, props.details || {}, svg)
    if (request === flyerRequest) flyerImage.value = image
  } catch (error) {
    if (request === flyerRequest) errorMessage.value = error instanceof Error ? error.message : 'Could not prepare the flyer. Close and reopen the share dialog.'
  } finally {
    if (request === flyerRequest) generating.value = false
  }
}, { deep: true, immediate: true, flush: 'sync' })

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
    await navigator.share({ title: props.profileName, text: `View ${props.profileName} on Glaucus`, url: props.url })
    statusMessage.value = 'Profile shared.'
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return
    errorMessage.value = 'Could not open the share menu. Copy the link instead.'
  }
}

async function downloadPdf () {
  if (!props.open || !props.canUseFlyer || !flyerImage.value || downloading.value) return
  const request = flyerRequest
  downloading.value = true
  errorMessage.value = ''
  statusMessage.value = ''
  const image = flyerImage.value
  const name = props.profileName
  const fileName = props.fileName || props.profileType
  try {
    const { jsPDF } = await import('jspdf')
    if (request !== flyerRequest || !props.open || !props.canUseFlyer) return
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
    pdf.setProperties({ title: `${name} — Glaucus profile` })
    pdf.addImage(image, 'PNG', 0, 0, 210, 297, undefined, 'FAST')
    pdf.save(`${fileName}-glaucus-profile.pdf`)
    statusMessage.value = 'PDF downloaded.'
  } catch {
    if (request === flyerRequest) errorMessage.value = 'Could not download the PDF. Try again, or use Print and Save as PDF.'
  } finally {
    if (request === flyerRequest) downloading.value = false
  }
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
  if (!props.open || !props.canUseFlyer || !flyerImage.value) return
  const popup = window.open('', '_blank')
  if (!popup) {
    errorMessage.value = 'Your browser blocked the print window. Allow pop-ups or download the PDF instead.'
    return
  }

  const safeName = escapeHtml(props.profileName)
  popup.onload = () => {
    popup.focus()
    popup.print()
  }
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${safeName} — Glaucus profile</title><style>@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;background:white}img{display:block;width:100%;max-width:210mm;height:auto;margin:0 auto}@media print{img{width:210mm;height:297mm}}</style></head><body><img src="${flyerImage.value}" alt="Profile flyer for ${safeName}"></body></html>`)
  popup.document.close()
  errorMessage.value = ''
}

onUnmounted(() => {
  flyerRequest++
  if (dialogElement.value?.open) dialogElement.value.close()
})
</script>
