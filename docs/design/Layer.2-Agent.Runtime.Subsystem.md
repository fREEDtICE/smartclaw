# SmartClaw Agent Platform — Layer 2

## Agent Runtime Subsystem Design

Based on the platform architecture and contracts defined from the blueprint document. 

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Agent Runtime
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Platform Runtime Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Context Assembly Subsystem Design
* Channel Gateway
* Identity and Thread Management
* Model Access / Routing Design
* LLM Provider Abstraction Design
* Memory System Design
* Tool Execution Framework
* Internal Tool Catalog and Default Tool Profiles
* Subagent Profiles and Delegation Contracts
* Policy and Approval System
* Sandbox / Execution Space Design
* Observability and Replay Design

---

## 2. Purpose

The Agent Runtime is the **execution kernel** of the platform. It is responsible for turning an inbound user interaction into a governed, stateful, replayable agent run.

It exists to coordinate:

* context assembly
* reasoning execution
* tool and skill invocation
* subagent delegation
* checkpointing
* run lifecycle transitions
* final response production

The Agent Runtime is a separate subsystem because orchestration logic must remain distinct from:

* memory storage
* retrieval infrastructure
* tool implementation
* sandbox execution
* policy definition
* observability backends

The runtime owns **execution coordination**, not all the services it coordinates.

---

## 3. Scope

### In Scope

The Agent Runtime is responsible for:

* creating and managing Agent Runs
* accepting only authenticated, runnable start inputs from upstream identity/auth handling
* maintaining runtime state during execution
* coordinating the run lifecycle
* assembling execution context from upstream sources
* invoking model reasoning loops
* routing tool, skill, and subagent requests
* pausing for approvals when required
* checkpointing state
* triggering memory extraction hooks
* emitting runtime events for tracing and replay

### Out of Scope

The Agent Runtime does **not** own:

* raw user authentication, credential verification, or factor proofing
* first-contact pairing UX or hardware-mediated pairing ceremonies
* long-term memory persistence logic
* retrieval indexing or reranking logic
* tool business logic implementation
* skill package installation or audit
* policy authoring
* sandbox isolation implementation
* observability storage implementation
* channel-specific delivery logic
* model vendor SDK internals

---

## 4. Architectural Role

The Agent Runtime sits on the **live execution path** of nearly every user interaction.

### Upstream inputs

* canonical inbound message/event from Channel Gateway
* authenticated start disposition and pairing/linkage outcome from upstream auth/identity handling
* resolved identity and thread metadata from Identity Layer
* memory retrieval results
* RAG results
* agent profile/configuration
* policy decisions
* tool/skill registry metadata

### Downstream outputs

* model requests
* tool/skill/subagent execution requests
* checkpoint records
* approval wait states
* final response payload
* runtime events, traces, and logs
* memory extraction candidates

### Primary consumers

* Channel Gateway
* Policy System
* Tool Execution Framework
* Skills System
* Memory System
* Observability / Replay
* Approval workflows

### Execution path

* live path: yes
* asynchronous path: yes, for resumed runs and delegated work
* scheduled path: limited, mainly for resumed or triggered runtime work rather than self-improvement

---

## 5. Goals and Non-Goals

### Goals

The Agent Runtime must optimize for:

* correctness of execution flow
* resumability
* replayability
* explicit step semantics
* clear state transitions
* policy compliance
* modular orchestration
* extensibility for tools, skills, and subagents
* executable capability exposure
* observability
* bounded execution
* graceful degradation

### Non-Goals

The Agent Runtime is not trying to optimize for:

* maximum model-specific feature exploitation at the core interface layer
* raw lowest possible latency at the expense of traceability
* owning all business logic
* embedding retrieval and memory logic directly in the runtime
* bypassing policy for convenience
* becoming a monolithic “god subsystem”

---

## 6. Canonical Responsibilities

The Agent Runtime must:

* create and initialize Agent Runs with required identifiers and metadata
* fail closed on unresolved authenticated-start or required pairing/linkage preconditions
* assemble execution context under ordering, scoping, and token-budget constraints
* compute the effective tool/capability set from upstream inputs, scope, agent config, and policy
* execute the reasoning loop under bounded runtime policies
* pass the effective default tool list into model execution for tool-enabled steps
* run ordered middleware around model calls, external actions, and state transitions
* route tool requests through validation and policy-aware execution paths
* coordinate skill execution without owning skill package lifecycle
* coordinate subagent delegation with inherited scope, bounded budgets, and bounded child context
* persist checkpoints at required lifecycle boundaries
* transition run states predictably across active, paused, completed, failed, and cancelled states
* emit structured runtime events for tracing, auditing, and replay
* trigger post-run extraction hooks such as memory candidate generation
* support resumption from checkpoints after interruption, approval, or failure where allowed

---

## 7. External Contracts

### Inputs

For starting a new run, the runtime requires at minimum:

* a `RuntimeStartEnvelope` from Identity and Thread Management that contains a valid `PreRunEnvelope`
* an upstream-authenticated runnable start outcome when the channel/product requires verified account linkage or first-contact pairing
* canonical input message/event
* applicable agent configuration
* session/thread metadata
* policy context
* model access context
* candidate tool definitions or tool registry refs
* default internal tool profile refs for the Head Agent when configured

For resuming or operating on an existing run, the runtime requires at minimum:

