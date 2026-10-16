<template>
  <SettingsPage
    title="Account security"
    description="Add a password so you can sign in with email when Google redirect isn’t available (for example local admin)."
    back-to="/settings"
  >
    <template #actions>
      <div class="flex items-center gap-4">
        <p
          v-if="formMessage"
          class="max-w-40 truncate text-sm sm:max-w-xs"
          :class="formOk ? 'text-green-400' : 'text-red-400'"
          :title="formMessage"
        >
          {{ formMessage }}
        </p>
        <Button
          type="submit"
          form="settings-password-form"
          variant="primary"
          :disabled="saving"
        >
          {{ saving ? 'Saving…' : (hasEmailPasswordAuth ? 'Update password' : 'Set password') }}
        </Button>
      </div>
    </template>

    <div class="divide-y divide-zinc-800">
      <section class="flex flex-col gap-4 p-4 lg:px-24 lg:py-12">
        <h2 class="text-base font-bold text-white">Signed-in email</h2>
        <p class="break-all text-sm text-white">
          {{ accountEmail || 'No email on this account' }}
        </p>
        <div>
          <p class="mb-1 text-xs font-medium text-zinc-400">
            Linked sign-in methods
          </p>
          <p
            v-if="linkedProviderLabels.length"
            class="text-sm text-zinc-300"
          >
            {{ linkedProviderLabels.join(' · ') }}
          </p>
          <p
            v-else
            class="text-sm text-zinc-400"
          >
            None listed yet
          </p>
          <p
            v-if="hasEmailPasswordAuth"
            class="mt-2 text-xs text-green-400"
          >
            Email and password sign-in is enabled for this account.
          </p>
          <p
            v-else
            class="mt-2 text-xs text-amber-400"
          >
            This account does not have a password yet. Set one below to enable email login.
          </p>
        </div>
      </section>

      <form
        id="settings-password-form"
        class="flex flex-col gap-4 p-4 lg:px-24 lg:py-12"
        @submit.prevent="savePassword"
      >
        <h2 class="text-base font-bold text-white">
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
        <p class="text-xs text-zinc-400">
          At least {{ minPasswordLength }} characters.
        </p>
      </form>
    </div>
  </SettingsPage>
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
