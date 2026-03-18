# Frame AI Agent Platform — Layer 2

## Memory System Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Memory System  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Knowledge Plane Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Policy and Approval System Design
* Skills System Design
* Identity and Thread Management
* RAG Infrastructure Design
* Observability and Replay Design

---

## 2. Purpose

The Memory System is the platform subsystem that turns proposed knowledge into **persistent, structured, scoped, lifecycle-managed memory** and returns relevant memory for runtime use.

It exists because memory is not the same thing as prompt history, thread summary, or RAG.
The platform must support:

* multiple memory scopes
* multiple memory types
* explicit trust levels
* retention and lifecycle control
* conflict detection and resolution
* provenance-rich retrieval
* policy-gated persistent writes

The subsystem owns:

* memory record contracts
* candidate intake and write evaluation
* memory lifecycle state
* scope-aware retrieval
* conflict tracking and resolution state
* replay-visible write and retrieval artifacts

The Agent Runtime decides **when memory should be retrieved or when memory candidates should be emitted**.  
The Memory System decides **how memory is validated, persisted, retrieved, and governed over time**.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Memory System is responsible for:

* defining the canonical memory record, candidate, retrieval, and conflict models
* supporting multiple scopes, types, trust levels, and retention rules
* accepting memory candidates from runtime, skills, operators, or approved imports
* classifying candidates and applying the Layer 1.5 memory write pipeline
* validating candidate schema, scope, provenance, and lifecycle eligibility
* detecting conflicts and preserving conflict metadata
* persisting accepted memory records and lifecycle transitions
* retrieving relevant memory for runtime under scope and policy constraints
* returning provenance-rich memory results distinct from RAG results
* supporting retention, expiry, supersession, tombstoning, and review-gated states
* emitting replay-grade records for memory writes, rejections, conflicts, and retrievals

### Out of Scope

The Memory System does **not** own:

* thread summary generation
* RAG ingestion, document retrieval, reranking, or citation packaging
* the main reasoning loop
* policy authoring or approval UX
* identity resolution
* model prompt rendering
* skill package lifecycle
* sandbox implementation

This subsystem owns persistent platform-managed knowledge.
It does not replace runtime working state, context assembly, or shared RAG infrastructure.

---

## 4. Architectural Role

The Memory System sits on both the post-run write path and the pre-step retrieval path.

```text
Agent Runtime
  -> request memory retrieval for context assembly
  -> Memory System
       -> scope filter
       -> rank and package memory results with provenance
  -> Context Assembly
       -> render memory as a distinct evidence layer

Agent Runtime / Skills / operator workflow
  -> emit memory candidates
  -> Memory System
       -> classify / validate / conflict-check / score
       -> policy / approval gate before persistent write
       -> write / reject / mark pending review
       -> emit replay and audit artifacts
```

### Upstream inputs

* memory retrieval requests from runtime or approved internal callers
* memory extraction candidates from runtime post-run hooks
* skill-emitted memory candidates where allowed
* identity, thread, collaborative scope, and execution-space metadata
* policy decisions and approval outcomes for persistent writes or cross-scope access
* lifecycle configuration and retention policy inputs

### Downstream outputs

* retrieved memory result sets
* memory write results
* conflict sets and resolution refs
* memory lifecycle transitions
* replay and observability artifacts

### Primary consumers

* Agent Runtime
* Context Assembly
* Policy and Approval System
* Skills System
* Observability and Replay

---

## 5. Goals and Non-Goals

### Goals

The Memory System must optimize for:

* scoped persistent knowledge with explicit lifecycle control
* strong separation between memory and RAG
* provenance-rich retrieval and writes
* predictable conflict handling
* policy-gated persistence
* replayable, auditable mutation history
* progressive loading for retrieval
* safe use across head-agent and subagent execution

### Non-Goals

The Memory System is not trying to optimize for:

* replacing thread summaries or runtime working state
* collapsing external retrieval and platform memory into one store
* auto-accepting every extracted fact as memory
* hiding conflicts by destructive overwrite
* bypassing policy for “obvious” writes
* owning application-specific meaning of every memory type

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the memory-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The Memory System must support:

