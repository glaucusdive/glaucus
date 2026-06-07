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
  </main>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import ShopDataForm from '~/components/shop/ShopDataForm.vue'
import type { ShopLookups } from '~~/shared/shopPortalPayload'
import type { PendingLookups, ShopFormSnapshot } from '~~/shared/shopPortalPayload'
import { buildPortalSubmissionPayload } from '~/utils/shopPortalForm'

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

onMounted(async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await $fetch<{
      businessName: string
      snapshot: ShopFormSnapshot
      lookups: ShopLookups
    }>(`/api/shop-portal/${encodeURIComponent(token.value)}`)
    businessName.value = res.businessName
    form.value = { ...res.snapshot }
    lookups.value = res.lookups
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    loadError.value =
      err?.data?.statusMessage || err?.statusMessage || err?.message || 'This partner link is invalid or expired.'
  } finally {
    loading.value = false
  }
})

async function submit () {
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
    await $fetch(`/api/shop-portal/${encodeURIComponent(token.value)}/submit`, {
      method: 'POST',
      body: {
        submitterName: submitterName.value.trim(),
        submitterEmail: submitterEmail.value.trim(),
        submitterNotes: submitterNotes.value.trim() || undefined,
        proposedPayload
      }
    })
    submitted.value = true
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    submitError.value =
      err?.data?.statusMessage || err?.statusMessage || err?.message || 'Could not submit updates'
  } finally {
    submitting.value = false
  }
}
</script>
