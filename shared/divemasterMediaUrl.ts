import { DIVEMASTER_MEDIA_BUCKET, DIVE_SITE_IMAGES_BUCKET } from './divemasterProfile'

export function getDivemasterMediaPublicUrl (supabaseUrl: string, objectPath: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${DIVEMASTER_MEDIA_BUCKET}/${objectPath.replace(/^\//, '')}`
}

export function getDiveSiteImagePublicUrl (supabaseUrl: string, objectPath: string): string {
  const base = supabaseUrl.replace(/\/$/, '')
  return `${base}/storage/v1/object/public/${DIVE_SITE_IMAGES_BUCKET}/${objectPath.replace(/^\//, '')}`
}