* `runId`
* persisted run state or checkpoint context as applicable
* policy, model, and capability context required for the resumed boundary

Optional but common inputs:

* `collaborativeScopeId`
* authenticated channel-account or pairing audit refs
* authentication or linkage assurance metadata
* prior thread summary
* memory retrieval results
* RAG results
* attachment analysis results
* resume checkpoint reference
* approval decision payload
* active skill handles/metadata

### Outputs

The runtime produces:

* final response content or structured response artifact
* tool/skill/subagent invocation requests
* effective tool/capability exposure records
* reasoning step records
* approval wait requests
* checkpoint snapshots
* memory extraction candidates
* runtime lifecycle events
* trace/log payloads
* terminal run result metadata

### Required metadata

Rules:

* runtime start must consume a valid `PreRunEnvelope`
* runtime start must not proceed from an unresolved first-contact pairing or blocked channel-account linkage outcome
* once runtime creates or resumes the run, every runtime operation must propagate a `RunEnvelope`
* active-run propagation must include:
  * `runId`
  * `userId` when known
  * `threadId` when thread-bound
  * `collaborativeScopeId` when applicable
  * `executionSpaceId` when execution isolation is involved
  * agent/profile identifier
  * timestamps and causal references

### Pre-run authentication and pairing boundary

The runtime is downstream of channel authentication, identity resolution, and account-link verification.

It may consume only one of two upstream start dispositions:

* a runnable start outcome carrying a valid `RuntimeStartEnvelope`
* a non-runnable pairing/linkage outcome that must be returned to the channel without creating an `AgentRun`

Rules:

* first-contact pairing must normally occur before runtime allocates `runId`
* unresolved pairing is a blocked-start condition, not a normal run state
* pairing challenge creation, OTP/NFC/Bluetooth/GUI proofing, and link persistence remain upstream concerns even when runtime-hosted middleware participates in gating
* if product policy allows guest starts, that allowance must be explicit and auditable; pairing/linkage requirements must otherwise fail closed
* pairing completion should re-enter the platform as a fresh runnable start or equivalent upstream resolution output, not as an implicit mutation of an already-running agent

### Preserved invariants

The runtime directly enforces:

* state must be recoverable
* execution must be observable
* identity must be propagated
* authenticated start posture must be preserved
* policy must precede external side effects
* exposed capabilities must be executable in the current scope
* memory and retrieval remain distinct inputs
* replay capture requirements are satisfied

---

## 8. Internal Model

### Core entities

#### `AgentRun`

The top-level execution record for one runtime instance.

Suggested fields:

* `runId`
* `rootRunId`
* `parentRunId?`
* `threadId`
* `userId`
* `channelAccountId?`
* `collaborativeScopeId?`
* `status`
* `entrypoint`
* `authContextRef?`
* `startTime`
* `endTime?`
* `currentStepId`
* `currentCheckpointRef?`
* `executionMode`
* `finalOutputRef?`
* `failureInfo?`

#### `RuntimeContext`

The assembled execution context available to the reasoning engine.

Suggested fields:

* system instructions
* policies
* agent profile
* thread summary
* memory results
* RAG results
* current input
* working state
* effective tool set ref
* token budget metadata
* inclusion provenance

#### `RuntimeWorkingState`

Short-lived mutable state used within a run.

Suggested contents:

* current plan/todo items
* pending tool calls
* tool results cache refs
* active subagent refs
* approval wait info
* retry counters
* summarization refs
* temporary derived variables

#### `EffectiveToolSet`

The validated set of tools/capabilities the runtime may expose and execute for a run or step.

Suggested contents:

* `toolSetId`
* `runId`
* `stepId?`
* `candidateToolRefs`
* `effectiveToolRefs`
* `filteredOutToolRefs`
* `decisionReasons`
* `sourcePolicies`
* `computedAt`

#### `ReasoningStep`

A single bounded iteration of runtime reasoning and orchestration.
This is a primary persisted entity for replay and resume, with traces linked secondarily by ids.

Suggested contents:

* `stepId`
* `runId`
* `status`
* `inputContextRef`
* `effectiveToolSetRef`
* `modelRequestRef?`
* `modelResponseRef?`
* `decisionType`
* `actionRefs`
* `traceRefs`
* `checkpointRef?`

#### `SubagentContextSpec`

The bounded handoff contract used to initialize a child run.

Suggested contents:

* `contextSpecId`
* `parentRunId`
* `childRunId`
* `taskContract`
* `summaryRef`
* `evidenceRefs`
* `allowedTools`
* `budget`
* `inheritanceRules`
* `mergeContract`

#### `Checkpoint`

A resumable snapshot of runtime state.

Suggested contents:

* `version`
* `runId`
* `stepId`
* run metadata
* run state snapshot
* current loop state
* context references
* working state
* completed actions
* pending actions
* model invocation history refs
* effective tool set ref
* policy decision refs
* replay metadata
* replay refs

#### `SubagentTask`

A delegated bounded task managed by the runtime.

Suggested contents:

* taskId
* parentRunId
* scope metadata
* assigned budget
* allowed tools
* task contract
* context spec ref
* merge contract
* state
* result ref

### Derived views

* active run timeline
* effective tool exposure timeline
* current execution graph
* pending approval queue
* subagent tree
* replay sequence

---

## 9. Lifecycle / Execution Flow

