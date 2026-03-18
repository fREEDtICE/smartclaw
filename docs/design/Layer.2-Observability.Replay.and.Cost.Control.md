# Frame AI Agent Platform — Layer 2

## Observability, Replay, and Cost Control Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Observability, Replay, and Cost Control  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Reliability and Governance Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* RAG Infrastructure Design
* LLM Provider Abstraction Design
* Tool Execution Framework Design
* Skills System Design
* Memory System Design
* Policy and Approval System Design
* Sandbox / Execution Space Design
* Identity and Thread Management

---

## 2. Purpose

The Observability, Replay, and Cost Control subsystem turns subsystem-emitted execution evidence into **correlated, queryable, replay-grade records and cost/usage ledgers**.

It exists because observability is not only a log sink.
The platform must support:

* full run traceability across runtime, tools, skills, memory, policy, model calls, and sandboxed execution
* authoritative replay artifacts and ordered step evidence
* token, usage, and cost attribution across head-agent and subagent work
* human audit views such as timeline, execution graph, and subagent tree
* secure payload capture, redaction, retention, and artifact access rules
* alerting and evaluation inputs derived from execution evidence

This subsystem owns:

* the canonical telemetry envelope and signal taxonomy
* correlation and lineage rules across runs, steps, tools, skills, and subagents
* replay manifest construction and replay-visible artifact indexing
* normalized usage and cost ledgers
* retention, redaction, and read-access rules for observability artifacts

The subsystem does **not** own execution behavior itself.
Runtime, policy, tool, skill, memory, provider, and sandbox subsystems still produce the actions and authoritative business outcomes.
This subsystem makes those actions observable, replayable, attributable, and governable over time.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The subsystem is responsible for:

* defining canonical signal kinds for spans, events, logs, artifacts, replay manifests, usage records, cost records, and derived alerts
* ingesting and validating structured signals emitted by platform subsystems
* correlating records by `userId`, `threadId`, `runId`, `stepId`, `collaborativeScopeId`, `executionSpaceId`, and parent-child run lineage
* materializing required operator and audit views such as run timelines, execution graphs, and subagent trees
* preserving replay-grade references to model inputs and outputs, tool inputs and outputs, policy decisions, checkpoints, context snapshots, and final outputs
* maintaining normalized usage and cost ledgers, including rollups across child runs
* enforcing redaction, payload-capture, retention-class, and scope-aware read rules
* exporting replay, audit, alerting, and evaluation-ready records
* distinguishing authoritative records from best-effort diagnostic records

### Out of Scope

The subsystem does **not** own:

* creation of run state, checkpoints, or execution decisions
* policy authoring or approval UX
* execution of model calls, tools, skills, memory writes, or sandbox actions
* mutation of external systems during replay
* generic business analytics beyond platform execution observability and cost governance
* replacing subsystem-local validation of domain-specific contracts

This subsystem is the platform evidence plane.
It is not the platform execution plane.

---

## 4. Architectural Role

The subsystem sits beneath all major execution subsystems and above replay, audit, debugging, alerting, and cost-governance consumers.

```text
Channel / Identity / Runtime / Context / Provider / Policy / Tool / Skill / Memory / Sandbox
  -> emit canonical signals and artifact refs
  -> Observability, Replay, and Cost Control
       -> validate envelope and lineage
       -> redact and classify retention
       -> persist authoritative records and artifacts
       -> materialize run timeline / execution graph / subagent tree
       -> build replay manifest and cost rollups
       -> derive alerts and evaluation-ready feeds
  -> operators / replay tooling / audit / self-improvement / cost governance
```

### Upstream inputs

* runtime lifecycle events, reasoning step records, checkpoint refs, and final output refs
* context snapshot refs and inclusion metadata
* RAG retrieval refs, rerank summaries, and citation-packaging metadata
* provider request and response artifacts, usage metrics, and latency metadata
* tool, skill, memory, policy, and sandbox execution records
* inbound normalization refs, outbound delivery refs, and original provider payload refs where policy permits retention
* alert thresholds, pricing tables, and retention configuration

### Downstream outputs

* run timeline views
* execution graph views
* subagent tree views
* replay manifests and artifact indexes
* structured logs and searchable signal records
* usage and cost rollups
* alert events and evaluation-ready evidence slices

### Primary consumers

