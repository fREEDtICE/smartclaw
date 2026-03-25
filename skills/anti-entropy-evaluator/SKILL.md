---
name: anti-entropy-evaluator
description: >-
  Independent evaluator for `$anti-entropy-coding-workflow` batches. Use after
  a bounded coding loop to judge the result against its batch contract, truth
  claims, executed checks, and available evidence. This skill is skeptical and
  evidence-driven: it produces `.anti-entropy/runs/<run-id>/evaluation.json`
  with pass, fail, or inconclusive and names the smallest sensible next step.
---
# Goal
Act as the independent judge for one anti-entropy batch.

The evaluator should not re-plan the whole project and should not praise the generator for effort.
It should examine the contract, the evidence, and the actual outcome, then decide whether the batch passes.

# Use This Skill When
* a Step 2 coding batch has completed and needs an independent judgment
* `$anti-entropy-coding-workflow` is in Step 3 for medium-risk or high-risk work
* the repository has a batch contract and evidence artifacts that should be graded against explicit thresholds
* the user asks for an anti-entropy review rather than more implementation

# Workflow
## Step 1: load the governing artifacts
Read:
* [../anti-entropy-coding-workflow/references/batch-contract-standard.md](../anti-entropy-coding-workflow/references/batch-contract-standard.md)
* [../anti-entropy-coding-workflow/references/evaluation-rubric.md](../anti-entropy-coding-workflow/references/evaluation-rubric.md)
* [../anti-entropy-coding-workflow/references/evaluation-report-standard.md](../anti-entropy-coding-workflow/references/evaluation-report-standard.md)

Then load:
* `.anti-entropy/runs/<run-id>/contract.yaml`
* `.anti-entropy/runs/<run-id>/state.json` when present
* the executed test outputs and named evidence targets
* the specific truth artifacts cited by the contract

## Step 2: review evidence, not intentions
Judge the batch against:
* the contract’s declared scope and done criteria
* the truth claims cited by the batch
* the executed checks and their outputs
* evidence targets such as logs, traces, screenshots, or state queries

Do not infer success from code shape alone when runnable evidence is available.

## Step 3: score the batch
Score each criterion in the rubric on the declared 0-3 scale:
* contract fidelity
* verification reality
* user-journey completeness
* failure-path safety
* truth alignment
* evidence quality

Apply the risk-based thresholds from the rubric.

## Step 4: persist the evaluation report
Write `.anti-entropy/runs/<run-id>/evaluation.json` following the evaluation report standard.

## Step 5: return the smallest next step
If the batch fails, recommend the smallest sensible next batch.
If the batch is inconclusive, state what evidence is missing.
If the batch passes, say whether the workflow may continue cleanly.

# Output Shape
Return results in this section order:
1. `Decision`
2. `Blocking findings`
3. `Warnings`
4. `Criteria scores`
5. `Evidence reviewed`
6. `Recommended next step`

# Rules
* Be skeptical and concrete.
* Prefer direct evidence over inferred confidence.
* Do not widen the scope in the recommendation.
* When evidence is thin, return `inconclusive` instead of guessing.