### Standard runtime lifecycle

```text
1. Receive canonical execution request
2. Validate required identifiers, authenticated-start prerequisites, dependencies, and execution lease preconditions
3. If first-contact pairing or verified-linkage requirements are unresolved, emit a pairing/linkage challenge outcome and stop before run creation
4. Create or resume Agent Run
5. Load applicable configuration, policy context, and candidate tool/skill metadata
6. Assemble RuntimeContext and persist context inclusion provenance
7. Compute EffectiveToolSet for the run or current step
8. Apply run-start middleware
9. Open a new reasoning step boundary
10. Call Model Access with context plus effective default tool list when supported
11. Validate the model result into exactly one decision:
   - model-only continuation
   - tool request
   - skill request
   - subagent request
   - approval wait
   - final response
   - failure
12. Before any external action:
   - run before-action middleware
   - validate request
   - evaluate policy / approval
   - persist pre-action checkpoint
   - dispatch request
13. Receive result or wait state
14. Run after-action middleware and update working state
15. Persist post-step checkpoint where configured
16. Repeat until termination condition
17. Produce final output
18. Trigger post-run hooks
19. Emit terminal events, persist final run status, and release execution lease
```

### Step boundary semantics

Each loop iteration must create a `ReasoningStep` record that:

* has a stable `stepId`
* references the exact context and tool set used
* records one decision class before any external action executes
* is resumable only from a validated step boundary

### Resume semantics

When resuming:

* runtime restores the latest valid checkpoint
* runtime recreates the active `ReasoningStep` or opens a new one
* runtime must not re-emit external side effects unless the checkpoint proves they did not complete
* runtime re-applies middleware only from the restored boundary forward
* runtime must not silently re-run first-contact pairing; any required re-authentication must arrive as an explicit upstream resume/start allowance

### Entry conditions

Before execution starts:

* channel/auth middleware must already have produced a runnable start outcome or an explicit blocked-start/pairing outcome
* identity and thread must already be resolved
* canonical message/input must be available
* runtime configuration must be resolvable
* required model/tool registry access must be available
* run must either be new or have a valid checkpoint for resume

### Exit conditions

Successful completion requires:

* final output or terminal artifact produced
* final run state persisted
* terminal events emitted
* required post-run hooks scheduled or completed
* final checkpoint or end-state snapshot recorded

### Failure exits

The runtime may exit into:

* `failed`
* `waiting_approval`
* `paused`
* `cancelled`

Recovery paths:

* resume from checkpoint
* retry from bounded step
* operator/manual intervention
* user-visible error response with preserved traceability

---

## 10. Run State Model

### Run states

```text
queued
-> initializing
-> running
-> waiting_approval
-> paused
-> resuming
-> completed
-> failed
-> cancelled
```

### State semantics

* `queued`: accepted but not yet executing
* `initializing`: validating inputs and assembling prerequisites
* `running`: active reasoning or orchestration in progress
* `waiting_approval`: blocked on human or policy-driven approval
* `paused`: intentionally stopped, resumable later
* `resuming`: restoring from checkpoint
* `completed`: finished successfully
* `failed`: terminated unsuccessfully
* `cancelled`: explicitly stopped by user/system/operator

### Transition rules

* only one active execution owner may hold a run at a time
* `waiting_approval` and `paused` must always have a resumable checkpoint
* terminal states are immutable except for audit annotations
* `failed` runs may produce new child retry runs but should not be silently mutated back to `running`
* unresolved first-contact pairing must remain outside the run-state machine unless a later product design explicitly introduces a separate pre-run state model

---

## 11. Checkpointing Strategy

### Why checkpointing exists

Checkpointing supports:

* resumability
* approval pauses
* deterministic replay
* fault recovery
* debugging

### Required checkpoint boundaries

The runtime must checkpoint:

* after context assembly
* before any external side effect
* after each completed tool/skill/subagent step
* before entering `waiting_approval`
* before final completion
* at configurable intervals for long reasoning loops

### Checkpoint granularity

A checkpoint should include:

* run metadata
* checkpoint schema version
* current `stepId`
* run state snapshot (`status`, `currentStepId`, timestamps)
* working state
* completed action refs
* pending action refs
* context references, not always full inline payloads
* effective tool set ref
* policy decision refs
* replay-critical references
* deterministic serialization of action requests/results where possible

### Minimum checkpoint schema

The minimum schema required for reliable resume across version upgrades is:

```text
Checkpoint {
  version
  runId
  stepId

  runStateSnapshot
  contextRefs
  workingState
  completedActions
  pendingActions
  modelHistoryRefs
  effectiveToolSetRef
  policyDecisionRefs
  replayMetadata
}
```

### Checkpoint design rules

* checkpoint writes must be idempotent
* checkpoint reads must restore a single consistent execution point
* runtime should prefer reference-based storage for large blobs
* checkpoint versioning must support future schema evolution
* checkpoints must encode whether an external action was started and whether it completed
* resume across version upgrades must use explicit migration or declared fallback replay, never silent corruption
* valid checkpoint boundaries remain post-context assembly, post-step, or pre-action

---

## 12. Context Assembly Interaction

The runtime **uses** context assembly but does not own all context sources.

### Required context ordering

The runtime must respect the Layer 1.5 order:

1. system instructions
2. collaborative scope policies
3. agent profile
4. thread summary
5. memory retrieval
6. RAG results
7. current user input
8. run working state