* Agent Runtime
* Policy and Approval System
* Tool Execution Framework
* Skills System
* Memory System
* LLM Provider Abstraction
* Sandbox / Execution Space
* operator tooling
* replay and audit tooling
* self-improvement and evaluation workflows

---

## 5. Goals and Non-Goals

### Goals

The subsystem must optimize for:

* complete causal traceability for meaningful execution actions
* replay-grade evidence capture for supported runs
* precise identity and scope attribution
* predictable cost and usage accounting
* clear distinction between authoritative and best-effort telemetry
* secure redaction and access control for captured payloads
* scalable read models for debugging, audit, and governance
* low-friction integration for all execution subsystems through one canonical envelope

### Non-Goals

The subsystem is not trying to optimize for:

* replacing subsystem-specific domain stores
* turning every debug signal into a blocking write on the live path
* hiding missing replay evidence behind misleading certainty
* auto-replaying side effects against live systems
* broad unrestricted raw-payload retention
* acting as the primary enforcement engine for budget or policy decisions

Runtime and policy may consume this subsystem’s outputs for enforcement, but they remain the live enforcement carriers.

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the observability-, replay-, and cost-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The subsystem must support:

* traces of run flow and subsystem interactions
* logs for side effects and decisions
* replay, audit, and evaluation support
* token, usage, and cost tracking
* alerting and production-control outputs
* preservation of payloads and artifacts needed for debugging where policy allows

### From Layer 1.5

The subsystem must implement:

* the invariant that execution must be observable
* propagation of `userId`, `threadId`, `runId`, `collaborativeScopeId`, and `executionSpaceId` when applicable
* replay capture of reasoning steps, model inputs and outputs, capability exposure decisions, tool inputs and outputs, middleware decisions, policy decisions, checkpoints, and subagent handoff refs
* support for required run views:
  * timeline view
  * execution graph
  * subagent tree
* support for replay modes:
  * debug replay
  * fast replay
* explicit handling of non-deterministic or environment-bound work through simulate or skip posture

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The subsystem must:

* publish and enforce the canonical telemetry envelope used across platform subsystems
* accept replay-critical and best-effort signal batches under explicit durability classes
* validate that required lineage and scope identifiers are present before persisting replay-critical records
* persist or reference-address authoritative execution artifacts before corresponding steps or terminal states claim success
* build immutable replay manifests from persisted subsystem evidence
* materialize human-readable and machine-readable run views
* maintain normalized usage and cost ledgers with rollups by run, user, collaborative scope, and subsystem
* classify telemetry by retention class, redaction class, and sensitivity posture
* expose read contracts for replay, audit, debugging, and cost governance
* derive alerts and evaluation-ready feeds without modifying live execution semantics

---

## 8. Core Invariants

The subsystem must obey the global platform invariants.

Additional observability-specific invariants:

1. **Every meaningful signal is causally attributable.**  
   Persisted records must link to the originating run, step, subsystem, and parent-child lineage needed to reconstruct execution flow.

2. **Replay-critical evidence is immutable once committed.**  
   Model outputs, tool results, policy decisions, checkpoints, and replay manifests used by historical runs must not be mutated in place.

3. **Mandatory audit signals are not silently sampled away.**  
   Sampling may apply only to explicitly non-authoritative debug or aggregate telemetry classes.

4. **Large or sensitive payloads are stored by governed reference.**  
   Raw payloads, artifacts, and logs beyond bounded inline size should be retained through artifact refs with retention and access controls, not copied freely into every record.

5. **Cost rollups never erase leaf attribution.**  
   Aggregates must preserve the ability to trace cost back to child runs, steps, providers, tools, or execution spaces.

6. **Replay fidelity is declared, not assumed.**  
   Every run or manifest must explicitly indicate whether replay is authoritative, best-effort, or unsupported for a given portion of execution.

7. **Observability does not redefine execution success.**  
   This subsystem records committed execution outcomes; it must not invent successful results for missing artifacts or missing side-effect evidence.

8. **Redaction happens before broad visibility.**  
   Payloads that may contain secrets or sensitive data must be redacted, hashed, or quarantined before they become generally queryable.

---

## 9. Signal Taxonomy and Canonical Envelope

Observability requires a small set of canonical signal kinds so every subsystem can emit interoperable records.

### Signal kinds

