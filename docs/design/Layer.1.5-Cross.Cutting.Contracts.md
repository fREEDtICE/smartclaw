# 🧠 SmartClaw Agent Platform — Layer 1.5

## Cross-Cutting Contracts and System Invariants

---

## Document Priority

This document follows the design hierarchy defined in [README.md](README.md):

* **Layer 1 > Layer 1.5 > Layer 2**
* higher layers override lower layers without exception

---

# 1. Document Purpose

This document defines the **global contracts, invariants, and execution rules** that apply across all subsystems.

It ensures that:

* subsystems remain consistent
* integrations are predictable
* behavior is auditable and safe
* future extensions do not break system guarantees

---

## Relationship to other layers

* **Layer 1 (Architecture & Scope)** → defines the overall system structure, boundaries, and high-level design decisions
* **Layer 1.5 (Invariants & Cross-Cutting Rules)** → defines the global constraints and invariants that apply across all subsystems
* **Layer 2 (Subsystem Behavior & Contracts)** → defines detailed subsystem logic, behavior, contract semantics, and interaction contracts

Layer 2 documents should remain language-neutral. After the Layer 2 design settles, iteration output should produce:

* Finalized Go models
* Interfaces
* Package structure/layout
* Error definitions and handling strategy
* Test specifications

---

# 2. Global System Invariants

These rules are **non-negotiable**. All subsystems must comply.

## 2.1 Policy First

No external side effect may occur without policy evaluation.

Applies to:

* tool execution
* skill execution
* memory writes
* network access
* file system writes

---

## 2.2 State Must Be Recoverable

Every Agent Run must be:

* checkpointable
* resumable
* inspectable

---

## 2.3 Execution Must Be Observable

All meaningful actions must emit:

* trace events
* structured logs
* metadata

---

## 2.4 Identity Must Be Propagated

Identity and scope lineage must be propagated across all execution phases.

Rules:

* before runtime creates or resumes a run, requests must carry a `PreRunEnvelope`
* after runtime creates or resumes a run, requests must carry a `RunEnvelope`
* phase-specific envelopes must preserve traceability across user, thread, scope, and execution-space boundaries where those identifiers are known and applicable

---

## 2.5 Memory and Retrieval Must Remain Distinct

* Memory = trusted, lifecycle-managed knowledge
* RAG = external, query-time retrieval

They must not be merged or treated interchangeably.

---

## 2.6 Deterministic Replay Must Be Supported

For supported runs:

* model inputs/outputs must be captured
* tool inputs/outputs must be recorded
* policy decisions must be stored

---

## 2.7 Sandbox Is a Trust Boundary

All execution involving:

* code
* file access
* network access

must occur inside an **Execution Space**.

---

## 2.8 Configuration Must Be Predictable

All configuration must:

* declare precedence
* be traceable
* be reproducible

---

## 2.9 Exposed Capabilities Must Be Executable

Any tool or skill exposed to model or subagent reasoning must be:

* valid in the current scope
* executable by the runtime
* consistent with policy and run-level constraints

The platform must not advertise capabilities that cannot be executed on the current path.

---

## 2.10 Delegation Must Be Bounded

All subagent delegation must preserve:

* parent-child lineage
* explicit task bounds
* bounded context inheritance
* explicit budget and timeout controls

---

# 3. Identity and Scope Propagation Contract

## 3.1 Envelope Types

```text
PreRunEnvelope
  required:
    inboundEventId
  optional:
    userId
    threadId
    collaborativeScopeId
    executionSpaceId

RunEnvelope
  required:
    inboundEventId
    runId
  optional:
    userId
    threadId
    collaborativeScopeId
    executionSpaceId
```

Notes:

* `PreRunEnvelope` is the phase-appropriate propagation contract before runtime allocates or restores `runId`
* `RunEnvelope` is the phase-appropriate propagation contract after runtime creates or resumes the run
* Layer 2 contracts may strengthen field requirements for specific phases, such as requiring `threadId` on runnable runtime-start handoff

---

## 3.2 Scope Definitions

| Scope               | Purpose           |
| ------------------- | ----------------- |
| User                | identity          |
| Thread              | conversation      |
| Collaborative Scope | shared context    |
| Execution Space     | runtime isolation |

---

## 3.3 Rules

* Identity must be resolved before runtime execution
* pre-run handling must use `PreRunEnvelope` until runtime creates or resumes the run
* runtime, policy, memory, tool, skill, observability, and replay operations that execute after run creation or resume must use `RunEnvelope`
* Scope must be attached to:

  * memory access
  * tool execution
  * policy evaluation
* No cross-scope data access without policy approval

---

# 4. Agent Run Lifecycle Contract

## 4.1 Standard Lifecycle

