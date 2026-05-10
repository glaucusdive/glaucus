<template>
    <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4">
      <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-6">Profile</h1>

      <nav class="flex flex-col gap-2 max-w-md">
        <NuxtLink to="/profile/defaults"
          class="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600  cursor-pointer group">
          <span class="font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200">Booking defaults</span>
          <span class="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">→</span>
        </NuxtLink>
        <NuxtLink to="/profile/drafts"
          class="flex items-center justify-between p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600  cursor-pointer group">
          <span class="font-medium text-zinc-900 dark:text-white group-hover:text-zinc-700 dark:group-hover:text-zinc-200">My drafts</span>
          <span class="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300">→</span>
        </NuxtLink>
      </nav>
    </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })
</script>
