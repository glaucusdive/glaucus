import type { ProfileCredentialEntry } from '~~/shared/profileCredentialCatalog'

export function useProfileCredentialCatalog () {
  return useAsyncData<ProfileCredentialEntry[]>(
    'profile-credential-catalog',
    () => $fetch('/api/profile-credentials'),
    { default: () => [] }
  )
}