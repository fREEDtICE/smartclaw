# SmartClaw Agent Platform — Layer 2

## Context Assembly Subsystem Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Context Assembly
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Runtime and Knowledge Plane Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Identity and Thread Management
* Memory System Design
* Retrieval and RAG Design
* Model Access / Routing Design
* Observability and Replay Design
* Policy and Approval System

---

## 2. Purpose

The Context Assembly subsystem turns multiple upstream context sources into a **bounded, ordered, traceable execution snapshot** for agent reasoning.

It exists because context construction is not a string concatenation problem. The platform must:

* enforce the Layer 1.5 context order
* preserve source boundaries between instructions, memory, retrieval, user input, and run state
* apply scope and policy-derived inclusion rules
* operate within model token budgets
* compress context without losing provenance
* build bounded child-context handoffs for subagents

Context Assembly owns **how execution context is built**, but it does not own every source system that contributes content.

---

## 3. Scope

### In Scope

The Context Assembly subsystem is responsible for:

* normalizing upstream source material into canonical context blocks
* enforcing the Layer 1.5 ordering and precedence contract
* filtering blocks by identity, scope, thread, run, and delegation boundaries
* reserving and enforcing token budgets
* compressing or summarizing eligible blocks when needed
* producing immutable context snapshots for model-facing runtime steps
* producing bounded child-context packs for subagents
* recording inclusion, exclusion, provenance, and budget decisions
* supporting deterministic replay where stored source material permits it

### Out of Scope

The Context Assembly subsystem does **not** own:

* identity resolution
* thread creation or attachment
* long-term memory storage
* retrieval indexing or reranking internals
* policy authoring or approval workflows
* model routing or provider SDK execution
* tool execution
* skill package lifecycle
* sandbox allocation

This subsystem assembles context from source systems. It does not replace them.

---

## 4. Architectural Role

Context Assembly sits between upstream context producers and the Agent Runtime reasoning loop.

```text
Channel Gateway
  -> Identity and Thread Management
  -> Agent Runtime
       -> Context Assembly
            -> normalize and filter source blocks
            -> enforce order and precedence
            -> budget and compress
            -> emit immutable snapshot
       -> Model Access / Routing
       -> Tool / Skill / Subagent orchestration
```

The runtime decides **when** context must be assembled or refreshed.
The Context Assembly subsystem decides **how** the context snapshot is produced.

### Upstream inputs

* system instructions
* collaborative scope policies
* agent profile
* thread summary
* memory retrieval results
* RAG results
* current user input and attachment-derived user input artifacts
* run working state
* token budget envelope from runtime or model routing
* scope, identity, and thread metadata

### Downstream outputs

* immutable assembled context snapshot
* model-renderable ordered context blocks
* inclusion and exclusion record
* budget report
* subagent context pack
* observability and replay metadata

---

## 5. Goals and Non-Goals

### Goals

The Context Assembly subsystem must optimize for:

* deterministic layer ordering
* explicit source provenance
* bounded token usage
* scope-safe filtering
* replayable context construction
* graceful degradation when optional sources are unavailable
* safe subagent handoff construction
* clear separation between instructions, evidence, user input, and run state

### Non-Goals

The Context Assembly subsystem is not trying to optimize for:

* owning retrieval or memory business logic
* hiding source boundaries behind a single opaque prompt string
* automatic policy bypass for “important” context
* preserving unlimited raw history inside every model call
* deciding which tools are exposed to the model

Tool exposure remains part of runtime plus tool-subsystem capability handling, not the canonical context-layer order.

---

## 6. Canonical Responsibilities

The Context Assembly subsystem must:

* consume source material from upstream systems using a canonical input contract
* enforce the strict Layer 1.5 context order
* preserve the distinction between memory retrieval and RAG retrieval
* apply source-level and block-level scope filtering
* rank optional blocks within their own layer
* reserve space for mandatory layers before adding optional evidence
* compress or summarize eligible blocks when budgets require it or when predictive pressure says the next model-bound query would cross the active trigger threshold
* produce an immutable snapshot with stable block ordering
* emit a complete inclusion and exclusion record
* assemble bounded child-context packs for delegated subagent work
* expose deterministic rendering metadata for model access and replay

---

