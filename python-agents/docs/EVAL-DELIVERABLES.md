# Evaluation & QC Approach — Deliverables Summary

**Status**: Framework complete & ready to implement  
**Date**: August 11, 2026

---

## Documents Created

### 1. **🎯 docs/evaluation-and-qc-approach.md** (Main Framework)
**Length**: ~6,000 words | **Sections**: 15  
**Purpose**: Comprehensive specification for evaluation and quality control

**Key Sections**:
- §1: Overview & principles
- §2: Metrics & success criteria (detailed tables)
- §3: Phased rollout (Phases 1–4, 8-week timeline)
- §4: Detailed eval specifications (NLU, search, booking, hallucination, readiness)
- §5: Confidence threshold model (risk-based gating)
- §6: Release & rollout checklist
- §7: Tools & infrastructure recommendations
- §8: High-risk fields & do-not-infer policy
- §9: Prompt versioning & change management
- §10: Tracing & observability
- §11: Escalation & fallback strategy
- §12: Implementation roadmap (phased)
- §13: FAQ & troubleshooting
- §14: Success criteria (checkboxes)
- §15: Related documents

**Who reads this**: Tech lead, backend engineers, product managers  
**Time to read**: 30–45 minutes

---

### 2. **🛠️ docs/eval-implementation-guide.md** (Code Templates)
**Length**: ~2,500 words | **Format**: Code + checklists  
**Purpose**: Actionable code templates, CI/CD config, quick-start

**Includes**:
- Phase 1 actions (Days 1–3): Golden dataset structure, eval harness skeleton
- Phase 2 actions (Days 4–7): NLU eval script, CI/CD workflow
- Phase 3 actions (Days 7–10): Confidence thresholds, output schema updates
- Phase 4 actions (Days 10–14): pytest suite, test examples
- Working Python code (eval_harness.py, nlu_eval.py)
- GitHub Actions workflow
- TypeScript helpers for confidence gates
- Final checklist: 20 hours to Phase 2

**Who reads this**: Backend engineers implementing evals  
**Time to read**: 20–30 minutes (+ coding time)

---

### 3. **📋 docs/eval-backlog-summary.md** (Backlog Mapping)
**Length**: ~1,500 words  
**Purpose**: Maps all 10 backlog items → solutions

**Shows**:
- Which backlog item → which section of framework
- Priority & status for each item
- Quick-start 4-week roadmap
- High-impact areas focus
- Tools & tech stack
- 8-week success metrics
- FAQ for common questions

**Who reads this**: Manager/Tech lead checking off backlog  
**Time to read**: 10–15 minutes

---

### 4. **⚡ docs/EVAL-QUICKCARD.md** (Quick Reference)
**Length**: ~400 words  
**Purpose**: Print-and-post summary for team

**Contains**:
- This week's action items (5 days)
- Key metrics table
- 8-week timeline visualization
- Document reading order
- Critical do-nots
- High-risk areas
- Resource estimate

**Who reads this**: Team members needing quick context  
**Time to read**: 5 minutes

---

### 5. **📚 docs/eval-section-integration.md** (Backlog Context)
**Length**: ~2,000 words  
**Purpose**: Shows how Section 4 unblocks Sections 1–9

**Shows**:
- Dependency diagram (Section 4 → Sections 1–9)
- How each section is unblocked by evals
- Multi-agent system wins (Python ↔ TS boundary, consistency, prod confidence)
- Recommended implementation order across all sections
- Success outcome blueprint
- Blockers and how they're removed

**Who reads this**: Tech lead planning full backlog rollout  
**Time to read**: 15–20 minutes

---

### 6. **✅ Updated: python-agents/docs/backlog.md**
**Status**: Section 4 items cross-referenced to solution docs  
**Changes**:
- Each of 10 backlog items now links to detailed solution
- Implementation status marked (completed, in-progress, not-started)
- Quick links section added
- Related docs section added

---

## Quick-Start Path

### For Decision Makers (Manager/Tech Lead)
```
1. Read: eval-backlog-summary.md (10 min)
2. Skim: eval-section-integration.md (10 min)
3. Action: Assign owner, schedule kickoff
```

### For Implementers (Backend Engineers)
```
1. Read: EVAL-QUICKCARD.md (5 min)
2. Deep: eval-implementation-guide.md Phase 1 (15 min)
3. Code: Create golden_dataset.json, eval_harness.py (2 hrs)
4. Run: Test locally, commit to branch
5. Sync: Weekly check-in with team
```

### For Domain Experts (Python/LLM Engineers)
```
1. Read: evaluation-and-qc-approach.md (30 min)
2. Focus: §4 (Detailed Eval Specs), §5 (Confidence), §8 (Do-Not-Infer)
3. Implement: nlu_eval.py, search_eval.py, hallucinatio_detector.py
4. Test: Golden dataset baseline
```

