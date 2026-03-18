# Frame AI Agent Platform — Layer 2

## Skills System Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Skills System  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Capabilities Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Tool Execution Framework Design
* Policy and Approval System
* Sandbox / Execution Space Design
* Observability and Replay Design
* Self-Improvement System Design
* Internal Tool Catalog and Default Tool Profiles

---

## 2. Purpose

The Skills System is the platform subsystem that turns a published skill package into a **governed, scope-aware, replayable capability**.

It exists because a skill is more than a prompt fragment or plugin entrypoint. The platform must support skills as packaged capabilities composed of:

* instructions
* metadata
* tool references
* policy-sensitive permissions
* optional runtime code
* versioned provenance and audit data

The subsystem owns:

* skill package contracts
* publication and activation governance
* candidate skill resolution
* skill execution orchestration
* skill-contributed tool handoff
* replay-grade capture for skill lifecycle events

The Agent Runtime decides **when a run requests or uses a skill**.  
The Skills System decides **what a skill package means and how an approved skill executes safely**.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Skills System is responsible for:

* defining the immutable skill package descriptor and version contract
* tracking skill provenance, publication state, and audit metadata
* binding skill versions to agents, collaborative scopes, and allowed execution contexts
* resolving candidate skills for a run or step under scope, configuration, and execution-space constraints
* validating declared permissions, runtime bundle refs, instruction refs, and tool contributions
* activating skills only through runtime-issued authorization and policy-compatible execution
* materializing skill instructions and run-state deltas in a context-safe way
* executing optional runtime-backed skills inside the correct execution boundary
* coordinating skill-contributed tool use without bypassing the Tool Execution Framework
* normalizing skill outputs, artifacts, side-effect refs, async waits, and failures
* preserving replay, observability, and deactivation/kill-switch behavior for imported or user-created skills

### Out of Scope

The Skills System does **not** own:

* deciding which skill the model should request at a reasoning step
* the main reasoning loop
* tool descriptor or tool adapter execution internals
* sandbox implementation internals
* policy authoring or approval UX
* memory write persistence
* retrieval indexing or reranking
* thread and identity resolution
* automatic rollout of self-improvement outputs into live skill behavior

This subsystem governs skill packages and execution. It does not replace runtime, policy, tools, memory, or sandboxing.

---

## 4. Architectural Role

The Skills System sits between runtime capability orchestration and the lower-level execution services used by a skill.

```text
Agent Runtime
  -> ask for candidate skills
  -> Skills System
       -> resolve bindings and immutable descriptors
       -> validate permissions and execution feasibility
       -> return candidate skills and skill-contributed refs
  -> runtime computes effective skill exposure
  -> model or runtime requests a skill
  -> policy / approval / authorization
  -> Skills System
       -> materialize instructions or runtime bundle
       -> invoke tool framework / brokers / sandbox as needed
       -> normalize result and replay artifacts
  -> runtime continues reasoning
```

### Upstream inputs

* skill package publications and bindings
* agent profile and run metadata
* collaborative scope and execution-space metadata
* runtime-issued skill authorization
* policy decisions and approval outcomes
* tool descriptor refs for skill-contributed tools

### Downstream outputs

* candidate skill descriptor sets
* skill-contributed tool refs and exposure metadata
* materialized skill context deltas
* normalized skill execution results
* async wait handles for long-running skills
* artifacts, side-effect refs, and replay records
* structured logs, traces, and audit events

---

## 5. Goals and Non-Goals

### Goals

The Skills System must optimize for:

* safe extensibility for platform, product, team, and user-authored skills
* immutable and replayable skill package contracts
* progressive loading of skill metadata and assets
* explicit permission and runtime-boundary declaration
* executable capability exposure only
* clean separation between skill activation and underlying side-effect execution
* scope-aware visibility and governance
* deterministic serialization where skill design permits it
* bounded execution, timeout, and cancellation behavior

### Non-Goals

The Skills System is not trying to optimize for:

* replacing the Agent Runtime orchestration loop
* treating skills as ungoverned arbitrary code plugins
* bypassing tool, memory, network, file, or subagent policy gates
* hiding imported capabilities behind opaque packages with no provenance
* silently mutating live skill behavior in place
* exposing every skill dependency to the model by default

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the skill-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The Skills System must support:

