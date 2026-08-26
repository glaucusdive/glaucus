# Evaluation and Quality Control Approach

**Status**: Framework for Section 4 (Evaluation and Quality Control) of the backlog  
**Scope**: TypeScript orchestrator + Python LLM agents + Supabase layer  
**Last Updated**: August 11, 2026

---

## 1. Overview

This document outlines a systematic approach to evaluating and controlling quality across the multi-agent search/booking system. The primary concern is **correctness and hallucination mitigation** given the multi-turn dialogue nature and LLM extraction steps.

### Key Principles

1. **Separation of Concerns**: Python agents (LLM extraction) and TypeScript (database authority) have different eval criteria
2. **Confidence-First**: Extract confidence scores from LLM outputs; use them to gate fallback behavior
3. **Golden Dataset**: Build and maintain a canonical set of real user prompts and expected outputs
4. **Regression Testing**: After each model/prompt change, re-run the full test suite before merging
5. **Human Review for Risk**: High-stakes fields (pricing, dates, bookings, refunds) get explicit human approval

### 3-Tier Eval Framework (Tiers 1, 2, 3 Strategy)

This framework employs three complementary tiers, each catching different failure modes:

#### **Tier 1: Deterministic Logic Evals (Fast Parity)**
- **Tool**: `evals/alpha_parity_eval.py`
- **What**: Patch LLM calls with fixed responses; test parsing, routing, merge logic
- **Goal**: Behavior parity — does beta match alpha?
- **Cost**: Free (no API calls)
- **Speed**: <1 second
- **Run**: Every commit (CI/CD)
- **Examples**: JSON extraction, filter merge, routing precedence, normalization, fail-soft behavior
- **Status**: Minimal baseline (7 cases); grows as more alpha behaviors are migrated

#### **Tier 2: Automated LLM-as-Judge Evals (Quality Metrics)**
- **Tool**: `evals/nlu_eval.py`, `evals/search_eval.py`, `evals/booking_readiness_eval.py`, `evals/hallucination_detector.py`
- **What**: Feed golden dataset into real Python agents; measure accuracy, precision, recall
- **Goal**: Quality metrics — is the LLM extraction good enough?
- **Cost**: ~$5–$20 per eval run (LLM API calls for 50+ golden prompts)
- **Speed**: ~30 seconds per eval suite
- **Run**: On release/PR to main
- **Examples**: NLU goal extraction ≥95%, destination accuracy ≥90%, hallucination rate ≤1%
- **Status**: Defined in Phase 2; not yet implemented

#### **Tier 3: Human-in-the-Loop Review (Edge Cases)**
- **Tool**: LangSmith traces, manual spot-checks, approval gate
- **What**: Tech lead reviews LLM traces; product spot-checks end-to-end flows; daily production sample review
- **Goal**: Catch edge cases, PII leakage, UX issues that automated evals miss
- **Cost**: Human time (~30 min per release)
- **Speed**: Real-time (before deployment)
- **Run**: Before every prod deploy
- **Examples**: Approval checklist, trace review, manual flow validation, escalation path documentation
- **Status**: Defined in Phase 3; approval checklist in Section 6

---

## 2. High-Level Metrics & Success Criteria

### 2.1 Python Agent Metrics

| Metric | Target | Measured By | Risk Level |
|--------|--------|-------------|-----------|
| **NLU Intent Accuracy** | ≥ 95% | Goal classification on golden set | High |
| **Destination Extraction** | ≥ 90% | Correct country/place/region | High |
| **Activity Token Precision** | ≥ 80% | Correctly typed activity (wreck vs. cave vs. drift) | Medium |
| **Shop Name Hallucination Rate** | ≤ 1% | Shop names that don't exist in DB (when included) | High |
| **Booking Readiness F1** | ≥ 0.85 | Precision + Recall for "user wants to book" signal | High |
| **Search Filter Confidence (avg)** | ≥ 0.75 | Self-reported confidence in extracted data | Medium |

### 2.2 TypeScript / Database Layer Metrics

| Metric | Target | Measured By | Risk Level |
|--------|--------|-------------|-----------|
| **Supabase Query Latency (p95)** | < 200ms | Query execution time | Medium |
| **Shop Enrichment Completeness** | 100% | All returned shops have courses/sites/rental | Medium |
| **Search Result Consistency** | 100% | Same query → same shop order (when expected) | High |
| **Booking Persistence Success Rate** | ≥ 99.5% | Bookings written to DB / email sent | High |

