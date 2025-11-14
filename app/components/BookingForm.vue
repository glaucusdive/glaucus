<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="w-full h-10 lg:h-18 p-1 border-b border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center">
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
            class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
        </fieldset>

        <!-- Email -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="email" class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Email</label>
          <input type="email" id="email" v-model="formData.email" required
            class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
        </fieldset>

        <!-- Dates -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Dates for Diving</label>

          <div class="flex flex-col gap-1">
            <label for="startDate" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Start Date</label>
            <input type="date" id="startDate" v-model="formData.startDate" :min="today" required
              class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <div class="flex flex-col gap-1">
            <label for="endDate" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">End Date</label>
            <input type="date" id="endDate" v-model="formData.endDate" :min="formData.startDate || today" required
              class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>
        </fieldset>

        <!-- Desired Dive Sites -->
        <fieldset class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Desired Dive Sites</label>
          <div class="flex flex-col gap-1 px-2">
            <label v-for="site in diveSites" :key="site"
              class="flex items-center gap-2 p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer">
              <input type="checkbox" :value="site" v-model="formData.desiredDiveSites" class="cursor-pointer" />
              <span class="text-sm text-zinc-900 dark:text-white">{{ site }}</span>
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
            class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
        </fieldset>

        <!-- Divers Details -->
        <div v-for="(diver, index) in formData.divers" :key="index"
          class="bg-zinc-100 dark:bg-zinc-800 rounded-md flex flex-col gap-2 p-2 mx-2">
          <h3 class="text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white">Diver {{ index + 1 }}</h3>

          <div class="flex flex-col gap-1">
            <label :for="`diver-name-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Name</label>
            <input type="text" :id="`diver-name-${index}`" v-model="diver.name" required
              class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="`diver-cert-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Certification Number</label>
            <input type="text" :id="`diver-cert-${index}`" v-model="diver.certificationNumber" required
              class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="`diver-dives-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Number of Dives Completed</label>
            <input type="text" :id="`diver-dives-${index}`" v-model="diver.numberOfDives" required
              class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
          </div>

          <!-- Height -->
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`diver-height-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Height</label>
              <input type="text" :id="`diver-height-${index}`" v-model="diver.height" required
                class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
            </div>
            <div class="flex flex-col gap-1 w-20">
              <label :for="`diver-height-unit-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Unit</label>
              <select :id="`diver-height-unit-${index}`" v-model="diver.heightUnit"
                class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                <option value="ft-in">ft' in"</option>
                <option value="cm">cm</option>
              </select>
            </div>
          </div>

          <!-- Weight -->
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`diver-weight-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Weight</label>
              <input type="text" :id="`diver-weight-${index}`" v-model="diver.weight" required
                class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white" />
            </div>
            <div class="flex flex-col gap-1 w-20">
              <label :for="`diver-weight-unit-${index}`" class="text-xs px-2 text-zinc-600 dark:text-zinc-400">Unit</label>
              <select :id="`diver-weight-unit-${index}`" v-model="diver.weightUnit"
                class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
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
                  class="rounded-sm w-full p-2 outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white">
                  <option value="">Select gear type</option>
                  <option v-for="type in gearTypes" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="sticky bottom-0 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-300 dark:border-zinc-700 p-2 mt-2">
          <button type="submit"
            class="bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">
            Submit Booking Request
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'

// Props
const props = defineProps({
  shopId: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true
  }
})

const { closeDrawer } = useDrawer()

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
      heightUnit: 'cm',
      weight: '',
      weightUnit: 'kg',
      gear: []
    }
  ],
  startDate: '',
  endDate: '',
  desiredDiveSites: []
})

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
        heightUnit: 'cm',
        weight: '',
        weightUnit: 'kg',
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

// Available dive sites (static for now, can be pulled from DB later)
const diveSites = [
  'Coral Garden',
  'Blue Hole',
  'Shark Point',
  'Wreck Dive',
  'Cave System',
  'Wall Dive',
  'Drift Dive',
  'Night Dive'
]

// Form submission
const handleSubmit = () => {
  console.log('Form submitted:', formData.value)
  console.log('Shop ID:', props.shopId)
  console.log('Shop Name:', props.shopName)
  // TODO: Send to API with shop ID included
  closeDrawer()
}
</script>

