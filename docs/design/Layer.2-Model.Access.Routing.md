# Frame AI Agent Platform — Layer 2

## Model Access / Routing Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Model Access / Routing
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Model Platform and Runtime Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* LLM Provider Abstraction Design
* Policy and Approval System Design
* Observability, Replay, and Cost Control Design
* Tool Execution Framework Design
* Sandbox / Execution Space Design
* Identity and Thread Management

---

## 2. Purpose

The Model Access / Routing subsystem resolves one runtime reasoning step into a **governed, replayable model execution plan**.

It exists because provider abstraction alone is not enough.
The platform needs a separate control plane for:

* choosing which model target should handle a step
* matching required features against explicit capability profiles
* negotiating token and output budgets with Context Assembly
* enforcing route-profile, scope, policy, and data-handling constraints
* balancing cost, latency, reliability, and continuity preferences
* constructing a bounded fallback chain when failures are route-actionable

This subsystem owns **target selection and routing decisions**.
It does not own prompt construction, vendor request execution, or tool authorization.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Model Access / Routing subsystem is responsible for:

* maintaining the platform-visible model target catalog and logical route profiles
* issuing pre-assembly context budget envelopes for model-bound steps
* resolving a runtime step intent into a primary target and bounded fallback chain
* filtering targets by capability fit, context-window fit, scope, policy, data-handling, budget, and health constraints
* preserving route stability or affinity where configured and safe
* deciding when a provider failure should remain on the same target versus advance to a different routed target
* returning replay-visible routing decisions, reason codes, and predicted budget posture
* exposing route diagnostics for audit, replay, debugging, and operator analysis

### Out of Scope

The Model Access / Routing subsystem does **not** own:

* provider SDK or HTTP execution
* canonical message rendering or prompt assembly
* tool execution authorization or tool execution itself
* policy authoring or approval workflows
* memory retrieval, RAG retrieval, or context compaction internals
* credential storage
* long-term health telemetry storage or pricing ledger ownership
* business-specific agent behavior

This subsystem decides **which model path is valid and preferred**.
The LLM Provider Abstraction decides **how the selected path is executed**.

---

## 4. Architectural Role

The subsystem sits between runtime intent and provider execution.

```text
Agent Runtime
  -> describe step intent, capabilities, and budget posture
  -> Model Access / Routing
       -> resolve route profile and target catalog
       -> issue budget envelope for Context Assembly
       -> filter eligible targets
       -> rank candidates
       -> emit primary target + fallback chain
  -> LLM Provider Abstraction
       -> execute selected target
  -> if route-actionable failure:
       -> Model Access / Routing advances to next eligible target
```

### Upstream inputs

* step-level execution intent from Agent Runtime
* effective tool set metadata when tool-aware generation is allowed
* context-window requirements and final token counts from Context Assembly
* identity and scope metadata, including `userId`, `threadId`, `runId`, and `stepId`
* `collaborativeScopeId` and `executionSpaceId` when applicable
* applicable policy decision refs or route constraints derived from policy
* route profiles, target catalog entries, pricing metadata, and configured preferences
* target capability profiles from the provider abstraction layer
* health, quota-pressure, and failure signals from observability or internal control-plane feeds

### Downstream outputs

* pre-assembly budget envelope
* routed execution decision
* primary `ResolvedModelTarget`
* bounded fallback target chain
* predicted cost and latency posture
* routing reason codes and candidate-filter summaries
* route attempt records and terminal routing errors
* replay and trace artifacts

### Primary consumers

* Agent Runtime
* Context Assembly
* LLM Provider Abstraction
* Observability, Replay, and Cost Control
* operator diagnostics and control-plane tooling

---

## 5. Goals and Non-Goals

### Goals

The subsystem must optimize for:

* explicit and auditable target selection
* strict capability matching
* predictable budget negotiation with Context Assembly
* bounded, observable fallback behavior
* policy-compatible model access
* cost and latency awareness without weakening hard safety constraints
* route stability for coherent multi-step runs
* support for heterogeneous providers behind one platform-level decision contract

### Non-Goals

The subsystem is not trying to optimize for:

* hiding provider capability gaps
* turning routing into agent reasoning
* probing live providers opportunistically on the critical path
* embedding provider SDK logic into routing
* authorizing tool use or external side effects
* silently switching to weaker semantics when required capabilities are missing

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the model-access and routing responsibilities implied by Layer 1 and Layer 1.5.

