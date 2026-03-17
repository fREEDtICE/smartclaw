# Frame AI Agent Platform — Layer 2 Subsystem Design Template

## 1. Document Metadata

**Subsystem Name:**
**Document Version:**
**Status:** Draft / Review / Approved / Deprecated
**Owners:**
**Reviewers:**
**Last Updated:**
**Depends On:**
**Related Docs:**

* Layer 1 Overview
* Layer 1.5 Cross-Cutting Contracts
* Related subsystem docs

---

## 2. Purpose

Describe what this subsystem exists to do in one short paragraph.

Answer:

* Why does this subsystem exist?
* What platform problem does it solve?
* Why is it a separate subsystem instead of part of another one?

---

## 3. Scope

### In Scope

List what this subsystem is responsible for.

### Out of Scope

List what this subsystem must not own.

This section is critical. It prevents subsystem overlap.

---

## 4. Architectural Role

Explain where this subsystem sits in the overall platform.

Include:

* upstream dependencies
* downstream consumers
* whether it is on the live execution path, offline path, or both

Suggested format:

**Upstream inputs**

* …

**Downstream outputs**

* …

**Primary consumers**

* …

**Execution path**

* live / asynchronous / scheduled / hybrid

---

## 5. Goals and Non-Goals

### Goals

What this subsystem must optimize for.

Examples:

* correctness
* replayability
* safety
* latency
* extensibility
* observability

### Non-Goals

What this subsystem is intentionally not trying to optimize for.

This is where many good design docs become much stronger.

---

## 6. Canonical Responsibilities

Define the subsystem’s responsibilities as a short authoritative list.

Each responsibility should be written as:

* verb + object + constraint

Example:

* assemble runtime context under token budget and precedence rules
* persist checkpoints for resumable execution
* enforce sandbox resource limits during execution

---

## 7. External Contracts

Describe the contract this subsystem exposes to the rest of the platform.

Include:

* required inputs
* produced outputs
* required metadata
* invariants this subsystem must preserve

Recommended subsections:

### Inputs

What enters this subsystem?

### Outputs

What leaves this subsystem?

### Required metadata

What identifiers or context must always be present?

### Preserved invariants

Which Layer 1.5 invariants does this subsystem directly enforce?

---

## 8. Internal Model

Define the main internal concepts this subsystem uses.

This should include:

* core entities
* state objects
* lifecycle objects
* references to other subsystem objects

Suggested format:

### Core entities

* `EntityName`: description
* `EntityName`: description

### Key state

* …

### Derived views

* …

---

## 9. Lifecycle / Execution Flow

Describe the full lifecycle for this subsystem.

Use step-by-step flow, not just prose.

Suggested structure:

```text
1. …
2. …
3. …
4. …
```

Then add:

### Entry conditions

What must be true before this subsystem starts work?

### Exit conditions

What must be true when it finishes successfully?

### Failure exits

How does it fail, pause, retry, or defer?

---

## 10. Interfaces and APIs

Define the subsystem interfaces at a platform-contract level.

This is not just code. It is the API shape and behavioral contract.

Suggested subsections:

### Public internal interfaces

Interfaces exposed to other subsystems.

### Dependency interfaces

Interfaces this subsystem requires from others.

### Example type definitions

Use pseudocode or interface definitions when useful.

Example format:

```ts
interface ExampleSubsystem {
  start(input: Input, ctx: RequestContext): Promise<Result>;
}
```

Include:

* sync vs async behavior
* idempotency expectations
* retry behavior
* serialization requirements

---

## 11. State, Persistence, and Data Model

Describe what data this subsystem owns.

Include:

* source of truth
* cached/derived state
* storage choices
* retention
* indexing
* consistency expectations

Suggested subsections:

### Owned data

### Referenced data

### Persistence model

### Retention and cleanup

### Consistency model

---

## 12. Policy and Security Considerations

Every subsystem doc should explicitly state how policy and security apply.

Suggested subsections:

### Policy touchpoints

Where policy evaluation is required.

### Access control

What identities/scopes can access what.

### Sensitive data handling

