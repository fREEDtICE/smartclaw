# Frame AI Agent Platform — Layer 2

## Tool Execution Framework Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Tool Execution Framework
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Platform Tools Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* LLM Provider Abstraction Design
* Policy and Approval System
* Sandbox / Execution Space Design
* Skills System Design
* Observability and Replay Design
* Internal Tool Catalog and Default Tool Profiles

---

## 2. Purpose

The Tool Execution Framework is the platform subsystem that turns a runtime-approved tool request into a **typed, observable, policy-compatible execution result**.

It exists because tool use is not only about invoking a function. The platform must:

* register and version tool contracts
* maintain the internal platform tool catalog
* provide named default tool profiles
* validate arguments and results against schemas
* execute tools through the right backend or sandbox
* preserve side-effect evidence and replay metadata
* prevent the platform from exposing tools it cannot actually execute

The Agent Runtime decides **which tools are exposed and requested**.
The Tool Execution Framework decides **how candidate tools are resolved and how approved tool calls execute safely**.

---

## 3. Scope

### In Scope

The Tool Execution Framework is responsible for:

* maintaining the versioned tool registry
* maintaining the platform-owned internal tool catalog
* maintaining named tool profiles, including the default Head Agent profile
* resolving candidate tools and profile expansions for runtime
* validating tool descriptors, request arguments, and result envelopes
* dispatching tool calls to the correct adapter or execution strategy
* enforcing execution-space and connector requirements declared by tool descriptors
* enforcing timeout, cancellation, idempotency, and output-size controls
* normalizing tool outputs, artifacts, side-effect refs, and errors
* emitting replay-grade logs, traces, and invocation records

### Out of Scope

The Tool Execution Framework does **not** own:

* deciding whether a tool should be exposed to the model
* model prompting or reasoning strategy
* policy authoring or approval UX
* context assembly
* memory retrieval or writing
* thread or identity management
* sandbox implementation internals
* business-specific logic behind third-party systems

This subsystem executes governed capabilities. It does not decide agent behavior on its own.

---

## 4. Architectural Role

The Tool Execution Framework sits downstream of the Agent Runtime on the execution path for both tool exposure and tool execution.

```text
Agent Runtime
  -> request candidate tools
  -> Tool Execution Framework
       -> registry and profile expansion
       -> candidate descriptor set
  -> compute EffectiveToolSet
  -> model chooses tool request
  -> policy / approval / authorization
  -> Tool Execution Framework
       -> validate request
       -> dispatch adapter
       -> sandbox or connector execution
       -> normalize result
       -> emit replay artifacts
  -> runtime continues reasoning
```

### Upstream inputs

* tool resolution requests from Agent Runtime
* execution requests from Agent Runtime
* agent profile and run metadata
* collaborative scope and execution-space metadata
* runtime-issued tool authorization
* internal tool registrations
* skill-contributed tool registrations where allowed

### Downstream outputs

* candidate tool descriptor sets
* applied profile refs
* normalized tool execution results
* async wait handles for long-running tools
* artifact refs and side-effect refs
* structured logs, traces, and replay records

---

## 5. Goals and Non-Goals

### Goals

The Tool Execution Framework must optimize for:

* typed execution correctness
* explicit descriptor and schema contracts
* safe execution of side effects
* replayability and traceability
* strong separation between exposure and execution
* support for platform internal tools and external tools
* bounded execution with explicit failure behavior
* safe extensibility for skill-contributed tools
* powerful default tools for the Head Agent without over-granting subagents

### Non-Goals

The Tool Execution Framework is not trying to optimize for:

* choosing tool selection strategy
* replacing policy or approval systems
* hiding side effects behind vague result strings
* becoming a general workflow engine
* allowing unconstrained plugin execution

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the tool-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The framework must support:

* typed tools
* audited side effects
* approvals
* caches and cheap descriptor/profile reads
* sandbox runtimes for risky execution
* explicit capability exposure boundaries with runtime
* safe extensibility for platform, product, and skill-contributed tools

### From Layer 1.5

The framework must implement:

