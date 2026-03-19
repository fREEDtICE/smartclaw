# SmartClaw Agent Platform — Layer 2

## Policy and Approval System Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Policy and Approval System  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Governance Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Tool Execution Framework Design
* Skills System Design
* LLM Provider Abstraction Design
* Context Assembly Subsystem Design
* Identity and Thread Management
* Sandbox / Execution Space Design
* Observability and Replay Design

---

## 2. Purpose

The Policy and Approval System is the platform subsystem that turns a requested action, capability exposure, or scope-sensitive access into a **governed decision with replayable evidence**.

It exists because policy is not a boolean helper call. The platform must support:

* explicit enforcement points
* risk classification before enforcement
* scope-aware policy evaluation
* conditional allow decisions
* approval-gated actions
* immutable decision records for replay and audit
* predictable policy precedence across system, scope, agent, channel, user, and run layers

The Agent Runtime remains the **main enforcement carrier** on the live execution path.
It is also the primary live-path caller for fresh policy evaluation.
This subsystem owns:

* policy snapshots and evaluation contracts
* risk classification
* decision models and condition sets
* approval request and resolution records
* policy-visible audit and replay artifacts

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Policy and Approval System is responsible for:

* defining the canonical policy evaluation request and decision model
* resolving and snapshotting applicable policy layers using the platform precedence contract
* classifying action risk before evaluation
* evaluating intents such as capability exposure, tool execution, skill activation, memory writes, network requests, file writes, cross-scope data access, and subagent spawning
* returning `allow`, `deny`, or `require_approval` decisions with reasons and enforceable conditions
* creating approval artifacts for approval-gated actions
* resolving approval outcomes into replay-visible, scope-bound records
* preserving policy decisions, approval refs, and snapshot refs for audit and replay
* supporting policy-driven kill switches and emergency denials
* exposing a narrow internal API for runtime and other callers that are explicitly allowed by architecture

### Out of Scope

The Policy and Approval System does **not** own:

* run state transitions such as `waiting_approval`, `paused`, or `resuming`
* checkpoint writes
* direct execution of tools, skills, network calls, file writes, or memory writes
* identity resolution
* thread/session policy inside the Identity and Thread Management subsystem
* policy authoring UX
* final execution authorization envelopes for tools or skills after runtime applies policy results

This subsystem decides and records what is allowed.
Runtime and downstream execution subsystems enforce those decisions on the live path.

---

## 4. Architectural Role

The Policy and Approval System sits on the governance path for both capability exposure and external action execution.

```text
Agent Runtime
  -> build policy evaluation request
  -> Policy and Approval System
       -> resolve policy snapshot
       -> classify risk
       -> evaluate rules
       -> return allow / deny / require_approval
       -> create approval artifact when needed
  -> runtime checkpoints / waits / resumes
  -> runtime issues bounded authorization or decision refs downstream
  -> Tool / Skill / Memory / Provider / Sandbox path enforces returned conditions
```

### Upstream inputs

* policy evaluation requests from Agent Runtime
* resolved identity, thread, scope, and execution-space metadata
* agent profile and run metadata
* capability descriptors and action payload hashes
* policy layer sources from system, environment, collaborative scope, agent, channel, user, and run levels
* approval outcomes from approved human or system approvers

### Downstream outputs

* policy decisions
* policy snapshot refs
* risk assessment refs
* approval request refs
* approval resolution refs
* structured conditions and denial reasons
* trace and replay artifacts

### Primary consumers

The primary live-path evaluation caller is:

* Agent Runtime

Decision, approval, or replay record consumers may include:

* Tool Execution Framework
* Skills System
* Memory System
* LLM Provider Abstraction
* Sandbox / Execution Space
* Observability and Replay

---

## 5. Goals and Non-Goals

### Goals

The Policy and Approval System must optimize for:

* policy-first execution
* predictable evaluation semantics
* immutable, replayable decision records
* explicit scope and identity propagation
* clear approval boundaries
* fail-closed behavior on unsafe ambiguity
* narrow, enforceable condition sets
* safe capability exposure filtering
* clean separation between policy decisioning and runtime orchestration

### Non-Goals

The Policy and Approval System is not trying to optimize for:

