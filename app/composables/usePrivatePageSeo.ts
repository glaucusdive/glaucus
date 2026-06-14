/** noindex for account, admin, and other non-public routes */
export function usePrivatePageSeo () {
  useSeoMeta({ robots: 'noindex, nofollow' })
}