| Signal kind | Purpose | Authoritative for replay? | Notes |
| --- | --- | --- | --- |
| `trace_span` | Duration-bound operation record with parent linkage | Sometimes | Used for execution timing and hierarchy. |
| `event` | Point-in-time state transition or decision | Often | Suitable for run transitions, approval waits, or denials. |
| `log` | Structured diagnostic message | No by default | Searchable operational context; may be sampled by policy. |
| `artifact_ref` | Reference to a stored payload or blob | Yes when linked by replay-critical records | Used for model payloads, output blobs, stderr, attachments, and evidence. |
| `usage_record` | Normalized non-monetary consumption quantity | Yes when part of an authoritative result | Separate from price or budget rollups. |
| `cost_record` | Monetary or budget-equivalent attribution record | Derived but persistent | May be estimated, vendor-reported, or reconciled later. |
| `replay_manifest` | Ordered replay index for a run or step fragment | Yes | Built from authoritative refs and lineage. |
| `alert_event` | Derived operational or cost threshold signal | No | Secondary operational product, not the source of truth. |

### Canonical envelope

Every persisted signal should conform to one canonical envelope.

| Field | Required | Meaning |
| --- | --- | --- |
| `signalId` | yes | Stable idempotent identifier for dedupe and lookup. |
| `kind` | yes | One of the canonical signal kinds. |
| `subsystem` | yes | Emitting subsystem such as `runtime`, `provider`, `tool`, `policy`, or `sandbox`. |
| `operation` | yes | Canonical operation name within the subsystem. |
| `occurredAt` | yes | Time the source reports the event or span boundary. |
| `ingestedAt` | yes | Time the observability subsystem accepted the record. |
| `userId` | required on run-bound work | Universal user identity. |
| `threadId` | required on run-bound work | Conversation identity. |
| `runId` | required on run-bound work | Agent Run identity. |
| `stepId` | required when tied to one reasoning or execution step | Stable step identity. |
| `collaborativeScopeId` | when applicable | Shared scope lineage. |
| `executionSpaceId` | when applicable | Isolation-boundary lineage. |
| `parentSignalId` | optional | Parent signal for tree reconstruction. |
| `causalRefs` | optional | Additional refs such as checkpoint, approval, tool call, or child run ids. |
| `sequenceKey` | yes for replay-critical records | Logical ordering key within the run or step. |
| `replayCritical` | yes | Indicates whether the record participates in authoritative replay. |
| `retentionClass` | yes | Retention posture for storage and reads. |
| `redactionClass` | yes | Redaction and sensitivity posture. |
| `payloadInline` | optional | Small bounded inline payload when safe. |
| `payloadRef` | optional | Large or sensitive payload reference. |
| `hash` | recommended | Hash of the effective payload or artifact. |

### Envelope rules

* replay-critical records must include enough lineage to reconstruct causal order without relying on wall-clock ordering alone
* large payloads should use `payloadRef` rather than unbounded inline storage
* duplicate `signalId` values must be handled idempotently
* signals missing required run or step lineage for their class must be rejected or quarantined rather than silently accepted

---

## 10. Durability Classes and Ingestion Pipeline

Not every signal has the same live-path importance.
The subsystem must separate durability posture explicitly.

### Durability classes

| Class | Live-path expectation | Examples |
| --- | --- | --- |
| `replay_authoritative` | Must be durably persisted or reference-addressable before the associated action, step, wait state, or terminal result is considered committed. | model input/output refs, tool result refs, policy decisions, checkpoints, context snapshot refs, final output refs, subagent handoff refs |
| `audit_required` | Must be durably queued or persisted before the caller returns success, but may be indexed or materialized asynchronously. | state-transition events, denial events, approval lifecycle events, cost-usage source records |
| `best_effort_debug` | May be buffered, rate-limited, or sampled under declared policy. | verbose logs, transient diagnostics, high-volume trace annotations |

### Ingestion pipeline

The subsystem should process signals through the following stages:

1. receive one signal or a bounded batch
2. validate envelope structure, required lineage, and idempotency key
3. apply redaction, payload-capture, and retention rules
4. assign durability handling based on signal class
5. persist the authoritative record or durable queue record
6. materialize search indexes, graph edges, cost rollups, and alert feeds asynchronously where allowed

### Pipeline rules

* replay-critical writes must fail closed when required persistence is unavailable
* best-effort diagnostics must never displace replay-authoritative records
* materialized views may lag the source-of-truth records, but source-of-truth identifiers must remain stable
* backpressure or failure on replay-authoritative persistence must be surfaced to the calling subsystem

---

