<template>
  <div class="h-screen w-screen overflow-hidden">
    <div class="h-full w-full flex flex-row">
      <!-- Sidebar -->
      <div class="w-56 shrink-0 bg-neutral-50 hidden lg:flex flex-col justify-center gap-56 p-2 h-full relative">
        <div class="w-[100px] h-auto absolute top-4 left-3">
          <img src="/images/logo-glaucus.svg" class="w-full h-full object-cover" />
        </div>
        <nav class="w-full flex flex-col gap-1">
          <NavLink to="/shops">Shops</NavLink>
          <NavLink to="/community">Community</NavLink>
          <NavLink to="/profile">Profile</NavLink>
        </nav>
      </div>
      <!-- Main Content -->
      <div class="p-2 pl-0 grow h-full w-full min-w-0">
        <div class="border border-neutral-200 rounded-xl h-full w-full relative overflow-scroll min-w-0">

          <slot />

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No props needed for this simplified layout
</script>