* scoped memory with lifecycle control
* multiple scopes, types, trust levels, and retention rules
* validation and storage of memory candidates
* relevant runtime retrieval
* conflict detection, provenance, and lifecycle management
* clean separation from shared retrieval infrastructure

### From Layer 1.5

The Memory System must implement:

* the memory write pipeline: `Candidate -> Classify -> Validate -> Conflict Check -> Score -> Write / Reject`
* write rules for explicit user requests, inferred knowledge, and system-generated candidates
* retrieval rules requiring scope filtering, relevance ranking, and provenance
* conflict handling that preserves conflicting records with metadata
* policy-first writes and no cross-scope access without policy approval
* memory and retrieval remaining distinct concepts and outputs

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Memory System must:

* maintain immutable memory write history and current lifecycle state for records
* accept memory candidates from approved sources with full provenance
* classify candidate origin, trust posture, and retention intent
* validate candidate schema, scope, provenance, and eligibility
* detect duplicates, near-duplicates, and conflicting active records
* score candidate confidence and write priority
* require policy clearance before any persistent write or cross-scope retrieval
* persist accepted records, rejected candidates, and pending-review outcomes
* retrieve relevant active memory for the current run or delegated task
* package retrieved memory with source refs, memory ids, and scope provenance
* support lifecycle transitions such as supersede, expire, conflict, review, and tombstone
* emit replay-grade write and retrieval artifacts

---

## 8. Core Invariants

The Memory System must obey the global platform invariants.

Additional memory-specific invariants:

1. **Memory and RAG remain distinct.**  
   Memory is persistent, lifecycle-managed platform knowledge. RAG is query-time retrieval of indexed external knowledge. They must not be merged or returned as indistinguishable evidence.

2. **Memory is always scoped.**  
   Every memory record must declare the scope it belongs to. Retrieval or write behavior without explicit scope is invalid.

3. **Persistent writes are governed.**  
   No memory record may be created, updated in live state, or exposed across scopes without policy-compatible authorization.

4. **Conflicts are preserved, not erased.**  
   Conflicting records must retain provenance and conflict metadata rather than being silently overwritten.

5. **Retrieval returns provenance.**  
   Memory results must carry memory ids, scope provenance, and source refs suitable for context assembly and audit.

6. **Lifecycle state controls live visibility.**  
   Expired, tombstoned, superseded, or review-blocked records must not appear in normal live retrieval unless explicitly requested.

7. **Execution Space is not a primary memory scope.**  
   Execution space may appear in provenance or policy context, but persistent memory scope remains user, thread, or collaborative scope unless a future contract explicitly adds another scope type.

---

## 9. Domain Model

Memory needs explicit scope, type, trust, provenance, and lifecycle metadata.

### Canonical model

| Category | Values | Notes |
| --- | --- | --- |
| Scope kind | `user`, `thread`, `collaborative_scope` | Every persistent record targets exactly one explicit scope. |
| Memory type | `fact`, `preference`, `profile_attribute`, `constraint`, `relationship` | Types are extensible but must preserve schema, trust, provenance, and retention semantics. |
| Trust level | `user_asserted`, `human_reviewed`, `agent_inferred`, `system_derived` | Trust affects ranking, review posture, and downstream visibility. |
| Lifecycle state | `active`, `pending_review`, `conflicted`, `superseded`, `expired`, `tombstoned` | Non-live states are excluded from normal retrieval unless explicitly requested. |
| Retention class | `pinned`, `default`, `expiring`, `review_required` | Retention class controls expiry behavior and review gating. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `MemoryScopeRef` | `kind`, `scopeId` | None | Identifies the canonical scope boundary for one record. |
| `ProvenanceRef` | `kind`, `refId`, `hash`, `source` | None | Must be sufficient to explain why the memory exists. |
| `RetentionPolicy` | `class`, `protected` | `expiresAt` | `expiresAt` is required when the retention class implies expiry. |
| `MemoryAccessContext` | `userId`, `threadId`, `runId` | `stepId`, `collaborativeScopeId`, `executionSpaceId` | Required on every read, write, and resolution path. |
| `MemoryRecord` | `memoryId`, `scope`, `type`, `trust`, `state`, `schemaVersion`, `content`, `confidence`, `provenance`, `retention`, `createdAt`, `updatedAt` | `conflictsWith` | `conflictsWith` lists related records when the record participates in an active conflict set. |

