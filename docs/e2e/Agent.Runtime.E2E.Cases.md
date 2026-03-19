# Agent Runtime E2E Cases

This document proposes fifteen deterministic E2E scenarios for the Agent Runtime subsystem.
It starts from end-to-end user journeys, then closes with runtime-focused module black-box flows so the same suite can be reviewed both as product execution and as orchestration-kernel contract coverage.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic channel ingress
* seeded identity, thread, scope, policy, memory, retrieval, and runtime fixtures
* recorded model decisions or golden model adapter mode
* deterministic tool and child-run fixtures
* replay-visible checkpoints, reasoning steps, and final-output artifacts
* full trace, lifecycle, and replay-manifest capture

## Suite structure

### User-journey scenarios

1. inbound chat starts a run, completes one model-only step, and schedules post-run hooks
2. inbound chat triggers one allowed deterministic tool call and final response
3. high-risk tool request pauses for approval, then resumes and executes exactly once
4. runtime crashes after tool completion and resumes without duplicating the side effect
5. bounded child delegation creates a subagent run, merges the child result, and preserves parent ownership of the final response
6. streamed response remains non-authoritative until the final output artifact is checkpointed

### Module black-box scenarios

7. `Start` rejects an invalid `RuntimeStartEnvelope` before run creation
8. malformed model output that maps to more than one decision class is rejected before any external action
9. tool requests outside the current `EffectiveToolSet` are rejected before dispatch
10. safety-critical `BeforeAction` middleware failure blocks external action and fails closed
11. best-effort `AfterModel` middleware failure is recorded but the run continues
12. pre-action checkpoint write failure blocks risky continuation
13. concurrent duplicate `Resume` requests are serialized by lease or lock and do not duplicate work
14. duplicate `Start` within the configured idempotent ingress window does not create two active runs
15. first-contact pairing requirement emits a pairing challenge and creates no `AgentRun`

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Inbound chat starts a run, completes one model-only step, and schedules post-run hooks
* `Risk level:` Low
* `Rationale:` Proves the Agent Runtime baseline kernel path end to end: it consumes a valid pre-run handoff, creates a run, assembles context, opens one reasoning step, records checkpoints and final output, and reaches terminal completion while still scheduling post-run hooks rather than silently skipping finalization work.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Identity and Thread Management `InboundResolutionResult -> RuntimeStartEnvelope -> PreRunEnvelope`
* Layer 2: Agent Runtime authenticated-start gating, `authContextRef` capture, standard lifecycle, `ReasoningStep`, `Checkpoint`, terminal finalization, and post-run hook triggering
* Layer 2: Context Assembly ordered run-start snapshot for a no-tool step
* Layer 2: Observability required `RunTimeline`, `ExecutionGraph`, `RunSummary`, and replay-manifest capture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_runtime_direct`, one open canonical thread `thread_runtime_direct`, one active collaborative scope `scope_runtime_direct`, deterministic system/environment/scope/agent/channel/run configuration already resolved before runtime start, and one authenticated runnable start context `auth_ctx_runtime_direct` bound to the same inbound event.
* Seeded policy rules: allow the model-only response path; no tool, skill, memory-write, or subagent action is required for this step.
* Seeded memory and retrieval stores: both stores exist and are empty so the runtime proves it can execute with distinct but unused memory and RAG layers.
* Selected model mode: recorded model adapter mode that emits one model-only completion mapped to `respond`.
* Selected tool implementations: none selected for execution.
* Expected capability set: the runtime computes an empty `EffectiveToolSet` for the single reasoning step.
* Execution-space posture: no execution-space-backed action is requested; if an `executionSpaceId` is attached for lineage, it remains metadata only.
* Approval or replay fixtures: no approval fixture is expected; replay capture must preserve the run start, context snapshot, step record, checkpoint ref, final output ref, and post-run hook scheduling evidence.

### Given / When / Then

Given a canonical inbound chat event from a verified user on an existing thread, a runnable authenticated-start outcome bound to that event, and a recorded model fixture that returns a direct final answer,
When upstream auth handling marks the start attempt runnable and Identity and Thread Management returns `resolutionDisposition = "start_run"` with a valid `RuntimeStartEnvelope`, Agent Runtime creates the run, records the start-gate outcome, assembles context, computes an empty effective tool set, opens one reasoning step, calls model access, validates the result as `respond`, checkpoints the final output boundary, and schedules post-run hooks,
Then the run completes without any external action while preserving replay-visible evidence for run creation, step execution, final output, and finalization.

### Required assertions

`Required fixtures:`

* The inbound event resolves to `thread_runtime_direct` and `scope_runtime_direct`.
* The recorded model fixture returns exactly one final response and no tool, skill, or subagent request.
* The effective tool set for the step is empty.

`Required observability artifacts:`

* Canonical inbound envelope ref and preserved raw provider payload ref.
* Authenticated-start gating outcome and `run.start_gate` trace span tied to `auth_ctx_runtime_direct`.
* Identity resolution and thread resolution audit refs.
* Runtime lifecycle events covering `queued -> initializing -> running -> completed`.
* Run record or state view carrying `authContextRef = auth_ctx_runtime_direct`.
* One `ReasoningStep` with `stepId`, context snapshot ref, model request ref, model response ref, and effective tool set ref.
* Capability exposure record showing no executable capability was exposed.
* Final output ref, final checkpoint or end-state snapshot ref, and post-run hook scheduling record.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views.

`Required replay artifacts:`

* Authenticated-start audit ref or `authContextRef` carried into run metadata.
* Context snapshot ref with inclusion provenance.
* Model input and output refs for the single step.
* Checkpoint ref after context assembly or step boundary as configured, plus pre-terminal or terminal completion evidence.
* Final output artifact ref and immutable replay manifest for the deterministic run.

`Pass/fail oracle:`

* One completed run exists for the inbound event, the final response matches the recorded model output, no tool or child-run artifacts exist, and the replay manifest contains the run-start, context, model, checkpoint, and final-output evidence required to reconstruct the run.

### Required harness capabilities

* Synthetic chat channel driver
* Authenticated-start fixture or auth middleware stub
* Identity and thread fixture service
* Recorded or golden model adapter mode
* Trace collector, run-view materializer, and replay verifier
* Seeded empty memory store
* Seeded empty retrieval fixture

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Inbound chat triggers one allowed deterministic tool call and final response
* `Risk level:` Medium
* `Rationale:` Proves the core runtime orchestration loop for a normal tool-augmented step: the runtime computes `EffectiveToolSet`, passes only the executable tool set to reasoning, validates the tool request, checkpoints before the side effect, dispatches exactly one tool call, updates working state, and completes the run with replay-visible action lineage.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime `EffectiveToolSet`, reasoning-step decision handling, pre-action checkpointing, post-action working-state update, and terminal completion
* Layer 2: Policy and Approval allow decision before `tool_execution`
* Layer 2: Tool Execution Framework validation and execution of one runtime-authorized tool call
* Layer 2: Sandbox / Execution Space propagation of `executionSpaceId` where file-backed execution is involved
* Layer 2: Observability capture of tool exposure, policy, checkpoint, tool execution, and final output

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_runtime_tool`, one open thread `thread_runtime_tool`, one collaborative scope `scope_runtime_tool`, and deterministic runtime config with a single low-risk read-only tool available to the run.
* Seeded policy rules: allow the exact seeded `tool_execution` request for one deterministic read-only file-search tool; deny all other tool executions.
* Seeded memory and retrieval stores: available but unused for this scenario.
* Selected model mode: recorded model adapter mode that emits one tool request followed by one final response after the tool result.
* Selected tool implementations: one deterministic read-only tool descriptor `search_text@v1` backed by a lab workspace snapshot.
* Expected capability set: the runtime computes an `EffectiveToolSet` containing exactly `search_text@v1`.
* Execution-space posture: one attached execution space with `fileMode = read_only`, `networkMode = off`, `allowProcessExec = false`, and allowed paths limited to the seeded lab workspace.
* Approval or replay fixtures: no approval fixture is expected; replay capture must preserve the step decision, policy decision, authorization, tool result, checkpoints, and final response.