### 2.3 End-to-End (E2E) Workflow Metrics

| Metric | Target | Measured By | Risk Level |
|--------|--------|-------------|-----------|
| **Search-to-Result Latency (p95)** | < 2s | Time from browser submit to rendered UI | Medium |
| **Booking Completion Rate** | ≥ 75% | Users who start flow complete + confirm | High |
| **Escalation Rate** | ≤ 10% | Conversations that require manual support | High |

---

## 3. Phased Rollout Plan

### Phase 1: Foundations (Weeks 1–2)

**Goal**: Build infrastructure for testing and minimal baseline evals.

**Deliverables**:
- [ ] Establish prompt versioning scheme (git tags for prompts, pydantic schema versions)
- [ ] Build golden dataset (50 real user prompts, 5 per intent category)
- [ ] Add Python test harness with offline evals for NLU accuracy
- [ ] Document "do not infer" fields and confidence thresholds
- [ ] Set up LangSmith project for trace review
- [ ] Create TypeScript booking persistence test

**Tooling**:
```bash
# Python side (new)
pip install pytest pytest-asyncio langsmith

# TypeScript side (existing)
# - Vitest already configured
# - Add supabase test utilities
```

**Expected Time**: 1 week

---

### Phase 2: Core Evals (Weeks 2–4)

**Goal**: Build automated evals for each agent step and establish baseline.

**Deliverables**:
- [ ] NLU eval: 50-prompt dataset with expected (goal, destination, course_hint, etc.)
- [ ] Search filter eval: 20 search queries with expected filters and result counts
- [ ] Booking readiness eval: 15 prompts with expected booking_readiness score
- [ ] Hallucination detector: Flag shop names / course names not in current DB
- [ ] Precision/recall dashboard for NLU intent, destination, activity tokens
- [ ] Regression test suite (run after any prompt change)

**Tooling**:
```python
# New Python eval files
python-agents/
  evals/
    nlu_eval.py          # Run eval on 50 golden NLU prompts
    search_eval.py       # Run eval on 20 search queries
    booking_readiness_eval.py
    hallucination_detector.py
    golden_dataset.json  # 50 curated user prompts
    eval_harness.py      # Orchestrates all evals
```

**Expected Time**: 2 weeks

---

### Phase 3: Human Review & Confidence Gates (Weeks 3–5)

**Goal**: Establish confidence thresholds that gate risky actions; add human approval workflow.

**Deliverables**:
- [ ] Define confidence threshold model: when to use LLM output vs. fallback to clarification
- [ ] Identify high-risk fields: shop_name_hint, course_name, dates, pricing
- [ ] Add confidence score to every Python agent output
- [ ] Build clarification-first behavior for low-confidence outputs (< 0.7)
- [ ] Create approval checklist: who signs off on model updates before prod
- [ ] Add sampled log review: audit 5% of conversations daily for accuracy

**Checklist Template** (in docs/eval-release-checklist.md):
```markdown
- [ ] Baseline eval run (nlu, search, booking evals pass)
- [ ] Golden dataset passes (all 50 NLU prompts ≥ 95%)
- [ ] Hallucination check (no new false shop names)
- [ ] Confidence threshold review (all high-risk fields > 0.7)
- [ ] Manual spot-check (3 sample conversations end-to-end)
- [ ] Trace review in LangSmith (5 random recent traces)
- [ ] Prod rollout approval (tech lead + product)
```

**Expected Time**: 2 weeks

---

### Phase 4: Regression & Scaling (Weeks 5–8)

**Goal**: Automate regression testing and scale eval to production traffic.

**Deliverables**:
- [ ] CI/CD integration: run evals on every commit (nlu_eval.py, search_eval.py)
- [ ] Prod traffic sampling: capture 5% of real conversations, re-evaluate offline
- [ ] Dashboard: precision/recall trends, hallucination rate, eval pass rate
- [ ] A/B test framework: test new prompts on 10% of traffic
- [ ] Cost tracking: tokens/conversation, cost per intent, cost per completion
- [ ] Rollback plan: automated alerts if accuracy drops > 5%

**Tooling**:
```typescript
// TypeScript side
server/utils/evalLogger.ts  // Capture conversation for eval replay

// Dashboards
docs/eval-dashboard-queries.sql  // BigQuery SQL for metrics
```

**Expected Time**: 3 weeks

---

## 4. Detailed Eval Specifications

### 4.1 Golden Dataset Structure

