# SmartClaw Agent Platform — Layer 2

## Team and Collaboration System Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Team and Collaboration System  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Shared Context and Governance Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Identity and Thread Management
* Context Assembly Subsystem Design
* Memory System Design
* RAG Infrastructure Design
* Skills System Design
* Internal Tool Catalog and Default Tool Profiles
* Policy and Approval System Design
* Observability, Replay, and Cost Control Design
* Channel Gateway

---

## 2. Purpose

The Team and Collaboration System is the platform subsystem that turns the abstract Layer 1 concept of **Collaborative Scope** into a governed, replayable control plane for shared context.

It exists because team and application collaboration is more than membership lookup.
The platform must support:

* explicit team, application, and group scope definitions
* governed membership and role lifecycle
* shared settings and policy bindings at collaborative-scope level
* shared capability visibility by reference rather than ad hoc copying
* auditable scope attachment for inbound and internal workflows
* historical replay of scope, membership, and binding state used by past runs

The subsystem owns:

* collaborative-scope registry and lifecycle
* membership, role, invitation, and revocation state
* scope attachment bindings for channel, application, or tenant boundaries
* scope-level resource and configuration bindings
* audit history for scope and membership changes

This subsystem does **not** own live user identity resolution, thread resolution, policy evaluation, memory storage, retrieval serving, tool execution, or skill execution.
It defines the shared collaboration boundary that those subsystems read and enforce.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Team and Collaboration System is responsible for:

* defining the canonical `CollaborativeScope` model for team, application, and group collaboration
* creating, updating, suspending, and archiving collaborative scopes
* managing membership, role, invite, join, leave, and revocation lifecycle
* managing scope bindings to channel or application boundaries used during scope attachment
* maintaining versioned refs to scope-level policy, capability, and configuration bindings
* exposing scope attachment and membership lookups to upstream and downstream subsystems
* preserving replay-visible history for scope lifecycle, membership lifecycle, and binding changes
* emitting structured events for audit, observability, and debugging

### Out of Scope

The Team and Collaboration System does **not** own:

* canonical user resolution across channels
* thread/session lifecycle
* live policy evaluation or approval workflow
* memory persistence or retrieval ranking
* live skill, tool, or model execution
* sandbox or execution-space allocation
* business-specific organization-directory UX
* cross-scope data access approval semantics

This subsystem owns the shared collaboration graph and shared-scope bindings.
Other subsystems consume that graph to enforce behavior on the live path.

---

## 4. Architectural Role

The subsystem sits on the control plane between identity and scope attachment, and the downstream subsystems that need shared context at collaborative-scope level.

```text
Operator / admin workflows
Channel or app-boundary mappings
Policy / capability / config refs
  -> Team and Collaboration System
       -> resolve collaborative scope
       -> validate membership and role state
       -> return scope attachment and shared binding refs
       -> persist lifecycle and audit history
  -> Identity and Thread Management
  -> Context Assembly
  -> Policy and Approval
  -> Memory / RAG / Skills / Tool-profile resolution
  -> Observability / Replay
```

### Upstream inputs

* canonical user refs and identity outcomes from Identity and Thread Management
* operator or administrative scope-management actions
* channel, tenant, or application boundary identifiers
* policy refs, agent refs, skill refs, retrieval-source refs, and tool-profile refs
* lifecycle configuration for roles, invites, and binding governance

### Downstream outputs

* scope attachment results
* membership and role lookups
* scope-level configuration and resource binding refs
* scope lifecycle records
* audit and observability events

### Primary consumers

* Identity and Thread Management
* Context Assembly
* Policy and Approval System
* Memory System
* RAG Infrastructure
* Skills System
* Internal Tool Catalog and Default Tool Profiles
* Observability, Replay, and Cost Control

---

## 5. Goals and Non-Goals

### Goals

The Team and Collaboration System must optimize for:

* explicit and auditable shared-context boundaries
* clean separation between user identity, thread state, collaborative scope, and execution space
* predictable scope attachment and membership lookup
* stable shared bindings for policies, capabilities, and configuration refs
* replay-grade historical visibility into scope and membership state
* safe multi-tenant and multi-team isolation
* collaboration support for both human teams and application-scoped products