### Given / When / Then

Given an inbound chat asks a repository question that the recorded model fixture answers by calling `search_text@v1`,
When Agent Runtime computes the effective tool set, opens a reasoning step, sends the model the executable default tool list, validates the resulting tool request, evaluates policy as `allow`, persists the pre-action checkpoint, dispatches the authorized tool call through Tool Execution, updates working state from the tool result, and runs one final response step,
Then the run completes with exactly one tool execution, one final response, and no duplicate side effect on the path.

### Required assertions

`Required fixtures:`

* The effective tool set for the first step contains only `search_text@v1`.
* The attached execution space is read-only and linked to the run or step metadata.
* The recorded model emits the expected tool request and final response sequence.

`Required observability artifacts:`

* Capability exposure record showing `candidateToolRefs`, `effectiveToolRefs`, and any filtered tool refs.
* One policy evaluation request, decision ref, and immutable policy snapshot ref for the tool action.
* One pre-action checkpoint ref created before tool dispatch.
* One tool invocation record with request args ref, result ref, and authorization ref.
* One post-tool step record showing working-state update and one final response step record.
* Runtime lifecycle events, `RunTimeline`, `ExecutionGraph`, and `RunSummary` views.

`Required replay artifacts:`

* Context snapshot refs for both the tool-request step and the final-response step.
* Model input and output refs for both steps.
* Policy decision ref, tool authorization ref, tool request ref, and tool result ref.
* Checkpoint refs for post-context assembly, pre-action, post-tool or post-step, and terminal completion.
* Final output ref and immutable replay manifest.

`Pass/fail oracle:`

* The tool request is accepted only because it is inside the current `EffectiveToolSet`, policy is recorded before dispatch, the tool executes exactly once, the final answer uses the tool result, and replay can reconstruct the complete two-step runtime path.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed tool-call sequence
* Policy fixture service
* Deterministic tool harness for `search_text@v1`
* Sandbox harness with read-only file broker
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` High-risk tool request pauses for approval, then resumes and executes exactly once
* `Risk level:` High
* `Rationale:` Proves the runtime’s approval-carrying state machine: the run must checkpoint before entering `waiting_approval`, preserve a resumable boundary, resume only with a valid approval payload, and execute the gated action once after resumption instead of before or twice.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime legal state transitions through `running -> waiting_approval -> resuming -> running -> completed`
* Layer 2: Agent Runtime checkpoint-before-wait, checkpoint-before-action, and resume-from-validated-boundary rules
* Layer 2: Policy and Approval `require_approval`, `ApprovalRequest`, approval-resolution validation, and request-hash binding
* Layer 2: Tool Execution Framework exact-bound execution after runtime resume
* Layer 2: Observability approval wait, checkpoint load, resume, and terminal completion evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_runtime_approval`, one open thread `thread_runtime_approval`, one collaborative scope `scope_runtime_approval`, and deterministic runtime config enabling a high-risk write-capable tool for the scenario.
* Seeded policy rules: classify the seeded tool request as high risk and return `require_approval` for the exact request hash.
* Seeded memory and retrieval stores: available but not material to the approval branch.
* Selected model mode: recorded model adapter mode that emits one high-risk tool request, then one final response after approval and tool completion.
* Selected tool implementations: one deterministic write-capable lab tool that performs a bounded file patch after approval.
* Expected capability set: the high-risk tool is present in the effective tool set, but action still requires live policy and approval before execution.
* Execution-space posture: one attached execution space with bounded write permission limited to the deterministic lab workspace.
* Approval or replay fixtures: one persisted approval request artifact and one later approval resolution payload bound to the original request hash and policy snapshot.

### Given / When / Then

