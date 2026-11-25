import { dictionarySitemapEntries } from '../../../shared/diveDictionary'
import { assertSitemapSourceKey } from '../../utils/sitemapSources'

/** Dynamic sitemap entries for dive dictionary terms. */
export default defineEventHandler((event) => {
  assertSitemapSourceKey(event)
  return dictionarySitemapEntries()
})
