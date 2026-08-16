# 🧪 Evaluation & QC — Quick Start Card

**Backlog Section 4 Implementation Roadmap**

---

## 📋 What to Do This Week

### ☑ Day 1 (30 min)
- [ ] Read: `docs/eval-backlog-summary.md`
- [ ] Assign Eval Engineer owner
- [ ] Create `python-agents/evals/` directory

### ☑ Day 2 (2 hours)
- [ ] Pull 20–30 real user prompts from production
- [ ] Create `python-agents/evals/golden_dataset.json`
- [ ] Add to `.env.example`: LangSmith vars

### ☑ Day 3–4 (2 hours)
- [ ] Code: `python-agents/evals/eval_harness.py` (skeleton)
- [ ] Code: `python-agents/evals/nlu_eval.py` (using golden dataset)
- [ ] Create: `.github/workflows/eval.yml` (CI integration)

### ☑ Day 5 (1 hour)
- [ ] Create: `docs/eval-release-checklist.md`
- [ ] Update: `python-agents/README.md` → "Run evals before release"
- [ ] Kick off: weekly eval sync with team

---

## 📊 Key Metrics to Hit

| Metric | Target | By When |
|--------|--------|---------|
| NLU Intent Accuracy | ≥ 95% | Week 2 |
| Hallucination Rate | ≤ 1% | Week 3 |
| Booking Readiness F1 | ≥ 0.85 | Week 3 |
| CI/CD Integration | Evals run on every PR | Week 2 |
| Confidence Thresholds | Wired in TypeScript | Week 4 |

---

## 🎯 8-Week Timeline

```
WEEK 1  → Golden dataset + eval harness skeleton
WEEK 2  → NLU eval working, baseline recorded
WEEK 3  → Confidence gates wired, high-risk policy docs
WEEK 4  → Pytest suite, prompt versioning enforced
WEEK 5  → CI/CD fully integrated
WEEKS 5-8 → Prod sampling + dashboards
```

---

## 🔗 Key Documents (in Order)

1. **Start here**: `docs/eval-backlog-summary.md` (5 min)
2. **Deep dive**: `docs/evaluation-and-qc-approach.md` (30 min)
3. **Code**: `docs/eval-implementation-guide.md` (templates & checklists)

---

## ✋ Critical "Do Nots"

❌ Don't merge Python changes without running evals  
❌ Don't guess shop names, dates, or user identity  
❌ Don't skip the release checklist  
❌ Don't let confidence scores drop silently  

---

## 🚨 High-Risk Areas

| Risk | Solution |
|------|----------|
| Hallucinated shop names | Hallucination detector eval (§4.4) |
| Wrong route (search vs booking) | NLU regression tests (§4.2) |
| Silent model degradation | Baseline tracking + alerts |
| Uncontrolled prompt changes | Versioning + changelog (§9) |

---

## 💰 Resource Estimate

**Time**: ~20 hours to Phase 2 (evals working)  
**Cost**: Free (using existing tools)  
**Tools**: pytest, LangSmith, GitHub Actions  

---

## 📞 Questions?

Review the 3 docs above, then find the Eval Engineer owner. Any blockers → raise in weekly sync.

---

**Print & Post This** 📌