## 11. Correlation Model and Required Read Views

The Layer 1.5 observability contract requires every run to support timeline, execution graph, and subagent tree views.

### Correlation anchors

The subsystem should correlate around these primary anchors:

* `runId`
* `stepId`
* `toolCallId`
* `skillCallId`
* `modelRequestId`
* `checkpointRef`
* `approvalId`
* `memoryId` or memory write batch id
* `executionSpaceId`
* `childRunId`

### Required read views

| View | Purpose | Required contents |
| --- | --- | --- |
| `RunTimeline` | Human-readable ordered execution history | state changes, reasoning steps, model calls, tool calls, policy decisions, approvals, checkpoints, final output, cost summary |
| `ExecutionGraph` | Causal graph for debugging and replay | parent-child edges across steps, model calls, tool calls, policy evaluations, memory operations, and child runs |
| `SubagentTree` | Delegation lineage view | head run, child runs, delegated objective summary refs, join status, cost rollups |
| `RunSummary` | Compact operational summary | current or terminal state, major refs, failure cause, latency, token totals, replay posture |
| `ArtifactIndex` | Lookup surface for stored payloads and blobs | artifact kind, retention, redaction, ownership, and read constraints |
| `CostRollup` | Governance and budgeting summary | usage totals, cost totals, estimate vs actual status, child-run attribution |

### Ordering rules

* timeline ordering must prefer logical sequence and causal edges over raw timestamps when they disagree
* child-run start and join events must appear in both the parent timeline and the child timeline through linked refs
* execution graph nodes should be reconstructable from canonical signal ids and refs rather than only from materialized state

---

## 12. Replay Model

Replay requires an explicit manifest, not an ad hoc scan of logs.

### Replay modes

The subsystem must support the Layer 1.5 replay modes:

* `debug_replay`
* `fast_replay`

### Replay fidelity posture

Each replayable run, step fragment, or child run should declare one posture:

| Posture | Meaning |
| --- | --- |
| `authoritative` | Required artifacts and refs exist for the requested replay mode. |
| `best_effort` | Some artifacts are missing, stale, or require live reconstruction. |
| `unsupported` | Replay should not proceed because required evidence is unavailable or the execution class forbids replay. |

### Replay manifest

| Field | Required | Notes |
| --- | --- | --- |
| `manifestId` | yes | Immutable manifest identifier. |
| `runId` | yes | Run represented by the manifest. |
| `headRunId` | yes | Root run lineage anchor. |
| `modeSupport` | yes | Which replay modes are supported. |
| `fidelity` | yes | Authoritative, best-effort, or unsupported. |
| `stepRefs` | yes | Ordered reasoning or execution step refs. |
| `contextSnapshotRefs` | when used | Refs to context assembly outputs. |
| `modelCallRefs` | when used | Refs to canonical model requests and final normalized responses. |
| `toolCallRefs` | when used | Refs to tool request and result records. |
| `skillCallRefs` | when used | Refs to skill activation and result records. |
| `memoryRefs` | when used | Refs to memory read and write records. |
| `policyDecisionRefs` | when used | Refs to decisions and approvals. |
| `checkpointRefs` | when used | Resume-safe checkpoints and boundaries. |
| `subagentRefs` | when used | Child-run manifests and merge refs. |
| `finalOutputRef` | terminal runs | Authoritative final output artifact. |
| `nonDeterministicRefs` | optional | Components that require simulate or skip posture. |
| `missingRefs` | optional | Evidence gaps that downgrade fidelity. |

### Replay rules

* final normalized outputs and persisted execution results are authoritative over streamed or best-effort diagnostics
* replay must prefer stored artifacts and stored results over live re-execution
* live side effects must not be re-emitted automatically during replay
* non-deterministic or environment-bound steps must carry enough metadata to simulate, skip, or mark degraded replay explicitly
* parent replay must preserve child-run ordering and merge decisions through linked manifests

---

## 13. Required Signal Coverage by Execution Stage

The subsystem must capture all meaningful actions required by Layer 1.5.

### Minimum required signal families

* run lifecycle events
* reasoning step decisions
* capability exposure decisions
* middleware execution
* context snapshot creation and inclusion metadata
* RAG retrievals, rerank decisions, and citation-packaging refs
* model requests, responses, finish reasons, and usage
* tool requests, outputs, side-effect refs, and failures
* skill activations, outputs, and contributed-tool lineage
* memory retrievals, write decisions, and conflict refs
* policy decisions, approval requests, and approval resolutions
* sandbox allocation, execution, network, secret, output, and release events
* subagent spawn, delegated-context refs, child lifecycle, join, and merge events
* checkpoint creation, load, and resume events
* inbound canonicalization refs and final output or outbound delivery refs where policy permits capture