### Runtime responsibilities in context assembly

* request inputs from upstream systems
* apply precedence and ordering
* enforce token budgeting
* compress or summarize when needed
* track inclusion provenance
* keep memory and RAG logically separate
* avoid leaking cross-scope content
* produce bounded context packs for subagents

### Context inclusion record

For replay and audit, the runtime should record:

* which context blocks were included
* which were excluded
* why exclusion happened
* token cost per block/category
* source refs for memory and RAG blocks

### Subagent context bootstrap

When spawning a child run, the runtime must build a bounded `SubagentContextSpec` that includes:

1. inherited system instructions and applicable scope policies
2. delegated task contract and success criteria
3. parent-produced summary and relevant evidence refs
4. effective child tool set
5. assigned budgets and timeout

By default it must exclude:

* the full parent scratchpad
* unrelated memory/RAG blocks
* tools outside the delegated contract

---

## 13. Reasoning Engine Model

The runtime does not directly choose provider/model variants by hardcoded logic.
It passes step-level execution requirements to the Model Access and Routing subsystem, which selects an appropriate model based on:
* task complexity
* latency sensitivity
* token/context requirements
* tool-use capability needs
* multi-modal input/output requirements
* budget and policy constraints
* fallback availability

### Core reasoning loop

The runtime should support a bounded loop similar to:

```text
observe(context, working_state, prior_results)
-> execute model step with effective tool set
-> validate structured step decision
-> if external action requested: orchestrate action
-> update working state
-> continue or stop
```

### Step contract

Each reasoning step consumes:

* assembled runtime context
* current working state
* effective tool set for that step
* prior action results

Each reasoning step must emit exactly one decision class:

* `respond`
* `continue`
* `tool_requests`
* `skill_request`
* `spawn_subagent`
* `wait_approval`
* `fail`

### Model interaction contract

For tool-enabled model steps, the runtime should:

* pass the `EffectiveToolSet` as the default tool list
* record the exposed tool ids and exposure reason codes
* reject model-selected tools that are not in the effective set
* treat tool selection as a request only, not as execution authorization

### Model execution seam

For each model-backed step, the runtime is the orchestrator across routing and provider execution.

It must:

* send Routing one step-level intent containing route profile, capability requirements, actual token posture, stream mode, and applicable route-selection policy lineage
* treat the returned `RoutingDecision` as the authoritative target-choice artifact for that attempt sequence
* create or attach a `ProviderEgressAuthorization` only after a routed target is chosen
* send the provider layer one concrete `GenerationRequest` bound to the routed target and egress authorization
* keep checkpointing, retry policy, failover decisions, and final step state in runtime ownership

The runtime must not let the provider layer silently pick fallback targets or bypass routed target choice.

### Middleware pipeline

The runtime should support ordered middleware around the core loop.

Middleware may:

* enrich metadata
* validate start-time authentication/linkage posture
* enforce quotas or budgets
* attach deterministic annotations
* emit tracing and metrics

Middleware must not:

* perform opaque credential proofing without upstream provenance
* bypass policy
* introduce uncheckpointed side effects
* mutate model or tool results without provenance

Required interception points:

* before run acceptance
* run start
* before model call
* after model call
* before external action dispatch
* after external action completion
* before state transition
* finalize

### Middleware failure policy

Fail closed by default for hooks that protect safety or correctness:

* `BeforeRunStart` when enforcing authenticated-start, linkage, guest-start, or pairing requirements
* `BeforeAction`
* `BeforeTransition`
* `BeforeModel` when enforcing budgets, policy, or capability constraints
* policy-related middleware

Fail open by default for hooks that are observational or advisory:

* `AfterModel`
* `AfterAction`
* `OnFinalize`
* best-effort observability emitters

Middleware registration should declare whether the hook is safety-critical or best-effort.

### Supported execution modes

* direct response
* tool-augmented reasoning
* skill-mediated reasoning
* delegated subagent reasoning
* approval-gated execution
* replay mode
* dry-run / evaluation mode

### Streaming and replay contract

Streaming output is a non-authoritative side channel.
Replay-authoritative output is the finalized response artifact recorded for the step.

Required behavior:

* stream chunks must be associated with a `stepId` when recorded
* stream emission must be cancelable
* streaming must not itself trigger irreversible side effects
* a step becomes `respond` only when the final output artifact is checkpointed

Replay modes:

* exact replay: reconstruct final output only
* debug replay: optionally simulate stream tokens best-effort from recorded data

### Termination conditions

A run must terminate when:

* final answer is produced
* loop limit is reached
* token budget is exhausted
* approval is required
* fatal policy denial occurs
* unrecoverable subsystem failure occurs
* explicit cancel signal is received

### Runtime controls

The runtime must support:

* max loop count
* step timeout
* total runtime timeout
* token budget ceiling
* fanout limit for subagents
* max outstanding tool requests
* cancellation propagation

---

## 14. Tool / Skill / Subagent Orchestration

### Effective tool / capability set

The runtime does not implement tools or skills, but it does own capability exposure on the execution path.

It must:

* accept candidate tools from upstream registries/configuration
* include the platform default internal tool profile for the Head Agent when configured
* validate tool schemas and metadata before exposure
* filter by agent configuration, collaborative scope, execution space, run overrides, and policy
* persist the resulting `EffectiveToolSet`
* pass the effective tool set to Model Access as the default tool list for tool-enabled steps
* reject and log any attempted invocation outside the effective set

