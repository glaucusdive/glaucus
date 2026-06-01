export type FormControlVariant = 'admin' | 'panel'
export type FormControlSize = 'default' | 'sm' | 'md' | 'xs'

const ADMIN_INPUT_DEFAULT =
  'w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white'

const ADMIN_INPUT_SM =
  'h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-none text-zinc-900 dark:text-white'

const ADMIN_INPUT_MD =
  'w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-white'

const PANEL_INPUT =
  'h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-none outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white'

const PANEL_SELECT =
  'h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-tight outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white'

const PANEL_SELECT_MUTED =
  'h-10 min-h-10 w-full rounded-sm px-2 py-0 text-sm leading-tight outline-none hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 focus:bg-zinc-200 dark:focus:bg-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'

const FOCUS_RING =
  'outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500'

const PLACEHOLDER =
  'placeholder-zinc-500'

export const FORM_FIELDSET_GAP_WIDE = 'gap-2'

export const FORM_LABEL_CLASSES: Record<FormControlVariant, string> = {
  admin: 'mb-0.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400',
  panel: 'text-xs uppercase font-medium px-2 text-zinc-900 dark:text-white'
}

export const FORM_LABEL_AUTH_CLASSES =
  'text-xs font-medium text-zinc-700 dark:text-zinc-300'

export const FORM_LABEL_UPPERCASE_CLASSES =
  'text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400'

export type FormLabelStyle = 'default' | 'auth' | 'uppercase'

export const FORM_SUBLABEL_CLASSES =
  'text-xs px-2 text-zinc-600 dark:text-zinc-400'

export const FORM_CHECKBOX_ROW_CLASSES =
  'flex items-center gap-2 p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 rounded-sm cursor-pointer'

export function formFieldWrapperClasses (variant: FormControlVariant): string {
  return variant === 'admin' ? 'block w-full' : 'flex flex-col gap-1'
}

export function formFieldLabelClasses (
  variant: FormControlVariant,
  opts: { labelStyle?: FormLabelStyle; labelTone?: 'default' | 'sub' } = {}
): string {
  if (opts.labelTone === 'sub') return FORM_SUBLABEL_CLASSES
  if (opts.labelStyle === 'auth') return FORM_LABEL_AUTH_CLASSES
  if (opts.labelStyle === 'uppercase') return FORM_LABEL_UPPERCASE_CLASSES
  return FORM_LABEL_CLASSES[variant]
}

export function formInputClasses (
  variant: FormControlVariant,
  opts: { size?: FormControlSize; focusRing?: boolean; muted?: boolean } = {}
): string {
  const { size = 'default', focusRing = false, muted = false } = opts

  if (variant === 'panel') {
    return PANEL_INPUT
  }

  let base = ADMIN_INPUT_DEFAULT
  if (size === 'sm') base = ADMIN_INPUT_SM
  if (size === 'md') base = ADMIN_INPUT_MD

  if (muted) {
    base = 'rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white'
  }

  if (focusRing) {
    return [base, FOCUS_RING, PLACEHOLDER].join(' ')
  }

  return base
}

export function formTextareaClasses (
  variant: FormControlVariant,
  opts: { focusRing?: boolean; muted?: boolean; resize?: boolean } = {}
): string {
  const { focusRing = false, muted = false, resize = true } = opts

  if (variant === 'panel') {
    return [
      'rounded-sm w-full p-2 outline-none dark:bg-zinc-900 hover:bg-zinc-200/50 dark:hover:bg-zinc-900 focus:bg-zinc-200 dark:focus:bg-zinc-900 bg-white text-zinc-900 dark:text-white text-sm',
      resize ? 'resize-y min-h-[120px]' : 'resize-none'
    ].join(' ')
  }

  let base = ADMIN_INPUT_DEFAULT
  if (muted) {
    base = 'rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white'
  }

  const parts = [base]
  if (focusRing) parts.push(FOCUS_RING)
  if (resize && variant === 'admin' && !muted) {
    // drawer textarea: no extra resize classes
  } else if (resize) {
    parts.push('resize-y min-h-[100px]')
  }

  return parts.join(' ')
}

export function formSelectClasses (
  variant: FormControlVariant,
  opts: { size?: FormControlSize; muted?: boolean; focusRing?: boolean } = {}
): string {
  const { size = 'default', muted = false, focusRing = false } = opts

  if (variant === 'panel') {
    return muted ? PANEL_SELECT_MUTED : PANEL_SELECT
  }

  let base = 'h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-tight text-zinc-900 dark:text-white'
  if (size === 'sm') {
    base = 'h-9 w-full rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-sm leading-tight text-zinc-900 dark:text-white'
  }
  if (size === 'xs') {
    base = 'h-8 min-w-[7.5rem] rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 text-xs leading-tight text-zinc-900 dark:text-white'
  }
  if (muted) {
    base = 'rounded-md w-full p-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white'
  }
  if (focusRing) {
    return [base, FOCUS_RING].join(' ')
  }
  return base
}

export function formCheckboxClasses (_variant: FormControlVariant): string {
  return 'cursor-pointer'
}

export function formRadioClasses (_variant: FormControlVariant): string {
  return 'cursor-pointer'
}

export type ButtonVariant = 'primary' | 'secondary' | 'danger'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

export function formButtonClasses (variant: ButtonVariant = 'secondary'): string {
  switch (variant) {
    case 'primary':
      return `${BUTTON_BASE} bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5`
    case 'danger':
      return `${BUTTON_BASE} border border-red-600 dark:border-red-500 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2.5 py-1`
    default:
      return `${BUTTON_BASE} border border-zinc-300 dark:border-zinc-600 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5`
  }
}
