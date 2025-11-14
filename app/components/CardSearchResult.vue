<template>
  <div 
    @click="navigateToShop"
    class="flex flex-col gap-3 p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 hover:shadow-md transition-all cursor-pointer bg-white">
    <!-- Header with name and rating -->
    <div class="flex flex-row justify-between items-start gap-2">
      <h3 class="text-lg font-semibold text-zinc-900 hover:text-blue-600">
        {{ shop.business_name }}
      </h3>
      <div v-if="shop.google_rating" class="flex items-center gap-1 shrink-0">
        <Star class="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span class="text-sm font-medium text-zinc-700">{{ shop.google_rating }}</span>
      </div>
    </div>
    
    <!-- Location -->
    <div class="flex items-start gap-2 text-sm text-zinc-600">
      <MapPin class="w-4 h-4 shrink-0 mt-0.5" />
      <div class="flex flex-col">
        <span class="font-medium">{{ shop.locale }}, {{ shop.country }}</span>
        <span v-if="shop.street_address" class="text-zinc-500">{{ shop.street_address }}</span>
      </div>
    </div>
    
    <!-- Languages -->
    <div v-if="shop.languages && shop.languages.length > 0" class="flex items-center gap-2 text-sm text-zinc-600">
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
  }
})

const navigateToShop = () => {
  navigateTo(`/shops/${props.shop.id}`)
}
</script>