* replacing runtime orchestration
* embedding tool or skill business logic in policy rules
* hiding why a decision was made
* silently widening permissions through lower-precedence overrides
* approving broad future actions by default
* auto-modifying live policy behavior from self-improvement output

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the policy-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The subsystem must support:

* policy-gated behavior for tools, skills, memory writes, and external actions
* explicit capability exposure filtering by scope, policy, agent configuration, and run constraints
* approval and policy gates before risky actions
* network policy enforcement as part of the execution path
* observability, replay, and audit of policy decisions and workflows
* controlled self-improvement of policy artifacts only behind review and approval

### From Layer 1.5

The subsystem must implement:

* the policy-first invariant that no external side effect occurs without policy evaluation
* identity and scope propagation in every evaluation request
* the standard policy pipeline: `Intent -> Risk Classification -> Policy Evaluation -> Decision -> Enforcement`
* the required decision shape: `allow | deny | require_approval`
* policy evaluation before tool execution, skill activation, memory write, network request, file write, and every subagent spawn request
* replay-grade storage of policy decisions
* predictable configuration precedence and traceability
* no cross-scope data access without policy approval

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Policy and Approval System must:

* compile or resolve applicable policy inputs into immutable evaluation snapshots
* classify risk for candidate intents before final decisioning
* evaluate policy against canonical request types and scope metadata
* return decisions with reasons, conditions, and replay-visible refs
* create approval records for `require_approval` outcomes
* validate approval resolutions against the original request hash and policy snapshot
* preserve decision history, denials, approvals, and snapshot refs for replay
* support emergency deny and kill-switch controls
* provide deterministic evaluation for a fixed snapshot and request
* expose decision contracts that downstream systems can enforce without reinterpretation

---

## 8. Core Invariants

The Policy and Approval System must obey the global platform invariants.

Additional policy-specific invariants:

1. **No execution without a decision path.**  
   Any side-effecting action must be preceded by a policy decision or a policy-derived approval result bound to the exact request context.

2. **Decisions are context-bound.**  
   A decision or runtime-generated authorization derived from it is valid only for the subject, scope, execution-space context, intent type, target envelope, request mode, and request hash it was computed for.

3. **Policy snapshots are immutable per decision.**  
   Replay must be able to recover the exact snapshot used for a decision, even if newer policy versions exist.

4. **Conditions only narrow.**  
   Returned conditions may constrain execution further, but downstream systems must never interpret them as permission to broaden an action.

5. **Approval is exact by default.**  
   Approval records should bind to the original request hash and conditions unless the policy explicitly allows bounded reuse.

6. **Unsafe ambiguity fails closed.**  
   Missing scope, missing snapshot, conflicting high-risk rules, or unverifiable approval state must not degrade into `allow`.

7. **Policy does not replace enforcement.**  
   A policy decision is authoritative for governance, but downstream subsystems still enforce path, network, timeout, secret, and capability constraints.

---

## 9. Policy Sources, Snapshots, and Precedence

Layer 1.5 requires predictable configuration precedence.
Policy evaluation must therefore be snapshot-based rather than ad hoc.

### 9.1 Policy sources

Applicable policy inputs may come from:

* system
* environment
* collaborative scope
* agent
* channel
* user
* run

### 9.2 Precedence order

The policy subsystem must respect the platform order:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### 9.3 Policy precedence rules

* every policy input must declare its scope and source
* lower-precedence layers must not be silently ignored
* narrower-scope layers may further restrict or specialize decisions freely
* widening permissions beyond a higher-layer restriction must require an explicit, traceable override capability declared by the higher layer
* deny or approval requirements inherited from a higher layer must not disappear without explicit override evidence

### 9.4 Snapshot requirements

An evaluation snapshot must:

* identify the exact source refs used
* preserve the precedence order applied
* be immutable once referenced by a decision
* remain retrievable for replay and audit

### 9.5 Snapshot model

| Policy layer | Meaning |
| --- | --- |
| `system` | Platform-wide baseline policy. |
| `environment` | Deployment or environment-specific policy. |
| `collaborative_scope` | Team, tenant, or shared-workspace policy. |
| `agent` | Agent-profile-specific policy. |
| `channel` | Channel-specific policy. |
| `user` | User-specific policy override where allowed. |
| `run` | One-run override with explicit traceability. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `PolicySourceRef` | `layer`, `sourceId`, `version`, `hash` | None | Identifies one source that contributed to a snapshot. |
| `PolicySnapshotRef` | `snapshotId`, `hash`, `createdAt`, `sources` | None | Immutable snapshot used for decisioning, replay, and audit. |

