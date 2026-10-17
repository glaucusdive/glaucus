<template>
  <div class="flex flex-col gap-3 rounded-md border border-zinc-200 dark:border-zinc-700 p-4">
    <div v-if="!isSignedIn" class="flex flex-col gap-3">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">Sign in to leave a review for this divemaster.</p>
      <NuxtLink
        :to="authLink"
        class="inline-flex w-full justify-center rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-100 dark:hover:bg-zinc-50 sm:w-auto"
      >
        Sign in
      </NuxtLink>
    </div>

    <div v-else-if="!hasVerifiedEmail" class="flex flex-col gap-3">
      <p class="text-sm text-zinc-600 dark:text-zinc-400">
        Confirm your email address before leaving a review. Check your inbox, then refresh this page.
      </p>
      <Button type="button" variant="secondary" :disabled="sendingConfirmation" @click="resendConfirmationEmail">
        {{ sendingConfirmation ? 'Sending…' : 'Resend confirmation email' }}
      </Button>
      <p v-if="confirmationMessage" class="text-sm text-emerald-700 dark:text-emerald-300">{{ confirmationMessage }}</p>
      <p v-if="confirmationError" class="text-sm text-red-600 dark:text-red-400">{{ confirmationError }}</p>
    </div>

    <form v-else class="flex flex-col gap-3" @submit.prevent="handleSubmit">
      <h3 class="text-sm font-semibold text-zinc-900 dark:text-white">
        {{ isEditing ? 'Edit your review' : `Review ${displayName}` }}
      </h3>
      <fieldset class="flex flex-col gap-1">
        <legend class="text-xs font-medium uppercase text-zinc-700 dark:text-zinc-300">Rating</legend>
        <div class="flex items-center gap-1" role="group" aria-label="Rating">
          <button
            v-for="value in 5"
            :key="value"
            type="button"
            class="rounded-sm p-1 text-yellow-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            :aria-label="`${value} star${value === 1 ? '' : 's'}`"
            :aria-pressed="value <= rating"
            @click="rating = value"
          >
            <Star class="h-6 w-6" :class="value <= rating ? 'fill-current' : 'fill-none stroke-current text-zinc-400'" />
          </button>
          <span class="ml-1 text-sm text-zinc-600 dark:text-zinc-400">{{ rating }} / 5</span>
        </div>
      </fieldset>

      <label for="divemaster-review-body" class="text-xs font-medium uppercase text-zinc-700 dark:text-zinc-300">
        Comment
      </label>
      <textarea
        id="divemaster-review-body"
        v-model="body"
        rows="5"
        maxlength="5000"
        required
        class="w-full resize-y rounded-md border border-zinc-300 bg-white p-3 text-sm text-zinc-900 outline-none focus:border-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
        placeholder="Share your experience…"
      />
      <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400">{{ submitError }}</p>
      <div class="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" :disabled="submitting || !body.trim()">
          {{ submitting ? 'Saving…' : (isEditing ? 'Update review' : 'Submit review') }}
        </Button>
        <Button v-if="isEditing" type="button" variant="secondary" :disabled="submitting" @click="emit('cancel')">
          Cancel
        </Button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { saveDivemasterReview } from '~/composables/useDivemasterReviews'

const props = withDefaults(defineProps<{
  username: string
  displayName: string
  initialRating?: number | null
  initialBody?: string
  isEditing?: boolean
}>(), {
  initialRating: null,
  initialBody: '',
  isEditing: false
})

const emit = defineEmits<{
  submitted: []
  cancel: []
}>()

const { isSignedIn, user, accessToken } = useAuth()
const { client } = useSupabase()
const authLink = computed(() => `/auth?redirect=${encodeURIComponent(`/divemaster/${props.username}`)}`)
const hasVerifiedEmail = computed(() =>
  !!user.value?.email?.trim() && !!(user.value?.email_confirmed_at || user.value?.confirmed_at)
)

const rating = ref(props.initialRating && props.initialRating >= 1 && props.initialRating <= 5
  ? props.initialRating
  : 5)
const body = ref(props.initialBody)
const submitting = ref(false)
const submitError = ref('')
const sendingConfirmation = ref(false)
const confirmationMessage = ref('')
const confirmationError = ref('')

watch(() => props.initialRating, (value) => {
  if (typeof value === 'number' && value >= 1 && value <= 5) rating.value = value
})
watch(() => props.initialBody, (value) => {
  body.value = value || ''
})

async function handleSubmit () {
  submitError.value = ''
  const token = accessToken.value
  const comment = body.value.trim()
  if (!token || !hasVerifiedEmail.value) {
    submitError.value = 'Sign in with a confirmed email address to submit a review.'
    return
  }
  if (!comment) {
    submitError.value = 'Please enter a comment.'
    return
  }

  submitting.value = true
  try {
    await saveDivemasterReview(props.username, token, { rating: rating.value, body: comment })
    emit('submitted')
  } catch (cause) {
    submitError.value = cause instanceof Error ? cause.message : 'Could not save review.'
  } finally {
    submitting.value = false
  }
}

async function resendConfirmationEmail () {
  const email = user.value?.email?.trim()
  if (!email) return
  sendingConfirmation.value = true
  confirmationMessage.value = ''
  confirmationError.value = ''
  try {
    const { error } = await client.auth.resend({ type: 'signup', email })
    if (error) throw error
    confirmationMessage.value = 'Confirmation email sent. Follow its link, then refresh this page.'
  } catch (cause) {
    confirmationError.value = cause instanceof Error ? cause.message : 'Could not resend confirmation email.'
  } finally {
    sendingConfirmation.value = false
  }
}
</script>