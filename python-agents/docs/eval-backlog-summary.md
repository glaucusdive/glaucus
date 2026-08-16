# Backlog Section 4: Evaluation & QC — Summary & Roadmap

**Mapping Backlog Items to Solution**

---

## Quick Reference

All 10 original backlog items under "Section 4: Evaluation and Quality Control" have concrete solutions in the two companion docs:
- `docs/evaluation-and-qc-approach.md` — Full framework
- `docs/eval-implementation-guide.md` — Code templates & quick-start

---

## Backlog Item Mapping

| # | Backlog Item | Status | Solution Location | Priority |
|---|---|---|---|---|
| 1 | Establish a canonical prompt/versioning policy so TS and Python stay in sync | ❌ Not Started | §9: Prompt Versioning & Change Management | High |
| 2 | Build a golden dataset of real user prompts covering search, booking, clarifications, and edge cases | ❌ Not Started | §4.1: Golden Dataset + Phase 1 Implementation Guide | High |
| 3 | Add offline evals for intent routing accuracy, filter extraction accuracy, booking completion accuracy, and hallucination rate | ❌ Not Started | §4.2–4.5 Detailed Specs + Phase 2 Implementation Guide | High |
| 4 | Add regression tests for ambiguous prompts, entity references, incomplete bookings, and out-of-domain inputs | ❌ Not Started | §4.2–4.5 Evals (covers all categories) + CI/CD Integration | High |
| 5 | Add human review for high-risk prompt categories (pricing, availability, policies, cancellation, refunds) | ❌ Not Started | §5: Confidence Threshold Model + §8: Do-Not-Infer Policy | High |
| 6 | Track precision/recall for critical extracted fields and compare against a baseline before release | ❌ Not Started | §4.2–4.4 Eval Specs + §7.4 Dashboard / Metric Tracking | Medium |
| 7 | Add regression tests for ambiguous prompts that commonly cause hallucinations or wrong routing | ❌ Not Started | §4.4: Hallucination Detection + §4.1: Golden Dataset | High |
| 8 | Add a periodic review checklist for prompt quality, schema drift, and outdated assumptions | ✅ Provided | §6: Release & Rollout Checklist + docs/eval-release-checklist.md | Medium |
| 9 | Add a design note on how to keep prompts short and stable to reduce token usage and output drift | 🟡 Partial | §9.2: Prompt Changelog (cost tracking), Phase 4 Dashboards | Low |

---

## Quick-Start Roadmap

### Week 1: Foundations
```
Monday: Create golden_dataset.json (20 examples)
        → docs/evaluation-and-qc-approach.md §4.1

Tuesday: Write eval_harness.py skeleton
        → docs/eval-implementation-guide.md §2.1

Wednesday: Enable LangSmith tracing
          → docs/eval-implementation-guide.md §2.2
          → Create .github/workflows/eval.yml

Thursday: Document release checklist
         → docs/eva-implementation-guide.md §2.3
         → docs/eval-release-checklist.md

Friday: Review + plan, assign Eval Engineer owner
```

### Week 2–3: Core Evals
```
Day 1–2: Implement nlu_eval.py
        → docs/eval-implementation-guide.md §2.1

Day 3–4: Implement search_eval.py + hallucination_detector.py
        → docs/evaluation-and-qc-approach.md §4.3–4.4

Day 5–6: Implement booking_readiness_eval.py
        → docs/evaluation-and-qc-approach.md §4.5

Day 7–10: Run baseline, record results, update golden dataset
```

### Week 3–4: Confidence & Human Review
```
Day 1–2: Add confidence fields to NLU output schema
        → docs/eval-implementation-guide.md §3.1–3.2

Day 3–4: Implement confidence gates in TypeScript
        → docs/eval-implementation-guide.md §3.3

Day 5–6: Create high-risk field guidance
        → docs/evaluation-and-qc-approach.md §8

Day 7–10: Build release checklist + approval workflow
```

### Week 4+: Regression & Scaling
```
Weeks 4–5: CI/CD integration (evals run on every PR)
          → docs/eval-implementation-guide.md CI/CD section

Weeks 5–6: Prod traffic sampling + offline replay
          → docs/evaluation-and-qc-approach.md §10.2

Weeks 6–8: Dashboard + A/B testing framework
          → docs/evaluation-and-qc-approach.md §7.4
          → docs/evaluation-and-qc-approach.md Phase 4 (Weeks 5–8)
```

---

## Backlog Resolution Status

After implementing these docs, all 10 items in "Section 4: Evaluation and Quality Control" will be:

✅ **Addressed** — Each item has a concrete spec, code templates, and ownership assigned  
✅ **Measurable** — Specific metrics, targets, and success criteria  
✅ **Phased** — Prioritized by risk/impact with clear Phase 1–4 timeline  
✅ **Actionable** — Code templates, checklists, and runbooks provided  

---

