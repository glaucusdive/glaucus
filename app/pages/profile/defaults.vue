<template>
  <NuxtLayout name="default">
    <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4">
      <NuxtLink to="/profile" class="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer">
        ← Profile
      </NuxtLink>
      <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">Booking defaults</h1>
      <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6">This info is used to prefill bookings. You can set it here or it’ll be saved from your first completed booking.</p>

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
                <input v-model="diver.name" type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Certification #</label>
                <input v-model="diver.certificationNumber" type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white" />
              </div>
              <div>
                <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Number of dives</label>
                <input v-model="diver.numberOfDives" type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white" placeholder="e.g. 21" />
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Height</label>
                  <input v-model="diver.height" type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white" />
                </div>
                <div class="w-20">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Unit</label>
                  <select v-model="diver.heightUnit" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white">
                    <option value="cm">cm</option>
                    <option value="ft-in">ft & in</option>
                  </select>
                </div>
              </div>
              <div class="flex gap-2">
                <div class="flex-1">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Weight</label>
                  <input v-model="diver.weight" type="text" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white" />
                </div>
                <div class="w-20">
                  <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Unit</label>
                  <select v-model="diver.weightUnit" class="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-white">
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
            </div>
            <div>
              <label class="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Past rental gear</label>
              <div class="flex flex-wrap gap-2">
                <span v-for="(g, gi) in diver.gear" :key="gi" class="inline-flex items-center gap-1 rounded bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 text-xs text-zinc-800 dark:text-zinc-200">
                  {{ g.gearType || 'Gear' }}
                  <button type="button" @click="removeDiverGear(idx, gi)" class="hover:text-red-600 dark:hover:text-red-400 cursor-pointer" aria-label="Remove">×</button>
                </span>
                <select v-model="diver.gearToAdd" @change="addDiverGearFromSelect(idx)" class="rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs text-zinc-900 dark:text-white">
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
  }>
})
const defaultsLoading = ref(true)
const defaultsSaving = ref(false)
const defaultsSaveMessage = ref('')
const defaultsSaveSuccess = ref(false)

function addDefaultDiver () {
  defaultsForm.value.divers.push({
    name: '',
    certificationNumber: '',
    numberOfDives: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
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
      if (defaultsForm.value.divers.length === 0) defaultsForm.value.divers = [{ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] }]
      return
    }
    defaultsForm.value.name = (data.display_name ?? '') as string
    defaultsForm.value.email = (data.email ?? '') as string
    const dd = data.default_divers
    if (Array.isArray(dd) && dd.length > 0) {
      defaultsForm.value.divers = dd.map((d: Record<string, unknown>) => ({
        name: (d.name ?? '') as string,
        certificationNumber: (d.certification_number ?? '') as string,
        numberOfDives: (d.number_of_dives ?? '') as string,
        height: (d.height ?? '') as string,
        heightUnit: (d.height_unit === 'ft-in' ? 'ft-in' : 'cm') as string,
        weight: (d.weight ?? '') as string,
        weightUnit: (d.weight_unit === 'lbs' ? 'lbs' : 'kg') as string,
        gear: Array.isArray(d.gear) ? (d.gear as Array<{ gear_type?: string; gearType?: string }>).map(g => ({ gearType: (g.gear_type ?? g.gearType ?? '') as string })) : []
      }))
    } else if (defaultsForm.value.divers.length === 0) {
      defaultsForm.value.divers = [{ name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'cm', weight: '', weightUnit: 'kg', gear: [] }]
    }
  } finally {
    defaultsLoading.value = false
  }
}

async function saveDefaults () {
  if (!user.value?.id) return
  defaultsSaving.value = true
  defaultsSaveMessage.value = ''
  try {
    const default_divers = defaultsForm.value.divers.map(d => ({
      name: d.name ?? '',
      certification_number: d.certificationNumber ?? '',
      number_of_dives: d.numberOfDives ?? '',
      height: d.height ?? '',
      height_unit: d.heightUnit ?? 'cm',
      weight: d.weight ?? '',
      weight_unit: d.weightUnit ?? 'kg',
      gear: (d.gear || []).map(g => ({ gear_type: (g as { gearType?: string }).gearType ?? '' }))
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