**Location**: `python-agents/evals/golden_dataset.json`

```json
{
  "by_intent": {
    "search_shops": [
      {
        "id": "nlu_gd_001",
        "message": "Show me drift diving shops in Bali with good reviews",
        "history": [],
        "expected": {
          "goal": "search_shops",
          "destination_text": "Bali",
          "activity_terms": ["drift"],
          "shop_name_hint": null,
          "certification_course_hint": null,
          "wants_booking": false,
          "confidence": 0.9,
          "reasoning_contains": ["drift", "Bali"]
        }
      }
    ],
    "start_booking": [
      {
        "id": "nlu_gd_010",
        "message": "I want to book a dive at Cool Divers",
        "history": [
          { "role": "user", "content": "Find me dive shops in Bali" },
          { "role": "assistant", "content": "Here are the shops…" }
        ],
        "expected": {
          "goal": "start_booking",
          "destination_text": null,
          "shop_name_hint": "Cool Divers",
          "wants_booking": true,
          "confidence": 0.85
        }
      }
    ],
    "clarify": [
      {
        "id": "nlu_gd_020",
        "message": "I want to dive but I'm not sure where",
        "history": [],
        "expected": {
          "goal": "clarify",
          "confidence": 0.7,
          "reasoning_contains": ["unclear", "destination"]
        }
      }
    ]
  },
  "by_accuracy_focus": {
    "hallucination_detection": [
      {
        "id": "hal_gd_001",
        "message": "Are you affiliated with the Dive Shop of the Deep Hidden Secrets?",
        "expected_shop_name_hint": "Dive Shop of the Deep Hidden Secrets",
        "should_hallucinate": false,
        "reasoning": "This shop name is likely made up; flag it"
      }
    ],
    "ambiguous_destination": [
      {
        "id": "amb_gd_001",
        "message": "I want to dive at the Great Barrier",
        "expected": {
          "goal": "clarify",
          "confidence_max": 0.6,
          "reasoning_contains": ["ambiguous", "Great Barrier Reef"]
        }
      }
    ],
    "multi_destination": [
      {
        "id": "multi_gd_001",
        "message": "Dive shops in both Mexico and Bali",
        "expected": {
          "goal": "clarify",
          "confidence_max": 0.65,
          "reasoning_contains": ["multiple destinations"]
        }
      }
    ]
  }
}
```

**Maintenance**:
- Add 1–2 examples per month from production conversations
- Review and update quarterly when model changes
- Keep version history in git (golden_dataset_v1.0.json, v1.1.json, etc.)

---

### 4.2 NLU Eval Specification

**File**: `python-agents/evals/nlu_eval.py`

