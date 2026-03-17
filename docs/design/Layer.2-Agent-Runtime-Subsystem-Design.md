# Frame AI Agent Platform — Layer 2

## Agent Runtime Subsystem Design

Based on the platform architecture and contracts defined from the blueprint document. 

---

## 1. Document Metadata

**Subsystem Name:** Agent Runtime
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Platform Runtime Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Channel Gateway
* Identity and Thread Management
* Model and Routing Design 
* LLM Provider Abstraction Design
* Memory System Design
* Tool Execution Framework
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
* clear state transitions
* policy compliance
* modular orchestration
* extensibility for tools, skills, and subagents
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
* assemble execution context under ordering, scoping, and token-budget constraints
* execute the reasoning loop under bounded runtime policies
* route tool requests through validation and policy-aware execution paths
* coordinate skill execution without owning skill package lifecycle
* coordinate subagent delegation with inherited scope and bounded budgets
* persist checkpoints at required lifecycle boundaries
* transition run states predictably across active, paused, completed, failed, and cancelled states
* emit structured runtime events for tracing, auditing, and replay
* trigger post-run extraction hooks such as memory candidate generation
* support resumption from checkpoints after interruption, approval, or failure where allowed

---

## 7. External Contracts

### Inputs

The runtime requires at minimum:

* `userId`
* `threadId`
* `runId`
* canonical input message/event
* applicable agent configuration
* session/thread metadata
* policy context
* model access context

Optional but common inputs:

* `collaborativeScopeId`
* prior thread summary
* memory retrieval results
* RAG results
* attachment analysis results
* resume checkpoint reference
* approval decision payload

### Outputs

The runtime produces:

* final response content or structured response artifact
* tool/skill/subagent invocation requests
* approval wait requests
* checkpoint snapshots
* memory extraction candidates
* runtime lifecycle events
* trace/log payloads
* terminal run result metadata

### Required metadata

Every runtime operation must propagate:

* `userId`
* `threadId`
* `runId`
* `collaborativeScopeId` when applicable
* `executionSpaceId` when execution isolation is involved
* agent/profile identifier
* timestamps and causal references

### Preserved invariants

The runtime directly enforces:

* state must be recoverable
* execution must be observable
* identity must be propagated
* policy must precede external side effects
* memory and retrieval remain distinct inputs
* replay capture requirements are satisfied

---

## 8. Internal Model

### Core entities

#### `AgentRun`

The top-level execution record for one runtime instance.

Suggested fields:

* `runId`
* `threadId`
* `userId`
* `collaborativeScopeId?`
* `status`
* `entrypoint`
* `startTime`
* `endTime?`
* `currentStep`
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

#### `Checkpoint`

A resumable snapshot of runtime state.

Suggested contents:

* run metadata
* current loop state
* context references
* working state
* completed actions
* pending actions
* model invocation history refs
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
* state
* result ref

### Derived views

* active run timeline
* current execution graph
* pending approval queue
* subagent tree
* replay sequence

---

## 9. Lifecycle / Execution Flow

### Standard runtime lifecycle

```text
1. Receive canonical execution request
2. Validate required identifiers and runtime prerequisites
3. Create or resume Agent Run
4. Load applicable configuration and policy context
5. Assemble RuntimeContext
6. Enter reasoning loop
7. Produce one of:
   - model-only continuation
   - tool request
   - skill request
   - subagent request
   - approval wait
   - final response
8. For each external action:
   - validate request
   - hand off to policy/tool/skill subsystem
   - persist checkpoint
   - receive result or wait state
9. Update working state
10. Repeat until termination condition
11. Produce final output
12. Trigger post-run hooks
13. Emit terminal events and persist final run status
```

### Entry conditions

Before execution starts:

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
* working state
* completed action refs
* pending action refs
* context references, not always full inline payloads
* replay-critical references
* deterministic serialization of action requests/results where possible