### Non-Goals

The Team and Collaboration System is not trying to optimize for:

* becoming the universal identity provider
* inferring collaboration state from ambiguous thread history
* replacing downstream policy decisions with membership checks alone
* copying policy, memory, retrieval, or skill content into its own store
* silently widening scope access through lower-precedence configuration
* treating execution-space isolation as a collaboration concern

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the collaboration-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The subsystem must support:

* team and application collaboration as a first-class platform capability
* the canonical `Collaborative Scope` abstraction for shared team, application, or group context
* association of users with collaborative scopes where applicable
* clear separation between collaborative scope and execution space
* shared memory, settings, policies, and capabilities through explicit collaboration boundaries

### From Layer 1.5

The subsystem must implement:

* identity and scope propagation support for downstream run creation and execution
* no cross-scope data access without policy approval
* predictable configuration precedence with collaborative scope as one explicit level
* replay and observability requirements for meaningful scope and membership changes
* explicit traceability of scope lineage used by runtime, memory, policy, and capability resolution

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Team and Collaboration System must:

* register collaborative scopes under stable ids and explicit scope types
* preserve lifecycle state for scopes, memberships, invites, and bindings
* validate whether one user is an active member of one collaborative scope
* return role and membership state without redefining downstream policy decisions
* bind collaborative scopes to channel, tenant, or application boundaries where allowed
* maintain scope-level bindings to policies, agents, skills, retrieval sources, tool profiles, and other shared refs
* provide immutable or snapshot-addressable views for replay and historical inspection
* emit change records for scope creation, suspension, archive, membership changes, and binding changes
* support suspension or disablement without deleting history needed for audit and replay

---

## 8. Core Invariants

The Team and Collaboration System must obey the global platform invariants.

Additional collaboration-specific invariants:

1. **Collaborative scope is explicit.**  
   A user, thread, or inbound event must not gain collaborative-scope attachment merely by implication or historical coincidence.

2. **Membership is not equivalent to authorization.**  
   Active membership may make a scope attachable, but downstream policy still decides whether access or mutation is allowed.

3. **Collaborative Scope and Execution Space remain distinct.**  
   Shared context and access boundaries must not be conflated with isolated runtime execution boundaries.

4. **Scope-level bindings use references, not copies.**  
   Policies, skills, tool profiles, and retrieval sources attached to a scope must be referenced by immutable or versioned refs where possible.

5. **Historical scope state remains replay-readable.**  
   Past runs must be able to resolve the scope, membership, and binding snapshot that applied at the time.

6. **Suspension blocks new use without erasing history.**  
   A suspended or archived scope may stop new attachment or binding resolution, but historical records must remain available for audit and replay.

7. **Cross-scope collaboration must be explicit.**  
   Being a member of multiple scopes does not implicitly create a bridge between them.

8. **Attachment and membership changes are auditable.**  
   Scope creation, invite, join, leave, revoke, bind, unbind, suspend, and archive actions must emit durable change records.

---

## 9. Collaborative Scope Domain Model

Layer 1 defines `Collaborative Scope` as the shared team, application, or group context for memory, settings, policies, and shared capabilities.
This subsystem turns that concept into a stable control-plane model.

