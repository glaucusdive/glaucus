<template>
  <BottomSheetDrawer
    :open="open"
    aria-label="Add new business"
    z-index-class="z-[60]"
    @update:open="$emit('update:open', $event)"
  >
    <header class="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <h2 class="text-base font-semibold text-zinc-900 dark:text-white">Add new business</h2>
      <button
        type="button"
        class="rounded-md p-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
        aria-label="Close"
        @click="close"
      >
        <span class="text-lg leading-none">×</span>
      </button>
    </header>
    <div class="px-4 py-3">
      <form id="admin-new-business-form" @submit.prevent="submit">

        <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">

          <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Basic info
          </h3>
          <div class="flex min-w-0 flex-col gap-4">
            <FormField label="Business name" required field-id="new-business-name">
              <FormInput
                id="new-business-name"
                v-model="form.business_name"
                type="text"
               
                required
              />
            </FormField>
            <FormField label="Business type">
              <AdminSelectChip
                v-model="form.business_type_ids"
                full-width
                :options="businessTypeOptions"
                :multiple="true"
                :allow-add="true"
                singular-label="business type"
                :on-create="(n) => createSimpleLookup('dive_business_types', n)"
                @created="onLookupCreated('diveBusinessTypes', $event)"
              />
            </FormField>
            <FormField label="Website" field-id="new-business-website">
              <FormInput
                id="new-business-website"
                v-model="form.website_url"
                type="url"
               
              />
            </FormField>
            <FormField label="Email" field-id="new-business-email">
              <FormInput
                id="new-business-email"
                v-model="form.email"
                type="email"
               
              />
            </FormField>
            <FormField label="Phone" field-id="new-business-phone">
              <FormInput
                id="new-business-phone"
                v-model="form.phone"
                type="text"
               
              />
            </FormField>
          </div>

          <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Location
          </h3>

          <div class="flex min-w-0 flex-col gap-4">
            <FormField label="Street address" field-id="new-business-address">
              <FormTextarea
                id="new-business-address"
                v-model="form.street_address"
                :rows="2"
               
                :resize="false"
              />
            </FormField>
            <FormField label="City" field-id="new-business-city">
              <FormInput id="new-business-city" v-model="form.city" type="text" />
            </FormField>
            <FormField label="State" field-id="new-business-state">
              <FormInput id="new-business-state" v-model="form.state" type="text" />
            </FormField>
            <FormField label="Country">
              <AdminSelectChip
                :model-value="countryChip"
                full-width
                :options="countryOptions"
                :multiple="false"
                :allow-add="false"
                singular-label="country"
                @update:model-value="onCountryChip"
              />
            </FormField>
            <FormField label="Region">
              <AdminSelectChip
                :model-value="regionChip"
                full-width
                :options="regionOptions"
                :multiple="false"
                :allow-add="true"
                singular-label="region"
                :on-create="createRegion"
                @update:model-value="onRegionChip"
                @created="onLookupCreated('regions', $event)"
              />
            </FormField>
          </div>

          <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Shop variables
          </h3>

          <div class="flex min-w-0 flex-col gap-4">
            <FormField label="Dive sites">
              <AdminSelectChip
                v-model="form.dive_site_ids"
                full-width
                :options="diveSiteOptions"
                :multiple="true"
                :allow-add="true"
                singular-label="dive site"
                :on-create="(n) => createDiveSite(n, form.country_id)"
                @created="onLookupCreated('diveSites', $event)"
              />
            </FormField>
            <FormField label="Courses">
              <AdminSelectChip
                v-model="form.course_ids"
                full-width
                :options="courseOptions"
                :multiple="true"
                :allow-add="false"
                singular-label="course"
              />
            </FormField>
            <FormField label="Rental gear">
              <AdminSelectChip
                v-model="form.rental_equipment_ids"
                full-width
                :options="rentalOptions"
                :multiple="true"
                :allow-add="true"
                singular-label="rental"
                :on-create="(n) => createSimpleLookup('rental_equipment', n)"
                @created="onLookupCreated('rentalEquipment', $event)"
              />
            </FormField>
            <FormField label="Gases">
              <AdminSelectChip
                v-model="form.gas_ids"
                full-width
                :options="gasOptions"
                :multiple="true"
                :allow-add="true"
                singular-label="gas"
                :on-create="(n) => createSimpleLookup('gases', n)"
                @created="onLookupCreated('gases', $event)"
              />
            </FormField>
          </div>

        </section>

        <p v-if="submitError" class="mt-4 text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>
      </form>
    </div>
    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" :disabled="submitting" @click="close">
          Cancel
        </Button>
        <Button type="submit" form="admin-new-business-form" variant="primary" :disabled="submitting">
          {{ submitting ? 'Saving…' : 'Create business' }}
        </Button>
      </div>
    </template>
  </BottomSheetDrawer>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import BottomSheetDrawer from '~/components/ui/BottomSheetDrawer.vue'
