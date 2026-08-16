# Evaluation & QC Implementation Guide

**Quick-Start Templates & Checklists**

---

## Phase 1: Immediate Actions (Days 1–3)

### 1.1 Create Golden Dataset Structure

**File**: `python-agents/evals/golden_dataset.json`

```bash
mkdir -p python-agents/evals
mkdir -p python-agents/evals/eval_results
touch python-agents/evals/golden_dataset.json
touch python-agents/evals/__init__.py
```

**Starter Template** (add 20 real examples from prod logs or user requests):

```json
{
  "version": "1.0",
  "total_examples": 50,
  "last_updated": "2026-08-11",
  "by_intent": {
    "search_shops": [
      {
        "id": "nlu_gd_001",
        "message": "dive shops in Bali",
        "history": [],
        "expected": {
          "goal": "search_shops",
          "destination_text": "Bali",
          "activity_terms": null,
          "wants_booking": false,
          "confidence_min": 0.90,
          "reasoning_contains": ["search", "Bali"]
        }
      },
      {
        "id": "nlu_gd_002",
        "message": "Show me drift diving in Mexico",
        "history": [],
        "expected": {
          "goal": "search_shops",
          "destination_text": "Mexico",
          "activity_terms": ["drift"],
          "wants_booking": false,
          "confidence_min": 0.85
        }
      }
    ],
    "start_booking": [
      {
        "id": "nlu_gd_010",
        "message": "I want to book a dive at Cool Divers",
        "history": [],
        "expected": {
          "goal": "start_booking",
          "shop_name_hint": "Cool Divers",
          "wants_booking": true,
          "confidence_min": 0.80
        }
      }
    ],
    "clarify": [
      {
        "id": "nlu_gd_020",
        "message": "I want to dive",
        "history": [],
        "expected": {
          "goal": "clarify",
          "confidence_max": 0.70,
          "reasoning_contains": ["unclear", "destination"]
        }
      }
    ]
  },
  "by_accuracy_focus": {
    "shop_name_hallucinations": [
      {
        "id": "hal_001",
        "message": "Is the Phantom Dive Shop registered with PADI?",
        "should_extract_shop_name": true,
        "should_NOT_be_hallucinated": true,
        "reason": "This shop is likely made up"
      }
    ],
    "ambiguous_destinations": [
      {
        "id": "amb_001",
        "message": "I want to dive at the Great Barrier",
        "expected_goal": "clarify",
        "confidence_max": 0.65,
        "reason": "Could be Great Barrier Reef (Australia) or other locations"
      }
    ]
  }
}
```

### 1.2 Create Basic Eval Harness

**File**: `python-agents/evals/eval_harness.py`

```python
"""
Main evaluation orchestrator: runs all evals, collects results.
"""

import json
import asyncio
from datetime import datetime
from pathlib import Path

async def run_all_evals() -> dict:
    """Run NLU, search, booking, hallucination evals."""
    
    print("📋 Loading golden dataset...")
    golden_path = Path(__file__).parent / "golden_dataset.json"
    with open(golden_path) as f:
        golden = json.load(f)
    
    print("🧪 Running eval suite...")
    
    results = {
        "run_id": f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "model": "gpt-4o",  # Read from env
        "evals": {}
    }
    
    try:
        # Placeholder: import actual eval functions when ready
        from .nlu_eval import run_nlu_eval
        
        print("  ▶ NLU Eval...")
        results["evals"]["nlu"] = await run_nlu_eval(golden)
        
    except ImportError:
        print("  ⚠️ NLU eval not yet implemented")
        results["evals"]["nlu"] = {"status": "skipped"}
    
    # Compute overall pass/fail
    results["all_passed"] = all(
        r.get("passed_threshold", r.get("passed", True))
        for r in results["evals"].values()
    )
    
    # Save results
    results_dir = Path(__file__).parent / "eval_results"
    results_dir.mkdir(exist_ok=True)
    
    results_file = results_dir / f"{results['run_id']}.json"
    with open(results_file, "w") as f:
        json.dump(results, f, indent=2)
    
    print(f"\n✅ Results saved to {results_file}")
    print(f"Overall: {'PASS' if results['all_passed'] else 'FAIL'}")
    
    return results

if __name__ == "__main__":
    results = asyncio.run(run_all_evals())
    exit(0 if results["all_passed"] else 1)
```

