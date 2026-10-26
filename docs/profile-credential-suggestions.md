# Profile Credential Suggestions

## Scope

Last formal training and certification-name pickers in owner Settings, inline profile editing, and the admin profile editor support typo-tolerant suggestions and a persistent Not listed action. Location/TomTom, chat, directory search, and the separate [pending dive-site search/submission workflow](dive-master-plan.md#pending-dive-site-work) are unchanged. Dive-site creation/moderation is not implemented by this credential feature.

Personal training/certifications remain self-reported profile text. Approval of a shared label is **not** verification of a person's certification, certification number, training history, or agency membership.

New certifications added to a published divemaster profile are separately moderated as profile content. Existing certifications stay approved when edited; a new certification is visible to its owner as **Pending review** and hidden from public profiles until approved. This review does not verify the person's identity or credential with the issuing agency.

In the owner profile editor, new and pending certification-name chips show a **· Pending** suffix, rejected entries show **· Rejected**, and approved entries have no status suffix. These labels do not change the saved certification name.

## Picker Behavior

- Existing substring matches appear first. Fuse.js supplies similar matches only when there are no normal matches and the search has at least three characters. Similar matches are labeled; no value is selected automatically.
- Certification options retain agency identity. The same name from different agencies remains distinct, and choosing an agency-specific result sets both fields. Existing saved names/agency text remain readable even when absent from suggestions.
- Not listed stays outside filtered results. It opens a dialog with the typed name and current agency prefilled. Certification additions require an existing agency; training additions do not.
- Users may choose an existing match or use a custom name. The explicit **Suggest for the shared list (admin review)** checkbox controls the shared submission. Unchecking it permits a personal-only entry with no catalog write. Choosing Use on profile changes the local draft; existing Save persists the personal profile.
- Shared submission is a separate, explicit write. Cancel before submitting creates nothing. Cancelling the profile after submitting does not withdraw the catalog suggestion. There is no blind POST/PATCH retry.
- Existing training Other/free-text entries remain supported. This feature does not create rows in the shop-course table or require a course level.

## Data And Permissions

- `profile_credential_catalog`: approved names, kind (`training` or `certification`), agency, and explicitly reviewed aliases. Anonymous/authenticated callers can read catalog fields; direct catalog writes are not granted to them.
- `profile_credential_submissions`: proposed name/agency, creator, pending/approved/merged/rejected state, resolution and private review audit. Authenticated users can read their own requests; admins can read the queue. Other users and anonymous callers cannot read submissions.
- `submit_profile_credential`: derives the caller from `auth.uid()`, checks required agency and name constraints, reuses approved exact names or the caller's repeated identical submission, and limits pending submissions to ten per user plus ten new requests per minute. The RPC serializes per-user submissions so direct calls cannot bypass identity or quota checks.
- `review_profile_credential`: checks `is_app_admin()`, locks the pending request, and approves, merges or rejects atomically. Certification merges preserve agency boundaries. Rejected requests require a reason; reviewed requests cannot be replayed as new decisions. An alias is added only on an explicit admin choice.
- Existing curated training names remain available. The migration copies the existing shop-course names/agency pairs as the initial credential catalog baseline; this does not verify individual credentials or assert a new human review of imported labels. After deployment, profile certification suggestions read this catalog, not the live course table. Later course writes cannot bypass the suggestion queue. Existing shop-course permissions and business workflows are unchanged.

## Admin Review

Open `/admin/profile-credential-submissions` through **Credential suggestions** in the admin menu. The queue supports status filtering and 50-item pagination.

- Approve adds or reuses a shared name and shows existing candidate matches first.
- Merge resolves to an existing name in the same kind/agency. For training, the existing curated list is also eligible. Approving the proposed name as an alias is a separate unchecked-by-default choice.
- Reject records a private reason without publishing the label.
- Personal profile text is not rewritten by a catalog merge or rejection. Existing public profile publication and approval rules are unchanged.

For newly added personal credentials (rather than shared catalog labels), use `/admin/divemaster-certifications`. Approving one publishes that certification on its owner's profile; rejecting it leaves it private to the owner.

## Endpoints

| Endpoint | Access | Purpose |
| --- | --- | --- |
| `GET /api/profile-credentials` | Public | Approved catalog fields only, bounded to 1,000 rows |
| `POST /api/settings/profile-credential-submissions` | Authenticated | Existing-name reuse or pending submission; kind/name/agency only |
| `GET /api/admin/profile-credential-submissions` | Admin | Paged private queue by status |
| `PATCH /api/admin/profile-credential-submissions/:id` | Admin | Explicit approve/merge/reject and optional alias approval |

Pending entries never appear in the public catalog endpoint. Authorization is checked before private reads or writes, and database RPC/RLS checks provide defense in depth. Review audit/creator identifiers are not added to public suggestion responses.

The initial catalog endpoint and existing course lookup are bounded; this is intended for compact profile credential lists, not an unbounded general-purpose course search API. Larger catalogs should move to paged server search rather than increasing browser downloads without review.

## Deployment

Apply [20261025130000_profile_credential_suggestions.sql](../supabase/migrations/20261025130000_profile_credential_suggestions.sql) using the [migration workflow](supabase-migrations.md). No remote migration is applied automatically by this implementation.

Until it is applied, existing base options and personal-only custom labels still work; shared submissions and the moderation queue fail closed. The legacy course read fallback is used only for a recognized missing catalog table, never permission or other errors. After the table exists, no live course-read fallback is used for profile suggestions. There is no fallback that inserts unreviewed shared entries or creates shop courses.

## Verification

- [Matching tests](../tests/shared/profileCredentialCatalog.test.ts) cover exact-first ranking, misspellings, short/unrelated queries, aliases, diacritics and agency separation.
- [Endpoint tests](../tests/server/profileCredentialSuggestions.test.ts) cover authentication, validation, duplicate reuse, lookup failure, merge targets and conflicts.
- [SQL tests](../tests/sql/profileCredentialSuggestions.test.ts) execute the migration in embedded PostgreSQL with synthetic roles/users/agencies. They verify RLS visibility, write denial, admin approval, same-agency merge, explicit aliases, rejection, repeated submissions, quotas and terminal review conflicts. They do not change a hosted database.
- Browser checks use synthetic picker values and personal-only choices. Real hosted-project deployment and authenticated review after migration are separate rollout checks.