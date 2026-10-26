import { describe, expect, it, vi } from 'vitest'
import {
  DIVE_SITE_PICKER_PAGE_SIZE,
  diveSiteIdsForLookup,
  diveSiteOptionLabel,
  escapeIlikePattern,
  fetchDiveSitePickerByIds,
  fetchDiveSitePickerPage,
  mapDiveSitePickerRow
} from '../../shared/diveSitePicker'
import { DIVE_SITE_ADD_NEW_ID } from '../../shared/divemasterProfile'
import { pendingDiveSiteId } from '../../shared/pendingDiveSiteIds'

describe('diveSitePicker', () => {
  it('escapes ilike wildcards and formats labels with country', () => {
    expect(escapeIlikePattern('100%_reef\\')).toBe('100\\%\\_reef\\\\')
    expect(diveSiteOptionLabel('Batman Island', 'Indonesia')).toBe('Batman Island (Indonesia)')
    expect(diveSiteOptionLabel('Blue Hole', '  ')).toBe('Blue Hole')
    expect(mapDiveSitePickerRow({
      id: 's1',
      name: 'Cozumel Reef',
      countries: { name: 'Mexico' }
    })).toEqual({ id: 's1', label: 'Cozumel Reef (Mexico)' })
  })

  it('drops blank ids and the add-new sentinel before lookup', () => {
    expect(diveSiteIdsForLookup(['', '  ', DIVE_SITE_ADD_NEW_ID, pendingDiveSiteId('request'), 'a', 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('pages alphabetical names and reports another page when the page is full', async () => {
    const rows = Array.from({ length: DIVE_SITE_PICKER_PAGE_SIZE }, (_, i) => ({
      id: `id-${i}`,
      name: `Site ${i}`,
      countries: { name: 'Maldives' }
    }))
    const range = vi.fn().mockResolvedValue({ data: rows, error: null })
    const order = vi.fn().mockReturnValue({ range, ilike: vi.fn() })
    const select = vi.fn().mockReturnValue({ order })
    const from = vi.fn().mockReturnValue({ select })

    const page = await fetchDiveSitePickerPage({ from } as never, '  ', 0)

    expect(from).toHaveBeenCalledWith('dive_sites')
    expect(select).toHaveBeenCalledWith('id, name, countries(name)')
    expect(order).toHaveBeenCalledWith('name')
    expect(range).toHaveBeenCalledWith(0, DIVE_SITE_PICKER_PAGE_SIZE - 1)
    expect(page.hasMore).toBe(true)
    expect(page.options[0]).toEqual({ id: 'id-0', label: 'Site 0 (Maldives)' })
    expect(page.options).toHaveLength(DIVE_SITE_PICKER_PAGE_SIZE)
  })

  it('searches by name and stops when a short page comes back', async () => {
    const range = vi.fn().mockResolvedValue({
      data: [{ id: 'z1', name: 'Zodiac', countries: [{ name: 'Egypt' }] }],
      error: null
    })
    const ilike = vi.fn().mockReturnValue({ range })
    const order = vi.fn().mockReturnValue({ ilike, range })
    const select = vi.fn().mockReturnValue({ order })
    const from = vi.fn().mockReturnValue({ select })

    const page = await fetchDiveSitePickerPage({ from } as never, ' 100% reef ', 50)

    expect(ilike).toHaveBeenCalledWith('name', '%100\\% reef%')
    expect(range).toHaveBeenCalledWith(50, 50 + DIVE_SITE_PICKER_PAGE_SIZE - 1)
    expect(page.hasMore).toBe(false)
    expect(page.options).toEqual([{ id: 'z1', label: 'Zodiac (Egypt)' }])
  })

  it('loads saved site labels by id and skips the add-new sentinel', async () => {
    const lookup = vi.fn().mockResolvedValue({
      data: [{ id: 'saved', name: 'Sipadan', countries: { name: 'Malaysia' } }],
      error: null
    })
    const select = vi.fn().mockReturnValue({ in: lookup })
    const from = vi.fn().mockReturnValue({ select })

    const none = await fetchDiveSitePickerByIds({ from } as never, ['', DIVE_SITE_ADD_NEW_ID])
    expect(none).toEqual([])
    expect(from).not.toHaveBeenCalled()

    const rows = await fetchDiveSitePickerByIds({ from } as never, ['saved', DIVE_SITE_ADD_NEW_ID])
    expect(lookup).toHaveBeenCalledWith('id', ['saved'])
    expect(rows).toEqual([{ id: 'saved', label: 'Sipadan (Malaysia)' }])
  })
})