**Run it**:
```bash
cd python-agents
python -m evals.eval_harness
```

### 1.3 Enable LangSmith Tracing

**File**: `.env` (add to python-agents/.env.example)

```bash
# LangSmith (optional for tracing eval runs)
USE_LANGCHAIN=true
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=<your key>
LANGSMITH_PROJECT=deepdive
```

**Code change** (minimal): Already in `python-agents/agents/nlu_agent.py` with LangChain support

### 1.4 Create Eval Checklist

**File**: `docs/eval-release-checklist.md`

```markdown
# Release Checklist

Use this before **any** model/prompt/schema change goes to production.

## Pre-Release (Run Locally)

- [ ] **Evals Pass**
  - [ ] `python -m evals.eval_harness` → all passing
  - [ ] NLU accuracy ≥ 95% on golden dataset
  - [ ] No new hallucinations detected
  
- [ ] **Code Review**
  - [ ] Prompt changelog updated: `docs/prompt-changelog.md`
  - [ ] Prompt version bumped: `agents/nlu_agent.py` → `NLU_SYSTEM_PROMPT_VERSION`
  - [ ] All outputs include `prompt_version` and `model`
  - [ ] No breaking schema changes (backwards compat)

- [ ] **Manual Tests**
  - [ ] `python client_demo.py` → 3 search flows work
  - [ ] Booking flow works end-to-end
  - [ ] Error handling graceful (LLM timeout, parse error, etc.)

- [ ] **LangSmith Review** (if applicable)
  - [ ] 5 recent project traces reviewed
  - [ ] No PII in prompts/outputs
  - [ ] Token usage reasonable

## Approval

- Tech Lead: _____________  Date: ___
- Product: _____________  Date: ___

## After Merge

- [ ] GitHub Actions passed (`pytest`, `eval_harness`)
- [ ] Canary 5% traffic for 4 hours
- [ ] Metrics stable → roll to 100%
```

---

## Phase 2: Build NLU Eval (Days 4–7)

### 2.1 Create NLU Eval Script

**File**: `python-agents/evals/nlu_eval.py`