### Coverage rules

* the observability subsystem owns cross-subsystem correlation and persistence rules
* individual subsystem docs own the exact payload semantics for their own records
* when the same action is represented in multiple subsystems, causal linkage must be explicit rather than inferred from timestamps alone

---

## 14. Usage, Cost, and Budget-Control Model

Usage and cost are related but not identical.
The subsystem must keep them distinct.

### Usage dimensions

The platform should support normalized usage dimensions such as:

* `model_input_tokens`
* `model_output_tokens`
* `model_cached_input_tokens`
* `model_request_count`
* `tool_invocation_count`
* `skill_invocation_count`
* `sandbox_cpu_seconds`
* `sandbox_memory_gib_seconds`
* `sandbox_storage_bytes_hours`
* `network_egress_bytes`
* `retrieval_query_count`
* `artifact_storage_bytes`

### Canonical cost records

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `UsageRecord` | `usageId`, `runId`, `subsystem`, `dimension`, `quantity`, `unit`, `measuredAt`, `sourceKind` | `stepId`, `childRunId`, `executionSpaceId` | Records a normalized quantity independent of price. |
| `CostRecord` | `costId`, `runId`, `subsystem`, `amount`, `currency`, `sourceKind`, `computedAt` | `stepId`, `usageId`, `pricingRef`, `estimated` | Records a priced amount or budget-equivalent. |
| `BudgetSnapshot` | `budgetId`, `subject`, `limit`, `consumed`, `remaining`, `status`, `asOf` | `warningThreshold`, `hardLimit` | Governance view consumed by runtime or policy, not the enforcement engine itself. |
| `CostAdjustment` | `adjustmentId`, `targetCostId`, `reason`, `computedAt` | `deltaAmount`, `pricingRef` | Preserves reconciliation without mutating historical leaf records silently. |

### Cost rules

* vendor-reported usage and platform-estimated usage must remain distinguishable
* estimated cost and actual reconciled cost must remain distinguishable
* child-run usage and cost must roll up into the head run while preserving leaf attribution
* pricing changes must use explicit pricing refs or adjustment records rather than silently rewriting historical costs
* budget-control outputs should be queryable by run, user, collaborative scope, subsystem, and child-run lineage

### Boundary with enforcement

This subsystem may produce:

* near-limit warnings
* hard-limit breach events
* anomaly alerts
* budget snapshots

The subsystem does **not** directly terminate runs or deny actions.
Runtime and policy remain responsible for acting on budget or cost-control signals.

---

## 15. Storage, Retention, and Access Model

The subsystem needs different storage shapes for source-of-truth evidence, artifacts, and analytics.

### Recommended storage roles

* transactional or strongly consistent storage for replay manifests, run summaries, signal metadata, and authoritative refs
* object storage for large payloads, raw request or response captures, stderr, stdout, attachments, and output artifacts
* analytical or columnar storage for aggregate telemetry, cost reporting, and fleet-level trends
* bounded caches for hot run summaries and recent signal lookups

### Retention classes

| Retention class | Purpose | Example contents |
| --- | --- | --- |
| `debug_short` | short-lived operational debugging | verbose logs, high-volume diagnostics |
| `operations_standard` | standard operational support | state transitions, normal spans, summaries |
| `replay_long` | replay and audit | manifests, authoritative refs, final outputs, key decisions |
| `security_long` | security and incident review | access-denial events, sensitive-boundary events |
| `finance_long` | cost and billing review | priced cost records, reconciliation records |

### Access rules

* read access must validate caller identity, scope, and sensitivity posture before returning payloads or raw artifacts
* raw payload access may be narrower than metadata access
* redacted or hashed variants may be returned when the caller is authorized to know that an artifact exists but not to view its full content
* deleted or expired artifacts must leave a tombstone or absence reason when they were previously referenced by replay or audit records

---

## 16. Redaction, Privacy, and Sensitive Payload Handling

Observability records often contain the same sensitive data that execution subsystems handle.

### Redaction classes

