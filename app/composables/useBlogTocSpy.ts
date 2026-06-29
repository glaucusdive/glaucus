import { onMounted, onUnmounted, ref, type Ref } from 'vue'

/** Highlight TOC item for the H2 section currently in view. */
export function useBlogTocSpy (contentRoot: Ref<HTMLElement | null>) {
  const activeId = ref<string | null>(null)
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    const root = contentRoot.value
    if (!root || typeof IntersectionObserver === 'undefined') return

    const headings = Array.from(root.querySelectorAll<HTMLElement>('h2[id]'))
    if (!headings.length) return

    observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length) {
          activeId.value = visible[0].target.id
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    for (const h of headings) observer.observe(h)
    activeId.value = headings[0]?.id ?? null
  })

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
  })

  return { activeId }
}
