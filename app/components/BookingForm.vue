<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="w-full h-10 lg:h-[65px] p-1 border-b border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center">
      <div class="w-full flex items-center justify-between px-2 overflow-auto">
        <h2 class="text-base font-medium truncate text-zinc-900 dark:text-white">Book with {{ shopName }}</h2>
        <button @click="closeDrawer" class="lg:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm transition-colors cursor-pointer text-zinc-900 dark:text-white">
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Form Content -->
    <div class="w-full h-full overflow-y-auto">
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-2 relative pt-2">

        <h3 class="text-base font-bold px-2 text-zinc-900 dark:text-white">Trip Information</h3>

        <!-- Name -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="name" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Name</label>
          <input type="text" id="name" v-model="formData.name" required
            class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
        </fieldset>

        <!-- Email -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="email" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Email</label>
          <input type="email" id="email" v-model="formData.email" required
            class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
        </fieldset>

        <!-- Dates -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Dates for Diving</label>

          <div class="flex flex-col gap-1">
            <label for="startDate" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Start Date</label>
            <input type="date" id="startDate" v-model="formData.startDate" :min="today" required
              class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <div class="flex flex-col gap-1">
            <label for="endDate" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">End Date</label>
            <input type="date" id="endDate" v-model="formData.endDate" :min="formData.startDate || today" required
              class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>
        </fieldset>

        <!-- Courses (from Supabase for this shop) -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Courses (optional)</label>
          <div v-if="coursesLoading" class="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">Loading courses…</div>
          <div v-else-if="courses.length === 0" class="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">No courses listed for this shop.</div>
          <div v-else class="flex flex-col gap-1 px-2">
            <label v-for="course in courses" :key="course.id"
              class="flex items-center gap-2 p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer">
              <input type="checkbox" :value="course.name" v-model="formData.desiredCourses" class="cursor-pointer" />
              <span class="text-sm text-zinc-900 dark:text-white">{{ course.name }}</span>
            </label>
          </div>
        </fieldset>

        <!-- Desired Dive Sites (from Supabase for this shop) -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Desired Dive Sites (optional)</label>
          <div v-if="diveSitesLoading" class="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">Loading dive sites…</div>
          <div v-else-if="diveSites.length === 0" class="px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">No dive sites listed for this shop.</div>
          <div v-else class="flex flex-col gap-1 px-2">
            <label v-for="site in diveSites" :key="site.id"
              class="flex items-center gap-2 p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer">
              <input type="checkbox" :value="site.name" v-model="formData.desiredDiveSites" class="cursor-pointer" />
              <span class="text-sm text-zinc-900 dark:text-white">{{ site.name }}</span>
            </label>
          </div>
        </fieldset>

        <hr class="border-zinc-300 dark:border-zinc-700" />

        <h3 class="text-base font-bold px-2 text-zinc-900 dark:text-white">Diver Information</h3>

        <!-- Number of Divers -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="numberOfDivers" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Number of Divers</label>
          <input type="number" id="numberOfDivers" v-model.number="formData.numberOfDivers"
            @input="updateDiversCount(formData.numberOfDivers)" min="1" required
            class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
        </fieldset>

        <!-- Divers Details -->
        <div v-for="(diver, index) in formData.divers" :key="index"
          class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2 mx-2">
          <h3 class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Diver {{ index + 1 }}</h3>

          <div class="flex flex-col gap-1">
            <label :for="`diver-name-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Name</label>
            <input type="text" :id="`diver-name-${index}`" v-model="diver.name" required
              class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="`diver-cert-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Certification Number</label>
            <input type="text" :id="`diver-cert-${index}`" v-model="diver.certificationNumber" required
              class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="`diver-dives-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Number of Dives Completed</label>
            <input type="text" :id="`diver-dives-${index}`" v-model="diver.numberOfDives" required
              class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <!-- Height -->
          <div class="flex gap-2 items-end">
            <div class="flex flex-col gap-1 flex-1 min-w-0">
              <label :for="`diver-height-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Height</label>
              <input type="text" :id="`diver-height-${index}`" v-model="diver.height" required
                class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
            </div>
            <div class="flex flex-col gap-1 w-24 shrink-0">
              <label :for="`diver-height-unit-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Unit</label>
              <select :id="`diver-height-unit-${index}`" v-model="diver.heightUnit"
                class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-tight outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                <option value="ft-in">ft' in"</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>

          <!-- Weight -->
          <div class="flex gap-2 items-end">
            <div class="flex flex-col gap-1 flex-1 min-w-0">
              <label :for="`diver-weight-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Weight</label>
              <input type="text" :id="`diver-weight-${index}`" v-model="diver.weight" required
                class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
            </div>
            <div class="flex flex-col gap-1 w-24 shrink-0">
              <label :for="`diver-weight-unit-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Unit</label>
              <select :id="`diver-weight-unit-${index}`" v-model="diver.weightUnit"
                class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-tight outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                <option value="lbs">lbs</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </div>

          <!-- Rental Gear -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between px-2">
              <label class="text-xs text-zinc-600 dark:text-zinc-400">Rental Gear</label>
              <button type="button" @click="addDiverGear(index)"
                class="text-xs bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 px-3 py-1 rounded-sm font-medium cursor-pointer text-zinc-900 dark:text-white">
                + Add Gear
              </button>
            </div>

            <div v-for="(gear, gearIndex) in diver.gear" :key="gearIndex"
              class="bg-white dark:bg-zinc-900 rounded-md flex flex-col gap-2 p-2 border border-zinc-200 dark:border-zinc-700">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-zinc-600 dark:text-zinc-400">Gear Item {{ gearIndex + 1 }}</span>
                <button type="button" @click="removeDiverGear(index, gearIndex)"
                  class="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium cursor-pointer">
                  Remove
                </button>
              </div>

              <div class="flex flex-col gap-1">
                <label :for="`diver-${index}-gear-type-${gearIndex}`" class="text-xs text-zinc-600 dark:text-zinc-400">Gear Type</label>
                <select :id="`diver-${index}-gear-type-${gearIndex}`" v-model="gear.gearType" required
                  class="h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-tight outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                  <option value="">Select gear type</option>
                  <option v-for="type in gearTypes" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit error -->
        <div v-if="submitError" class="mx-2 p-2 rounded-md bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
          {{ submitError }}
        </div>

        <!-- Save draft (signed in) or Sign in to save draft (guest) -->
        <div class="mx-2 flex gap-2">
          <NuxtLink v-if="!isSignedIn" to="/auth" class="flex-1 text-center py-2 px-3 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
            Sign in to save draft
          </NuxtLink>
          <button v-else type="button" @click="saveDraft" :disabled="draftLoading || draftSaved"
            class="flex-1 py-2 px-3 rounded-md border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-300 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors">
            {{ draftLoading ? 'Saving…' : (draftSaved ? 'Draft saved' : 'Save as draft') }}
          </button>
        </div>

        <!-- Submit Button -->
        <div class="sticky bottom-0 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 p-2 mt-2">
          <button type="submit" :disabled="submitLoading"
            class="bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">
            {{ submitLoading ? 'Sending…' : 'Submit Booking Request' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import { readChatsRoot } from '~/composables/useSearchCache'
import { X } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'
import { mergeDefaultDiversFromBookingPayload, defaultDiverJsonFromFirst } from '~/utils/mergeProfileDefaultDivers'

interface BookingApiResponse {
  sent: boolean
  message?: string
}

// Props
const props = defineProps({
  shopId: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true
  },
  /** Pre-fill form from chat-collected booking payload or resumed draft */
  initialPayload: {
    type: Object,
    default: undefined
  },
  /** When resuming a draft, pass draft id to update existing draft on save */
  draftId: {
    type: String,
    default: undefined
  }
})

const { closeDrawer, updateDraftIdIfOpen, updateLiveBookingPayloadIfOpen } = useDrawer()
const { client } = useSupabase()
const { isSignedIn, accessToken, user } = useAuth()

// Get today's date in YYYY-MM-DD format for date inputs
const today = computed(() => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})

