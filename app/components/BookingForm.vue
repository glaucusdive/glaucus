<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="w-full h-10 lg:h-18 p-1 border-b border-gray-300 shrink-0 flex items-center">
      <div class="w-full flex items-center justify-between px-2">
        <h2 class="text-base font-medium">Book with {{ shopName }}</h2>
        <button @click="closeDrawer" class="lg:p-2 hover:bg-gray-100 rounded-sm transition-colors cursor-pointer">
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Form Content -->
    <div class="w-full h-full overflow-y-auto">
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-2 relative pt-2">
        <!-- Name -->
        <fieldset class="bg-gray-100 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="name" class="text-xs uppercase font-medium px-2">Name</label>
          <input type="text" id="name" v-model="formData.name" required
            class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
        </fieldset>

        <!-- Email -->
        <fieldset class="bg-gray-100 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="email" class="text-xs uppercase font-medium px-2">Email</label>
          <input type="email" id="email" v-model="formData.email" required
            class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
        </fieldset>

        <!-- Number of Divers -->
        <fieldset class="bg-gray-100 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label for="numberOfDivers" class="text-xs uppercase font-medium px-2">Number of Divers</label>
          <input type="number" id="numberOfDivers" v-model.number="formData.numberOfDivers"
            @input="updateDiversCount(formData.numberOfDivers)" min="1" required
            class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
        </fieldset>

        <!-- Divers Details -->
        <div v-for="(diver, index) in formData.divers" :key="index"
          class="bg-gray-100 rounded-md flex flex-col gap-2 p-2 mx-2">
          <h3 class="text-xs uppercase font-medium px-2">Diver {{ index + 1 }}</h3>

          <div class="flex flex-col gap-1">
            <label :for="`diver-name-${index}`" class="text-xs px-2 text-gray-600">Name</label>
            <input type="text" :id="`diver-name-${index}`" v-model="diver.name" required
              class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="`diver-cert-${index}`" class="text-xs px-2 text-gray-600">Certification Number</label>
            <input type="text" :id="`diver-cert-${index}`" v-model="diver.certificationNumber" required
              class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
          </div>

          <div class="flex flex-col gap-1">
            <label :for="`diver-dives-${index}`" class="text-xs px-2 text-gray-600">Number of Dives</label>
            <input type="text" :id="`diver-dives-${index}`" v-model="diver.numberOfDives" required
              class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
          </div>

          <!-- Height -->
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`diver-height-${index}`" class="text-xs px-2 text-gray-600">Height</label>
              <input type="text" :id="`diver-height-${index}`" v-model="diver.height" required
                class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
            </div>
            <div class="flex flex-col gap-1 w-20">
              <label :for="`diver-height-unit-${index}`" class="text-xs px-2 text-gray-600">Unit</label>
              <select :id="`diver-height-unit-${index}`" v-model="diver.heightUnit"
                class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200">
                <option value="cm">cm</option>
                <option value="ft-in">ft' in"</option>
              </select>
            </div>
          </div>

          <!-- Weight -->
          <div class="flex gap-2">
            <div class="flex flex-col gap-1 flex-1">
              <label :for="`diver-weight-${index}`" class="text-xs px-2 text-gray-600">Weight</label>
              <input type="text" :id="`diver-weight-${index}`" v-model="diver.weight" required
                class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
            </div>
            <div class="flex flex-col gap-1 w-20">
              <label :for="`diver-weight-unit-${index}`" class="text-xs px-2 text-gray-600">Unit</label>
              <select :id="`diver-weight-unit-${index}`" v-model="diver.weightUnit"
                class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200">
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Dates -->
        <fieldset class="bg-gray-100 rounded-md flex flex-col gap-2 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2">Dates for Diving</label>

          <div class="flex flex-col gap-1">
            <label for="startDate" class="text-xs px-2 text-gray-600">Start Date</label>
            <input type="date" id="startDate" v-model="formData.startDate" required
              class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
          </div>

          <div class="flex flex-col gap-1">
            <label for="endDate" class="text-xs px-2 text-gray-600">End Date</label>
            <input type="date" id="endDate" v-model="formData.endDate" required
              class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200" />
          </div>
        </fieldset>

        <!-- Desired Dive Sites -->
        <fieldset class="bg-gray-100 rounded-md flex flex-col gap-1 p-2 mx-2">
          <label class="text-xs uppercase font-medium px-2">Desired Dive Sites</label>
          <div class="flex flex-col gap-1 px-2">
            <label v-for="site in diveSites" :key="site"
              class="flex items-center gap-2 p-1 hover:bg-gray-200/50 rounded-sm cursor-pointer">
              <input type="checkbox" :value="site" v-model="formData.desiredDiveSites" class="cursor-pointer" />
              <span class="text-sm">{{ site }}</span>
            </label>
          </div>
        </fieldset>

        <!-- Rental Gear -->
        <fieldset class="bg-gray-100 rounded-md flex flex-col gap-2 p-2 mx-2">
          <div class="flex items-center justify-between px-2">
            <label class="text-xs uppercase font-medium">Rental Gear</label>
            <button type="button" @click="addRentalGear"
              class="text-xs bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded-sm font-medium cursor-pointer">
              + Add Gear
            </button>
          </div>

          <div v-for="(gear, index) in formData.rentalGear" :key="index"
            class="bg-white rounded-md flex flex-col gap-2 p-2 border border-gray-200 mx-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-medium text-gray-600">Gear Item {{ index + 1 }}</span>
              <button type="button" @click="removeRentalGear(index)"
                class="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer">
                Remove
              </button>
            </div>

            <div class="flex flex-col gap-1">
              <label :for="`gear-type-${index}`" class="text-xs text-gray-600">Gear Type</label>
              <select :id="`gear-type-${index}`" v-model="gear.gearType" required
                class="rounded-sm w-full p-2 outline-none hover:bg-gray-200/50 focus:bg-gray-200 bg-gray-100">
                <option value="">Select gear type</option>
                <option v-for="type in gearTypes" :key="type" :value="type">{{ type }}</option>
              </select>
            </div>

            <div v-if="gear.gearType" class="flex flex-col gap-2 pt-2 border-t border-gray-200">
              <label class="text-xs text-gray-600 px-2">Select Diver(s)</label>
              <div class="flex flex-col gap-1 px-2">
                <label v-for="(diver, diverIndex) in formData.divers" :key="diverIndex"
                  class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-sm cursor-pointer">
                  <input type="checkbox" :value="diverIndex" v-model="gear.divers" class="cursor-pointer" />
                  <span class="text-sm">{{ diver.name || `Diver ${diverIndex + 1}` }}</span>
                </label>
              </div>
            </div>
          </div>
        </fieldset>

        <!-- Submit Button -->
        <div class="sticky bottom-0 bg-gray-50 border-t border-gray-300 p-2 mt-2">
          <button type="submit"
            class="bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-md transition-colors w-full cursor-pointer">
            Submit Booking Request
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
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
      weightUnit: 'kg'
    }
  ],
  startDate: '',
  endDate: '',
  desiredDiveSites: [],
  rentalGear: []
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
        weightUnit: 'kg'
      })
    }
  } else if (count < currentCount) {
    // Remove divers
    formData.value.divers = formData.value.divers.slice(0, count)
  }
}

// Rental gear management
const addRentalGear = () => {
  formData.value.rentalGear.push({
    gearType: '',
    divers: []
  })
}

const removeRentalGear = (index) => {
  formData.value.rentalGear.splice(index, 1)
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

