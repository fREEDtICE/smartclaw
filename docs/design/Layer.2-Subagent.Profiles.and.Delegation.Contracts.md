# Frame AI Agent Platform — Layer 2

## Subagent Profiles and Delegation Contracts

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Document Type:** Supporting reference document
**Subsystem / Reference Name:** Subagent Profiles and Delegation Contracts
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Platform Runtime Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Model Access / Routing Design
* Tool Execution Framework Design
* Internal Tool Catalog and Default Tool Profiles
* Skills System Design
* Policy and Approval System Design
* Observability, Replay, and Cost Control Design

---

## 2. Purpose

This document defines the **runtime-owned delegation contract and the named profile system used to create bounded subagents safely**.

It exists because subagent spawning is not just another tool call.
The platform needs one supporting reference that defines:

* how a parent run describes delegated work
* which bounded child profiles may be used
* how child tool and route profiles are delegated
* how child budgets, limits, and context inheritance are declared
* how child results are returned and merged
* how delegation remains replayable and policy-compatible

This document is a **delegation control-plane reference**.
The Agent Runtime still owns live orchestration and child-run lifecycle.
This reference defines the contracts and named profiles the runtime should use.

---

## 3. Scope

### In Scope

This document is the source of truth for:

* the distinction between subagent delegation and ordinary tool use
* the canonical delegation request and response contracts
* named subagent delegation profiles
* child capability delegation rules
* child budget and limit contracts
* child result merge contracts
* replay-visible delegation snapshot requirements

### Out of Scope

This document does **not** own:

* the main reasoning loop
* provider SDK execution
* tool execution logic
* skill package lifecycle
* policy authoring or approval UX
* sandbox implementation internals
* implementation-language APIs

This reference defines **what a bounded child-run delegation means**.
The Agent Runtime decides **when to delegate and executes the lifecycle**.

---

## 4. Architectural Role

Subagent delegation is a runtime action that composes child context, child model access, child tool access, and result merge under one bounded contract.

```text
Agent Runtime
  -> reasoning step emits `spawn_subagent`
  -> resolve DelegationProfile + task contract
  -> apply policy and approval when needed
  -> assemble bounded child context
  -> delegate child tool profile + child route profile + budgets
  -> create child run
  -> wait / join / merge child result
```

### Upstream inputs

* parent reasoning-step decision
* parent run identity and scope lineage
* delegated task objective and success criteria
* delegated child tool profile refs
* delegated child route profile ref
* parent-selected or default delegation profile
* policy decision refs and approval outcomes where required
* bounded context refs from Context Assembly

### Downstream consumers

* Agent Runtime
* Context Assembly for child context packs
* Model Access / Routing for child route profiles and child budgets
* Tool Execution Framework for child tool profile resolution
* Policy and Approval System for delegation governance
* Observability, Replay, and Cost Control for subagent lineage and replay evidence

---

## 5. Goals and Non-Goals

### Goals

This reference must optimize for:

* bounded, explicit delegation
* clean separation between delegation and ordinary tool execution
* reusable named child-run profiles
* safe child capability narrowing
* predictable result merge behavior
* replayable parent-child lineage and configuration
* compatibility with runtime, policy, tool, and routing contracts

### Non-Goals

This reference is not trying to optimize for:

* turning subagent spawn into a generic tool call
* allowing children to inherit the full parent capability surface
* replacing runtime orchestration with profile-only behavior
* hiding delegation semantics in ad hoc prompt text
* letting child runs write directly to the final user response channel

---

## 6. Cross-Layer Contract Coverage

This document implements the supporting reference implied by the Layer 1.5 Subagent Contract and the Layer 2 runtime design.

### From Layer 1

This reference must support:

* bounded delegation as an explicit platform capability
* narrower child context and tool boundaries for complex separable work
* traceable and governed child execution paths

### From Layer 1.5

This reference must implement:

* explicit task bounds and success criteria
* inherited identity and scope lineage
* restricted child tools/capabilities and budget
* bounded child context initialization
* explicit limits for timeout, depth, fanout, and token budget
* structured child results with provenance and unresolved issues
* the rule that children do not inherit the full Head Agent default tool pack automatically

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

This reference must:

* define the canonical delegation request model
* define named delegation profiles and their default attachments
* define how child tool profiles and route profiles are delegated
* define child limits and budget contracts
* define child context inheritance modes
* define child result merge contracts
* define replay-visible delegation snapshots and refs

---

## 8. Core Invariants