```python
"""
Offline NLU evaluation: Compare model output to golden dataset.
Metrics: Accuracy, Precision, Recall for each extracted field.
"""

from dataclasses import dataclass
from typing import Any
import json
import asyncio

@dataclass
class EvalResult:
    test_id: str
    field_name: str  # "goal", "destination_text", "confidence", etc.
    expected: Any
    actual: Any
    match: bool
    
    def to_dict(self):
        return {
            "test_id": self.test_id,
            "field": self.field_name,
            "expected": str(self.expected),
            "actual": str(self.actual),
            "match": self.match
        }

async def run_nlu_eval(nlu_agent_client: NluAgent, golden_dataset: dict):
    """
    Run full NLU eval suite against golden dataset.
    Returns: summary stats (accuracy, precision, recall, failure list)
    """
    
    results: list[EvalResult] = []
    failures: list[dict] = []
    
    for intent_category, prompts in golden_dataset["by_intent"].items():
        for prompt_spec in prompts:
            try:
                # Call Python NLU agent
                nlu_resp = await nlu_agent_client.call({
                    "message": prompt_spec["message"],
                    "history": prompt_spec.get("history", [])
                })
                
                if not nlu_resp.ok:
                    failures.append({
                        "test_id": prompt_spec["id"],
                        "error": f"NLU failed: {nlu_resp.error}"
                    })
                    continue
                
                # Check goal
                expected_goal = prompt_spec["expected"]["goal"]
                actual_goal = nlu_resp.data.goal
                results.append(EvalResult(
                    test_id=prompt_spec["id"],
                    field_name="goal",
                    expected=expected_goal,
                    actual=actual_goal,
                    match=(expected_goal == actual_goal)
                ))
                
                # Check destination_text (if applicable)
                if "destination_text" in prompt_spec["expected"]:
                    expected_dest = prompt_spec["expected"]["destination_text"]
                    actual_dest = nlu_resp.data.destination_text
                    results.append(EvalResult(
                        test_id=prompt_spec["id"],
                        field_name="destination_text",
                        expected=expected_dest,
                        actual=actual_dest,
                        match=(expected_dest == actual_dest)
                    ))
                
                # Check confidence
                if "confidence" in prompt_spec["expected"]:
                    expected_conf = prompt_spec["expected"]["confidence"]
                    actual_conf = nlu_resp.data.confidence
                    # Allow ±0.1 margin
                    conf_match = abs(expected_conf - actual_conf) < 0.1
                    results.append(EvalResult(
                        test_id=prompt_spec["id"],
                        field_name="confidence",
                        expected=f">= {expected_conf}",
                        actual=actual_conf,
                        match=conf_match
                    ))
            
            except Exception as e:
                failures.append({
                    "test_id": prompt_spec["id"],
                    "exception": str(e)
                })
    
    # Compute summary
    total = len(results)
    passing = sum(1 for r in results if r.match)
    accuracy = passing / total if total > 0 else 0
    
    summary = {
        "test_suite": "nlu_eval",
        "total_tests": total,
        "passing": passing,
        "failing": total - passing,
        "accuracy": accuracy,
        "failures_count": len(failures),
        "failures_detail": failures,
        "target_accuracy": 0.95,
        "passed_threshold": accuracy >= 0.95
    }
    
    print(f"NLU Eval Summary: {passing}/{total} passed ({accuracy:.1%} accuracy)")
    if not summary["passed_threshold"]:
        print(f"⚠️ WARNING: Accuracy {accuracy:.1%} below target {summary['target_accuracy']:.1%}")
    
    return summary

# Entry point for CI/CD
if __name__ == "__main__":
    dataset = json.load(open("golden_dataset.json"))
    client = NluAgent(api_url="http://localhost:8001")
    summary = asyncio.run(run_nlu_eval(client, dataset))
    
    # Exit-code for CI
    exit(0 if summary["passed_threshold"] else 1)
```

**Running**:
```bash
cd python-agents
python -m evals.nlu_eval
# Output: JSON summary + exit code
```

---

### 4.3 Search Filter Eval

**File**: `python-agents/evals/search_eval.py`

```python
"""
Offline search filter eval: Check if extracted filters lead to expected results.
"""

async def run_search_eval(
    search_agent_client,
    supabase_client,
    golden_queries: list[dict]
):
    """
    For each query, ask search agent to extract filters.
    Then run actual Supabase query and validate:
      - Correct number of results (±20%)
      - Correct predominant shop types
      - No geographically impossible results
    """
    
    results = []
    
    for query_spec in golden_queries:
        msg = query_spec["message"]
        
        # 1. Extract filters via Python search agent
        search_resp = await search_agent_client.call({
            "message": msg,
            "history": []
        })
        
        if not search_resp.ok:
            results.append({
                "query_id": query_spec["id"],
                "status": "fail",
                "reason": f"search agent error: {search_resp.error}"
            })
            continue
        
        # 2. Run Supabase with extracted filters
        extracted_filters = search_resp.filters
        shops = await buildDiveShopQuery(supabase_client, extracted_filters)
        
        # 3. Validate against expected
        expected_count = query_spec.get("expected_count_min")
        actual_count = len(shops)
        
        count_ok = True
        if expected_count:
            # Allow ±20% variance
            tolerance = expected_count * 0.2
            count_ok = abs(actual_count - expected_count) <= tolerance
        
        # Check for the right shop type
        expected_types = query_spec.get("expected_shop_types", [])
        actual_types = set(s.get("type") for s in shops)
        types_ok = not expected_types or any(t in actual_types for t in expected_types)
        
        results.append({
            "query_id": query_spec["id"],
            "message": msg,
            "extracted_filters": extracted_filters,
            "expected_count": expected_count,
            "actual_count": actual_count,
            "count_ok": count_ok,
            "types_ok": types_ok,
            "status": "pass" if (count_ok and types_ok) else "fail"
        })
    
    # Summary
    passing = sum(1 for r in results if r["status"] == "pass")
    total = len(results)
    
    return {
        "test_suite": "search_eval",
        "total": total,
        "passing": passing,
        "accuracy": passing / total if total > 0 else 0,
        "details": results
    }
```

---

### 4.4 Hallucination Detection