* tool sources and default profiles
* the effective tool set boundary owned by runtime
* the standard tool lifecycle: `Request -> Validate -> Policy -> Approval -> Execute -> Post-process -> Log`
* schema validation for inputs and outputs
* replay-aware execution
* low, medium, and high risk handling
* subagent restrictions on inherited tools
* identity, scope, run, and execution-space propagation

If this subsystem behavior conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Tool Execution Framework must:

* register and version tool descriptors under stable ids
* keep descriptor versions immutable once published
* maintain the platform-owned internal tool catalog
* maintain named tool profiles, including the default Head Agent internal profile
* resolve candidate tool descriptors for runtime under profile and scope constraints
* validate that candidate tools are actually executable in the current execution context
* validate execution requests against descriptor, schema, and authorization constraints
* dispatch tool execution through the correct adapter under timeout and cancellation rules
* normalize outputs, artifacts, side-effect refs, and failures into structured envelopes
* preserve invocation metadata and raw evidence refs for replay and audit
* support bounded async execution for long-running tools

---

## 8. Core Invariants

The Tool Execution Framework must obey the global platform invariants.

Additional tool-specific invariants:

1. **Exposed capabilities must be executable.**
   The framework must never return candidate tools that are known to be impossible to execute in the current execution path.

2. **Tool exposure and tool execution are separate boundaries.**
   Returning a candidate tool does not authorize execution. Execution requires a runtime-issued authorization envelope.

3. **All side effects must be attributable.**
   File mutations, shell execution, network access, and third-party actions must produce structured trace and artifact records.

4. **Descriptor versions are immutable.**
   Replay and audit depend on being able to reconstruct the exact contract used at execution time.

5. **Subagents do not inherit the Head Agent default tool pack automatically.**
   Child tool access must be an explicitly delegated subset or profile.

---

## 9. Tool Sources and Default Profiles

This section implements the Layer 1.5 Tool Execution Contract.

### Tool sources

The platform may expose tools from:

* the platform-owned internal tool catalog
* agent-configured external or product tools
* skill-contributed tools where allowed

### Rules

* the exact built-in tool list and contracts should be documented in a separate `Internal Tool Catalog and Default Tool Profiles` reference
* the Head Agent may receive a platform default internal tool profile as candidate tools by default
* subagents must not inherit the full Head Agent default profile automatically
* any default profile remains subject to runtime filtering, scope constraints, execution-space availability, and policy

### Head Agent default profile

The framework must support a named, versioned default internal profile:

* `platform.head.default`

This profile is:

* a candidate-tool source, not the final executable set
* versioned and replay-visible
* sourced from the internal catalog rather than copied into runtime config

---

## 10. Internal Tool Catalog Direction

The platform must support an internal tool list with more than ten platform-owned tools, installed by default for the Head Agent through the default profile.

Representative internal tool categories include:

* file read and write
* patch and move operations
* directory listing and glob search
* text search and file inspection
* shell and process execution
* URL fetch and artifact download
* attachment and image inspection

Example built-in tool ids may include:

* `read_file`
* `write_file`
* `patch_file`
* `move_file`
* `copy_file`
* `list_dir`
* `glob_search`
* `search_text`
* `file_stat`
* `make_dir`
* `shell_exec`
* `fetch_url`
* `download_artifact`
* `inspect_attachment`

The exact list, schemas, risk metadata, and default profile composition should be specified in the supporting reference document, not duplicated here.

---

## 11. Runtime Boundary and Effective Tool Set

The runtime owns the final `EffectiveToolSet`.
This subsystem owns candidate resolution and execution-time validation.

### Candidate resolution contract

The framework must:

* expand requested profiles
* include `platform.head.default` when runtime indicates Head Agent defaults are enabled
* merge platform, agent, and skill-contributed candidate sources
* remove tools that are clearly unavailable in the current execution-space or adapter environment
* return descriptors and applied profile refs to runtime

### Effective tool set contract

Runtime computes the effective tool set as the intersection of:

* upstream-available tools
* agent-allowed tools
* collaborative-scope and execution-space constraints
* run-level overrides
* policy restrictions

Rules enforced jointly with runtime:

* only the effective tool set may be exposed to model or subagent reasoning
* when model execution supports tools, the effective tool set is the default tool list for that step
* tool invocation must be validated against the same effective tool set before execution
* exposure decisions must be logged for replay and audit