## 7. Context Layer Contract

This subsystem must implement the Layer 1.5 contract exactly.

### Strict context order

1. system instructions
2. collaborative scope policies
3. agent profile
4. thread summary
5. memory retrieval
6. RAG results
7. current user input
8. run working state

### Layer semantics

#### 7.1 System Instructions

Platform-owned or agent-owned top-level execution instructions.

Rules:

* mandatory when present
* highest-precedence instruction layer
* not overridden by later evidence or state layers
* may have pre-authored short and long forms, but must remain semantically equivalent

#### 7.2 Collaborative Scope Policies

Scope-derived behavioral or access constraints relevant to the run.

Rules:

* mandatory when applicable
* treated as governing instructions, not optional hints
* must remain traceable to policy or scope source refs

#### 7.3 Agent Profile

Agent role, style, contract, and domain configuration.

Rules:

* instruction layer, but lower precedence than system and scope-policy layers
* may refine behavior where earlier layers permit refinement

#### 7.4 Thread Summary

Bounded conversation continuity supplied from upstream thread state.

Rules:

* continuity layer, not a policy layer
* may be compressed further if eligible
* must not silently become raw full-history replay

#### 7.5 Memory Retrieval

Persistent, scoped recall relevant to the current interaction.

Rules:

* evidence layer
* must remain logically separate from RAG results
* must retain source refs, memory IDs, and scope provenance

#### 7.6 RAG Results

Query-time retrieved knowledge or document content relevant to the task.

Rules:

* evidence layer
* must not overwrite memory blocks
* must retain source refs, retrieval query refs, and document provenance

#### 7.7 Current User Input

The current inbound message or interaction payload, including normalized attachment-derived user input artifacts when relevant.

Rules:

* mandatory for inbound turns
* must remain close to raw user meaning
* may include canonical attachment summaries, but those artifacts remain attributable to the current input

#### 7.8 Run Working State

The bounded runtime state needed for the next reasoning step.

Examples:

* prior tool-result summaries
* approval wait context
* plan state
* delegated-task progress

Rules:

* must be explicit and bounded
* must not include the full raw chain of thought or unrestricted scratchpad
* should prefer structured state over free-form narrative where possible

---

## 8. Precedence and Override Rules

The subsystem must enforce more than ordering. It must also enforce which layers are allowed to influence which decisions.

### Allowed precedence behavior

* earlier instruction layers constrain later instruction layers
* later layers may add evidence or state, but may not invalidate earlier mandatory instructions
* user input may refine the task, but may not override system or scope policy constraints
* run state may continue prior execution, but may not silently widen permissions

### Disallowed behavior

* memory or RAG content overriding policy or system instructions
* thread summary overriding current user input
* run state expanding scope beyond the resolved thread or delegation contract
* tool metadata being injected as a substitute for the runtime capability contract

### Required separation

Memory and RAG must remain separate in:

* source identity
* ranking
* compression
* rendering metadata
* observability records

---

## 9. Canonical Data Model

### 9.1 Context Layer Types

| Context layer | Meaning |
| --- | --- |
| `system_instructions` | Platform or product instructions that must lead the prompt. |
| `scope_policies` | Collaborative-scope or policy-derived guidance. |
| `agent_profile` | Stable agent identity and standing behavior. |
| `thread_summary` | Thread-continuity summary material. |
| `memory_retrieval` | Retrieved memory evidence. |
| `rag_results` | Retrieved RAG evidence. |
| `user_input` | Current user-provided input for the turn. |
| `run_state` | Transient run working state and tool or skill deltas. |

| Context block kind | Meaning |
| --- | --- |
| `instruction` | Directive-like content. |
| `evidence` | Retrieved or cited supporting material. |
| `interaction` | User or assistant conversational content. |
| `state` | Internal run-state continuation material. |