```python
"""
NLU Evaluation: Test NLU agent against golden dataset.
Metrics: Accuracy by field (goal, destination_text, activity_terms, etc.).
"""

import json
import asyncio
from pathlib import Path
from typing import Any
from dataclasses import dataclass


@dataclass
class FieldResult:
    test_id: str
    field: str
    expected: Any
    actual: Any
    match: bool
    
    def to_dict(self):
        return {
            "test_id": self.test_id,
            "field": self.field,
            "expected": str(self.expected)[:50],
            "actual": str(self.actual)[:50],
            "match": self.match
        }


async def run_nlu_eval(golden_dataset: dict) -> dict:
    """
    Run NLU eval against golden dataset.
    """
    
    # TODO: Replace with actual NLU agent client
    class MockNluClient:
        async def call(self, req):
            # Simulate calling Python NLU agent
            return {
                "ok": True,
                "data": {
                    "goal": "search_shops",
                    "destination_text": "Bali",
                    "activity_terms": None,
                    "confidence": 0.92
                }
            }
    
    client = MockNluClient()
    
    results: list[FieldResult] = []
    failed_tests = []
    
    # Iterate over all intents
    for intent_category, prompts in golden_dataset.get("by_intent", {}).items():
        print(f"\n  Testing '{intent_category}' category ({len(prompts)} examples)...")
        
        for prompt_spec in prompts:
            try:
                # Call NLU
                nlu_resp = await client.call({
                    "message": prompt_spec["message"],
                    "history": prompt_spec.get("history", [])
                })
                
                if not nlu_resp.get("ok"):
                    failed_tests.append({
                        "test_id": prompt_spec["id"],
                        "error": f"NLU call failed"
                    })
                    continue
                
                data = nlu_resp["data"]
                expected = prompt_spec["expected"]
                
                # Check each field
                for field_name in ["goal", "destination_text", "wants_booking", "confidence"]:
                    if field_name not in expected:
                        continue
                    
                    exp_val = expected[field_name]
                    actual_val = data.get(field_name)
                    
                    if field_name == "confidence":
                        # Allow ±0.15 margin
                        match = abs(exp_val - actual_val) < 0.15 if actual_val else False
                    else:
                        match = exp_val == actual_val
                    
                    results.append(FieldResult(
                        test_id=prompt_spec["id"],
                        field=field_name,
                        expected=exp_val,
                        actual=actual_val,
                        match=match
                    ))
                    
                    if not match:
                        print(f"    ❌ {prompt_spec['id']}.{field_name}: expected {exp_val}, got {actual_val}")
            
            except Exception as e:
                failed_tests.append({
                    "test_id": prompt_spec["id"],
                    "exception": str(e)
                })
    
    # Compute stats by field
    stats_by_field = {}
    for field in set(r.field for r in results):
        field_results = [r for r in results if r.field == field]
        passing = sum(1 for r in field_results if r.match)
        total = len(field_results)
        accuracy = passing / total if total > 0 else 0
        
        stats_by_field[field] = {
            "total": total,
            "passing": passing,
            "accuracy": accuracy
        }
    
    # Overall
    total = len(results)
    passing = sum(1 for r in results if r.match)
    overall_accuracy = passing / total if total > 0 else 0
    passed_threshold = overall_accuracy >= 0.95
    
    summary = {
        "suite": "nlu_eval",
        "total_tests": total,
        "passing": passing,
        "failing": total - passing,
        "overall_accuracy": overall_accuracy,
        "by_field": stats_by_field,
        "failed_test_ids": len(failed_tests),
        "failed_tests": failed_tests,
        "target_accuracy": 0.95,
        "passed_threshold": passed_threshold
    }
    
    print(f"\n📊 NLU Eval Summary:")
    print(f"  Overall: {passing}/{total} ({overall_accuracy:.1%})")
    print(f"  Target:  95%")
    print(f"  Status:  {'✅ PASS' if passed_threshold else '❌ FAIL'}")
    for field, stats in stats_by_field.items():
        print(f"    {field}: {stats['accuracy']:.1%}")
    
    if failed_tests:
        print(f"\n⚠️ {len(failed_tests)} tests had errors")
    
    return summary


# Entry for eval_harness
async def run_eval(golden_dataset: dict) -> dict:
    return await run_nlu_eval(golden_dataset)
```

**Usage in eval_harness**:
```python
from .nlu_eval import run_eval as run_nlu_eval
results["evals"]["nlu"] = await run_nlu_eval(golden)
```

### 2.2 Create CI/CD Workflow

**File**: `.github/workflows/eval.yml`

```yaml
name: Python Agent Evals

on:
  push:
    branches: [main, develop]
    paths:
      - 'python-agents/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'python-agents/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install deps
        run: |
          cd python-agents
          pip install -r requirements.txt
      
      - name: Run evals
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          LANGSMITH_API_KEY: ${{ secrets.LANGSMITH_API_KEY }}
        run: |
          cd python-agents
          python -m evals.eval_harness
      
      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: eval-results
          path: python-agents/evals/eval_results/
      
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const path = require('path');
            const resultsDir = 'python-agents/evals/eval_results';
            // Find latest results JSON
            const files = fs.readdirSync(resultsDir).sort().reverse();
            if (files.length > 0) {
              const results = JSON.parse(fs.readFileSync(path.join(resultsDir, files[0])));
              const status = results.all_passed ? '✅' : '❌';
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: `${status} Evals: ${results.evals.nlu?.overall_accuracy?.toFixed(1)}% NLU accuracy`
              });
            }
```