### Execution-time defense in depth

Even after runtime computes the effective set, the framework must verify:

* the requested tool id and version match the runtime-issued authorization
* the tool is still executable in the resolved execution context
* the descriptor contract has not changed

---

## 12. Descriptor Model

Every tool must be described by an explicit, versioned descriptor.

### Required descriptor properties

* stable `toolId`
* immutable `version`
* explicit input schema
* explicit output schema
* explicit risk classification
* explicit side-effect classification
* explicit determinism declaration
* explicit execution-space requirement
* explicit timeout and resource hints
* explicit adapter binding

### Canonical descriptor model

| Category | Values | Notes |
| --- | --- | --- |
| Risk level | `low`, `medium`, `high` | Determines policy and approval posture. |
| Side-effect class | `none`, `file_io`, `process`, `network`, `external_system` | Declares the primary mutation boundary of the tool. |
| Determinism class | `deterministic`, `environment_bound`, `non_deterministic` | Declares replay posture up front. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolDescriptor` | `toolId`, `version`, `name`, `description`, `inputSchema`, `outputSchema`, `riskLevel`, `sideEffectClass`, `determinismClass`, `requiresExecutionSpace`, `requiresNetwork`, `defaultTimeout`, `adapterBinding` | None | Immutable published descriptor for one tool version. |

### Descriptor rules

* descriptor versions must be immutable after publication
* hidden or undocumented arguments are forbidden
* input and output schemas are part of the stable contract
* descriptor changes require a new version
* non-deterministic behavior must be declared, not inferred later

---

## 13. Profiles and Registry Model

Named profiles keep default tool exposure explicit and replayable.

| Registry contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolRef` | `toolId`, `version` | None | Points to one immutable descriptor version. |
| `ToolProfile` | `profileId`, `version`, `toolRefs`, `defaultEnable`, `notes` | None | Named bundle of candidate tools used during resolution. |
| `CatalogEntry` | `catalogId`, `tool`, `capabilityClass`, `defaultProfiles` | None | Records platform-owned tool membership in default profiles. |

### Registry rules

* profile versions must be pinned for replay and audit
* profile expansion should be deterministic for a fixed registry snapshot
* internal catalog membership must be explicit
* skill-contributed tools must be traceable back to their skill source

### Progressive loading and caches

The framework must follow the Layer 1 progressive-loading principle.

Rules:

* candidate resolution should load only the profiles, descriptors, and skill tool refs relevant to the current run or step
* descriptor snapshots, profile expansions, and compiled schema validators may be cached
* cache hits must not bypass scope checks, execution-space checks, or execution-time authorization checks
* cache state must remain version-aware so replay can reconstruct the exact descriptor and profile set used

---

## 14. Risk, Policy, and Approval Model

This subsystem must fully implement the Layer 1.5 risk posture.

### Risk levels

| Level | Expected Behavior |
| --- | --- |
| `low` | auto-execute after validation and policy allow |
| `medium` | policy-controlled; may auto-execute or require conditions |
| `high` | approval required unless policy explicitly denies first |

### Policy and approval boundary

The framework does not author policy, but it must verify that execution requests arrive with a valid authorization envelope.

The framework must:

* verify the authorization matches `toolId`, `toolVersion`, and `toolCallId`
* verify the authorization matches current scope and execution-space constraints
* verify argument constraints have not materially changed since authorization
* reject execution when authorization is missing, expired, or mismatched
* fail closed on authorization ambiguity

### High-risk tool rules

For shell, network, and file-mutation tools, authorization should be specific enough to cover:

* working directory or path boundaries
* network mode or target constraints
* secret access mode
* timeout and output bounds

The framework must never broaden a request beyond what runtime authorized.

---

## 15. Lifecycle Contract

This subsystem implements the Layer 1.5 lifecycle:

```text
Request -> Validate -> Policy -> Approval -> Execute -> Post-process -> Log
```

### Resolution lifecycle

```text
Runtime asks for candidates
-> expand profiles and candidate sources
-> verify descriptor availability and execution feasibility
-> return candidate descriptors and applied profiles
```

### Execution lifecycle