### 9.2 Source and Scope Metadata

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SourceRef` | `system`, `sourceId`, `sourceType` | `sourceVersion` | Identifies the upstream origin of one block. |
| `ContextScope` | `userId`, `threadId`, `runId` | `collaborativeScopeId`, `delegationId` | Records the scope boundary that admitted the block. |
| `ContextBlock` | `blockId`, `layer`, `kind`, `sourceRef`, `scope`, `required`, `eligibleCompact`, `tokenCost`, `content`, `metadata` | None | Canonical unit used by ordering, budgeting, rendering, and replay. |

### 9.3 Input and Output Contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `BudgetEnvelope` | `maxInputTokens`, `reservedForTools`, `reservedForOutput` | `budgetProfileRef`, `targetModelRef`, `triggerThresholdTokens`, `triggerThresholdRatio` | Defines the model-input budget and proactive compaction trigger posture available to assembly. |
| `ContextAssemblyInput` | `assemblyId`, `runId`, `threadId`, `userId`, `mode`, `budget`, `systemBlocks`, `scopePolicyBlocks`, `agentProfileBlocks`, `threadSummaryBlocks`, `memoryBlocks`, `ragBlocks`, `userInputBlocks`, `runStateBlocks` | `collaborativeScopeId`, `parentSnapshotRef`, `routeProfileId`, `targetModelRef` | Normalized source material for one assembly action. |
| `TokenForecast` | `forecastId`, `basis`, `currentInputTokens`, `predictedAncillaryTokens`, `predictedNextInputTokens`, `reservedForOutput`, `triggerThresholdTokens`, `shouldCompact` | `targetModelRef`, `triggerThresholdRatio`, `confidence`, `reasonCodes` | Predictive sizing artifact for the immediately upcoming model-bound request. |
| `AssembledContext` | `snapshotId`, `runId`, `blockOrder`, `blocks`, `budgetReport`, `inclusionRecord`, `renderArtifacts`, `createdAt` | None | Immutable snapshot consumed by runtime and replay. |

### 9.4 Assembly Modes

| Assembly mode | Meaning |
| --- | --- |
| `run_start` | Initial snapshot for a new run. |
| `step_refresh` | Refresh caused by step progress or new evidence. |
| `resume` | Snapshot rebuilt after checkpoint resume. |
| `subagent_pack` | Bounded child-context handoff. |

Predictive compaction should be evaluated for both `run_start` user-ingress assembly and `step_refresh` agent-loop assembly before the next model call is issued.

---

## 10. Assembly Lifecycle

Each assembly operation should follow a deterministic multi-phase flow.

### Phase 1. Intake and normalization

The subsystem receives normalized source payloads from runtime and source providers.

Required checks:

* all blocks have canonical layer assignment
* each block has scope and provenance metadata
* mandatory inbound fields are present
* block kinds match their layer semantics

### Phase 2. Scope filtering

The subsystem removes any block whose scope does not match the current run envelope.

Examples:

* memory from another collaborative scope
* RAG results retrieved for a different delegated task
* stale run-state blocks from another run instance

Blocks excluded for scope mismatch must be recorded, not silently dropped.

### Phase 3. Layer ordering

The subsystem orders blocks by canonical layer sequence and then by deterministic intra-layer ordering.

Recommended intra-layer ordering:

* required blocks before optional blocks
* higher-ranked evidence before lower-ranked evidence
* stable source order when ranking is equal

### Phase 4. Budget reservation

Before optional content is added, the subsystem reserves space for:

* mandatory system instructions
* mandatory scope-policy blocks
* mandatory user input
* minimal required run-state continuation
* runtime-declared output reserve

### Phase 4.5 Predictive pressure check

Before deciding that the current candidate set is safe, the subsystem may forecast the immediately upcoming model-bound request against the active trigger threshold.

The forecast should include:

* current candidate-block token cost
* current user input for `run_start` or refreshed run-state deltas for `step_refresh`
* ancillary prompt growth such as tool-schema or rendering overhead when supplied by runtime
* reserved output tokens from the active budget envelope

If the forecast crosses the active trigger threshold, the subsystem may compact proactively even when the hard `maxInputTokens` limit is not yet exceeded.

### Phase 5. Compression and summarization

If the candidate set exceeds budget, the subsystem compresses only eligible blocks.

Compression order should prefer:

1. run-state compaction
2. thread-summary compaction
3. memory-layer compaction
4. RAG-layer compaction
5. dropping lowest-value optional evidence

The subsystem must not silently compress mandatory instruction blocks into a weaker semantic form.

### Phase 6. Rendering and snapshot creation

Once the block set is final, the subsystem produces:

* immutable ordered blocks
* model-facing render artifacts
* budget report
* inclusion record

### Phase 7. Persistence and emit

The subsystem persists or emits enough metadata for replay, audit, and step-to-step reuse.

---

## 11. Budgeting and Compaction Rules

Budgeting must be explicit rather than emergent.

### Mandatory budget behavior

* output reserve must be subtracted before context selection
* mandatory layers must be admitted before optional evidence layers
* memory and RAG compete only after mandatory layers are protected
* budget decisions must be reflected in the inclusion record

### Recommended budget strategy

1. reserve output tokens
2. reserve mandatory instruction and interaction layers
3. reserve minimum viable run-state continuation
4. fill thread summary
5. fill memory retrieval
6. fill RAG results
7. compact or exclude optional blocks if needed

### Budget failure modes

If mandatory content cannot fit:

* the subsystem must return an explicit budget-blocked result
* runtime may request a larger context window through model routing
* runtime may also decide to fail the step rather than weaken mandatory constraints

The subsystem must not solve irreducible budget failure by dropping system or scope-policy blocks.

### Predictive trigger behavior

Predictive compaction is allowed before hard overflow when it reduces the chance of issuing an oversized or unstable next model query.

Rules:

* threshold resolution should prefer `BudgetEnvelope.targetModelRef`, then a route or budget profile ref, then an explicit platform default
* different LLM models may use different trigger thresholds, and lower-precedence overrides may tighten but not relax a stricter higher-precedence threshold
* `run_start` should evaluate the forecast against the received user query before the first model call
* `step_refresh` should evaluate the forecast after tool, skill, subagent, retrieval, or state changes that materially affect the next model call
* crossing the trigger threshold may justify compaction even when the current block set still fits the hard input limit
* if the trigger threshold is not crossed, the subsystem may skip compaction and preserve the richer snapshot

The predictive trigger is not a license to weaken mandatory layers. It only changes when eligible compaction is applied.

### Budget reporting model

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `BudgetReport` | `maxInputTokens`, `reservedForOutput`, `reservedForTools`, `usedInputTokens`, `droppedTokenCount`, `compactedTokenCount` | `predictionRef`, `triggerThresholdReached`, `triggerReasonCodes` | Explains exactly how the available context budget was spent. |

---

## 12. Inclusion, Exclusion, and Provenance

Every assembly decision must be reconstructable.

### Required inclusion record fields

* included block IDs
* excluded block IDs
* inclusion reason codes
* exclusion reason codes
* token cost per included block
* source refs for every evidence block
* compaction strategy used, if any

### Reason codes

The platform should standardize concise reason codes such as:

* `required_layer`
* `ranked_optional`
* `compacted_for_budget`
* `excluded_scope_mismatch`
* `excluded_budget_limit`
* `excluded_missing_provenance`
* `excluded_policy_input`

### Inclusion record model

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `BlockDecision` | `blockId`, `included`, `reasonCode`, `tokenCost` | `compactedFrom` | Records the inclusion or exclusion decision for one candidate block. |
| `InclusionRecord` | `assemblyId`, `decisions` | None | Persisted with the snapshot for replay and audit. |

---

## 13. Source Isolation and Leakage Prevention

Context Assembly is a high-risk boundary because it can accidentally mix data across users, scopes, threads, or delegated tasks.

The subsystem must enforce:

* explicit scope labels on every block
* thread binding checks before admitting thread-derived content
* delegation boundary checks for child-context packs
* evidence provenance on memory and RAG blocks
* run-instance checks on run-state blocks

### Fail-closed conditions

The subsystem must fail closed when:

* system instructions required by the run are missing
* applicable scope policy blocks are missing
* mandatory user input is missing
* block provenance is invalid for mandatory evidence
* scope metadata is contradictory

### Degraded but allowed conditions

The subsystem may continue in degraded mode when:

* thread summary is missing but user input is present
* memory retrieval returns nothing
* RAG retrieval times out or returns nothing
* optional evidence is excluded for budget reasons

Degraded mode must be visible in the output metadata.

---

## 14. Refresh and Reassembly Semantics

Context is not assembled only once per run.

### Runtime triggers for reassembly

* run start
* new inbound user turn
* approval resume
* tool or skill result that materially changes run state
* subagent result merge
* explicit retrieval refresh
* model-window change
* scope or policy context change

### Rules

* each assembly action produces a new immutable snapshot ID
* the subsystem may reuse cached block material internally, but the snapshot contract remains immutable
* streaming partial model output does not trigger reassembly
* pure trace writes do not trigger reassembly

### Snapshot lineage

Each new snapshot should reference its immediate parent snapshot when produced by refresh or resume.

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RenderArtifacts` | `renderVersion`, `promptHash`, `messages` | `parentSnapshotId` | Provider-neutral rendered form of the chosen blocks. |
| `RenderedMessage` | `role`, `content` | None | One provider-neutral rendered unit passed toward model access. |

