# SmartClaw Agent Platform — Layer 2

## Delivery Phases and Seam Contracts

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define delivery phases, contract boundaries, handoff rules, and phase-exit expectations, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, error types, and concrete test cases belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Document Type:** Supporting reference document  
**Reference Name:** Delivery Phases and Seam Contracts  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Architecture Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Layer 2 Agent Runtime Subsystem
* Layer 2 Model Access / Routing
* Layer 2 LLM Provider Abstraction
* Layer 2 Tool Execution Framework
* Layer 2 Skills System
* Layer 2 Policy and Approval System
* Layer 2 Observability, Replay, and Cost Control
* Design README

---

## 2. Purpose

The Layer 2 design set gives every major platform concern an architectural home.
That is necessary for correctness, but it also creates delivery risk if teams try to implement every surface at once or let cross-subsystem seams drift during coding.

This document exists to provide:

* a clear critical-path MVP
* an explicit phased expansion order
* high-risk seam contracts that must remain stable across subsystem implementations

This document does **not** redefine subsystem ownership.
It tells teams **what to build first and where the risky handoff points are**.

---

## 3. Scope

### In Scope

This reference defines:

* the recommended implementation order for the current Layer 2 architecture
* what each phase should include and explicitly defer
* exit criteria for moving from one phase to the next
* explicit seam contracts for the highest-risk cross-subsystem boundaries

### Out of Scope

This reference does **not** define:

* implementation-language APIs
* package layout
* concrete storage technology
* exact test harnesses or mock strategies
* product launch sequencing or staffing plans

---

## 4. Delivery Principles

The implementation program should follow these rules:

1. **Build one compliant narrow path before broadening capability.**  
   Early phases may use degenerate forms of a subsystem such as one provider, one route profile, one child-disabled runtime path, or one read-only tool profile.

2. **Unsupported capabilities must be hidden or denied, not partially exposed.**  
   A phase may narrow functionality, but it must not advertise unsupported skills, subagents, approvals, tool classes, or routing paths.

3. **Layer 1.5 invariants still apply on every live path.**  
   Early phases may defer breadth, but they must not violate identity propagation, policy-first execution, execution-space boundaries, or replay-critical commit rules on the paths they do expose.

4. **Seams must close before adjacent breadth is added.**  
   Do not add multi-provider routing, skills, or delegation until the handoff artifacts and failure behavior at the relevant seam are stable.

5. **Replay-authoritative evidence beats optional telemetry.**  
   If there is a tradeoff between shipping a broader feature and preserving authoritative refs for the live path, preserve the authoritative refs first.

---

## 5. Phase 1 — Critical-Path MVP

### Goal

Deliver one end-to-end single-agent path from inbound request to final response, plus one governed read-oriented tool call inside an `Execution Space`.

### Included scope

Phase 1 should include:

* one inbound entry path, either one channel provider or one internal API boundary
* canonical identity resolution and deterministic thread attach/create behavior
* runtime start, step loop, final response, cancellation, and required checkpoint boundaries
* minimal context assembly using system instructions, agent profile, current input, and run working state
* one route profile and one primary target, with bounded route selection evidence
* one provider adapter family
* provider egress authorization bound to the routed target
* one read-only internal tool profile inside an `Execution Space`
* policy allow/deny for capability exposure, provider egress, and read-only tool execution
* replay-authoritative records for run lifecycle, routing decision, provider call, tool call if used, and final output

### Explicit deferrals

Phase 1 should defer:

* skills
* subagents
* skill-contributed tools
* memory writes
* RAG retrieval
* file-mutation, process-execution, and general network-retrieval tools
* approval waits and resume-from-approval unless a product requirement makes them unavoidable
* self-improvement workflows
* broad collaborative-scope sharing features beyond direct scope attachment needed for the MVP path

### Phase-1 simplification rules

* the fallback chain may be length one
* policy may stay in allow/deny posture if all approval-requiring capabilities remain disabled and non-advertised
* streaming may be disabled entirely, or implemented as non-authoritative UX only
* read-only tool access must still use `Execution Space` boundaries and broker enforcement

### Phase-1 exit criteria

Before Phase 2 begins, the platform should demonstrate:

* one inbound event becomes one started run with correct `PreRunEnvelope` and `RunEnvelope` propagation
* one model-backed step executes through Routing and Provider Abstraction with replay-authoritative refs
* one read-only tool executes through Tool Execution inside an `Execution Space`
* deny posture for blocked tool execution or blocked provider egress fails closed without partial execution
* restart or retry from the latest valid checkpoint does not duplicate a completed external action

---

## 6. Phase 2 — Governed Side Effects

### Goal

Add risky live-path actions only after the Phase-1 execution core is stable.

### Included scope

Phase 2 should add:

* approval wait and resume path
* file-mutation, process-execution, and governed network-retrieval tools
* broader policy condition enforcement for paths, workdirs, output ceilings, and network targets
* richer outbound response delivery, including streaming where the product needs it
* multi-target routing and bounded failover where useful
* retrieval-oriented Memory and RAG read paths once provenance and replay refs are stable

### Phase-2 entry rule

Do not begin this phase until the Phase-1 model-execution seam is stable and replay-authoritative.

### Phase-2 exit criteria

Before Phase 3 begins, the platform should demonstrate:

