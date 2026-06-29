import { nextTick, onUnmounted, ref, watch, type Ref } from 'vue'

/** Viewport line for “current section” — matches design (~20% from top, below sticky header). */
const ACTIVATION_RATIO = 0.2

export function useBlogTocSpy (
  contentRoot: Ref<HTMLElement | null>,
  /** Re-bind when post content changes (e.g. slug navigation). */
  contentKey?: Ref<string | undefined>
) {
  const activeId = ref<string | null>(null)
  let headings: HTMLElement[] = []
  let rafId: number | null = null

  function collectHeadings (): boolean {
    const root = contentRoot.value
    if (!root) {
      headings = []
      return false
    }
    headings = Array.from(root.querySelectorAll<HTMLElement>('h2[id]'))
    return headings.length > 0
  }

  function updateActive () {
    if (!headings.length) {
      activeId.value = null
      return
    }
    const activationLine = window.innerHeight * ACTIVATION_RATIO
    let current = headings[0].id
    for (const h of headings) {
      if (h.getBoundingClientRect().top <= activationLine) {
        current = h.id
      }
    }
    activeId.value = current
  }

  function onScrollOrResize () {
    if (rafId != null) return
    rafId = requestAnimationFrame(() => {
      rafId = null
      updateActive()
    })
  }

  function unbind () {
    if (typeof window === 'undefined') return
    window.removeEventListener('scroll', onScrollOrResize)
    window.removeEventListener('resize', onScrollOrResize)
    if (rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function bind () {
    unbind()
    if (!collectHeadings()) {
      activeId.value = null
      return
    }
    updateActive()
    if (typeof window === 'undefined') return
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize, { passive: true })
  }

  async function rebind () {
    await nextTick()
    bind()
  }

  watch(
    [contentRoot, () => contentKey?.value],
    () => { void rebind() },
    { immediate: true }
  )

  onUnmounted(unbind)

  return { activeId }
}
