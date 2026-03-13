import { Resend } from 'resend'
import { getShopById } from '../utils/resolveShop'

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
  if (Array.isArray(payload.desiredDiveSites) && payload.desiredDiveSites.length > 0) {
    lines.push('Desired dive sites: ' + payload.desiredDiveSites.join(', '))
    lines.push('')
  }
  lines.push('— Divers —')
  for (let i = 0; i < (payload.divers?.length ?? 0); i++) {
    const d = payload.divers[i]
    const gearList = Array.isArray(d.gear) && d.gear.length > 0
      ? d.gear.map(g => g?.gearType).filter(Boolean).join(', ') || 'None'
      : 'None'
    lines.push(
      `Diver ${i + 1}: ${d.name ?? '—'}`,
      `  Certification: ${d.certificationNumber ?? '—'}, Dives completed: ${d.numberOfDives ?? '—'}`,
      `  Height: ${d.height ?? '—'} ${d.heightUnit ?? ''}, Weight: ${d.weight ?? '—'} ${d.weightUnit ?? ''}`,
      `  Rental gear: ${gearList}`,
      ''
    )
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