// Form state
const formData = ref({
  shopId: props.shopId,
  name: '',
  email: '',
  numberOfDivers: 1,
  divers: [
    { 
      name: '', 
      certificationNumber: '', 
      numberOfDives: '',
      height: '',
      heightUnit: 'ft-in',
      weight: '',
      weightUnit: 'lbs',
      gear: []
    }
  ],
  startDate: '',
  endDate: '',
  desiredCourses: [],
  desiredDiveSites: []
})

// Pre-fill from profile (when signed in): name, email, all divers from default_divers (or default_diver for first diver only)
async function applyProfilePrefill () {
  if (!isSignedIn.value) return
  try {
    const { data: profile, error } = await client
      .from('profiles')
      .select('display_name, email, default_diver, default_divers')
      .single()
    if (error || !profile) return
    if (profile.display_name != null) formData.value.name = String(profile.display_name)
    if (profile.email != null) formData.value.email = String(profile.email)
    const defaultDivers = profile.default_divers
    if (Array.isArray(defaultDivers) && defaultDivers.length > 0) {
      formData.value.numberOfDivers = defaultDivers.length
      formData.value.divers = defaultDivers.slice(0, 50).map((d: Record<string, unknown>) => ({
        name: (d.name != null ? String(d.name) : '') || '',
        certificationNumber: (d.certification_number != null ? String(d.certification_number) : '') || '',
        numberOfDives: (d.number_of_dives != null ? String(d.number_of_dives) : '') || '',
        height: (d.height != null ? String(d.height) : '') || '',
        heightUnit: d.height_unit === 'ft-in' ? 'ft-in' : 'cm',
        weight: (d.weight != null ? String(d.weight) : '') || '',
        weightUnit: d.weight_unit === 'lbs' ? 'lbs' : 'kg',
        gear: Array.isArray(d.gear) ? (d.gear as Record<string, unknown>[]).map(g => ({ gearType: (g && g.gear_type != null ? String(g.gear_type) : '') || (g && (g as { gearType?: string }).gearType != null ? String((g as { gearType: string }).gearType) : '') })) : []
      }))
      while (formData.value.divers.length < formData.value.numberOfDivers) {
        formData.value.divers.push({
          name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: []
        })
      }
    } else {
      const dd = profile.default_diver
      if (dd && typeof dd === 'object' && formData.value.divers[0]) {
        const d = dd as Record<string, unknown>
        formData.value.divers[0].name = (d.name != null ? String(d.name) : '') || formData.value.divers[0].name
        formData.value.divers[0].certificationNumber = (d.certification_number != null ? String(d.certification_number) : '') || formData.value.divers[0].certificationNumber
        formData.value.divers[0].numberOfDives = (d.number_of_dives != null ? String(d.number_of_dives) : '') || formData.value.divers[0].numberOfDives
        formData.value.divers[0].height = (d.height != null ? String(d.height) : '') || formData.value.divers[0].height
        formData.value.divers[0].heightUnit = (d.height_unit === 'ft-in' ? 'ft-in' : 'cm') || formData.value.divers[0].heightUnit
        formData.value.divers[0].weight = (d.weight != null ? String(d.weight) : '') || formData.value.divers[0].weight
        formData.value.divers[0].weightUnit = (d.weight_unit === 'lbs' ? 'lbs' : 'kg') || formData.value.divers[0].weightUnit
        if (Array.isArray(d.gear)) {
          formData.value.divers[0].gear = (d.gear as Record<string, unknown>[]).map(g => ({
            gearType: (g && g.gear_type != null ? String(g.gear_type) : '') || (g && (g as { gearType?: string }).gearType != null ? String((g as { gearType: string }).gearType) : '')
          }))
        }
      }
    }
  } catch {
    // ignore
  }
}

