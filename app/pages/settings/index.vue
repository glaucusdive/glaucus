<template>
  <SettingsPage title="Settings">
    <nav class="flex flex-col divide-y divide-zinc-800">
      <NuxtLink
        to="/settings/account"
        class="flex cursor-pointer items-center justify-between p-4 text-white hover:bg-zinc-800/40 lg:px-24"
      >
        <span class="font-medium">Account security</span>
        <span class="text-zinc-400">→</span>
      </NuxtLink>
      <NuxtLink
        to="/settings/profile"
        class="flex cursor-pointer items-center justify-between p-4 text-white hover:bg-zinc-800/40 lg:px-24"
      >
        <span class="font-medium">Profile Settings</span>
        <span class="text-zinc-400">→</span>
      </NuxtLink>
      <NuxtLink
        to="/settings/defaults"
        class="flex cursor-pointer items-center justify-between p-4 text-white hover:bg-zinc-800/40 lg:px-24"
      >
        <span class="font-medium">Booking defaults</span>
        <span class="text-zinc-400">→</span>
      </NuxtLink>
      <NuxtLink
        to="/settings/drafts"
        class="flex cursor-pointer items-center justify-between p-4 text-white hover:bg-zinc-800/40 lg:px-24"
      >
        <span class="font-medium">My drafts</span>
        <span class="text-zinc-400">→</span>
      </NuxtLink>
    </nav>
  </SettingsPage>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

usePrivatePageSeo()
</script>