### From Layer 1

The subsystem must support:

* provider-agnostic model access
* explicit capability-based model selection
* bounded execution through budget and timeout-aware target selection
* full traceability of target choice and fallback behavior
* safe extensibility as new model providers or model classes are added
* separation of application behavior from platform model-control infrastructure

### From Layer 1.5

The subsystem must implement:

* identity and scope propagation for every routing request and decision
* predictable configuration precedence for route profiles, allowlists, and overrides
* replay-visible capture of effective capability exposure decisions for model-bound steps
* policy-first behavior before provider network execution occurs downstream
* fail-closed handling when required capabilities, scope constraints, or budgets cannot be satisfied
* bounded delegation behavior so subagents use explicit child route profiles and budgets rather than inheriting broad head-agent defaults

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Model Access / Routing subsystem must:

* maintain routeable target metadata under explicit configuration precedence
* expose named route profiles used by runtime, agents, and delegated subagents
* translate runtime step intent into routing constraints and preference posture
* issue a context budget envelope before final context assembly when required
* compute the eligible target set as the intersection of:
  * route-profile permissions
  * policy and scope restrictions
  * capability compatibility
  * context-window and output limits
  * health and quota posture
  * budget constraints
* rank eligible targets deterministically
* emit one primary target plus a bounded fallback chain
* classify target failures into:
  * same-target retry candidates
  * cross-target failover candidates
  * terminal routing failures
* preserve routing evidence for replay and audit

---

## 8. Core Concepts

### 8.1 Model Target Profile

A model target profile is the control-plane description of one callable model endpoint.

It represents:

* provider identity
* provider account or endpoint profile
* vendor model identifier
* capability profile
* context-window limits
* timeout defaults
* pricing and latency metadata
* compliance or data-handling tags

### 8.2 Route Profile

A route profile is a named logical policy for model selection.

It defines:

* which targets are even eligible in principle
* how targets should be ranked
* how many fallbacks are allowed
* which continuity or affinity rules apply
* which budget class should be used by default

### 8.3 Routing Budget Envelope

A routing budget envelope is the pre-assembly contract that tells Context Assembly how much input and output budget is available for a step under the currently eligible model path.

### 8.4 Routing Request

A routing request is the step-level intent emitted by runtime after it knows the execution requirements for one reasoning step.

It carries:

* identity and lineage metadata
* required and optional capabilities
* token requirements
* response mode
* route profile
* budget posture
* policy-derived restrictions

### 8.5 Routing Decision

A routing decision is the replay-visible output of the subsystem.

It includes:

* the selected primary target
* ordered fallback targets
* reason codes
* budget envelope linkage
* predicted cost and latency posture
* snapshot refs needed for replay

### 8.6 Resolved Model Target

This subsystem reuses the `ResolvedModelTarget` contract consumed by the LLM Provider Abstraction layer.
Routing adds route metadata through the `RoutingDecision` rather than mutating the provider-execution contract.

---

## 9. Core Invariants

The Model Access / Routing subsystem must obey the global platform invariants.

Additional routing-specific invariants:

1. **No provider execution without an explicit route decision.**  
   Every model call must be tied to one routing decision or replay-restored prior decision.

2. **Hard constraints fail closed.**  
   Missing required capabilities, policy clearance, data-handling compatibility, or minimum context window fit must return an explicit routing error rather than degrade silently.

3. **Routing decisions are snapshot-bound.**  
   A decision must be attributable to a specific route profile, target catalog view, health input, and configuration snapshot.

4. **Fallback is ordered and bounded.**  
   The subsystem must never wander across arbitrary targets after failure. All failover must remain inside the precomputed or explicitly recomputed bounded route chain.

5. **Cost and latency never override safety or correctness.**  
   Price or latency preference may rank candidates only after capability, policy, scope, and data-handling constraints are satisfied.

6. **Route stability is preferred when requirements are unchanged.**  
   If the current run already has a compatible healthy target, routing should prefer continuity unless a stronger constraint forces change.

7. **Subagents do not inherit broad model access by default.**  
   Child runs require explicit delegated route profiles and child budgets.

