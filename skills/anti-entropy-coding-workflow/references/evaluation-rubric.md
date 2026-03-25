# Evaluation Rubric

# Purpose
The evaluator should grade a completed batch against explicit criteria instead of giving a vague approval.

# Scoring model
Use a 0-3 scale for each criterion:
* `0`: failed
* `1`: materially incomplete
* `2`: acceptable with issues
* `3`: passes cleanly

# Criteria
## Contract fidelity
Did the batch implement what the contract said, and avoid unrelated scope growth?

## Verification reality
Were the declared checks actually run, and are they real checks rather than placeholder validations?

## User-journey completeness
Does the selected happy path or journey behave as the contract promised?

## Failure-path safety
Do the denial, reset, or negative-path expectations still hold where they were declared?

## Truth alignment
Do the changed files still satisfy the cited truth claims and avoid obvious contract drift?

## Evidence quality
Is there enough evidence for another reviewer to verify the pass or failure without re-deriving the whole run?

# Default thresholds
* low-risk batch: no criterion may score `0`
* medium-risk batch: `Verification reality`, `User-journey completeness`, and `Truth alignment` must score `3`
* high-risk batch: `Verification reality`, `User-journey completeness`, `Failure-path safety`, and `Truth alignment` must score `3`

# Failure policy
If any required criterion misses its threshold:
* the batch fails
* the evaluator should name the smallest next fix batch

# Evaluator stance
The evaluator should be skeptical, concrete, and evidence-driven.
It should not praise the generator for effort.
It should grade the output that exists.
