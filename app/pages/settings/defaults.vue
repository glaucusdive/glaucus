<template>
  <SettingsPage
    title="Booking defaults"
    description="This info is used to prefill bookings. You can set it here or it’ll be saved from your first completed booking."
    back-to="/settings"
  >
    <template #actions>
      <div v-if="!defaultsLoading" class="flex items-center gap-4">
        <p
          v-if="defaultsSaveMessage"
          class="max-w-40 truncate text-sm sm:max-w-xs"
          :class="defaultsSaveSuccess ? 'text-green-400' : 'text-red-400'"
          :title="defaultsSaveMessage"
        >
          {{ defaultsSaveMessage }}
        </p>
        <Button
          type="submit"
          form="settings-defaults-form"
          variant="primary"
          :disabled="defaultsSaving"
        >
          {{ defaultsSaving ? 'Saving…' : 'Save' }}
        </Button>
      </div>
    </template>

    <p v-if="defaultsImportHint" class="p-4 text-sm text-blue-400 lg:px-24">{{ defaultsImportHint }}</p>

    <div v-if="defaultsLoading" class="p-4 text-sm text-zinc-400 lg:py-12 lg:px-24">Loading…</div>
    <form
      v-else
      id="settings-defaults-form"
      class="divide-y divide-zinc-800"
      @submit.prevent="saveDefaults"
    >
      <section class="flex flex-col gap-4 p-4 lg:px-24 lg:py-12">
        <h2 class="text-base font-bold text-white">Contact</h2>
        <FormField label="Name" label-style="auth" field-id="profile-name">
          <FormInput
            id="profile-name"
            v-model="defaultsForm.name"
            type="text"
            size="md"
            placeholder="Your name"
          />
        </FormField>
        <FormField label="Email" label-style="auth" field-id="profile-email">
          <FormInput
            id="profile-email"
            v-model="defaultsForm.email"
            type="email"
            size="md"
            placeholder="you@example.com"
          />
        </FormField>
      </section>
      <section class="flex flex-col gap-4 p-4 lg:px-24 lg:py-12">
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-white">Default divers</h2>
          <Button type="button" variant="secondary" @click="addDefaultDiver">
            Add diver
          </Button>
        </div>
        <div
          v-for="(diver, idx) in defaultsForm.divers"
          :key="idx"
          class="flex flex-col gap-2 rounded-md bg-zinc-800/20 p-4"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-zinc-400">Diver {{ idx + 1 }}</span>
            <button
              v-if="defaultsForm.divers.length > 1"
              type="button"
              class="cursor-pointer text-xs text-red-400 hover:underline"
              @click="removeDefaultDiver(idx)"
            >
              Remove
            </button>
          </div>
          <div class="grid min-w-0 grid-cols-1 gap-4">
            <FormField label="Name" label-style="auth">
              <FormInput v-model="diver.name" type="text" size="sm" />
            </FormField>
            <div class="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <FormField label="Date of Birth" label-style="auth" class="min-w-0">
                <FormInput v-model="diver.dateOfBirth" class="min-w-0" type="date" :max="today" size="sm" />
              </FormField>
              <p class="pb-2 text-xs whitespace-nowrap tabular-nums text-zinc-400">
                {{ diver.dateOfBirth ? `Age ${ageFromDateOfBirth(diver.dateOfBirth)}` : 'Age —' }}
              </p>
            </div>
            <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Certification #" label-style="auth" class="min-w-0">
                <FormInput v-model="diver.certificationNumber" type="text" size="sm" />
              </FormField>
              <FormField label="Number of dives" label-style="auth" class="min-w-0">
                <FormInput v-model="diver.numberOfDives" type="text" size="sm" placeholder="e.g. 21" />
              </FormField>
            </div>
            <div class="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <FormField label="Height" label-style="auth" class="min-w-0">
                <FormInput v-model="diver.height" type="text" size="sm" />
              </FormField>
              <FormField label="Unit" label-style="auth">
                <FormSelect v-model="diver.heightUnit" size="sm">
                  <option value="ft-in">ft & in</option>
                  <option value="cm">cm</option>
                </FormSelect>
              </FormField>
            </div>
            <div class="grid min-w-0 grid-cols-1 items-end gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <FormField label="Weight" label-style="auth" class="min-w-0">
                <FormInput v-model="diver.weight" type="text" size="sm" />
              </FormField>
              <FormField label="Unit" label-style="auth">
                <FormSelect v-model="diver.weightUnit" size="sm">
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </FormSelect>
              </FormField>
            </div>
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-400">Past rental gear</label>
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="(g, gi) in diver.gear"
                :key="gi"
                class="inline-flex h-8 items-center gap-1 rounded bg-zinc-700 px-2 text-xs text-zinc-200"
              >
                {{ g.gearType || 'Gear' }}
                <button
                  type="button"
                  class="cursor-pointer hover:text-red-400"
                  aria-label="Remove"
                  @click="removeDiverGear(idx, gi)"
                >
                  ×
                </button>
              </span>
              <FormSelect
                v-model="diver.gearToAdd"
                size="xs"
                @change="addDiverGearFromSelect(idx)"
              >
                <option value="">Add gear…</option>
                <option v-for="t in gearTypes" :key="t" :value="t">{{ t }}</option>
              </FormSelect>
            </div>
          </div>
        </div>
      </section>
    </form>
  </SettingsPage>