### Domain rules

* memory records must be typed and schema-valid
* scope refs must align with canonical platform identity and thread/scope ids
* provenance must be sufficient to explain why the memory exists
* meaningful semantic changes should create a new write event and lifecycle transition, not erase prior history

---

## 10. Scope, Type, Trust, and Lifecycle Model

Layer 1 explicitly requires multiple scopes, types, trust levels, and retention rules.

### 10.1 Scope rules

Representative scopes:

* `user`: persistent knowledge tied to a canonical user across threads and channels
* `thread`: structured knowledge local to a conversation thread and distinct from thread summary artifacts
* `collaborative_scope`: shared team, application, or group knowledge

Rules:

* retrieval must state which scope or scope set is allowed
* writes must target one explicit scope
* cross-scope copy or promotion must be explicit and policy-gated

### 10.2 Type rules

Memory types should be explicit and extensible.
Representative categories include:

* facts
* preferences
* profile attributes
* constraints
* relationships

Rules:

* type schemas must be explicit
* retrieval and conflict matching may vary by type
* new memory types must preserve scope, trust, provenance, and retention contracts

### 10.3 Trust rules

Representative trust posture:

* `user_asserted`: explicit user-provided memory
* `human_reviewed`: operator- or reviewer-confirmed memory
* `agent_inferred`: model- or skill-inferred memory with lower confidence
* `system_derived`: generated or imported memory that may require review

Rules:

* trust level must be explicit on every live record
* retrieval ranking should consider trust along with relevance
* trust level must not be silently upgraded without a governed event

### 10.4 Lifecycle and retention rules

Representative lifecycle states:

* `active`
* `pending_review`
* `conflicted`
* `superseded`
* `expired`
* `tombstoned`

Retention rules:

* pinned memories resist default expiry
* expiring memories must carry explicit expiry metadata
* review-required memories must not become normally retrievable until promoted
* tombstones preserve audit history even when live retrieval excludes the record

---

## 11. Candidate Intake and Write Lifecycle

The Memory System receives proposed knowledge rather than raw imperative writes.

### 11.1 Candidate sources

Representative candidate sources include:

* runtime post-run extraction hooks
* explicit user memory requests
* skill-generated memory candidates where policy allows
* operator or import workflows

### 11.2 Layer 1.5 write pipeline

This subsystem implements the logical write contract:

```text
Candidate -> Classify -> Validate -> Conflict Check -> Score -> Write / Reject
```

Policy and approval wrap the persistent write boundary and must be satisfied before `Write`.

### 11.3 Write rules

The subsystem must implement the required write posture:

* explicit user requests -> auto-write as pinned after validation and policy allow
* inferred knowledge -> lower confidence and stricter validation posture
* system-generated -> may require review before live retrieval

### 11.4 Candidate and write contract

| Candidate source | Meaning |
| --- | --- |
| `user_explicit` | User directly asked to store or update a memory. |
| `runtime_extract` | Runtime extracted a candidate from interaction flow. |
| `skill_output` | A skill proposed a candidate through the governed write path. |
| `system_import` | An operator or import workflow proposed a candidate. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `MemoryWriteRequest` | `requestId`, `access`, `candidates` | `policyDecisionRef` | One request may batch multiple candidates under one caller access context. |
| `MemoryCandidate` | `candidateId`, `source`, `proposedScope`, `type`, `requestedTrust`, `requestedRetain`, `content`, `confidenceHint`, `provenance`, `createdAt` | `stepId` | `requestedTrust` and `requestedRetain` are proposals, not guaranteed final values. |

| Write status | Meaning |
| --- | --- |
| `written` | Candidate became or updated a live record. |
| `rejected` | Candidate failed validation, policy, or conflict handling. |
| `pending_review` | Candidate was retained for review but not made live. |
| `conflicted` | Candidate entered a tracked conflict set instead of producing one clear live outcome. |
| `superseded` | Candidate resulted in a new record while an older record moved to a terminal lifecycle state. |

| Result contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `MemoryWriteResult` | `candidateId`, `status`, `reason` | `memoryId`, `conflictSetId`, `policyDecisionRef` | At least one replay-visible outcome ref must exist before the batch claims success. |

