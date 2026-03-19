# Basic User Journey Cases

This document proposes seven deterministic scenarios derived from the RFC's prioritized journeys: six core user journeys plus one explicit configuration-precedence journey. Each scenario keeps one primary contract cluster and adds only the secondary contracts required to make the journey executable in the deterministic integration lab.

## Scenario 1

### Scenario summary

* `Title:` Inbound chat to model-only response
* `Risk level:` Low
* `Rationale:` Proves the baseline inbound-to-response path works end to end when no tool, skill, memory write, or subagent action is needed, while still enforcing identity propagation, legal run lifecycle, checkpointing, observability, and replay capture.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Channel Gateway canonical inbound envelope construction and replay-visible payload preservation
* Layer 2: Identity and Thread Management `InboundResolutionResult -> RuntimeStartEnvelope -> PreRunEnvelope`
* Layer 2: Agent Runtime standard lifecycle, `ReasoningStep`, `Checkpoint`, and terminal completion flow
* Layer 2: Context Assembly strict layer order with empty memory and RAG layers allowed
* Layer 2: Observability required `RunTimeline`, `ExecutionGraph`, `RunSummary`, and replay manifest capture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user, one open canonical thread, one active collaborative scope, and deterministic system/environment/scope/agent/channel/user/run configuration resolved before runtime start.
* Seeded policy rules: allow runtime start and final outbound response handling for the synthetic channel; no extra capability exposure is granted for this step.
* Seeded memory and retrieval stores: both stores exist and are empty for this scenario so the context snapshot can prove they remain distinct and unused.
* Selected model mode: recorded or golden model adapter mode with one fixed model-only completion.
* Selected tool implementations: none selected for execution; runtime computes an empty effective tool set for the step.
* Expected capability set: no tool, skill, or subagent capability is exposed for the model step.
* Execution-space posture: no side-effecting execution is requested; if an execution space id is attached by platform policy, it remains lineage only and is not used for sandboxed work.

### Given / When / Then

Given a canonical inbound chat message from a verified user on an existing open thread and a deterministic model fixture that returns a direct answer without requesting any capability,
When the Channel Gateway emits the canonical inbound envelope, Identity and Thread Management returns `resolutionDisposition = "start_run"`, Agent Runtime creates the run, assembles context, opens one reasoning step, calls model access, and produces a final response,
Then the run completes without tool, skill, memory-write, or subagent execution and the synthetic channel receives the final response linked back to the original inbound event.

### Required assertions

`Required fixtures:`

* The verified channel account remains linked to the seeded canonical user.
* The open thread remains the resolved thread for the inbound event.
* The recorded model fixture returns the expected model-only response.
* The effective tool set for the reasoning step is empty.

`Required observability artifacts:`

* Canonical inbound envelope ref and original provider payload ref.
* Identity resolution record and thread resolution record.
* Runtime lifecycle events covering create, running, and completed states.
* One `ReasoningStep` with context snapshot ref, model request ref, model response ref, and effective tool set ref.
* Capability exposure decision record showing no executable capability was exposed.
* Final output ref and linked run summary.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views for the run.

`Required replay artifacts:`

* Context snapshot ref with inclusion provenance.
* Model input and output refs for the single reasoning step.
* Checkpoint ref after context assembly or step boundary as configured, plus terminal completion evidence.
* Immutable replay manifest with declared replay fidelity for this deterministic run.

`Pass/fail oracle:`

