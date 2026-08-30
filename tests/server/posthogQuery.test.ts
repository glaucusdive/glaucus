import { describe, expect, it } from 'vitest'
import {
  buildPostHogVisitorCountsHogql,
  buildWebOverviewQuery,
  mapDashboardRangeToPostHogDateFrom,
  parsePostHogVisitorCountsRow,
  parseWebOverviewVisitors,
  postHogVisitorCountsCacheKey,
  readCachedPostHogVisitorCounts,
  reconcileVisitorCounts,
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
    it('stores and reads cached counts until ttl expires', () => {
      writeCachedPostHogVisitorCounts('7d', {
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      }, 1_000)
      expect(readCachedPostHogVisitorCounts('7d', 1_000)).toEqual({
        totalVisitors: 8,
        newVisitors: 6,
        returningVisitors: 2
      })
      expect(readCachedPostHogVisitorCounts('7d', 301_000)).toBeNull()
      expect(postHogVisitorCountsCacheKey('7d')).toContain('7d')
    })
  })
})
