# RFC — End-to-End Testing Strategy for the AI Agent Platform

## 1. Purpose

This document defines how we should design, scope, and operate end-to-end testing for the AI agent platform.

The goal is to validate the platform as a **modular, auditable, production-grade agent system**, not just as a chatbot that returns text. E2E tests must therefore verify the full execution lifecycle: inbound interaction, identity/thread resolution, context assembly, capability filtering, policy enforcement, reasoning, tool/skill/subagent execution, checkpointing, memory extraction, and trace persistence.  

---

## 2. Why E2E Matters Here

For this platform, E2E is not mainly about checking wording quality. It is about proving the architectural guarantees hold in real system flows.

Layer 1 says the platform must support multi-channel interaction, universal identity, stateful and resumable execution, tool and skill execution, scoped memory, sandboxed execution, full observability, replay, and controlled self-improvement. 

Layer 1.5 turns those into hard contracts: policy-first side effects, recoverable runs, observable execution, identity propagation, separation of memory and retrieval, deterministic replay, sandbox trust boundaries, predictable configuration, executable exposed capabilities, and bounded delegation. 

So the E2E strategy should answer one central question:

**Can the platform execute real user journeys while preserving every required contract?**

---

## 3. Testing Philosophy

My recommendation is:

### 3.1 Test the run, not only the response

The primary E2E artifact should be the **run record**, not only the assistant’s final message.

A passing test should typically verify:

* the final user-visible output
* legal run-state transitions
* context composition behavior
* capability exposure correctness
* policy evaluation before side effects
* checkpoint creation at required boundaries
* side-effect correctness and idempotency
* memory/RAG correctness
* observability and replay artifacts

This follows the platform execution lifecycle and required run properties.  

### 3.2 Make E2E contract-first

Each major Layer 1.5 contract should map to at least one E2E suite:

* identity and scope propagation
* run lifecycle
* context assembly
* middleware boundaries
* policy enforcement
* tool lifecycle
* memory contract
* retrieval contract
* sandbox contract
* replay contract
* observability contract
* subagent delegation
* configuration precedence 

### 3.3 Default to deterministic E2E

Most E2E coverage should run in a deterministic environment using seeded fixtures, recorded model responses, fake tools, and synthetic data. A smaller layer of staging smoke tests should exercise live providers. This is important because the platform explicitly requires replayability and explicit handling of non-deterministic tools. 

---

## 4. Scope of E2E Coverage

## 4.1 In scope

E2E should validate flows across:

* Channel Gateway
* Identity and Thread layer
* Agent Runtime
* Memory System
* RAG Infrastructure
* Tool and Skill Execution
* Sandbox / Execution Space
* Observability / Policy / Cost systems 

## 4.2 Out of scope

E2E should not try to validate:

* product-specific UX polish
* domain-specific agent behavior for every application
* foundation model training quality
* unit-level logic already covered elsewhere 

---

## 5. Success Criteria

The E2E system is successful if it can reliably prove the following platform guarantees:

1. **No external side effect occurs before policy evaluation.** 
2. **Every run is recoverable, resumable, and inspectable.** 
3. **Every meaningful action is observable.** 
4. **Identity, thread, run, scope, and execution space are propagated correctly.** 
5. **Memory and retrieval remain distinct.**  
6. **Only effective, executable capabilities are exposed and invocable.**  
7. **Sandbox constraints are actually enforced.**  
8. **Subagent delegation remains bounded.**  
9. **Replay artifacts are sufficient to reconstruct supported runs.** 
10. **Configuration precedence is reproducible and traceable.** 

---

## 6. Test Taxonomy

I would structure the E2E plan into six suites.

## 6.1 Suite A — Core Journey Tests

These prove the platform kernel works end to end.

Representative cases:

* inbound chat -> no-tool answer
* inbound chat -> tool use -> response
* inbound email -> identity/thread resolution -> resumed conversation -> response
* inbound request -> retrieval + evidence -> response
* inbound request -> memory extraction -> write pipeline
* inbound complex task -> subagent delegation -> parent finalizes

These align with the platform lifecycle of ingest, identity/thread resolution, context assembly, capability filtering, reasoning, execution, checkpointing, response generation, memory extraction, and trace persistence.  