### Tool orchestration

The runtime does not implement tools. It:

* validates that the requested tool is in the current effective tool set
* validates the action request shape
* attaches scope and run metadata
* runs before/after action middleware hooks
* persists pre-action checkpoint
* sends request to Tool Execution Framework
* receives structured result
* updates working state
* records replay refs

### Skill orchestration

The runtime does not install or audit skills. It:

* selects or loads allowed active skills
* passes execution parameters
* coordinates invocation boundaries
* receives results or failures
* ensures policy gates are respected

For skill-contributed tools, the runtime is the seam owner between Skills and Tool Execution.
It must merge skill-contributed candidate refs into normal effective-tool-set computation, and it must never allow a skill-contributed tool to bypass standard tool authorization or execution-time validation.

### Subagent orchestration

The runtime is responsible for delegation logic.

It must:

* define task contracts
* assign scope-limited budgets
* restrict available tools/capabilities
* build bounded child context specs
* preserve parent-child trace linkage
* collect and merge results
* prevent unbounded recursion/spawning

### Delegation rules

A subagent may only be created when:

* the task is explicitly bounded
* delegated scope is defined
* budget/timeout/tool set are declared
* parent run remains the source of truth for final response

The runtime should prefer subagent delegation when:

* the task is complex and decomposable
* the work benefits from parallelism
* a narrower tool/context boundary would improve safety or focus
* the task is long-running enough to bloat the parent loop

The runtime should avoid subagents when:

* the action is trivial
* the work is tightly coupled to the live parent conversation
* the task needs the full parent context to remain coherent

### Subagent context initialization

Child runs should be initialized from a `SubagentContextSpec` containing:

* delegated objective and success criteria
* inherited identity and scope lineage
* bounded summary of relevant parent context
* curated memory/RAG evidence refs
* effective child tool set
* budget, timeout, depth, and fanout controls

Child runs should not inherit the full parent scratchpad by default.
Child runs also should not receive the full Head Agent default internal tool pack unless it is explicitly delegated.

### Subagent result merge

Each child should return:

* a structured result artifact
* provenance refs
* unresolved questions/failures

The parent remains responsible for acceptance, synthesis, or replanning.

### Subagent runtime implementation

By default, subagents should run through the same Agent Runtime implementation as the parent.

Specialized runtimes are allowed only when they:

* implement the same lifecycle and checkpoint contracts
* emit compatible `ReasoningStep` records
* preserve policy, replay, and parent-child trace linkage

---

## 15. Policy Touchpoints

The runtime is not the Policy System, but it is the **main enforcement carrier** on the execution path.

### Runtime policy touchpoints

The runtime must invoke policy checks before:

* exposing tools/capabilities when policy constrains advertised actions
* tool execution
* skill activation/execution where required
* memory write requests
* networked actions
* file system mutation requests
* cross-scope data access
* spawning subagents with elevated capability

### Runtime behavior on policy outcomes

#### Allow

* continue execution

#### Deny

* block action
* record denial reason
* either recover, replan, or fail depending on severity

#### Require approval

* checkpoint state
* transition to `waiting_approval`
* resume only with approval payload

### Important rule

The runtime must never “helpfully bypass” policy by reissuing equivalent unsafe actions through another path.
Filtering tool exposure also does not replace per-action policy checks.

---

## 16. Replay and Observability Requirements

### Required runtime logs

The runtime must emit structured logs for:

* authenticated-start gating outcome
* run creation
* state transitions
* context assembly summary
* effective tool/capability set computation
* reasoning step decisions
* middleware execution
* model calls
* tool/skill/subagent requests
* subagent context construction
* checkpoint writes/loads
* pairing challenge issuance outcome when runtime participates in pre-run gating
* approval waits/resumes
* terminal state outcome

### Required trace spans

At minimum:

* `run.start_gate`
* `run.initialize`
* `run.context_assemble`
* `run.capability_filter`
* `run.middleware`
* `run.reasoning_step`
* `run.tool_request`
* `run.skill_request`
* `run.subagent_spawn`
* `run.subagent_context_build`
* `run.checkpoint_write`
* `run.approval_wait`
* `run.resume`
* `run.finalize`

### Replay requirements

The runtime must capture:

* ordered sequence of reasoning steps
* effective tool/capability exposure decisions
* model input/output refs
* tool/skill request and result refs
* middleware execution refs
* policy decisions
* context inclusion metadata
* subagent context specs and merge results
* final committed output artifact refs
* checkpoints and resume points

Stream-token capture, if present, is optional and non-authoritative for exact replay.

### Audit requirements

For human inspection, the runtime should make visible:

* why a start was blocked or challenged before run creation
* why a run paused or failed
* what external actions were attempted
* which tools were exposed and why
* what approvals were requested or granted
* what context categories were included
* which subagents were spawned and why

---

## 17. Contract Sketch

This section defines the language-neutral platform contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Runtime operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `Start` | Start a new run from a resolved pre-run request. | `RuntimeStartInput` | `RunHandle` |
| `Resume` | Resume a run from a validated checkpoint and optional approval result. | `RuntimeResumeInput` | `RunHandle` |
| `Cancel` | Request best-effort cancellation of an active run. | `RuntimeCancelInput` | No payload beyond success or failure |
| `GetRunState` | Read one replay-visible run-state snapshot. | `runId` | `AgentRunState` |

