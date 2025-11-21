<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>

<script setup>
// Apply theme immediately before any rendering to prevent flash
useHead({
  script: [
    {
      innerHTML: `(function(){const t='glaucus-theme';try{const s=localStorage.getItem(t);const d=s==='dark'||(s!=='light'&&s!=='dark');if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})();`
    }
  ]
})
</script>
