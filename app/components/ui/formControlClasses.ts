/** Shared form control utilities — plain strings so Tailwind v4 detects them at build time. */

function cx (...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/** Default light/dark field surface (border + bg + text). */
const surface =
  'border border-zinc-300 bg-white text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-white'

/** Softer / muted field surface. */
const surfaceMuted =
  'border border-zinc-200 bg-zinc-50 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'

/** Disabled text — zinc-300 in light and dark. */
const disabledText = 'disabled:text-zinc-600 disabled:font-bold disabled:cursor-not-allowed'

const inputBase = cx('w-full', surface, disabledText)
const inputMutedBase = cx('w-full rounded-md p-2 text-sm', surfaceMuted, disabledText)

export const formInputClass = cx(inputBase, 'rounded-md px-2 py-1.5 text-sm')
export const formInputSmClass = cx(inputBase, 'h-9 rounded px-2 text-sm leading-none')
export const formInputMdClass = cx(inputBase, 'rounded-md px-3 py-2 text-sm')
export const formInputLgClass = cx(inputBase, 'rounded-md p-4 text-lg')
export const formInputMutedClass = inputMutedBase

export const formFocusRingClass =
  'outline-none placeholder-zinc-500 focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500'

const textareaBase = cx('w-full rounded-md px-2 py-1.5 text-sm', surface)
const textareaMutedBase = cx('w-full rounded-md p-2 text-sm', surfaceMuted)

export const formTextareaClass = textareaBase
export const formTextareaMutedClass = textareaMutedBase
export const formTextareaResizeClass = 'min-h-[120px] resize-y'
export const formTextareaNoResizeClass = 'resize-none'

export const formSelectClass = cx('h-9 w-full rounded px-2 text-sm leading-tight', surface)
export const formSelectXsClass = cx(
  'h-8 min-w-[7.5rem] rounded px-2 text-xs leading-tight',
  surface
)
export const formSelectMutedClass = cx('w-full rounded-md p-2 text-sm', surfaceMuted)

export const formFieldsetClass = 'flex flex-col gap-2 p-2'
export const formFieldsetEmbeddedClass = 'flex flex-col gap-1 rounded-md p-2'
export const formFieldsetWideClass = 'gap-2'

export const formFieldClass = 'flex w-full flex-col gap-2'
export const formFieldStackedClass = 'flex w-full flex-col gap-2'

const labelMuted = 'text-zinc-600 dark:text-zinc-400'
const labelStrong = 'text-zinc-900 dark:text-white'

export const formLabelClass = cx('block text-xs font-medium', labelMuted)
export const formLabelSectionClass = cx('text-xs font-medium uppercase', labelStrong)
export const formLabelSubClass = cx('text-xs', labelMuted)
export const formLabelAuthClass = 'text-xs font-medium text-zinc-700 dark:text-zinc-300'
export const formLabelUppercaseClass =
  'text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400'

export const formCheckboxRowClass =
  'flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50'

export const formCheckInputClass = 'cursor-pointer'
