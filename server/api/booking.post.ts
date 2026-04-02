import { Resend } from 'resend'
import type { H3Event } from 'h3'
import { getShopById } from '../utils/resolveShop'
import { createSupabaseClientForUser, getAuthUser, getBearerToken } from '../utils/getAuthUser'

interface DiverPayload {
  name?: string
  certificationNumber?: string
  numberOfDives?: string | number
  height?: string
  heightUnit?: string
  weight?: string
  weightUnit?: string
  gear?: Array<{ gearType?: string }>
}

interface BookingBody {
  shopId: string
  name: string
  email: string
  startDate: string
  endDate: string
  desiredCourses?: string[]
  desiredDiveSites?: string[]
  divers: DiverPayload[]
}

function buildDiveshopEmailBody (payload: BookingBody, shopName: string): string {
  const lines: string[] = [
    `A dive trip booking request has been submitted via Glaucus.`,
    '',
    '— Trip —',
    `Dates: ${payload.startDate} to ${payload.endDate}`,
    `Number of divers: ${payload.divers?.length ?? 0}`,
    ''
  ]
  if (Array.isArray(payload.desiredCourses) && payload.desiredCourses.length > 0) {
    for (const c of payload.desiredCourses) {
      lines.push(`Course interest: ${c}`)
    }
    lines.push('')
  }
  if (Array.isArray(payload.desiredDiveSites) && payload.desiredDiveSites.length > 0) {
    for (const site of payload.desiredDiveSites) {
      lines.push(`Desired dive site: ${site}`)
    }
    lines.push('')
  }
  lines.push('— Divers —')
  for (let i = 0; i < (payload.divers?.length ?? 0); i++) {
    const d = payload.divers[i]
    const gearItems = Array.isArray(d.gear) && d.gear.length > 0
      ? d.gear.map(g => g?.gearType).filter(Boolean) as string[]
      : []
    lines.push(
      `Diver ${i + 1}: ${d.name ?? '—'}`,
      `  Certification: ${d.certificationNumber ?? '—'}`,
      `  Dives completed: ${d.numberOfDives ?? '—'}`,
      `  Height: ${d.height ?? '—'} ${(d.heightUnit ?? '').trim()}`.trim(),
      `  Weight: ${d.weight ?? '—'} ${(d.weightUnit ?? '').trim()}`.trim()
    )
    if (gearItems.length > 0) {
      for (const item of gearItems) {
        lines.push(`  Rental gear: ${item}`)
      }
    } else {
      lines.push('  Rental gear: None')
    }
    lines.push('')
  }
  lines.push('— Guest contact —', `Name: ${payload.name}`, `Email: ${payload.email}`)
  return lines.join('\n')
}

function buildUserConfirmationBody (shopName: string, userEmail: string, shopEmail: string): string {
  return [
    `We've sent your booking request to ${shopName}.`,
    '',
    `They'll contact you at ${userEmail}.`,
    '',
    "If you don't hear back in a few days, reach out to them directly at " + shopEmail + '.'
  ].join('\n')
}

async function logSubmissionIfAuthenticated (
  event: H3Event,
  payload: BookingBody
) {
  const user = await getAuthUser(event)
  if (!user) return

  const token = getBearerToken(event)
  if (!token) return

  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  const { error } = await client.from('booking_submissions').insert({
    user_id: user.id,
    shop_id: payload.shopId,
    payload,
    sent_at: new Date().toISOString()
  })

  if (error) {
    console.error('Failed to log booking submission:', error.message)
  }
}

async function clearMatchingDraftIfAuthenticated (
  event: H3Event,
  payload: BookingBody
) {
  const user = await getAuthUser(event)
  if (!user) return

  const token = getBearerToken(event)
  if (!token) return

  const config = useRuntimeConfig()
  const client = createSupabaseClientForUser(
    config.public.supabaseUrl,
    config.public.supabaseKey,
    token
  )

  const { error } = await client
    .from('booking_drafts')
    .delete()
    .eq('user_id', user.id)
    .eq('shop_id', payload.shopId)

  if (error) {
    console.error('Failed to clear matching booking draft after send:', error.message)
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<BookingBody>(event)

  const shopId = body?.shopId && String(body.shopId).trim()
  const name = body?.name && String(body.name).trim()
  const email = body?.email && String(body.email).trim()
  const startDate = body?.startDate && String(body.startDate).trim()
  const endDate = body?.endDate && String(body.endDate).trim()
  const divers = Array.isArray(body?.divers) ? body.divers : []

  if (!shopId) {
    throw createError({ statusCode: 400, statusMessage: 'shopId is required' })
  }
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'name is required' })
  }
  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'email is required' })
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }
  if (!startDate) {
    throw createError({ statusCode: 400, statusMessage: 'startDate is required' })
  }
  if (!endDate) {
    throw createError({ statusCode: 400, statusMessage: 'endDate is required' })
  }
  if (divers.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'At least one diver is required' })
  }

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseKey = config.public.supabaseKey
  const resendApiKey = config.resendApiKey
  const fromEmail = config.bookingFromEmail

  if (!resendApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Email is not configured (RESEND_API_KEY missing)' })
  }

  const shop = await getShopById(supabaseUrl, supabaseKey, shopId)
  if (!shop) {
    throw createError({ statusCode: 404, statusMessage: 'Dive shop not found' })
  }
  if (!shop.email || !String(shop.email).trim()) {
    throw createError({ statusCode: 400, statusMessage: 'This shop has no email on file.' })
  }

  const resend = new Resend(resendApiKey)
  const shopName = shop.business_name || 'Dive shop'
  const payload: BookingBody = {
    shopId,
    name,
    email,
    startDate,
    endDate,
    desiredCourses: Array.isArray(body.desiredCourses) ? body.desiredCourses : [],
    desiredDiveSites: Array.isArray(body.desiredDiveSites) ? body.desiredDiveSites : [],
    divers
  }

  const diveshopSubject = `Dive trip booking request from ${name} via Glaucus`
  const diveshopText = buildDiveshopEmailBody(payload, shopName)

  const { data: toShop, error: errShop } = await resend.emails.send({
    from: fromEmail,
    to: [shop.email],
    subject: diveshopSubject,
    text: diveshopText
  })

  if (errShop) {
    const msg = errShop.message || 'Failed to send email to dive shop'
    throw createError({
      statusCode: 502,
      statusMessage: msg,
      data: { message: msg, resendError: errShop.message }
    })
  }

  await logSubmissionIfAuthenticated(event, payload)
  await clearMatchingDraftIfAuthenticated(event, payload)

  const userSubject = `We've sent your booking request to ${shopName}`
  const userText = buildUserConfirmationBody(shopName, email, shop.email)
  const { error: errUser } = await resend.emails.send({
    from: fromEmail,
    to: [email],
    subject: userSubject,
    text: userText
  })

  if (errUser) {
    return {
      sent: true,
      message: 'Your request was sent to the dive shop. Confirmation email could not be sent; please check your email address.',
      emailId: toShop?.id
    }
  }

  return {
    sent: true,
    message: 'Booking request sent. Check your email for confirmation.'
  }
})