### 9.1 Core entities

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `CollaborativeScope` | `collaborativeScopeId`, `scopeType`, `displayName`, `lifecycleState`, `createdAt`, `updatedAt` | `parentScopeId`, `description`, `metadataRef` | `scopeType` uses `team`, `application`, or `group`. `lifecycleState` uses `draft`, `active`, `suspended`, or `archived`. |
| `CollaborativeScopeMembership` | `membershipId`, `collaborativeScopeId`, `userId`, `role`, `membershipState`, `createdAt`, `updatedAt` | `invitedByUserId`, `acceptedAt`, `revokedAt`, `reasonCodes` | `membershipState` uses `invited`, `active`, `left`, `revoked`, `expired`, or `rejected`. |
| `ScopeAttachmentBinding` | `bindingId`, `collaborativeScopeId`, `bindingType`, `bindingKey`, `bindingState`, `createdAt`, `updatedAt` | `provider`, `channelType`, `notes` | Used for explicit channel, tenant, application, or provider-bound attachment rules. |
| `ScopeResourceBinding` | `bindingId`, `collaborativeScopeId`, `resourceKind`, `resourceRef`, `bindingState`, `createdAt`, `updatedAt` | `priority`, `configRef`, `notes` | Shared-scope reference to one external artifact or binding. |
| `ScopeChangeRecord` | `changeId`, `collaborativeScopeId`, `changeType`, `actorRef`, `createdAt`, `snapshotRef` | `reasonCodes`, `approvalRefs` | Immutable audit record for scope, membership, or binding changes. |

### 9.2 Scope-type semantics

Representative scope types:

* `team`: shared human-collaboration boundary such as an internal team or customer workspace
* `application`: shared context for a product, tenant, or deployed agent application
* `group`: smaller or temporary subset for bounded collaboration, project work, or controlled shared context

Rules:

* the same system may host multiple scope types simultaneously
* downstream subsystems may specialize behavior by scope type, but must not reinterpret scope ids as different object kinds
* a scope id must remain stable even if display metadata changes

---

## 10. Membership, Roles, and Invitations

Membership controls who may participate in or be attached to a collaborative scope.
It does not replace policy.

### 10.1 Role model

Representative roles:

* `owner`
* `admin`
* `member`
* `viewer`

Role semantics should remain collaboration-oriented.
They should not silently imply unrestricted tool, memory, or policy permissions.

### 10.2 Membership rules

* only `active` membership may normally authorize automatic scope attachment
* `invited` membership may support join workflows but must not be treated as active access
* `left`, `revoked`, `expired`, or `rejected` states must not behave as active membership
* membership changes must preserve timestamps and actor provenance
* role changes must create new change records rather than mutating history invisibly

### 10.3 Invitation and join posture

The subsystem should support invitation-driven collaboration without forcing every channel interaction to create or accept membership.

Rules:

* invitations must bind to a target scope and invited user identity or approved join token
* acceptance must create or activate membership explicitly
* expiry and revocation must be distinct from rejection or leave events

---

## 11. Scope Attachment and Binding Resolution

One of the main reasons this subsystem exists is to make collaborative-scope attachment deterministic and auditable.

### 11.1 Attachment inputs

Scope attachment may consider:

* resolved `userId`
* provider workspace or tenant identifiers
* channel type and boundary metadata
* application or product routing metadata
* explicit thread or inbound-event attachment hints where allowed

### 11.2 Attachment rules

* channel or tenant binding alone must not bypass membership checks when membership is required
* thread history alone must not invent collaborative scope attachment
* if multiple scopes are eligible, the subsystem must return an explicit ambiguous or multi-candidate outcome rather than guessing
* if no valid scope applies, downstream systems must be able to proceed with no-scope behavior where allowed
* identity and thread subsystems remain responsible for final inbound resolution flow; this subsystem returns authoritative scope and membership facts

### 11.3 Binding types

Representative `ScopeAttachmentBinding.bindingType` values:

* `provider_workspace`
* `channel_boundary`
* `application_tenant`
* `explicit_route`

Bindings must be explicit and replay-visible.

---

## 12. Shared Configuration and Resource Binding Model

Collaborative scope is the shared configuration layer between system-wide settings and more local agent, user, or run-level overrides.

### 12.1 Resource kinds

Representative `ScopeResourceBinding.resourceKind` values:

* `policy_bundle`
* `agent_profile`
* `skill_binding`
* `tool_profile`
* `retrieval_source_set`
* `memory_policy`
* `prompt_pack`

These are bindings by reference.
The owning subsystem for each resource kind remains authoritative for the meaning and admission of that resource.

### 12.2 Binding rules

