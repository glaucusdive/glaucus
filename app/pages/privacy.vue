<template>
  <div class="min-h-dvh bg-black text-white">
    <article class="site-grid py-16 lg:py-24">
      <div class="col-span-12 lg:col-start-4 lg:col-span-6 flex flex-col gap-8">
        <header class="flex flex-col gap-3">
          <h1 class="text-3xl font-semibold text-pretty lg:text-5xl">
            Privacy Policy
          </h1>
          <p class="text-sm text-zinc-500">
            Draft for review · Last updated {{ lastUpdated }}
          </p>
          <p class="text-zinc-400 text-pretty">
            This policy describes how Glaucus (“we”, “us”) collects and uses information when you use
            glaucusdive.com and related services. It is a product draft, not legal advice—please
            review before treating it as final.
          </p>
        </header>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">What we collect</h2>
          <ul class="list-disc space-y-2 pl-5 text-zinc-300 text-pretty">
            <li>
              <span class="text-white font-medium">Account details</span> — if you create an account:
              email, name, and profile fields you choose to save (for example diver defaults used in booking).
            </li>
            <li>
              <span class="text-white font-medium">Booking and contact details</span> — information you
              provide in chat or forms to request a dive with an operator (names, contact info, trip dates,
              certifications, gear preferences, and similar booking fields).
            </li>
            <li>
              <span class="text-white font-medium">Business inquiries</span> — details operators submit on
              the for-businesses page (business profile fields and submitter contact info).
            </li>
            <li>
              <span class="text-white font-medium">Usage data</span> — approximate device/browser info and
              product analytics events (for example page views and feature usage) via analytics tools we
              enable.
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">How we use information</h2>
          <ul class="list-disc space-y-2 pl-5 text-zinc-300 text-pretty">
            <li>To run chat-led dive shop search and booking-request flows.</li>
            <li>
              To email booking requests to the dive business you selected (and related operational
              messages to our team when needed).
            </li>
            <li>To evaluate operator listing inquiries and follow up with businesses.</li>
            <li>To improve the product, fix issues, and understand how features are used.</li>
            <li>To maintain accounts and preferences you save.</li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Booking requests and chat</h2>
          <p class="text-zinc-300 text-pretty">
            When you ask Ada to send a booking request, we share the details you provided with the selected
            dive shop (typically by email). A booking request is a message to the operator—it is
            <span class="text-white font-medium">not</span> a confirmed reservation, payment, or contract
            with Glaucus or the shop unless the shop confirms with you directly.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Service providers</h2>
          <p class="text-zinc-300 text-pretty">
            We use third-party processors to operate the product, which may include:
          </p>
          <ul class="list-disc space-y-2 pl-5 text-zinc-300 text-pretty">
            <li>Supabase — authentication and application database hosting.</li>
            <li>Resend — transactional email delivery (including booking and inquiry emails).</li>
            <li>OpenAI — language-model processing for chat interpretation and replies.</li>
            <li>PostHog and Google Analytics (gtag) — product and site analytics when enabled.</li>
            <li>Hosting providers that serve the website (for example Netlify).</li>
          </ul>
          <p class="text-zinc-300 text-pretty">
            These providers process data under their own terms and security practices. We do not sell your
            personal information.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Retention and security</h2>
          <p class="text-zinc-300 text-pretty">
            We keep information as long as needed to provide the service, meet operational needs, and
            comply with legal obligations. We use standard industry controls appropriate to a small
            consumer product, but no method of transmission or storage is fully secure.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Your choices</h2>
          <ul class="list-disc space-y-2 pl-5 text-zinc-300 text-pretty">
            <li>You can use many discovery features without creating an account.</li>
            <li>You can update or clear profile defaults when signed in.</li>
            <li>
              To request access, correction, or deletion of personal data we hold, email
              <a
                href="mailto:general@madebyporter.com"
                class="text-white underline underline-offset-4 hover:text-zinc-200"
              >general@madebyporter.com</a>.
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Children</h2>
          <p class="text-zinc-300 text-pretty">
            Glaucus is not directed at children under 13. We do not knowingly collect personal information
            from children under 13.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Changes</h2>
          <p class="text-zinc-300 text-pretty">
            We may update this policy as the product evolves. The “Last updated” date above will change
            when we publish substantive revisions.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Contact</h2>
          <p class="text-zinc-300 text-pretty">
            Privacy questions:
            <a
              href="mailto:general@madebyporter.com"
              class="text-white underline underline-offset-4 hover:text-zinc-200"
            >general@madebyporter.com</a>.
          </p>
        </section>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'blog' })

const lastUpdated = 'October 2, 2026'

useSeoMeta({
  title: 'Privacy Policy',
  description: 'How Glaucus collects and uses information for chat search, booking requests, and accounts.',
  ogTitle: 'Privacy Policy',
  ogDescription: 'How Glaucus collects and uses information for chat search, booking requests, and accounts.'
})
</script>