Secrets, PII, user content, credentials, etc.

### Isolation boundaries

Sandbox, scope filtering, environment separation, or trust zones.

---

## 13. Observability and Replay

This section is mandatory for every subsystem.

### Required logs

What structured logs must be emitted?

### Required traces

What spans/events must be emitted?

### Metrics

Latency, error rate, throughput, cost, queue depth, success rate, etc.

### Replay requirements

What must be recorded for replay/debugging?

### Audit requirements

What evidence is needed for human review?

---

## 14. Failure Modes and Recovery

Describe what can go wrong and how the subsystem responds.

Suggested structure:

| Failure Mode | Detection | Impact | Recovery Strategy |
| ------------ | --------- | ------ | ----------------- |

Also include:

* retry policy
* dead-letter / escalation path
* partial success behavior
* operator intervention requirements

---

## 15. Scalability and Performance

Explain how the subsystem scales and what its bottlenecks are.

Suggested subsections:

### Expected load profile

### Latency sensitivity

### Throughput model

### Bottlenecks

### Horizontal scaling strategy

### Caching strategy

### Backpressure behavior

---

## 16. Configuration

Describe the configuration surface for this subsystem.

For each config category, define:

* name
* purpose
* type
* default
* override level
* hot reload support

Suggested structure:

| Config | Purpose | Type | Default | Override Level | Reloadability |
| ------ | ------- | ---- | ------- | -------------- | ------------- |

---

## 17. Dependencies

List dependencies in two groups.

### Upstream dependencies

Subsystems/services this subsystem depends on.

### Downstream impact

Subsystems/services affected by this subsystem’s outputs.

This makes change impact much easier to reason about.

---

## 18. Tradeoffs and Design Decisions

This section should record the important choices and why they were made.

Suggested format:

### Decision

What was chosen?

### Alternatives considered

What else was possible?

### Why this choice

Why is this better in this architecture?

### Consequences

What complexity or limitation does this introduce?

This section becomes extremely valuable later.

---

## 19. Risks and Open Questions

### Current risks

What is still fragile, ambiguous, or high-risk?

### Open questions

What still needs a decision?

### Deferred work

What is intentionally postponed to a later phase?

---

## 20. Implementation Plan

This keeps the doc practical.

Suggested subsections:

### Phase 1

Minimal viable implementation

### Phase 2

Production hardening

### Phase 3

Advanced capabilities

---

## 21. Test and Validation Strategy

Every subsystem doc should define how correctness will be validated.

Suggested subsections:

### Unit-level validation

### Integration validation

### Replay validation

### Failure injection / chaos testing

### Security validation

### Performance validation

---

## 22. Appendix

Optional section for:

* example payloads
* example traces
* schemas
* diagrams
* sample configs
* migration notes

---

# Required Section Rules

To keep subsystem docs consistent, I would mark these as **mandatory**:

Mandatory:

* Purpose
* Scope
* Goals / Non-Goals
* Responsibilities
* External Contracts
* Lifecycle / Execution Flow
* Interfaces and APIs
* State / Persistence
* Policy and Security
* Observability and Replay
* Failure Modes and Recovery
* Scalability and Performance
* Risks and Open Questions

Optional:

* Appendix
* Implementation Plan
* Example type definitions

---

# Recommended Writing Rules

I would apply these rules to every Layer 2 doc:

## Rule 1 — Be explicit about boundaries

Every doc must say both:

* what it owns
* what it does not own

## Rule 2 — Prefer contracts over descriptions

Do not just say “the subsystem handles X.”
Say:

* input
* output
* invariants
* failure behavior

## Rule 3 — Separate current design from future ideas

Do not mix:

* committed design
* optional future improvements

## Rule 4 — Always include failure behavior

A subsystem is not designed until its failure modes are designed.

## Rule 5 — Always include policy and replay implications

Because your platform is policy-first and replay-aware, every subsystem must state how it supports those constraints.

## Rule 6 — Make identifiers and scopes explicit

Every subsystem must declare which of these it uses:

* userId
* threadId
* runId
* collaborativeScopeId
* executionSpaceId