<template>
  <main class="bg-zinc-950">
    <header class="lg:px-20 lg:py-5">
      <div class="grid lg:grid-cols-12 gap-4">
        <div class="lg:col-span-3">
          <NuxtLink to="/" class="w-[120px] h-auto flex flex-row items-center justify-center gap-2">
            <img src="/images/glaucus-logo-emblem.svg" alt="Logo" class="w-[40px] h-full -rotate-45" />
            <Logo class="*:fill-black *:dark:fill-white" />
          </NuxtLink>
        </div>
        <div class="lg:col-span-6">
          <!--nav-->
        </div>
        <div class="lg:col-span-3">
          <div class="flex lg:items-center lg:justify-end">
            <button type="button"
              class="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 uppercase"
              @click="goToApp">
              Open Chat
            </button>
          </div>
        </div>
      </div>
    </header>
    <section id="whatisglaucus"></section>
    <section id="features"></section>
    <section id="aboutus"></section>
    <section id="logs"></section>
    <section id="contact"></section>
    
  </main>
</template>

<script setup>
function goToApp () {
  void navigateTo('/auth')
}
</script>