## 6.2 Suite B — Policy and Approval Tests

These verify the “policy first” invariant.

Representative cases:

* low-risk tool auto-executes
* medium-risk tool is policy-controlled
* high-risk tool requires approval
* denied tool never executes
* denied memory write does not persist
* denied network/file action produces no side effect
* subagent spawn blocked when policy denies scope/capability change

The enforcement pipeline and enforcement points are explicitly defined in Layer 1.5 and should be asserted directly. 

## 6.3 Suite C — Recovery, Resume, and Replay Tests

These validate state-first execution.

Representative cases:

* crash after context assembly -> resume
* crash after policy decision but before side effect -> safe restart
* crash after tool completion -> no duplicate side effect on resume
* pause on approval wait -> resume after approval
* replay in debug mode
* replay in fast mode
* replay with missing required refs -> explicit `best_effort`, not authoritative
* non-deterministic tool declared and simulated/skipped in replay

This suite should map directly to checkpoint rules, run states, and replay requirements. 

## 6.4 Suite D — Identity, Thread, and Scope Tests

These verify continuity and isolation.

Representative cases:

* same user across channels -> same canonical user
* same provider thread -> canonical thread reuse
* expired session -> new thread
* scope attached correctly to tool/memory/policy paths
* cross-scope request denied without approval
* all downstream actions carry required identifiers

Layer 1 makes identity and thread foundational, and Layer 1.5 makes identifier propagation mandatory.  

## 6.5 Suite E — Capability and Sandbox Tests

These validate that the runtime only exposes what it can safely execute.

Representative cases:

* effective tool set excludes unavailable tools
* tool exposed to model equals tool validated for execution
* subagent gets delegated subset, not head-agent full pack
* sandbox blocks forbidden filesystem access
* sandbox blocks forbidden network access
* sandbox denies undeclared secret-broker access with no secret leakage in outputs or traces
* sandbox enforces CPU/memory/time/storage limits
* output zone controls are enforced

These directly cover the capability exposure and sandbox trust-boundary contracts.  

## 6.6 Suite F — Observability and Trace Tests

These validate production-grade governance.

Representative cases:

* run lifecycle events emitted
* reasoning step decisions emitted
* capability exposure decisions emitted
* middleware execution recorded
* tool execution recorded
* memory writes recorded
* policy decisions recorded
* model calls recorded
* subagent spawn/join recorded
* timeline, execution graph, and subagent tree reconstructable

These are explicitly required by the observability contract. 

---

## 7. Environment Strategy

I would build **three testing environments**, each with a different purpose.

## 7.1 Environment A — Deterministic Integration Lab

This is the main CI-gated E2E environment.

Characteristics:

* real orchestration services
* real Postgres / Redis / object store / vector store equivalents
* fake channel adapters
* seeded identity/thread fixtures
* model stub or recorded model adapter
* fake tools and safe fake external systems
* enabled checkpointing, tracing, replay, and policy evaluation
* sandbox runner with test-configurable quotas and network rules

Purpose:

* stable
* fast
* reproducible
* high-signal for merge gating

This environment should carry the majority of E2E coverage.

## 7.2 Environment B — Production-like Staging

This validates integration drift and deployment realism.

Characteristics:

* production-like topology
* real model providers under test account
* real authentication paths
* selected real tools in a safe tenant
* real approval flow
* full observability pipeline

Purpose:

* validate provider integration drift
* validate auth/config deployment
* catch live-model/tool mismatches
* catch runtime/sandbox packaging issues

## 7.3 Environment C — Live Canary / Synthetic Probes

This is a very small but continuous test layer.

Characteristics:

* production or production-adjacent
* narrow set of non-destructive agents/tools
* synthetic probe scenarios

Purpose:

* detect integration regressions
* detect channel/provider drift
* detect replay/trace breakage
* detect policy routing failures

---

## 8. Testbed Components

To make the E2E environment useful, I would build the following fixtures.

## 8.1 Synthetic Channel Driver

A test harness that can inject:

* chat messages
* email messages
* attachments
* provider thread IDs
* webhook duplicates
* delayed/out-of-order events

This matches Channel Gateway responsibilities around normalization and provider payload preservation. 

## 8.2 Identity / Thread Fixture Service