### Checkpoint design rules

* checkpoint writes must be idempotent
* checkpoint reads must restore a single consistent execution point
* runtime should prefer reference-based storage for large blobs
* checkpoint versioning must support future schema evolution

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

### Context inclusion record

For replay and audit, the runtime should record:

* which context blocks were included
* which were excluded
* why exclusion happened
* token cost per block/category
* source refs for memory and RAG blocks

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
observe -> deliberate -> decide -> act or respond -> update state -> continue or stop
```

### Supported execution modes

* direct response
* tool-augmented reasoning
* skill-mediated reasoning
* delegated subagent reasoning
* approval-gated execution
* replay mode
* dry-run / evaluation mode

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

### Tool orchestration

The runtime does not implement tools. It:

* validates the action request shape
* attaches scope and run metadata
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

### Subagent orchestration

The runtime is responsible for delegation logic.

It must:

* define task contracts
* assign scope-limited budgets
* restrict available tools/capabilities
* preserve parent-child trace linkage
* collect and merge results
* prevent unbounded recursion/spawning

### Delegation rules

A subagent may only be created when:

* the task is explicitly bounded
* delegated scope is defined
* budget/timeout/tool set are declared
* parent run remains the source of truth for final response

---

## 15. Policy Touchpoints

The runtime is not the Policy System, but it is the **main enforcement carrier** on the execution path.

### Runtime policy touchpoints

The runtime must invoke policy checks before:

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

---

## 16. Replay and Observability Requirements

### Required runtime logs

The runtime must emit structured logs for:

* run creation
* state transitions
* context assembly summary
* model calls
* tool/skill/subagent requests
* checkpoint writes/loads
* approval waits/resumes
* terminal state outcome

### Required trace spans

At minimum:

* `run.initialize`
* `run.context_assemble`
* `run.reasoning_step`
* `run.tool_request`
* `run.skill_request`
* `run.subagent_spawn`
* `run.checkpoint_write`
* `run.approval_wait`
* `run.resume`
* `run.finalize`

### Replay requirements

The runtime must capture:

* ordered sequence of reasoning steps
* model input/output refs
* tool/skill request and result refs
* policy decisions
* context inclusion metadata
* checkpoints and resume points

### Audit requirements

For human inspection, the runtime should make visible:

* why a run paused or failed
* what external actions were attempted
* what approvals were requested or granted
* what context categories were included
* which subagents were spawned and why

---

## 17. Interfaces and APIs

These are platform-contract level interfaces, not final code.
Good catch. You’re right — that’s inconsistent with the architecture direction.

Since the platform core is intended to use **Go as the main language**, the Layer 2 docs should default to **Go-style interfaces and types**, not TypeScript. I used TypeScript mainly as fast pseudocode because it is compact and readable, but for your design set that creates the wrong implementation gravity.

For this architecture, I’d set a documentation rule:

> **All platform-core subsystem contracts should use Go-flavored pseudocode by default.**
> TypeScript can appear only when a subsystem explicitly targets JS/TS sandbox runtimes or SDKs.

That keeps the docs aligned with:

* the implementation language
* package/interface design
* concurrency model
* error handling style
* serialization boundaries

## Why Go-style contracts are better here

Because they naturally express the things your platform core actually cares about:

* `context.Context`
* explicit error returns
* interface-based dependency boundaries
* structs for state ownership
* concurrency and cancellation semantics
* stable service/package boundaries

TypeScript-style interfaces can accidentally make the system feel more like:

* frontend SDK design
* loosely typed orchestration
* promise-centric runtime assumptions

That is not the center of gravity you want for a Go platform kernel.

# What I would change

For all future Layer 2 docs, I would rewrite interface examples into Go-style pseudocode.

```go
type AgentRuntime interface {
	Start(ctx context.Context, input RuntimeStartInput) (RunHandle, error)
	Resume(ctx context.Context, input RuntimeResumeInput) (RunHandle, error)
	Cancel(ctx context.Context, input RuntimeCancelInput) error
	GetRunState(ctx context.Context, runID string) (AgentRunState, error)
}
```

```go
type PolicyClient interface {
	Evaluate(ctx context.Context, req PolicyEvaluationRequest) (PolicyDecision, error)
}
```

```go
type CheckpointStore interface {
	Save(ctx context.Context, snapshot CheckpointSnapshot) (CheckpointRef, error)
	Load(ctx context.Context, ref CheckpointRef) (CheckpointSnapshot, error)
}
```

## Better documentation rule going forward

I’d formalize it like this:

### Contract notation standard

* **Go-style pseudocode** for:

  * platform kernel
  * runtime
  * memory
  * policy
  * tools
  * sandbox
  * model routing
  * observability services

* **TypeScript/JavaScript examples** only for:

  * sandboxed skill runtimes
  * SDK examples
  * user-extensible execution environments
  * browser/client integrations

* **Language-neutral schemas** for:

  * JSON payloads
  * wire contracts
  * storage documents
  * event envelopes

That will keep the architecture much cleaner.

# What I’d fix in the Agent Runtime doc

The main thing to change is **Section 17: Interfaces and APIs** into Go style.

Here’s the corrected version.

---

## 17. Interfaces and APIs

These are platform-contract level interfaces, expressed in **Go-style pseudocode**.

### Public internal interfaces

```go
type AgentRuntime interface {
	Start(ctx context.Context, input RuntimeStartInput) (RunHandle, error)
	Resume(ctx context.Context, input RuntimeResumeInput) (RunHandle, error)
	Cancel(ctx context.Context, input RuntimeCancelInput) error
	GetRunState(ctx context.Context, runID string) (AgentRunState, error)
}
```

### Dependency interfaces

```go
type ContextProvider interface {
	Assemble(ctx context.Context, input ContextAssemblyInput) (RuntimeContext, error)
}

