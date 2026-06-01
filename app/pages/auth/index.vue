<template>
    <div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 flex items-center justify-center">
      <div class="w-full max-w-md space-y-6">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white text-center">
          {{ isSignUp ? 'Create account' : 'Sign in' }}
        </h1>

        <div v-if="message" class="p-3 rounded-md text-sm" :class="messageClass">
          {{ message }}
        </div>

        <!-- Google -->
        <button type="button" @click="handleGoogle"
          class="w-full flex items-center justify-center gap-2 py-3 px-4 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700  cursor-pointer font-medium">
          <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        </button>

        <div class="relative">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-zinc-300 dark:border-zinc-600" /></div>
          <div class="relative flex justify-center text-sm"><span class="px-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400">or</span></div>
        </div>

        <!-- Email form -->
        <form @submit.prevent="handleEmail" class="space-y-3">
          <div v-if="isSignUp" class="flex flex-col gap-1">
            <FormField label="Display name (optional)" label-style="auth" field-id="displayName">
              <FormInput
                id="displayName"
                v-model="displayName"
                type="text"
               
                size="md"
                focus-ring
                autocomplete="name"
              />
            </FormField>
          </div>
          <FormField label="Email" label-style="auth" field-id="email">
            <FormInput
              id="email"
              v-model="email"
              type="email"
             
              size="md"
              focus-ring
              required
              autocomplete="email"
              placeholder="you@example.com"
            />
          </FormField>
          <FormField v-if="!magicLinkOnly" label="Password" label-style="auth" field-id="password">
            <FormInput
              id="password"
              v-model="password"
              type="password"
             
              size="md"
              focus-ring
              :required="!magicLinkOnly"
              autocomplete="password"
            />
          </FormField>
          <div class="flex flex-col gap-2">
            <button type="submit" :disabled="loading"
              class="w-full py-3 px-4 rounded-md bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 cursor-pointer ">
              {{ loading ? 'Please wait…' : (magicLinkOnly ? 'Send magic link' : (isSignUp ? 'Sign up' : 'Sign in')) }}
            </button>
            <button v-if="!magicLinkOnly" type="button" @click="magicLinkOnly = true"
              class="w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
              Use magic link instead
            </button>
            <button v-else type="button" @click="magicLinkOnly = false"
              class="w-full text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer">
              Use password instead
            </button>
          </div>
        </form>

        <p class="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <NuxtLink v-if="isSignUp" to="/auth" class="underline hover:no-underline">Already have an account? Sign in</NuxtLink>
          <NuxtLink v-else to="/auth/signup" class="underline hover:no-underline">Create an account</NuxtLink>
        </p>
      </div>
    </div>
</template>

<script setup lang="ts">
import { normalizeAuthRedirect } from '~/utils/authRedirect'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const isSignUp = computed(() => route.path === '/auth/signup' || route.query.signup === '1')

const { signInWithGoogle, signUpWithEmail, signInWithEmail, signInWithMagicLink } = useAuth()
const { capture, AnalyticsEvents } = useAnalytics()

function authRedirectTarget (): string {
  return normalizeAuthRedirect(route.query.redirect as string | undefined)
}

const email = ref('')
const password = ref('')
const displayName = ref('')
const magicLinkOnly = ref(false)
const loading = ref(false)
const message = ref('')
/** success = green, error = red, caution = amber (e.g. email may already exist — Supabase returns no error) */
const messageKind = ref<'success' | 'error' | 'caution'>('success')

const messageClass = computed(() => {
  switch (messageKind.value) {
    case 'success':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
    case 'caution':
      return 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-100'
    default:
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
  }
})

function setMessage (text: string, kind: 'success' | 'error' | 'caution' = 'success') {
  message.value = text
  messageKind.value = kind
}

async function handleGoogle () {
  loading.value = true
  message.value = ''
  try {
    const redirect = authRedirectTarget()
    await signInWithGoogle(redirect)
  } catch (e: unknown) {
    const err = e as Error
    setMessage(err?.message ?? 'Sign in with Google failed', 'error')
  } finally {
    loading.value = false
  }
}

async function handleEmail () {
  loading.value = true
  message.value = ''
  try {
    if (magicLinkOnly.value) {
      await signInWithMagicLink(email.value)
      setMessage('Check your email for the sign-in link.', 'success')
    } else if (isSignUp.value) {
      const signupData = await signUpWithEmail(email.value, password.value, displayName.value || undefined)
      if (signupData.obfuscatedDuplicate) {
        setMessage(
          'This email may already be registered (for example with Google). Use “Continue with Google” or sign in. If you are new here, check spam or try again in a few minutes.',
          'caution'
        )
      } else {
        capture(AnalyticsEvents.AUTH_SIGNED_UP, { method: 'email' })
        setMessage('Check your email to confirm your account, then sign in.', 'success')
      }
    } else {
      await signInWithEmail(email.value, password.value)
      await router.push(authRedirectTarget())
    }
  } catch (e: unknown) {
    const err = e as Error
    setMessage(err?.message ?? 'Something went wrong', 'error')
  } finally {
    loading.value = false
  }
}
</script>