* packaged capabilities composed of instructions, metadata, tools, policies, and optional runtime code
* controlled extensibility for user-created and imported capabilities
* declared permissions for skill execution
* progressive loading of skills only when needed
* approval and policy gates before risky actions
* sandboxed execution when code, file access, or network access is involved
* audited side effects and deterministic serialization where possible
* routing skills into the appropriate runtime path

### From Layer 1.5

The Skills System must implement:

* policy evaluation before skill activation
* checkpoint-safe and resumable skill execution boundaries
* identity and scope propagation on all skill operations
* executable capability exposure only
* replay-grade recording of activation, outputs, policy decisions, and side effects
* bounded delegation when a skill proposes subagent work
* execution-space trust-boundary compliance for runtime code and direct resource access
* predictable configuration precedence for skill visibility and behavior

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Skills System must:

* register immutable skill descriptors under stable ids and versions
* capture provenance for platform-authored, product-authored, imported, and user-authored skills
* maintain skill bindings that determine where a published skill version may be considered for use
* resolve candidate skills and remove packages that cannot execute in the current path
* validate skill descriptors, input schemas, output schemas, runtime bundle refs, and declared permissions
* materialize skill instructions and context deltas without violating the Layer 1.5 context order
* activate skills only through a runtime-issued authorization envelope
* execute runtime-backed skills through governed execution paths and execution-space constraints
* coordinate skill-contributed tool use through the Tool Execution Framework
* normalize skill outputs, artifacts, side effects, async waits, and failures
* emit replay-grade logs, traces, policy refs, and execution records
* support deprecation, disablement, and emergency kill switches without breaking audit or replay

---

## 8. Core Invariants

The Skills System must obey the global platform invariants.

Additional skill-specific invariants:

1. **Skill exposure and skill execution are separate boundaries.**  
   A skill may be visible to runtime reasoning only if it can execute, but visibility does not authorize activation.

2. **Skill package versions are immutable once published.**  
   Replay, audit, and provenance require a stable descriptor, runtime bundle ref, and instruction set.

3. **No skill may bypass downstream governance.**  
   Skill activation approval does not remove the need for policy on tool execution, memory writes, network requests, file writes, or subagent spawning.

4. **Runtime-backed skills execute only through governed boundaries.**  
   Code, filesystem access, process execution, secret access, or network access must remain inside an Execution Space and approved broker/tool path.

5. **Skill-contributed tools remain tools.**  
   They must still use canonical tool descriptors, execution authorization, and replay capture.

6. **Deprecated or disabled skills remain replay-readable.**  
   New activations may be blocked, but prior runs must remain reconstructable.

7. **Skill changes are versioned, not mutated in place.**  
   Self-improvement outputs or operator edits must produce a new candidate version and remain review-governed.

---

## 9. Skill Package and Binding Model

Layer 1 defines a skill as a packaged capability, not just a script.
This subsystem therefore separates:

* immutable skill package descriptors
* mutable scope/agent bindings
* per-run activation records

### 9.1 Skill package contents

Each immutable skill version may contain:

* instruction content refs
* structured metadata
* policy refs or activation constraints
* input and output schemas
* declared permission profile
* tool contributions
* optional runtime bundle ref
* asset refs such as templates or static resources
* provenance and integrity metadata

### 9.2 Binding model

Bindings are the mutable policy/configuration layer that connect a published skill version to:

* an agent profile
* a collaborative scope
* a channel or tenant boundary when applicable
* an activation mode and visibility policy

Bindings are not the same as package definitions.
Changing a binding must not mutate the immutable package contract used for replay.

### 9.3 Canonical descriptor model

| Category | Values | Notes |
| --- | --- | --- |
| Skill kind | `instruction_overlay`, `workflow`, `runtime_extension` | Distinguishes instruction-only, orchestrated, and runtime-backed skill behavior. |
| Risk level | `low`, `medium`, `high` | Declares the minimum policy posture for activation. |
| Determinism class | `deterministic`, `environment_bound`, `non_deterministic` | Declares replay posture up front. |

