## Plan: Dive Professional Directory ADR

**Proposed decision:** Add a public directory for all dive professionals, with chat-first profile creation, admin-approved publishing, independent reviews, and a private contact form. Reuse Nuxt, Supabase, and the existing AI/email integrations.

**Profile Experience**
- Shareable pages with photo, biography, roles, locations, languages, specialties, experience, certifications, achievements, and associations.
- LinkedIn, Facebook, portfolio, and other useful links.
- Directory filters for location, role, language, and specialty.
- Certifications clearly labeled **self-reported** unless separately verified. Profile approval does not imply credential verification.

**Easy Onboarding**
- Start with “Tell us about yourself and your diving work.”
- Extract several profile sections from free-form answers, then ask short follow-up questions.
- Allow optional sections to be skipped, save drafts, and resume later.
- Always offer a simple form editor and profile preview.
- Require explicit submission for admin review. The chatbot cannot publish, invent qualifications, or verify credentials.

**Privacy and Contact**
- Keep public professional profiles separate from private account and booking data.
- No public email addresses or phone numbers, including in profile text or platform contact links.
- Visitors submit their name, email, and message through a protected contact form.
- Share the sender’s email privately with the professional for replies.
- Ordinary replies may reveal the professional’s email privately; this is **public privacy, not two-way anonymity**.
- External social profiles remain outside Glaucus’s privacy controls.

**Publishing and Reviews**
- Admins approve profiles before publication.
- Subsequent edits await approval while the previous approved profile stays public.
- Owners can unpublish; admins can suspend.
- Signed-in divers can review professionals, but cannot review themselves.
- Reviews support reporting and admin moderation. Professionals cannot remove unfavorable reviews themselves.

**Architecture**
Reuse authentication from [useAuth.ts](app/composables/useAuth.ts), structured extraction patterns from [interpretUserTurn.ts](server/utils/interpretUserTurn.ts), and the existing shop-submission approval model.

Create a dedicated profile orchestrator rather than extending the booking agent. Document its tools, server-controlled selection, bounded retries, saved draft ownership, and explicit submission boundary. Contact delivery needs durable abuse controls and duplicate-send protection beyond the current [inquiry endpoint](server/api/shop-inquiry.post.ts).

**Delivery Steps**
1. Write a **Proposed ADR** covering these decisions, alternatives, consequences, privacy boundaries, and the agent contract.
2. Document the implementation order: data/access controls first; onboarding, directory, and moderation next; reviews and contact delivery afterward.
3. Define verification for private-data exposure, unauthorized publication, model failures, review abuse, duplicate emails, and mobile usability.

**Excluded Initially**
Feeds, connections, payments, in-app messaging, social-profile scraping, automated credential verification, and certificate-document uploads. Structured certification details remain included.
