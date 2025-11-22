<template>
  <div 
    @click="navigateToShop"
    :class="[
      'flex flex-col gap-3 p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-white dark:bg-zinc-900',
      active 
        ? 'border-white dark:border-white' 
        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
    ]">
    <!-- Header with name and rating -->
    <div class="flex flex-row justify-between items-start gap-2">
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-white hover:text-blue-600">
        {{ shop.business_name }}
      </h3>
      <div v-if="shop.google_rating" class="flex items-center gap-1 shrink-0">
        <Star class="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300">{{ shop.google_rating }}</span>
      </div>
    </div>
    
    <!-- Location -->
    <div class="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
      <MapPin class="w-4 h-4 shrink-0 mt-0.5" />
      <div class="flex flex-col">
        <span class="font-medium">{{ shop.locale }}, {{ shop.country }}</span>
        <span v-if="shop.street_address" class="text-zinc-50 dark:text-zinc-400">{{ shop.street_address }}</span>
      </div>
    </div>
    
    <!-- Languages -->
    <div v-if="shop.languages && shop.languages.length > 0" class="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-100">
      <Languages class="w-4 h-4 shrink-0" />
      <span>{{ shop.languages.join(', ') }}</span>
    </div>
    
    <!-- Contact info -->
    <div class="flex flex-wrap gap-3 text-sm">
      <a 
        v-if="shop.website_url" 
        :href="shop.website_url" 
        target="_blank" 
        rel="noopener noreferrer"
        @click.stop
        class="flex items-center gap-1 text-blue-600 hover:text-blue-800">
        <Globe class="w-4 h-4" />
        <span>Website</span>
      </a>
      <a 
        v-if="shop.phone" 
        :href="`tel:${shop.phone}`"
        @click.stop
        class="flex items-center gap-1 text-blue-600 hover:text-blue-800">
        <Phone class="w-4 h-4" />
        <span>Call</span>
      </a>
      <a 
        v-if="shop.email" 
        :href="`mailto:${shop.email}`"
        @click.stop
        class="flex items-center gap-1 text-blue-600 hover:text-blue-800">
        <Mail class="w-4 h-4" />
        <span>Email</span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { Star, MapPin, Languages, Globe, Phone, Mail } from 'lucide-vue-next'

const props = defineProps({
  shop: {
    type: Object,
    required: true
  },
  active: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['shop-selected'])

const navigateToShop = () => {
  emit('shop-selected', props.shop)
}
</script>