type ModelAccess interface {
	Execute(ctx context.Context, req ModelExecutionRequest) (ModelExecutionResult, error)
}

type ToolRouter interface {
	Execute(ctx context.Context, req ToolExecutionRequest) (ToolExecutionResult, error)
}

type SkillRouter interface {
	Execute(ctx context.Context, req SkillExecutionRequest) (SkillExecutionResult, error)
}

type PolicyClient interface {
	Evaluate(ctx context.Context, req PolicyEvaluationRequest) (PolicyDecision, error)
}

type CheckpointStore interface {
	Save(ctx context.Context, snapshot CheckpointSnapshot) (CheckpointRef, error)
	Load(ctx context.Context, ref CheckpointRef) (CheckpointSnapshot, error)
}

type RuntimeEventSink interface {
	Emit(ctx context.Context, event RuntimeEvent) error
}
```

### Example core structs

```go
type RuntimeStartInput struct {
	RunID                string
	UserID               string
	ThreadID             string
	CollaborativeScopeID string
	Message              CanonicalMessage
	AgentProfileID       string
}

type RuntimeResumeInput struct {
	RunID         string
	CheckpointRef CheckpointRef
	ApprovalInput *ApprovalResolution
}

type RuntimeCancelInput struct {
	RunID  string
	Reason string
}

type RunHandle struct {
	RunID  string
	Status RunStatus
}