| Supporting contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolRef` | `toolId`, `version` | None | References one immutable tool version. |
| `ContentRef` | `contentId`, `mediaType`, `hash` | None | Points to instruction or asset content by immutable reference. |
| `RuntimeBundleRef` | `bundleId`, `entrypoint`, `checksum` | None | Required when the skill executes runtime code. |
| `PermissionProfile` | `requiresExecutionSpace`, `filesystemMode`, `networkMode`, `secretScopes`, `allowToolUse`, `allowMemoryProposals`, `allowSubagentProposal` | None | Hidden permissions are forbidden. |
| `SkillProvenance` | `sourceType`, `publisherId`, `checksum`, `signed`, `publishedAt` | `importedFrom` | Preserves publication and import lineage. |
| `SkillToolContribution` | `tool`, `exposureMode`, `notes` | None | Describes how one tool is contributed by the skill. |

| Core contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SkillDescriptor` | `skillId`, `version`, `name`, `kind`, `summary`, `policyRefs`, `inputSchema`, `outputSchema`, `instructionRefs`, `assetRefs`, `toolContributions`, `permissions`, `riskLevel`, `determinismClass`, `provenance` | `runtimeBundle` | Immutable published contract for one skill version. |
| `SkillBinding` | `bindingId`, `skillId`, `version`, `enabled`, `activationMode`, `priority` | `agentProfileId`, `collaborativeScopeId`, `channelId` | Mutable binding layer that connects an immutable skill version to runtime context. |

### 9.4 Descriptor rules

* published versions must be immutable
* instruction refs and runtime bundle refs must be pinned by version or content hash
* policy refs or activation constraints must be traceable and must not widen runtime policy
* hidden permissions are forbidden
* runtime bundle presence is optional, but if present it is part of the immutable contract
* executable skills must declare input and output schemas
* a skill risk level must not understate the risk implied by its permissions or tool contributions

---

## 10. Publication, Validation, and Governance

Layer 1 requires safe extensibility without sacrificing control.
The Skills System therefore owns the admission and governance rules for live skill packages.

### 10.1 Publication states

A skill version should move through explicit publication states:

* `draft`
* `published`
* `deprecated`
* `disabled`

Rules:

* only `published` skill versions may be considered for new activation
* `deprecated` versions may remain bindable only by explicit exception and must remain replay-readable
* `disabled` versions must stop new activation immediately but remain available for audit and replay

### 10.2 Admission rules

Before publication, the subsystem must validate:

* descriptor completeness
* policy ref integrity or policy-hint shape validity
* input and output schema validity
* runtime bundle integrity and entrypoint metadata
* tool contribution refs and version pinning
* permission declaration completeness
* provenance and integrity metadata
* risk classification floor

### 10.3 Governance rules

* imported skills must preserve source provenance
* operator or self-improvement changes must create a new version, not alter a published one in place
* any change that broadens permissions or risk posture must be review-visible
* kill switches must apply at binding and package state levels
* replay must continue to resolve the exact version used by historical runs

---

## 11. Candidate Resolution and Progressive Loading

The platform must load skills only when needed and must not advertise skills that cannot execute.

### Resolution boundary

The Skills System owns candidate resolution.
The Agent Runtime owns the final step-level exposure boundary and the decision about which candidate skills are actually presented to model or subagent reasoning.

### Resolution requirements

Candidate skill resolution must:

* load only the bindings, descriptors, instruction metadata, and tool contribution refs relevant to the run or step
* filter out disabled, unpublished, or out-of-scope skills
* filter out skills whose runtime bundle, execution-space requirement, or required brokers cannot be satisfied
* return enough metadata for runtime to compute final exposure and replay provenance
* surface skill-contributed tool refs separately so runtime and the Tool Execution Framework can apply the normal tool exposure contract

### Progressive loading rules

* instruction content bodies should be loaded only when a skill becomes active or when runtime explicitly needs rendered content for exposure metadata
* runtime bundle assets should be loaded only at activation time
* compiled validators, rendered templates, and descriptor snapshots may be cached
* cache hits must not bypass scope checks, binding checks, execution-space feasibility checks, or package disablement

### Candidate resolution contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SkillRef` | `skillId`, `version` | None | Identifies one immutable skill version. |
| `SkillResolutionInput` | `runId`, `rootRunId`, `userId`, `threadId`, `agentProfileId`, `requestedSkills`, `includeBoundSkills` | `stepId`, `collaborativeScopeId`, `executionSpaceId` | Candidate-resolution request before runtime decides final exposure. |
| `SkillResolutionResult` | `candidateSkills`, `bindingRefs`, `contributedToolRefs`, `sourceRefs` | None | Returned to runtime for effective capability calculation and replay. |