import AdminSelectChip from '~/components/admin/AdminSelectChip.vue'
import {
  businessTypeNamesFromIds,
  serializeDiveBusinessTypes
} from '~~/shared/diveBusinessTypes'

const props = defineProps({
  open: { type: Boolean, default: false },
  countryOptions: { type: Array, default: () => [] },
  regionOptions: { type: Array, default: () => [] },
  courseOptions: { type: Array, default: () => [] },
  rentalOptions: { type: Array, default: () => [] },
  gasOptions: { type: Array, default: () => [] },
  diveSiteOptions: { type: Array, default: () => [] },
  businessTypeOptions: { type: Array, default: () => [] },
  authHeaders: { type: Function, required: true },
  createRegion: { type: Function, required: true },
  createSimpleLookup: { type: Function, required: true },
  createDiveSite: { type: Function, required: true },
  onLookupCreated: { type: Function, required: true }
})

const emit = defineEmits(['update:open', 'success'])

const submitting = ref(false)
const submitError = ref('')

const emptyForm = () => ({
  business_name: '',
  street_address: '',
  website_url: '',
  city: '',
  state: '',
  phone: '',
  email: '',
  business_type_ids: [],
  country_id: null,
  region_id: null,
  course_ids: [],
  rental_equipment_ids: [],
  gas_ids: [],
  dive_site_ids: []
})

const form = reactive(emptyForm())

const countryChip = computed(() => (form.country_id ? [form.country_id] : []))
const regionChip = computed(() => (form.region_id ? [form.region_id] : []))

function onCountryChip (v) {
  form.country_id = Array.isArray(v) && v.length > 0 ? v[0] : null
}

function onRegionChip (v) {
  form.region_id = Array.isArray(v) && v.length > 0 ? v[0] : null
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      submitError.value = ''
      Object.assign(form, emptyForm())
    }
  }
)

function close () {
  emit('update:open', false)
}

function emptyToNull (v) {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function businessTypeLookupOptions () {
  return props.businessTypeOptions.map((o) => ({
    id: String(o.id),
    name: String(o.name ?? o.label ?? '')
  }))
}

function buildPayload () {
  const typeNames = businessTypeNamesFromIds(form.business_type_ids || [], businessTypeLookupOptions())
  return {
    business_name: String(form.business_name || '').trim(),
    street_address: emptyToNull(form.street_address),
    website_url: emptyToNull(form.website_url),
    city: emptyToNull(form.city),
    state: emptyToNull(form.state),
    phone: emptyToNull(form.phone),
    email: emptyToNull(form.email),
    type: serializeDiveBusinessTypes(typeNames),
    country_id: form.country_id || null,
    region_id: form.region_id || null,
    course_ids: form.course_ids || [],
    rental_equipment_ids: form.rental_equipment_ids || [],
    gas_ids: form.gas_ids || [],
    dive_site_ids: form.dive_site_ids || []
  }
}

async function submit () {
  submitError.value = ''
  if (!String(form.business_name || '').trim()) {
    submitError.value = 'Business name is required'
    return
  }
  submitting.value = true
  try {
    await $fetch('/api/admin/shops', {
      method: 'POST',
      headers: props.authHeaders(),
      body: buildPayload()
    })
    emit('success')
    close()
  } catch (e) {
    const data = e?.data || e?.response?._data
    submitError.value =
      (data && typeof data === 'object' && (data.statusMessage || data.message)) ||
      e?.statusMessage ||
      e?.message ||
      'Could not create business'
  } finally {
    submitting.value = false
  }
}
</script>
