<template>
  <NuxtLayout name="default">
    <div class="max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto">
      <NuxtLink to="/profile" class="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer">
        ← Profile
      </NuxtLink>
      <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">Booking defaults</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">This info is used to prefill bookings. You can set it here or it’ll be saved from your first completed booking.</p>
      <p v-if="defaultsImportHint" class="text-sm text-blue-600 dark:text-blue-400 mb-4">{{ defaultsImportHint }}</p>

      <div v-if="defaultsLoading" class="text-sm text-zinc-500 dark:text-zinc-400">Loading…</div>
      <form v-else @submit.prevent="saveDefaults" class="space-y-4 max-w-xl">
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3">
          <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Contact</h2>
          <div>
            <label for="profile-name" class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Name</label>
            <input id="profile-name" v-model="defaultsForm.name" type="text"
              class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white text-sm" placeholder="Your name" />
          </div>
          <div>
            <label for="profile-email" class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Email</label>
            <input id="profile-email" v-model="defaultsForm.email" type="email"
              class="w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-white text-sm" placeholder="you@example.com" />
          </div>
        </div>
        <div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">Default divers</h2>
            <button type="button" @click="addDefaultDiver"
              class="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">+ Add diver</button>
          </div>
          <div v-for="(diver, idx) in defaultsForm.divers" :key="idx" class="border border-zinc-200 dark:border-zinc-600 rounded-md p-3 space-y-2">
            <div class="flex justify-between items-center">
              <span class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Diver {{ idx + 1 }}</span>
              <button v-if="defaultsForm.divers.length > 1" type="button" @click="removeDefaultDiver(idx)"
                class="text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer">Remove</button>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Name</label>
                <input v-model="diver.name" type="text" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-none text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Certification #</label>
                <input v-model="diver.certificationNumber" type="text" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-none text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Number of dives</label>
                <input v-model="diver.numberOfDives" type="text" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-none text-zinc-900 dark:text-white" placeholder="e.g. 21" />
              </div>
              <div class="flex gap-2 items-end">
                <div class="flex-1 min-w-0">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Height</label>
                  <input v-model="diver.height" type="text" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-none text-zinc-900 dark:text-white" />
                </div>
                <div class="w-24 shrink-0">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Unit</label>
                  <select v-model="diver.heightUnit" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-tight text-zinc-900 dark:text-white">
                    <option value="ft-in">ft & in</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-2 items-end">
                <div class="flex-1 min-w-0">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Weight</label>
                  <input v-model="diver.weight" type="text" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-none text-zinc-900 dark:text-white" />
                </div>
                <div class="w-24 shrink-0">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Unit</label>
                  <select v-model="diver.weightUnit" class="h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-tight text-zinc-900 dark:text-white">
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Past rental gear</label>
              <div class="flex flex-wrap items-center gap-2">
                <span v-for="(g, gi) in diver.gear" :key="gi" class="inline-flex h-8 items-center gap-1 rounded bg-zinc-200 dark:bg-zinc-700 px-2 text-xs text-zinc-800 dark:text-zinc-200">
                  {{ g.gearType || 'Gear' }}
                  <button type="button" @click="removeDiverGear(idx, gi)" class="hover:text-red-600 dark:hover:text-red-400 cursor-pointer" aria-label="Remove">×</button>
                </span>
                <select v-model="diver.gearToAdd" @change="addDiverGearFromSelect(idx)" class="h-8 min-w-[7.5rem] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-xs leading-tight text-zinc-900 dark:text-white">
                  <option value="">Add gear…</option>
                  <option v-for="t in gearTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        <div v-if="defaultsSaveMessage" class="text-sm" :class="defaultsSaveSuccess ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
          {{ defaultsSaveMessage }}
        </div>
        <button type="submit" :disabled="defaultsSaving"
          class="px-4 py-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer transition-colors">
          {{ defaultsSaving ? 'Saving…' : 'Save defaults' }}
        </button>
      </form>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { readChatsRoot, getActiveSession } from '~/composables/useSearchCache'
import { getLatestBookingPayloadFromMessages, bookingPayloadHasNamedDiver } from '~/utils/chatBookingPayload'
import { mergeDefaultDiversFromBookingPayload, defaultDiverJsonFromFirst, type BookingDiverLike } from '~/utils/mergeProfileDefaultDivers'

definePageMeta({ middleware: 'auth' })

const { user } = useAuth()
const { client } = useSupabase()

const gearTypes = ['Wetsuit', 'Drysuit', 'BCD', 'Regulator', 'Fins', 'Mask', 'Snorkel', 'Dive Computer', 'Weight Belt', 'Tank']

const defaultsForm = ref({
  name: '',
  email: '',
  divers: [] as Array<{
    name: string
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
      if (defaultsForm.value.divers.length === 0) defaultsForm.value.divers = [{ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] }]
      return
    }
    defaultsForm.value.name = (data.display_name ?? '') as string
    defaultsForm.value.email = (data.email ?? '') as string
    const dd = data.default_divers
    if (Array.isArray(dd) && dd.length > 0) {
      mapProfileDiverRowsToForm(dd as Array<Record<string, unknown>>)
    } else if (defaultsForm.value.divers.length === 0) {
      defaultsForm.value.divers = [{ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: [] }]
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

async function saveDefaults () {
  if (!user.value?.id) return
  defaultsSaving.value = true
  defaultsSaveMessage.value = ''
  defaultsImportHint.value = ''
  try {
    const default_divers = defaultsForm.value.divers.map(d => ({
      name: d.name ?? '',
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
