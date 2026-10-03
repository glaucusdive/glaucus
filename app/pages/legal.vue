<template>
  <div class="min-h-dvh bg-black text-white">
    <article class="site-grid py-16 lg:py-24">
      <div class="col-span-12 lg:col-start-4 lg:col-span-6 flex flex-col gap-8">
        <header class="flex flex-col gap-3">
          <h1 class="text-3xl font-semibold text-pretty lg:text-5xl">
            Legal Notice
          </h1>
          <p class="text-sm text-zinc-500">
            Draft for review · Last updated {{ lastUpdated }}
          </p>
          <p class="text-zinc-400 text-pretty">
            This notice describes how Glaucus works today and the limits of our responsibility. It is a
            product draft for review, not a substitute for formal legal counsel.
          </p>
        </header>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Who we are</h2>
          <p class="text-zinc-300 text-pretty">
            Glaucus is a chat-led product that helps divers discover dive shops, resorts, and liveaboards
            and send booking requests to operators. The public site is operated in connection with Made by
            Porter / Glaucus Dive.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">What Glaucus does — and does not do</h2>
          <ul class="list-disc space-y-2 pl-5 text-zinc-300 text-pretty">
            <li>
              We help you search and compose a booking request through chat (Ada) and related forms.
            </li>
            <li>
              When you confirm send, we typically email your request to the selected operator.
            </li>
            <li>
              <span class="text-white font-medium">We do not confirm bookings, collect dive payments, or
              guarantee availability, pricing, safety, or instructor quality.</span>
            </li>
            <li>
              The dive business is responsible for responding, confirming, and fulfilling any trip or
              course according to their own policies.
            </li>
          </ul>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Operator information</h2>
          <p class="text-zinc-300 text-pretty">
            Dive business details shown in the product may be incomplete, outdated, or provided by third
            parties. Discovery is chat-led; shop profile pages are for in-product use and are not intended
            as a public searchable directory. Always verify critical trip details directly with the
            operator before you travel or pay.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Content and guides</h2>
          <p class="text-zinc-300 text-pretty">
            Blog posts and destination guides are informational. Scuba diving involves inherent risk.
            Training, medical fitness, local conditions, and operator procedures govern safe diving—not
            website content. Follow your certification agency standards and local professionals.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">No warranties</h2>
          <p class="text-zinc-300 text-pretty">
            The site and services are provided “as is” and “as available,” without warranties of any kind,
            express or implied, including merchantability, fitness for a particular purpose, and
            non-infringement, to the fullest extent permitted by law.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Limitation of liability</h2>
          <p class="text-zinc-300 text-pretty">
            To the fullest extent permitted by law, Glaucus and its operators are not liable for indirect,
            incidental, special, consequential, or punitive damages, or for losses arising from booking
            requests, operator conduct, dive activities, travel decisions, or reliance on site content.
            Some jurisdictions do not allow certain limitations; in those places, our liability is limited
            to the maximum extent allowed.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Business listings</h2>
          <p class="text-zinc-300 text-pretty">
            Operators who submit listing inquiries via the for-businesses page do not obtain a guaranteed
            listing. We may accept, reject, edit, or remove listings at our discretion.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Governing law</h2>
          <p class="text-zinc-300 text-pretty">
            These terms are governed by the laws of the State of California, USA, without regard to
            conflict-of-law rules, except where mandatory consumer protections in your place of residence
            apply. Venue and dispute details may be updated as the business formalizes entity and counsel
            review.
          </p>
        </section>

        <section class="flex flex-col gap-3">
          <h2 class="text-xl font-semibold">Contact</h2>
          <p class="text-zinc-300 text-pretty">
            Questions about this notice:
            <a
              href="mailto:general@madebyporter.com"
              class="text-white underline underline-offset-4 hover:text-zinc-200"
            >general@madebyporter.com</a>
            or
            <a
              href="mailto:chris@glaucusdive.com"
              class="text-white underline underline-offset-4 hover:text-zinc-200"
            >chris@glaucusdive.com</a>.
          </p>
          <p class="text-zinc-300 text-pretty">
            Privacy practices are described separately in our
            <NuxtLink to="/privacy" class="text-white underline underline-offset-4 hover:text-zinc-200">
              Privacy Policy
            </NuxtLink>.
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
  title: 'Legal Notice',
  description: 'Legal terms for using Glaucus: booking requests, disclaimers, and liability limits.',
  ogTitle: 'Legal Notice',
  ogDescription: 'Legal terms for using Glaucus: booking requests, disclaimers, and liability limits.'
})
</script>