Given a run reaches a reasoning step where the model requests one high-risk file mutation,
When Agent Runtime validates the request, evaluates policy, receives `require_approval`, writes the required checkpoint, transitions to `waiting_approval`, later receives a valid approval resolution, restores from checkpoint, resumes from a validated boundary, and dispatches the authorized tool call,
Then the action executes exactly once after approval, the run continues to a final answer, and replay makes the wait and resume sequence explicit.

### Required assertions

`Required fixtures:`

* The approval payload is bound to the original request hash and approval record.
* The waiting run has a valid checkpoint before `waiting_approval`.
* The effective tool set before and after resume remains replay-visible.

`Required observability artifacts:`

* Policy evaluation record with `require_approval`.
* Approval request ref and approval resolution ref.
* Checkpoint ref written before entering `waiting_approval`.
* Runtime lifecycle events covering `running`, `waiting_approval`, `resuming`, and `completed`.
* Resume event, checkpoint-load ref, tool invocation record, and final output ref.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the wait boundary.

`Required replay artifacts:`

* Parent step record for the pre-approval tool request.
* Checkpoint ref and resumed step record or recreated active step record.
* Policy snapshot ref, decision ref, approval refs, tool authorization ref, and tool result ref.
* Final output ref and immutable replay manifest with the approval wait boundary.

`Pass/fail oracle:`

* The run does not execute the high-risk tool before approval, enters `waiting_approval` only after checkpointing, resumes only with a valid approval payload, executes the action once after resume, and preserves full wait/resume lineage in replay artifacts.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy and approval fixture service
* Deterministic write-capable tool harness
* Checkpoint store fixture
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Runtime crashes after tool completion and resumes without duplicating the side effect
* `Risk level:` High
* `Rationale:` Proves the runtime’s strongest recovery guarantee around external actions: once a tool step completed and the completion boundary was checkpointed, a later crash must resume from that boundary and must not re-emit the same side effect.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime post-tool checkpointing, resume semantics, and no-duplicate-side-effect rule
* Layer 2: Tool Execution Framework idempotency and replay-visible result references
* Layer 2: Observability crash, checkpoint load, resumed step, and terminal recovery evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_runtime_recover`, one open thread `thread_runtime_recover`, one collaborative scope `scope_runtime_recover`, and deterministic runtime config with required checkpoint boundaries enabled.
* Seeded policy rules: allow one deterministic medium-risk tool call for the seeded request.
* Seeded memory and retrieval stores: available but not material to this recovery path.
* Selected model mode: recorded model adapter mode that emits one deterministic tool request, then expects a final response after recovery.
* Selected tool implementations: one deterministic file-copy or state-marking tool with a replay-visible idempotency key and result artifact.
* Expected capability set: the requested tool is in the effective tool set for the step.
* Execution-space posture: one attached execution space sufficient for the bounded tool action.
* Approval or replay fixtures: one crash injection point after the tool result is durably recorded and after the post-tool checkpoint boundary is written, but before final response completion.

### Given / When / Then

Given a run completes one external tool action successfully and the runtime writes the required post-tool checkpoint,
When the worker crashes before final response production and a later resume request restores the latest valid checkpoint,
Then runtime must continue from the validated boundary after the completed tool step, must not re-dispatch the already completed tool action, and must still produce a final answer using the recorded tool result.

### Required assertions

`Required fixtures:`

* The tool result is durably stored before crash injection.
* The post-tool checkpoint explicitly marks the action as completed.
* Resume uses the stored checkpoint rather than reconstructing from live tool state.

`Required observability artifacts:`

* One tool execution record and no second tool execution record for the same `toolCallId`.
* Post-tool checkpoint ref, crash event or worker-failure record, checkpoint-load ref, and resumed lifecycle events.
* Resumed reasoning-step record and final output ref.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the crash and recovery boundary.

`Required replay artifacts:`

* Tool request ref, tool result ref, and completed-action reference stored in the checkpoint.
* Checkpoint ref from the post-tool boundary and the resumed step record.
* Final output ref and immutable replay manifest proving the tool was not replayed live.

`Pass/fail oracle:`

* Exactly one external tool execution exists for the seeded action, resume begins from the stored post-tool checkpoint boundary, final output is produced after recovery, and replay can show why no duplicate side effect occurred.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Deterministic tool harness with stable idempotency key
* Crash-injection fixture at the selected boundary
* Checkpoint store fixture
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` Bounded child delegation creates a subagent run, merges the child result, and preserves parent ownership of the final response
* `Risk level:` High
* `Rationale:` Proves that the runtime owns delegation as a first-class orchestration path rather than as disguised tool execution: it must create an explicit `SubagentContextSpec`, narrow tools and budgets for the child, preserve parent-child lineage, and keep the parent run as the only authority for the final user response.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Agent Runtime `spawn_subagent`, child budget assignment, child capability narrowing, child result merge, and parent-owned final response
* Layer 2: Subagent Profiles and Delegation Contracts `SubagentRequest`, `DelegationBudget`, `SubagentResult`, and structured merge behavior
* Layer 2: Context Assembly bounded child context pack construction
* Layer 2: Policy and Approval policy path for subagent spawn
* Layer 2: Observability `SubagentTree`, child-run lineage, merge decision, and replay-manifest linkage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_runtime_child`, one open thread `thread_runtime_child`, one collaborative scope `scope_runtime_child`, and deterministic config enabling `delegation.analysis.default@v1`.
* Seeded policy rules: allow same-scope bounded delegation for the seeded task and deny any broader child capability envelope.
* Seeded memory and retrieval stores: one relevant evidence slice and one irrelevant evidence slice so bounded inheritance can be asserted.
* Selected model mode: recorded model adapter mode that emits one `spawn_subagent` decision and later one parent synthesis response.
* Selected tool implementations: the parent has a broader tool surface than the child; the child receives only the narrowed child tool profile.
* Expected capability set: the parent step may request delegation, but the child receives a bounded child tool set and budget rather than inheriting the full parent tool pack.
* Execution-space posture: child execution-space posture, when needed, is derived through runtime and policy, not inherited implicitly as unrestricted host access.
* Approval or replay fixtures: no approval wait is expected in this deterministic allow variant; replay must preserve the child handoff and merge lineage.

### Given / When / Then

Given a user asks for a decomposable analysis task that the recorded parent model fixture chooses to delegate,
When Agent Runtime validates the delegation request, evaluates policy for spawn, resolves the child delegation profile, builds a bounded `SubagentContextSpec`, creates the child run, waits for the child result artifact, validates the structured child result, and merges it into parent working state,
Then the parent remains the source of truth for the final response and the replay record makes the child handoff, child result, and merge decision explicit.

### Required assertions

`Required fixtures:`

* The child budget, timeout, depth, and fanout limits are explicit.
* The child tool set is narrower than the parent tool set.
* The child context excludes the full parent scratchpad and irrelevant evidence.

`Required observability artifacts:`

* Parent reasoning-step record showing `spawn_subagent`.
* `SubagentContextSpec` or equivalent child-context request ref.
* Child run creation record, child lifecycle events, child result artifact ref, and parent merge record.
* `SubagentTree`, `ExecutionGraph`, `RunTimeline`, and `RunSummary` views linking parent and child runs.

`Required replay artifacts:`

* Parent step record, child context-spec ref, child run or handle refs, and child result ref.
* Delegation profile ref, budget ref, effective child tool-set ref, and merge decision ref.
* Parent final output ref and replay manifest preserving child ordering.

`Pass/fail oracle:`

* One bounded child run is created from an explicit runtime-owned delegation contract, the child uses only the delegated context and capability surface, the parent validates and merges the child result, and only the parent run emits the final user-visible response.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed delegation decision
* Delegation-profile fixture service
* Deterministic child-runtime harness
* Seeded memory and retrieval fixtures with relevant and irrelevant evidence
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Streamed response remains non-authoritative until the final output artifact is checkpointed
* `Risk level:` Medium
* `Rationale:` Proves the runtime’s streaming contract: stream tokens are a side channel, not the authoritative committed result, and a step becomes `respond` only when the final output artifact is recorded and checkpointed.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime streaming behavior, step-finalization semantics, and terminal completion rules
* Layer 2: Observability replay-authoritative final output refs versus best-effort stream records

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_runtime_stream`, one open thread `thread_runtime_stream`, one collaborative scope `scope_runtime_stream`, and deterministic channel/runtime config with streaming enabled.
* Seeded policy rules: allow the model-only response path; no external action is requested.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode that emits one streamed answer sequence and one final normalized output artifact.
* Selected tool implementations: none invoked.
* Expected capability set: the effective tool set is empty.
* Execution-space posture: no execution-space-backed action is requested.
* Approval or replay fixtures: no approval fixture is expected; replay capture must preserve the final committed output artifact and may preserve stream chunks as best-effort diagnostics.