// Pre-fill from chat-collected payload (or cached data) when drawer opens
function applyInitialPayload () {
  const p = props.initialPayload
  if (!p || typeof p !== 'object') return
  if (p.shopId != null) formData.value.shopId = String(p.shopId)
  if (p.name != null) formData.value.name = String(p.name)
  if (p.email != null) formData.value.email = String(p.email)
  if (p.startDate != null) formData.value.startDate = String(p.startDate)
  if (p.endDate != null) formData.value.endDate = String(p.endDate)
  const numDivers = (p.numberOfDivers != null && Number(p.numberOfDivers) >= 1) ? Number(p.numberOfDivers) : 1
  formData.value.numberOfDivers = numDivers
  if (Array.isArray(p.divers) && p.divers.length > 0) {
    formData.value.divers = p.divers.slice(0, numDivers).map(d => {
      const item = d && typeof d === 'object' ? d : {}
      return {
        name: item.name ?? '',
        certificationNumber: item.certificationNumber ?? '',
        numberOfDives: item.numberOfDives ?? '',
        height: item.height ?? '',
        heightUnit: item.heightUnit === 'ft-in' ? 'ft-in' : 'cm',
        weight: item.weight ?? '',
        weightUnit: item.weightUnit === 'lbs' ? 'lbs' : 'kg',
        gear: Array.isArray(item.gear) ? item.gear.map(g => ({ gearType: g && typeof g === 'object' ? g.gearType : '' })) : []
      }
    })
    while (formData.value.divers.length < numDivers) {
      formData.value.divers.push({
        name: '', certificationNumber: '', numberOfDives: '', height: '', heightUnit: 'ft-in', weight: '', weightUnit: 'lbs', gear: []
      })
    }
  } else {
    updateDiversCount(numDivers)
  }
  if (Array.isArray(p.desiredCourses)) formData.value.desiredCourses = p.desiredCourses.filter(Boolean)
  if (Array.isArray(p.desiredDiveSites)) formData.value.desiredDiveSites = p.desiredDiveSites.filter(Boolean)
}

