# Batch Contract Standard

# Purpose
A bounded coding loop needs a concrete definition of `done` before code is written.
The batch contract is the bridge between high-level truth artifacts and a single implementation batch.

# File location
Store the contract at:
* `.anti-entropy/runs/<run-id>/contract.yaml`

# Required fields
The contract should define:
* `run_id`
* `scope`
* `risk`
* `change_intent`
* `truth_artifacts`
* `truth_claims`
* `allowed_paths`
* `planned_checks`
* `failure_checks`
* `evidence_targets`
* `done_criteria`
* `stop_conditions`

# Field guidance
* `truth_artifacts`: the specific source-of-truth files that justify the batch
* `truth_claims`: the concrete claims that must remain true after the batch
* `allowed_paths`: the only files or directories this batch expects to change
* `planned_checks`: the smoke, targeted, and optional E2E checks to run during the batch
* `failure_checks`: the negative or denial paths that must remain safe
* `evidence_targets`: logs, traces, screenshots, state queries, or files that the evaluator should inspect
* `done_criteria`: the narrow bar for this batch to count as complete
* `stop_conditions`: reasons to reset rather than widen the batch

# Quality bar
The contract must be:
* narrow enough that success or failure is obvious
* specific enough that a skeptical evaluator can grade it
* honest about what will and will not be attempted in this batch

# Rules
* One batch contract covers one scope and one objective.
* If the batch needs a second independent objective, split it.
* If the generator cannot explain the evidence targets before coding, the batch is underspecified.

# Example shape
```yaml
run_id: runtime-core-001
scope: execution-core
risk: medium
change_intent: make the runtime start path executable and prove one happy-path tool-free request
truth_artifacts:
  - docs/design/Layer.1-Overview.Architecture.md
  - docs/design/Layer.1.5-Cross.Cutting.Contracts.md
  - docs/design/Layer.2-Agent.Runtime.Subsystem.md
  - docs/e2e/Basic.User.Journey.Cases.md
truth_claims:
  - run lifecycle identifiers must propagate through the request path
  - no side effects occur before policy evaluation
allowed_paths:
  - cmd/runtime/
  - internal/runtime/
  - internal/testkit/
planned_checks:
  - go test ./cmd/runtime/smoke -run TestRuntimeSmoke
  - go test ./internal/testkit/e2e -run TestBasicJourney
failure_checks:
  - denied execution path still fails closed
evidence_targets:
  - runtime startup logs
  - smoke test output
  - journey trace artifact
done_criteria:
  - runtime starts successfully for the selected path
  - smoke and happy-path journey checks pass
stop_conditions:
  - implementation needs a second route profile
  - implementation needs policy breadth beyond the selected path
```
