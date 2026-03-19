---
name: smartclaw-script-author
description: Convert approved Smartclaw end-to-end scenarios into executable black-box test scripts and supporting assertions. Use when the scenario is already approved and Codex needs to author deterministic E2E test procedures, fixture plans, harness usage, lifecycle assertions, replay checks, or bounded-delegation checks from Smartclaw design contracts without reading product source code.
---

# Smartclaw Script Author

Convert one approved scenario into one executable black-box test specification. Treat the approved scenario and documented harness contracts as the only product truth. If the scenario is not approved yet, stop and use `smartclaw-flow-planner` first.

## Workflow

1. Read the approved scenario spec first. Extract the exact journey, contracts under test, fixtures, expected visible outcome, and any replay or observability requirements already named there.
2. Read only the minimum Smartclaw design docs needed to author the script. Use [references/source-map.md](references/source-map.md) to select them.
3. Translate the scenario into harness actions only. Interact only through canonical inbound event injection, seeded fixtures or fake tools, approval or resume controls, run-state inspection, and trace, replay, or side-effect inspection.
4. Write the script around the run record, not just the final response. The visible output still matters, but the primary oracle is whether the run lifecycle, policy, capability, checkpoint, trace, replay, and side-effect evidence match the documented contracts.
5. Keep assertions tied to documented behavior. If the scenario needs a hook, fixture, or inspection surface that the harness contract does not define, write it under `Missing harness capabilities / blockers` instead of inventing it.

## Non-Negotiables

Apply these rules to every script:

* Use only the approved scenario spec and documented harness contract.
* Do not read or depend on product source code.
* Do not invent product-facing binary APIs, hidden endpoints, or shortcut business-flow APIs.
* Prefer deterministic fixtures, recorded model behavior, fake external systems, and replayable modes unless the scenario explicitly targets staging or live behavior.
* Assert visible output plus every relevant lifecycle, policy, checkpoint, capability, trace, replay, and side-effect condition defined by the docs.
* Keep tool exposure assertions separate from prompt-context assertions.
* For child or subagent scenarios, verify bounded delegation, explicit child capability limits, and no assumed inheritance of the full parent scratchpad.
* Emit `missing harness capability:` for any required proof surface the harness does not expose.

## Authoring Rules

1. Start from the external journey:
   * seeded fixtures
   * canonical inbound event
   * policy or approval gates
   * execution and side effects
   * completion, pause, or resume
   * trace and replay evidence
2. Use harness verbs, not internal implementation guesses. Good phrases include `inject inbound event`, `seed policy fixture`, `wait for waiting_approval`, `resume approved action`, `inspect run state`, `inspect trace`, `inspect replay artifact`, and `inspect side-effect evidence`.
3. Separate assertions by concern:
   * visible output or user-visible action
   * run-state and checkpoint behavior
   * policy decision timing and approval binding
   * effective capability exposure
   * context or prompt evidence when relevant
   * side-effect presence or absence
   * trace and replay completeness
4. When a scenario does not exercise a concern, omit that assertion type instead of fabricating it.
5. Keep every asserted fact traceable to a scenario statement or Smartclaw contract.

## Output Format

Use exactly these sections and keep them in this order:

### Test name

### Scenario reference

### Harness capabilities used

### Fixture setup

### Test procedure

### Assertions

### Replay checks

### Cleanup

### Missing harness capabilities / blockers

Use [references/script-shape.md](references/script-shape.md) for the section-level checklist and assertion categories.

## Writing Notes

* Write procedures as executable black-box steps, usually numbered.
* Name the exact harness surfaces required, such as inbound event injection, fake tool adapters, approval controls, run-state reads, trace collector access, replay verifier access, and side-effect inspectors.
* When the same scenario needs both capability and context checks, keep them as separate bullets in `Assertions`.
* When replay is part of the contract, require replay evidence for model, tool, policy, checkpoint, and child-delegation boundaries as applicable.
* In `Cleanup`, reset only seeded fixtures, fake tools, and temporary artifacts created for the test.
* In `Missing harness capabilities / blockers`, write `None` only when the harness can prove every required contract.

## Example Prompts

* `Use $smartclaw-script-author to turn this approved Smartclaw scenario into an executable deterministic black-box test spec.`
* `Use $smartclaw-script-author to write the harness procedure and assertions for this approved approval-wait-and-resume scenario.`
* `Use $smartclaw-script-author to author a bounded-delegation test script from this approved Smartclaw scenario, including replay checks and capability assertions.`
