import { ref } from 'vue'
import {
  fetchDiveSitePickerByIds,
  fetchDiveSitePickerPage,
  diveSiteIdsForLookup,
  type DiveSitePickerOption,
  type DiveSitePickerPage
} from '~~/shared/diveSitePicker'

/**
 * Per-page dive site labels and paged search.
 * Each SearchMultiSelect keeps its own result list; this only shares the label cache and the query.
 */
export function useDiveSitePicker () {
  const { client } = useSupabase()
  const labelById = ref(new Map<string, string>())

  function rememberDiveSites (options: DiveSitePickerOption[]) {
    if (!options.length) return
    const next = new Map(labelById.value)
    for (const option of options) {
      if (option.id && option.label) next.set(option.id, option.label)
    }
    labelById.value = next
  }

  function labelsForIds (ids: string[]): DiveSitePickerOption[] {
    const out: DiveSitePickerOption[] = []
    for (const id of diveSiteIdsForLookup(ids)) {
      const label = labelById.value.get(id)
      if (label) out.push({ id, label })
    }
    return out
  }

  async function ensureDiveSiteLabels (ids: string[]) {
    const missing = diveSiteIdsForLookup(ids).filter(id => !labelById.value.has(id))
    if (!missing.length) return
    rememberDiveSites(await fetchDiveSitePickerByIds(client, missing))
  }

  async function loadDiveSitePage (query: string, offset: number): Promise<DiveSitePickerPage> {
    const page = await fetchDiveSitePickerPage(client, query, offset)
    rememberDiveSites(page.options)
    return page
  }

  return {
    labelsForIds,
    ensureDiveSiteLabels,
    loadDiveSitePage,
    rememberDiveSites
  }
}