---

## 15. Subagent Context Construction

Subagent context assembly is not a full clone of the parent run.
It is a bounded handoff built from the Layer 1.5 child-context contract.

### Required child-context contents

* inherited system instructions
* applicable collaborative scope policies
* delegated task contract and success criteria
* assigned budgets and timeout
* effective child tool-set reference from runtime and tool execution
* parent-produced summary and relevant evidence refs
* only the thread, memory, and retrieval slices required for the delegated task

### Explicit exclusions

By default, child context must exclude:

* the full parent scratchpad
* unrelated memory blocks
* unrelated RAG blocks
* tools outside the delegated contract
* unrelated user messages from the parent thread

### Child-context rules

* the parent must declare the delegation objective explicitly
* the subsystem must build a new ordered child snapshot rather than forwarding the raw parent prompt
* child context must use the child budget envelope, not the parent budget envelope
* the default Head Agent internal tool pack must not be inherited automatically; only the runtime-approved effective child tool set may be referenced

### Child-context model

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SubagentContextRequest` | `parentRunId`, `parentSnapshotId`, `childRunId`, `delegationId`, `delegatedTask`, `successCriteria`, `childBudget`, `childTimeoutSeconds`, `effectiveChildToolSetId`, `parentSummaryBlocks`, `relevantEvidenceBlocks` | None | Defines the bounded handoff requested by runtime. |
| `SubagentContextPack` | `snapshot`, `delegationId`, `parentRunId`, `childRunId` | None | Runtime-consumable child snapshot plus lineage metadata. |

---

## 16. Rendering Contract

The subsystem should not expose only one giant prompt string.
It should render structured model-facing artifacts from canonical blocks.

### Rendering rules

* preserve canonical layer order in rendered output
* preserve layer identity in metadata even if the provider prompt format flattens content
* render memory and RAG as distinct evidence groups
* keep user input and run state recognizable as separate layers
* avoid provider-specific formatting in the canonical block model

### Relationship to tool exposure

Tool descriptors and tool-call affordances are not part of the canonical context-layer contract.
They are passed separately by runtime and tool execution as the effective tool list for the step.

This separation avoids mixing:

* prompt context
* capability exposure
* execution authorization

---

## 17. Replay and Observability

Context Assembly must support both observability and deterministic replay to the extent possible.

### Required persisted metadata

* snapshot ID
* parent snapshot ID when applicable
* ordered block IDs
* block content hashes
* source refs
* inclusion record
* budget report
* render version and prompt hash
* assembly mode
* timestamps

### Replay position

For deterministic replay, the platform should prefer replaying from stored snapshots rather than rerunning live retrieval if the original block payloads are available.

If live retrieval must be re-executed, replay must clearly mark the result as best-effort rather than authoritative.

---

## 18. Error Handling and Degradation

Errors must distinguish contract failure from optional-source degradation.

### Contract errors

These should stop assembly:

* missing mandatory layer
* invalid scope envelope
* inconsistent thread or run identity
* corrupted snapshot parent reference
* invalid block kind for a required layer

### Recoverable degradations

These may allow assembly to continue:

* empty memory retrieval
* empty RAG results
* compacted thread summary
* compacted run state
* excluded optional evidence for budget reasons

### Suggested error categories

| Error code | Meaning |
| --- | --- |
| `missing_mandatory_layer` | Required context layer was absent. |
| `invalid_scope_envelope` | Scope or lineage metadata was contradictory or incomplete. |
| `budget_blocked` | Mandatory content could not fit within the budget envelope. |
| `invalid_block_shape` | Block kind or metadata failed structural validation. |
| `replay_snapshot_missing` | Required replay lineage or snapshot reference could not be resolved. |

| Error contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `AssemblyError` | `code`, `message` | None | Returned when assembly cannot produce a valid snapshot. |

---

## 19. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `Assemble` | Build one immutable context snapshot for runtime execution. | `ContextAssemblyInput` | `AssembledContext` |
| `BuildSubagentPack` | Build a bounded child-context handoff for delegation. | `SubagentContextRequest` | `SubagentContextPack` |
| `ForecastNextModelRequest` | Estimate whether the immediately upcoming model-bound request should trigger proactive compaction. | `ContextAssemblyInput` | `TokenForecast` |
| `Render` | Convert canonical blocks into provider-neutral model-facing artifacts. | Ordered `ContextBlock` values plus `BudgetEnvelope` | `RenderArtifacts` |
| `Compact` | Reduce eligible context while preserving provenance and safety invariants. | Ordered `ContextBlock` values plus `BudgetEnvelope` | Reduced block set plus `BlockDecision` records |

### Runtime interaction model

The Agent Runtime remains responsible for:

* deciding when to request assembly
* supplying the current run envelope and source material
* supplying the active model or route-profile trigger context when predictive compaction is enabled
* passing the effective tool set separately to model execution
* persisting checkpoint linkage between run state and snapshot IDs

The Context Assembly subsystem remains responsible for:

* producing the ordered snapshot
* enforcing context-layer invariants
* reporting exactly what was included and why

---

## 20. Configuration Direction

Context Assembly must obey the platform configuration contract and precedence order:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `defaultOutputReserveTokens` | reserve output capacity before optional context is admitted | integer | model/profile-defined fallback | system or agent |
| `maxThreadSummaryTokens` | cap how much budget thread continuity may consume before compaction | integer | conservative | system, agent, or run |
| `maxMemoryEvidenceTokens` | cap memory-layer evidence within the available budget | integer | conservative | system, collaborative scope, or run |
| `maxRAGEvidenceTokens` | cap RAG-layer evidence within the available budget | integer | conservative | system, collaborative scope, or run |
| `modelCompactionTriggerProfiles` | map one or more `targetModelRef` or route-profile matches to proactive compaction thresholds | map | system-defined defaults | system, agent, or run |
| `enablePredictiveCompaction` | allow forecast-driven compaction before hard budget overflow | boolean | true | system, agent, or run |
| `allowOptionalEvidenceCompaction` | allow compaction of eligible optional evidence blocks | boolean | true | system or agent |
| `allowLiveRetrievalFallbackOnReplay` | permit best-effort live retrieval when original replay artifacts are missing | boolean | false | system |
| `maxSubagentPackTokens` | bound the total size of delegated child-context packs | integer | conservative | system or run |

### Configuration rules

* all assembly configuration must declare scope explicitly
* effective budgeting, compaction, replay-fallback, and child-pack settings must be traceable and replay-visible
* overrides must not reorder canonical layers or silently widen scope inclusion
* model-specific trigger profiles must resolve deterministically from the active model or route context and must fall back to an explicit default when no exact match exists
* run-level overrides may tighten optional-source budgets or disable optional evidence, but must not weaken mandatory layer requirements

---

## 21. Persistence and Caching Direction

This subsystem should treat the context snapshot as an immutable artifact.

### Recommended persistence approach

* store snapshot metadata in transactional storage
* store large rendered artifacts or full block payloads in object storage when needed
* cache reusable block payloads and hashes for refresh efficiency

### Cache rules

* cached material must remain scoped and versioned
* cache hits must not bypass scope checks
* cache reuse must not mutate prior snapshots

---

## 22. Final Position

The platform should treat Context Assembly as a first-class Layer 2 subsystem with a narrow, deterministic contract.

Its authoritative outputs are:

* an immutable ordered context snapshot
* a budget and provenance record
* a bounded child-context pack when delegation occurs

This subsystem should remain separate from:

* runtime orchestration
* memory and retrieval ownership
* tool-capability exposure
* policy authoring

That separation keeps context construction explicit, replayable, auditable, and safe under budget and scope constraints.