**File**: `python-agents/evals/hallucination_detector.py`

```python
"""
Detect hallucinated shop names, course names, and other entities.
"""

async def detect_shop_name_hallucinations(
    nlu_responses: list[dict],
    supabase_client,
    threshold: float = 0.01  # 1% hallucination rate
):
    """
    For each NLU response, check:
    - If shop_name_hint is given, is it in the database?
    - Track hallucination rate
    - Flag responses with low confidence but high claimed specificity
    """
    
    hallucinations = []
    
    for resp in nlu_responses:
        shop_hint = resp.get("data", {}).get("shop_name_hint")
        confidence = resp.get("data", {}).get("confidence", 1.0)
        
        if not shop_hint:
            continue  # Not applicable
        
        # Query Supabase for this shop name
        matching_shops = await supabase_client.from_("dive_shops")\
            .select("id")\
            .ilike("business_name", f"%{shop_hint}%")\
            .execute()
        
        if len(matching_shops.data) == 0:
            hallucinations.append({
                "message": resp["message"],
                "shop_name_hint": shop_hint,
                "confidence": confidence,
                "severity": "high" if confidence > 0.7 else "medium"
            })
    
    hallucination_rate = len(hallucinations) / len(nlu_responses)
    
    return {
        "test": "hallucination_detection",
        "total_responses": len(nlu_responses),
        "hallucinations_found": len(hallucinations),
        "hallucination_rate": hallucination_rate,
        "passed": hallucination_rate <= threshold,
        "high_severity": [h for h in hallucinations if h["severity"] == "high"]
    }
```

---

### 4.5 Booking Readiness Eval

**File**: `python-agents/evals/booking_readiness_eval.py`

```python
"""
Test the booking readiness signal: does NLU correctly identify when user wants to book?
"""

async def run_booking_readiness_eval(nlu_client, golden_dataset):
    """
    Test dataset: 15 prompts where booking intent is explicit or ambiguous.
    Expected: High precision (few false positives), moderate recall.
    """
    
    booking_prompts = golden_dataset.get("by_accuracy_focus", {}).get("booking_intent", [])
    
    results = []
    
    for prompt_spec in booking_prompts:
        nlu_resp = await nlu_client.call({
            "message": prompt_spec["message"],
            "history": prompt_spec.get("history", [])
        })
        
        expected_wants_booking = prompt_spec["expected"]["wants_booking"]
        actual_wants_booking = nlu_resp.data.wants_booking
        
        match = expected_wants_booking == actual_wants_booking
        
        results.append({
            "test_id": prompt_spec["id"],
            "message": prompt_spec["message"],
            "expected": expected_wants_booking,
            "actual": actual_wants_booking,
            "match": match
        })
    
    # Compute precision and recall
    # Precision: of the "wants_booking=true" predictions, how many were correct?
    predicted_yes = [r for r in results if r["actual"]]
    predicted_yes_correct = [r for r in predicted_yes if r["match"]]
    precision = len(predicted_yes_correct) / len(predicted_yes) if predicted_yes else 0
    
    # Recall: of all actual bookings, how many did we catch?
    actual_yes = [r for r in results if r["expected"]]
    actual_yes_caught = [r for r in actual_yes if r["match"]]
    recall = len(actual_yes_caught) / len(actual_yes) if actual_yes else 0
    
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
    
    return {
        "test_suite": "booking_readiness",
        "total": len(results),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "target_f1": 0.85,
        "passed": f1 >= 0.85,
        "details": results
    }
```

---

## 5. Confidence Threshold Model

### 5.1 Risk-Based Thresholds

Classify each extracted field by risk and set confidence gates:

| Field | Risk | Min Confidence | Fallback Behavior |
|-------|------|----------------|-------------------|
| `goal` | High | 0.80 | Route to clarify intent |
| `destination_text` | High | 0.75 | Ask "Which destination?"—avoid guessing |
| `shop_name_hint` | High | 0.85 | Don't include hint in probe; user must confirm |
| `certification_course_hint` | Medium | 0.70 | Show all courses in booking form; let user pick |
| `activity_terms` | Medium | 0.65 | Include but don't hide alternatives |
| `wants_booking` | High | 0.70 | If < 0.70, clarify: "Did you want to book or just browse?" |
| `booking_readiness.score` | High | 0.7 (normalized 0–10) | Each collected field must be explicit before confirmation |

### 5.2 Implementation