---

## Phase 3: Confidence Thresholds (Days 7–10)

### 3.1 Update Python Agent Output Schema

**File**: `python-agents/models/nlu_models.py` (add fields)

```python
from pydantic import BaseModel, Field

class InterpretedTurn(BaseModel):
    goal: str = Field(..., description="search_shops, start_booking, clarify, etc.")
    goal_confidence: float = Field(..., description="0.0-1.0, confidence in goal classification")
    
    destination_text: str | None = Field(None)
    destination_confidence: float | None = Field(None, description="Confidence in destination extraction")
    
    activity_terms: list[str] | None = Field(None)
    activity_confidence: float | None = Field(None)
    
    shop_name_hint: str | None = Field(None)
    shop_name_confidence: float | None = Field(None)
    
    wants_booking: bool = Field(False)
    booking_confidence: float | None = Field(None, description="Confidence user wants to book")
    
    confidence: float = Field(..., description="Overall confidence (min of all fields)")
    reasoning_summary: str = Field(..., description="Why we made these choices")
    
    # For eval/tracing
    prompt_version: str = Field(..., description="e.g., '1.1'")
    model: str = Field(..., description="e.g., 'gpt-4o'")


class NluResponse(BaseModel):
    ok: bool
    data: InterpretedTurn | None = None
    error: str | None = None
```

### 3.2 Add Confidence to NLU Agent

**File**: `python-agents/agents/nlu_agent.py` (snippet)

```python
async def run_nlu_agent(req: NluRequest) -> NluResponse:
    """Enhanced NLU with per-field confidence."""
    
    try:
        # Call LLM with enhanced prompt
        response = await client.chat.completions.create(
            model=os.getenv("LLM_CHAT_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": NLU_SYSTEM_PROMPT},
                *[{"role": m.role, "content": m.content} for m in req.history],
                {"role": "user", "content": req.message}
            ],
            temperature=0.3,
            top_p=0.9,
            response_format={"type": "json_object"}
        )
        
        parsed = json.loads(response.choices[0].message.content)
        
        # Extract per-field confidences
        goal_conf = parsed.get("goal_confidence", 0.5)
        dest_conf = parsed.get("destination_confidence")
        booking_conf = parsed.get("booking_confidence")
        
        # Overall: minimum of key fields
        overall_conf = min(
            goal_conf,
            dest_conf if dest_conf is not None else 0.7,
            booking_conf if booking_conf is not None else 0.7
        )
        
        return NluResponse(
            ok=True,
            data=InterpretedTurn(
                goal=parsed["goal"],
                goal_confidence=goal_conf,
                destination_text=parsed.get("destination_text"),
                destination_confidence=dest_conf,
                activity_terms=parsed.get("activity_terms"),
                wants_booking=parsed.get("wants_booking", False),
                booking_confidence=booking_conf,
                confidence=overall_conf,
                reasoning_summary=parsed.get("reasoning_summary", ""),
                prompt_version=NLU_SYSTEM_PROMPT_VERSION,
                model=os.getenv("LLM_CHAT_MODEL", "gpt-4o")
            ),
            error=None
        )
    
    except Exception as e:
        return NluResponse(ok=False, data=None, error=str(e))
```

### 3.3 TypeScript: Use Confidence Gates

**File**: `server/utils/runAiSearchPostHandler.ts` (add helper)

