<template>
  <div class="max-h-screen bg-zinc-50 dark:bg-zinc-900 h-full p-4 overflow-y-auto">
    <NuxtLink
      to="/settings"
      class="inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-4 cursor-pointer"
    >
      ← Settings
    </NuxtLink>
    <h1 class="text-xl font-bold text-zinc-900 dark:text-white mb-2">
      Account security
    </h1>
    <p class="text-sm text-zinc-500 dark:text-zinc-400 mb-6 max-w-xl text-pretty">
      Add a password so you can sign in with email when Google redirect isn’t available (for example local admin).
    </p>

    <div class="space-y-4 max-w-xl">
      <div class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3">
        <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Signed-in email
        </h2>
        <p class="text-sm text-zinc-900 dark:text-white break-all">
          {{ accountEmail || 'No email on this account' }}
        </p>
        <div>
          <p class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
            Linked sign-in methods
          </p>
          <p
            v-if="linkedProviderLabels.length"
            class="text-sm text-zinc-700 dark:text-zinc-300"
          >
            {{ linkedProviderLabels.join(' · ') }}
          </p>
          <p
            v-else
            class="text-sm text-zinc-500 dark:text-zinc-400"
          >
            None listed yet
          </p>
          <p
            v-if="hasEmailPasswordAuth"
            class="text-xs text-green-700 dark:text-green-400 mt-2"
          >
            Email and password sign-in is enabled for this account.
          </p>
          <p
            v-else
            class="text-xs text-amber-700 dark:text-amber-400 mt-2"
          >
            This account does not have a password yet. Set one below to enable email login.
          </p>
        </div>
      </div>

      <form
        class="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 space-y-3"
        @submit.prevent="savePassword"
      >
        <h2 class="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {{ hasEmailPasswordAuth ? 'Change password' : 'Set password' }}
        </h2>
        <FormField
          label="New password"
          label-style="auth"
          field-id="account-password"
        >
          <FormInput
            id="account-password"
            v-model="password"
            type="password"
            size="md"
            autocomplete="new-password"
            :disabled="saving"
            required
          />
        </FormField>
        <FormField
          label="Confirm password"
          label-style="auth"
          field-id="account-password-confirm"
        >
          <FormInput
            id="account-password-confirm"
            v-model="passwordConfirm"
            type="password"
            size="md"
            autocomplete="new-password"
            :disabled="saving"
            required
          />
        </FormField>
        <p class="text-xs text-zinc-500 dark:text-zinc-400">
          At least {{ minPasswordLength }} characters.
        </p>
        <p
          v-if="formMessage"
          class="text-sm"
          :class="formOk ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
        >
          {{ formMessage }}
        </p>
        <Button
          type="submit"
          variant="primary"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : (hasEmailPasswordAuth ? 'Update password' : 'Set password') }}
        </Button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default', middleware: 'auth' })

usePrivatePageSeo()

const {
  user,
  hasEmailPasswordAuth,
  linkedProviderLabels,
  minPasswordLength,
  setPassword
} = useAuth()

const accountEmail = computed(() => user.value?.email?.trim() || '')

const password = ref('')
const passwordConfirm = ref('')
const saving = ref(false)
const formMessage = ref('')
const formOk = ref(false)

async function savePassword () {
  formMessage.value = ''
  formOk.value = false
  if (password.value !== passwordConfirm.value) {
    formMessage.value = 'Passwords do not match.'
    return
  }
  saving.value = true
  try {
    await setPassword(password.value)
    password.value = ''
    passwordConfirm.value = ''
    formOk.value = true
    formMessage.value = 'Password saved. You can sign in with email and password.'
  } catch (e: unknown) {
    const err = e as Error
    formMessage.value = err?.message ?? 'Could not save password.'
  } finally {
    saving.value = false
  }
}
</script>