This reference must obey the platform invariants.

Additional delegation-specific invariants:

1. **Delegation is a runtime action, not a normal tool.**  
   A child run must be created through runtime orchestration, not by executing a built-in tool from the internal tool catalog.

2. **Every child run must have an explicit contract.**  
   The runtime must not spawn an unbounded or underspecified child.

3. **Child capabilities are delegated, not inherited wholesale.**  
   Child tool access and model access must come from explicit delegated refs, profiles, or narrowed subsets.

4. **Children are bounded by default.**  
   Timeout, token budget, loop count, depth, and fanout must all be explicit or resolved from a named profile.

5. **The parent remains the source of truth for the final user response.**  
   A child may return structured results, but must not publish directly to the final user channel.

6. **Profile defaults must narrow, not widen.**  
   A default child profile may simplify configuration, but must not be broader than the explicit delegation posture intended by runtime.

7. **Delegation snapshots must be replayable.**  
   Historical child creation must be reconstructable from stored profile refs, task contracts, and bounded context refs.

---

## 9. Delegation Is Not a Tool

This reference makes the boundary explicit:

* ordinary tools perform one typed capability execution
* skills package reusable capability bundles
* subagent delegation creates a new bounded child run with its own context, budget, and capability surface

### Rules

* subagent creation must appear in runtime as a `spawn_subagent` decision class, not as a normal tool request
* `task` is not a built-in tool id in the Internal Tool Catalog
* child-run creation may use named delegation profiles, but those profiles are runtime-owned control-plane objects, not ordinary tool profiles
* skills may propose delegation, but must not create child runs outside runtime orchestration

---

## 10. Core Contract Model

### Core contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `DelegationProfileRef` | `delegationProfileId`, `version` | None | Points to one immutable delegation profile version. |
| `SubagentTaskContract` | `objective`, `successCriteria` | `completionHints`, `acceptanceSchema`, `priority` | Defines the delegated task itself. |
| `DelegationBudget` | `maxInputTokens`, `maxOutputTokens`, `maxLoopCount`, `timeoutMs`, `maxDepth`, `maxFanout` | `maxPredictedCost`, `maxAttempts` | Bounded child-run budget and limit contract. |
| `ChildCapabilityEnvelope` | `routeProfileRef` | `toolProfileRefs`, `explicitToolRefs`, `allowedSkillRefs`, `executionMode` | Declares child capability sources. At least one of `toolProfileRefs` or `explicitToolRefs` must be present. |
| `ChildContextInheritance` | `inheritanceMode`, `summaryRef`, `evidenceRefs` | `memoryRefs`, `ragRefs`, `exclusionRules` | Declares what parent context crosses the boundary. |
| `MergeContract` | `resultMode`, `requiredProvenance` | `resultSchema`, `allowParentReplan` | Declares how the parent consumes child output. |
| `SubagentRequest` | `requestId`, `parentRunId`, `parentStepId`, `taskContract`, `budget`, `capabilities`, `contextInheritance`, `mergeContract` | `delegationProfileRef`, `policyDecisionRef`, `approvalRef`, `collaborativeScopeId`, `executionSpaceId` | Canonical runtime-owned child creation request. |
| `SubagentResult` | `childRunId`, `status`, `resultArtifactRef`, `provenanceRefs`, `unresolvedIssues` | `budgetUsed`, `toolUsageRefs`, `modelUsageRefs`, `failureInfo` | Structured child return artifact. |

---

## 11. Delegation Profile Model

Named delegation profiles keep child-run defaults explicit, replayable, and bounded.

### Delegation profile contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `DelegationProfile` | `delegationProfileId`, `version`, `childToolProfileRefs`, `childRouteProfileRef`, `defaultBudget`, `defaultMergeContract`, `defaultInheritanceMode`, `defaultEnable` | `notes`, `intendedUse`, `defaultApprovalMode` | Immutable named child-run profile. |

### Profile rules

* a delegation profile may reference one or more child tool profiles, but those tool profiles remain owned by the Internal Tool Catalog and Default Tool Profiles document
* a delegation profile may reference exactly one child route profile for the default path, though runtime may still narrow or deny it
* a delegation profile must not imply automatic inheritance of parent tools or parent route profile
* profile changes require a new version
* profile resolution must be replay-visible

---

## 12. Initial Delegation Profiles

The platform should publish the following initial delegation profile set.
All versions below are written as `v1`.