```text
1. Ingest message
2. Resolve identity + thread
3. Create or resume run
4. Assemble context
5. Compute effective capabilities
6. Apply run-start middleware
7. Execute reasoning step
8. If external action is requested:
   - validate request
   - run before-action middleware
   - evaluate policy / approval
   - checkpoint
   - execute tool / skill / subagent
   - run after-action middleware
9. Update working state and decide continue / stop
10. Produce output
11. Extract memory
12. Persist traces
```

---

## 4.2 Checkpoint Rules

Checkpoints must occur:

* after context assembly
* before any external side effect
* after each completed tool / skill / subagent step
* after each reasoning step (configurable)
* before entering `waiting_approval`
* before terminal completion

---

## 4.3 Run States

```text
queued → initializing → running → waiting_approval → paused → resuming → completed / failed / cancelled
```

---

## 4.4 Reasoning Step Contract

Each reasoning step consumes:

* assembled context
* current run working state
* effective capabilities for the step
* prior action results

Each reasoning step must produce exactly one decision class:

* final response
* model continuation
* tool request set
* skill request
* subagent spawn request
* approval wait
* failure

Rules:

* each step must have a stable step id for replay and resume
* step output must be serializable or reference-addressable
* no external action may execute until the step output is validated
* resume must re-enter only at a step boundary

---

## 4.5 Runtime Middleware Contract

Middleware is ordered, runtime-owned cross-cutting logic around run and step execution.

Middleware may:

* enrich metadata
* enforce quotas or budgets
* emit observability
* attach deterministic annotations

Middleware must not:

* bypass policy
* introduce uncheckpointed side effects
* mutate tool or model results without provenance

Required interception points:

* run start
* before model call
* after model call
* before external action dispatch
* after external action completion
* before state transition
* finalize

---

# 5. Context Assembly Contract

## 5.1 Context Layers (Strict Order)

1. system instructions
2. collaborative scope policies
3. agent profile
4. thread summary
5. memory retrieval
6. RAG results
7. user input
8. run state

---

## 5.2 Rules

* Later layers override earlier ones only where allowed
* Context must respect token budget constraints
* Context must be traceable (what was included and why)

---

## 5.3 Subagent Context Bootstrap Rules

When the runtime creates a subagent, child context must be assembled as a bounded handoff that includes:

* inherited system instructions
* applicable collaborative scope policy
* delegated task contract and success criteria
* assigned budgets and timeout
* effective child tool set
* parent-produced summary and relevant evidence refs
* only the thread or memory slices required for the delegated task

By default, child context must exclude:

* the full parent scratchpad
* unrelated memory or retrieval blocks
* tools outside the child contract

---

# 6. Policy Enforcement Contract

## 6.1 Enforcement Pipeline

```text
Intent → Risk Classification → Policy Evaluation → Decision → Enforcement
```

---

## 6.2 Enforcement Points

Policy must be applied before:

* tool execution
* skill activation
* memory write
* network request
* file write
* subagent spawning

Rules:

* every subagent spawn request must pass policy evaluation, including same-scope and same-capability delegation
* low-risk delegation may be auto-approved by policy, but it must not bypass policy evaluation

---

## 6.3 Outputs

Policy evaluation returns:

```text
decision: allow | deny | require_approval
reason: human-readable explanation
conditions: optional structured enforcement constraints
```

---

# 7. Tool Execution Contract

## 7.1 Tool Sources and Default Profiles

The platform may expose tools from:

* the platform-owned internal tool catalog
* agent-configured external or product tools
* skill-contributed tools where allowed

Rules:

* the canonical built-in tool list and exact contracts should be documented in a separate Internal Tool Catalog and Default Tool Profiles document
* the Head Agent may receive a platform default internal tool profile only as an eligibility pool, not as an automatically exposed reasoning tool list
* runtime exposure must be narrowed from that eligibility pool to the minimal task-relevant subset for the current run or step
* subagents must not inherit the full Head Agent default profile automatically
* any default profile remains subject to progressive loading, runtime filtering, scope constraints, execution-space availability, and policy

---

## 7.2 Effective Tool Set

The runtime must compute an effective tool set for each run or step as the intersection of:

* upstream-available tools
* agent-allowed tools
* task- and intent-relevant tools for the current step
* collaborative-scope and execution-space constraints
* run-level overrides
* policy restrictions

Rules:

* only the effective tool set may be exposed to model or subagent reasoning
* the effective tool set should be the smallest sufficient executable set for the current step
* when model execution supports tools, the effective tool set is the default tool list for that step
* tool invocation must be validated against the same effective tool set before execution
* tool exposure decisions must be logged for replay and audit

---

## 7.3 Lifecycle

```text
Request → Validate → Policy → Approval → Execute → Post-process → Log
```

---

## 7.4 Requirements

* inputs must be schema-validated
* outputs must be serializable
* side effects must be logged
* execution must be replay-aware

