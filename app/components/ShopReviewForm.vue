<template>
  <div :class="embedded ? 'flex flex-col min-h-0' : 'flex flex-col h-full min-h-0'">
    <div
      v-if="!embedded"
      class="w-full h-10 lg:h-18 p-1 border-b border-zinc-300 dark:border-zinc-700 shrink-0 flex items-center"
    >
      <div class="w-full flex items-center justify-between px-2 overflow-auto">
        <h2 class="text-base font-medium truncate text-zinc-900 dark:text-white">
          {{ isEditing ? 'Edit review' : 'Review' }} · {{ shopName }}
        </h2>
        <button type="button" class="lg:p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-sm  cursor-pointer text-zinc-900 dark:text-white" @click="closeDrawer">
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>

    <div :class="embedded ? 'w-full' : 'w-full flex-1 min-h-0 overflow-y-auto p-2'">
      <div v-if="!isSignedIn" class="flex flex-col gap-3 p-2">
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to leave a review for this dive shop.
        </p>
        <NuxtLink
          :to="authLink"
          class="inline-flex justify-center rounded-md border border-zinc-900 dark:border-zinc-100 py-2 px-4 text-sm font-medium text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          @click="onAuthLinkClick"
        >
          Sign in
        </NuxtLink>
      </div>

      <div v-else-if="!hasVerifiedEmail" class="flex flex-col gap-3 p-2">
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Confirm your email address before leaving a review. Check your inbox for the confirmation link, then refresh this page.
        </p>
        <Button
          type="button"
          variant="secondary"
          :disabled="sendingConfirmation"
          @click="resendConfirmationEmail"
        >
          {{ sendingConfirmation ? 'Sending…' : 'Resend confirmation email' }}
        </Button>
        <p v-if="confirmationMessage" class="text-sm text-emerald-700 dark:text-emerald-300 px-1">{{ confirmationMessage }}</p>
        <p v-if="confirmationError" class="text-sm text-red-600 dark:text-red-400 px-1">{{ confirmationError }}</p>
      </div>

      <form v-else class="flex flex-col gap-2" @submit.prevent="handleSubmit">
        <fieldset class="flex flex-col gap-1">
          <!-- Use a normal block label, not <legend>: legends are laid out on the fieldset border and sit outside flex padding -->
          <label id="review-rating-label" class="text-xs uppercase font-medium px-1 text-zinc-900 dark:text-white">Rating</label>
          <div class="flex items-center gap-1 px-1" role="group" aria-labelledby="review-rating-label">
            <button
              v-for="n in 5"
              :key="n"
              type="button"
              class="p-1 rounded-sm hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 cursor-pointer text-zinc-900 dark:text-yellow-500"
              :aria-pressed="n <= rating"
              @click="rating = n"
            >
              <Star class="w-6 h-6" :class="n <= rating ? 'fill-current' : 'fill-none stroke-current text-zinc-400'" />
            </button>
            <span class="text-sm text-zinc-600 dark:text-zinc-400 ml-1">{{ rating }} / 5</span>
          </div>
        </fieldset>

        <FormFieldset label="Comment" field-id="review-body" embedded wide-gap>
          <FormTextarea
            id="review-body"
            v-model="body"
           
            :rows="6"
            required
            minlength="1"
            placeholder="Share your experience…"
          />
        </FormFieldset>

        <p v-if="submitError" class="text-sm text-red-600 dark:text-red-400 px-1">{{ submitError }}</p>

        <Button
          type="submit"
          variant="secondary"
          :disabled="submitting || deleting || !body.trim()"
        >
          {{ submitting ? 'Saving…' : (isEditing ? 'Update review' : 'Submit review') }}
        </Button>

        <Button
          v-if="isEditing && reviewId"
          type="button"
          variant="danger"
          :disabled="submitting || deleting"
          @click="handleDelete"
        >
          {{ deleting ? 'Deleting…' : 'Delete review' }}
        </Button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { X, Star } from 'lucide-vue-next'
import { useDrawer } from '~/composables/useDrawer'
import { useAuth } from '~/composables/useAuth'
import { useSupabase } from '~/composables/useSupabase'
import { saveShopReview, deleteShopReview } from '~/composables/useShopReviews'

const props = defineProps({
  shopId: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    default: 'Dive shop'
  },
  shopSlug: {
    type: String,
    default: ''
  },
  initialRating: {
    type: Number,
    default: null
  },
  initialBody: {
    type: String,
    default: ''
  },
  isEditing: {
    type: Boolean,
    default: false
  },
  reviewId: {
    type: String,
    default: null
  },
  /** Called after successful save */
  onSubmitted: {
    type: Function,
    default: null
  },
  /** Called after successful delete */
  onDeleted: {
    type: Function,
    default: null
  },
  /** When true: no drawer header/close; submit/delete do not close the layout drawer */
  embedded: {
    type: Boolean,
    default: false
  }
})

const { closeDrawer } = useDrawer()
const { isSignedIn, user, accessToken } = useAuth()
const authLink = computed(() => {
  const lookup = props.shopSlug || props.shopId
  return `/auth?redirect=${encodeURIComponent(`/shops/${lookup}`)}`
})
const hasVerifiedEmail = computed(() =>
  !!user.value?.email?.trim() && !!(user.value?.email_confirmed_at || user.value?.confirmed_at)
)

function onAuthLinkClick () {
  if (!props.embedded) {
    closeDrawer()
  }
}
const { client } = useSupabase()

const rating = ref(typeof props.initialRating === 'number' && props.initialRating >= 1 && props.initialRating <= 5
  ? props.initialRating
  : 5)
const body = ref(props.initialBody ?? '')
const submitting = ref(false)
const deleting = ref(false)
const submitError = ref('')
const sendingConfirmation = ref(false)
const confirmationMessage = ref('')
const confirmationError = ref('')

watch(() => props.initialRating, (v) => {
  if (typeof v === 'number' && v >= 1 && v <= 5) rating.value = v
})
watch(() => props.initialBody, (v) => {
  if (typeof v === 'string') body.value = v
})

async function handleSubmit () {
  submitError.value = ''
  const token = accessToken.value
  if (!token || !hasVerifiedEmail.value) {
    submitError.value = 'Sign in with a confirmed email address to submit a review.'
    return
  }
  const trimmed = body.value.trim()
  if (!trimmed) {
    submitError.value = 'Please enter a comment.'
    return
  }
  submitting.value = true
  try {
    await saveShopReview(props.shopId, token, {
      rating: rating.value,
      body: trimmed
    })
    if (typeof props.onSubmitted === 'function') {
      props.onSubmitted()
    }
    if (!props.embedded) {
      closeDrawer()
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not save review.'
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
  } catch (e) {
    confirmationError.value = e instanceof Error ? e.message : 'Could not resend confirmation email.'
  } finally {
    sendingConfirmation.value = false
  }
}

async function handleDelete () {
  if (!props.reviewId) return
  if (!confirm('Delete this review permanently?')) return
  submitError.value = ''
  deleting.value = true
  try {
    await deleteShopReview(client, props.reviewId)
    if (typeof props.onDeleted === 'function') {
      props.onDeleted()
    }
    if (!props.embedded) {
      closeDrawer()
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Could not delete review.'
  } finally {
    deleting.value = false
  }
}
</script>