```text
Runtime sends execution request
-> verify descriptor and effective-set membership
-> validate authorization envelope
-> validate input schema
-> dispatch adapter or sandbox
-> capture outputs and side-effect evidence
-> validate output schema
-> normalize result
-> persist invocation record
-> emit logs and traces
```

### Entry conditions

Before execution starts:

* descriptor version must exist
* execution request must reference the runtime-approved tool set
* authorization must be valid
* required execution-space resources must be available

### Exit conditions

Successful completion requires:

* structured result or async wait handle
* persisted invocation metadata
* replay refs for outputs and artifacts
* trace and log emission

---

## 16. Request, Authorization, and Result Model

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolAuthorization` | `authorizationId`, `toolCallId`, `toolId`, `toolVersion`, `allowedArgumentHash`, `expiresAt` | `collaborativeScopeId`, `executionSpaceId` | Runtime-issued authorization envelope for one concrete call. |
| `ToolExecutionRequest` | `toolCallId`, `runId`, `stepId`, `userId`, `threadId`, `toolSetId`, `toolId`, `toolVersion`, `arguments`, `authorization`, `idempotencyKey` | `collaborativeScopeId`, `executionSpaceId` | Canonical execution request sent by runtime. |
| `ArtifactRef` | `artifactId`, `kind` | None | Points to persisted output or side-effect evidence. |
| `AsyncWaitHandle` | `waitId`, `invocationId`, `toolCallId` | `expiresAt` | Stable handle for non-terminal async work. |
| `ToolError` | `code`, `message`, `retryable` | None | Normalized framework error surface. |

| Tool result status | Meaning |
| --- | --- |
| `succeeded` | Execution completed with a terminal success outcome. |
| `failed` | Execution completed with a terminal failure outcome. |
| `waiting` | Execution remains in progress and must be resumed through a wait handle. |
| `partial` | Execution produced some effect or output but not a clean terminal success. |

| Result contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolExecutionResult` | `status`, `output`, `artifactRefs`, `sideEffectRefs` | `stdoutRef`, `stderrRef`, `waitHandle`, `errorInfo` | Terminal results must not return a wait handle. |

### Request and result rules

* inputs must be schema-validated before execution
* outputs must be serializable or reference-addressable
* side effects must be logged and referenceable
* `ResultWaiting` must include a `WaitHandle`
* terminal results must not return a `WaitHandle`
* the framework must not claim success before result refs are persisted

---

## 17. Execution Strategies and Sandbox Boundary

The framework should support multiple execution strategies.

### Supported strategy classes

* in-process adapters for pure deterministic tools
* sandbox adapters for filesystem, shell, and networked internal tools
* connector adapters for third-party integrations
* async job adapters for long-running tools

### Sandbox rules

* tools touching filesystem, process, or network boundaries must execute inside an `Execution Space`
* descriptors must declare execution-space and network requirements explicitly
* the framework must pass only least-privilege resources into execution
* stdout, stderr, and large outputs should be reference-addressed and size-bounded
* cancellation from runtime must propagate into the active execution backend

### Trust-boundary behavior

Sandbox allocation is not owned here, but sandbox trust rules still apply here.
The framework must treat sandbox execution as the security boundary for:

* file writes
* shell and process execution
* outbound network requests
* secret-bound connector operations

---

## 18. Async, Retry, Cancellation, and Idempotency

The framework must support bounded long-running work without breaking replay or run control.

### Async rules

* long-running tools may return `waiting` with a wait handle rather than blocking indefinitely
* async waits must preserve `runId`, `stepId`, and `toolCallId`
* resumed completion must be attributable to the original invocation
* wait handles must be stable, replay-visible, and safe to poll until they reach a terminal result or expire

### Retry rules

* retries must be explicit and tool-class-aware
* non-idempotent tools must not be retried automatically unless the adapter can prove safe dedupe behavior
* transport or sandbox startup failures may be retryable when no side effect occurred

### Idempotency rules

* the framework should dedupe by `ToolCallID` or explicit idempotency key where allowed
* duplicate requests should return the prior invocation result when safe
* duplicate detection must not hide partial side effects

### Cancellation rules

* runtime cancellation must propagate to active tool execution
* canceled tools must emit terminal records with any partial side-effect evidence

---

## 19. Skill-Contributed Tools and Subagent Restrictions