```typescript
export function needsClarification(nlu: InterpretedTurn): boolean {
  // Gate behind confidence thresholds
  const thresholds = {
    goal: 0.80,
    destination: 0.75,
    booking: 0.70
  };
  
  if (nlu.goal_confidence < thresholds.goal) {
    return true;
  }
  
  if (nlu.goal === "search_shops" && 
      !nlu.destination_text && 
      nlu.destination_confidence! < thresholds.destination) {
    return true;
  }
  
  if (nlu.wants_booking && 
      nlu.booking_confidence! < thresholds.booking) {
    return true;
  }
  
  return false;
}

export function clarificationPrompt(nlu: InterpretedTurn): string | null {
  if (!needsClarification(nlu)) return null;
  
  if (nlu.goal_confidence < 0.80) {
    return "Are you looking to search for shops or would you like to book?";
  }
  
  if (!nlu.destination_text) {
    return "Where would you like to dive?";
  }
  
  if (nlu.wants_booking && nlu.booking_confidence! < 0.70) {
    return "Would you like to just browse or go ahead and book?";
  }
  
  return null;
}
```

---

## Phase 4: Minimal pytest Suite (Days 10–14)

### 4.1 Add Unit Tests

**File**: `python-agents/tests/test_nlu_agent.py`

```python
import pytest
import json
from agents.nlu_agent import run_nlu_agent
from models.nlu_models import NluRequest


@pytest.mark.asyncio
async def test_nlu_basic_search():
    """NLU correctly extracts a basic search intent."""
    req = NluRequest(
        message="dive shops in Bali",
        history=[]
    )
    
    resp = await run_nlu_agent(req)
    
    assert resp.ok
    assert resp.data.goal == "search_shops"
    assert resp.data.destination_text == "Bali"
    assert resp.data.confidence >= 0.75


@pytest.mark.asyncio
async def test_nlu_booking_intent():
    """NLU detects booking intent."""
    req = NluRequest(
        message="I want to book at Cool Divers",
        history=[]
    )
    
    resp = await run_nlu_agent(req)
    
    assert resp.ok
    assert resp.data.goal == "start_booking"
    assert resp.data.wants_booking
    assert resp.data.booking_confidence is not None


@pytest.mark.asyncio
async def test_nlu_with_history():
    """NLU tracks conversation context."""
    history = [
        {"role": "user", "content": "Find me dive shops"},
        {"role": "assistant", "content": "Here are shops in various locations..."}
    ]
    
    req = NluRequest(
        message="How about in Mexico?",
        history=history
    )
    
    resp = await run_nlu_agent(req)
    
    assert resp.ok
    # Should infer continuation of search
    assert resp.data.goal in ["search_shops", "clarify"]


@pytest.mark.asyncio
async def test_nlu_output_schema():
    """NLU response always has required fields."""
    req = NluRequest(message="test", history=[])
    resp = await run_nlu_agent(req)
    
    assert hasattr(resp, "ok")
    assert hasattr(resp, "data")
    if resp.ok:
        assert hasattr(resp.data, "goal")
        assert hasattr(resp.data, "confidence")
        assert hasattr(resp.data, "prompt_version")
```

**Run**:
```bash
cd python-agents
pip install pytest pytest-asyncio
pytest tests/ -v
```

---

## Summary: Checklist to Start Today

**☑ Day 1–2** (2 hours)
- [ ] Create `evals/` directory structure
- [ ] Add 20 golden examples to `golden_dataset.json`
- [ ] Create `eval_harness.py` skeleton

**☑ Day 2–3** (2 hours)
- [ ] Enable LangSmith in `.env.example`
- [ ] Create `eval-release-checklist.md`
- [ ] Add to README: "Run evals before every release"

**☑ Day 4–7** (6 hours)
- [ ] Implement `nlu_eval.py`
- [ ] Add CI/CD workflow
- [ ] Test locally: `python -m evals.eval_harness`

**☑ Day 7–10** (4 hours)
- [ ] Update NLU output schema with confidence fields
- [ ] Implement confidence extraction in nlu_agent.py
- [ ] Add TypeScript helpers: `needsClarification()`, `clarificationPrompt()`

**☑ Day 10–14** (4 hours)
- [ ] Write basic pytest suite
- [ ] Test NLU agent with 5 test cases
- [ ] Document baseline results

**Total**: ~20 hours to Phase 2. Build from there.