---

## 7.5 Risk Levels

| Level  | Behavior          |
| ------ | ----------------- |
| Low    | auto-execute      |
| Medium | policy-controlled |
| High   | approval required |

---

# 8. Memory Contract

## 8.1 Memory Write Pipeline

```text
Candidate → Classify → Validate → Conflict Check → Score → Write / Reject
```

---

## 8.2 Write Rules

* explicit user requests → auto-write (pinned)
* inferred knowledge → lower confidence
* system-generated → may require review

---

## 8.3 Retrieval Rules

* must be scope-filtered
* must be relevance-ranked
* must include provenance

---

## 8.4 Conflict Handling

* detect conflicts before write
* preserve conflicting records with metadata
* allow resolution workflows

---

# 9. Retrieval (RAG) Contract

## 9.1 Responsibilities

* retrieve external knowledge
* rerank results
* return citations

---

## 9.2 Rules

* RAG results must not overwrite memory
* must include source metadata
* must be clearly distinguishable from memory

---

# 10. Sandbox / Execution Space Contract

## 10.1 Isolation Requirements

Each execution space must provide:

* filesystem isolation
* process isolation
* network control
* secret isolation

---

## 10.2 Resource Controls

* CPU limits
* memory limits
* timeouts
* storage quotas

---

## 10.3 Trust Zones

```text
Input (read-only)
Scratch
Output (controlled)
Secrets
Network
```

---

# 11. Replay Contract

## 11.1 Required Data

Must capture:

* reasoning step records
* model inputs/outputs
* effective capability exposure decisions
* tool inputs/outputs
* middleware decisions
* policy decisions
* checkpoints
* subagent context handoff refs

---

## 11.2 Replay Modes

* debug replay (step-by-step)
* fast replay (reuse cached results)

---

## 11.3 Non-Deterministic Handling

* tools must declare non-determinism
* replay must simulate or skip

---

# 12. Observability Contract

## 12.1 Required Signals

* run lifecycle events
* reasoning step decisions
* capability exposure decisions
* middleware execution
* tool executions
* memory writes
* policy decisions
* model calls
* subagent spawns and joins

---

## 12.2 Trace Requirements

Each run must support:

* timeline view
* execution graph
* subagent tree

---

# 13. Configuration Contract

## 13.1 Precedence Order

```text
System → Environment → Collaborative Scope → Agent → Channel → User → Run
```

---

## 13.2 Rules

* all config must declare scope
* overrides must be explicit
* changes must be traceable

---

# 14. Subagent Contract

## 14.1 Creation Preconditions

* subagents must inherit identity and scope lineage
* must have an explicit task contract and success criteria
* must have restricted tools/capabilities and budget
* any child tool set must be an explicitly delegated subset or profile, not the full Head Agent default pack
* parent run remains the source of truth for the final response

---

## 14.2 Preferred Delegation Cases

Subagent delegation should be preferred when work is both complex and separable, including:

* parallelizable research or execution branches
* isolated work that benefits from a narrower tool set
* long-running work that should not inflate the parent context window

Subagent delegation should be avoided for:

* trivial single-step actions
* tasks tightly coupled to the live parent conversation
* work that needs the full parent context to stay coherent

---

## 14.3 Child Context Initialization

Child context must include:

* delegated objective and constraints
* bounded summary of relevant thread/history
* curated memory and retrieval evidence refs
* effective child tool set
* budget, timeout, and fanout controls

Child context must not include the full parent scratchpad by default.

---

## 14.4 Limits

* max loop count
* max token budget
* timeout
* max depth
* max fanout

---

## 14.5 Result Merge Rules

* child returns a structured result with provenance and unresolved issues
* parent decides whether to accept, refine, or replan
* child must not write directly to the final user response channel

---

# 15. Self-Improvement Contract

## 15.1 Execution Model

* runs offline or scheduled
* not part of live execution path

---

## 15.2 Inputs

* traces
* failures
* user feedback
* memory conflicts

---

## 15.3 Outputs

Outputs must be produced as reviewable artifacts, not live mutations, including:

* candidate skill improvements
* candidate prompt updates
* evaluation datasets

---

## 15.4 Governance

* changes must be reviewed
* self-improvement outputs must remain inactive until promoted through a reviewed activation workflow
* promotion must be versioned, traceable, and separable from live user-triggered runs
* scheduled or offline jobs must not directly modify live prompts, skills, policies, or default tool exposure
* live behavior may reference only approved versions or configurations selected through normal configuration precedence and release controls

---

# 16. Open Constraints and Future Extensions

This document intentionally leaves room for:

* provider-specific optimizations
* advanced memory reasoning
* automated evaluation pipelines
* adaptive agent policies

But all future additions must comply with:

* policy-first execution
* observability requirements
* replay constraints
* scope isolation