### Resolution rules

* a candidate skill returned here must be executable on the current path if runtime later authorizes it
* resolution must be deterministic for a fixed binding snapshot and package registry state
* runtime exposure decisions based on this result must be logged for replay and audit

---

## 12. Activation and Execution Lifecycle

This subsystem implements the skill-side lifecycle boundary required by Layer 1 and Layer 1.5.

### 12.1 Skill lifecycle

```text
Resolve -> Filter -> Expose -> Request -> Validate -> Policy -> Approval -> Checkpoint -> Execute -> Post-process -> Log
```

### 12.2 Activation boundary

Skill activation must:

* verify the requested skill id and version are in the runtime-approved effective skill set
* verify the authorization envelope matches the current run, step, scope, and execution-space context
* validate the input payload against the skill input schema
* evaluate policy for activation risk before any side effect occurs
* checkpoint before entering any side-effecting execution path

### 12.3 Execution strategies

The subsystem should support at least these strategy classes:

* `instruction_overlay`: materialize instructions or run-state deltas only
* `workflow`: execute bounded logic that may orchestrate declared tools
* `runtime_extension`: execute optional runtime code inside an Execution Space
* `async`: return a stable wait handle for long-running skill work

### 12.4 Post-execution rules

Skill execution must return a normalized result that can be:

* serialized directly
* reference-addressed through artifacts
* resumed from a wait handle
* merged back into runtime working state with provenance

A skill must not write directly to the final user response channel.
It returns structured results to runtime, and runtime remains the source of truth for final response generation.

### 12.5 Activation and result contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SkillAuthorization` | `authorizationId`, `skillCallId`, `skillId`, `version`, `allowedInputHash`, `expiresAt` | `collaborativeScopeId`, `executionSpaceId` | Runtime-issued authorization envelope for one concrete activation. |
| `SkillActivationRequest` | `skillCallId`, `runId`, `stepId`, `userId`, `threadId`, `skill`, `input`, `authorization` | `collaborativeScopeId`, `executionSpaceId` | Canonical request submitted by runtime to activate a skill. |
| `ArtifactRef` | `artifactId`, `kind` | None | Points to persisted outputs or side-effect evidence. |

| Context placement | Meaning |
| --- | --- |
| `agent_profile_extension` | Skill content extends the stable agent-profile layer. |
| `run_state_overlay` | Skill content is injected into the transient run-state layer. |

| Supporting contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SkillContextDelta` | `deltaId`, `placement`, `contentRefs`, `statePatch` | None | Structured context contribution returned to runtime and context assembly. |
| `DelegationProposal` | `objective`, `allowedTools`, `budgetRef` | None | Proposal only; runtime still owns child-run creation. |
| `SkillWaitHandle` | `waitId`, `skillCallId`, `invocationId` | `expiresAt` | Stable handle for async skill execution. |
| `SkillError` | `code`, `message`, `retryable` | None | Normalized activation or execution failure. |

| Skill result status | Meaning |
| --- | --- |
| `succeeded` | Skill produced a terminal success result. |
| `failed` | Skill produced a terminal failure result. |
| `waiting` | Skill remains in progress and must be resumed through a wait handle. |
| `partial` | Skill produced some output or effects but not a clean terminal success. |

| Result contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SkillExecutionResult` | `status`, `output`, `artifactRefs`, `sideEffectRefs`, `toolInvocationRefs`, `memoryCandidateRefs` | `contextDelta`, `delegation`, `waitHandle`, `errorInfo` | Terminal results must not return a wait handle. |

### 12.6 Result rules

* terminal results must be serializable or reference-addressable
* `SkillWaiting` must return a wait handle
* terminal results must not return a wait handle
* success must not be claimed before artifact and side-effect refs are persisted
* skill output schemas must be validated after execution

---

## 13. Policy, Risk, and Approval Model

Layer 1.5 requires policy enforcement before skill activation.
Because skills may wrap instructions, tools, runtime code, or both, skill governance must operate at two layers.

### 13.1 Two-layer enforcement

1. **Skill activation enforcement**  
   Policy evaluates whether this skill version may activate under the current identity, scope, run, and execution-space context.

