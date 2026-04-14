<template>
  <div class="flex min-h-dvh flex-col items-center justify-center gap-8 bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
    <div class="flex flex-col items-center gap-4 text-center">
      <img src="/images/glaucus-logo-emblem.svg" alt="" class="h-16 w-16 -rotate-45" />
      <h1 class="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">
        Glaucus
      </h1>
      <p class="max-w-md text-zinc-600 dark:text-zinc-400">
        Find dive shops with AI-powered search. Sign in to use the app.
      </p>
    </div>
    <button
      type="button"
      class="rounded-md bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      @click="goToApp"
    >
      Go to app
    </button>
  </div>
</template>

<script setup>
function goToApp () {
  void navigateTo('/auth')
}
</script>