* One completed run exists for the inbound event, the final response matches the recorded model output, no tool or child-run artifacts exist, and the replay manifest contains the context, model, checkpoint, and final-output evidence required to reconstruct the run.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded or golden model adapter mode
* Trace collector and run-view materializer
* Replay verifier
* Seeded empty memory store
* Seeded empty retrieval corpus fixture

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Inbound chat to allowed deterministic tool use and response
* `Risk level:` Medium
* `Rationale:` Proves the policy-first tool path for a normal user request, including executable capability exposure, pre-action policy evaluation, checkpointing before the action, single tool execution, result normalization, and replay-visible tool evidence.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime `EffectiveToolSet`, pre-action checkpointing, and tool-request decision handling
* Layer 2: Policy and Approval `Intent -> Risk Classification -> Policy Evaluation -> Decision -> Enforcement` for `tool_execution`
* Layer 2: Tool Execution Framework `Request -> Validate -> Policy -> Approval -> Execute -> Post-process -> Log`
* Layer 2: Observability capture of policy decisions, tool calls, checkpoints, and final output

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user on one open thread with deterministic config precedence resolved before runtime execution.
* Seeded policy rules: allow one exact low-risk read-only tool execution for the seeded request hash and deny all other tool executions.
* Seeded memory and retrieval stores: available but unused for this scenario.
* Selected model mode: recorded model adapter mode that emits one tool request followed by one final response after the tool result.
* Selected tool implementations: one deterministic read-only fixture tool descriptor with immutable version, valid input and output schema, and lab adapter backing.
* Expected capability set: the single seeded tool descriptor is present in the `EffectiveToolSet`; no additional tool is exposed.
* Execution-space posture: the selected tool fixture does not require an execution space; if an execution space id is present, it remains propagated but unused by the tool.

### Given / When / Then

Given an inbound chat asking for information that the recorded model fixture is defined to answer by calling one deterministic read-only tool,
When runtime computes the effective tool set, the model emits the tool request, runtime validates the request, policy evaluates the exact `tool_execution` intent as `allow`, runtime checkpoints before the action, Tool Execution Framework runs the tool once, and runtime continues to a final answer,
Then the user receives a final response based on the tool result, and the run completes with one policy decision, one tool execution record, and no duplicate action on the path.

### Required assertions

`Required fixtures:`

* The seeded tool descriptor version and schema remain immutable for the run.
* The effective tool set contains exactly the allowed fixture tool.
* The recorded model emits the expected tool request and final response sequence.
* No approval fixture is used for this scenario.

`Required observability artifacts:`

