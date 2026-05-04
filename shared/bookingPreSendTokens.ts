/** Stable chip/message tokens for pre-send review and signup (orchestrator + client). */
export const BOOKING_PRESEND_CONFIRM_SEND = 'booking_presend:confirm_send'
export const BOOKING_PRESEND_OPEN_FORM = 'booking_presend:open_form'
export const BOOKING_PRESEND_SKIP_SIGNUP = 'booking_presend:skip_signup'
export const BOOKING_PRESEND_CREATE_ACCOUNT = 'booking_presend:create_account'

export const BOOKING_RESUME_SESSION_KEY = 'glaucus_booking_resume_v1'

/** Mid booking: user confirmed the assistant should use a pending verbatim line as contact name. */
export const BOOKING_CONTACT_USE_PENDING_VERBATIM = 'booking_contact:use_pending_verbatim'
/** Mid booking: user is not answering the name field — other intent (shop switch / browse). */
export const BOOKING_CONTACT_MEANT_SOMETHING_ELSE = 'booking_contact:meant_something_else'
