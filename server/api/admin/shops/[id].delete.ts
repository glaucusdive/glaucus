import { requireAdminUser } from '../../../utils/requireAdminUser'

export default defineEventHandler(async (event) => {
  const { client } = await requireAdminUser(event)
  const id = event.context.params?.id
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'id is required' })
  }

  const { error } = await client.from('diveshops').delete().eq('id', id)
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { id, deleted: true }
})