2. **Underlying action enforcement**  
   Any tool call, memory proposal write, network request, file write, or subagent spawn produced during skill execution must still pass the platform contract for that action type.

Skill approval therefore does not imply blanket approval for all downstream side effects.

### 13.2 Risk levels

| Level | Expected Behavior |
| --- | --- |
| `low` | auto-execute after validation and policy allow |
| `medium` | policy-controlled; may execute with conditions |
| `high` | approval required unless policy denies first |

### 13.3 Risk derivation rules

The declared skill risk floor must consider:

* runtime bundle presence
* filesystem, process, network, or secret permissions
* contributed tool risk
* whether the skill may propose subagent delegation
* whether the skill may create memory-write candidates

### 13.4 Authorization rules

The subsystem must fail closed when:

* authorization is missing
* authorization is expired
* authorization does not match `skillId`, `version`, or `skillCallId`
* scope or execution-space ids do not match
* the input hash materially differs from the authorized request

For high-risk skills, authorization and approval should be specific enough to cover:

* file or path boundaries
* network mode or destination constraints
* secret access scopes
* timeout and resource bounds
* delegated tool subset or delegation allowance

---

## 14. Execution Space and Runtime Environment

Layer 1.5 defines the Execution Space as a trust boundary, not an implementation detail.

### Execution-space rules

* instruction-only skills may execute without an Execution Space when they perform no code execution and no direct side effects
* runtime-backed skills that execute code or touch files, processes, secrets, or networks must execute inside an Execution Space
* a skill that requires an Execution Space must not be exposed if one cannot be allocated or attached on the current path
* runtime-backed skills must receive least-privilege access only

### Runtime environment contract

Skill runtime code must not receive unrestricted host access.
Instead, it should receive governed broker or facade interfaces for:

* tool invocation
* asset reads
* artifact writes
* controlled filesystem access
* controlled network access
* scoped secret access

### Runtime environment contract

| Runtime surface | Operation set | Notes |
| --- | --- | --- |
| Skill runtime | Execute with one environment plus one normalized input payload | Returns one `SkillExecutionResult` or a terminal failure. |
| Runtime environment | Read identity, read permissions, invoke an approved tool, read an asset, write an artifact, obtain filesystem broker, obtain network broker, obtain secret broker | Must not expose unrestricted host access. |

