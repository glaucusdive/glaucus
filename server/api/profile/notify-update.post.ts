import { getAuthUser } from '../../utils/getAuthUser'
import { sendProfileUpdateNotification } from '../../utils/sendProfileUpdateNotification'

type NotifyBody = {
  displayName?: string | null
  email?: string | null
  diverCount?: number
  source?: string
}

export default defineEventHandler(async (event) => {
  const user = await getAuthUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Sign in required' })
  }

  const body = (await readBody(event)) as NotifyBody | null
  const diverCount = typeof body?.diverCount === 'number' && body.diverCount >= 0
    ? Math.floor(body.diverCount)
    : 0

  await sendProfileUpdateNotification({
    userId: user.id,
    authEmail: user.email,
    displayName: body?.displayName ?? null,
    contactEmail: body?.email ?? null,
    diverCount,
    source: body?.source ?? 'defaults_page'
  })

  return { ok: true }
})