### Dependency operations

| Dependency | Operation set | Notes |
| --- | --- | --- |
| Auth / pairing client | Read one authenticated-start outcome or create one pairing challenge when first-contact linkage is unresolved | Runtime may gate starts through this dependency, but credential proofing and account-link persistence remain outside runtime ownership. |
| Context provider | Assemble runtime context from a `ContextAssemblyInput` | Supplies model-facing context snapshots. |
| Capability resolver | Resolve candidate tools from a `ToolResolutionInput` | Feeds effective-tool-set calculation. |
| Model access | Execute one `ModelExecutionRequest` | Runs model inference against the current context and tool exposure. |
| Tool router | Execute one `ToolExecutionRequest` | Dispatches governed tool calls. |
| Skill router | Execute one `SkillExecutionRequest` | Dispatches governed skill activations. |
| Policy client | Evaluate one `PolicyEvaluationRequest` | Produces live allow, deny, or approval-required decisions. |
| Checkpoint store | Save one checkpoint snapshot, load one checkpoint snapshot by reference | Makes run state recoverable. |
| Runtime event sink | Emit one `RuntimeEvent` | Provides observability and replay signals. |
| Runtime middleware | Name middleware, intercept run acceptance, run start, model call, action call, state transition, and finalization | Middleware order must remain deterministic and observable. |

### Core runtime contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `RuntimeStartInput` | `runtimeStartEnvelope`, `message`, `agentProfileId`, `candidateToolRefs` | `authContextRef` | Canonical input used to start a new run. `runtimeStartEnvelope` must come from Identity and Thread Management and must include a valid Layer 1.5 `PreRunEnvelope`; runtime allocates `runId` before active-run operations begin. When first-contact authentication or pairing is enabled, `authContextRef` should identify the authoritative upstream outcome that made the start runnable. Unresolved pairing must not call `Start`. |
| `RuntimeResumeInput` | `runId`, `checkpointRef` | `approvalInput` | Used after checkpoint resume and optional approval resolution. |
| `RuntimeCancelInput` | `runId`, `reason` | None | Cancellation request metadata. |
| `RunHandle` | `runId`, `status` | None | Lightweight handle returned after start or resume. |
| `AgentRunState` | `runId`, `userId`, `threadId`, `collaborativeScopeId`, `status`, `currentStepId` | `checkpointRef`, `effectiveToolSetRef`, `authContextRef` | Replay-visible summary of the current run state. |
| `ReasoningStepDecision` | `stepId`, `type`, `toolRequests` | `skillRequest`, `subagentRequest`, `finalOutputRef` | Normalized decision artifact for one reasoning step. |
| `ToolResolutionResult` | `candidateTools`, `appliedProfiles`, `sourceRefs` | None | Returned by capability resolution before runtime filtering. |
| `EffectiveToolSet` | `toolSetId`, `runId`, `stepId`, `effectiveTools`, `filteredTools`, `decisionReasons` | None | Final tool exposure artifact for one step. |
| `SubagentContextSpec` | `contextSpecId`, `parentRunId`, `childRunId`, `taskContract`, `summaryRef`, `evidenceRefs`, `effectiveTools`, `timeoutMs`, `maxLoopCount`, `maxDepth`, `maxFanout` | None | Bounded child-run handoff contract. |

### Behavioral expectations

* `Start` should support idempotent handling for deduplicated inbound requests where configured
* `Resume` requires a valid resumable checkpoint
* only the effective tool set may be passed to model execution or tool routing
* middleware order must be deterministic and observable
* all externally meaningful actions must be correlated by `RunID`
* all reasoning steps must be correlated by `StepID`
* all returned objects must be serializable or reference-addressable
* cancellation must be best-effort, observable, and safe

---

## 18. State, Persistence, and Data Model

### Owned data

The runtime owns:

* Agent Run records
* runtime working state
* run state transitions
* checkpoint references
* effective tool set refs
* reasoning step records
* middleware execution refs
* execution history refs
* subagent linkage refs
* subagent context specs
* approval wait refs
* terminal outcome metadata

### Referenced data

The runtime references but does not own:

* memory records
* RAG documents/results
* candidate tool definitions
* tool execution records
* skill registry data
* sandbox execution records
* observability storage
* policy rule definitions

### Persistence model

Recommended:

* Postgres or transactional store for run metadata and state transitions
* object storage for large checkpoints, model payload refs, and execution artifacts
* Redis or queue system for active execution scheduling/resume triggers

### Retention

* active runs: high-availability retention
* completed runs: retained based on audit/debug policy
* checkpoints: retained based on replay/debug requirements and cost policy
* ephemeral working caches: aggressively expired

### Consistency model

* run state transitions require strong consistency
* checkpoint references must be atomically associated with relevant state transitions
* trace/log emission may be eventually consistent, but causal identifiers must be preserved

---

## 19. Failure Modes and Recovery

