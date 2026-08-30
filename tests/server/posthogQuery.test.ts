import { describe, expect, it } from 'vitest'
import {
  buildPostHogVisitorCountsHogql,
  buildWebOverviewQuery,
  formatPostHogDateTime,
  mapDashboardRangeToPostHogDateFrom,
  parsePostHogVisitorCountsRow,
  parseWebOverviewVisitors,
  postHogVisitorCountsCacheKey,
  readCachedPostHogVisitorCounts,
  readFreshCachedPostHogVisitorCounts,
  readStaleCachedPostHogVisitorCounts,
  reconcileVisitorCounts,
  resolvePostHogPresetDateBounds,
  writeCachedPostHogVisitorCounts
} from '../../server/utils/posthogQuery'

describe('posthogQuery', () => {
  describe('mapDashboardRangeToPostHogDateFrom', () => {
    it('maps admin ranges to PostHog web analytics presets', () => {
      expect(mapDashboardRangeToPostHogDateFrom('7d')).toBe('-7d')
      expect(mapDashboardRangeToPostHogDateFrom('14d')).toBe('-14d')
      expect(mapDashboardRangeToPostHogDateFrom('30d')).toBe('-30d')
      expect(mapDashboardRangeToPostHogDateFrom('all')).toBe('2025-01-01')
    })
  })

  describe('resolvePostHogPresetDateBounds', () => {
    it('uses UTC day bounds for preset ranges', () => {
      const now = new Date('2026-08-30T15:00:00.000Z')
      expect(resolvePostHogPresetDateBounds('7d', now)).toEqual({
        dateFrom: '2026-08-23 00:00:00',
        dateTo: '2026-08-30 23:59:59'
      })
    })

    it('formats PostHog timestamps with zero padding', () => {
      expect(formatPostHogDateTime(new Date('2026-01-05T03:04:05.000Z'))).toBe('2026-01-05 03:04:05')
    })
  })

  describe('buildWebOverviewQuery', () => {
    it('matches PostHog Web Analytics UI defaults', () => {
      expect(buildWebOverviewQuery('7d')).toEqual({
        kind: 'WebOverviewQuery',
        dateRange: { date_from: '-7d', date_to: null },
        properties: [],
        filterTestAccounts: false
      })
    })
  })

  describe('buildPostHogVisitorCountsHogql', () => {
    it('matches web analytics filters on person_id pageviews', () => {
      const from = '2026-08-23 00:00:00'
      const to = '2026-08-30 23:59:59'
      const hogql = buildPostHogVisitorCountsHogql(from, to)

      expect(hogql).toContain('$pageview')
      expect(hogql).toContain('$screen')
      expect(hogql).toContain('isNotNull(events.$session_id)')
      expect(hogql).toContain('isNotNull(events.person_id)')
      expect(hogql).toContain('countDistinct(visitor_id) FROM active_in_range')
      expect(hogql).toContain(`toDateTime('${from}')`)
      expect(hogql).toContain(`toDateTime('${to}')`)
    })
  })

  describe('parsePostHogVisitorCountsRow', () => {
    it('parses total, new, and returning columns', () => {
      expect(parsePostHogVisitorCountsRow([8, 6, 2])).toEqual({
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      })
    })
  })

  describe('parseWebOverviewVisitors', () => {
    it('reads the visitors tile from WebOverviewQuery results', () => {
      expect(parseWebOverviewVisitors({
        results: [
          { key: 'views', value: 12 },
          { key: 'visitors', value: 8 }
        ]
      })).toBe(8)
    })
  })

  describe('reconcileVisitorCounts', () => {
    it('accepts hogql counts when they match web overview total', () => {
      expect(reconcileVisitorCounts(
        { totalVisitors: 8, newVisitors: 6, returningVisitors: 2 },
        8
      )).toEqual({
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      })
    })

    it('rejects mismatched totals', () => {
      expect(reconcileVisitorCounts(
        { totalVisitors: 3, newVisitors: 1, returningVisitors: 2 },
        8
      )).toBeNull()
    })
  })

  describe('visitor counts cache', () => {
    it('serves fresh cache for five minutes and stale cache for thirty minutes', () => {
      writeCachedPostHogVisitorCounts('7d', {
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      }, 1_000)

      expect(readFreshCachedPostHogVisitorCounts('7d', 1_000)).toEqual({
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      })
      expect(readCachedPostHogVisitorCounts('7d', 1_000)).toEqual({
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      })

      expect(readFreshCachedPostHogVisitorCounts('7d', 301_000)).toBeNull()
      expect(readStaleCachedPostHogVisitorCounts('7d', 301_000)).toEqual({
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      })

      expect(readStaleCachedPostHogVisitorCounts('7d', 1_801_000)).toBeNull()
      expect(postHogVisitorCountsCacheKey('7d')).toContain('7d')
    })
  })
})