---

## What Each Document Answers

| Question | Document | Section |
|----------|----------|---------|
| "What do we evaluate?" | approach.md | §2 (Metrics), §4 (Specs) |
| "How do we get started?" | implementation-guide.md | §2–4 (Phases 1–3) |
| "How does this fix the backlog?" | backlog-summary.md | Mapping table |
| "What's the 8-week plan?" | EVAL-QUICKCARD.md | Timeline |
| "Does this apply to my section?" | section-integration.md | §2–9 (Each section) |
| "Show me code!" | implementation-guide.md | Code templates |
| "How do we release safely?" | approach.md | §6 (Checklist) |

---

## Immediate Next Steps (This Week)

### Day 1 (30 min)
- [ ] Team lead reads eval-backlog-summary.md
- [ ] Assign Eval Engineer owner
- [ ] Slack: Share EVAL-QUICKCARD.md with team

### Days 2–3 (3 hours)
- [ ] Create `python-agents/evals/` directory structure
- [ ] Pull 20–30 real production prompts (work with data team)
- [ ] Create `golden_dataset.json` starter (§4.1 schema)
- [ ] Create `eval_harness.py` skeleton (§2.1 code)

### Days 4–5 (2 hours)
- [ ] Write `nlu_eval.py` using template (§2.1)
- [ ] Create `.github/workflows/eval.yml` (§2.2)
- [ ] Update `.env.example` with LangSmith vars
- [ ] Create `eval-release-checklist.md`

### End of Week 1
- [ ] Run evals locally: `python -m evals.eval_harness`
- [ ] See baseline results (NLU accuracy, counts)
- [ ] Week 1 retrospective: What worked, what needs iteration?

---

## Success Criteria

### Phase 1 (Weeks 1–2)
- [ ] Golden dataset created (50 examples)
- [ ] eval_harness.py running without errors
- [ ] NLU eval baseline recorded
- [ ] CI/CD workflow integrated
- **Target**: 95% NLU accuracy on golden dataset

### Phase 2 (Weeks 2–4)
- [ ] Search eval + booking readiness eval working
- [ ] Hallucination detector implemented
- [ ] All evals passing
- **Target**: < 1% hallucination rate, F1 ≥ 0.85 on booking

### Phase 3 (Weeks 3–5)
- [ ] Confidence fields added to Python outputs
- [ ] TypeScript gates wired in (needsClarification, clarificationPrompt)
- [ ] Release checklist enforced
- **Target**: Low-confidence paths trigger clarifications

### Phase 4 (Weeks 5–8)
- [ ] CI/CD gates block merges if evals fail
- [ ] Prod traffic sampling + offline replay working
- [ ] Dashboards tracking accuracy trends
- [ ] A/B test framework for new prompts
- **Target**: Evals run on every PR, dashboards updated hourly

---

## Resource Estimate

| Phase | Effort | People | Duration |
|-------|--------|--------|----------|
| 1 (Foundations) | 20 hrs | 1 backend + 1 eval eng | 1 week |
| 2 (Core Evals) | 25 hrs | 1 eval eng + 1 LLM eng | 2 weeks |
| 3 (Confidence) | 12 hrs | 1 backend + 1 LLM eng | 1.5 weeks |
| 4 (Prod Monitoring) | 30 hrs | 1 backend + 1 DevOps | 2–3 weeks |
| **Total** | **~85 hrs** | ~3–4 people (part-time) | **~8 weeks** |

**Cost**: Free (using existing tools)

---

## Tools & Dependencies

### Existing (Already in requirements.txt or package.json)
- [x] Python: FastAPI, uvicorn, pydantic
- [x] Python: openai, langchain, langsmith
- [x] TypeScript: Vitest
- [x] CI/CD: GitHub Actions

### New (Add to requirements.txt)
```bash
pytest>=7.4.0
pytest-asyncio>=0.21.0
pandas>=2.0.0
matplotlib>=3.7.0  # For trend charts
```

### Services (Already subscribed or free)
- [x] LangSmith (free tier or paid)
- [x] BigQuery (Phase 4, optional)

**No new line items to budget.**

---

## Common Follow-Up Questions

### Q: Do we need to implement all phases?

**A**: No. Start with Phase 1–2 (core evals). Phases 3–4 are enhancements that can come later. But Phase 1–2 should be done before next major release.

### Q: Can we parallelize the phases?

**A**: Yes! While one engineer builds golden dataset, another can set up CI/CD. But evals must be functional before you can use them to gate releases.

### Q: What if we have existing tests?