type AgentRunState struct {
	RunID              string
	UserID             string
	ThreadID           string
	CollaborativeScopeID string
	Status             RunStatus
	CheckpointRef      *CheckpointRef
	CurrentStep        string
}
```

### Behavioral expectations

* `Start` should support idempotent handling for deduplicated inbound requests where configured
* `Resume` requires a valid resumable checkpoint
* all externally meaningful actions must be correlated by `RunID`
* all returned objects must be serializable or reference-addressable
* cancellation must be best-effort, observable, and safe
* 
---

## 18. State, Persistence, and Data Model

### Owned data

The runtime owns:

* Agent Run records
* runtime working state
* run state transitions
* checkpoint references
* execution history refs
* subagent linkage refs
* approval wait refs
* terminal outcome metadata

### Referenced data

The runtime references but does not own:

* memory records
* RAG documents/results
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

### Recovery principles

* fail closed on unsafe ambiguity
* prefer resume over restart when safe
* preserve traceability even for failed runs
* never continue high-risk actions without pre-action checkpoint integrity

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
| `maxOutstandingToolCalls` | prevent orchestration overload | integer      | low/moderate                   | system/agent   | hot-reloadable                    |
| `contextTokenBudget`      | cap assembled context size     | integer      | model-dependent                | agent/run      | hot-reloadable                    |
| `allowStreaming`          | enable streamed responses      | boolean      | channel-dependent              | channel/agent  | hot-reloadable                    |
| `resumeExpiry`            | max pause duration             | duration     | product-dependent              | system/product | restart or hot depending on store |
| `idempotentIngressWindow` | dedupe duplicate starts        | duration     | short                          | system/channel | hot-reloadable                    |

---

## 22. Dependencies

### Upstream dependencies

* Channel Gateway
* Identity and Thread Management
* configuration service
* agent profile registry

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

### Decision: runtime remains policy-carrier, not policy-author

**Why:** execution path must enforce but not define global governance
**Alternative:** embed policy logic in runtime
**Consequence:** extra dependency on Policy System, but avoids governance drift

### Decision: subagents remain children of parent run

**Why:** preserves observability and accountability
**Alternative:** detached agent jobs without strong lineage
**Consequence:** more coordination complexity, better trace integrity

### Decision: bounded reasoning loop

**Why:** prevents runaway cost and instability
**Alternative:** open-ended autonomous loops
**Consequence:** some tasks may need resume/delegation patterns instead of one long run

---

## 24. Risks and Open Questions

### Current risks

* reasoning-loop abstraction may become too tied to one prompting style
* checkpoint size may grow too quickly for complex multimodal runs
* subagent orchestration can create hidden complexity
* approval waits may create operational backlog and stale runs
* streaming plus checkpoint consistency may be tricky in partial-output cases

### Open questions

* should reasoning steps be stored as first-class structured records or derived from traces?
* what is the default retry policy by error class?
* how should partial streaming output interact with replay guarantees?
* should subagents always run through the same runtime implementation, or allow specialized runtimes?
* what is the minimum checkpoint schema for reliable resume across version upgrades?

### Deferred work

* speculative execution
* advanced adaptive loop control
* provider-specific reasoning optimizations
* dynamic planner/executor split
* long-horizon task workflows beyond a single parent-run model

---

## 25. Implementation Plan

### Phase 1

* basic run creation/state machine
* context assembly integration
* single-agent reasoning loop
* tool invocation orchestration
* required checkpoint boundaries
* trace/log emission
* pause/resume support

### Phase 2

* subagent orchestration
* richer approval states
* better streaming support
* replay-focused event model
* improved context budgeting/compression hooks

### Phase 3

* advanced scheduling for long-running runs
* adaptive runtime policies
* deeper execution analytics
* optimized checkpointing and replay acceleration

---

## 26. Test and Validation Strategy

### Unit validation

* state transition correctness
* checkpoint serialization/deserialization
* loop termination rules
* policy outcome handling
* retry/cancel/resume behavior

### Integration validation

* runtime + model provider
* runtime + tool execution
* runtime + policy system
* runtime + memory/RAG context assembly
* runtime + approval workflow

### Replay validation

* replay from checkpoints produces expected reconstructed state
* replay logs are complete enough for debugging
* non-deterministic actions are correctly marked and handled

### Failure injection

* model timeouts
* checkpoint write failures
* duplicate resumes
* partial tool failures
* approval timeouts
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