| Failure Mode                    | Detection             | Impact                        | Recovery Strategy                                                                  |
| ------------------------------- | --------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| Auth middleware or pairing dependency unavailable | dependency failure | new-run start blocked or downgraded incorrectly | fail closed for protected channels, optionally allow only explicitly configured guest starts |
| Model provider timeout          | timeout / failed call | step blocked                  | retry with bounded policy, fallback model, or fail step                            |
| Tool execution failure          | structured tool error | action unavailable            | replan, retry, or fail based on error class                                        |
| Checkpoint write failure        | write error           | resumability risk             | retry immediately, fail closed before risky continuation                           |
| Policy service unavailable      | dependency failure    | unsafe ambiguity              | fail closed for high-risk actions, limited degraded mode for safe reads if allowed |
| Approval response never arrives | timeout / SLA expiry  | run stalled                   | remain paused, expire, or notify based on product policy                           |
| Context too large               | budgeting failure     | execution blocked or degraded | compress, summarize, truncate by precedence rules                                  |
| Subagent runaway                | loop/fanout breach    | cost/latency explosion        | hard-stop child tasks, mark parent degraded                                        |
| Duplicate resume                | concurrency conflict  | inconsistent execution risk   | optimistic lock / lease enforcement                                                |
| Sandbox unavailable             | dependency failure    | tool/skill execution blocked  | queue retry or degrade to non-execution response                                   |
| Runtime crash                   | process failure       | interrupted run               | restart from latest valid checkpoint                                               |

### Default retry policy

| Error Class                                   | Retry?                  | Strategy                              |
| --------------------------------------------- | ----------------------- | ------------------------------------- |
| Model timeout / transient                     | Yes                     | exponential backoff plus fallback model |
| Tool transient failure                        | Yes                     | retry with idempotency guard          |
| Tool deterministic failure (validation error) | No                      | replan required                       |
| Policy service unavailable                    | Limited                 | fail closed for risky actions         |
| Checkpoint failure                            | Immediate retry only    | else fail run                         |
| Subagent failure                              | Conditional             | retry or replan depending on contract |
| Approval timeout                              | No auto-retry           | remain paused or expire               |
| Context overflow                              | No                      | reassemble context                    |

### Recovery principles

* fail closed on unsafe ambiguity
* prefer resume over restart when safe
* preserve traceability even for failed runs
* never continue high-risk actions without pre-action checkpoint integrity
* retries must be step-scoped and bounded
* retries must preserve idempotency of external actions

---

## 20. Scalability and Performance

### Expected load profile

The runtime will experience:

* high volume of short conversational runs
* smaller volume of long-running complex runs
* bursty concurrent resumes due to approvals, tool completions, or scheduled continuations

### Latency sensitivity

* user-facing response latency is important
* first-token latency matters for streaming channels
* correctness and resumability take precedence over shaving minimal latency

### Throughput model

The runtime should scale horizontally using:

* stateless runtime workers for active orchestration
* persistent run/checkpoint store
* queue-based dispatch for start/resume/cancel actions

### Bottlenecks

Likely bottlenecks:

* model latency
* tool/sandbox latency
* context assembly cost
* checkpoint write amplification
* approval wait orchestration overhead for complex runs

### Horizontal scaling strategy

* shard active execution by run lease ownership
* separate hot-path execution from heavy artifact persistence
* use queues for resumed runs and subagent execution
* isolate long-running runs from latency-sensitive short runs

### Caching strategy

Possible caches:

* recent thread summary refs
* tool result refs when deterministic and allowed
* model prompt assembly fragments
* agent profile/config snapshots

### Backpressure behavior

The runtime should:

* enforce per-run budgets
* limit global concurrency
* queue lower-priority runs
* reject or defer non-critical work under sustained overload
* preferentially preserve resumability and correctness over maximum throughput

---

## 21. Configuration

| Config                    | Purpose                        | Type         | Default                        | Override Level | Reloadability                     |
| ------------------------- | ------------------------------ | ------------ | ------------------------------ | -------------- | --------------------------------- |
| `maxLoopCount`            | bound reasoning loop           | integer      | conservative                   | agent/run      | hot-reloadable                    |
| `stepTimeoutMs`           | bound each reasoning step      | integer      | conservative                   | agent/run      | hot-reloadable                    |
| `totalRunTimeoutMs`       | bound full run duration        | integer      | conservative                   | agent/run      | hot-reloadable                    |
| `checkpointFrequency`     | control checkpoint density     | enum/integer | required boundaries + periodic | system/agent   | hot-reloadable                    |
| `maxSubagentFanout`       | bound delegation breadth       | integer      | low                            | system/agent   | hot-reloadable                    |
| `maxSubagentDepth`        | bound delegation depth         | integer      | low                            | system/agent   | hot-reloadable                    |
| `maxOutstandingToolCalls` | prevent orchestration overload | integer      | low/moderate                   | system/agent   | hot-reloadable                    |
| `contextTokenBudget`      | cap assembled context size     | integer      | model-dependent                | agent/run      | hot-reloadable                    |
| `toolExposureMode`        | control default tool exposure  | enum         | conservative                   | system/agent   | hot-reloadable                    |
| `middlewareChain`         | ordered runtime middleware     | list         | system-defined                 | system/agent   | hot-reloadable                    |
| `allowStreaming`          | enable streamed responses      | boolean      | channel-dependent              | channel/agent  | hot-reloadable                    |
| `resumeExpiry`            | max pause duration             | duration     | product-dependent              | system/product | restart or hot depending on store |
| `idempotentIngressWindow` | dedupe duplicate starts        | duration     | short                          | system/channel | hot-reloadable                    |

