import { getQuery } from 'h3'
import { requireAdminUser } from '../../../utils/requireAdminUser'
import type { SubmissionStatus } from '../../../../shared/shopPortalPayload'

const VALID_STATUSES = new Set<SubmissionStatus>(['pending', 'approved', 'denied'])

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const q = getQuery(event)
  const statusParam = String(q.status ?? '').trim() as SubmissionStatus
  const status = VALID_STATUSES.has(statusParam) ? statusParam : null

  let query = client
    .from('shop_update_submissions')
    .select(`
      id,
      diveshop_id,
      status,
      submitter_name,
      submitter_email,
      created_at,
      reviewed_at,
      diveshop:diveshops(business_name)
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query.limit(200)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  type Row = {
    id: string
    diveshop_id: string
    status: SubmissionStatus
    submitter_name: string
    submitter_email: string
    created_at: string
    reviewed_at: string | null
    diveshop: { business_name: string } | { business_name: string }[] | null
  }

  const submissions = ((data || []) as Row[]).map((row) => {
    const shop = Array.isArray(row.diveshop) ? row.diveshop[0] : row.diveshop
    return {
      id: row.id,
      diveshopId: row.diveshop_id,
      businessName: shop?.business_name ?? 'Unknown shop',
      status: row.status,
      submitterName: row.submitter_name,
      submitterEmail: row.submitter_email,
      createdAt: row.created_at,
      reviewedAt: row.reviewed_at
    }
  })

  return { submissions }
})
