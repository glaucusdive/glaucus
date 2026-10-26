export type ProfileFlyerDetails = {
  subtitle?: string
  description?: string
  contacts?: string[]
}

export function wrapFlyerText (
  text: string,
  maxWidth: number,
  maxLines: number,
  measure: (text: string) => number
): string[] {
  const lines: string[] = []
  let line = ''
  for (const char of text.replace(/\s+/g, ' ').trim()) {
    if (line && measure(line + char) > maxWidth) {
      const breakAt = line.lastIndexOf(' ')
      lines.push((breakAt > 0 ? line.slice(0, breakAt) : line).trim())
      line = breakAt > 0 ? line.slice(breakAt + 1) : ''
    }
    line += char
  }
  if (line) lines.push(line.trim())
  if (lines.length <= maxLines) return lines
  const result = lines.slice(0, maxLines)
  let last = result[maxLines - 1] || ''
  while (last && measure(`${last}…`) > maxWidth) last = Array.from(last).slice(0, -1).join('')
  result[maxLines - 1] = `${last.trim()}…`
  return result
}

export async function createProfileFlyer (
  name: string,
  url: string,
  details: ProfileFlyerDetails,
  qrSvg: string
): Promise<string> {
  await document.fonts.ready
  const qr = new Image()
  qr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`
  await qr.decode()
  const canvas = document.createElement('canvas')
  canvas.width = 1240
  canvas.height = 1754
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot generate the flyer.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'center'
  const text = (value: string, y: number, size: number, maxLines: number, color = '#18181b', bold = false) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, sans-serif`
    ctx.fillStyle = color
    const lines = wrapFlyerText(value, 1040, maxLines, line => ctx.measureText(line).width)
    lines.forEach((line, index) => ctx.fillText(line, 620, y + index * size * 1.4))
    return lines.length ? y + (lines.length - 1) * size * 1.4 : y - size
  }
  text('Glaucus', 130, 54, 1, '#0369a1', true)
  text('Your scuba life, simplified', 180, 25, 1, '#52525b')
  let bottom = text(name, 290, 48, 3, '#18181b', true)
  if (details.subtitle?.trim()) bottom = text(details.subtitle, bottom + 54, 27, 2, '#52525b')
  if (details.description?.trim()) bottom = text(details.description, bottom + 52, 26, 4)
  const qrTop = bottom + 36
  ctx.drawImage(qr, 340, qrTop, 560, 560)
  bottom = text('Scan to view this profile and read reviews', qrTop + 600, 29, 1, '#18181b', true)
  let urlSize = 24
  while (urlSize > 10) {
    ctx.font = `${urlSize}px Arial, sans-serif`
    if (wrapFlyerText(url, 1040, Number.MAX_SAFE_INTEGER, line => ctx.measureText(line).width).length <= 3) break
    urlSize--
  }
  bottom = text(url, bottom + 52, urlSize, 3, '#0369a1')
  text((details.contacts || []).filter(Boolean).join('  |  '), bottom + 54, 22, 3, '#52525b')
  return canvas.toDataURL('image/png')
}
