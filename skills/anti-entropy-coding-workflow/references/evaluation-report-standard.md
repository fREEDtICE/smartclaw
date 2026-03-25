# Evaluation Report Standard

# Purpose
The evaluation report is the independent judgment artifact for one completed batch.

# File location
Store the report at:
* `.anti-entropy/runs/<run-id>/evaluation.json`

# Required fields
The report should define:
* `run_id`
* `scope`
* `risk`
* `contract_path`
* `decision`
* `criteria_scores`
* `blocking_findings`
* `warnings`
* `evidence_reviewed`
* `recommended_next_step`
* `evaluated_at`

# Decision values
* `pass`: the batch met its thresholds and may continue
* `fail`: the batch did not meet its thresholds
* `inconclusive`: the evaluator could not verify enough evidence to judge cleanly

# Evidence rules
The report should cite the evidence it actually reviewed:
* test outputs
* trace artifacts
* screenshots
* log files
* database or filesystem state checks

# Quality bar
The report should make two things obvious:
* why the batch passed or failed
* what the smallest sensible next step is

# Example shape
```json
{
  "run_id": "runtime-core-001",
  "scope": "execution-core",
  "risk": "medium",
  "contract_path": ".anti-entropy/runs/runtime-core-001/contract.yaml",
  "decision": "fail",
  "criteria_scores": {
    "contract_fidelity": 2,
    "verification_reality": 3,
    "user_journey_completeness": 1,
    "failure_path_safety": 2,
    "truth_alignment": 3,
    "evidence_quality": 2
  },
  "blocking_findings": [
    "The happy-path journey still fails at runtime startup."
  ],
  "warnings": [
    "Evidence is sufficient for the smoke path but thin for the denial path."
  ],
  "evidence_reviewed": [
    "smoke test output",
    "journey trace artifact",
    "runtime logs"
  ],
  "recommended_next_step": "Fix runtime startup for the journey path without widening the scope.",
  "evaluated_at": "2026-03-25T00:00:00Z"
}
```