Seeded personas and thread states:

* known user
* unknown user
* linked multi-channel user
* revoked scope user
* ambiguous identity user
* active thread
* expired thread
* paused thread
* reopened thread

## 8.3 Model Adapter Modes

Three operating modes:

* **golden mode**: fixed responses for CI
* **record/replay mode**: capture real responses once, reuse later
* **live mode**: real provider for staging smoke

This keeps deterministic E2E separate from provider-variability testing.

## 8.4 Tool Harness

Each tool under test should declare:

* schema
* determinism flag
* risk level
* side-effect type
* scope constraints
* fake implementation
* optional live implementation

This is necessary because the tool lifecycle requires validation, policy, approval, execution, post-processing, and logging. 

## 8.5 Sandbox Harness

The sandbox test harness should support:

* filesystem isolation
* process isolation
* network on/off controls
* secret isolation
* resource quotas
* trust-zone inspection for Input / Scratch / Output / Secrets / Network

This should be first-class because sandbox is explicitly defined as a trust boundary. 

## 8.6 Seeded Memory and Retrieval Stores

Test corpora should include:

* scoped memory entries
* conflicting memory records
* retrieval docs with source metadata
* distractor documents
* cross-scope documents
* overlapping memory/RAG facts

This is needed to prove that memory retrieval is scope-filtered and provenance-backed, and that RAG remains distinct from memory.  

## 8.7 Trace Collector and Replay Verifier

Every E2E run should automatically:

* collect trace events
* construct a timeline
* construct an execution graph
* construct a subagent tree
* verify replay artifacts exist
* optionally execute replay validation

This is essential because replay and observability are not optional extras in this architecture.  

---

## 9. Test Matrix

I would maintain a compact matrix across these dimensions:

* **channel**: chat, email, messaging
* **identity**: known, unknown, linked, ambiguous
* **thread**: new, resumed, expired, paused, reopened
* **scope**: none, collaborative, denied cross-scope
* **run type**: no-tool, tool, skill, subagent, memory write, RAG
* **policy**: allow, deny, require approval
* **sandbox**: disabled, restricted, network-enabled
* **failure mode**: timeout, crash, retry, non-determinism, policy denial
* **replay mode**: live, debug replay, fast replay
* **config override**: system/env/scope/agent/channel/user/run

I would not attempt exhaustive cartesian coverage. I would use pairwise coverage plus a smaller set of golden high-risk paths.

---

## 10. Standard E2E Test Shape

Every E2E case should follow a standard structure:

### Given

* seeded user / thread / scope / config
* seeded policy rules
* seeded memory and retrieval documents
* selected model mode
* selected tool implementations
* expected capability set

### When

* inject one inbound canonical interaction

### Then

Assert:

* outbound response
* run creation/resumption behavior
* context assembly order where relevant
* effective capability filtering
* policy decision timing
* checkpoint creation
* side-effect presence or absence
* trace event set
* replay artifact completeness

This shape matches the formal run lifecycle contract. 

---

## 11. Global Assertion Library

I would build reusable assertion helpers for these invariants.

### 11.1 Policy assertions

* no side effect before policy decision
* policy decision recorded for every protected action
* approval wait entered before gated action
* deny produces zero external side effect

### 11.2 State assertions

* run states follow legal transition graph
* checkpoints exist at required boundaries
* resume starts only at step boundary
* duplicate side effects do not occur after resume

### 11.3 Context assertions

* context layer order is respected
* memory and RAG appear as distinct sources
* token budget enforcement is traceable
* subagent context excludes full parent scratchpad by default

### 11.4 Capability assertions

* exposed tool set equals effective tool set
* executed tool belongs to effective tool set
* subagent tool set is delegated subset/profile
* unavailable tools are not exposed

### 11.5 Identity/scope assertions

* userId/threadId/runId always present
* collaborativeScopeId present when required
* executionSpaceId present when applicable
* scope attached to memory/tool/policy paths

### 11.6 Observability assertions

* lifecycle events present
* capability exposure events present
* tool execution events present
* policy events present
* memory write events present
* timeline, execution graph, and subagent tree reconstructable

### 11.7 Replay assertions

* model inputs/outputs stored
* tool inputs/outputs stored
* policy decisions stored
* checkpoints stored
* replay mode behavior valid for deterministic vs non-deterministic steps

