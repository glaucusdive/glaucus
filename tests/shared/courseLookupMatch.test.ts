import { describe, expect, it } from 'vitest'
import { certificationNameFromCourseOption, courseOptionsForMatching } from '../../shared/courseLookupMatch'
import { resolveCsvShopRowToForm } from '../../shared/resolveCsvShopRowToForm'
import { parseScubaMasterShopCsv } from '../../shared/parseScubaMasterShopCsv'

describe('certificationNameFromCourseOption', () => {
  it('parses label with agency suffix', () => {
    expect(certificationNameFromCourseOption({ label: 'Open Water Diver (PADI)' })).toBe('Open Water Diver')
  })

  it('prefers explicit certification_name', () => {
    expect(
      certificationNameFromCourseOption({
        certification_name: 'Advanced Adventurer',
        label: 'Advanced Adventurer (SSI)'
      })
    ).toBe('Advanced Adventurer')
  })
})

describe('courseOptionsForMatching with admin label shape', () => {
  it('matches CSV course names against label-only options', () => {
    const csv = `Dive Shop,Address,Website,City,State,Country,Region,Phone,Email,Courses,Rental,Gases,Type,Sites,,
Shop,,,,,,,,,"Open Water Diver, Advanced Adventurer",,,,,`
    const [row] = parseScubaMasterShopCsv(csv)
    const { form, warnings } = resolveCsvShopRowToForm(row, {
      countries: [],
      regions: [],
      courses: courseOptionsForMatching([
        { id: 'c1', label: 'Open Water Diver (PADI)' },
        { id: 'c2', label: 'Open Water Diver (SSI)' },
        { id: 'c3', label: 'Advanced Adventurer (SSI)' }
      ]),
      rentalEquipment: [],
      gases: [],
      diveSites: [],
      diveBusinessTypes: []
    })
    expect(form.course_ids).toEqual(['c1', 'c3'])
    expect(warnings.filter((w) => w.startsWith('Unknown course'))).toHaveLength(0)
  })
})