* scope-level bindings must reference immutable or versioned artifacts where possible
* disabling or superseding a binding must not break historical replay
* scope-level bindings may narrow or pin downstream behavior, but must not bypass higher-precedence system or environment restrictions
* downstream runtime and policy layers still compute effective capability exposure; scope-level bindings are candidate inputs, not automatic live exposure

### 12.3 Shared settings posture

Scope-level settings may include:

* default policy bundle refs
* default agent profile refs
* retrieval-source eligibility refs
* disabled capability lists
* collaboration-specific metadata or labeling

Settings should be modeled as explicit snapshot-addressable configuration, not as implicit mutable state.

---

## 13. Collaboration Lifecycle and State Transitions

Scope lifecycle must be explicit because downstream consumers need to distinguish active collaboration from historical records.

### 13.1 Scope lifecycle

```text
draft -> active -> suspended -> archived
```

Rules:

* only `active` scopes may normally participate in new live attachment
* `suspended` scopes should block new live attachment and new binding activation unless explicitly overridden by governance
* `archived` scopes remain replay-readable but should not participate in new live collaboration flows

### 13.2 Membership lifecycle

```text
invited -> active -> left | revoked | expired
invited -> rejected | expired
```

Rules:

* reactivation should create a new state transition or membership event, not erase the prior lifecycle
* revocation must preserve actor and reason provenance

### 13.3 Binding lifecycle

Representative states:

* `active`
* `disabled`
* `superseded`

Rules:

* superseding a binding must preserve the prior ref for replay
* disabled bindings may remain historically resolvable

---

## 14. Policy and Access Boundaries

Collaboration state is a prerequisite input to policy, not a substitute for policy.

### Boundary rules

* active membership may permit scope attachment, but it does not by itself authorize cross-scope reads, writes, or external actions
* policy and approval remain authoritative for risky or side-effecting operations
* scope suspension may stop new access before policy evaluation, but policy remains responsible for the final decision path when execution continues
* changes that materially broaden access across a collaborative scope should be review-visible and auditable

### Cross-scope posture

* membership in two scopes does not imply unrestricted data flow between them
* any deliberate bridge, federation, or shared resource across scopes must be explicit and policy-compatible
* downstream subsystems must receive the specific `collaborativeScopeId` they are acting under rather than a generic “all my scopes” set

---

## 15. Integration with Other Subsystems

The Team and Collaboration System is a shared control-plane dependency for multiple subsystems.

### Identity and Thread Management

* consumes scope-attachment bindings and membership state
* remains responsible for final inbound identity and thread resolution
* must not infer or create scope state that is not present here

### Context Assembly

* consumes scope-level policy or instruction refs that should appear in the collaborative-scope context layer
* remains responsible for context ordering and rendering

### Memory System

* consumes `collaborativeScopeId` as a valid memory scope
* remains responsible for memory persistence, lifecycle, and retrieval

### RAG Infrastructure

* may consume retrieval-source-set refs or scope-level corpus bindings
* remains responsible for ingestion, indexing, retrieval, and reranking

### Skills System and Tool Profiles

* may consume scope-level skill bindings, agent bindings, or tool-profile refs
* remain responsible for publication, validation, effective capability filtering, and replay resolution

### Policy and Approval System

* may consume scope-level policy bundle refs and role/membership facts
* remains responsible for evaluating whether one action is allowed, denied, or approval-gated

### Observability, Replay, and Cost Control

* consumes scope lifecycle, membership, and binding change records
* remains responsible for storing and presenting platform-wide replay and audit views

---

## 16. Audit, Observability, and Replay

Collaborative-scope state is part of platform governance and therefore must be replay-visible.

### Required audit events

The subsystem must emit events for:

* scope created
* scope activated, suspended, or archived
* invite created, accepted, rejected, expired, or revoked
* membership role changed
* scope attachment binding created, disabled, or superseded
* scope resource binding created, disabled, or superseded

### Replay rules

* past runs must be able to recover the scope and membership snapshot relevant to the run
* replay must not silently substitute current membership or binding state for historical state
* historical scope suspension or revocation state must remain queryable for audit

### Read views

Operators should be able to inspect:

