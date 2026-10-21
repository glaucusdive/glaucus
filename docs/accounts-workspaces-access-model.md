# Accounts, Workspaces, And Access Model

**Status:** Proposed discussion record, 2026-10-20. This document captures the intended organization of customer and internal users. It does not implement new roles, grant permissions, create tables, or change existing authorization.

## Current Baseline

The client currently exposes a single `standard` / `divemaster` / `admin` role from `profiles.role` through [useAuth.ts](../app/composables/useAuth.ts). Existing profile ownership, business portal workflows, admin checks, and database policies must be inventoried before introducing this proposal. Do not assume the conceptual relationships below already exist in the schema.

See [the divemaster implementation](dive-master-plan.md#current-implementation) for current profile editing and publishing behavior. Publication, email confirmation, and credential verification are separate states, not substitutes for authorization roles.

## One Account, Multiple Capabilities

Do not force a person into one exclusive customer type or create duplicate accounts for their different activities. A person can be a diver, a dive professional, and an owner or manager of multiple businesses at the same time.

| Capability | Purpose | Typical activities |
| --- | --- | --- |
| Diver / User | Base signed-in customer experience | Explore, book, manage own diver details and booking history, write eligible reviews |
| Dive Professional | Optional professional profile in addition to diver activities | Manage own professional profile, view received reviews and business affiliations |
| Business Manager | Authorized access to particular businesses in addition to personal activities | Manage assigned business profiles and explicitly permitted operational workflows |

A business manager need not be a dive professional. A professional remains able to use ordinary diver workflows. This proposal does not remove existing guest browsing or booking paths; each action retains its own authentication requirements.

## Separate Management From Employment

Use two independent many-to-many relationships, not one combined team/role list:

| Relationship | Conceptual record | Meaning |
| --- | --- | --- |
| Account to business access | Business, account, permission such as owner/manager/editor, invitation/acceptance/revocation state, actor and timestamps | Who may administer this specific business and which actions they may perform |
| Professional to business affiliation | Business, professional profile, job title, start/end month, current/historical state, confirmation and public visibility/consent | Who works or worked with this business, independently of management access |

These are conceptual contracts, not finalized table or enum names. An account may have an optional professional profile; each business may have multiple management accounts and many professional affiliations. A professional may be affiliated with several businesses over time or concurrently.

For example, one professional can own Business A, manage Business B, and work for Business C. Access to A must not grant access to B or C. Employment at C does not grant management rights there. Similarly, an existing past-job link to a dive shop does not automatically create a confirmed affiliation or permission grant.

### Ownership And Business Boundaries

- Verify authority through an approved business-claim or invitation process before assigning initial owner access. A product permission named Owner is not itself proof of independently verified legal ownership.
- Define owner transfer and final-active-owner protection before implementing removal or revocation.
- Decide how business organizations, brands, and operating locations relate before assigning membership scope. Several locations are not necessarily separate businesses; several businesses are not necessarily branches of one organization.
- Keep memberships, affiliations, and their permission/visibility effects explicit; ending employment must not silently determine ownership or account access.

### Employment, Consent, And Payroll

An affiliation can represent employment, contract work, or a team association. It is not proof of payroll participation, salary, legal employment status, or verified professional credentials.

- Keep self-reported job history distinct from mutually confirmed business affiliations.
- Obtain the professional's consent before publicly listing a team association. Do not label a unilateral assertion as verified employment.
- Keep salaries, contracts, payroll records, and private employment details out of public profiles and the initial scope of this model.
- Ending an affiliation, hiding it publicly, and revoking management access are separate actions with separate authorization and audit requirements.

## Invitations And Access Lifecycle

Management invitations and professional-affiliation invitations are distinct. Each must identify the target business, intended relationship, inviter's authority, and recipient acceptance. Do not grant access merely because an email address was entered or a professional was named in a team list.

Define pending, accepted, expired, declined, and revoked behavior before implementation. Record who invited, accepted, changed permissions, transferred ownership, or revoked access, and when. Reject self-escalation and unauthorized assignments. Revocation must take effect in server authorization, not just remove a navigation item.

Public team visibility requires its own consent policy, even after management access or an employment association has been accepted. Internal operational data stays private to specifically authorized actors.

## Workspace And Navigation Design

Use a shared public experience with additional workspaces only when applicable:

| Workspace | Audience | Content |
| --- | --- | --- |
| Explore / Personal | Everyone, with action-specific sign-in requirements | Search, own bookings, personal diver details and eligible reviews |
| My Professional Profile | Account with a professional profile | Preview/edit, publication status, received reviews, professional affiliations |
| My Businesses | Account with accepted business memberships | Business selector and permitted actions for the selected business |
| Admin Console | Explicitly authorized internal staff | Assigned moderation, support, access administration or operational tools |

Keep account security, notifications, and personal information in shared Settings rather than duplicating them across workspaces. Keep the selected business visibly identified in its workspace and revalidate permissions when context or membership changes.

Each business workspace should have separate sections:

- **Team:** professional affiliations and their confirmation/visibility state.
- **Access:** account memberships and management permissions.

Professional profile editing is not business administration. Hiding a workspace or switching its selected business must never be treated as authorization. Handle revoked access without exposing the previously selected business's private data.

## Internal Staff And Environments

Staff permissions are separate from customer capabilities and business memberships. The following are proposed responsibility groups, not implemented role names:

| Assignment | Intended responsibilities | Boundary |
| --- | --- | --- |
| Moderator | Review reports, hide content, approve profiles when specifically permitted | No automatic business ownership or unrestricted customer-data access |
| Support | Resolve customer issues using the minimum necessary information | Explicit action/data grants; no default full database or payment access |
| App Admin | Authorized access assignments, approvals, moderation and operational configuration | Privileged changes must be auditable; infrastructure access is separate |
| Developer | Build, debug and deploy in assigned environments | No automatic production app-admin privileges or production-data access |
| Tester / QA | Test persona workflows and regression scenarios | Staging/synthetic fixtures by default; no automatic production privileges |

Developer and tester are primarily team/environment assignments, not public-facing customer types. The same person can have a staff assignment and customer capabilities, but must use the correct context and authorization for each action.

Test using ordinary diver, professional, and scoped business-member accounts. Passing tests with an admin account that bypasses ownership checks does not establish customer access control. Test mode is not a security boundary. Any necessary production elevation must be explicit, limited, audited, and revoked when no longer needed.

## Authorization Layers

Evaluate capabilities, accepted resource-scoped membership, and explicit staff permissions independently, together with ownership and applicable account/publication states. Do not implement them as one expanding list of mutually exclusive user types.

The server and Supabase RLS must enforce every sensitive read and write. Never trust a client-selected workspace, visible role badge, arbitrary business/user ID, or hidden menu as proof of permission. Deny unresolved permissions; protect assignment/revocation operations; omit private account, booking, contact, and employment records from public APIs.

### Illustrative Action Matrix

This is a starting point for a detailed permission matrix, not a grant of access or a final owner/manager/editor policy.

| Action | Required relationship or authority |
| --- | --- |
| Read a public professional/business profile | Existing publication and public-field rules |
| Manage personal settings and own booking details | Authenticated account ownership and existing action-specific rules |
| Edit a professional profile | Profile owner under existing edit/publication rules, or explicitly authorized staff |
| Edit business public information | Accepted membership in that business with an explicit edit permission |
| Grant/revoke business access or transfer ownership | Authorized owner/access administrator for that business; never default editor access |
| Invite/confirm a professional affiliation | Authorized business representative and the professional's acceptance for a mutually confirmed association |
| Publish a professional's team association | Approved visibility/consent policy in addition to affiliation state |
| Review another business/professional | Existing authentication, email-verification, self-review and conflict-of-interest policy; ownership is not a bypass |
| Moderate someone else's review | Explicit moderator/admin permission, not business or professional ownership |
| View private business bookings/contact records | Specifically approved operational permission scoped to that business; not all members by default |
| Administer production | Explicit application/infrastructure permissions as appropriate, not merely Developer or Tester assignment |

## Decisions Before Implementation

1. Inventory current roles, admin checks, profile ownership/RLS, partner-token access, and multi-location business identity. Preserve compatible customer workflows during migration.
2. Define a concrete action/data permission matrix for business owner/manager/editor and actual staff responsibilities. Introduce finer staff roles only when needed.
3. Agree on business claims, invitations, professional consent, employment assertions, ownership transfer, revocation, auditing, and internal data access.
4. Design schema/policies and a staged migration from the current single-role shape. Do not rewrite role enums or infer memberships from historical job text without a separately approved plan.
5. Verify cross-business isolation, pending/revoked invitations, affiliation without management access, combined professional/business capabilities, final-owner protection, public/private field boundaries, ordinary persona workflows, and revoked workspace access.

No schema, authorization, UI, migration, or deployment verification is claimed by documenting these decisions. Payroll processing, HR systems, salary storage, and broad production access are outside this proposal.

## Related Documentation

- [Documentation map](../README.md#documentation)
- [Divemaster current implementation and broader proposal](dive-master-plan.md)
- [Divemaster review flow](divemaster-review-flow.md)
- [Shop review flow](shop-review-flow.md)
- [Business multi-location audit](diveshop-multi-location-audit.md) and [fix plan](diveshop-multi-location-fix-plan.md)
- [Implementation log](implementation-log.md)