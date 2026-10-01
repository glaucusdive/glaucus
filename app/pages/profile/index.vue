<template>
  <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4">
    <p class="text-sm text-zinc-500 dark:text-zinc-400">Redirecting…</p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

usePrivatePageSeo()

const { user } = useAuth()
const { client } = useSupabase()

onMounted(async () => {
  const id = user.value?.id
  if (!id) {
    await navigateTo('/settings/profile')
    return
  }

  const { data: profile } = await client
    .from('profiles')
    .select('username')
    .eq('id', id)
    .maybeSingle()

  const username = profile?.username as string | null | undefined
  if (username) {
    const { data: dm } = await client
      .from('divemaster_profiles')
      .select('status')
      .eq('user_id', id)
      .maybeSingle()

    if (dm?.status === 'published') {
      await navigateTo(`/divemaster/${username}`)
      return
    }
  }

  // No public profile yet — send them to edit/apply
  await navigateTo('/settings/profile')
})
</script>