Layer 1 requires safe extensibility, and Layer 1.5 requires bounded delegation.

### Skill-contributed tools

The framework must support skill-contributed tools where allowed, with these rules:

* each tool must still have a canonical descriptor and version
* source skill identity must be preserved for audit
* skill tools remain subject to the same effective-tool-set filtering as any other tool
* skills must not bypass authorization, sandbox, or replay requirements

### Subagent restrictions

The framework must support child-tool subsets without implicitly copying parent power.

Rules:

* any child tool set must be an explicitly delegated subset or profile
* subagents must not inherit the full `platform.head.default` profile automatically
* child tool availability must remain bounded by the child run scope and execution space

---

## 20. Failure Modes and Recovery

The framework must surface failure precisely and fail closed on unsafe ambiguity.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| descriptor missing | registry lookup failure | tool cannot execute | reject before execution |
| schema validation failure | input or output validation error | tool call invalid | return validation error to runtime |
| authorization mismatch | auth check failure | unsafe ambiguity | fail closed and require runtime re-evaluation |
| sandbox unavailable | dependency failure | internal tools blocked | bounded retry or fail according to tool class |
| connector failure | provider or remote error | tool unavailable | retry or fail according to retry class |
| timeout | deadline exceeded | incomplete action | cancel adapter and return timeout with partial refs where available |
| duplicate tool call | idempotency collision | replay or consistency risk | return prior result when safe or reject |
| artifact-store failure | persistence failure | result capture incomplete | retry persistence or fail closed before claiming success |
| partial side effect | adapter reports partial mutation | uncertain external state | return partial failure with side-effect refs |

### Recovery principles

* fail closed on authorization ambiguity
* prefer prior-result reuse for safe idempotent duplicates
* never claim success without persisted result refs
* preserve partial side-effect evidence even when the overall call fails

---

## 21. Replay and Observability

This subsystem sits on a major audit boundary because many tools can mutate state.

### Required logs

The framework must emit structured logs for:

* candidate tool resolution
* default profile application
* descriptor version selection
* request validation
* authorization verification
* adapter selection
* execution start and end
* artifacts produced
* idempotency hits
* terminal failures

### Required trace spans

At minimum:

* `tool.resolve_candidates`
* `tool.profile_expand`
* `tool.validate`
* `tool.authorize`
* `tool.dispatch`
* `tool.execute`
* `tool.result_normalize`
* `tool.async_wait`

### Replay capture

The framework must preserve:

* descriptor version used
* resolved profile refs
* input argument refs or hashes
* authorization ref
* execution-space ref
* adapter type
* stdout and stderr refs where applicable
* artifact refs
* side-effect refs
* declared determinism class

### Audit visibility

For human inspection, the framework should make visible:

* why a tool was available to the run
* whether the Head Agent default profile contributed that tool
* what authorization was used
* what side effects occurred
* whether execution was sandboxed, connector-based, or async

---

## 22. Configuration Direction

Tool behavior must obey the platform configuration contract and precedence order:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `defaultHeadToolProfile` | default internal profile for Head Agent | string | `platform.head.default` | system or agent |
| `internalToolCatalogVersion` | pin internal catalog version | string | current stable | system |
| `profileVersionPinning` | pin named profile versions | boolean | true | system or agent |
| `maxToolCallDuration` | bound execution duration | duration | conservative | system or tool |
| `maxStdoutBytes` | bound captured stdout size | integer | conservative | system or tool |
| `maxArtifactBytes` | bound artifact size | integer | conservative | system or tool |
| `allowAsyncTools` | permit async adapters | boolean | true | system |
| `toolIdempotencyWindow` | dedupe repeated calls | duration | short | system or tool |
| `perToolConcurrency` | per-tool concurrency limits | map | conservative | system or tool |

### Configuration rules

* all tool configuration must declare scope explicitly
* config precedence must remain traceable and replay-visible
* registry and profile caches may be hot-reloaded, but descriptor versions must remain immutable
* configuration must not silently widen risk posture for existing tools

---

