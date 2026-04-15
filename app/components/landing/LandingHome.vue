<template>
  <main class="bg-[#101214]">
    <LandingHeader />
    <section id="hero" class="bg-[url(/images/landing/glaucus-bg-hero-waves.jpg)] bg-no-repeat bg-top bg-cover h-[calc(100dvh-80px)] px-20">
      <div class="grid grid-cols-12 gap-4 items-center h-full">
        <div class="col-span-8 col-start-3">
          <div class="flex flex-col gap-2">
            <div class="flex flex-row items-baseline gap-1">
              <h1 class="text-2xl font-medium">Your scuba life, simplified.</h1>
              <p class="text-sm text-zinc-400">An agentic assistant for novice & advance scuba divers.</p>
            </div>
            <div class="w-full">
              <ChatComposer
                v-model="heroQuery"
                @submit="onHeroComposerSubmit"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
    <section id="whatisglaucus" class="bg-[url(/images/landing/glaucus-bg-whatisglaucus.jpg)] bg-no-repeat bg-top bg-cover min-h-[calc(100dvh-80px)] flex flex-col justify-center h-full px-20">
      <div class="grid grid-cols-12 gap-4 items-center h-full">
        <div class="col-span-8 col-start-3">
          <div class="h-full flex items-center">
            <h2 class="text-5xl xl:text-6xl font-light text-pretty leading-[1.1]">Introducing Ada, your AI diving assistant by
              Glaucus, that’s made for divers and dive businesses. The goal is to help divers get information faster,
              book faster, connect with diveshops faster, easier to pay and easier to record your latest dive. Diveshops
              can easily connect with their customers and improve their business processes.</h2>
          </div>
        </div>
      </div>
    </section>
    <section id="features"></section>
    <section id="aboutus"></section>
    <section id="logs"></section>
    <section id="contact"></section>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import ChatComposer from '~/components/chat/ChatComposer.vue'

const heroQuery = ref('')

function onHeroComposerSubmit (q) {
  void navigateTo({ path: '/', query: { chat: '1', q } })
}
</script>