All of these are grounded directly in Layer 1.5 contracts. 

---

## 12. Priority Scenarios

If we want the highest ROI first, I would implement these scenarios before anything else:

### P0

1. tool action allowed by policy
2. tool action denied by policy
3. tool action requiring approval
4. crash/resume before side effect
5. crash/resume after side effect
6. capability exposure mismatch prevention
7. memory vs RAG separation
8. sandbox network/file restriction
9. subagent bounded delegation
10. debug replay of a tool-using run

### P1

1. multi-channel identity continuity
2. thread expiry and recreation
3. config precedence override cases
4. memory conflict handling
5. non-deterministic replay simulation/skip
6. staged live-provider smoke tests

### P2

1. performance-heavy long-running runs
2. fanout subagent graphs
3. approval latency / queue behavior
4. chaos-style downstream failures
5. canary probes in production-like environments

---

## 13. Example Test Cases

## 13.1 High-risk tool approval case

**Given** a user asks for an external action that maps to a high-risk tool.
**When** the runtime validates the tool request.
**Then** policy must evaluate before execution, a checkpoint must exist before `waiting_approval`, the run must enter `waiting_approval`, and no side effect may exist until approval is granted. After approval, the run resumes and the tool executes exactly once. 

## 13.2 Crash before side effect case

**Given** a tool request has been validated and policy has allowed it.
**When** the system crashes after checkpoint creation but before tool execution.
**Then** resume must restart from a valid step boundary and the side effect must occur at most once. 

## 13.3 Memory vs retrieval case

**Given** scoped memory and a separate retrieval corpus both contain related information.
**When** the platform assembles context.
**Then** memory and RAG must appear as distinct sources, retrieval must include source metadata/citations, and retrieval results must not overwrite memory.  

## 13.4 Subagent bounded delegation case

**Given** a complex separable task triggers subagent delegation.
**When** the child context is created.
**Then** the child must inherit identity/scope lineage, receive explicit task bounds, restricted tools, budget/timeout controls, and a bounded context handoff rather than full parent scratchpad. The child must not write directly to the final user channel.  

## 13.5 Capability filtering case

**Given** the head agent has a broader upstream tool catalog than the current execution space allows.
**When** the runtime computes effective capabilities.
**Then** only the intersection of upstream tools, agent-allowed tools, scope constraints, execution-space constraints, run overrides, and policy restrictions may be exposed and invocable. 

---

## 14. CI/CD Gating Policy

I would gate delivery in three layers.

### Merge blocking

Run:

* deterministic core E2E
* policy tests
* checkpoint/resume tests
* capability filtering tests
* memory/RAG separation tests
* trace artifact presence tests

### Nightly

Run:

* broader E2E matrix
* replay verification
* replay fidelity threshold enforcement
* non-deterministic handling cases
* sandbox quota enforcement
* sandbox secret-isolation attempts
* selected live-provider staging flows

### Pre-release

Run:

* full staging suite
* live model + real auth + safe tool tenants
* synthetic canary flows
* performance and failure-injection coverage

---

## 15. Ownership Model

I would assign ownership by subsystem, but keep one cross-platform E2E owner.

* **Platform QA / Infra Quality**: overall E2E harness and CI
* **Runtime team**: lifecycle, middleware, capability filtering, replay
* **Identity/thread team**: continuity, scope propagation
* **Policy team**: approval, deny/allow invariants
* **Memory/RAG team**: separation, provenance, scope filtering
* **Sandbox/tools team**: execution controls, isolation, quotas
* **Observability team**: trace completeness and reconstruction

This matches the architecture’s separation-of-concerns model. 

---

## 16. Recommended Implementation Phases

### Phase 1

Build the deterministic integration lab and 15–20 core tests:

* core lifecycle
* tool allow/deny
* checkpointing
* trace presence
* memory/RAG separation
* effective tool filtering

### Phase 2

Add:

* approval waits
* resume/replay validation
* sandbox restrictions
* subagent bounded delegation
* config precedence tests

### Phase 3

Add:

* multi-channel identity/thread continuity
* non-deterministic tool replay handling
* staging real-provider smoke flows
* synthetic canary probes