---

## 10. Intent and Decision Model

The policy subsystem must evaluate canonical intents rather than raw subsystem-specific requests.

### 10.1 Canonical intent classes

Representative intent classes include:

* capability exposure
* tool execution
* skill activation
* memory write
* network request
* file write
* cross-scope data access
* subagent spawn
* provider egress

### 10.2 Evaluation inputs

Every evaluation request must include:

* subject identity
* thread and run lineage
* collaborative scope when present
* execution-space id when applicable
* action or resource identity
* request hash or payload ref for exact binding
* risk hints and capability metadata where available
* relevant timing and causal refs such as `stepId`

### 10.3 Decision semantics

* `allow`: the action may proceed only within the returned conditions
* `deny`: the action must not proceed
* `require_approval`: the action must pause until an approval resolution bound to the original request is returned

### 10.4 Request and decision contract

| Intent type | Meaning |
| --- | --- |
| `capability_exposure` | Decide whether a tool or skill may be shown or considered. |
| `tool_execution` | Decide whether a concrete tool call may execute. |
| `skill_activation` | Decide whether a concrete skill may activate. |
| `memory_write` | Decide whether a memory write or candidate batch may persist. |
| `network_request` | Decide whether a network operation may occur. |
| `file_write` | Decide whether a file mutation may occur. |
| `cross_scope_access` | Decide whether a caller may cross scope boundaries. |
| `subagent_spawn` | Decide whether bounded delegation may occur. |
| `provider_egress` | Decide whether provider-bound egress is permitted. |

| Risk level | Meaning |
| --- | --- |
| `low` | Auto-allow may be possible when policy permits. |
| `medium` | Policy-controlled; may allow, deny, or require bounded conditions. |
| `high` | Approval is normally required unless policy denies first. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `PolicySubject` | `userId`, `threadId`, `runId`, `roles` | `stepId`, `agentProfileId`, `channelId`, `collaborativeScopeId`, `executionSpaceId` | Carries caller identity and scope lineage. |
| `PolicyTarget` | `resourceType`, `resourceId`, `operation`, `attributes` | None | `attributes` carries machine-readable action metadata. |
| `PolicyEvaluationRequest` | `evaluationId`, `intent`, `subject`, `target`, `requestHash`, `occurredAt` | `payloadRef` | Canonical request submitted for live decisioning. |
| `PolicyDecision` | `decisionId`, `evaluationId`, `decision`, `reason`, `conditions`, `risk`, `snapshot` | `expiresAt` | `decision` uses `allow`, `deny`, or `require_approval`. |
| `PolicyAccessContext` | `userId`, `threadId`, `runId` | `stepId`, `collaborativeScopeId`, `executionSpaceId` | Required for read and approval-resolution operations. |
| `SnapshotReadRequest` | `snapshotId`, `access` | None | Scope-aware read of one immutable snapshot ref. |
| `DecisionReadRequest` | `decisionId`, `access` | None | Scope-aware read of one replay-visible decision. |

### 10.5 Condition rules

Returned conditions should be machine-enforceable where possible.
Representative condition categories include:

* allowed path prefixes
* allowed domains or egress modes
* secret scopes
* timeout or output-size ceilings
* allowed tool subset
* approved memory scope
* required reviewer classes

Downstream systems must fail closed if they cannot enforce a returned condition.

---

## 11. Risk Classification Model

Layer 1.5 defines risk classification as part of the policy pipeline, not as an optional detail.

### 11.1 Risk levels

| Level | Expected Behavior |
| --- | --- |
| `low` | auto-allow is possible when policy permits |
| `medium` | policy-controlled; may allow, deny, or require bounded conditions |
| `high` | approval is normally required unless policy denies first |

### 11.2 Classification inputs

Risk classification should consider:

* intent class
* declared tool or skill risk
* whether the action mutates data or only exposes capability
* whether scope changes or cross-scope access is involved
* whether files, network, secrets, or provider egress are involved
* whether a subagent gains elevated capabilities
* whether the target is user, team, product, or system data
* whether the request is exact or ambiguous

