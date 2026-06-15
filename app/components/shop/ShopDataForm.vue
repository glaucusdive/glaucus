<script setup lang="ts">
import { computed } from 'vue'
import {
  formatDiveBusinessTypeLabel
} from '~~/shared/diveBusinessTypes'
import {
  createTempLookupId,
  type PendingLookups,
  type ShopFormSnapshot
} from '~~/shared/shopPortalPayload'

export type ShopLookups = import('~~/shared/shopPortalPayload').ShopLookups

const props = withDefaults(defineProps<{
  modelValue: ShopFormSnapshot
  lookups: ShopLookups
  disabled?: boolean
  portalMode?: boolean
  pendingLookups?: PendingLookups
  highlightFields?: string[]
  emailLabel?: string
  phoneLabel?: string
  adminCreateHandlers?: {
    createRegion: (name: string) => Promise<{ id: string; label: string }>
    createSimpleLookup: (kind: string, name: string) => Promise<{ id: string; label: string }>
    createDiveSite: (name: string, countryId: string | null) => Promise<{ id: string; label: string }>
  }
}>(), {
  disabled: false,
  portalMode: false,
  pendingLookups: () => ({}),
  highlightFields: () => [],
  emailLabel: 'Email',
  phoneLabel: 'Phone'
})

const emit = defineEmits<{
  'update:modelValue': [value: ShopFormSnapshot]
}>()

const form = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

