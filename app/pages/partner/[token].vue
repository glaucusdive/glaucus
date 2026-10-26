<template>
  <main class="min-h-dvh bg-[#101214] text-white">
    <header v-if="!loading" class="border-b border-zinc-800 px-4 py-4 sm:px-8">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <NuxtLink to="/" class="shrink-0">
          <Logo />
        </NuxtLink>
        <p v-if="businessName" class="truncate text-sm text-zinc-400">{{ businessName }}</p>
      </div>
    </header>

    <div v-if="!loading" class="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <section v-if="!loadError && publicProfile" class="mb-8 rounded-lg border border-zinc-700 p-4">
        <h2 class="font-medium">Promote your shop</h2>
        <p class="mt-1 text-sm text-zinc-400">Preview, download, or print a QR flyer for your public profile. Flyers use your published details, not unsaved or pending updates.</p>
        <Button type="button" variant="secondary" class="mt-3" @click="shareProfileOpen = true">QR flyer and sharing</Button>
      </section>
      <div v-if="loadError" class="py-16 text-center">
        <h1 class="text-lg font-medium text-white">Link not found</h1>
        <p class="mt-2 text-sm text-zinc-400">{{ loadError }}</p>
      </div>
      <div v-else-if="submitted" class="py-16 text-center">
        <h1 class="text-xl font-medium">Thanks — we received your updates</h1>
        <p class="mt-2 text-sm text-zinc-400">Our team will review your changes and follow up if needed.</p>
      </div>
      <div v-else>
        <div class="mb-8">
          <h1 class="text-xl font-medium">Review your listing</h1>
          <p class="mt-1 text-sm text-zinc-400">
            Update your shop details below. Changes are reviewed before going live on Glaucus.
          </p>
        </div>

        <form class="space-y-8" @submit.prevent="submit">
          <ShopDataForm
            v-model="form"
            :lookups="lookups"
            portal-mode
            :pending-lookups="pendingLookups"
          />

          <FormFieldset label="Your contact info" wide-gap>
            <div class="flex flex-col gap-4">
              <FormField label="Your name" required field-id="submitter-name">
                <FormInput
                  id="submitter-name"
                  v-model="submitterName"
                  type="text"
                  required
                />
              </FormField>
              <FormField label="Your email" required field-id="submitter-email">
                <FormInput
                  id="submitter-email"
                  v-model="submitterEmail"
                  type="email"
                  required
                />
              </FormField>
              <FormField label="Notes (optional)" field-id="submitter-notes">
                <FormTextarea
                  id="submitter-notes"
                  v-model="submitterNotes"
                  :rows="3"
                  :resize="false"
                  placeholder="Anything else we should know?"
                />
              </FormField>
            </div>
          </FormFieldset>

          <p v-if="submitError" class="text-sm text-red-400">{{ submitError }}</p>

          <div class="flex justify-end">
            <Button type="submit" variant="primary" :disabled="submitting">
              {{ submitting ? 'Submitting…' : 'Submit updates' }}
            </Button>
          </div>
        </form>
      </div>
    </div>
    <ClientOnly>
      <ProfileShareDialog
        v-if="!loading && !loadError && publicProfile"
        v-model:open="shareProfileOpen"
        can-use-flyer
        profile-type="shop"
        :profile-name="publicProfile.name"
        :url="publicProfileUrl"
        :file-name="publicProfile.slugOrId"
        :details="{ subtitle: publicProfile.subtitle, contacts: publicProfile.contacts }"
      />
    </ClientOnly>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import ShopDataForm from '~/components/shop/ShopDataForm.vue'
import ProfileShareDialog from '~/components/ProfileShareDialog.vue'
import type { ShopLookups } from '~~/shared/shopPortalPayload'
import type { PendingLookups, ShopFormSnapshot, ShopPortalPublicProfile } from '~~/shared/shopPortalPayload'
import { buildShopProfileUrl } from '~~/shared/shopProfileUrl'
import { buildPortalSubmissionPayload } from '~/utils/shopPortalForm'
import { shopSeoTitle } from '~/utils/shopSeo'

definePageMeta({ layout: false })

useSeoMeta({ robots: 'noindex, nofollow' })

const route = useRoute()
const token = computed(() => String(route.params.token ?? ''))