8. **Routing is a decision plane, not an ungoverned egress plane.**  
   The subsystem should rely on stored capability and health metadata rather than live provider probes on the critical path.

---

## 10. Target Catalog and Route Profiles

Routing depends on explicit control-plane metadata rather than ad hoc provider guessing.

### Catalog contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ModelTargetProfile` | `targetId`, `provider`, `providerAccountId`, `modelId`, `capabilities`, `maxInputTokens`, `maxOutputTokens`, `defaultTimeout`, `pricingProfileRef` | `endpointProfile`, `region`, `latencyClass`, `complianceTags`, `requestShapingHints` | One routeable model target. |
| `RouteProfile` | `routeProfileId`, `allowedTargetRefs`, `selectionPolicy`, `fallbackPolicy`, `budgetClass` | `preferredTargetRefs`, `continuityMode`, `maxFallbacks` | Named logical model-access profile. |
| `TargetHealthSnapshot` | `snapshotId`, `targetId`, `availabilityState`, `observedAt` | `rateLimitPressure`, `errorRateBand`, `latencyBand`, `cooldownUntil` | Dynamic control-plane signal used during routing. |

### Route-profile rules

* a Head Agent may receive a configured default route profile
* a subagent must receive an explicit delegated route profile or child default, not the full parent profile automatically
* route profiles may restrict provider accounts, model families, regions, or compliance tags
* route profiles must remain immutable for replay once a routing decision has been made

---

## 11. Two-Phase Budget and Routing Contract

Context Assembly needs a token budget before it can build the final context snapshot.
Routing needs token counts before it can finalize a target.
The subsystem must therefore support a two-phase contract.

### Phase 1. Budget planning

Runtime supplies a coarse step intent.
Routing returns a budget envelope that is valid for at least one currently eligible route path.

### Phase 2. Final route resolution

After Context Assembly reports actual input-token usage and output reserve, runtime requests a final routing decision.
Routing may tighten the candidate set, but must stay within the explicit route profile and policy constraints.

### Budget-planning contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RoutingBudgetEnvelope` | `budgetEnvelopeId`, `routeProfileId`, `maxInputTokens`, `maxOutputTokens`, `candidateTargetRefs`, `requiredCapabilities` | `reservedForTools`, `preferredTargetRef` | Pre-assembly budget contract emitted by routing. |

### Budget rules

* the budget envelope must reflect the largest safe input window available under the current route constraints, not an optimistic unsupported maximum
* final route resolution must not exceed the issued envelope without creating a new envelope or new decision
* if mandatory context still does not fit, runtime may request a larger route class or fail the step
* child-context assembly must use a child budget envelope, not the parent envelope

---

## 12. Routing Request and Decision Model

### Preference posture

| Preference | Meaning |
| --- | --- |
| `low_latency` | Prioritize fast response within hard constraints. |
| `balanced` | Balance quality, cost, and latency. |
| `quality_first` | Prefer stronger target quality when budget permits. |
| `low_cost` | Prefer cheaper eligible targets. |

### Decision reason codes

The platform should standardize concise reason codes such as:

* `required_capability_fit`
* `context_window_fit`
* `route_profile_preference`
* `sticky_target_preference`
* `lower_predicted_cost`
* `lower_predicted_latency`
* `healthier_target`
* `fallback_after_rate_limit`
* `fallback_after_timeout`

### Core contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RoutingRequest` | `requestId`, `userId`, `threadId`, `runId`, `stepId`, `routeProfileId`, `responseMode`, `requiredCapabilities`, `inputTokens`, `maxOutputTokens`, `stream`, `budgetEnvelopeRef` | `collaborativeScopeId`, `executionSpaceId`, `optionalCapabilities`, `preference`, `continuityKey`, `policyDecisionRef`, `dataHandlingClass`, `attemptIndex` | Step-level request for final model target selection. |
| `RoutingDecision` | `routeDecisionId`, `requestId`, `primaryTarget`, `fallbackTargets`, `reasonCodes`, `budgetEnvelopeRef`, `selectionSnapshotRef` | `predictedCost`, `predictedLatencyMs`, `stickyUntil`, `policyDecisionRef` | Replay-visible routed execution plan. |
| `RouteAttempt` | `attemptId`, `routeDecisionId`, `attemptIndex`, `target`, `outcome` | `providerRequestId`, `providerError` | One routed execution attempt against one target. |

