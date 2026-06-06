import { requireAdminUser } from '../../../../utils/requireAdminUser'

export default defineEventHandler(async (event) => {
  const { user, client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const body = await readBody(event).catch(() => ({} as Record<string, unknown>))
  const reviewNotes =
    typeof body.reviewNotes === 'string' && body.reviewNotes.trim()
      ? body.reviewNotes.trim()
      : null

  const { data: row, error: fetchError } = await client
    .from('shop_update_submissions')
    .select('id, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    throw createError({ statusCode: 500, statusMessage: fetchError.message })
  }
  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Submission not found' })
  }
  if (row.status !== 'pending') {
    throw createError({ statusCode: 400, statusMessage: 'Submission is not pending' })
  }

  const now = new Date().toISOString()
  const { error } = await client
    .from('shop_update_submissions')
    .update({
      status: 'denied',
      reviewed_at: now,
      reviewed_by: user.id,
      review_notes: reviewNotes
    })
    .eq('id', id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { id, status: 'denied' as const }
})