### Given / When / Then

Given a user asks a question on a streaming-capable channel and the recorded model fixture emits streamed chunks before the answer is complete,
When Agent Runtime opens a reasoning step, forwards stream chunks on the non-authoritative stream channel, records any stream evidence with the active `stepId`, and only later persists the final output artifact and completion checkpoint,
Then the run becomes `completed` only after the final output artifact is committed and exact replay prefers that stored final artifact rather than reconstructing from stream tokens.

### Required assertions

`Required fixtures:`

* Streaming is enabled for the channel or run config.
* The recorded model fixture provides both chunked output and one final normalized answer artifact.
* No external action is taken during the streamed step.

`Required observability artifacts:`

* One reasoning-step record for the streamed response.
* Stream records, if captured, each linked to the active `stepId`.
* Final output ref, terminal checkpoint or end-state snapshot ref, and terminal lifecycle events.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views.

`Required replay artifacts:`

* Model request ref and model response or stream refs where retained.
* Final output artifact ref marked as authoritative for exact replay.
* Replay manifest posture that distinguishes authoritative final output from best-effort stream diagnostics.

`Pass/fail oracle:`

* Stream emission alone does not mark the step as committed, the run completes only after final output persistence, and replay uses the final output artifact as the authoritative response for deterministic reconstruction.

### Required harness capabilities

* Synthetic streaming channel driver
* Identity and thread fixture service
* Recorded streaming model adapter mode
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Module black-box scenarios

## Scenario 7

### Scenario summary

* `Title:` `Start` rejects an invalid `RuntimeStartEnvelope` before run creation
* `Risk level:` High
* `Rationale:` Proves the runtime’s entry-boundary integrity: it must not create or queue a run when the pre-run handoff violates the required identity and thread contract.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Identity and Thread Management rule that `resolutionDisposition = "start_run"` must carry a valid `RuntimeStartEnvelope`
* Layer 2: Agent Runtime authenticated-start acceptance plus `Start` input validation before run creation
* Layer 2: Observability rejected-start evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one authenticated runnable start context `auth_ctx_runtime_invalid` and one inbound-resolution fixture whose `resolutionDisposition = "start_run"` but whose `RuntimeStartEnvelope` is invalid for runtime start, such as a missing `preRunEnvelope` or missing `threadId`.
* Seeded policy rules: not relevant because runtime must reject before live execution begins.
* Seeded memory and retrieval stores: not relevant.
* Selected model mode: not invoked.
* Selected tool implementations: none invoked.
* Expected capability set: none required because the run must not start.
* Execution-space posture: no execution space is attached.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given runtime receives a runnable start attempt whose `RuntimeStartEnvelope` violates the required pre-run identity or thread contract,
When `Start` validates required identifiers and entry preconditions,
Then runtime rejects the start request before creating an `AgentRun`, before opening any reasoning step, and before attempting model or tool execution.

### Required assertions

`Required fixtures:`

* The authenticated-start gate has already marked the attempt runnable so the failure is attributable to the invalid runtime-start envelope.
* The invalidity is deterministic and attributable to the entry envelope rather than downstream dependencies.
* No valid fallback `RuntimeStartEnvelope` exists for the same start attempt.