### Validation rules

Routing must validate:

* required identifiers are present
* `routeProfileId` resolves and is allowed in the current scope
* requested capabilities are internally consistent
* `inputTokens` and `maxOutputTokens` are non-zero where required
* the referenced budget envelope is compatible with the final request
* a policy decision ref is present when the execution path requires one

---

## 13. Eligibility and Selection Pipeline

Routing should use a deterministic hard-filter then soft-rank pipeline.

### Standard pipeline

1. Resolve route profile and effective configuration snapshot.
2. Load allowed candidate targets from the catalog.
3. Apply hard filters for:
   * policy and scope restrictions
   * provider-account or region restrictions
   * data-handling and compliance tags
   * required capabilities
   * minimum context-window and output-window fit
   * target cooldown or quarantine status
4. Apply dynamic capacity filters for quota exhaustion or severe rate-limit posture where configured.
5. Rank remaining targets using preference posture, route profile, and continuity hints.
6. Emit one primary target plus ordered fallbacks.
7. Persist candidate-filter evidence for replay and diagnostics.

### Hard versus soft criteria

| Dimension | Type | Meaning |
| --- | --- | --- |
| Capability fit | Hard filter | Required features must be supported. |
| Context-window fit | Hard filter | Input plus output budget must fit. |
| Policy and scope fit | Hard filter | Target must be allowed in the current scope. |
| Data-handling fit | Hard filter | Residency, compliance, or classification constraints must match. |
| Target quarantine | Hard filter | Unhealthy targets may be removed entirely. |
| Cost posture | Soft rank | Used only after hard filters pass. |
| Latency posture | Soft rank | Used only after hard filters pass. |
| Continuity preference | Soft rank | May prefer an already successful target. |
| Provider diversity for fallbacks | Soft rank | Prefer reducing correlated failure where possible. |

### Determinism rules

* ranking tie-breakers must be stable and explicit
* routing should prefer explicit route-profile order before arbitrary derived scoring
* when scores are equivalent, the subsystem should use stable target identity ordering rather than non-deterministic iteration order

---

## 14. Route Stability and Affinity

Routing should preserve execution coherence when safe.

### Stability rules

* if a run already used a healthy compatible target and requirements are unchanged, routing should prefer that target
* continuity preference must never override capability, policy, or budget failures
* thread-level affinity, if used, must be weaker than run-level affinity
* affinity must not cross collaborative scopes or execution spaces

### Affinity modes

| Mode | Meaning |
| --- | --- |
| `none` | No continuity preference. |
| `prefer_sticky` | Prefer the prior compatible target when still eligible. |
| `require_sticky` | Use the prior target or fail explicitly if it is no longer eligible. |

---

## 15. Fallback, Retries, and Failover

The subsystem must distinguish provider retries from routing failover.

### Boundary with provider abstraction

* same-target transport retries belong to the LLM Provider Abstraction layer
* cross-target failover belongs to Model Access / Routing
* runtime remains the owner of the overall reasoning step and decides whether another attempt is still worthwhile

### Route-actionable failure handling

| Provider error class | Default routing action |
| --- | --- |
| `rate_limit` | Advance to next fallback target when available. |
| `timeout` | Allow bounded same-target retry first if configured, otherwise advance. |
| `provider_unavailable` | Advance to next fallback target. |
| `authentication` | Quarantine current target/account path and fail over only if another allowed target exists. |
| `authorization` | Treat as terminal for that target path; fail over only if a different allowed path exists. |
| `malformed_response` | Mark target unhealthy for the step and optionally fail over once. |
| `unsupported_feature` | Treat as routing/catalog drift error and fail closed unless a separate eligible target clearly satisfies the request. |
| `invalid_request` | Terminal; do not fail over blindly. |
| `canceled` | Terminal unless runtime explicitly reissues a new request. |

### Failover rules

* the number of cross-target failovers must be bounded by route profile or run-level policy
* each failover attempt must remain within the original or explicitly refreshed budget posture
* the subsystem should avoid revisiting the same failed target during one step unless policy or route profile explicitly allows cooled-down reuse
* when fallbacks are exhausted, routing must return a terminal error with attempt evidence

---

## 16. Budget, Quota, and Cost Posture