</template>

<script setup lang="ts">
import { readChatsRoot, getActiveSession } from '~/composables/useSearchCache'
import { getLatestBookingPayloadFromMessages, bookingPayloadHasNamedDiver } from '~/utils/chatBookingPayload'
import { mergeDefaultDiversFromBookingPayload, defaultDiverJsonFromFirst, type BookingDiverLike } from '~/utils/mergeProfileDefaultDivers'
import { ageFromDateOfBirth } from '~~/shared/diverAge'

definePageMeta({ layout: 'default', middleware: 'auth' })

usePrivatePageSeo()

const { user, accessToken } = useAuth()
const { client } = useSupabase()

const gearTypes = ['Wetsuit', 'Drysuit', 'BCD', 'Regulator', 'Fins', 'Mask', 'Snorkel', 'Dive Computer', 'Weight Belt', 'Tank']

const today = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
})

const defaultsForm = ref({
  name: '',
  email: '',
  divers: [] as Array<{
    name: string
    dateOfBirth: string
    certificationNumber: string
    numberOfDives: string
    height: string
    heightUnit: string
    weight: string
    weightUnit: string
    gear: Array<{ gearType: string }>
    gearToAdd?: string
    times_used?: number
  }>
})
const defaultsLoading = ref(true)
const defaultsSaving = ref(false)
const defaultsSaveMessage = ref('')
const defaultsSaveSuccess = ref(false)
const defaultsImportHint = ref('')

function mapProfileDiverRowsToForm (rows: Array<Record<string, unknown>>) {
  defaultsForm.value.divers = rows.map((d) => ({
    name: (d.name ?? '') as string,
    dateOfBirth: (d.date_of_birth ?? '') as string,
    certificationNumber: (d.certification_number ?? '') as string,
    numberOfDives: (d.number_of_dives ?? '') as string,
    height: (d.height ?? '') as string,
    heightUnit: (d.height_unit === 'ft-in' ? 'ft-in' : 'cm') as string,
    weight: (d.weight ?? '') as string,
    weightUnit: (d.weight_unit === 'lbs' ? 'lbs' : 'kg') as string,
    gear: Array.isArray(d.gear)
      ? (d.gear as Array<{ gear_type?: string; gearType?: string }>).map(g => ({ gearType: (g.gear_type ?? g.gearType ?? '') as string }))
      : [],
    times_used: typeof d.times_used === 'number' ? d.times_used : undefined
  }))
}

/** If profile has no named default diver, merge from the active chat session in sessionStorage (same-tab chat). */
async function importDiversFromActiveChatIfNeeded (): Promise<boolean> {
  if (!import.meta.client || !user.value?.id) return false
  const hasNamed = defaultsForm.value.divers.some(d => String(d.name || '').trim())
  if (hasNamed) return false

  const root = readChatsRoot()
  const active = root ? getActiveSession(root) : null
  const msgs = active?.messages ?? []
  const payload = getLatestBookingPayloadFromMessages(msgs)
  if (!payload || !bookingPayloadHasNamedDiver(payload)) return false

  const payloadDivers = payload.divers as BookingDiverLike[]
  try {
    const { data: profile, error: selErr } = await client.from('profiles').select('default_divers').eq('id', user.value.id).single()
    if (selErr) return false
    const default_divers = mergeDefaultDiversFromBookingPayload(profile?.default_divers, payloadDivers, { bumpTimesUsed: false })
    const patch: Record<string, unknown> = {
      default_divers,
      default_diver: defaultDiverJsonFromFirst(default_divers[0]) ?? null
    }
    if (payload.name && String(payload.name).trim()) patch.display_name = String(payload.name).trim()
    if (payload.email && String(payload.email).trim()) patch.email = String(payload.email).trim()
    const { error: upErr } = await client.from('profiles').update(patch).eq('id', user.value.id)
    if (upErr) return false

    mapProfileDiverRowsToForm(default_divers as Array<Record<string, unknown>>)
    if (payload.name && String(payload.name).trim()) defaultsForm.value.name = String(payload.name).trim()
    if (payload.email && String(payload.email).trim()) defaultsForm.value.email = String(payload.email).trim()
    return true
  } catch {
    return false
  }
}