* Capability exposure decision record for the single exposed tool.
* Policy evaluation request, risk assessment, immutable policy snapshot ref, and `allow` decision for the exact tool request.
* Pre-action checkpoint ref created before tool execution.
* Tool invocation record with request args ref, normalized result ref, and any artifact refs returned by the tool.
* Runtime events linking the reasoning step, policy decision, tool execution, and final output.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` showing the policy-before-tool order.

`Required replay artifacts:`

* Model inputs and outputs for both the tool-request step and the final-response step.
* Policy snapshot ref and decision ref for the tool execution.
* Tool request and result refs with immutable descriptor version.
* Checkpoint refs that prove resume would restart from the correct side-effect boundary.
* Replay manifest that includes model, policy, tool, checkpoint, and final-output refs.

`Pass/fail oracle:`

* The tool executes exactly once, only after a replay-visible `allow` decision for the bound request, the final answer matches the recorded post-tool output, and the replay manifest can reconstruct the tool path without missing policy or tool evidence.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed tool-call sequence
* Deterministic tool harness with schema validation
* Policy fixture service with exact request-hash matching
* Trace collector and replay verifier
* Checkpoint inspector

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Inbound reply resolves thread outcome from layered configuration precedence
* `Risk level:` Medium
* `Rationale:` Proves the configuration-precedence contract on a live inbound path by forcing a deterministic conflict between continuity-friendly lower-precedence settings and a higher-precedence restriction that requires new-thread creation after a scope change.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Identity and Thread Management configuration direction, session-policy inputs, and thread precedence rules
* Layer 2: Channel Gateway canonical inbound envelope and provider metadata preservation
* Layer 2: Agent Runtime start path from the resulting `PreRunEnvelope`
* Layer 2: Observability config snapshot refs, identity/thread decision events, and replay-visible resolution artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified email user, one recent open canonical thread in collaborative scope `scope-A`, and one inbound event that resolves to collaborative scope `scope-B` before runtime start.
* Seeded configuration layers: system config allows recent-thread reuse and email subject continuity; channel config enables subject-based continuity; user config requests permissive reuse where allowed; collaborative-scope config sets `forceNewThreadOnScopeChange = true`; no run-level override is allowed on the fresh inbound resolution path.
* Seeded policy rules: allow same-user runtime start in `scope-B` after thread resolution; no cross-scope data access is granted to reuse the old thread.
* Seeded memory and retrieval stores: not required for this scenario.
* Selected model mode: recorded model adapter mode with one model-only completion after runtime starts on the resolved thread.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or child capability is exposed for the step.
* Execution-space posture: no execution-space-backed action is requested.

### Given / When / Then

Given an inbound email reply from a verified user where subject continuity and recent-thread reuse would normally allow reuse of a recent thread in `scope-A`, but the current inbound interaction resolves to `scope-B`,
When Identity and Thread Management applies the layered configuration sources in precedence order, records the effective config snapshot, rejects reuse across the scope change because `forceNewThreadOnScopeChange = true` at the higher-precedence collaborative-scope layer, and returns `resolutionDisposition = "start_run"` with a newly created thread,
Then runtime starts on the new canonical thread in `scope-B`, the old thread in `scope-A` is not reused, and the resolution artifacts show exactly which config sources and precedence rule produced that outcome.

### Required assertions

`Required fixtures:`

* No explicit provider-thread binding exists for the inbound event, so continuity depends on session-policy evaluation rather than binding precedence.
* The inbound subject and recency window satisfy the lower-precedence continuity conditions.
* The higher-precedence collaborative-scope setting `forceNewThreadOnScopeChange = true` is active for `scope-B`.
* No run-level override participates in the inbound decision before `runId` creation.

`Required observability artifacts:`

* Canonical inbound envelope ref with provider metadata and payload ref.
* Identity resolution record proving the canonical user match.
* Scope-resolution evidence proving the inbound event resolves to `scope-B`.
* Thread-resolution record with `outcome = "created"` and reason codes referencing the scope-change restriction.
* `session_policy_applied` or equivalent identity/thread decision events that include config snapshot refs and source lineage.
* Runtime start evidence showing the newly created `threadId` carried into the `PreRunEnvelope` and then the run.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views for the resulting run.

`Required replay artifacts:`

* Inbound payload ref and canonical inbound envelope ref.
* Config snapshot refs or equivalent source refs showing the applied precedence order.
* Identity, scope, and thread resolution records with reason codes.
* Model input and output refs for the first runtime step on the new thread.
* Replay manifest that reconstructs the resolution path without re-inferring config precedence from live state.

`Pass/fail oracle:`

* The same canonical user is resolved, a new canonical thread is created in `scope-B`, the recent thread in `scope-A` is not reused despite lower-precedence continuity-friendly settings, and the replay-visible config evidence shows the higher-precedence scope rule was decisive.

### Required harness capabilities

* Synthetic email channel driver
* Identity and thread fixture service
* Layered configuration fixture service with source refs and precedence control
* Scope-membership fixture service
* Recorded model adapter mode
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Inbound email reply attaches to existing canonical thread
* `Risk level:` Low
* `Rationale:` Proves user and thread continuity on a channel-specific conversational path, including canonical email ingress, identity resolution, deterministic thread attachment, `PreRunEnvelope` creation, thread-summary inclusion, and response production on the existing conversation.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Channel Gateway canonical inbound envelope and provider-thread linkage preservation
* Layer 2: Identity and Thread Management verified account match, provider thread binding lookup, `attached` thread outcome, and `RuntimeStartEnvelope`
* Layer 2: Agent Runtime new run creation against an existing canonical thread
* Layer 2: Context Assembly inclusion of the existing thread summary
* Layer 2: Observability capture of identity and thread decisions plus run evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified email account linked to one canonical user, one active `ProviderThreadBinding`, one open canonical thread with a stored summary, and deterministic config resolved before runtime start.
* Seeded policy rules: allow normal same-scope runtime start and outbound response handling for the synthetic email channel.
* Seeded memory and retrieval stores: optional stores available but not required for this scenario.
* Selected model mode: recorded model adapter mode with one model-only completion that depends on the thread summary being present.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or child capability is exposed for this step.
* Execution-space posture: no execution-space-backed action is requested.

### Given / When / Then

Given a synthetic inbound email reply whose `providerThreadKey` and verified sender account are already bound to an open canonical thread for the same user,
When Channel Gateway normalizes the message, Identity and Thread Management resolves the canonical user, reuses the existing thread with an `attached` outcome, returns a valid `PreRunEnvelope`, and runtime starts a new run on that thread using the stored thread summary,
Then the response is produced on the existing conversation path without creating a new canonical thread or losing the original user and thread lineage.

### Required assertions

`Required fixtures:`

* The verified email account remains linked to the same canonical user throughout the flow.
* The existing `ProviderThreadBinding` remains active and maps to the pre-seeded thread.
* The stored thread summary is included in the runtime context for the step.
* No new thread record is created for the inbound event.

`Required observability artifacts:`

* Canonical inbound envelope ref with original provider payload ref.
* Identity resolution record showing the matched canonical user.
* Thread resolution record showing `outcome = "attached"` and the existing `threadId`.
* Runtime start evidence showing a valid `PreRunEnvelope` entering runtime and `RunEnvelope` after run creation.
* Context snapshot ref showing thread-summary inclusion.
* Final output ref plus run summary and timeline views.

`Required replay artifacts:`

* Provider payload ref, inbound envelope ref, and identity/thread audit refs.
* Context snapshot ref with thread summary provenance.
* Model input and output refs for the response step.
* Checkpoint and final manifest refs sufficient to replay the resumed conversation turn.

`Pass/fail oracle:`

* The inbound event resolves to the pre-seeded user and thread, the run completes on that thread, no replacement thread is created, and replay can reconstruct the exact identity and thread attachment path from the stored artifacts.

### Required harness capabilities

* Synthetic email channel driver
* Identity and thread fixture service with provider-thread bindings
* Recorded model adapter mode
* Thread-summary fixture loader
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` Inbound request uses memory retrieval and RAG evidence without conflation
* `Risk level:` Medium
* `Rationale:` Proves the platform can answer with external evidence while keeping memory retrieval and RAG retrieval distinct in data model, context assembly, observability, and replay, which is a non-negotiable cross-cutting contract.