`Required observability artifacts:`

* Authenticated-start gating outcome tied to `auth_ctx_runtime_invalid`.
* Rejected-start record or validation-failure event with the offending inbound or runtime-start refs.
* No run creation event and no step record for the rejected start attempt.
* Audit ref preserving the invalid start evidence.

`Required replay artifacts:`

* Inbound-resolution ref or runtime-start input ref for the rejected start.
* Validation-failure artifact ref if persisted for replay or audit.
* Replay evidence that no run manifest or final output was committed for this attempt.

`Pass/fail oracle:`

* The invalid runtime start is rejected before run creation and no runtime execution artifacts beyond validation failure exist.

### Required harness capabilities

* Identity and thread fixture service with malformed handoff support
* Agent Runtime `Start` black-box driver
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The runtime document does not name a canonical error code or external response shape for rejected `Start` validation failures.

## Scenario 8

### Scenario summary

* `Title:` Malformed model output that maps to more than one decision class is rejected before any external action
* `Risk level:` High
* `Rationale:` Proves the runtime’s step-validation guard: each reasoning step must normalize into exactly one decision class, and ambiguous model output must not leak into execution as partially interpreted actions.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime rule that each reasoning step emits exactly one decision class
* Layer 2: Agent Runtime failure exit for invalid step decisions
* Layer 2: Observability malformed-step evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid runnable start context with a deterministic recorded model fixture.
* Seeded policy rules: not relevant because no external action should be reached.
* Seeded memory and retrieval stores: available but not material.
* Selected model mode: malformed recorded model adapter mode that returns data mapping simultaneously to two decision classes, such as a final response plus a tool request.
* Selected tool implementations: none invoked because runtime must reject before dispatch.
* Expected capability set: a non-empty or empty tool set may be present, but it must not matter because decision validation fails first.
* Execution-space posture: no execution space is used.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given runtime opens a reasoning step and receives model output that cannot be normalized into exactly one decision class,
When runtime validates the model result against the step contract,
Then it records a failure for the step before any tool, skill, subagent, approval wait, or final-output commit occurs.

### Required assertions

`Required fixtures:`

* The malformed model output deterministically maps to more than one decision class.
* No downstream action can start before step validation completes.

`Required observability artifacts:`

* One reasoning-step record with model request and model response refs.
* One validation-failure or step-failure record tied to the `stepId`.
* No tool, skill, subagent, approval, or final-output records for the rejected step.

`Required replay artifacts:`

* Model input and output refs for the malformed step.
* Step-failure artifact or error ref for the rejected decision normalization.
* Replay evidence that no external action was committed from the invalid step.

`Pass/fail oracle:`

* The malformed model result is rejected at step-validation time and produces zero downstream action artifacts.

### Required harness capabilities

* Agent Runtime black-box driver
* Recorded malformed model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Tool requests outside the current `EffectiveToolSet` are rejected before dispatch
* `Risk level:` High
* `Rationale:` Proves the runtime’s executable-capability boundary: a model may only request tools that runtime both exposed and can execute on the current path.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime effective-tool-set ownership and rejection of invocations outside the effective set
* Layer 2: Tool Execution Framework execution-time validation against runtime-issued authorization
* Layer 2: Observability rejected-tool-attempt evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid runnable start context with deterministic candidate-tool input.
* Seeded policy rules: allow only the seeded effective set and deny or omit the out-of-scope tool.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model adapter mode that requests one tool not present in the computed `EffectiveToolSet`.
* Selected tool implementations: both the allowed tool and the disallowed tool may exist in fixtures, but runtime must not dispatch the disallowed one.
* Expected capability set: the disallowed tool is either filtered out or never part of the effective set.
* Execution-space posture: any execution space needed by the disallowed tool is irrelevant because the request must be rejected before dispatch.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given runtime computed an `EffectiveToolSet` for the step and the model requests a tool outside that set,
When runtime validates the requested tool against the step’s effective tool exposure before authorization or dispatch,
Then the request is rejected and no tool execution request is sent downstream.

### Required assertions

`Required fixtures:`

* The disallowed tool request is deterministic and not a schema error; the failure cause is membership outside the effective set.
* The effective tool-set computation for the step is replay-visible.

`Required observability artifacts:`

* One `EffectiveToolSet` record with filtered or absent disallowed tool ref.
* One rejected-tool-attempt event tied to the step and requested tool id.
* No tool execution request or result ref for the disallowed tool.

`Required replay artifacts:`

* Step context ref, effective tool-set ref, model output ref, and rejection artifact ref.
* Replay evidence that no authorization envelope or downstream execution record exists for the disallowed tool attempt.

`Pass/fail oracle:`

* The disallowed tool is never dispatched because it is outside the current `EffectiveToolSet`, and the rejection is explicit in runtime evidence.

### Required harness capabilities

* Agent Runtime black-box driver
* Capability-resolution fixture service
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The runtime document does not specify whether the post-rejection path must always fail the run, replan, or surface a user-visible error when a model requests a tool outside the effective set.

## Scenario 10

### Scenario summary

* `Title:` Safety-critical `BeforeAction` middleware failure blocks external action and fails closed
* `Risk level:` High
* `Rationale:` Proves the runtime’s middleware safety posture: correctness- or safety-critical `BeforeAction` middleware must fail closed and prevent risky continuation.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime deterministic middleware ordering and fail-closed rule for safety-critical hooks
* Layer 2: Observability middleware execution and blocked-action evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid runnable context with a planned deterministic tool action.
* Seeded policy rules: allow the tool action if middleware permits execution to reach policy and dispatch.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model adapter mode that emits one tool request.
* Selected tool implementations: one deterministic tool that must not run if middleware fails.
* Expected capability set: the requested tool is present in the effective tool set.
* Execution-space posture: attached as required for the deterministic tool, but should remain unused because action is blocked before dispatch.
* Approval or replay fixtures: one safety-critical `BeforeAction` middleware fixture that deterministically returns failure.