function addDefaultDiver () {
  defaultsForm.value.divers.push({
    name: '',
    dateOfBirth: '',
    certificationNumber: '',
    numberOfDives: '',
    height: '',
    heightUnit: 'ft-in',
    weight: '',
    weightUnit: 'lbs',
    gear: []
  })
}

function removeDefaultDiver (idx: number) {
  defaultsForm.value.divers.splice(idx, 1)
}

function addDiverGearFromSelect (idx: number) {
  const v = defaultsForm.value.divers[idx]?.gearToAdd
  if (!v) return
  if (!defaultsForm.value.divers[idx].gear.some(g => g.gearType === v)) {
    defaultsForm.value.divers[idx].gear.push({ gearType: v })
  }
  defaultsForm.value.divers[idx].gearToAdd = ''
}

function removeDiverGear (diverIdx: number, gearIdx: number) {
  defaultsForm.value.divers[diverIdx].gear.splice(gearIdx, 1)
}

async function loadDefaults () {
  defaultsLoading.value = true
  defaultsSaveMessage.value = ''
  try {
    const { data, error } = await client.from('profiles').select('display_name, email, default_divers').single()
    if (error || !data) {
      if (defaultsForm.value.divers.length === 0) defaultsForm.value.divers = [{ name: '', dateOfBirth: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] }]
      return
    }
    defaultsForm.value.name = (data.display_name ?? '') as string
    defaultsForm.value.email = (data.email ?? '') as string
    const dd = data.default_divers
    if (Array.isArray(dd) && dd.length > 0) {
      mapProfileDiverRowsToForm(dd as Array<Record<string, unknown>>)
    } else if (defaultsForm.value.divers.length === 0) {
      defaultsForm.value.divers = [{ name: '', dateOfBirth: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] }]
    }
  } finally {
    if (import.meta.client && user.value?.id) {
      const imported = await importDiversFromActiveChatIfNeeded()
      if (imported) {
        defaultsImportHint.value = 'Imported diver details from your open chat session (same browser tab).'
      }
    }
    defaultsLoading.value = false
  }
}

async function notifyProfileUpdate (diverCount: number) {
  try {
    const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token
    if (!token) return
    await $fetch('/api/profile/notify-update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        displayName: defaultsForm.value.name || null,
        email: defaultsForm.value.email || null,
        diverCount,
        source: 'defaults_page'
      }
    })
  } catch (e) {
    console.warn('[profile notify]', e)
  }
}

async function saveDefaults () {
  if (!user.value?.id) return
  defaultsSaving.value = true
  defaultsSaveMessage.value = ''
  defaultsImportHint.value = ''
  try {
    const default_divers = defaultsForm.value.divers.map(d => ({
      name: d.name ?? '',
      date_of_birth: d.dateOfBirth ?? '',
      certification_number: d.certificationNumber ?? '',
      number_of_dives: d.numberOfDives ?? '',
      height: d.height ?? '',
      height_unit: d.heightUnit ?? 'ft-in',
      weight: d.weight ?? '',
      weight_unit: d.weightUnit ?? 'lbs',
      gear: (d.gear || []).map(g => ({ gear_type: (g as { gearType?: string }).gearType ?? '' })),
      ...(typeof d.times_used === 'number' ? { times_used: d.times_used } : {})
    }))
    const { error } = await client.from('profiles').update({
      display_name: defaultsForm.value.name || null,
      email: defaultsForm.value.email || null,
      default_divers: default_divers,
      default_diver: default_divers[0] ? {
        name: default_divers[0].name,
        date_of_birth: default_divers[0].date_of_birth,
        certification_number: default_divers[0].certification_number,
        number_of_dives: default_divers[0].number_of_dives,
        height: default_divers[0].height,
        height_unit: default_divers[0].height_unit,
        weight: default_divers[0].weight,
        weight_unit: default_divers[0].weight_unit,
        gear: default_divers[0].gear
      } : null
    }).eq('id', user.value.id)
    if (error) {
      defaultsSaveSuccess.value = false
      defaultsSaveMessage.value = error.message || 'Failed to save'
    } else {
      defaultsSaveSuccess.value = true
      defaultsSaveMessage.value = 'Defaults saved. Future bookings will use this info.'
      void notifyProfileUpdate(default_divers.length)
    }
  } catch (e: unknown) {
    defaultsSaveSuccess.value = false
    defaultsSaveMessage.value = (e as Error)?.message ?? 'Failed to save'
  } finally {
    defaultsSaving.value = false
  }
}

onMounted(() => {
  loadDefaults()
})
</script>