| Delegation profile id | Version | `defaultEnable` | Intended use | Child tool profile refs | Child route profile ref | Default inheritance mode | Default merge mode |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `delegation.analysis.default` | `v1` | `true` | Bounded review, analysis, summarization, and evidence gathering. | `platform.subagent.analysis@v1` | `route.subagent.analysis.default@v1` | `summary_plus_evidence` | `structured_result_required` |
| `delegation.exec.limited` | `v1` | `false` | Bounded code, file, and process execution work with explicit limits. | `platform.subagent.exec.limited@v1` | `route.subagent.exec.limited@v1` | `summary_plus_evidence` | `structured_result_required` |
| `delegation.research.fetch` | `v1` | `false` | Bounded research and retrieval tasks that need approved network fetch capability. | `platform.research.fetch@v1` | `route.subagent.research.fetch@v1` | `summary_plus_evidence` | `structured_result_required` |

### Initial profile rules

* `delegation.analysis.default` is the only automatic general-purpose child default in this initial set
* `delegation.exec.limited` and `delegation.research.fetch` are opt-in only
* no child run receives `platform.head.default` directly through a delegation profile
* route profile refs shown above must resolve through the Model Access / Routing source of truth

---

## 13. Context Inheritance Modes

Child context must be explicit and bounded.

### Inheritance modes

| Mode | Meaning |
| --- | --- |
| `summary_only` | Child receives a bounded parent summary plus task contract, but not raw evidence blocks by default. |
| `summary_plus_evidence` | Child receives a bounded summary plus explicitly selected evidence refs. |
| `explicit_pack_only` | Child receives only the exact handoff pack built for the task; no implicit inheritance beyond identity and scope lineage. |

### Inheritance rules

* the full parent scratchpad must be excluded by default
* unrelated memory or RAG blocks must be excluded by default
* child context must include delegated objective, success criteria, and limits
* inheritance mode may narrow parent-supplied information, but must not widen it beyond the current scope

---

## 14. Merge Contracts

The parent remains responsible for accepting and synthesizing child results.

### Merge modes

| Merge mode | Meaning |
| --- | --- |
| `structured_result_required` | Child must return a structured result artifact that the parent validates before merge. |
| `summary_with_refs` | Child may return a bounded summary plus provenance refs. |
| `result_or_replan` | Parent may either accept the child result or treat it as evidence for replanning. |

### Merge rules

* child output must always include provenance refs
* unresolved issues must be surfaced explicitly
* child output must not bypass parent acceptance logic
* a child may propose follow-up delegation, but the parent runtime must decide whether to create another child

---

## 15. Creation Preconditions and Validation

Before runtime creates a child run, the delegation request must satisfy all of the following:

* `taskContract` is explicit and bounded
* `successCriteria` are present
* `budget` is present, either directly or through resolved profile defaults
* child tool profile refs or explicit tool refs are present
* child route profile ref is present
* context inheritance mode is present
* merge contract is present
* policy has run for the spawn request before child creation proceeds

### Validation rules

* missing child tool profile refs or route profile ref should fail closed
* child profile resolution must use immutable versions
* runtime may narrow delegated tools, budgets, or inheritance further, but must not silently broaden them
* if any requested child capability would exceed parent-allowed limits, the delegation request must be rejected or require explicit approval

---

## 16. Policy and Approval Boundary

Delegation is governance-sensitive because it may widen surface area or create parallel execution branches.

### Rules

* policy must evaluate every subagent spawn request
* same-scope and same-capability delegation may auto-allow under policy, but it must still pass through the policy path
* delegation approval must bind to the delegated task contract, child capability envelope, and budget
* child runs must inherit relevant policy and scope lineage from the parent
* approval of child creation does not remove downstream policy requirements for child tool execution, memory writes, or further delegation

---

## 17. Child Capability Delegation Rules

Child capabilities must be explicit and narrow.

### Tool delegation rules

* child tool access must come from explicit delegated tool refs or delegated child tool profiles
* the child tool set must be a subset of what the parent is allowed to delegate
* the full Head Agent default internal profile must never be inherited automatically

### Route delegation rules

* child model access must come from an explicit child route profile ref
* the child route profile must be compatible with parent policy and budget posture
* child route profiles may be narrower than the parent route profile, but must not be silently broader

### Skill delegation rules

* a child run may receive explicitly allowed skill refs only if such delegation is permitted by runtime and policy
* skill-contributed tools remain subject to the same delegated child tool boundary

---

## 18. Limits and Failure Handling

Delegation must remain bounded even when children fail or stall.