### 11.3 Classification rules

* the effective risk must be at least as high as the declared risk floor from the calling subsystem
* ambiguous or incomplete requests must not be classified lower than their actual uncertainty warrants
* risk classification must be stored with the decision for replay and audit
* risk classification must be deterministic for a fixed request and policy snapshot

### 11.4 Risk assessment contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RiskAssessment` | `assessmentId`, `intent`, `effective`, `factors` | None | Records the effective risk and the factors that drove that classification. |

---

## 12. Approval Model

Approval is part of the subsystem because `require_approval` is a first-class policy outcome.
Runtime still owns run-state transitions such as `waiting_approval`.

### 12.1 Approval rules

* approval should bind to the original request hash by default
* approval should bind to the original policy snapshot or a compatible approved successor snapshot
* approval must expire if policy or request context changes materially
* approval must be replay-visible and attributable to an approver identity
* approval must not silently widen conditions that were originally presented
* approval read and resolution operations must carry caller identity and scope context explicitly

### 12.2 Approval lifecycle

```text
Policy decision requires approval
-> create approval request artifact
-> runtime checkpoints and waits
-> approver responds
-> Policy and Approval System validates response against original intent
-> approval resolution record produced
-> runtime resumes with approval payload
```

### 12.3 Approval contract

| Approval status | Meaning |
| --- | --- |
| `pending` | Waiting for a reviewer response. |
| `approved` | Approved and reusable only within the original approval contract. |
| `denied` | Explicitly denied by a reviewer or approver. |
| `expired` | Approval window closed before a valid response was applied. |
| `cancelled` | Approval was withdrawn or invalidated before completion. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ApprovalRequest` | `approvalId`, `decisionId`, `requestHash`, `subject`, `intent`, `summary`, `requiredReview`, `conditions`, `status`, `expiresAt`, `createdAt` | None | Replay-visible artifact produced when a decision requires approval. |
| `ApprovalReadRequest` | `approvalId`, `access` | None | Scope-aware read of one approval artifact. |
| `ApprovalResolutionRequest` | `approvalId`, `access`, `actorId`, `approve`, `occurredAt` | `comment` | Used to approve or deny one specific request. |
| `ApprovalResolution` | `approvalId`, `status`, `resolvedBy`, `resolvedAt`, `decisionRef` | `comment` | Returned after validating the reviewer action against the original request and snapshot. |

### 12.4 Reuse rules

* one approval request should authorize one exact intent by default
* reusable approvals, if supported, must be bounded by explicit policy and narrow condition sets
* approval for one scope, thread, or execution space must not be reused in another unless policy explicitly permits it

---

## 13. Enforcement Points and Integration Boundaries

Layer 1.5 defines the required enforcement points.
This subsystem must serve them without collapsing execution boundaries between runtime and downstream systems.

### 13.1 Required enforcement points

Policy must be applied before:

* capability exposure when policy constrains what may be advertised
* tool execution
* skill activation
* memory write
* network request
* file write
* every subagent spawn request
* cross-scope data access

### 13.2 Runtime boundary

The Agent Runtime owns:

* deciding when to call `Evaluate` for fresh live-path policy decisions
* checkpointing before approval waits or risky actions
* turning policy results into run state transitions
* producing bounded authorization envelopes for downstream tool execution, skill activation, and provider egress

The Policy and Approval System owns:

* evaluating the request
* returning conditions and reasons
* producing approval artifacts and resolution records

### 13.3 Downstream subsystem boundary

Downstream systems such as tools, skills, provider execution, and sandboxing must:

* accept policy decision refs or runtime-generated authorization derived from policy
* treat any runtime-generated authorization as an exact-bound, replay-visible projection of one policy decision rather than a fresh permission source
* enforce returned condition sets faithfully
* reject execution when policy data is missing, expired, or unenforceable
* avoid reinterpreting a denial or approval into broader permissions
* avoid widening a policy-derived authorization to a different target, route, path boundary, attachment set, execution space, or request mode
* bind provider egress authorization to the routed target and request mode before provider execution begins
* avoid issuing fresh live-path `Evaluate` calls outside runtime-owned orchestration, except for explicit offline governance or audit workflows

Read-oriented consumers such as audit, replay, and downstream validators may fetch existing decision, approval, or snapshot records, but those reads must remain scope-aware.

### 13.4 Identity boundary

This subsystem relies on upstream identity resolution.
It must not invent user, thread, or scope lineage on its own.

### 13.5 Session policy boundary

Identity and Thread Management may own session or thread policy for thread routing decisions.
That does not replace general policy enforcement for downstream side effects.

---

## 14. Capability Exposure Filtering

Layer 1 requires explicit capability exposure filtering before tools or skills are advertised to runtime reasoning.

### Exposure policy rules

* policy may filter candidate tools or skills before model exposure
* exposure filtering must be based on the same identity, scope, execution-space, and run metadata used elsewhere
* hidden or denied capabilities must not appear in the exposed set
* exposure decisions must be replay-visible

### Exposure decision semantics

Common policy outcomes for exposure include:

* fully hidden capability
* visible capability with narrowed conditions
* approval-gated temporary capability exposure

Approval-gated exposure should be rare and explicit because exposing a capability is not the same as authorizing its execution.

---

## 15. Cross-Scope Access and Delegation Control

Layer 1.5 requires no cross-scope data access without policy approval and bounded delegation for subagents.

### Cross-scope rules

* cross-scope reads and writes must be evaluated explicitly
* a matching user identity is not sufficient to grant cross-scope access automatically
* approval may be required when collaborative scope or execution-space boundaries change
* returned conditions must specify the exact scope transition or allowed data slice

### Delegation rules

* policy must evaluate every subagent spawn request
* same-scope and same-capability delegation may auto-allow under policy, but it must still pass through the policy path
* delegation approvals must preserve parent-child lineage and task bounds
* child tool or skill subsets must remain explicit and replay-visible
* approvals for delegation must not imply approval for all child actions

---

## 16. Caching, Reuse, and Expiry

Policy evaluation must remain predictable, but it should not re-evaluate identical low-risk requests unnecessarily when safe reuse is possible.

### Cache rules

* any reusable decision cache key must include at least intent, request hash, subject scope, and policy snapshot hash
* cache reuse must not cross snapshot changes, scope changes, or execution-space changes
* decisions that required approval should generally not be reused unless the approval contract explicitly allows bounded reuse
* cache hits must remain replay-visible

### Expiry rules

* decisions may carry expirations when policy requires freshness
* approval artifacts must expire
* expired decisions or approvals must not silently degrade into `allow`

---

## 17. Replay and Observability

Policy is a major audit boundary because it explains why the platform allowed, denied, or paused an action.

### Required logs

The subsystem must emit structured logs for:

* snapshot resolution
* source precedence application
* risk classification
* evaluation request receipt
* decision result
* condition generation
* approval request creation
* approval resolution
* expiration, cancellation, denial, and emergency kill-switch events

### Required trace spans

At minimum:

* `policy.snapshot_resolve`
* `policy.risk_classify`
* `policy.evaluate`
* `policy.condition_compile`
* `policy.approval_create`
* `policy.approval_resolve`

### Replay capture

The subsystem must preserve:

* policy snapshot ref
* source refs and hashes
* evaluation request hash
* subject and scope refs
* risk assessment ref
* decision id and decision kind
* reasons and conditions
* approval request and approval resolution refs
* expiration data

### Human audit visibility

For inspection and debugging, the platform should make visible:

* which policy layers applied
* what risk factors were considered
* why an action was denied, allowed, or routed to approval
* who approved or denied a request and when

---

## 18. Configuration Direction

The subsystem must obey the platform configuration contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `allowPolicyDecisionCaching` | reuse safe decisions within the same snapshot and scope | boolean | true | system |
| `defaultApprovalTTL` | default approval expiry | duration | conservative | system or scope |
| `requireExactApprovalHash` | bind approvals to exact request hash | boolean | true | system |
| `allowCapabilityExposureApproval` | allow approvals for capability exposure | boolean | false or conservative | system |
| `capturePolicyPayloadRefs` | store request payload refs for replay | boolean | true when allowed | system or scope |
| `policyKillSwitches` | immediate deny list for resources, publishers, or actions | list | empty | system or scope |
| `maxApprovalReuseWindow` | cap reusable approval lifetime | duration | short | system |

### Configuration rules

* every policy-related config must declare its scope explicitly
* overrides must be traceable and replay-visible
* configuration must not silently widen risk posture for existing policies
* configuration must not create a fail-open path for live policy-gated execution
* lower-level config must not erase higher-level deny posture without explicit override capability

---

## 19. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `Evaluate` | Produce a live policy decision for one canonical intent. | `PolicyEvaluationRequest` | `PolicyDecision` |
| `GetSnapshot` | Read one immutable policy snapshot reference. | `SnapshotReadRequest` | `PolicySnapshotRef` |
| `GetDecision` | Read one replay-visible decision record. | `DecisionReadRequest` | `PolicyDecision` |
| `GetApproval` | Read one replay-visible approval request. | `ApprovalReadRequest` | `ApprovalRequest` |
| `ResolveApproval` | Validate and apply one approver response. | `ApprovalResolutionRequest` | `ApprovalResolution` |

### Behavioral expectations

* `Evaluate` must be deterministic for a fixed request and policy snapshot
* `Evaluate` must persist or make reference-addressable the resulting decision before claiming success
* `GetSnapshot`, `GetDecision`, and `GetApproval` must enforce caller scope context before returning replay-visible records
* `ResolveApproval` must validate that the approval request is still compatible with the original request hash, snapshot context, and approver context
* `GetSnapshot` must retrieve the immutable snapshot identified by `SnapshotID`, not re-resolve a fresh snapshot from mutable policy inputs

---

## 20. Failure Modes and Recovery

The subsystem must fail closed on unsafe ambiguity and preserve enough evidence for audit.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| policy snapshot missing | snapshot resolution failure | evaluation cannot proceed | fail closed or hide capability |
| evaluator unavailable | dependency failure | unsafe ambiguity | fail closed for risky or side-effecting actions |
| conflicting high-risk rules | evaluation conflict | unclear decision | deny or require operator intervention |
| malformed request | schema or scope validation failure | invalid evaluation | reject before decision |
| approval store unavailable | approval persistence failure | cannot create wait artifact | fail closed before returning `require_approval` |
| stale approval | approval hash or snapshot mismatch | unsafe reuse | reject and require re-evaluation |
| approval expired | expiry check | action no longer authorized | require re-evaluation |
| downstream cannot enforce condition | enforcement capability mismatch | unsafe execution risk | reject downstream action |
| duplicate approval resolution | concurrency conflict | ambiguous approver state | preserve first valid resolution and reject duplicates |

### Recovery principles

* fail closed for unsafe ambiguity
* prefer hiding capabilities over exposing them without enforceable policy
* never convert approval failure into implicit allow
* preserve denial and approval artifacts even on upstream failure

---

## 21. Explicit Boundaries with Other Subsystems

### Agent Runtime

Runtime owns when policy is called, how runs pause, and how execution resumes.
This subsystem owns how policy is evaluated and how approval artifacts are recorded.

### Tool Execution Framework

Tool execution remains a separate boundary.
The policy subsystem does not execute tools; it returns decisions and conditions that runtime and the tool framework must enforce.

### Skills System

Skill activation may require approval, but approval for a skill does not replace downstream policy for tool calls or memory writes performed during skill execution.

### LLM Provider Abstraction

Provider network execution must use a runtime-issued egress authorization derived from policy when the path leaves the platform boundary.
That authorization must bind to the routed target and request mode, and the provider abstraction must not widen access beyond what policy cleared.

### Sandbox / Execution Space

This subsystem may constrain execution-space use through policy conditions, but sandbox allocation and isolation remain outside its ownership.

### Identity and Thread Management

Identity and Thread Management resolves identity and session/thread policy.
This subsystem consumes that identity and scope metadata for general enforcement decisions.

---

## 22. Final Architectural Position

The Policy and Approval System should be designed as the platform’s **governance decision engine and approval record system**, not as a generic runtime or plugin host.

Its authoritative contract is:

* resolve the applicable policy snapshot
* classify risk
* evaluate the request into `allow`, `deny`, or `require_approval`
* produce bounded conditions and immutable decision refs
* create and resolve approval artifacts
* preserve replay-grade evidence for every decision

It must remain separate from:

* runtime state orchestration
* tool and skill execution
* sandbox implementation internals
* identity resolution
* approval UI

That separation keeps policy-first execution explicit, auditable, bounded, and consistent with the Layer 1 and Layer 1.5 contracts.