## 23. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `ResolveCandidateTools` | Expand requested profiles and other sources into executable candidate descriptors. | `ToolResolutionInput` | `ToolResolutionResult` |
| `Execute` | Execute one runtime-authorized tool call. | `ToolExecutionRequest` | `ToolExecutionResult` |
| `PollAsync` | Resume or poll one non-terminal tool execution. | `AsyncWaitHandle` | `ToolExecutionResult` |
| `GetDescriptor` | Read one immutable tool descriptor version. | `toolId`, `version` | `ToolDescriptor` |

### Supporting contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolResolutionInput` | `runId`, `rootRunId`, `userId`, `threadId`, `agentProfileId`, `isHeadAgent`, `requestedProfiles`, `skillToolRefs` | `stepId`, `collaborativeScopeId`, `executionSpaceId` | Candidate-resolution request before runtime filtering. |
| `ToolResolutionResult` | `candidateTools`, `appliedProfiles`, `sourceRefs` | None | Returned to runtime for effective-tool-set calculation. |
| `Adapter` | One execution operation taking `ToolDescriptor` plus `ToolExecutionRequest` | None | Encapsulates one backend strategy for a concrete tool. |
| `InvocationStore` | Save one invocation record, load one invocation record by `toolCallId` | None | Persists replay-grade execution history. |
| `ToolInvocation` | `invocationId`, `toolCallId`, `runId`, `stepId`, `tool`, `status`, `adapterType`, `startedAt` | `waitId`, `completedAt` | Records one execution attempt for audit and replay. |

### Behavioral expectations

* `ResolveCandidateTools` should be deterministic for a fixed registry snapshot and profile set
* `Execute` must reject requests for tools not matched by the runtime-issued authorization
* `PollAsync` must preserve the original invocation identity and return either a renewed `waiting` result or a terminal result
* all results must be serializable or reference-addressable
* async tools must return bounded wait states rather than hanging indefinitely

---

## 24. Dependencies

### Upstream dependencies

* Agent Runtime
* configuration service
* agent profile registry
* skill registry

### Downstream and peer dependencies

* Sandbox / Execution Space
* Policy and Approval System
* artifact or object storage
* secret broker
* Observability and Replay
* connector adapters for third-party systems

### Explicit boundary with runtime

Runtime owns:

* final effective-tool-set computation
* model exposure decisions
* policy evaluation and approval orchestration

The Tool Execution Framework owns:

* candidate resolution
* descriptor and profile contracts
* execution-time validation
* adapter dispatch
* result normalization

---

## 25. Tradeoffs and Design Decisions

### Decision: model default tools as versioned profiles

**Why:** keeps default tool packs explicit, reviewable, and replayable  
**Alternative:** hardcode internal tools directly in runtime  
**Consequence:** extra profile management, much cleaner system boundaries

### Decision: runtime owns final filtering, tool framework owns candidate resolution

**Why:** runtime has the full run and step context, while this subsystem owns registry and profile expansion  
**Alternative:** let the tool framework compute final executable exposure alone  
**Consequence:** two-step flow, much clearer separation of concerns

### Decision: verify authorization again inside the framework

**Why:** execution is a safety boundary and needs defense in depth  
**Alternative:** trust runtime blindly once a request arrives  
**Consequence:** extra validation work, better safety against boundary drift

### Decision: Head Agent gets a default internal pack, subagents do not

**Why:** keeps the root agent powerful by default without making delegated runs overpowered  
**Alternative:** give every child the same default pack  
**Consequence:** more delegation bookkeeping, much safer subagent behavior

### Decision: internal tools and external tools share one descriptor contract

**Why:** preserves one execution boundary and one replay model  
**Alternative:** separate internal and external tool systems  
**Consequence:** some adapters need richer metadata, but the platform stays more coherent

---

## 26. Final Position

The Tool Execution Framework should be designed as the platform’s typed capability execution layer.

Its authoritative contract is:

* resolve candidate tools and default profiles for runtime
* maintain immutable descriptor and profile versions
* execute only runtime-approved and authorization-valid tool calls
* normalize outputs, side effects, and failures into structured results
* preserve replay-grade artifacts and audit signals

This subsystem should remain separate from:

* reasoning and tool selection
* policy authoring
* sandbox implementation internals
* application-specific business logic

That separation keeps tool execution explicit, auditable, bounded, and consistent with the Layer 1 and Layer 1.5 contracts.
