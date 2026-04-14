<template>
  <Teleport to="body">
    <div
      v-if="layerMounted"
      :id="drawerId"
      ref="layerRef"
      class="fixed bottom-0 left-0 right-0 z-40 flex flex-col justify-center bg-[#101214] px-6 pb-10 pt-8"
      :style="{ top: `${drawerTopPx}px` }"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      @click.self="emitClose"
    >
      <nav
        class="flex flex-col gap-4"
        aria-label="Landing sections"
        @click.stop
      >
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="text-2xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          :class="
            activeNavLinkId === item.id ? 'text-white' : 'text-zinc-400 hover:text-white'
          "
          @click="emitClose"
        >
          {{ item.label }}
        </a>
      </nav>
    </div>
  </Teleport>
</template>

<script setup>
import gsap from 'gsap'
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** Pixels from viewport top; matches sticky landing header height so the menu sits below it. */
  headerOffsetPx: { type: Number, default: 0 },
  navItems: { type: Array, required: true },
  activeNavLinkId: { type: String, default: null },
  drawerId: { type: String, default: 'landing-mobile-nav' }
})

const drawerTopPx = computed(() => Math.max(0, props.headerOffsetPx))

const emit = defineEmits(['close'])

const layerRef = ref(null)
const layerMounted = ref(false)

function emitClose () {
  emit('close')
}

function lockBody (lock) {
  if (import.meta.client) {
    document.body.style.overflow = lock ? 'hidden' : ''
  }
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      layerMounted.value = true
      await nextTick()
      const el = layerRef.value
      if (!el) {
        return
      }
      gsap.killTweensOf(el)
      gsap.fromTo(
        el,
        { opacity: 0 },
        { opacity: 1, duration: 0.25, ease: 'power2.out' }
      )
      lockBody(true)
    } else if (layerMounted.value) {
      const el = layerRef.value
      if (el) {
        gsap.killTweensOf(el)
        gsap.to(el, {
          opacity: 0,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            layerMounted.value = false
            lockBody(false)
          }
        })
      } else {
        layerMounted.value = false
        lockBody(false)
      }
    }
  }
)

function onKeydown (e) {
  if (e.key === 'Escape' && props.open) {
    emitClose()
  }
}

if (import.meta.client) {
  watch(
    () => props.open,
    (isOpen) => {
      if (isOpen) {
        window.addEventListener('keydown', onKeydown)
      } else {
        window.removeEventListener('keydown', onKeydown)
      }
    },
    { immediate: true }
  )
}

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeydown)
    document.body.style.overflow = ''
  }
})
</script>
