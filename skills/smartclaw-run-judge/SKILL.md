---
name: smartclaw-run-judge
description: Evaluate completed Smartclaw end-to-end runs against an approved scenario spec, test script, run record, trace artifacts, and replay evidence. Use when Codex must decide pass, fail, or inconclusive; verify lifecycle, policy, checkpoint, capability, memory, sandbox, delegation, replay, or observability contracts; classify the likely failure surface as product, harness, test, or contract gap; and produce a concise auditable post-run report.
---

# Smartclaw Run Judge

Evaluate one completed Smartclaw E2E run package. Treat the approved scenario spec, authored test script, run record, trace artifacts, replay artifacts, and documented platform contracts as the only truth sources. Do not infer hidden intent beyond the scenario and the docs.

## Workflow

1. Read the scenario spec first. Extract the explicit assertions, required fixtures, and named contracts under test.
2. Read the test script second. Confirm what the harness attempted to prove, what it seeded, and which proof surfaces it claims to inspect.
3. Read the run record, trace artifacts, replay artifacts, and any side-effect evidence. Treat this run package as the primary evidence set.
4. Read only the minimum Smartclaw design docs needed to judge the exercised concerns. Use [references/source-map.md](references/source-map.md) to select them.
5. Judge the run only against documented platform contracts and explicit scenario assertions. If the required behavior is not defined, write `contract gap` instead of guessing.
6. Produce one concise report with an auditable verdict and explicit evidence citations.

## Evidence Rules

* Treat the run record as the primary oracle for lifecycle transitions, approval waits, checkpoints, side effects, and terminal status.
* Treat trace, replay, and artifact refs as the proof surface for observability and replay claims.
* Treat the final assistant output as necessary but not sufficient.
* Treat missing artifacts as evidence only when the scenario or contract explicitly requires those artifacts.
* Separate missing proof from proof of absence. Use `inconclusive` when the package cannot distinguish the two.
* Apply document precedence strictly: Layer 1 overrides Layer 1.5, and Layer 1.5 overrides Layer 2.

## Mandatory Checks

Check only the categories the scenario actually exercises:

* run lifecycle transitions
* policy timing relative to side effects
* checkpoint presence at required boundaries
* capability exposure correctness
* memory versus retrieval separation
* sandbox enforcement
* bounded subagent delegation
* replay artifact completeness
* observability completeness

If a category matters to the scenario but the artifact package cannot prove it, call that out explicitly instead of filling in the gap from intuition.

## Verdict Rules

* `pass`: every exercised scenario assertion and cited contract is satisfied by the evidence.
* `fail`: at least one explicit scenario assertion or documented contract is violated by the evidence.
* `inconclusive`: the evidence is missing, contradictory, nondeterministic, or blocked by an undocumented proof surface.

## Defect Taxonomy

Distinguish the outcome classes this way:

* `product defect`: the run evidence shows Smartclaw behavior violating a documented contract or explicit scenario assertion.
* `harness defect`: the harness failed to drive, capture, preserve, or expose the required proof surface, and the product violation is not established.
* `test failure`: the scenario or script asserts behavior not promised by the docs, seeds invalid preconditions, or otherwise breaks its own oracle.
* `contract gap`: the scenario requires behavior, state, or artifacts that the Smartclaw docs do not define.
* `nondeterministic / inconclusive outcome`: repeated or contradictory evidence prevents a stable ruling. Use verdict `inconclusive`; assign a suspected defect class only when the evidence supports one.

When a required artifact is missing, classify carefully:

* Use `product defect` only when the platform contract requires the product to emit or persist that artifact and the run evidence shows it did not.
* Use `harness defect` when the product may have produced the artifact but the harness or collection pipeline failed to retain or expose it.
* Use `contract gap` when no document defines whether the artifact must exist.

## Reporting Rules

* Cite the exact violated scenario assertion or contract label whenever the verdict is `fail`.
* Keep conclusions tied to named sections, states, artifacts, and timestamps where available.
* Do not suggest fixes unless the evidence directly supports the diagnosis.
* Prefer concise, auditable language over speculation.

## Output Format

Use exactly these sections and keep them in this order:

### Verdict

Write `pass`, `fail`, or `inconclusive`.

### Scenario

Name the scenario and summarize the journey, fixtures, and artifact package under review.

### Evidence summary

Summarize the decisive run-record, trace, replay, and side-effect facts, including any missing or contradictory evidence.

### Assertions passed

List only the scenario assertions or contracts that the evidence clearly satisfies.

### Assertions failed

List each violated or unproven required assertion. If none, write `None`.

### Violated contracts

List each violated contract by document and section label. If none, write `None`.

### Suspected defect class: product / harness / test / contract gap

Choose the narrowest class supported by the evidence.

### Replayability assessment

State whether the artifact package is sufficient to replay or audit the run at the required fidelity. Name any missing replay-critical artifacts or degraded replay posture.

### Recommended next action

State the minimum next step needed to resolve the failure or inconclusive result.

## Reading Guide

Use [references/source-map.md](references/source-map.md) to select the minimum design docs for each assertion cluster.

## Example Prompts

* `Use $smartclaw-run-judge to evaluate this completed Smartclaw E2E run and report whether the policy-first side-effect contract passed.`
* `Use $smartclaw-run-judge to judge this run package against the scenario, classify the failure surface, and assess replay completeness.`
* `Use $smartclaw-run-judge to review these run and trace artifacts for bounded delegation, sandbox enforcement, and observability coverage.`
