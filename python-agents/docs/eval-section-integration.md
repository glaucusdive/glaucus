# Evaluation & QC Integration with Broader Backlog

**How Section 4 Enables Sections 1–9**

---

## Section Dependencies

```
                           ┌─────────────────────────────────┐
                           │  Section 4 (Evaluation & QC)    │
                           │  (This doc defines framework)   │
                           └──────────────┬──────────────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
        ┌─────────────────────┐  ┌──────────────────┐  ┌─────────────────┐
        │  Section 1          │  │  Section 3       │  │  Section 5      │
        │  Architecture       │  │  Reliability     │  │  Observability  │
        │  (Clarified)        │  │  (Confidence     │  │  (Trace IDs +   │
        │                     │  │   gates enabled) │  │   eval logging) │
        └─────────────────────┘  └──────────────────┘  └─────────────────┘
                    │                     │                     │
                    │   ┌─────────────────┘                     │
                    │   │                                       │
                    ▼   ▼                                       ▼
        ┌──────────────────────────┐              ┌──────────────────────┐
        │  Section 2               │              │  Section 6           │
        │  Correctness/Hallucin    │              │  Security/Privacy    │
        │  (Baselines prevent      │              │  (Eval logs redacted)│
        │   regression)            │              │                      │
        └──────────────────────────┘              └──────────────────────┘
                    │                                         │
                    │         ┌───────────────────────────────┘
                    │         │
                    ▼         ▼
        ┌──────────────────────────┐
        │  Section 7               │
        │  Scalability/Cost        │
        │  (Token budgets, caching)│
        └──────────────────────────┘
                    │
                    ▼
        ┌──────────────────────────┐
        │  Section 8               │
        │  Release/Rollout         │
        │  (Eval checklist gates)  │
        └──────────────────────────┘
```

---

## How Eval Framework Unblocks Each Section

### Section 1: Architecture Clarifications

**What it was waiting for**: Confirmation that evaluation approach matches stated boundaries

**How Section 4 enables it**: 
- Confidence thresholds (§5) prove Python never guesses on high-risk fields
- Hallucination detector (§4.4) confirms Python → TS one-way flow
- Release checklist (§6) enforces "no writes from Python" at deployment time

**Action for team**: 
> After building eval infrastructure, add to README: "Eval gates ensure Python never writes; confidence thresholds gate all risky decisions."

---

### Section 2: Correctness & Hallucination Control

**What it was waiting for**: Specific metrics and guardrails

**How Section 4 enables it**: 
- NLU eval (§4.2): Goal extraction accuracy ≥ 95%
- Hallucination detector (§4.4): Shop names ≤ 1% false positive rate
- Confidence model (§5): Low-confidence paths trigger clarification
- Do-not-infer policy (§8): Explicit list of fields that must never be guessed

**Action for team**:
> Before moving to Section 2 (adding guardrails), use evals to measure baseline. Then guardrails can optimize around measured risks.

---

### Section 3: Reliability & Fail-Soft Behavior

**What it was waiting for**: Understanding which failures are acceptable vs. catastrophic

**How Section 4 enables it**: 
- Confidence gates (§5) determine when to clarify vs. execute
- Booking readiness eval (§4.5): F1 score tells you how often multi-turn flows complete
- Baseline thresholds (§2.1): Define acceptable degradation (e.g., latency p95 < 2s)

**Action for team**:
> Use eval results to populate retry/fallback logic. Example:
> ```typescript
> if (nluResult.confidence < 0.75) {
>   // Don't guess; ask for clarification instead
> }
> ```

---

### Section 5: Observability & Debuggability

**What it was waiting for**: A framework for tracing a single conversation end-to-end

**How Section 4 enables it**: 
- Eval harness logs (§10.2): Every eval run saved as structured JSON
- LangSmith integration (§10.1): Trace each LLM call with full context
- Per-turn confidence (§5.1): Attach to every event in the log

**Action for team**:
> After eval harness is working, add trace_id to every Python response. Then TS can log full path: browser → TS → Python → Supabase.

---

### Section 6: Security & Compliance

**What it was waiting for**: Clarity on what data to log vs. redact

**How Section 4 enables it**: 
- Eval logging (§10.2): Specifies sanitization (no PII, secrets, user names)
- Tracing policy: Red-flag high-risk conversations (pricing, refunds, dates)
- Retention: Eval samples kept for 7 days, then deleted

**Action for team**:
> Create `evalLogger.ts` helper that redacts PII before eval replay. Example:
> ```typescript
> function redactPII(conversation) {
>   return conversation.map(msg => ({
>     ...msg,
>     content: msg.content.replace(/\S+@\S+/g, "[REDACTED]")
>   }));
> }
> ```

---

### Section 7: Scalability & Cost Control

**What it was waiting for**: Baseline token usage per eval type

**How Section 4 enables it**: 
- Phase 4 dashboards (§7.4): Cost tracking per prompt version
- Token budgets: Each agent phase gets max token allocation
- Caching: Compare cost before/after caching repeated NLU results

**Action for team**:
> After Phase 2 evals run, measure:
> - NLU: X tokens/request
> - Search: Y tokens/request
> - Booking: Z tokens/request/turn
>
> Set budgets: "NLU must stay < 1000 tokens; Search < 1500 tokens"

---

### Section 8: Release & Rollout Process

**What it was waiting for**: A checklist that prevents bad deployments

**How Section 4 enables it**: 
- Release checklist (§6): Required before every merge
- Baseline comparison: "Accuracy not dropped > 5%"
- Approval workflow: Tech lead + Product must sign off
- Canary gates: Can't go to 100% if alerts fired