### Contracts validated

* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory System scoped retrieval and provenance-rich `MemoryQueryResult`
* Layer 2: RAG Infrastructure bounded retrieval, reranking, citation packaging, and snapshot provenance
* Layer 2: Context Assembly strict order with `memory_retrieval` before `rag_results`
* Layer 2: Agent Runtime orchestration of retrieval-backed reasoning without turning retrieval into memory
* Layer 2: Observability capture of memory reads, retrieval queries, context snapshot refs, and citations

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one user and one open thread in one collaborative scope with deterministic config precedence resolved before execution.
* Seeded policy rules: allow same-scope memory retrieval and allow access to one seeded retrieval corpus; deny any memory write in this scenario.
* Seeded memory and retrieval stores: one relevant memory record in allowed scope with explicit provenance and one relevant corpus snapshot with retrievable chunks and citations for the same user question.
* Selected model mode: recorded model adapter mode that expects separate memory and RAG evidence in the assembled context and returns one evidence-based response.
* Selected tool implementations: none invoked; retrieval is performed through the retrieval and memory subsystems rather than user-visible tool calls.
* Expected capability set: no extra tool capability is required for the reasoning step.
* Execution-space posture: no sandboxed execution is requested.

### Given / When / Then

Given a user request that requires external document evidence and also has one relevant scoped memory preference,
When runtime issues one memory retrieval request and one retrieval query, Context Assembly builds the snapshot with memory evidence in the `memory_retrieval` layer and document evidence in the `rag_results` layer, and the recorded model fixture generates a response using both sources for their allowed roles,
Then the final answer reflects the seeded preference and cites the retrieved document evidence without merging the two evidence types or producing any memory write.

### Required assertions

`Required fixtures:`

* The memory record is in a live state and belongs to an allowed scope.
* The retrieval query is limited to the seeded allowed corpus snapshot.
* Memory and RAG fixtures remain physically and logically separate stores.
* No memory candidate or memory write request is created during this scenario.

