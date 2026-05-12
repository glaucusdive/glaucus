<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Add new business"
      >
        <div
          class="absolute inset-0 bg-black/50"
          @click="onBackdrop"
        />
        <div
          class="relative z-10 mx-auto flex max-h-[92dvh] min-h-0 w-[99dvw] max-w-lg flex-col overflow-hidden rounded-t-xl border border-b-0 border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          @click.stop
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
          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <form class="flex flex-col gap-3" @submit.prevent="submit">
              <label class="block">
                <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Business name *</span>
                <input
                  v-model="form.business_name"
                  type="text"
                  required
                  class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                >
              </label>
              <label class="block">
                <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Street address</span>
                <textarea
                  v-model="form.street_address"
                  rows="2"
                  class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
                />
              </label>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Website</span>
                  <input v-model="form.website_url" type="url" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">City</span>
                  <input v-model="form.city" type="text" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">State</span>
                  <input v-model="form.state" type="text" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Locale</span>
                  <input v-model="form.locale" type="text" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Phone</span>
                  <input v-model="form.phone" type="text" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
                  <input v-model="form.email" type="email" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Type</span>
                  <input v-model="form.type" type="text" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
                <label class="block">
                  <span class="mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Google rating</span>
                  <input v-model="form.google_rating" type="number" step="any" class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-white">
                </label>
              </div>

              <div class="border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Country</span>
                <AdminSelectChip
                  :model-value="countryChip"
                  :options="countryOptions"
                  :multiple="false"
                  :allow-add="false"
                  singular-label="country"
                  @update:model-value="onCountryChip"
                />
              </div>
              <div>
                <span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Region</span>
                <AdminSelectChip
                  :model-value="regionChip"
                  :options="regionOptions"
                  :multiple="false"
                  :allow-add="true"
                  singular-label="region"
                  :on-create="createRegion"
                  @update:model-value="onRegionChip"
                  @created="onLookupCreated('regions', $event)"
                />
              </div>
              <div>
                <span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Courses</span>
                <AdminSelectChip
                  v-model="form.course_ids"
                  :options="courseOptions"
                  :multiple="true"
                  :allow-add="false"
                  singular-label="course"
                />
              </div>
              <div>
                <span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Rental gear</span>
                <AdminSelectChip
                  v-model="form.rental_equipment_ids"
                  :options="rentalOptions"
                  :multiple="true"
                  :allow-add="true"
                  singular-label="rental"
                  :on-create="(n) => createSimpleLookup('rental_equipment', n)"
                  @created="onLookupCreated('rentalEquipment', $event)"
                />
              </div>
              <div>
                <span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Gases</span>
                <AdminSelectChip
                  v-model="form.gas_ids"
                  :options="gasOptions"
                  :multiple="true"
                  :allow-add="true"
                  singular-label="gas"
                  :on-create="(n) => createSimpleLookup('gases', n)"
                  @created="onLookupCreated('gases', $event)"
                />
              </div>
              <div>
                <span class="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">Dive sites</span>
                <AdminSelectChip
                  v-model="form.dive_site_ids"
                  :options="diveSiteOptions"
                  :multiple="true"
                  :allow-add="true"
                  singular-label="dive site"
                  :on-create="(n) => createDiveSite(n, form.country_id)"
                  @created="onLookupCreated('diveSites', $event)"
                />
              </div>

              <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>

              <div class="flex flex-wrap justify-end gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                <AdminButton type="button" variant="secondary" :disabled="submitting" @click="close">
                  Cancel
                </AdminButton>
                <AdminButton type="submit" variant="primary" :disabled="submitting">
                  {{ submitting ? 'Saving…' : 'Create business' }}
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, watch, computed } from 'vue'
import AdminSelectChip from '~/components/admin/AdminSelectChip.vue'
import AdminButton from '~/components/admin/AdminButton.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  countryOptions: { type: Array, default: () => [] },
  regionOptions: { type: Array, default: () => [] },
  courseOptions: { type: Array, default: () => [] },
  rentalOptions: { type: Array, default: () => [] },
  gasOptions: { type: Array, default: () => [] },
  diveSiteOptions: { type: Array, default: () => [] },
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
  locale: '',
  phone: '',
  email: '',
  type: '',
  google_rating: '',
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

function onBackdrop () {
  close()
}

function emptyToNull (v) {
  if (v == null) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

function numericOrNull (v) {
  if (v === '' || v == null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function buildPayload () {
  return {
    business_name: String(form.business_name || '').trim(),
    street_address: emptyToNull(form.street_address),
    website_url: emptyToNull(form.website_url),
    city: emptyToNull(form.city),
    state: emptyToNull(form.state),
    locale: emptyToNull(form.locale),
    phone: emptyToNull(form.phone),
    email: emptyToNull(form.email),
    type: emptyToNull(form.type),
    country_id: form.country_id || null,
    region_id: form.region_id || null,
    google_rating: numericOrNull(form.google_rating),
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