* one scope lifecycle timeline
* one membership timeline for one user in one scope
* one binding history for one scope
* one scope snapshot suitable for replay attachment analysis

---

## 17. Configuration Direction

Collaborative-scope configuration is one level in the platform-wide precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

Representative configuration:

| Config | Purpose | Type | Default | Override level |
| --- | --- | --- | --- | --- |
| `scopeAttachmentMode` | control whether scope attachment is required, optional, or disabled for a channel or product path | enum | explicit | system or environment |
| `allowedScopeTypes` | limit which scope types may be used in one deployment or product surface | list | all supported | system or environment |
| `scopeBindingPins` | pin exact scope-level resource versions for regulated or replay-sensitive environments | map | explicit | collaborative scope |
| `disabledScopeBindings` | disable one scope-level binding without deleting historical state | list | empty | collaborative scope or agent |

Rules:

* lower-precedence layers must not widen beyond higher-precedence restrictions
* collaborative-scope configuration should remain explicit and snapshot-addressable
* disabling a scope or binding must not erase historical replay references

---

## 18. Contract Sketch

This section defines the language-neutral control-plane contract implied by this subsystem.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `GetCollaborativeScope` | Read one scope by id or snapshot ref. | `collaborativeScopeId` or snapshot ref | `CollaborativeScope` |
| `ListUserScopes` | Return attachable or historical scopes for one user under one filter. | `userId`, optional filters | list of scope-summary records |
| `ResolveScopeAttachment` | Determine candidate collaborative scope attachment from user and boundary context. | attachment context | scope-attachment result |
| `GetMembership` | Read one user’s membership state for one scope. | `collaborativeScopeId`, `userId` | `CollaborativeScopeMembership` |
| `ListScopeBindings` | Return active or historical bindings for one scope. | `collaborativeScopeId`, filters | list of `ScopeAttachmentBinding` or `ScopeResourceBinding` |
| `RecordScopeChange` | Persist one replay-visible scope or membership change record. | change request | `ScopeChangeRecord` |

### Behavioral expectations

* all scope ids, membership ids, and binding ids must be stable
* lookup behavior must be deterministic for a fixed snapshot
* callers must be able to request current or historical views when replay is required

---

## 19. Failure Modes and Recovery

Representative failure modes:

* no valid collaborative scope matches the inbound or application context
* multiple scopes match and disambiguation is required
* membership state is stale, revoked, or inconsistent with scope lifecycle
* one scope binding points to a resource ref that no longer exists or is disabled
* scope suspension occurs while downstream work is being planned

Recovery rules:

* ambiguous scope attachment must fail explicit rather than guessing
* missing or revoked membership must not silently degrade into cross-scope access
* broken resource refs should produce clear diagnostic outcomes and preserve historical refs for replay
* suspension or archive should block new live attachment while keeping audit history readable

---

## 20. Test and Validation Strategy

The subsystem should be validated with at least:

1. **Scope attachment tests**  
   Verify deterministic attachment, no-scope outcomes, and ambiguous-scope handling.

2. **Membership lifecycle tests**  
   Verify invite, join, leave, revoke, expire, and role-change transitions with preserved history.

3. **Precedence and binding tests**  
   Verify that collaborative-scope bindings compose correctly with higher- and lower-precedence configuration.

4. **Cross-scope isolation tests**  
   Verify that multi-membership does not create implicit bridges and that downstream subsystems receive one explicit scope context.

5. **Replay tests**  
   Verify that historical runs can resolve the exact scope, membership, and binding state in effect at the time.

6. **Suspension and archive tests**  
   Verify that new live attachment is blocked while historical audit and replay remain available.

---

## 21. Final Architectural Position

The Team and Collaboration System should be built as the **control plane for Collaborative Scope**, not as a vague collection of admin tables.

Its job is to:

* define shared collaboration boundaries
* manage who belongs to those boundaries
* attach shared policy, configuration, and capability refs to those boundaries
* let downstream subsystems consume that state in a deterministic, auditable way

That is the architectural separation that allows teams and applications to collaborate on the same platform without collapsing identity, policy, memory, and execution isolation into one blurred concept.
