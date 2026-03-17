# Frame AI Agent Platform — Layer 2

## Policy and Approval System Design

Based on the platform architecture and contracts defined from the blueprint document.

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

* Agent Runtime
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
* policy evaluation before tool execution, skill activation, memory write, network request, file write, and subagent spawning when scope or capability changes
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
   A decision is valid only for the subject, scope, execution-space context, intent type, and request hash it was computed for.

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

### 9.5 Go-style sample model

```go
package policy

import "time"

type PolicyLayer string

const (
	LayerSystem             PolicyLayer = "system"
	LayerEnvironment        PolicyLayer = "environment"
	LayerCollaborativeScope PolicyLayer = "collaborative_scope"
	LayerAgent              PolicyLayer = "agent"
	LayerChannel            PolicyLayer = "channel"
	LayerUser               PolicyLayer = "user"
	LayerRun                PolicyLayer = "run"
)

type PolicySourceRef struct {
	Layer    PolicyLayer
	SourceID string
	Version  string
	Hash     string
}

type PolicySnapshotRef struct {
	SnapshotID string
	Hash       string
	CreatedAt  time.Time
	Sources    []PolicySourceRef
}
```

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

### 10.4 Go-style sample request and decision model

```go
package policy

import (
	"encoding/json"
	"time"
)

type IntentType string

const (
	IntentCapabilityExposure IntentType = "capability_exposure"
	IntentToolExecution      IntentType = "tool_execution"
	IntentSkillActivation    IntentType = "skill_activation"
	IntentMemoryWrite        IntentType = "memory_write"
	IntentNetworkRequest     IntentType = "network_request"
	IntentFileWrite          IntentType = "file_write"
	IntentCrossScopeAccess   IntentType = "cross_scope_access"
	IntentSubagentSpawn      IntentType = "subagent_spawn"
	IntentProviderEgress     IntentType = "provider_egress"
)

type RiskLevel string

const (
	RiskLow    RiskLevel = "low"
	RiskMedium RiskLevel = "medium"
	RiskHigh   RiskLevel = "high"
)

type PolicySubject struct {
	UserID               string
	ThreadID             string
	RunID                string
	StepID               *string
	AgentProfileID       *string
	ChannelID            *string
	CollaborativeScopeID *string
	ExecutionSpaceID     *string
	Roles                []string
}

type PolicyTarget struct {
	ResourceType string
	ResourceID   string
	Operation    string
	Attributes   json.RawMessage
}

type PolicyEvaluationRequest struct {
	EvaluationID string
	Intent       IntentType
	Subject      PolicySubject
	Target       PolicyTarget
	RequestHash  string
	PayloadRef   *string
	OccurredAt   time.Time
}

type ConditionSet map[string]json.RawMessage

type PolicyDecisionKind string

const (
	DecisionAllow           PolicyDecisionKind = "allow"
	DecisionDeny            PolicyDecisionKind = "deny"
	DecisionRequireApproval PolicyDecisionKind = "require_approval"
)

type PolicyDecision struct {
	DecisionID   string
	EvaluationID string
	Decision     PolicyDecisionKind
	Reason       string
	Conditions   ConditionSet
	Risk         RiskLevel
	Snapshot     PolicySnapshotRef
	ExpiresAt    *time.Time
}
```

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

### 11.4 Go-style sample risk model

```go
package policy

type RiskAssessment struct {
	AssessmentID string
	Intent       IntentType
	Effective    RiskLevel
	Factors      []string
}
```

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

### 12.3 Approval request model

```go
package policy

import "time"

type ApprovalStatus string

const (
	ApprovalPending   ApprovalStatus = "pending"
	ApprovalApproved  ApprovalStatus = "approved"
	ApprovalDenied    ApprovalStatus = "denied"
	ApprovalExpired   ApprovalStatus = "expired"
	ApprovalCancelled ApprovalStatus = "cancelled"
)

type ApprovalRequest struct {
	ApprovalID     string
	DecisionID     string
	RequestHash    string
	Subject        PolicySubject
	Intent         IntentType
	Summary        string
	RequiredReview []string
	Conditions     ConditionSet
	Status         ApprovalStatus
	ExpiresAt      time.Time
	CreatedAt      time.Time
}

type ApprovalResolution struct {
	ApprovalID   string
	Status       ApprovalStatus
	ResolvedBy   string
	ResolvedAt   time.Time
	Comment      *string
	DecisionRef  string
}
```

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
* subagent spawning when scope or capability changes
* cross-scope data access

### 13.2 Runtime boundary

The Agent Runtime owns:

* deciding when to call policy on the live path
* checkpointing before approval waits or risky actions
* turning policy results into run state transitions
* producing bounded authorization envelopes for downstream tool or skill execution

The Policy and Approval System owns:

* evaluating the request
* returning conditions and reasons
* producing approval artifacts and resolution records

### 13.3 Downstream subsystem boundary

Downstream systems such as tools, skills, provider execution, and sandboxing must:

* accept policy decision refs or runtime-generated authorization derived from policy
* enforce returned condition sets faithfully
* reject execution when policy data is missing, expired, or unenforceable
* avoid reinterpreting a denial or approval into broader permissions

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

* policy must evaluate subagent spawning when scope or capability changes
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
| `failOpenLowRiskReads` | allow tightly bounded degraded mode for non-side-effecting low-risk reads | boolean | false | system |
| `policyKillSwitches` | immediate deny list for resources, publishers, or actions | list | empty | system or scope |
| `maxApprovalReuseWindow` | cap reusable approval lifetime | duration | short | system |

### Configuration rules

* every policy-related config must declare its scope explicitly
* overrides must be traceable and replay-visible
* configuration must not silently widen risk posture for existing policies
* lower-level config must not erase higher-level deny posture without explicit override capability

---

## 19. API Surface

The internal API should remain narrow and explicit.

```go
package policy

import "context"

type PolicySystem interface {
	Evaluate(ctx context.Context, req PolicyEvaluationRequest) (PolicyDecision, error)
	GetSnapshot(ctx context.Context, req PolicyEvaluationRequest) (PolicySnapshotRef, error)
	GetDecision(ctx context.Context, decisionID string) (PolicyDecision, error)
	GetApproval(ctx context.Context, approvalID string) (ApprovalRequest, error)
	ResolveApproval(ctx context.Context, approvalID string, actorID string, approve bool, comment *string) (ApprovalResolution, error)
}
```

### Behavioral expectations

* `Evaluate` must be deterministic for a fixed request and policy snapshot
* `Evaluate` must persist or make reference-addressable the resulting decision before claiming success
* `ResolveApproval` must validate that the approval request is still compatible with the original request hash and snapshot context
* `GetSnapshot` and `GetDecision` must return the replay-visible records used by downstream audit and resume paths

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

Provider network execution may require a policy decision ref for egress.
The provider abstraction must not widen access beyond what policy cleared.

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