`Required observability artifacts:`

* Memory query record and bounded `MemoryQueryResult` with memory ids, scope provenance, and reason codes.
* Retrieval query ref, corpus snapshot ref, rerank result metadata, and citation-packaging refs.
* Context snapshot ref showing distinct `memory_retrieval` and `rag_results` layers.
* Runtime events linking the retrieval reads to the reasoning step and final output.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views reflecting both evidence paths.

`Required replay artifacts:`

* Memory query ref and result ref.
* Retrieval query ref, result snapshot ref, and citation refs.
* Context snapshot ref with inclusion provenance for both evidence layers.
* Model input and output refs for the final reasoning step.
* Replay manifest proving the run can be reconstructed without collapsing memory evidence into RAG or vice versa.

`Pass/fail oracle:`

* The run completes with one memory read path and one retrieval path, the context snapshot preserves the correct layer order and separation, the final answer uses the seeded evidence correctly, and no memory write artifact exists.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Seeded memory store with provenance-preserving retrieval
* Seeded retrieval corpus and snapshot fixture service
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Explicit user memory request persists a scoped preference
* `Risk level:` Medium
* `Rationale:` Proves the governed persistent-write path for user memory, including candidate creation, validation, conflict check, policy decision before write, durable write result, and replay-visible memory mutation artifacts.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory System `Candidate -> Classify -> Validate -> Conflict Check -> Score -> Write / Reject`
* Layer 2: Memory System explicit user request rule for auto-write as pinned after validation and policy allow
* Layer 2: Policy and Approval evaluation for `memory_write`
* Layer 2: Agent Runtime post-run extraction or explicit memory-candidate emission hook
* Layer 2: Observability capture of memory candidates, policy decisions, write results, and final output

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one user and one open thread with deterministic config precedence already resolved.
* Seeded policy rules: allow same-user, same-scope explicit memory writes for one preference record and deny any cross-scope write.
* Seeded memory and retrieval stores: no conflicting active preference exists in the target scope before the run starts.
* Selected model mode: recorded model adapter mode that returns an acknowledgement after the governed memory-write path succeeds.
* Selected tool implementations: none invoked.
* Expected capability set: no tool capability is required; the persistent side effect is the governed memory write path.
* Execution-space posture: no sandboxed execution is required for the write path.

### Given / When / Then

Given a user message that explicitly asks the platform to remember a personal preference in the user's own scope,
When runtime captures the request as a `user_explicit` memory candidate, the Memory System classifies, validates, conflict-checks, and scores the candidate, policy evaluates the exact `memory_write` request as `allow`, and the Memory System persists the resulting record as live scoped memory,
Then the run completes with an acknowledgement to the user and one replay-visible memory write result that creates a pinned preference record in the allowed scope.

### Required assertions

`Required fixtures:`

* The created memory candidate has source `user_explicit`.
* The candidate targets one explicit scope and valid memory type.
* The target scope contains no pre-existing conflicting live record.
* The resulting memory record uses explicit trust, retention, and provenance metadata.

`Required observability artifacts:`

* Memory candidate ref and write request ref bound to the run and step lineage.
* Policy evaluation request, risk assessment, snapshot ref, and `allow` decision for `memory_write`.
* Memory write result with `status = "written"` and the created `memoryId`.
* Runtime events linking user request, write outcome, and final acknowledgement.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing policy-before-write ordering.

`Required replay artifacts:`

* Memory candidate ref with provenance.
* Policy snapshot ref and decision ref for the memory write.
* Memory write result ref and created memory record ref.
* Model input and output refs for the acknowledgement step.
* Replay manifest that includes the write path without relying on reconstructed guesses.

`Pass/fail oracle:`