### Required limits

* `maxLoopCount`
* `maxInputTokens`
* `maxOutputTokens`
* `timeoutMs`
* `maxDepth`
* `maxFanout`

### Failure rules

* if child creation fails before the child run starts, the parent step remains responsible for replanning or failure
* if the child run fails after start, the parent receives a `SubagentResult` with failure metadata
* if child depth or fanout limits would be exceeded, runtime must hard-stop further delegation
* a child timeout must not silently become an unbounded background task

---

## 19. Observability and Replay

Delegation is a first-class replay boundary.

### Required replay fields

For each child creation and join path, the platform should preserve:

* `parentRunId`
* `parentStepId`
* `childRunId`
* `delegationProfileId`
* `delegationProfileVersion`
* `taskContract`
* `childToolProfileRefs`
* `childRouteProfileRef`
* `budget`
* `contextInheritance`
* `mergeContract`
* policy decision refs and approval refs when present
* child result artifact refs

### Replay rules

* historical replay should reconstruct child creation from stored delegation refs instead of current live profile state
* if a run used `delegation.analysis.default@v1`, replay must not silently substitute a later profile version
* child-creation failure and child-join failure must remain visible in replay order

---

## 20. Configuration Direction

Delegation profile resolution must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override level |
| --- | --- | --- | --- | --- |
| `defaultChildDelegationProfileRef` | default child delegation profile for general bounded delegation | delegation profile ref | `delegation.analysis.default@v1` | system or agent |
| `disabledDelegationProfiles` | block specific delegation profiles | list | empty | collaborative scope, agent, or run |
| `maxDelegationDepth` | global depth limit across nested child runs | integer | conservative | system or agent |
| `maxDelegationFanout` | global fanout limit from one parent step | integer | conservative | system or agent |
| `requireDelegationApprovalAboveRisk` | threshold for approval on child creation | string | policy-controlled | collaborative scope or agent |

### Configuration rules

* lower-precedence configuration must not widen child capabilities beyond higher-precedence restrictions
* run-level overrides may narrow delegation profile choice or budgets, but must not silently widen them
* disabling a profile must not break historical replay

---

## 21. Contract Sketch

This section defines the language-neutral control-plane contract implied by this reference. Exact Go interfaces, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `GetDelegationProfile` | Return one immutable delegation profile definition. | `delegationProfileId`, `version` | `DelegationProfile` |
| `ResolveDelegationDefaults` | Resolve a child request by applying profile defaults and config constraints. | partial `SubagentRequest` + config context | normalized `SubagentRequest` |
| `ExplainDelegationProfile` | Explain profile intent, child capability refs, and default limits. | `delegationProfileId`, `version` | explanation artifact |

### Behavioral expectations

* resolved delegation requests must be deterministic for a fixed profile version and config snapshot
* resolution should be cheap enough for runtime-adjacent use and therefore cacheable by immutable version
* live orchestration still belongs to Agent Runtime even if profile lookup is implemented as a separate control-plane read

---

## 22. Tradeoffs and Design Decisions

### Decision: keep subagent creation outside the ordinary tool catalog

**Why:** child-run creation is a runtime lifecycle action, not one more executable capability
**Alternative:** model delegation as a normal built-in tool
**Consequence:** clearer lifecycle, better replay, cleaner governance

### Decision: use named delegation profiles

**Why:** repeated child-run patterns need reusable, replayable defaults
**Alternative:** make every child request fully ad hoc
**Consequence:** less duplication, stronger safety defaults

### Decision: separate child tool profiles from delegation profiles

**Why:** tool bundles and child-run contracts are related but not the same object
**Alternative:** collapse both into one profile type
**Consequence:** more references, much cleaner ownership boundaries

### Decision: require explicit child route profiles

**Why:** child model access should be narrowed intentionally, not inherited implicitly
**Alternative:** let children reuse the full parent route profile by default
**Consequence:** more configuration, much safer delegation behavior

---

## 23. Final Position

The platform should treat `Subagent Profiles and Delegation Contracts` as the authoritative Layer 2 supporting reference for bounded child-run creation.

Its authoritative role is:

* define subagent delegation as a runtime action rather than a normal tool
* define the canonical delegation request, budget, inheritance, and merge contracts
* define named child delegation profiles and their default child tool and route bindings
* preserve replay-grade parent-child delegation evidence

This document does not replace runtime orchestration.
It gives runtime, routing, tools, skills, policy, and replay one shared contract for how bounded subagent creation should work.