### 11.5 Pipeline rules

* classification determines initial trust and review posture
* validation must happen before any persistent state change
* conflict checks must run against active and relevant non-terminal records in the target scope
* scoring must remain traceable and replay-visible
* rejected or pending-review outcomes should still preserve candidate provenance for audit

---

## 12. Validation, Conflict Detection, and Resolution

Layer 1.5 requires conflict handling before write and preservation of conflicting records.

### 12.1 Validation rules

Validation must confirm:

* candidate schema validity
* explicit scope and scope eligibility
* provenance completeness
* type compatibility
* lifecycle and retention compatibility
* policy preconditions for the target scope

### 12.2 Conflict rules

Conflict detection should consider:

* same subject or entity in the same scope
* same memory type with incompatible values
* candidate trust and confidence relative to existing records
* recency and review state

Rules:

* conflicts must be detected before write
* conflicting records must be preserved with metadata
* conflict existence does not imply destructive deletion of older records

### 12.3 Resolution workflows

The subsystem should support explicit resolution outcomes such as:

* keep existing as active and reject new candidate
* keep both with conflict metadata
* supersede prior record with a new active record
* promote reviewed record and demote or expire conflicting ones

Resolution must remain explicit, replay-visible, and provenance-preserving.

### 12.4 Conflict resolution contract

