/**
 * Layout slot under the default shell card.
 *
 * Auth centering lives HERE, not on `/auth`. The page is only the form.
 * `flex-1` + `place-items-center` on the page keeps breaking: NuxtPage /
 * Suspense / extra wrappers sit between the slot and the page, so the page
 * is no longer a flex child and collapses to content height (form sticks
 * to the top). Grid on this slot still has a real height from the card.
 *
 * Grid + overflow-y-auto (not flex + justify-center) so a tall form can
 * scroll without clipping the top.
 */
export function shellPageSlotClass (isAuthRoute: boolean): string {
  const base = 'min-h-0 min-w-0 flex-1'
  if (isAuthRoute) return `${base} grid place-items-center overflow-y-auto`
  return `${base} flex flex-col`
}