onMounted(async () => {
  if (props.draftId) {
    localDraftId.value = String(props.draftId)
  } else {
    const k = bookingDraftStorageKey()
    const stored = k ? window.sessionStorage.getItem(k) : null
    if (stored) localDraftId.value = stored
  }
  await applyProfilePrefill()
  applyInitialPayload()
  updateLiveBookingPayloadIfOpen(buildPayload())
  fetchCoursesForShop()
  fetchDiveSitesForShop()
})
watch(() => props.initialPayload, () => applyInitialPayload(), { deep: true })

function currentDraftSnapshot (): string {
  return JSON.stringify(buildPayload())
}

watch(
  formData,
  () => {
    updateLiveBookingPayloadIfOpen(buildPayload())
    if (!draftSaved.value || lastSavedDraftSnapshot.value == null) return
    if (currentDraftSnapshot() !== lastSavedDraftSnapshot.value) {
      draftSaved.value = false
    }
  },
  { deep: true }
)

// Auto-sync main name to Diver 1
watch(() => formData.value.name, (newName) => {
  if (formData.value.divers[0]) {
    formData.value.divers[0].name = newName
  }
})

// Update divers array when numberOfDivers changes
const updateDiversCount = (count) => {
  const currentCount = formData.value.divers.length
  
  if (count > currentCount) {
    // Add new divers
    for (let i = currentCount; i < count; i++) {
      formData.value.divers.push({
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
  } else if (count < currentCount) {
    // Remove divers
    formData.value.divers = formData.value.divers.slice(0, count)
  }
}

// Diver gear management
const addDiverGear = (diverIndex) => {
  formData.value.divers[diverIndex].gear.push({
    gearType: ''
  })
}

const removeDiverGear = (diverIndex, gearIndex) => {
  formData.value.divers[diverIndex].gear.splice(gearIndex, 1)
}

// Available gear types (static for now, can be pulled from DB later)
const gearTypes = [
  'Wetsuit',
  'Drysuit',
  'BCD',
  'Regulator',
  'Fins',
  'Mask',
  'Snorkel',
  'Dive Computer',
  'Weight Belt',
  'Tank'
]

// Courses for this shop (diveshop_courses -> courses)
const courses = ref<{ id: string; name: string }[]>([])
const coursesLoading = ref(true)

async function fetchCoursesForShop () {
  if (!props.shopId) {
    coursesLoading.value = false
    return
  }
  try {
    const { data, error } = await client
      .from('diveshop_courses')
      .select('course_id, courses(id, certification_name)')
      .eq('diveshop_id', props.shopId)
    if (error || !data) {
      courses.value = []
      return
    }
    const seen = new Set<string>()
    const list: { id: string; name: string }[] = []
    for (const row of data as Record<string, unknown>[]) {
      const raw = row.courses
      const c = (Array.isArray(raw) ? raw[0] : raw) as { id?: string; certification_name?: string | null } | null | undefined
      if (!c?.id) continue
      const name = (c.certification_name || '').trim()
      if (!name || seen.has(name.toLowerCase())) continue
      seen.add(name.toLowerCase())
      list.push({ id: c.id, name })
    }
    list.sort((a, b) => a.name.localeCompare(b.name))
    courses.value = list
  } finally {
    coursesLoading.value = false
  }
}

// Dive sites for this shop (from Supabase: diveshop_dive_sites -> dive_sites)
const diveSites = ref<{ id: string; name: string }[]>([])
const diveSitesLoading = ref(true)

async function fetchDiveSitesForShop () {
  if (!props.shopId) {
    diveSitesLoading.value = false
    return
  }
  try {
    const { data, error } = await client
      .from('diveshop_dive_sites')
      .select('dive_site_id, dive_sites(id, name)')
      .eq('diveshop_id', props.shopId)
    if (error || !data) {
      diveSites.value = []
      return
    }
    const sites: { id: string; name: string }[] = []
    for (const row of data as Record<string, unknown>[]) {
      const raw = row.dive_sites
      const ds = (Array.isArray(raw) ? raw[0] : raw) as { id?: string; name?: string | null } | null | undefined
      if (!ds?.id || ds.name == null || String(ds.name).trim() === '') continue
      sites.push({ id: ds.id, name: String(ds.name) })
    }
    diveSites.value = sites
  } finally {
    diveSitesLoading.value = false
  }
}

// Submit state
const submitLoading = ref(false)
const submitError = ref('')
const draftLoading = ref(false)
/** After a successful save, show disabled "Draft saved" until the user edits the form */
const draftSaved = ref(false)
/** JSON snapshot at last successful draft save — ignores no-op form writes (e.g. chat re-syncing the same payload) */
const lastSavedDraftSnapshot = ref<string | null>(null)
/** Server draft row id for this booking (resume prop, session, or last save) so we always update one row */
const localDraftId = ref<string | undefined>(undefined)

function bookingDraftStorageKey (): string | null {
  if (typeof window === 'undefined') return null
  const root = readChatsRoot()
  const sid = root?.activeSessionId
  if (!sid || !props.shopId) return null
  return `glaucus-booking-draft:${sid}:${props.shopId}`
}

const effectiveDraftId = computed(() => localDraftId.value || (props.draftId as string | undefined))

function buildPayload () {
  return {
    shopId: formData.value.shopId || props.shopId,
    name: formData.value.name,
    email: formData.value.email,
    startDate: formData.value.startDate,
    endDate: formData.value.endDate,
    numberOfDivers: Number(formData.value.numberOfDivers || 0),
    desiredCourses: formData.value.desiredCourses || [],
    desiredDiveSites: formData.value.desiredDiveSites || [],
    divers: formData.value.divers.map(d => ({
      name: d.name,
      certificationNumber: d.certificationNumber,
      numberOfDives: d.numberOfDives,
      height: d.height,
      heightUnit: d.heightUnit,
      weight: d.weight,
      weightUnit: d.weightUnit,
      gear: (d.gear || []).map(g => ({ gearType: g.gearType || '' }))
    }))
  }
}

async function saveDraft () {
  if (!accessToken.value) return
  draftLoading.value = true
  try {
    const payload = buildPayload()
    const res = await $fetch<{ draftId: string }>('/api/booking/draft', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken.value}` },
      body: {
        shopId: payload.shopId,
        payload,
        ...(effectiveDraftId.value ? { draftId: effectiveDraftId.value } : {})
      }
    })
    if (res?.draftId) {
      localDraftId.value = res.draftId
      updateDraftIdIfOpen(res.draftId)
      const k = bookingDraftStorageKey()
      if (k) window.sessionStorage.setItem(k, res.draftId)
    }
    lastSavedDraftSnapshot.value = JSON.stringify(payload)
    draftSaved.value = true
  } catch {
    draftSaved.value = false
    lastSavedDraftSnapshot.value = null
  } finally {
    draftLoading.value = false
  }
}

function clearStoredBookingDraftId () {
  const k = bookingDraftStorageKey()
  if (k) window.sessionStorage.removeItem(k)
}

// Form submission
const handleSubmit = async () => {
  submitError.value = ''
  submitLoading.value = true
  try {
    const payload = buildPayload()
    const token = accessToken.value || (await client.auth.getSession()).data.session?.access_token || null
    const res = await $fetch('/api/booking', {
      method: 'POST',
      body: payload,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {})
    }) as BookingApiResponse
    if (res?.sent) {
      clearStoredBookingDraftId()
      if (isSignedIn.value && user.value?.id && Array.isArray(payload.divers) && payload.divers.length > 0) {
        try {
          const { data: profile } = await client.from('profiles').select('default_divers').eq('id', user.value.id).single()
          const existing = profile?.default_divers
          const default_divers = mergeDefaultDiversFromBookingPayload(existing, payload.divers, { bumpTimesUsed: true })
          await client.from('profiles').update({
            display_name: payload.name ?? undefined,
            email: payload.email ?? undefined,
            default_divers,
            default_diver: defaultDiverJsonFromFirst(default_divers[0]) ?? undefined
          }).eq('id', user.value.id)
        } catch {
          // ignore
        }
      }
      closeDrawer()
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; statusMessage?: string }; statusMessage?: string; message?: string }
    submitError.value = err?.data?.message || err?.data?.statusMessage || err?.statusMessage || err?.message || 'Failed to send booking request. Please try again.'
  } finally {
    submitLoading.value = false
  }
}
</script>