function patch (partial: Partial<ShopFormSnapshot>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

function fieldClass (field: string) {
  return props.highlightFields.includes(field)
    ? 'rounded-md ring-2 ring-amber-400/60 ring-offset-2 ring-offset-transparent dark:ring-amber-500/50'
    : ''
}

const countryOptions = computed(() =>
  props.lookups.countries.map((c) => ({ id: String(c.id), label: c.name }))
)

const regionOptions = computed(() => {
  const base = props.lookups.regions.map((r) => ({ id: String(r.id), label: r.name }))
  for (const item of props.pendingLookups?.regions ?? []) {
    base.push({ id: item.tempId, label: item.name })
  }
  return base
})

const courseOptions = computed(() =>
  props.lookups.courses.map((c) => ({
    id: String(c.id),
    label: c.label || c.certification_name || 'Course'
  }))
)

const rentalOptions = computed(() => {
  const base = props.lookups.rentalEquipment.map((r) => ({ id: String(r.id), label: r.name }))
  for (const item of props.pendingLookups?.rental_equipment ?? []) {
    base.push({ id: item.tempId, label: item.name })
  }
  return base
})

const gasOptions = computed(() => {
  const base = props.lookups.gases.map((g) => ({ id: String(g.id), label: g.name }))
  for (const item of props.pendingLookups?.gases ?? []) {
    base.push({ id: item.tempId, label: item.name })
  }
  return base
})

const businessTypeOptions = computed(() => {
  const base = props.lookups.diveBusinessTypes.map((t) => ({
    id: String(t.id),
    label: formatDiveBusinessTypeLabel(t.name)
  }))
  for (const item of props.pendingLookups?.dive_business_types ?? []) {
    base.push({ id: item.tempId, label: item.name })
  }
  return base
})

const diveSiteOptions = computed(() => {
  const countryId = form.value.country_id
  const byId = new Map(
    props.lookups.diveSites.map((s) => [String(s.id), s])
  )
  const map = new Map<string, { id: string; label: string }>()

  for (const s of props.lookups.diveSites) {
    const id = String(s.id)
    if (!countryId || !s.country_id || s.country_id === countryId) {
      map.set(id, { id, label: s.name })
    }
  }

  for (const rawId of form.value.dive_site_ids ?? []) {
    const id = String(rawId)
    if (map.has(id)) continue
    const site = byId.get(id)
    map.set(id, {
      id,
      label: site?.name ?? `Dive site (${id.slice(0, 8)}…)`
    })
  }

  for (const item of props.pendingLookups?.dive_sites ?? []) {
    if (!countryId || !item.country_id || item.country_id === countryId) {
      map.set(item.tempId, { id: item.tempId, label: item.name })
    }
  }

  return [...map.values()]
})

const countryChip = computed({
  get: () => (form.value.country_id ? [form.value.country_id] : []),
  set: (v: string[]) => patch({ country_id: v.length > 0 ? v[0] : null })
})

const regionChip = computed({
  get: () => (form.value.region_id ? [form.value.region_id] : []),
  set: (v: string[]) => patch({ region_id: v.length > 0 ? v[0] : null })
})

function pushPending (kind: keyof PendingLookups, item: { tempId: string; name: string; country_id?: string }) {
  if (!props.portalMode || !props.pendingLookups) return
  const list = props.pendingLookups[kind] ?? []
  if (!props.pendingLookups[kind]) {
    props.pendingLookups[kind] = list as never
  }
  list.push(item as never)
}

async function createRegion (name: string) {
  if (props.portalMode) {
    const tempId = createTempLookupId()
    pushPending('regions', { tempId, name })
    return { id: tempId, label: name }
  }
  if (props.adminCreateHandlers?.createRegion) {
    return props.adminCreateHandlers.createRegion(name)
  }
  throw new Error('Region create handler not configured')
}

async function createSimpleLookup (kind: 'rental_equipment' | 'gases' | 'dive_business_types', name: string) {
  if (props.portalMode) {
    const tempId = createTempLookupId()
    pushPending(kind, { tempId, name })
    return { id: tempId, label: name }
  }
  if (props.adminCreateHandlers?.createSimpleLookup) {
    return props.adminCreateHandlers.createSimpleLookup(kind, name)
  }
  throw new Error('Lookup create handler not configured')
}

async function createDiveSite (name: string) {
  if (props.portalMode) {
    const countryId = form.value.country_id
    if (!countryId) throw new Error('Select a country before adding a dive site')
    const tempId = createTempLookupId()
    pushPending('dive_sites', { tempId, name, country_id: countryId })
    return { id: tempId, label: name }
  }
  if (props.adminCreateHandlers?.createDiveSite) {
    return props.adminCreateHandlers.createDiveSite(name, form.value.country_id)
  }
  throw new Error('Dive site create handler not configured')
}
</script>

<template>
  <section class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:items-start">
    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      Basic info
    </h3>
    <div class="flex min-w-0 flex-col gap-4">
      <FormField label="Business name" required field-id="shop-business-name">
        <FormInput
          id="shop-business-name"
          :model-value="form.business_name"
          type="text"
          :disabled="disabled"
          :class="fieldClass('business_name')"
          required
          @update:model-value="patch({ business_name: String($event ?? '') })"
        />
      </FormField>
      <FormField label="Business type">
        <div :class="fieldClass('business_type_ids')">
          <SearchMultiSelect
            :model-value="form.business_type_ids"
            :options="businessTypeOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            allow-add
            singular-label="business type"
            :on-create="(n: string) => createSimpleLookup('dive_business_types', n)"
            @update:model-value="patch({ business_type_ids: $event })"
          />
        </div>
      </FormField>
      <FormField label="Website" field-id="shop-website">
        <FormInput
          id="shop-website"
          :model-value="form.website_url ?? ''"
          type="url"
          :disabled="disabled"
          :class="fieldClass('website_url')"
          @update:model-value="patch({ website_url: String($event ?? '') || null })"
        />
      </FormField>
      <FormField :label="emailLabel" field-id="shop-email">
        <FormInput
          id="shop-email"
          :model-value="form.email ?? ''"
          type="email"
          :disabled="disabled"
          :class="fieldClass('email')"
          @update:model-value="patch({ email: String($event ?? '') || null })"
        />
      </FormField>
      <FormField :label="phoneLabel" field-id="shop-phone">
        <FormInput
          id="shop-phone"
          :model-value="form.phone ?? ''"
          type="text"
          :disabled="disabled"
          :class="fieldClass('phone')"
          @update:model-value="patch({ phone: String($event ?? '') || null })"
        />
      </FormField>
    </div>

    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      Location
    </h3>
    <div class="flex min-w-0 flex-col gap-4">
      <FormField label="Street address" field-id="shop-address">
        <FormTextarea
          id="shop-address"
          :model-value="form.street_address ?? ''"
          :rows="2"
          :resize="false"
          :disabled="disabled"
          :class="fieldClass('street_address')"
          @update:model-value="patch({ street_address: String($event ?? '') || null })"
        />
      </FormField>
      <FormField label="City" field-id="shop-city">
        <FormInput
          id="shop-city"
          :model-value="form.city ?? ''"
          type="text"
          :disabled="disabled"
          :class="fieldClass('city')"
          @update:model-value="patch({ city: String($event ?? '') || null })"
        />
      </FormField>
      <FormField label="State" field-id="shop-state">
        <FormInput
          id="shop-state"
          :model-value="form.state ?? ''"
          type="text"
          :disabled="disabled"
          :class="fieldClass('state')"
          @update:model-value="patch({ state: String($event ?? '') || null })"
        />
      </FormField>
      <FormField label="Country">
        <div :class="fieldClass('country_id')">
          <SearchMultiSelect
            v-model="countryChip"
            :options="countryOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            single-select
            singular-label="country"
          />
        </div>
      </FormField>
      <FormField label="Region">
        <div :class="fieldClass('region_id')">
          <SearchMultiSelect
            v-model="regionChip"
            :options="regionOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            single-select
            allow-add
            singular-label="region"
            :on-create="createRegion"
          />
        </div>
      </FormField>
    </div>

    <h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
      Shop variables
    </h3>
    <div class="flex min-w-0 flex-col gap-4">
      <FormField label="Dive sites">
        <div :class="fieldClass('dive_site_ids')">
          <SearchMultiSelect
            :model-value="form.dive_site_ids"
            :options="diveSiteOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            allow-add
            singular-label="dive site"
            :on-create="createDiveSite"
            @update:model-value="patch({ dive_site_ids: $event })"
          />
        </div>
      </FormField>
      <FormField label="Courses">
        <div :class="fieldClass('course_ids')">
          <SearchMultiSelect
            :model-value="form.course_ids"
            :options="courseOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            singular-label="course"
            @update:model-value="patch({ course_ids: $event })"
          />
        </div>
      </FormField>
      <FormField label="Rental gear">
        <div :class="fieldClass('rental_equipment_ids')">
          <SearchMultiSelect
            :model-value="form.rental_equipment_ids"
            :options="rentalOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            allow-add
            singular-label="rental"
            :on-create="(n: string) => createSimpleLookup('rental_equipment', n)"
            @update:model-value="patch({ rental_equipment_ids: $event })"
          />
        </div>
      </FormField>
      <FormField label="Gases">
        <div :class="fieldClass('gas_ids')">
          <SearchMultiSelect
            :model-value="form.gas_ids"
            :options="gasOptions"
            :disabled="disabled"
            searchable
            wrap-chips
            allow-add
            singular-label="gas"
            :on-create="(n: string) => createSimpleLookup('gases', n)"
            @update:model-value="patch({ gas_ids: $event })"
          />
        </div>
      </FormField>
    </div>
  </section>
</template>