```typescript
// TypeScript orchestrator
function shouldGateBehindClarification(nluResult: InterpretedTurn): boolean {
  const risks: { [key: string]: number } = {
    goal: nluResult.confidence < 0.80,
    destination: !nluResult.destination_text || 
                 nluResult.confidence < 0.75,
    booking_intent: (nluResult.wants_booking && nluResult.confidence < 0.70)
  };
  
  return Object.values(risks).some(r => r);
}

function mapClarificationPrompt(nluResult: InterpretedTurn): string {
  if (!nluResult.destination_text) {
    return "Where would you like to dive?";
  }
  if (nluResult.wants_booking && nluResult.confidence < 0.70) {
    return "Are you looking to browse or would you like to book?";
  }
  return null;
}
```

**Python side**:
```python
# In nlu_agent.py, emit confidence for each field separately
data = {
    "goal": goal_value,
    "goal_confidence": 0.92,  # Specific to this field
    "destination_text": dest,
    "destination_confidence": 0.85,
    "wants_booking": wants_booking,
    "booking_confidence": 0.65,  # Overall confidence lower
    # ... etc
}
```

---

## 6. Release & Rollout Checklist

**File**: `docs/eval-release-checklist.md`

Before deploying any model, prompt, or schema change:

- [ ] **Baseline Evals Pass**
  - [ ] NLU eval: ≥ 95% accuracy on golden dataset (all intent categories)
  - [ ] Search eval: ≥ 80% accuracy on 20 search queries
  - [ ] Booking readiness eval: F1 ≥ 0.85

- [ ] **Hallucination & Safety**
  - [ ] Hallucination rate ≤ 1% on NLU shop_name_hint
  - [ ] No new "do not infer" fields in the extraction
  - [ ] Confidence scores present and reasonable (0.5–1.0)

- [ ] **Regression**
  - [ ] Compare accuracy vs. previous baseline: no drop > 5%
  - [ ] Any field accuracy drop: root cause documented + fix planned
  - [ ] Golden dataset reviewed for stale/unrealistic examples

- [ ] **Manual Spot-Check**
  - [ ] 3 end-to-end test flows (search + booking) run without errors
  - [ ] All Python responses include required fields (ok, data, error)
  - [ ] TypeScript orchestrator can deserialize all responses

- [ ] **Trace Review (LangSmith)**
  - [ ] 5 random recent conversation traces reviewed for accuracy
  - [ ] No PII leakage in prompts or outputs
  - [ ] Token usage reasonable (no runaway loops)

- [ ] **Cost & Performance**
  - [ ] Average tokens per request within budget
  - [ ] Latency p95 < 2s for orchestrator call
  - [ ] No new dependency on external slow APIs

- [ ] **Approval**
  - [ ] Tech lead approval: All evals pass + no unsafe patterns
  - [ ] Product/UX approval: Output quality acceptable for user flow
  - [ ] Changelog entry: Describe prompt/model/schema changes

**After Approval**: Canary to 5% of traffic for 4 hours, then 100%.

---

## 7. Tools & Infrastructure

### 7.1 Python-Side Tooling

```bash
# pytest for unit tests
pip install pytest pytest-asyncio pytest-cov

# LangSmith integration (already has langsmith)
# - Export LANGSMITH_API_KEY
# - Run evals with tracing enabled

# Eval dashboard (simple CSV-based)
pip install pandas matplotlib
```

**Directory Structure**:
```
python-agents/
  evals/
    __init__.py
    golden_dataset.json      # Version-controlled golden set
    nlu_eval.py
    search_eval.py
    booking_readiness_eval.py
    hallucination_detector.py
    eval_harness.py          # Orchestrates all evals
    eval_results/            # (gitignored) Results from each run
  tests/
    test_nlu_agent.py
    test_search_agent.py
    test_booking_agent.py
    test_orchestrator_agent.py
```

### 7.2 TypeScript-Side Tooling

```typescript
// Capture conversations for offline eval replay
server/utils/evalLogger.ts

// Eval config schema
server/models/evalConfig.ts
```

### 7.3 CI/CD Integration

**GitHub Actions** (`.github/workflows/eval.yml`):
```yaml
name: Python Agent Evals

on: [push, pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: cd python-agents && pip install -r requirements.txt
      - run: cd python-agents && python -m evals.eval_harness
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: eval-results
          path: python-agents/evals/eval_results/
```

### 7.4 Dashboard / Metric Tracking

**Simple CSV-based approach** (can upgrade to BigQuery later):