| Redaction class | Meaning |
| --- | --- |
| `none` | No additional redaction required beyond standard storage handling. |
| `pii` | Personally identifiable data requires masking or scoped raw access. |
| `secret` | Secrets or credential-like data must never be queryable in cleartext. |
| `sensitive_business` | Business-sensitive payload with restricted raw access. |
| `hash_only` | Only a hash or summary should be retained in the general observability plane. |

### Rules

* secrets, credentials, and secret-broker payloads must never be persisted in cleartext in generally queryable telemetry stores
* raw captures must obey policy and configuration, not per-emitter convenience
* redaction failure on replay-critical payloads must quarantine or fail the write rather than silently store unsafe data
* a redacted artifact should preserve stable identity and hash linkage to the underlying protected artifact when one exists

---

## 17. Derived Operational Products

Observability should produce more than raw records.
It should also produce bounded derived products for platform operations.

### Alerts

The subsystem should support derived alert events for:

* replay-critical persistence failures
* repeated policy denials or approval bottlenecks
* runaway child-run fanout or loop behavior
* abnormal tool, provider, or sandbox failure rates
* token, cost, or budget threshold breaches
* artifact retention gaps that degrade replay posture

### Evaluation-ready feeds

The subsystem should support bounded evidence slices for:

* failed runs
* degraded or best-effort replay runs
* policy-denied high-risk actions
* memory conflicts
* expensive or anomalous runs

### Product rules

* derived alerts and feeds must link back to canonical source signal ids and artifact refs
* derived products must not become the only retained record of an execution event
* evaluation-ready exports must obey the same redaction and scope controls as their underlying evidence

---

## 18. Configuration Direction

The subsystem must obey the platform configuration contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `mandatorySignalWriteMode` | control failure posture for replay-authoritative writes | string | fail closed | system |
| `captureRawModelPayloads` | retain raw model request and response payload refs when policy allows | boolean | false or conservative | system or collaborative scope |
| `captureRawToolPayloads` | retain raw tool payload refs when policy allows | boolean | conservative | system or collaborative scope |
| `maxInlineSignalBytes` | cap payload size stored inline in metadata records | integer | conservative | system |
| `defaultRetentionClass` | default retention posture for normal telemetry | string | operations_standard | system |
| `defaultReplayRetentionClass` | retention posture for replay-critical artifacts | string | replay_long | system |
| `allowBestEffortReplayFallback` | permit live reconstruction when authoritative replay refs are missing | boolean | false | system |
| `enableCostReconciliation` | allow post hoc pricing adjustments and reconciled cost views | boolean | true | system |
| `costAlertThresholds` | define warning and breach points for budgets or spend | map | conservative | system or scope |
| `observabilityKillSwitches` | disable selected signal families or raw-capture modes in emergencies | list | empty | system |

### Configuration rules

* every observability-related configuration must declare its scope explicitly
* lower-level configuration must not disable mandatory replay-critical capture required by higher-level policy
* overrides must be traceable and replay-visible
* emergency kill switches may reduce non-authoritative capture, but must not create a silent fail-open path for mandatory audit evidence

---

## 19. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `Record` | Persist one signal or bounded batch of signals under declared durability classes. | `SignalBatch` | `IngestResult` |
| `SealStep` | Commit the replay-visible step fragment once required refs exist. | `StepSealRequest` | `StepReplayFragment` |
| `FinalizeRun` | Seal terminal run summary, replay manifest, and cost rollup snapshot. | `RunFinalizeRequest` | `RunSummary` |
| `GetRunView` | Return timeline, graph, subagent tree, and summary for one run. | `RunViewRequest` | `RunView` |
| `GetReplayManifest` | Read the immutable replay manifest for one run or child run. | `ReplayReadRequest` | `ReplayManifest` |
| `QueryCosts` | Return usage, costs, rollups, or budget snapshots for a subject. | `CostQuery` | `CostQueryResult` |
| `ReadArtifact` | Resolve one artifact ref under scope and redaction rules. | `ArtifactReadRequest` | `ArtifactDescriptor` or bounded payload |
| `ListAlerts` | Return derived alert events for an operator or workflow consumer. | `AlertQuery` | Ordered list of `AlertEvent` values |

### Behavioral expectations