const loading = ref(true)
const loadError = ref('')
const submitted = ref(false)
const submitting = ref(false)
const submitError = ref('')
const businessName = ref('')
const publicProfile = ref<ShopPortalPublicProfile | null>(null)
const shareProfileOpen = ref(false)
const publicProfileUrl = computed(() => publicProfile.value
  ? buildShopProfileUrl(import.meta.client ? window.location.origin : 'https://glaucusdive.com', publicProfile.value.slugOrId)
  : '')

const form = ref<ShopFormSnapshot>({
  business_name: '',
  street_address: null,
  website_url: null,
  city: null,
  state: null,
  phone: null,
  email: null,
  type: null,
  country_id: null,
  region_id: null,
  business_type_ids: [],
  course_ids: [],
  rental_equipment_ids: [],
  gas_ids: [],
  dive_site_ids: []
})

const lookups = ref<ShopLookups>({
  countries: [],
  regions: [],
  courses: [],
  rentalEquipment: [],
  gases: [],
  diveSites: [],
  diveBusinessTypes: []
})

const pendingLookups = reactive<PendingLookups>({})
const submitterName = ref('')
const submitterEmail = ref('')
const submitterNotes = ref('')

const pageTitle = computed(() => {
  if (submitted.value) return 'Thanks — listing updated'
  if (loadError.value) return 'Link not found'
  if (loading.value) return 'Review your listing'
  const countryName = form.value.country_id
    ? lookups.value.countries.find((c) => c.id === form.value.country_id)?.name ?? null
    : null
  return shopSeoTitle({
    business_name: form.value.business_name || businessName.value,
    city: form.value.city,
    state: form.value.state,
    country: countryName ? { name: countryName } : null
  })
})

useHead(computed(() => ({ title: pageTitle.value })))

watch(token, async (currentToken, _previousToken, onCleanup) => {
  if (!import.meta.client) return
  let cancelled = false
  onCleanup(() => { cancelled = true })
  loading.value = true
  loadError.value = ''
  publicProfile.value = null
  shareProfileOpen.value = false
  businessName.value = ''
  submitted.value = false
  submitting.value = false
  submitError.value = ''
  submitterName.value = ''
  submitterEmail.value = ''
  submitterNotes.value = ''
  for (const key of Object.keys(pendingLookups) as (keyof PendingLookups)[]) delete pendingLookups[key]
  try {
    const res = await $fetch<{
      businessName: string
      snapshot: ShopFormSnapshot
      lookups: ShopLookups
      publicProfile: ShopPortalPublicProfile
    }>(`/api/shop-portal/${encodeURIComponent(currentToken)}`)
    if (cancelled) return
    businessName.value = res.businessName
    form.value = { ...res.snapshot }
    lookups.value = res.lookups
    publicProfile.value = res.publicProfile
  } catch (e: unknown) {
    if (cancelled) return
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    loadError.value =
      err?.data?.statusMessage || err?.statusMessage || err?.message || 'This partner link is invalid or expired.'
  } finally {
    if (!cancelled) loading.value = false
  }
}, { immediate: true })

async function submit () {
  const currentToken = token.value
  submitError.value = ''
  if (!String(form.value.business_name || '').trim()) {
    submitError.value = 'Business name is required'
    return
  }
  if (!submitterName.value.trim()) {
    submitError.value = 'Your name is required'
    return
  }
  if (!submitterEmail.value.trim()) {
    submitError.value = 'Your email is required'
    return
  }
  submitting.value = true
  try {
    const proposedPayload = buildPortalSubmissionPayload(form.value, lookups.value, pendingLookups)
    await $fetch(`/api/shop-portal/${encodeURIComponent(currentToken)}/submit`, {
      method: 'POST',
      body: {
        submitterName: submitterName.value.trim(),
        submitterEmail: submitterEmail.value.trim(),
        submitterNotes: submitterNotes.value.trim() || undefined,
        proposedPayload
      }
    })
    if (currentToken === token.value) submitted.value = true
  } catch (e: unknown) {
    if (currentToken !== token.value) return
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    submitError.value =
      err?.data?.statusMessage || err?.statusMessage || err?.message || 'Could not submit updates'
  } finally {
    if (currentToken === token.value) submitting.value = false
  }
}
</script>