### Given / When / Then

Given runtime has a valid tool request ready for the pre-action boundary,
When the ordered `BeforeAction` middleware chain executes and one safety-critical middleware returns failure,
Then runtime must fail closed at that boundary and must not dispatch the external action.

### Required assertions

`Required fixtures:`

* The failing middleware is declared safety-critical rather than observational.
* The tool request and all other preconditions are valid so the middleware failure is the sole blocker.

`Required observability artifacts:`

* Middleware execution record showing hook order and the failing middleware identity.
* Blocked-action record or failure event tied to the same `stepId`.
* No tool execution request or result record.

`Required replay artifacts:`

* Model output ref for the tool-request step.
* Middleware execution ref and blocked-action or failure ref.
* Replay evidence that no external action was committed after middleware failure.

`Pass/fail oracle:`

* The safety-critical middleware failure stops execution before any external action occurs and the blocked boundary is replay-visible.

### Required harness capabilities

* Agent Runtime black-box driver
* Middleware fixture service with safety-critical hook classification
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The runtime document defines fail-closed behavior for safety-critical middleware but does not fully specify whether the terminal outcome must be `failed`, `paused`, or a replan path for every middleware failure class.

## Scenario 11

### Scenario summary

* `Title:` Best-effort `AfterModel` middleware failure is recorded but the run continues
* `Risk level:` Medium
* `Rationale:` Proves the complementary middleware contract: observational or advisory hooks must not silently mutate execution, but their own failures should not block an otherwise safe step.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Agent Runtime deterministic middleware ordering and fail-open rule for best-effort hooks
* Layer 2: Observability middleware-failure evidence plus continued step execution

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid runnable context with a model-only final response path.
* Seeded policy rules: allow the model-only response path.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model adapter mode that emits one final response.
* Selected tool implementations: none invoked.
* Expected capability set: empty effective tool set.
* Execution-space posture: not used.
* Approval or replay fixtures: one best-effort `AfterModel` middleware fixture that deterministically fails after the model response is produced.

### Given / When / Then

Given runtime has already received a valid model response for a model-only step,
When the ordered `AfterModel` middleware chain executes and one best-effort middleware returns failure,
Then runtime records that middleware failure but continues to final output commit because the hook is observational rather than safety-critical.

### Required assertions

`Required fixtures:`

* The failing middleware is declared best-effort rather than safety-critical.
* The model response is otherwise valid and requires no external action.

`Required observability artifacts:`

* Middleware execution record showing hook order and the failed best-effort middleware.
* Final output ref and terminal lifecycle events despite the middleware failure.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views preserving both the middleware failure and successful completion.

`Required replay artifacts:`

* Model input and output refs for the step.
* Middleware execution ref carrying the best-effort failure.
* Final output ref and replay manifest showing continued successful completion.

`Pass/fail oracle:`

* The best-effort middleware failure is visible in runtime evidence, but the run still reaches final output because no safety-critical contract was violated.

### Required harness capabilities

* Agent Runtime black-box driver
* Middleware fixture service with best-effort hook classification
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Pre-action checkpoint write failure blocks risky continuation
* `Risk level:` High
* `Rationale:` Proves the runtime’s fail-closed recoverability boundary: when the required pre-action checkpoint cannot be persisted, runtime must not continue into a risky external action.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime mandatory pre-action checkpoint boundary and fail-closed checkpoint-write policy
* Layer 2: Observability checkpoint failure evidence and blocked action

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid runnable context with a deterministic tool-request step.
* Seeded policy rules: allow the exact tool action if runtime can reach dispatch.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model adapter mode that emits one tool request.
* Selected tool implementations: one deterministic tool that must not run when checkpoint persistence fails.
* Expected capability set: the requested tool is present in the effective tool set.
* Execution-space posture: attached as required for the deterministic tool.
* Approval or replay fixtures: checkpoint store fixture configured to fail the required pre-action checkpoint write and immediate retry for this scenario.

### Given / When / Then

Given runtime has a valid, policy-allowed external action ready for dispatch,
When it attempts to persist the required pre-action checkpoint and the checkpoint store fails even after the immediate retry policy,
Then runtime fails closed at the pre-action boundary and does not dispatch the external action.

### Required assertions

`Required fixtures:`

* The checkpoint failure occurs at the mandatory pre-action boundary.
* The tool action is otherwise fully valid so the blocked continuation is attributable to checkpoint persistence failure.

`Required observability artifacts:`

* Checkpoint write attempt records and failure records.
* Blocked-action or run-failure event linked to the checkpoint failure.
* No downstream tool execution request or result record.

`Required replay artifacts:`

* Model output ref for the tool-request step.
* Policy decision ref showing the action would have been allowed.
* Checkpoint failure artifact ref and replay evidence that no action record was committed afterward.

`Pass/fail oracle:`

* No risky external action executes when the required pre-action checkpoint cannot be written, and the failure boundary is explicit in replay-visible evidence.

### Required harness capabilities

* Agent Runtime black-box driver
* Recorded model adapter mode
* Checkpoint store failure-injection fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Concurrent duplicate `Resume` requests are serialized by lease or lock and do not duplicate work
* `Risk level:` High
* `Rationale:` Proves that resumability does not create parallel execution ambiguity: only one active execution owner may hold a run at a time, and duplicate resumes must not produce duplicate tool dispatch or inconsistent state.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime execution lease preconditions, resume semantics, and single-owner run execution
* Layer 2: Agent Runtime recovery strategy for duplicate resume via optimistic lock or lease enforcement
* Layer 2: Observability duplicate-resume conflict evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one paused or resumable run `run_runtime_duplicate_resume` with a valid checkpoint and pending continuation.
* Seeded policy rules: allow the resumed continuation if exactly one executor proceeds.
* Seeded memory and retrieval stores: available as required by the resumed boundary.
* Selected model mode: recorded model adapter mode or deterministic continuation fixture after resume.
* Selected tool implementations: if the resumed boundary involves an external action, the deterministic tool fixture must make duplicate execution observable.
* Expected capability set: identical resumed effective tool set for whichever executor lawfully acquires the run.
* Execution-space posture: attached if the resumed path requires it.
* Approval or replay fixtures: two concurrent `Resume` requests targeting the same `runId` and `checkpointRef`.