**A**: Integrate! `tests/guided/guidedFlow.test.ts` shows deterministic state tests. Evals are different—they test LLM outputs. Both are needed.

### Q: Do we need LangSmith?

**A**: For Phase 1–2, optional (nice for debugging but not required). For Phase 4, strongly recommended (enables trace review and cost analysis).

### Q: How do we add golden examples?

**A**: Start with 20–30 from production logs. Add 1–2 per month from real user queries. Review + edit manually (make sure expected labels are correct).

---

## Files to Create/Edit

### Create (New)
- ✅ `python-agents/evals/` (directory)
- ✅ `python-agents/evals/__init__.py`
- ✅ `python-agents/evals/golden_dataset.json` (Phase 1)
- ✅ `python-agents/evals/eval_harness.py` (Phase 1)
- ✅ `python-agents/evals/nlu_eval.py` (Phase 2)
- ✅ `python-agents/evals/search_eval.py` (Phase 2)
- ✅ `python-agents/evals/booking_readiness_eval.py` (Phase 2)
- ✅ `python-agents/evals/hallucination_detector.py` (Phase 2)
- ✅ `python-agents/tests/` (directory, for pytest)
- ✅ `python-agents/tests/test_nlu_agent.py` (Phase 4)
- ✅ `.github/workflows/eval.yml` (Phase 2)
- ✅ `docs/eval-release-checklist.md` (Phase 1)
- ✅ `docs/prompt-changelog.md` (Phase 3)

### Edit (Existing)
- ✅ `python-agents/.env.example` (add LangSmith vars)
- ✅ `python-agents/requirements.txt` (add pytest, pandas)
- ✅ `python-agents/agents/nlu_agent.py` (add confidence fields, prompt version)
- ✅ `python-agents/models/nlu_models.py` (add confidence fields)
- ✅ `server/utils/runAiSearchPostHandler.ts` (add confidence gates)
- ✅ `python-agents/README.md` (link to evals docs)
- ✅ `python-agents/docs/backlog.md` (cross-reference solutions)

---

## Related Backlog Items This Unblocks

| Backlog Section | What It Enables |
|---|---|
| Section 1 (Architecture) | Confirmation that eval gates enforce boundaries |
| Section 2 (Correctness) | Baseline metrics for hallucination control |
| Section 3 (Reliability) | Confidence thresholds drive fallback logic |
| Section 5 (Observability) | Eval logging provides tracing foundation |
| Section 6 (Security) | Eval log redaction pattern established |
| Section 7 (Scalability) | Token budget tracking per prompt version |
| Section 8 (Release) | Eval checklist gates every deployment |
| Section 9 (Decisions) | Data-driven priorities for model selection |

---

## Success Story (8 Weeks from Now)

**Team is able to**:
- ✅ Change any prompt confident it won't break prod (evals run automatically)
- ✅ Detect hallucinations before they reach users (1% detection rate)
- ✅ Route users correctly 95%+ of the time (NLU accuracy tracked)
- ✅ Handle ambiguous queries gracefully (confidence gates → clarification)
- ✅ Track quality trends over time (dashboards)
- ✅ Ship with confidence (release checklist blocks bad deploys)
- ✅ Debug production issues offline (evals replay conversations)

---

## Getting Started

### Next 5 Minutes
1. Open `docs/eval-backlog-summary.md` (this repo)
2. Assign owner: Who is the Evaluation Engineer?
3. Send EVAL-QUICKCARD.md to team Slack

### This Week
1. Follow Phase 1 checklist in implementation-guide.md
2. Create golden_dataset.json with 20–30 real prompts
3. Get eval_harness.py running locally

### Schedule Kickoff
1. 1-hour sync: Tech lead + backend leads + product
2. Review: Overview, timeline, resource needs
3. Assign: Phase 1–2 owners + sprint dates
4. Done: Team has everything needed to start

---

## Questions? Stuck?

**Escalation Path**:
1. Check FAQ in `evaluation-and-qc-approach.md` (§13)
2. Search related docs for answer
3. Raise in weekly sync with team
4. If architecture question: Post in backlog discussion

---

## TL;DR

| What | Status | Time | Owner |
|------|--------|------|-------|
| **Framework** | ✅ Complete | 45 min read | Tech Lead |
| **Code Templates** | ✅ Complete | 20 min read + 2 hrs code | Backend Eng |
| **Backlog Mapping** | ✅ Complete | 10 min read | Tech Lead |
| **CI/CD Setup** | ✅ Ready | 1 hr setup | DevOps |
| **Phase 1 Kickoff** | ⏳ Tomorrow | 5 days | Eval Eng owner |

**Next**: Read `docs/eval-backlog-summary.md`, assign owner, schedule team kickoff.


