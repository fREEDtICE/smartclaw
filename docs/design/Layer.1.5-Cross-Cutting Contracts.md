# 🧠 Frame AI Agent Platform — Layer 1.5

## Cross-Cutting Contracts and System Invariants

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

* **Layer 1 (Overview)** → defines *what exists*
* **Layer 1.5 (this doc)** → defines *how everything must behave together*
* **Layer 2 (Subsystem docs)** → defines *how each part is implemented*

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

Every operation must carry:

* user identity
* thread id
* run id
* collaborative scope
* execution space

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

# 3. Identity and Scope Propagation Contract

## 3.1 Required Identifiers

Every request must propagate:

```text
userId
threadId
runId
collaborativeScopeId (optional)
executionSpaceId (when applicable)
```

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
3. Create run
4. Assemble context
5. Inject memory + retrieval
6. Apply middleware
7. Execute reasoning loop
8. Execute tools / skills / subagents
9. Checkpoint
10. Produce output
11. Extract memory
12. Persist traces
```

---

## 4.2 Checkpoint Rules

Checkpoints must occur:

* after each tool execution
* after each reasoning step (configurable)
* before external side effects

---

## 4.3 Run States

```text
queued → running → waiting_approval → paused → completed / failed / cancelled
```

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

---

## 6.3 Outputs

Policy evaluation returns:

```ts
{
  decision: "allow" | "deny" | "require_approval",
  reason: string,
  conditions?: Record<string, unknown>
}
```

---

# 7. Tool Execution Contract

## 7.1 Lifecycle

```text
Request → Validate → Policy → Approval → Execute → Post-process → Log
```

---

## 7.2 Requirements

* inputs must be schema-validated
* outputs must be serializable
* side effects must be logged
* execution must be replay-aware

---

## 7.3 Risk Levels

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

* model inputs/outputs
* tool inputs/outputs
* policy decisions
* checkpoints

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
* tool executions
* memory writes
* policy decisions
* model calls

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

## 14.1 Rules

* subagents must inherit identity and scope
* must have restricted tools and budget
* must report results back to parent

---

## 14.2 Limits

* max loop count
* max token budget
* timeout

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

* skill improvements
* prompt updates
* evaluation datasets

---

## 15.4 Governance

* changes must be reviewed
* must not auto-modify live behavior without approval

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