| Resolution action | Meaning |
| --- | --- |
| `keep_existing` | Preserve the current active record and reject the competing candidate or record. |
| `keep_both` | Preserve both records while keeping explicit conflict metadata. |
| `supersede` | Promote one record to active and move the replaced record into a terminal lifecycle state. |
| `promote_reviewed` | Promote a reviewed record and demote or expire incompatible alternatives. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ConflictResolutionRequest` | `conflictSetId`, `access`, `action` | `winnerMemoryId`, `comment` | `winnerMemoryId` is required when the chosen action needs an explicit surviving record. |
| `ConflictResolutionResult` | `conflictSetId`, `resolved`, `updatedIds` | None | `updatedIds` enumerates every record whose lifecycle or conflict metadata changed. |

---

## 13. Retrieval Model

Memory retrieval is the read path for persistent structured recall.
It is not shared document retrieval.

### 13.1 Retrieval rules

Memory retrieval must:

* be scope-filtered
* be relevance-ranked
* include provenance

Additional rules:

* retrieval should consider trust, lifecycle state, type, and recency in addition to semantic relevance
* non-live states such as `expired`, `tombstoned`, or `pending_review` should be excluded by default
* retrieval should support bounded child-context queries for subagents
* every retrieval request must carry the full caller identity and scope envelope required by Layer 1.5

### 13.2 Progressive loading

The subsystem should follow the platform progressive-loading principle.

Rules:

* retrieval should first narrow candidate records using scope and lightweight metadata filters
* full payload loading should occur only for the selected result set
* caches may accelerate retrieval, but must not bypass scope checks, lifecycle checks, or policy gates

### 13.3 Retrieval contract

| Query contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `MemoryQuery` | `queryId`, `access`, `allowedScopes`, `text`, `maxResults` | `types`, `includeStates`, `policyDecisionRef`, `asOf` | `includeStates` defaults to live states only unless an audit or resolution path explicitly widens it. |

| Result contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `MemoryResult` | `memoryId`, `scope`, `type`, `trust`, `content`, `score`, `provenance`, `reasonCodes` | `contentRef` | Large payloads may be returned by reference rather than inline. |
| `MemoryQueryResult` | `queryId`, `results` | None | The result set must remain replay-visible and bounded. |

### 13.4 Retrieval output rules

* output must include memory ids and scope provenance
* output must remain logically distinct from RAG results
* output should be serializable or reference-addressable for replay

---

## 14. Boundary with RAG Infrastructure

Layer 1.5 explicitly requires memory and retrieval to remain distinct.

### Distinction rules

* memory is persistent, structured, trusted-at-a-declared-level, and lifecycle-managed
* RAG is external or indexed knowledge retrieved at query time
* RAG results must not overwrite memory
* memory retrieval results must not be represented as document citations from RAG

### Integration rules

* RAG results may inform memory candidates only through an explicit candidate-generation path
* any such candidate must still pass memory validation, conflict checks, policy, and provenance requirements
* context assembly must render memory retrieval and RAG results as separate evidence groups

---

## 15. Policy, Approval, and Access Control

Memory writes and cross-scope reads are governance boundaries.

### Write policy rules

* policy must be applied before persistent memory write
* explicit user requests may still be denied or constrained by policy
* system-generated or shared-scope writes may require approval depending on policy

### Read policy rules

* same-scope retrieval follows the normal scope and caller contract
* cross-scope retrieval must not occur without policy approval
* retrieval callers must propagate `userId`, `threadId`, `runId`, and applicable scope metadata

### Condition examples

Representative policy conditions may include:

* allowed target scope
* allowed memory types
* allowed trust floor or review requirements
* retention restrictions
* read-only access to specific scope slices

The Memory System must fail closed if a required policy condition cannot be enforced.

---

## 16. Runtime, Context, Skill, and Subagent Interaction

The Memory System does not own runtime orchestration, but it is tightly coupled to the execution lifecycle.

### Runtime interaction

The Agent Runtime:

* requests memory retrieval during context assembly
* triggers post-run memory extraction hooks
* submits memory candidates or candidate refs for evaluation
* remains responsible for checkpointing around policy and approval waits

The Memory System:

* returns bounded retrieval results with provenance
* processes candidates through the write pipeline
* returns write outcomes and conflict refs

### Context Assembly interaction

Context Assembly is responsible for rendering memory results into the strict Layer 1.5 context order.
The Memory System must therefore return retrieval results that preserve:

* memory id
* scope provenance
* source provenance
* enough metadata for inclusion/exclusion reporting

### Skill interaction

Skills may emit memory candidates, but they must not bypass the memory write pipeline.
Skill-generated candidates remain subject to:

* validation
* conflict handling
* policy and approval
* replay capture

### Subagent interaction

Child runs should receive only the memory slices required for the delegated task.

Rules:

* subagent retrieval must remain scope-bounded
* unrelated memory must be excluded from child context by default
* child memory handoff must be built from the child run's own `MemoryAccessContext`, preserving inherited user, thread, collaborative-scope, and execution-space lineage
* delegated child retrieval must stay bounded by explicit memory-result budget, token budget, timeout, and fanout controls from the child task contract
* memory passed to child context should be provided as curated memory ids, provenance refs, or replay-visible retrieval result refs rather than an unrestricted live-scope grant
* if a child run issues fresh retrieval, it must do so through `MemoryQuery` using the child access context and the delegated allowed-scope set
* child-generated candidates must retain parent-child lineage in provenance

---

## 17. Replay and Observability

Memory is a major audit boundary because it changes persistent platform knowledge.

### Required logs

The subsystem must emit structured logs for:

* candidate intake
* classification result
* validation failures
* conflict detection
* score calculation
* policy and approval refs used
* write success or rejection
* lifecycle transitions such as expire, supersede, or tombstone
* retrieval query and result summary

### Required trace spans

At minimum:

* `memory.candidate_intake`
* `memory.classify`
* `memory.validate`
* `memory.conflict_check`
* `memory.score`
* `memory.write`
* `memory.retrieve`
* `memory.lifecycle_transition`

### Replay capture

The subsystem must preserve:

* candidate refs and hashes
* classification output
* validation output
* conflict-set refs
* policy decision refs
* approval refs where used
* final write result
* lifecycle state at the time of retrieval
* retrieval query ref and retrieval result refs

### Replay behavior

* write replay should prefer recorded write decisions over recomputing live policy or scoring
* retrieval replay should prefer stored retrieval result refs when available
* if live retrieval must be re-executed because artifacts are missing, replay must clearly mark it as best-effort rather than authoritative

---

## 18. Configuration Direction

The subsystem must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `defaultMemoryRetentionClass` | default retention for non-explicit writes | string | conservative | system or scope |
| `allowInferredMemoryWrites` | permit inferred memory candidates to become live records | boolean | true or conservative | system or agent |
| `requireReviewForSystemGeneratedMemory` | gate system-derived memory behind review | boolean | true | system or scope |
| `maxRetrievedMemoryResults` | cap memory retrieval result count | integer | conservative | system, scope, or run |
| `maxRetrievedMemoryTokens` | cap memory evidence budget provided downstream | integer | conservative | system, scope, or run |
| `includeConflictedMemoryByDefault` | include conflicted records in normal retrieval | boolean | false | system |
| `memoryDecisionCacheTTL` | cache safe retrieval decisions or write prechecks | duration | short | system |
| `memoryKillSwitches` | deny writes or reads for selected scopes/types | list | empty | system or scope |

### Configuration rules

* all memory configuration must declare scope explicitly
* overrides must be traceable and replay-visible
* lower-level config must not widen retention or cross-scope access beyond higher-level policy
* configuration must not blur the distinction between memory and RAG

---

## 19. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `WriteCandidates` | Evaluate and persist proposed knowledge through the governed write pipeline. | `MemoryWriteRequest` | One `MemoryWriteResult` per candidate. |
| `Query` | Retrieve bounded memory evidence for live use, replay, or audit. | `MemoryQuery` | `MemoryQueryResult` |
| `GetRecord` | Read one replay-visible record by ID. | `MemoryRecordReadRequest` | `MemoryRecord` |
| `GetConflictSet` | Read the records participating in one tracked conflict set. | `ConflictSetReadRequest` | Ordered list of `MemoryRecord` values |
| `ResolveConflict` | Apply an explicit conflict-resolution outcome and persist lifecycle changes. | `ConflictResolutionRequest` | `ConflictResolutionResult` |

### Read request contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `MemoryRecordReadRequest` | `memoryId`, `access` | None | Used by audit, replay, and resolution workflows. |
| `ConflictSetReadRequest` | `conflictSetId`, `access` | None | Must return only records visible under the supplied caller context. |

### Behavioral expectations

* `WriteCandidates` must preserve the Layer 1.5 write pipeline semantics for every candidate and record the caller access context used for the batch
* `WriteCandidates` must not claim success before the resulting record or terminal write outcome is persisted
* `Query` must enforce scope, lifecycle, provenance, and execution-space rules before returning results
* `GetRecord` and `GetConflictSet` must validate the supplied access context and return replay-visible records suitable for audit and resolution workflows
* `ResolveConflict` must validate caller context, preserve the prior conflict state, and record the resulting lifecycle transitions for replay and audit

---

## 20. Failure Modes and Recovery

The subsystem must fail closed on unsafe ambiguity and preserve evidence for audit.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| candidate missing scope | validation failure | invalid write request | reject before conflict check |
| missing provenance | validation failure | unverifiable memory | reject or hold for review |
| policy denial | decision deny | write blocked | return denied write outcome |
| approval timeout | approval expiry | write not authorized | return pending/expired outcome and require re-evaluation |
| unresolved conflict | conflict check result | ambiguous live state | keep conflict metadata and avoid silent overwrite |
| storage unavailable | persistence failure | write or lifecycle transition incomplete | retry safely or fail closed before success |
| retrieval index lag | stale recall risk | partial recall quality degradation | return bounded result with traceable retrieval timestamp |
| cross-scope query without approval | access validation failure | unsafe data exposure risk | reject query |
| duplicate candidate | dedupe hit | duplicate write risk | return prior outcome when safe |

### Recovery principles

* fail closed for unsafe ambiguity
* preserve candidate and conflict evidence even when a write is rejected
* never silently overwrite conflicting active memory
* prefer replay-visible prior outcomes for safe duplicates

---

## 21. Final Architectural Position

The Memory System should be designed as the platform’s **persistent structured knowledge subsystem**, not as a generic document search layer or prompt-history cache.

Its authoritative contract is:

* accept scoped memory candidates
* apply classification, validation, conflict detection, scoring, and governed write decisions
* manage trust, retention, and lifecycle state
* retrieve relevant memory with provenance
* preserve replay-grade evidence for writes and reads

It must remain separate from:

* runtime working state
* thread summaries
* shared RAG infrastructure
* policy authoring
* skill or tool execution

That separation keeps memory scoped, trusted-at-a-declared-level, lifecycle-managed, and consistent with the Layer 1 and Layer 1.5 contracts.