```python
# evals/eval_harness.py
def save_eval_results(summary: dict, run_id: str):
    """Save each eval's summary to CSV for trend tracking."""
    csv_path = "evals/eval_results/eval_trend.csv"
    
    row = {
        "timestamp": datetime.now().isoformat(),
        "run_id": run_id,
        "nlu_accuracy": summary.get("nlu", {}).get("accuracy"),
        "search_accuracy": summary.get("search", {}).get("accuracy"),
        "booking_readiness_f1": summary.get("booking_readiness", {}).get("f1"),
        "hallucination_rate": summary.get("hallucinations", {}).get("rate"),
        "all_passed": summary.get("all_passed")
    }
    
    # Append to CSV
    df = pd.read_csv(csv_path) if Path(csv_path).exists() else pd.DataFrame()
    df = df.append(row, ignore_index=True)
    df.to_csv(csv_path, index=False)
```

Then plot with matplotlib for visual trends.

---

## 8. High-Risk Fields & Do-Not-Infer Policy

### 8.1 Fields That Must Never Be Guessed

| Field | Reason | Confirmation Required |
|-------|--------|----------------------|
| `shop_name` | Wrong shop → wrong booking | Explicit user confirmation |
| `destination` | Wrong location → useless search | Always ask if ambiguous |
| `date` / `time` | Booking cancellation risk | Explicit user entry in form |
| `num_divers` | Availability query error | Explicit user selection |
| `certification_level` | Safety-critical for course recommendations | Explicit user input |
| `special_requests` | Could miss critical medical/accessibility needs | Offered as optional text field |
| `payment_method` | Never assume | User selects in checkout |

### 8.2 Fields That Can Be Suggested (Not Guessed)

| Field | Approach | Confidence Min |
|-------|----------|----------------|
| `activity_terms` | Suggest via pills; user confirms selection | 0.65 |
| `region_within_country` | Show options; user picks | 0.70 |
| `deal_keywords` | Highlight in shop card (e.g., "Group discount available") | 0.60 |

---

## 9. Prompt Versioning & Change Management

### 9.1 Versioning Scheme

Each prompt lives in git with semantic versioning:

```
prompts/
  nlu_system_prompt.v1.0.txt    (baseline)
  nlu_system_prompt.v1.1.txt    (minor: add clarification_message field)
  nlu_system_prompt.v2.0.txt    (major: rewrite for confidence extraction)
  search_system_prompt.v1.0.txt
  booking_system_prompt.v1.1.txt
```

**Stored in**:
```python
# agents/nlu_agent.py
NLU_SYSTEM_PROMPT_VERSION = "1.1"
NLU_SYSTEM_PROMPT = """..."""

# Emitted in every response
{
  "ok": true,
  "data": { ... },
  "prompt_version": "1.1",
  "model": "gpt-4o"
}
```

### 9.2 Change Log

**File**: `docs/prompt-changelog.md`

```markdown
## NLU System Prompt Changelog

### v1.1 (Aug 11, 2026)
- Add explicit confidence score per field (goal_confidence, destination_confidence)
- Require reasoning_summary: "Explain why you chose this goal"
- Minimum field values: "if unsure, return null instead of guessing"

**Migration**: None (backwards compatible output)  
**Baseline re-run**: Yes (confidences will be different)  
**Approved by**: @tech-lead
```

---

## 10. Tracing & Observability for Evals

### 10.1 LangSmith Integration

Enable detailed tracing of every LLM call:

```python
# In agents/nlu_agent.py
from langsmith import traceable

@traceable(name="nlu_agent", tags=["eval"])
async def run_nlu_agent(req: NluRequest) -> NluResponse:
    """Traceable NLU run."""
    # LangSmith automatically captures prompt, model, tokens, output
    ...
```

**Review in LangSmith UI**:
- 5 random recent traces after each eval run
- Check for hallucinations, reasoning quality
- Monitor input token growth (prompt bloat)

### 10.2 Eval Logs

Every eval run saves a structured log:

```json
{
  "eval": {
    "run_id": "eval_20260811_143022",
    "timestamp": "2026-08-11T14:30:22Z",
    "env": {
      "model": "gpt-4o",
      "model_version": "2024-08-06",  // OpenAI model date
      "prompt_version": "1.1"
    },
    "results": {
      "nlu": {
        "suite": "nlu_eval",
        "total": 50,
        "passing": 49,
        "accuracy": 0.98,
        "by_field": {
          "goal": 0.98,
          "destination": 0.96,
          "confidence": 0.94
        }
      },
      "search": { ... },
      "hallucinations": { ... }
    }
  }
}
```