---

## 22. Dependencies

### Upstream dependencies

* Channel Gateway
* auth middleware / pairing service
* Identity and Thread Management
* configuration service
* agent profile registry
* tool registry / capability source

### Downstream / peer dependencies

* Model provider abstraction
* Context assembly provider
* Memory retrieval
* RAG service
* Policy client
* Tool Execution Framework
* Skills System
* Sandbox / Execution Space
* Checkpoint store
* Observability event sink
* approval workflow service

### Downstream impact

Changes in runtime behavior directly affect:

* user-visible latency and correctness
* replay fidelity
* policy enforcement integrity
* observability completeness
* tool exposure correctness
* tool and subagent safety
* memory extraction timing

---

## 23. Tradeoffs and Design Decisions

### Decision: runtime owns orchestration, not implementation

**Why:** keeps subsystem boundaries clean
**Alternative:** embed memory/tool/retrieval logic directly in runtime
**Consequence:** more interfaces to manage, but much better modularity

### Decision: checkpoint aggressively around external actions

**Why:** protects replayability and recovery
**Alternative:** sparse checkpoints for performance
**Consequence:** more storage and write cost

### Decision: runtime owns effective tool exposure

**Why:** the runtime is the only subsystem with the full run/step context needed to advertise executable tools safely
**Alternative:** let model access or tool execution infer tool visibility independently
**Consequence:** more runtime bookkeeping, but much safer and more replayable capability exposure

### Decision: runtime remains policy-carrier, not policy-author

**Why:** execution path must enforce but not define global governance
**Alternative:** embed policy logic in runtime
**Consequence:** extra dependency on Policy System, but avoids governance drift

### Decision: first-contact pairing remains pre-run and dependency-driven

**Why:** pairing is an authentication and account-linking ceremony, not normal agent execution
**Alternative:** model unresolved pairing as a standard runtime wait state
**Consequence:** the runtime must understand blocked-start and pairing outcomes, but it keeps `AgentRun` state reserved for executable work and preserves a cleaner security boundary

### Decision: subagents remain children of parent run

**Why:** preserves observability and accountability
**Alternative:** detached agent jobs without strong lineage
**Consequence:** more coordination complexity, better trace integrity

### Decision: child context is explicitly packed, not implicitly inherited

**Why:** prevents context leakage and keeps child runs focused
**Alternative:** copy the parent conversational state wholesale into each child
**Consequence:** more context-pack logic, but safer delegation and lower token cost

### Decision: bounded reasoning loop

**Why:** prevents runaway cost and instability
**Alternative:** open-ended autonomous loops
**Consequence:** some tasks may need resume/delegation patterns instead of one long run

---

## 24. Risks and Resolved Positions

### Current risks

* reasoning-loop abstraction may become too tied to one prompting style
* checkpoint size may grow too quickly for complex multimodal runs
* middleware ordering can become hard to reason about if extension points are too broad
* tool exposure filtering may drift from execution-time validation if contracts are weak
* subagent orchestration can create hidden complexity
* approval waits may create operational backlog and stale runs
* streaming plus checkpoint consistency may be tricky in partial-output cases

### Resolved design positions

* `ReasoningStep` is a first-class structured record with trace linkage, not a derived artifact reconstructed from traces
* retry policy is step-scoped, bounded, error-class-specific, and fail-closed for unsafe ambiguity
* partial streaming output is a non-authoritative side channel; final committed output artifacts are replay-authoritative
* safety- and correctness-critical middleware hooks fail closed, while observational hooks fail open by default
* subagents default to the same runtime implementation; specialized runtimes are allowed only behind the same contract
* checkpoints must be versioned, reference-based, and carry the minimum replay-critical schema needed for upgrade-safe resume

---

## 25. Test and Validation Strategy

### Unit validation

* state transition correctness
* checkpoint serialization/deserialization
* checkpoint version migration behavior
* loop termination rules
* effective tool filtering
* middleware ordering and failure handling
* policy outcome handling
* retry/cancel/resume behavior

### Integration validation

* runtime + model provider
* runtime + tool execution
* runtime + capability resolver / tool registry
* runtime + auth middleware / pairing challenge path
* runtime + policy system
* runtime + memory/RAG context assembly
* runtime + approval workflow
* runtime + specialized subagent runtime behind contract compatibility checks

### Replay validation

* replay from checkpoints produces expected reconstructed state
* replay logs are complete enough for debugging
* tool exposure and middleware decisions are reconstructable
* exact replay uses final output artifacts while debug replay may optionally simulate streams
* non-deterministic actions are correctly marked and handled

### Failure injection

* model timeouts
* checkpoint write failures
* duplicate resumes
* partial tool failures
* approval timeouts
* middleware failures
* worker crashes during active execution

### Performance validation

* concurrent short-run throughput
* long-run checkpoint overhead
* first-token latency under streaming load
* resume latency after approval/tool completion

---

## 27. Final Position

The Agent Runtime should be designed as a **thin but authoritative orchestration kernel**.

It must be:

* strict about lifecycle
* explicit about state
* disciplined about boundaries
* deeply integrated with policy, replay, and observability

It should **not** become a place where unrelated business logic accumulates.

If designed correctly, it becomes the platform’s execution backbone:
stable enough to support many products, and flexible enough to evolve with models, tools, and workflows.