Routing owns predicted budget fit, not authoritative billing.

### Budget posture contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RouteBudgetPosture` | `maxInputTokens`, `maxOutputTokens`, `maxPredictedCost`, `maxAttempts` | `maxLatencyMs`, `retryBudget` | Route-level budget posture used for selection and failover bounds. |

### Budget rules

* predicted cost should be based on current token estimates plus target pricing profiles
* actual provider-reported usage and cost remain authoritative in observability records
* routing may choose a more expensive target only when cheaper targets fail hard constraints or configured preference posture allows it
* if no eligible target fits the budget envelope, the subsystem must return an explicit routing error rather than overrun the budget silently
* child-run model budgets must be explicit subsets of parent-delegated budgets

---

## 17. Error Model

Routing failures must be classified in a way runtime can act on safely.

### Error codes

| Error code | Meaning |
| --- | --- |
| `route_input_invalid` | The routing request is structurally or semantically invalid. |
| `route_profile_missing` | The requested route profile does not exist or is not accessible. |
| `no_eligible_target` | No target satisfies the hard constraints. |
| `budget_blocked` | No target fits the required context or cost envelope. |
| `policy_blocked` | Policy or scope restrictions block all candidate targets. |
| `fallback_exhausted` | All allowed fallback attempts were consumed. |
| `routing_snapshot_missing` | Replay-required routing snapshot data is unavailable. |
| `catalog_inconsistent` | Catalog metadata and observed provider capabilities disagree materially. |

### Error contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RoutingError` | `code`, `message`, `retryable` | `routeDecisionRef`, `candidateSummaryRef` | Normalized routing failure returned to runtime. |

### Error rules

* retryability must be explicit
* `route_input_invalid`, `route_profile_missing`, and `catalog_inconsistent` should fail closed
* `no_eligible_target` and `budget_blocked` are terminal for the current request unless runtime changes the route profile or budget posture
* `fallback_exhausted` may be retryable only if runtime obtains a refreshed route decision under a new snapshot

---

## 18. Observability and Replay

Routing is part of the authoritative replay chain for model execution.

### Required trace fields

* `requestId`
* `userId`
* `threadId`
* `runId`
* `stepId`
* `collaborativeScopeId` when applicable
* `executionSpaceId` when applicable
* `routeProfileId`
* required capabilities
* input-token and output-token posture
* selected primary target and fallback targets
* filtered candidate counts and rejection reason counts
* preference posture
* policy decision ref when present
* configuration snapshot ref
* target health snapshot refs
* route attempt outcomes
* predicted cost and latency

### Replay rules

* historical replay should prefer the stored `RoutingDecision` instead of recomputing a fresh route from current live conditions
* if a replay mode intentionally recomputes routing under current conditions, it must be marked as best-effort rather than authoritative
* dynamic inputs such as health or cooldown state must be reference-addressable if they influenced the original decision materially
* each failover attempt must remain visible in replay order

---

## 19. Security, Data Handling, and Access Boundaries

Routing decisions may determine which provider account, region, or compliance posture is used.
That makes the subsystem a sensitive access-control boundary even though it does not hold credentials.

### Rules

* provider-account selection must remain explicit and traceable
* route profiles may constrain allowed regions, compliance tags, or data-handling classes
* routing must not expose credential material in decisions, diagnostics, or replay artifacts
* data-handling restrictions must be applied as hard filters, not soft preferences
* routing decisions must not widen scope access beyond what policy and execution context already allow

---

## 20. Configuration Direction

Routing must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `defaultRouteProfile` | default route profile for an agent or channel | string | agent-defined | agent or channel |
| `targetAllowlist` | restrict routeable targets | list | profile-defined | system or collaborative scope |
| `providerDenylist` | prohibit specific providers or accounts | list | empty | system or collaborative scope |
| `maxCrossTargetFallbacks` | bound failover count per step | integer | conservative | system or agent |
| `defaultAffinityMode` | continuity preference for repeated steps | string | `prefer_sticky` | agent |
| `maxPredictedModelCost` | limit estimated cost per step | numeric | policy-controlled | collaborative scope, user, or run |
| `preferredRegions` | constrain routing to approved regions | list | profile-defined | collaborative scope |
| `healthQuarantineWindow` | cooldown period after severe target failure | duration | conservative | system |