* Exactly one live memory record is created in the intended scope, it is backed by a replay-visible `allow` decision and write result, the user receives the recorded acknowledgement, and no cross-scope or duplicate write artifact exists.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Memory candidate and write-path fixture service
* Policy fixture service for `memory_write`
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Complex request delegates bounded analysis to one child run
* `Risk level:` High
* `Rationale:` Proves the core bounded-delegation journey, including runtime-owned child creation, explicit task bounds, delegated child profile and route selection, policy evaluation before spawn, child lineage capture, merge back into the parent, and replay-visible subagent tree evidence.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime `spawn_subagent` decision class and child-run orchestration
* Layer 2: Subagent Profiles and Delegation Contracts explicit `SubagentTaskContract`, `DelegationBudget`, `ChildCapabilityEnvelope`, `ChildContextInheritance`, and `MergeContract`
* Layer 2: Policy and Approval evaluation for `subagent_spawn`
* Layer 2: Context Assembly bounded child-context pack and exclusion of the full parent scratchpad
* Layer 2: Observability `SubagentTree`, child-run lineage, join ordering, and replay manifest linkage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one user and one open thread with deterministic configuration resolved before execution.
* Seeded policy rules: allow one same-scope bounded child spawn using `delegation.analysis.default@v1` and deny any broader child profile, cross-scope spawn, or nested delegation beyond the configured depth.
* Seeded memory and retrieval stores: optional evidence fixtures available for parent summary and selected child evidence refs only; unrelated evidence exists but must remain excluded from the child pack.
* Selected model mode: recorded parent and child model adapter mode with fixed parent-delegate-child-join-finalize behavior.
* Selected tool implementations: child capability envelope resolves from `platform.subagent.analysis@v1`; no full Head Agent default profile is delegated.
* Expected capability set: parent may request `spawn_subagent`; child receives only the delegated child route profile and delegated child tool profile refs required by the task.
* Execution-space posture: execution-space lineage is propagated when applicable; no child may widen execution-space permissions beyond the parent contract.

### Given / When / Then

Given a complex inbound request whose deterministic fixture requires bounded evidence gathering that the parent run is defined to delegate,
When the parent reasoning step emits `spawn_subagent`, runtime resolves `delegation.analysis.default@v1`, applies policy to the exact `subagent_spawn` request, builds a bounded child context pack in `summary_plus_evidence` mode, creates the child run with explicit budget and child capability refs, waits for the child result artifact, and merges that structured result into the parent flow,
Then the parent produces the final user response, the child never writes directly to the user channel, and the full parent-child lineage is available through replay and run views.

### Required assertions

`Required fixtures:`

* The child request includes explicit objective, success criteria, budget, child route profile ref, child tool profile ref, inheritance mode, and merge contract.
* The child tool profile is a delegated subset and is not `platform.head.default`.
* The child context pack excludes the full parent scratchpad and unrelated evidence blocks.
* Parent depth and fanout limits remain within the seeded configuration.

`Required observability artifacts:`

* Parent reasoning-step record with `spawn_subagent` decision class.
* Policy evaluation request, snapshot ref, and decision ref for the child spawn.
* Child creation record with `parentRunId`, `parentStepId`, `childRunId`, `delegationProfileId`, version, budget, context inheritance, and merge contract.
* Child lifecycle events, child result artifact ref, and parent join or merge event.
* `RunTimeline`, `ExecutionGraph`, `SubagentTree`, and `RunSummary` views that show parent-child ordering and join completion.

`Required replay artifacts:`

* Parent and child model inputs and outputs for their respective reasoning steps.
* Child context pack ref and bounded evidence refs.
* Delegation profile ref, child capability refs, policy decision ref, and any approval ref if present.
* Child result artifact ref with provenance refs and unresolved issues field.
* Parent and child checkpoint refs and linked replay manifests that preserve child creation and join order.

`Pass/fail oracle:`

* Exactly one child run is created from a replay-visible `spawn_subagent` path, the child capabilities and budget remain within the delegated contract, the child result is merged by the parent rather than sent directly to the user, and the replay artifacts reconstruct the full delegation boundary without missing lineage.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded parent and child model adapter mode
* Delegation profile fixture resolver
* Child-run orchestration harness
* Trace collector, run-view materializer, and replay verifier
* Optional seeded evidence fixture service for child handoff packs

### Open questions / contract gaps

* None