Save to `evals/eval_results/{run_id}.json` and commit summaries to git for trend tracking.

---

## 11. Escalation & Fallback Strategy

When an eval fails, here's the decision tree:

```
┌─ Eval fails (accuracy drop > 5%)
│
├─ Is it a regression in existing golden data?
│  ├─ YES → Revert commit, debug with LangSmith traces
│  └─ NO → Continue
│
├─ Is the new prompt more accurate on manual spot-check?
│  ├─ YES → Golden dataset might be outdated; update it + re-run evals
│  └─ NO → Revert + iterate on prompt
│
└─ Always require tech lead approval before overriding failed evals
```

---

## 12. Implementation Roadmap

### Timeline

| Phase | Duration | Key Deliverables | Owner |
|-------|----------|------------------|-------|
| **1: Foundations** | Week 1–2 | Prompt versions, golden dataset (50), test harness, LangSmith project | Backend lead |
| **2: Core Evals** | Week 2–4 | NLU/Search/Booking evals, hallucination detector, baseline recorded | Backend lead + Eval engineer |
| **3: Human Review** | Week 3–5 | Confidence thresholds, clarification-first behavior, approval checklist | Product + Backend |
| **4: Regression & Prod** | Week 5–8 | CI/CD integration, prod sampling, A/B test framework, dashboards | DevOps + Backend |

### Quick Wins (Start Here)

1. **Week 1**: Create golden_dataset.json with 20 real prompts (5 min each)
2. **Week 1**: Write nlu_eval.py harness (accuracy per field)
3. **Week 2**: Add pytest for Python agents (basic unit tests)
4. **Week 2**: Enable LangSmith tracing (5 min setup)
5. **Week 3**: Document confidence thresholds + fallback behaviors

---

## 13. FAQ & Troubleshooting

### Q: How often should we re-run evals?

**A**: Minimum after every:
- LLM model upgrade
- Prompt change
- Golden dataset expansion
- New confidence threshold

Recommended: On every branch push (via CI/CD).

### Q: What if baseline is too strict?

**A**: Adjust golden dataset or thresholds, but document why:
```markdown
## Baseline Adjustment (Aug 15, 2026)

**Previous**: NLU goal accuracy 95%  
**New**: 92%  
**Reason**: Added "clarify" intent; increases valid low-confidence cases  
**Mitigation**: Tighter confidence gating instead

Approved by: @tech-lead
```

### Q: Can we run evals on production queries?

**A**: Yes, via sampled capture:
```python
# server/utils/evalLogger.ts (TS side)
function sampleForEval(event: any): void {
  if (Math.random() < 0.05) {  // 5% sample
    const sanitized = redactPII(event);
    db.insert("eval_samples", sanitized);
  }
}

# evals/eval_prod_replay.py (Python side)
# Fetch samples from DB, re-run NLU, compare to original response
```

### Q: How do we handle model deprecation?

**A**: Before a model is sunset:
1. Re-baseline all evals on new model
2. Run A/B test: 50% old, 50% new, for 2 weeks
3. Flip 100% if quality stable or better
4. Archive old baseline for comparison

---

## 14. Success Criteria

This evaluation framework is **successful** when:

✅ All PRs to python-agents run evals in CI and can't merge if they fail  
✅ Golden dataset grows organically (1–2 real prompts added per week)  
✅ Hallucination rate stays < 1% across all releases  
✅ NLU accuracy ≥ 95% sustained for 4 weeks  
✅ Confidence thresholds reduce clarification requests to < 10%  
✅ Every production incident gets a regression test added  
✅ Monthly eval dashboards show stable/improving trends  

---

## 15. Next Steps (Week 1)

- [ ] Assign Eval Engineer owning this framework
- [ ] Create golden_dataset.json schema + add 20 examples
- [ ] Write nlu_eval.py harness
- [ ] Set up LangSmith project + enable tracing
- [ ] Schedule weekly sync to review baseline and adjust
- [ ] Create GitHub issues for each phase milestone

---

## Related Documents

- `python-agents/README.md` — Architecture & endpoints
- `shared/guidedFlow.ts` — TS-side deterministic state machine (model this for confidence!)
- `memory-and-retention-policy.md` — Chat history usage in eval context
- `read-only-agent-access.md` — Python DB probe safety