### Configuration rules

* all routing configuration must declare scope explicitly
* effective route profile, allowlists, deny lists, and cost posture must be replay-visible
* lower-precedence overrides must not widen access beyond higher-precedence restrictions
* run-level overrides may narrow routing choices but must not silently authorize premium or restricted targets that upstream config disallows

---

## 21. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `PlanBudget` | Produce a pre-assembly budget envelope for a model-bound step. | step intent + route profile | `RoutingBudgetEnvelope` |
| `ResolveRoute` | Resolve a final primary target and fallback chain after context sizing is known. | `RoutingRequest` | `RoutingDecision` |
| `AdvanceRoute` | Choose the next eligible target after a route-actionable failure. | prior `RoutingDecision` + failure record | next target or `RoutingError` |
| `ExplainRoute` | Return replay/audit diagnostics for one routing decision. | `routeDecisionId` | route explanation artifact |

### Behavioral expectations

* `PlanBudget` should return enough information for Context Assembly to build a bounded snapshot without guessing model limits
* `ResolveRoute` should return one ordered execution plan, not an unbounded candidate list
* `AdvanceRoute` should preserve route lineage and attempt numbering
* `ExplainRoute` should be suitable for replay, audit, and operator debugging without requiring access to provider credentials

---

## 22. Downstream and Peer Dependencies

### Upstream dependencies

* Agent Runtime
* Context Assembly
* configuration service or equivalent control-plane store
* policy-derived route restrictions
* target catalog, pricing metadata, and health inputs

### Downstream and peer dependencies

* LLM Provider Abstraction
* Observability, Replay, and Cost Control
* Policy and Approval System
* Tool Execution Framework through tool-capability requirements only

### Explicit boundary with runtime

Runtime may:

* define the step intent
* choose the route profile or allow delegated overrides
* decide whether another attempt is worth making after failure
* own step lifecycle, checkpoints, and final response behavior

Routing may:

* plan the budget envelope
* choose the primary target and fallback chain
* classify route-actionable failures
* preserve route evidence and continuity hints

### Explicit boundary with provider abstraction

Routing may:

* choose which target should be called
* decide which fallback target is next
* enforce capability-fit and access-fit constraints before execution

The provider abstraction may:

* validate the chosen target against the concrete request
* execute the chosen target
* perform bounded same-target transport retries where safe
* return normalized result or normalized provider error

The provider abstraction must not silently choose a different target on its own.

---

## 23. Tradeoffs and Design Decisions

### Decision: separate routing from provider execution

**Why:** keeps target-choice policy distinct from vendor-call mechanics
**Alternative:** let provider adapters choose models internally
**Consequence:** more control-plane surface, much clearer architecture and replay

### Decision: use a two-phase budget contract

**Why:** avoids a circular dependency between context assembly and final target selection
**Alternative:** guess one static global context limit
**Consequence:** slightly more coordination, much safer budget behavior

### Decision: capability, policy, and data handling are hard filters

**Why:** prevents unsafe cost- or latency-driven downgrades
**Alternative:** best-effort fallback to weaker targets
**Consequence:** more explicit failures, much stronger guarantees

### Decision: same-target retries stay below routing; cross-target failover stays in routing

**Why:** preserves a clean boundary between transport resilience and target selection
**Alternative:** let either layer do both
**Consequence:** easier reasoning about retries, failovers, and replay

### Decision: prefer route continuity when requirements are unchanged

**Why:** improves behavioral coherence across multi-step runs
**Alternative:** reroute every step independently for pure local optimality
**Consequence:** slightly less opportunistic switching, better conversational stability

---

## 24. Final Position

The platform should treat Model Access / Routing as a first-class Layer 2 subsystem that sits between runtime intent and provider execution.

Its authoritative contract is:

* accept step-level execution intent and route profile constraints
* issue a context budget envelope when needed
* resolve one primary `ResolvedModelTarget` plus bounded fallbacks
* classify route-actionable failures and advance through the fallback chain when allowed
* preserve replay-grade routing evidence and decision reasons

This subsystem should remain separate from:

* provider SDK execution
* prompt construction
* tool authorization
* policy authoring
* runtime step ownership

That separation closes the current architecture gap between runtime orchestration and provider abstraction while keeping model access explicit, auditable, and provider-neutral.