* one approval-gated side effect pauses, resumes, and completes without losing lineage
* one denied high-risk action fails closed before execution
* one route-actionable provider failure returns to runtime and advances through the bounded fallback path without provider-side rerouting
* memory and RAG read artifacts remain distinct and replay-visible in context assembly

---

## 7. Phase 3 — Extensibility and Delegation

### Goal

Add extensibility only after the core execution and side-effect boundaries are stable.

### Included scope

Phase 3 should add:

* skill activation and governed runtime-backed skill execution
* skill-contributed tools in `internal` mode first
* skill-contributed tools in `candidate` mode only after internal-mode execution is stable
* collaborative-scope bindings needed for shared capability and shared context scenarios
* bounded subagent spawning, child capability profiles, and merge contracts
* memory-write paths once approval, replay, and scope controls are already stable

### Phase-3 entry rule

Do not expose skill-contributed tools or subagents before the base Tool Execution and Policy seams are stable under Phase 2.

### Phase-3 exit criteria

Before Phase 4 begins, the platform should demonstrate:

* one skill with an internal tool invocation that still routes through Tool Execution authorization
* one candidate-visible skill-contributed tool that enters effective-tool-set filtering normally
* one bounded subagent run with explicit child tools, budgets, lineage, and merge outcome

---

## 8. Phase 4 — Optimization and Governance Plane Expansion

### Goal

Add optimization and offline governance systems after the execution plane is already stable.

### Included scope

Phase 4 should add:

* broader provider and channel matrices
* deeper cost and routing optimization
* self-improvement evaluation and promotion workflows
* additional replay, audit, and operator-control refinements

### Rule

These capabilities are valuable, but they are not on the critical path for the first implementation of the governed execution plane.

---

## 9. High-Risk Seam Contracts

These seams are the most likely places for implementation drift.
They must be made explicit in iteration-level specs and end-to-end tests.
For the Phase 1 critical path, teams must define the field-complete DTO intersections and executable scenario requirements as iteration-level specs and tests, and treat them as non-negotiable seam contracts.

### 9.1 Model Execution Seam

This seam spans Runtime, Routing, and Provider Abstraction.

#### Authoritative handoff sequence

1. Runtime assembles one step intent and creates a `RoutingRequest`.
2. Routing returns one `RoutingDecision` containing the primary target, bounded fallback chain, and route-selection lineage.
3. Runtime chooses whether to execute the primary target from that decision, and it creates or attaches `ProviderEgressAuthorization` bound to that routed target and request mode.
4. Provider Abstraction validates the routed target against the concrete `GenerationRequest` and executes it.
5. Provider Abstraction may retry the same target when transport rules allow it, but it must not choose a different target.
6. On route-actionable failure, Runtime decides whether to consume the next fallback from the existing decision or to request a new decision from Routing.

#### Ownership rules

* Runtime owns step lifecycle, checkpoints, final response behavior, and retry/failover policy at the run level.
* Routing owns target selection and fallback ordering only.
* Provider Abstraction owns request validation, target execution, same-target transport retries, and response normalization only.

#### Non-negotiable rules

* provider adapters must not reroute across targets
* routing must not construct provider payloads or provider egress authorization
* runtime must not skip the routing artifact and call providers by ad hoc target choice
* replay must preserve both the `RoutingDecision` and the final provider execution artifacts

### 9.2 Skill-Contributed Tool Seam

This seam spans Skills System, Runtime, and Tool Execution Framework.

#### Authoritative handoff sequence

1. Skills System publishes skill-contributed tool metadata, provenance, and exposure mode.
2. Runtime merges `candidate` contributions into normal effective-tool-set calculation only if the tool is allowed and executable on the current path.
3. Tool Execution validates the referenced descriptor version, execution feasibility, authorization, and schemas before execution.
4. Both model-visible and skill-internal tool calls execute through the same governed Tool Execution path.

#### Ownership rules

* Skills System owns skill packaging, source provenance, and contribution metadata.
* Runtime owns exposure filtering and authorization orchestration on the live path.
* Tool Execution owns descriptor truth, execution-time validation, side-effect capture, and normalized results.

#### Non-negotiable rules

* a skill package must not redefine the contract of an existing `toolId` and `version`
* skill-internal helpers must not create a parallel execution path around Tool Execution
* a contributed tool that cannot execute in the current scope or `Execution Space` must remain non-advertised
* contributed-tool replay must preserve both the source skill lineage and the executed tool lineage

---

## 10. Delivery Governance Rules

Implementation planning should obey these additional rules:

* each phase should add the minimum new surface needed to unlock the next architectural seam
* no phase should start by broadening providers, channels, or tool classes before the existing seam has replay and denial behavior working
* every phase should define at least one end-to-end scenario for each new seam it introduces
* when a feature is deferred, the live path must fail closed or keep the feature hidden rather than provide a partial best-effort variant

---

## 11. Final Position

The current Layer 2 design is intentionally broad and governance-heavy.
That is acceptable, but only if implementation is phased and the risky seams stay explicit.

This document is therefore the authoritative supporting reference for:

* the critical-path MVP
* the order in which major capabilities should be introduced
* the seam contracts most likely to drift during implementation

It complements the subsystem docs.
It does not replace them.