**Action for team**:
> Copy `docs/eval-release-checklist.md` to your deploy system. Block merges if:
> - [ ] Evals don't pass
> - [ ] Hallucination rate > 1%
> - [ ] Accuracy drop > 5%

---

### Section 9: Architecture / Product Decisions

**What it was waiting for**: Data to drive big decisions

**How Section 4 enables it**: 
- Search vs. booking splits: Eval shows which is harder to route
- Model selection: Cost per token × accuracy per model
- Memory vs. stateless: Eval shows if context helps (history budget in Section 1a)
- Memory layer: Eval will show if repeated clarifications drop with memory

**Action for team**:
> After Phase 2 evals, ask:
> - "Is NLU our accuracy bottleneck or is it database enrichment?"
> - "Should we use cheaper model for low-risk intents?"
> - "Do users repeat questions? Does memory help?"

---

## Multi-Agent System-Specific Wins

### 1. Python ↔ TypeScript Boundary Enforcement

**Eval enforces the contract**:
```
Before merge:
  ✅ Python never wrote to Supabase in any trace
  ✅ Python response schema matches TypeScript expectations
  ✅ Confidence scores present (TS uses them for gates)
  
After deployment:
  ✅ Sampled prod traces confirm Python read-only behavior
  ✅ Confidence distribution tracked (> 0.7 for high-risk fields)
```

### 2. Model Consistency Across Teams

**Python + TS stay aligned through**:
- Golden dataset shared (both teams can run it locally)
- Prompt versioning in git (single source of truth)
- Baseline diffs tracked (if TS changes DB schema, eval catches impact)

### 3. Production Confidence Signals

**Evals → Production**:
- Measure confidence in dev (evals)
- Use confidence in prod (gates, clarification-first)
- When prod query fails, can replay offline with eval harness

---

## Implementation Order

To maximize impact, implement sections in this order:

```
✅ Section 4: Eval Framework (§1–4 items)       [READY NOW]
   ↓ Unblocks ↓
   
✅ Section 1: Architecture (now backed by evals)  [This Week]
✅ Section 2: Correctness (confidence gates)      [Week 2–3]
✅ Section 3: Reliability (fallback logic)        [Week 3–4]
   ↓ Unblocks ↓
   
✅ Section 5: Observability (trace IDs)          [Week 4–5]
✅ Section 6: Security (eval log redaction)      [Week 5]
   ↓ Unblocks ↓
   
✅ Section 7: Scalability (cost tracking)        [Week 5–6]
✅ Section 8: Release (eval checklist gates)     [Week 6–7]
✅ Section 9: Architecture Decisions (data-driven) [Week 8+]
```

---

## Success Outcome

After all sections are implemented, your system will have:

```
User Query
  ├─ TypeScript Orchestrator
  │  ├─ Confidence gates (Section 4 evals →)
  │  │  ├─ HIGH confidence? →forward to Python
  │  │  ├─ LOW confidence? → ask clarifying question (Section 3)
  │  │
  │  └─ Call Python Agent
  │     ├─ NLU (traced in LangSmith, Section 5)
  │     ├─ Confidence scores attached (Section 4)
  │     └─ Never writes (Section 1 contract enforced by eval)
  │
  ├─ TS Runs Supabase Query
  │  ├─ (Python's diagnostic reads discarded)
  │  ├─ Logged for Section 5 tracing
  │  ├─ Redacted for Section 6 privacy
  │  └─ Cost tracked for Section 7
  │
  ├─ Return to Browser
  │  ├─ With booking readiness (Section 4)
  │  ├─ With confidence scores (Section 4)
  │  └─ Ready for Section 3 fallback if needed
  │
  └─ Release Gate (Section 8)
     ├─ Evals passed ✅
     ├─ Hallucination rate < 1% ✅
     ├─ No accuracy drop ✅
     └─ Approved by tech lead + product ✅
```

---

## Blockers Removed by This Framework

| Blocker | Resolution |
|---------|-----------|
| "How do we know if a prompt change is safe?" | Evals: run before/after, compare accuracy diff |
| "How do we prevent hallucinations?" | Hallucination detector (§4.4) + confidence gates (§5) |
| "Which LLM calls are slow?" | LangSmith tracing (§10.1) |
| "Can we trust Python DB results?" | Eval confirms TS runs authoritative queries (§1 contract) |
| "How do we know when to clarify vs. execute?" | Confidence thresholds (§5.1, table) |
| "Can we A/B test new prompts?" | Phase 4 enables A/B testing (§7.4) |

---

## If You're Blocked or Stuck

1. **Can't get golden dataset?** → Use first 2–3 weeks of production logs (ask DB team)
2. **Eval harness too slow?** → Parallelize: run NLU, search, booking evals in parallel
3. **LangSmith not working?** → Fallback to local JSON logging (simpler, works offline)
4. **Confidence scores not stable?** → Add `reasoning_summary` field (helps debug LLM reasoning)
5. **Release checklist onerous?** → Automate CI/CD gates (checks markdown boxes automatically)

---

## Next: Sync with Team

**Recommended**: 1-hour meeting with backend leads + product

**Agenda**:
1. Review: `docs/eval-backlog-summary.md` (5 min)
2. Demo: eval_harness.py skeleton (10 min)
3. Assign owner: Who champions evals? (5 min)
4. Week 1 plan: Build golden dataset (20 min)
5. Questions (15 min)


