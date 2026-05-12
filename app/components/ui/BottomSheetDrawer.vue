<template>
  <Teleport to="body">
    <Transition :css="false" @enter="onEnter" @leave="onLeave">
      <div
        v-if="open"
        class="fixed inset-0 flex flex-col justify-end pointer-events-auto"
        :class="zIndexClass"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel"
      >
        <div
          data-bottom-sheet-backdrop
          class="absolute inset-0 bg-black/50"
          @click="onBackdropClick"
        />
        <div
          data-bottom-sheet-sheet
          class="relative z-10 mx-auto flex min-h-0 w-[99dvw] flex-col overflow-hidden rounded-t-xl border border-b-0 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          :class="[sheetHeightClass, maxWidthClass]"
          @click.stop
        >
          <template v-if="hasFooter">
            <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div class="min-h-0 flex-1 overflow-y-auto">
                <slot />
              </div>
              <div class="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                <slot name="footer" />
              </div>
            </div>
          </template>
          <template v-else>
            <slot />
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, useSlots } from 'vue'
import gsap from 'gsap'

const props = defineProps({
  open: { type: Boolean, default: false },
  ariaLabel: { type: String, default: 'Panel' },
  /** e.g. z-[55] for chat, z-[60] for admin */
  zIndexClass: { type: String, default: 'z-[55]' },
  /** Appended to sheet (e.g. max-w-lg for narrow forms) */
  maxWidthClass: { type: String, default: 'max-w-none' },
  /** Override sheet height (default h-[95dvh]) */
  sheetHeightClass: { type: String, default: 'h-[95dvh]' }
})

const emit = defineEmits(['update:open'])

const slots = useSlots()
const hasFooter = computed(() => !!slots.footer)

function onBackdropClick () {
  emit('update:open', false)
}

function onEnter (el, done) {
  const backdrop = el.querySelector('[data-bottom-sheet-backdrop]')
  const sheet = el.querySelector('[data-bottom-sheet-sheet]')
  if (!backdrop || !sheet) {
    done()
    return
  }
  gsap.from(backdrop, {
    opacity: 0,
    duration: 0.25,
    ease: 'power2.out'
  })
  gsap.from(sheet, {
    y: '100%',
    duration: 0.35,
    ease: 'power3.out',
    onComplete: done
  })
}

function onLeave (el, done) {
  const backdrop = el.querySelector('[data-bottom-sheet-backdrop]')
  const sheet = el.querySelector('[data-bottom-sheet-sheet]')
  if (!backdrop || !sheet) {
    done()
    return
  }
  gsap.to(backdrop, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in'
  })
  gsap.to(sheet, {
    y: '100%',
    duration: 0.28,
    ease: 'power3.in',
    onComplete: done
  })
}
</script>
