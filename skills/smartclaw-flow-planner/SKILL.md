---
name: smartclaw-flow-planner
description: Generate contract-driven end-to-end test scenarios for the Smartclaw AI agent platform from architecture and design documents. Use when asked to read files under docs/design or docs/e2e and turn Layer 1.5 invariants plus Layer 2 subsystem contracts into deterministic scenario proposals, coverage plans, user-journey test outlines, or contract-gap callouts.
---

# Smartclaw Flow Planner

## Overview

Read the Smartclaw architecture and design documents and draft candidate E2E scenarios from platform contracts and user journeys, not from code structure. Treat Layer 1.5 invariants as mandatory, use Layer 2 only to refine states and artifacts, and note that several repo docs still use the legacy product name `SmartClaw Agent Platform`.

## Workflow

1. Read [../../docs/design/README.md](../../docs/design/README.md), [../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md](../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md), and [../../docs/e2e/End-to-End.Testing.Strategy.RFC.md](../../docs/e2e/End-to-End.Testing.Strategy.RFC.md) first.
2. Extract the non-negotiable Layer 1.5 contracts under test before reading subsystem details. Do not weaken or reinterpret them.
3. Prefer deterministic scenarios first. Default to the RFC's deterministic lab fixtures unless the user explicitly asks for staging or live coverage.
4. Read only the Layer 2 documents needed for the chosen contracts or journeys. Use [references/source-map.md](references/source-map.md) to select them.
5. Build scenarios from end-to-end user or operator journeys. Do not derive them from package boundaries, handlers, or internal API guesses.
6. Tie every required fixture, artifact, and oracle back to a documented contract, state model, or RFC assertion.
7. If the docs do not define required behavior, write `contract gap:` and stop short of inventing internals.

## Non-Negotiables

Apply these rules to every scenario:

* Treat policy-first side effects as mandatory.
* Treat recoverability, resumability, and inspectability as mandatory.
* Require observability for every meaningful action.
* Require identity and scope propagation.
* Keep memory and retrieval distinct.
* Validate only executable capability exposure.
* Treat sandboxing as a trust boundary.
* Treat delegation as bounded by explicit child contracts.
* Require replay artifacts for supported deterministic runs.
* Require traceable configuration precedence.
* Avoid product-specific UX polish assumptions.
* Prefer deterministic scenarios before live or environment-bound ones.

## Draft Scenarios

1. Choose one primary contract cluster per scenario. Add secondary contracts only when they are necessary to make the flow executable.
2. Prefer journeys already surfaced by the RFC:
   * tool allow, deny, or approval
   * crash and resume around side effects
   * memory vs retrieval separation
   * capability filtering
   * sandbox restriction
   * identity continuity
   * bounded delegation
   * replay validation
   * configuration precedence
3. Assign risk according to governance and blast radius:
   * `High`: approval gates, irreversible side effects, cross-scope access, sandbox escape risk, replay holes, delegation overreach
   * `Medium`: recoverability, trace completeness, configuration precedence, capability mismatch, memory conflict handling
   * `Low`: deterministic happy paths with bounded impact
4. Use Given/When/Then only for behavior defined by the docs: inbound interaction, state transitions, policy timing, capability exposure, execution, checkpoints, outputs, and persisted artifacts.
5. Make required observability and replay artifacts explicit. If a scenario cannot be audited or replayed from documented artifacts, it is incomplete.
6. If multiple Layer 2 docs touch the same flow, resolve conflicts with the repo hierarchy: Layer 1 > Layer 1.5 > Layer 2.

## Output Format

For each scenario, use exactly these sections:

### Scenario summary

* `Title:`
* `Risk level:`
* `Rationale:`

### Contracts validated

* List each Layer 1.5 contract and the Layer 2 subsystem contracts it validates.

### Preconditions and fixtures

* Include the seeded user, thread, collaborative scope, config, policy rules, model mode, tool set, execution-space posture, memory store, retrieval corpus, and approval or replay fixtures needed for the flow.

### Given / When / Then

* Describe one deterministic end-to-end journey.

### Required assertions

* `Required fixtures:` call out any fixture state that must remain true during execution.
* `Required observability artifacts:` list the run views, events, lineage refs, and decision artifacts that must exist.
* `Required replay artifacts:` list the model, tool, checkpoint, policy, snapshot, or child-handoff evidence required for replay.
* `Pass/fail oracle:` state the minimal facts that decide the scenario outcome.

### Required harness capabilities

* Name the deterministic lab components the scenario depends on, such as the synthetic channel driver, identity/thread fixture service, model adapter mode, tool harness, sandbox harness, seeded memory and retrieval stores, trace collector, and replay verifier.

### Open questions / contract gaps

* Write `None` when the docs are sufficient.
* Prefix every unresolved item with `contract gap:`.

## Reading Guides

Use [references/source-map.md](references/source-map.md) to map contracts to the minimum design docs. Use [references/scenario-shape.md](references/scenario-shape.md) when you need the RFC-aligned template, assertions, and harness checklist.

## Example Prompts

* `Use $smartclaw-flow-planner to propose P0 deterministic scenarios for policy-first side effects and approval waits.`
* `Use $smartclaw-flow-planner to draft Smartclaw scenarios for memory vs retrieval separation and replay evidence completeness.`
* `Use $smartclaw-flow-planner to read the subagent and sandbox contracts and produce bounded-delegation E2E cases.`