| Supporting contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ExecutionIdentity` | `userId`, `threadId`, `runId`, `stepId` | `collaborativeScopeId`, `executionSpaceId` | Passed into runtime-backed skill code through the governed environment. |

| Broker surface | Operation set | Notes |
| --- | --- | --- |
| File broker | Read file, write file | Must remain bounded by execution-space permissions and path controls. |
| Network broker | Perform a network request through governed payloads | Must preserve sandbox and policy restrictions. |
| Secret broker | Read one scoped secret value | Must enforce allowed secret scopes and preserve audit lineage. |

### Boundary rules

* `InvokeTool` must route through the Tool Execution Framework and preserve policy and replay requirements
* large outputs should be written as artifacts, not returned inline without bounds
* runtime code cancellation must propagate through the active execution backend
* stdout, stderr, and sandbox diagnostics should be captured as artifacts when relevant

---

## 15. Skill-Contributed Tools and Capability Handoff

Layer 1.5 explicitly allows skill-contributed tools where permitted.
The Skills System owns contribution metadata, while the Tool Execution Framework owns canonical tool execution.

### Contribution model

Each skill-contributed tool must declare:

* the exact tool id and version
* whether it is visible to model/runtime reasoning or internal to the skill runtime only
* any notes or constraints relevant to exposure

### Rules

* every contributed tool must still have a canonical tool descriptor and immutable version
* contributed tools must be traceable back to the source skill id and version
* contributed tools must not bypass runtime effective-tool-set filtering
* skill-internal tool calls must still route through Tool Execution Framework execution authorization
* if a contributed tool cannot execute in the current execution space or scope, it must not be advertised

### Exposure modes

Representative exposure modes:

* `candidate`: the tool may be handed to runtime as a candidate source for effective tool set calculation
* `internal`: the tool may be used only inside skill execution through the governed tool invoker

This distinction lets the platform support skill-packaged tools without forcing every internal helper tool to be model-visible.

---

## 16. Context Assembly Interaction

Layer 1.5 defines a strict context order.
Skills must fit that contract rather than invent a new top-level context layer.

### Context placement rules

* inactive skill packages must not dump full instruction bodies into every model call
* statically bound, always-on skill guidance may be rendered as an extension of the agent profile layer when configured as part of the agent identity
* dynamically activated skill guidance must be rendered as part of the run working state layer through a `SkillContextDelta`
* skill instructions must never override system instructions or collaborative scope policies
* memory and RAG results must remain distinct even when a skill consumes or transforms them

### Provenance rules

For any materialized skill context, the subsystem must preserve:

* skill id and version
* content refs used
* placement decision
* reason for inclusion
* token or size cost where relevant

### Runtime interaction

The Skills System may return context deltas, but the Agent Runtime and Context Assembly subsystem remain responsible for:

* assembling the final model-facing snapshot
* preserving the strict context order
* recording inclusion and exclusion decisions for replay

---

## 17. Subagent, Memory, and External Action Boundaries

Skills may coordinate complex work, but bounded delegation and downstream governance still apply.

### Subagent rules

* a skill may propose subagent work, but it must not create a child run directly outside runtime orchestration
* any delegation proposal must include bounded objective, allowed tools, and budget metadata
* policy must run before subagent spawning when scope or capability changes
* child tools must be an explicit subset or delegated profile, never the full Head Agent default pack by inheritance

### Memory rules

* a skill may emit memory candidates or structured facts for later memory evaluation
* a skill must not bypass the Memory System write pipeline
* policy still applies before any accepted memory write

### External action rules

* file writes, network access, process execution, and connector calls remain attributable side effects
* any side effect produced by runtime-backed skill code must emit structured evidence refs
* skill code must not hide side effects behind opaque success strings

---

## 18. State, Checkpoints, Async, and Resume

Layer 1.5 requires skill steps to be recoverable and checkpoint-safe.

### Required checkpoint boundaries

The combined runtime and skill execution path must checkpoint:

* before entering `waiting_approval` for a skill
* before any external side effect during skill execution
* after each completed skill step
* before terminal completion of a skill-mediated run step

### Resume rules

* skill execution must resume only from a validated checkpoint boundary
* completed side effects must not be replayed blindly on resume
* async waits must preserve `runId`, `stepId`, and `skillCallId`
* resumed completion must remain attributable to the original skill invocation

### Idempotency and retry rules

* retries must be explicit and skill-class-aware
* instruction-only skills may be retried more freely when no side effects occurred
* runtime-backed skills with side effects must not be retried automatically unless safe dedupe can be proven
* duplicate skill-call detection should return the prior persisted result when safe

---

## 19. Replay and Observability

The Skills System sits on a major audit boundary because skills may change instructions, invoke tools, or execute runtime code.

### Required logs

The subsystem must emit structured logs for:

* candidate skill resolution
* binding selection
* package version selection
* permission and risk evaluation
* authorization verification
* activation start and completion
* materialized context deltas
* runtime bundle execution start and end
* skill-contributed tool usage
* side-effect evidence creation
* waits, retries, failures, deprecations, and disablement blocks

### Required trace spans

At minimum:

* `skill.resolve_candidates`
* `skill.bindings_load`
* `skill.validate`
* `skill.authorize`
* `skill.materialize`
* `skill.execute`
* `skill.tool_invoke`
* `skill.result_normalize`
* `skill.async_wait`

### Replay capture

The subsystem must preserve:

* skill id and version
* binding ref used for activation
* descriptor and runtime bundle refs
* instruction content refs and hashes when materialized
* input payload ref or hash
* authorization ref
* policy decision refs
* execution-space ref
* tool invocation refs
* artifact refs and side-effect refs
* declared determinism class
* wait handles and completion records for async work

### Replay behavior

* deterministic skills may support exact replay from recorded inputs and outputs
* environment-bound or non-deterministic skills must declare that property up front
* replay should prefer recorded outputs, simulated execution, or explicit skip behavior rather than re-emitting live side effects

### Human audit visibility

For inspection and debugging, the platform should make visible:

* why a skill was available to the run
* what permissions it declared
* whether it executed as instruction-only or runtime-backed
* what tools or side effects it used
* what context delta it contributed

---

## 20. Configuration Direction

Skill behavior must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `allowImportedSkills` | allow imported non-platform skills | boolean | conservative | system or scope |
| `requireSignedSkills` | require signature/integrity for activation | boolean | true for high-trust envs | system |
| `defaultBoundSkills` | default skill refs bound to an agent | list | empty or product-defined | agent |
| `allowSkillCandidateExposure` | expose candidate skills to reasoning | boolean | true | system or agent |
| `allowSkillContributedCandidateTools` | permit skill tools to join candidate tool resolution | boolean | conservative | system or agent |
| `maxSkillExecutionDuration` | bound skill runtime duration | duration | conservative | system or skill |
| `maxSkillArtifactBytes` | cap skill artifact storage | integer | conservative | system or skill |
| `maxSkillDepth` | cap nested skill chaining or recursion | integer | low | system or run |
| `skillKillSwitches` | deny listed skills or publishers | list | empty | system or scope |

### Configuration rules

* all skill config must declare scope explicitly
* binding changes and configuration overrides must be traceable
* caches may be refreshed, but published skill versions must remain immutable
* configuration must not silently broaden permissions for a published skill version

---

## 21. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `ResolveCandidateSkills` | Expand bindings and requests into executable candidate skills. | `SkillResolutionInput` | `SkillResolutionResult` |
| `Activate` | Validate, authorize, and execute one skill activation request. | `SkillActivationRequest` | `SkillExecutionResult` |
| `PollAsync` | Resume or poll one non-terminal skill execution. | `SkillWaitHandle` | `SkillExecutionResult` |
| `GetDescriptor` | Read one immutable skill descriptor version. | `skillId`, `version` | `SkillDescriptor` |

### Replay store contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `InvocationStore` | Save one invocation record, load one invocation record by `skillCallId` | None | Persists replay-grade skill execution history. |
| `SkillInvocation` | `invocationId`, `skillCallId`, `runId`, `stepId`, `skill`, `status`, `startedAt` | `waitId`, `completedAt` | Records one execution attempt for audit and replay. |

### Behavioral expectations

* `ResolveCandidateSkills` should be deterministic for a fixed registry snapshot and binding set
* `Activate` must reject requests not matched by runtime-issued authorization
* `PollAsync` must preserve the original invocation identity and return either renewed `waiting` or a terminal result
* `GetDescriptor` must return the immutable descriptor used for replay when the version still exists in historical records

---

## 22. Failure Modes and Recovery

The subsystem must fail closed on unsafe ambiguity and preserve evidence for audit.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| skill descriptor missing | registry lookup failure | skill cannot activate | reject before activation |
| binding disabled or out of scope | binding validation failure | skill unavailable | remove from candidates or reject |
| schema validation failure | input or output validation error | invalid skill call | return validation failure to runtime |
| authorization mismatch | auth check failure | unsafe ambiguity | fail closed and require runtime re-evaluation |
| policy deny | policy decision deny | no activation | return terminal denial with refs |
| approval timeout | approval wait expiry | run blocked | return wait expiry and preserve checkpoint |
| runtime bundle unavailable | bundle resolution failure | runtime-backed skill blocked | reject before execution |
| execution-space unavailable | dependency failure | skill cannot run safely | remove from candidates or fail activation |
| contributed tool failure | downstream tool error | skill incomplete | return partial or failed result with tool refs |
| artifact persistence failure | persistence failure | replay capture incomplete | retry persistence or fail closed before success |
| partial side effect | broker/tool reports partial mutation | uncertain external state | return partial result with evidence refs |

### Recovery principles

* fail closed on authorization or scope ambiguity
* never claim success without persisted result refs
* preserve side-effect evidence even when the overall skill fails
* prefer prior-result reuse for safe duplicate skill calls

---

## 23. Final Architectural Position

The Skills System should be treated as a **governed capability packaging and execution subsystem**, not as an unbounded plugin host.

It must keep these separations explicit:

* skill package lifecycle vs runtime orchestration
* skill activation vs tool execution
* skill-contributed context vs canonical context order
* optional runtime code vs execution-space trust boundary
* imported extensibility vs governance, replay, and audit

If implemented to these contracts, the platform can support rich skill ecosystems without weakening policy-first execution, replayability, or scope isolation.