* `Record` must validate required lineage and reject or quarantine structurally unsafe replay-critical records
* `Record` must be idempotent for duplicate `signalId` values
* `SealStep` must not claim success if the step lacks required authoritative refs for its observed actions
* `FinalizeRun` must not claim terminal finalization before final output, replay posture, and rolled-up usage are reference-addressable
* `GetReplayManifest` must return the immutable manifest used for audit and replay, not a reconstructed best guess without posture labeling
* `QueryCosts` must distinguish measured, vendor-reported, estimated, and reconciled values
* `ReadArtifact` must enforce raw-vs-redacted access rules

---

## 20. Failure Modes and Recovery

The subsystem must fail closed for replay-critical ambiguity and degrade explicitly for best-effort telemetry.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| replay-authoritative store unavailable | write failure on authoritative record | associated step or result cannot safely commit | fail closed and surface persistence failure to caller |
| artifact store unavailable | payload-ref persistence failure | replay gap or unsafe missing evidence | fail closed for replay-critical artifacts, or store hash-only fallback when policy allows |
| duplicate or out-of-order signals | idempotency collision or sequence anomaly | confusing graph or timeline | dedupe by `signalId`, preserve arrival metadata, and order by logical sequence |
| redaction pipeline failure | sanitization error or policy mismatch | unsafe payload exposure risk | quarantine or fail closed before broad persistence |
| analytics rollup lag | delayed aggregate pipeline | stale dashboards or spend reports | preserve source-of-truth records and backfill aggregates asynchronously |
| pricing ref missing | cost computation failure | usage visible but spend incomplete | persist usage immediately and mark cost as pending estimate or reconciliation |
| cardinality explosion | abnormal high-volume debug traffic | storage or index pressure | rate-limit or sample `best_effort_debug` only and emit operator-visible alert |
| replay manifest build failure | missing required refs or internal assembly error | replay posture degraded | rebuild from authoritative source records or downgrade to explicit `best_effort` |
| access-control mismatch on read | scope or redaction validation failure | unauthorized visibility attempt | deny read and preserve audit record of denial |

### Recovery principles

* fail closed on replay-critical ambiguity
* degrade explicitly, never silently, for best-effort telemetry
* preserve enough metadata to explain what evidence is missing and why
* never rewrite historical leaf attribution to “repair” aggregates invisibly

---

## 21. Test and Validation Strategy

This subsystem requires contract, replay, security, and scale validation.

### Contract tests

* signal envelope validation across all canonical signal kinds
* idempotent ingest behavior for duplicate signal ids
* required identity and scope propagation for replay-critical records
* durability-class enforcement for replay-authoritative, audit-required, and best-effort telemetry

### Replay tests

* run manifests include all required refs for debug replay
* fast replay reconstruction uses sealed manifests rather than scanning raw logs
* non-deterministic and environment-bound steps downgrade replay posture correctly
* parent-child replay preserves subagent lineage and join ordering

### Cost and rollup tests

* provider usage and sandbox usage normalize into canonical dimensions
* child-run costs roll up to head runs without losing leaf attribution
* pricing adjustments produce explicit reconciliation records
* budget snapshots and threshold events reflect the same underlying source records

### Security and retention tests

* raw payload capture obeys policy and retention settings
* secrets never appear in generally queryable stores
* redacted and raw artifact access rules are enforced correctly
* expired or deleted artifacts preserve replay-visible absence reasons

### Failure-injection tests

* authoritative-store outage
* artifact-store outage
* redaction pipeline failure
* aggregate-store lag
* manifest-build failure
* high-volume debug signal flood

### Performance and scale tests

* ingest throughput under multi-subagent runs
* graph and timeline read latency for long runs
* cost-rollup latency under heavy provider and sandbox usage
* storage growth behavior across retention classes

---

## 22. Final Architectural Position

The Observability, Replay, and Cost Control subsystem should be designed as the platform’s **evidence, replay, and attribution plane**, not as a generic logging afterthought or a replacement for runtime execution state.

Its authoritative contract is:

* accept canonical execution evidence from all major subsystems
* preserve required causal lineage and replay-grade artifact refs
* materialize timeline, execution graph, and subagent tree views
* maintain usage, cost, and budget-governance records
* enforce redaction, retention, and scope-aware read rules
* expose replay, audit, alerting, and evaluation-ready outputs

It must remain separate from:

* live run orchestration
* policy authoring and approval UX
* model, tool, skill, memory, or sandbox execution logic
* business analytics outside platform execution governance

That separation keeps execution observable, replayable, attributable, and auditable without collapsing the platform into one monolithic runtime-plus-telemetry subsystem.
