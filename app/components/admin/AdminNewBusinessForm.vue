<template>
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      Basic info
    </h3>
    <div class="flex min-w-0 flex-col gap-4">
      <FormField label="Business name" required :field-id="fieldId('name')">
        <FormInput
          :id="fieldId('name')"
          :model-value="modelValue.business_name"
          type="text"
          required
          @update:model-value="patch({ business_name: $event })"
        />
      </FormField>
      <FormField label="Business type">
        <AdminSelectChip
          :model-value="modelValue.business_type_ids"
          full-width
          :options="businessTypeOptions"
          :multiple="true"
          :allow-add="true"
          singular-label="business type"
          :on-create="(n) => createSimpleLookup('dive_business_types', n)"
          @update:model-value="patch({ business_type_ids: $event })"
          @created="onLookupCreated('diveBusinessTypes', $event)"
        />
      </FormField>
      <FormField label="Website" :field-id="fieldId('website')">
        <FormInput
          :id="fieldId('website')"
          :model-value="modelValue.website_url"
          type="url"
          @update:model-value="patch({ website_url: $event })"
        />
      </FormField>
      <FormField label="Email" :field-id="fieldId('email')">
        <FormInput
          :id="fieldId('email')"
          :model-value="modelValue.email"
          type="email"
          @update:model-value="patch({ email: $event })"
        />
      </FormField>
      <FormField label="Phone" :field-id="fieldId('phone')">
        <FormInput
          :id="fieldId('phone')"
          :model-value="modelValue.phone"
          type="text"
          @update:model-value="patch({ phone: $event })"
        />
      </FormField>
    </div>

    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      Location
    </h3>

    <div class="flex min-w-0 flex-col gap-4">
      <FormField label="Street address" :field-id="fieldId('address')">
        <FormTextarea
          :id="fieldId('address')"
          :model-value="modelValue.street_address"
          :rows="2"
          :resize="false"
          @update:model-value="patch({ street_address: $event })"
        />
      </FormField>
      <FormField label="City" :field-id="fieldId('city')">
        <FormInput
          :id="fieldId('city')"
          :model-value="modelValue.city"
          type="text"
          @update:model-value="patch({ city: $event })"
        />
      </FormField>
      <FormField label="State" :field-id="fieldId('state')">
        <FormInput
          :id="fieldId('state')"
          :model-value="modelValue.state"
          type="text"
          @update:model-value="patch({ state: $event })"
        />
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
          :model-value="modelValue.dive_site_ids"
          full-width
          :options="diveSiteOptions"
          :multiple="true"
          :allow-add="true"
          singular-label="dive site"
          :on-create="(n) => createDiveSite(n, modelValue.country_id)"
          @update:model-value="patch({ dive_site_ids: $event })"
          @created="onLookupCreated('diveSites', $event)"
        />
      </FormField>
      <FormField label="Courses">
        <AdminSelectChip
          :model-value="modelValue.course_ids"
          full-width
          :options="courseOptions"
          :multiple="true"
          :allow-add="false"
          singular-label="course"
          @update:model-value="patch({ course_ids: $event })"
        />
      </FormField>
      <FormField label="Rental gear">
        <AdminSelectChip
          :model-value="modelValue.rental_equipment_ids"
          full-width
          :options="rentalOptions"
          :multiple="true"
          :allow-add="true"
          singular-label="rental"
          :on-create="(n) => createSimpleLookup('rental_equipment', n)"
          @update:model-value="patch({ rental_equipment_ids: $event })"
          @created="onLookupCreated('rentalEquipment', $event)"
        />
      </FormField>
      <FormField label="Gases">
        <AdminSelectChip
          :model-value="modelValue.gas_ids"
          full-width
          :options="gasOptions"
          :multiple="true"
          :allow-add="true"
          singular-label="gas"
          :on-create="(n) => createSimpleLookup('gases', n)"
          @update:model-value="patch({ gas_ids: $event })"
          @created="onLookupCreated('gases', $event)"
        />
      </FormField>
    </div>
  </section>

  <ul v-if="warnings.length > 0" class="mt-4 flex flex-col gap-1 text-xs text-amber-700 dark:text-amber-400">
    <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'
import AdminSelectChip from '~/components/admin/AdminSelectChip.vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  idPrefix: { type: String, default: 'new-business' },
  countryOptions: { type: Array, default: () => [] },
  regionOptions: { type: Array, default: () => [] },
  courseOptions: { type: Array, default: () => [] },
  rentalOptions: { type: Array, default: () => [] },
  gasOptions: { type: Array, default: () => [] },
  diveSiteOptions: { type: Array, default: () => [] },
  businessTypeOptions: { type: Array, default: () => [] },
  createRegion: { type: Function, required: true },
  createSimpleLookup: { type: Function, required: true },
  createDiveSite: { type: Function, required: true },
  onLookupCreated: { type: Function, required: true },
  warnings: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const countryChip = computed(() => (props.modelValue.country_id ? [props.modelValue.country_id] : []))
const regionChip = computed(() => (props.modelValue.region_id ? [props.modelValue.region_id] : []))

function fieldId (suffix) {
  return `${props.idPrefix}-${suffix}`
}

function patch (partial) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function onCountryChip (v) {
  patch({ country_id: Array.isArray(v) && v.length > 0 ? v[0] : null })
}

function onRegionChip (v) {
  patch({ region_id: Array.isArray(v) && v.length > 0 ? v[0] : null })
}
</script>