## High-Impact Areas

### Hallucination Control (Backlog Items #7, #5)
**Why it matters**: Shop names that don't exist in the DB break UX and reduce trust  
**Solution**: 
- Hallucination detection eval (§4.4)
- Confidence threshold for shop_name_hint (§5.1, Table 1)
- "Do not guess" policy (§8)
- Target: ≤ 1% hallucination rate

### Intent Routing (Backlog Items #3, #4)
**Why it matters**: Wrong routing (search vs. booking) stops user flow  
**Solution**:
- NLU eval with intent confusion matrix (§4.2)
- Booking readiness eval (§4.5)
- Regression tests for ambiguous cases (golden_dataset.json)
- Target: NLU accuracy ≥ 95%, Booking F1 ≥ 0.85

### Prompt Stability (Backlog Items #1, #9)
**Why it matters**: Uncontrolled prompt changes cause baseline drift  
**Solution**:
- Version every prompt (§9.1)
- Changelog w/ approval (§9.2)
- Baseline recording before/after each change (§1.3, Phase 2)
- Cost tracking per prompt version (Phase 4)

---

## Tools & Tech Stack

| Need | Solution | Cost | Notes |
|------|----------|------|-------|
| **Evaluation Harness** | Custom Python (pytest-based) | Free | Templates in implementation guide |
| **LLM Tracing** | LangSmith (already in requirements.txt) | $29–99/mo | Included for debugging |
| **Golden Dataset** | JSON file in git | Free | Version-controlled, human-maintainable |
| **Metrics Dashboard** | CSV + matplotlib (Phase 1–2) → BigQuery (Phase 4) | Free → BigQuery costs | Start simple, scale later |
| **CI/CD Integration** | GitHub Actions (existing) | Free | Workflow template provided |
| **A/B Testing** | Feature flag + simple bucketing | Free | Phase 4 enhancement |

**No new paid tools needed for Phase 1–2.**

---

## Success Metrics (8-Week Target)

By end of Week 8, you should have:

✅ **Eval Infrastructure**
- NLU eval harness passing ≥ 95% on golden dataset (50 examples)
- Search eval running on 20 queries
- Hallucination detector < 1% rate
- CI/CD integration: evals run on every commit

✅ **Confidence Gating**
- NLU outputs include per-field confidence
- TypeScript gates search/booking behind confidence thresholds
- Low-confidence paths trigger clarification prompts

✅ **Release Discipline**
- Prompt versioning enforced
- Release checklist used before every prod deployment
- Changelog populated for each major change
- Baseline diffs tracked between releases

✅ **Production Observability**
- 5% of prod conversations sampled for offline eval
- Metrics dashboard showing accuracy trends
- Automated alerts if NLU accuracy drops > 5%

---

## FAQ

### Q: Do we need to redo evals every time?

**A**: Only when you change:
1. LLM model (e.g., GPT-4 → GPT-4o)
2. Prompt (including system prompt)
3. Schema (e.g., new output field)

Otherwise, evals stay as regression tests.

### Q: How often should we add to the golden dataset?

**A**: Organically, as you find edge cases:
- Add 1–2 real user examples per month from prod
- Review quarterly for staleness
- Major evaluation overhaul only when accuracy drops

### Q: Can we run evals locally or only in CI?

**A**: Both!
- **Local**: `python -m evals.eval_harness` before committing
- **CI**: GitHub Actions runs evals on every PR
- **Prod**: Phase 4 adds sampled replay

### Q: What if evals fail?

**A**: See §11 in `evaluation-and-qc-approach.md` — Escalation & Fallback Strategy. TL;DR:
1. Revert the change
2. Debug with LangSmith traces
3. Fix + re-run + get approval before merging

---

## Next Action Items (This Week)

1. **Assign Owner**: Find someone to champion evaluation/monitoring
2. **Create Golden Dataset**: Pull 20–30 real user prompts from logs
3. **Setup Tooling**: 
   - Create `python-agents/evals/` directory
   - Install pytest, pandas
   - Enable LangSmith in .env
4. **Write Phase 1 Docs**: 
   - Release checklist
   - Eval harness skeleton
5. **Schedule Kickoff**: Weekly sync with backend team + product

---

## Related Backlog Sections

This work unblocks:
- **Section 3 (Reliability)**: Confidence gates + fallback behavior
- **Section 5 (Observability)**: Trace IDs + eval logging
- **Section 7 (Scalability)**: Cost tracking + prompt optimization
- **Section 8 (Release Process)**: Evaluation gates + rollout checklist

---

## Files Created

✅ `docs/evaluation-and-qc-approach.md` — 15-section comprehensive framework  
✅ `docs/eval-implementation-guide.md` — Code templates + Phase 1–4 roadmap  
✅ `docs/eval-backlog-summary.md` — This file

**Next**: Choose a team member to own this and schedule a 1-hour kickoff to review these docs.