### Given / When / Then

Given a run is legally resumable from one checkpoint,
When two concurrent resume attempts race for the same run and checkpoint boundary,
Then runtime allows only one execution owner to acquire the run and advance the step, while the losing resume attempt is rejected or blocked without duplicating work.

### Required assertions

`Required fixtures:`

* Both resume attempts reference the same valid checkpoint.
* The continuation is deterministic so duplicate work would be visible if it occurred.

`Required observability artifacts:`

* One successful checkpoint-load and resume record for the winning executor.
* One lease-conflict, lock-conflict, or duplicate-resume rejection record for the losing executor.
* No duplicate reasoning-step advancement or tool execution for the same resumed boundary.

`Required replay artifacts:`

* Checkpoint ref for the resumed boundary.
* Resume event ref for the winning path and conflict or rejection artifact ref for the losing path.
* Replay evidence that only one execution path advanced beyond the checkpoint.

`Pass/fail oracle:`

* Exactly one executor resumes the run and no duplicated side effect or duplicated step advancement occurs.

### Required harness capabilities

* Agent Runtime `Resume` black-box driver
* Checkpoint store fixture
* Concurrency harness for racing resume attempts
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The runtime document defines optimistic-lock or lease enforcement for duplicate resume but does not define the exact loser-facing return contract or retry advice.

## Scenario 14

### Scenario summary

* `Title:` Duplicate `Start` within the configured idempotent ingress window does not create two active runs
* `Risk level:` Medium
* `Rationale:` Proves the runtime’s ingress-idempotency contract where enabled: deduplicated inbound retries must not fan out into duplicate runs or duplicate external work.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime `Start` idempotent handling for deduplicated inbound requests where configured
* Layer 2: Agent Runtime run-lease and active-run ownership consistency
* Layer 2: Observability duplicate-start evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid `RuntimeStartInput` and runtime config with `idempotentIngressWindow` enabled.
* Seeded policy rules: if the started run reaches any external action, the action is deterministic and would expose duplication.
* Seeded memory and retrieval stores: available as needed for the started run.
* Selected model mode: deterministic recorded model fixture for the duplicated start path.
* Selected tool implementations: optional deterministic tool fixture if the run includes an external action.
* Expected capability set: consistent across both duplicate start attempts.
* Execution-space posture: consistent across both duplicate start attempts when applicable.
* Approval or replay fixtures: two start attempts carrying the same deduplication identity within the configured ingress window.

### Given / When / Then

Given the same inbound request is submitted twice within the configured idempotent ingress window,
When runtime handles both `Start` attempts under dedupe-aware configuration,
Then it must not create two independent active runs for the same deduped inbound request and must not duplicate any downstream external work.

### Required assertions

`Required fixtures:`

* Both start attempts are identical under the configured deduplication identity.
* The attempts occur within the configured idempotent window.

`Required observability artifacts:`

* Start-attempt records for both submissions.
* Exactly one run creation record for the deduped work item or explicit dedupe linkage between the attempts.
* No duplicate downstream step or external-action records attributable to the second start.

`Required replay artifacts:`

* Runtime-start input refs for both attempts.
* Run handle or dedupe-linkage ref for the accepted or reused run.
* Replay evidence that only one authoritative execution path exists for the deduped request.

`Pass/fail oracle:`

* Duplicate start attempts inside the dedupe window do not produce two active runs or duplicate external work.

### Required harness capabilities

* Agent Runtime `Start` black-box driver
* Identity and thread fixture service
* Dedupe-aware ingress fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The runtime document says `Start` should support idempotent handling where configured, but it does not define whether the second caller receives the original `RunHandle`, a distinct dedupe acknowledgement, or another response shape.

## Scenario 15

### Scenario summary

* `Title:` First-contact pairing requirement emits a pairing challenge and creates no `AgentRun`
* `Risk level:` High
* `Rationale:` Proves the new pre-run security boundary: when a protected channel requires verified linkage, unresolved first-contact pairing must stop before run creation and return a non-runnable challenge outcome instead of entering the normal run-state machine.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Agent Runtime pre-run authentication and pairing boundary for runnable versus non-runnable start dispositions
* Layer 2: Agent Runtime lifecycle rule that unresolved pairing emits a challenge outcome and stops before run creation
* Layer 2: Agent Runtime middleware and observability requirements for authenticated-start gating, `BeforeRunStart`, and `run.start_gate`
* Layer 2: Agent Runtime auth/pairing dependency that may read authenticated-start outcomes or create a pairing challenge

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one protected chat channel whose deterministic channel/product configuration requires verified account linkage before runtime start, `allowGuestRuntimeStart = false`, and one first-contact provider account `acct_runtime_pairing_pending` that is not yet linked to a verified canonical user.
* Seeded auth and pairing fixtures: one deterministic auth/pairing client fixture that returns a non-runnable pairing outcome plus one pairing challenge `pair_chal_runtime_001` bound to the inbound event, provider account, tenant/workspace namespace, and short TTL.
* Seeded identity and thread posture: canonical inbound message normalization succeeds, but no runnable `RuntimeStartEnvelope` is produced for this attempt because linkage remains unresolved.
* Seeded policy rules: not relevant because runtime must stop before any executable action path begins.
* Seeded memory and retrieval stores: not relevant.
* Selected model mode: not invoked.
* Selected tool implementations: none invoked.
* Expected capability set: none required because no run starts.
* Execution-space posture: no execution space is allocated.
* Approval or replay fixtures: no approval fixture is expected; start-gate audit and pairing-challenge evidence must be preserved.

### Given / When / Then

Given a first inbound message arrives on a channel that requires verified account linkage and the provider account is still unlinked,
When the runtime start gate evaluates authenticated-start prerequisites and the auth/pairing dependency returns an unresolved first-contact pairing outcome,
Then runtime emits the pairing challenge outcome, records the blocked-start reason, and stops before creating an `AgentRun`, opening a `ReasoningStep`, or invoking model, tool, skill, or subagent paths.

### Required assertions

`Required fixtures:`

* Guest runtime start is disabled for the protected channel.
* The pairing challenge is deterministic, bound to the inbound event and provider account, and attributable to unresolved linkage rather than malformed input.
* No runnable `RuntimeStartEnvelope` exists for the same start attempt.

`Required observability artifacts:`

* Authenticated-start gating outcome and `run.start_gate` trace span for the blocked attempt.
* Pairing challenge issuance record or blocked-start event tied to `pair_chal_runtime_001`.
* No run creation event, no run-state transition beyond pre-run gating, and no `ReasoningStep`, context assembly, model, tool, skill, or subagent record.
* Audit refs preserving the blocked-start reason and challenge lineage.

`Required replay artifacts:`

* Inbound event ref and authenticated-start audit ref for the blocked attempt.
* Pairing challenge artifact ref with binding metadata sufficient for audit.
* Replay evidence that no run manifest, final output, checkpoint, or external-action artifact was committed for this attempt.

`Pass/fail oracle:`

* The blocked first-contact attempt produces a pairing challenge and start-gate evidence, and no `AgentRun` or downstream execution artifact exists until a later runnable start is submitted.

### Required harness capabilities

* Synthetic chat channel or runtime-ingress driver
* Auth middleware / pairing client fixture with deterministic blocked-start behavior
* Identity and thread fixture service for non-runnable start outcomes
* Trace collector, start-gate audit inspector, and replay verifier

### Open questions / contract gaps

* `contract gap:` The design set does not yet define a channel-agnostic pairing-challenge payload or the exact blocked-start response contract returned upstream.
* `contract gap:` There is not yet a standalone Layer 2 auth/pairing subsystem document defining challenge lifecycle, expiry, and completion callbacks outside the runtime-facing dependency seam.

## Module coverage by scenario

| Scenario | Test style | Primary contract cluster | Required modules under test |
| --- | --- | --- | --- |
| Scenario 1 | user journey | run start, single-step execution, and terminal finalization | Identity and Thread Management, Agent Runtime, Context Assembly, Observability |
| Scenario 2 | user journey | effective tool exposure and governed tool orchestration | Agent Runtime, Policy and Approval, Tool Execution Framework, Sandbox / Execution Space, Observability |
| Scenario 3 | user journey | approval wait and resumable execution | Agent Runtime, Policy and Approval, Tool Execution Framework, Observability |
| Scenario 4 | user journey | crash-safe resume after completed external action | Agent Runtime, Tool Execution Framework, Observability |
| Scenario 5 | user journey | bounded delegation and child-result merge | Agent Runtime, Subagent Profiles and Delegation Contracts, Context Assembly, Policy and Approval, Observability |
| Scenario 6 | user journey | streaming versus authoritative finalization | Agent Runtime, Observability |
| Scenario 7 | module black-box | start-input validation and pre-run identity contract | Identity and Thread Management, Agent Runtime, Observability |
| Scenario 8 | module black-box | exactly-one-decision step validation | Agent Runtime, Observability |
| Scenario 9 | module black-box | effective-tool-set rejection before dispatch | Agent Runtime, Tool Execution Framework, Observability |
| Scenario 10 | module black-box | fail-closed safety middleware | Agent Runtime, Observability |
| Scenario 11 | module black-box | fail-open best-effort middleware | Agent Runtime, Observability |
| Scenario 12 | module black-box | pre-action checkpoint integrity | Agent Runtime, Observability |
| Scenario 13 | module black-box | duplicate-resume single-owner enforcement | Agent Runtime, Observability |
| Scenario 14 | module black-box | ingress idempotency and duplicate-start suppression | Agent Runtime, Identity and Thread Management, Observability |
| Scenario 15 | module black-box | blocked first-contact pairing and no-run start gate | Agent Runtime, auth middleware / pairing service, Observability |

## Coverage notes by module

* `Agent Runtime`: covered for authenticated-start gating, start, step execution, `EffectiveToolSet`, policy-carrying external actions, checkpoint boundaries, approval waits, resume, crash recovery, middleware ordering, streaming finalization, delegation, duplicate-resume protection, and ingress idempotency.
* `Identity and Thread Management`: covered where `RuntimeStartEnvelope` and `PreRunEnvelope` gate legal start behavior, where invalid pre-run handoffs must be rejected, and where resume paths must not depend on re-running inbound identity resolution.
* `Context Assembly`: covered where runtime depends on ordered run-start snapshots and bounded child-context construction.
* `Policy and Approval`: covered where runtime must carry allow, deny, and approval-required decisions for tool and delegation paths without bypassing governance.
* `Tool Execution Framework`: covered where runtime-owned tool exposure, authorization, dispatch, and no-duplicate-side-effect recovery interact on the live path.
* `Sandbox / Execution Space`: covered where runtime must propagate `executionSpaceId` and rely on sandboxed execution rather than host fallback for execution-space-backed tool work.
* `Subagent Profiles and Delegation Contracts`: covered where child budgets, child capability narrowing, merge contracts, and parent-child lineage are runtime-owned.
* `auth middleware / pairing service`: covered where runtime depends on authenticated runnable-start evidence, blocked first-contact pairing outcomes, and deterministic challenge issuance before any `AgentRun` exists.
* `Observability, Replay, and Cost Control`: required in every scenario for lifecycle events, reasoning-step refs, checkpoints, tool or child refs where applicable, final output refs, and immutable replay manifests or equivalent replay evidence.
