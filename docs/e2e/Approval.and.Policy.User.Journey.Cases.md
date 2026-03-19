# Approval and Policy User Journey Cases

This document proposes twelve deterministic Suite B journeys for approval and policy coverage.
It starts from end-to-end user journeys, then closes with a module coverage map so subsystem owners can review the same suite from their contract boundary.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic channel ingress
* seeded identity, thread, scope, policy, memory, and execution-space fixtures
* recorded model decisions
* fake or lab-backed tool adapters
* full checkpoint, trace, and replay capture

## Journey order

1. low-risk read-only tool auto-allowed
2. medium-risk bounded file mutation allowed with enforceable conditions
3. high-risk file patch paused for approval, then resumed and executed
4. high-risk file write paused for approval, then denied with zero execution
5. high-risk network fetch denied before any side effect
6. explicit shared-scope memory write denied before persistence
7. subagent spawn denied when requested child capabilities exceed scope policy
8. high-risk network capability hidden before model reasoning in a restricted scope
9. skill activation is allowed but nested file mutation is still denied downstream
10. stale approval is rejected after policy snapshot drift
11. cross-scope memory retrieval waits for approval and returns only the approved scope slice
12. downstream enforcement cannot satisfy returned conditions, so execution rejects before any side effect

## Scenario 1

### Scenario summary

* `Title:` User asks a repo question and one low-risk read-only tool auto-executes
* `Risk level:` Low
* `Rationale:` Proves the baseline policy-first tool path for approval and policy coverage by showing that a low-risk, execution-space-bound read tool may execute automatically only after capability exposure, exact policy evaluation, pre-action checkpointing, sandboxed execution, and replay capture all succeed.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway canonical inbound envelope and inbound payload preservation
* Layer 2: Identity and Thread Management `InboundResolutionResult -> RuntimeStartEnvelope -> PreRunEnvelope`
* Layer 2: Agent Runtime `EffectiveToolSet`, reasoning-step boundary, pre-action checkpointing, and `RunEnvelope` propagation
* Layer 2: Policy and Approval `Intent -> Risk Classification -> Policy Evaluation -> Decision -> Enforcement` for `tool_execution`
* Layer 2: Internal Tool Catalog `search_text@v1` risk, determinism, and profile membership metadata
* Layer 2: Tool Execution Framework authorization verification, schema validation, and replay-aware execution
* Layer 2: Sandbox / Execution Space read-only file-broker enforcement with `executionSpaceId` lineage
* Layer 2: Observability timeline, execution graph, and replay-manifest completeness

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_policy_reader`, one open canonical thread `thread_policy_reader`, one active collaborative scope `scope_repo_read`, and deterministic system/environment/scope/agent/channel/run configuration already resolved before runtime start.
* Seeded policy rules: allow `search_text@v1` execution for the exact request hash when the resolved path stays under `/workspace/repo`; deny any path outside `/workspace/repo`; do not require approval for this low-risk tool call.
* Seeded memory and retrieval stores: both stores exist and are empty so the context snapshot proves the tool result path is independent from memory and RAG.
* Selected model mode: recorded model adapter mode that emits one `search_text` request followed by one final response.
* Selected tool implementations: deterministic `search_text@v1` descriptor from the internal catalog, executed through the sandbox-backed file-search adapter against a fixed lab workspace snapshot.
* Expected capability set: the reasoning step exposes only `search_text@v1`; broader built-in profiles are narrowed away for this run so the exposed set exactly matches the intended executable set.
* Execution-space posture: one per-run execution space with `fileMode = read_only`, `networkMode = off`, `allowProcessExec = false`, and allowed paths limited to `/workspace/repo`.
* Approval or replay fixtures: no approval artifact is seeded or expected; replay capture is authoritative for policy, tool, checkpoint, and final-output evidence.

### Given / When / Then

Given a canonical inbound chat message asking where the repository mentions `ApprovalRequest`, a verified user on an existing thread, and a recorded model response plan that requests `search_text@v1` on `/workspace/repo`,
When Identity and Thread Management returns `resolutionDisposition = "start_run"`, Agent Runtime creates the run, assembles context, computes an effective tool set containing only `search_text@v1`, the model emits the tool request, runtime evaluates the exact `tool_execution` request as `allow`, checkpoints before the side effect boundary, and Tool Execution dispatches the call inside the attached execution space,
Then the tool executes exactly once under read-only sandbox constraints, returns deterministic search matches, and runtime completes the run with a final response built from the tool result.

### Required assertions

`Required fixtures:`

* The verified channel account remains linked to `user_policy_reader`.
* The inbound event resolves to `thread_policy_reader` and `scope_repo_read`.
* The execution space attached to the run has read-only file access and no network or process privileges.
* The exposed tool set for the step contains exactly `search_text@v1`.
* The recorded model emits the expected tool request and final response sequence.

`Required observability artifacts:`

* Canonical inbound envelope ref and preserved raw provider payload ref.
* Identity resolution and thread resolution audit refs.
* Runtime lifecycle events covering create, running, and completed states.
* One capability exposure decision record showing only `search_text@v1` was exposed.
* One policy evaluation request, risk assessment ref, immutable policy snapshot ref, and `allow` decision for the exact tool request.
* One pre-action checkpoint ref created before tool execution.
* One tool invocation record with argument hash or argument ref, authorization ref, normalized result ref, and sandbox-backed execution record.
* Sandbox events showing file-broker access under the attached `executionSpaceId` and no network or process activity.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing policy before tool execution.

`Required replay artifacts:`

* Context snapshot ref with inclusion provenance.
* Model input and output refs for the tool-request step and final-response step.
* Policy snapshot ref, decision ref, and risk assessment ref.
* Tool request and result refs with immutable descriptor version `search_text@v1`.
* Execution-space ref and sandbox trace refs proving the file search stayed inside the approved boundary.
* Checkpoint refs for post-context assembly, pre-action, and terminal completion.
* Immutable replay manifest with authoritative posture for this run.

`Pass/fail oracle:`

* The run completes, `search_text@v1` executes exactly once after a replay-visible `allow` decision, the sandbox evidence shows only approved read-only path access, and the replay manifest contains the context, model, policy, tool, execution-space, checkpoint, and final-output refs required to reconstruct the journey.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed tool-call sequence
* Policy fixture service with exact request-hash matching
* Internal-tool catalog snapshot fixture
* Sandbox harness with read-only file broker and disabled network/process brokers
* Deterministic tool harness for `search_text@v1`
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` User asks to stage a file into a draft area and a medium-risk tool runs under bounded conditions
* `Risk level:` Medium
* `Rationale:` Proves that policy can allow a medium-risk file-mutation tool only with machine-enforceable narrowing conditions, and that runtime, tool execution, and sandbox enforcement all preserve those conditions without silently broadening the action.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Agent Runtime effective-tool computation, condition-preserving authorization issuance, and pre-action checkpointing
* Layer 2: Policy and Approval allow decision with enforceable conditions for `tool_execution`
* Layer 2: Internal Tool Catalog `copy_file@v1` medium-risk file-mutation metadata
* Layer 2: Tool Execution Framework authorization validation, argument-hash binding, and side-effect attribution
* Layer 2: Sandbox / Execution Space file-broker enforcement for source and destination path prefixes
* Layer 2: Observability capture of policy conditions, authorization lineage, file side effects, and replay manifest refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_policy_copy`, one open thread `thread_policy_copy`, one collaborative scope `scope_workspace_edit`, and one deterministic config snapshot whose higher-precedence scope policy allows bounded draft creation under `/workspace/scratch/drafts`.
* Seeded policy rules: allow `copy_file@v1` when the source stays under `/workspace/input/templates` and the destination stays under `/workspace/scratch/drafts`; deny writes outside those prefixes; do not require approval for this medium-risk case.
* Seeded memory and retrieval stores: available but unused.
* Selected model mode: recorded model adapter mode that emits one `copy_file@v1` request and then one final response.
* Selected tool implementations: `copy_file@v1` with immutable descriptor version, sandbox-backed file adapter, and deterministic lab filesystem snapshot.
* Expected capability set: only `copy_file@v1` is exposed for this step; read-only tools may remain in candidate metadata but are not needed or exposed in the fixed model path.
* Execution-space posture: one per-run execution space with `fileMode = read_write`, `networkMode = off`, `allowProcessExec = false`, read-only input mount for `/workspace/input/templates`, writable scratch mount for `/workspace/scratch/drafts`, and no other path access.
* Approval or replay fixtures: no approval artifact is expected; replay capture must include policy conditions, tool authorization, side-effect refs, and execution-space evidence.

### Given / When / Then

Given a canonical inbound request asking the agent to copy a seeded template file from `/workspace/input/templates/plan.md` into `/workspace/scratch/drafts/plan.md`,
When runtime computes an effective tool set containing `copy_file@v1`, the model emits the copy request, policy evaluates the exact call as `allow` with path-bounded conditions, runtime checkpoints before the side effect, runtime issues a `ToolAuthorization` bound to the request hash and execution space, and Tool Execution dispatches the call through sandbox file brokers,
Then the file copy completes exactly once inside the approved source and destination boundaries and runtime returns a final response describing the staged draft.

### Required assertions

`Required fixtures:`

* The scope-level config snapshot that allows draft-area mutation is replay-visible.
* The source file exists in the read-only input mount before execution.
* The destination path is inside the writable scratch mount.
* The execution space attached to the run matches the authorization `executionSpaceId`.
* The recorded model emits the expected single `copy_file@v1` request.

`Required observability artifacts:`

* Runtime capability exposure decision for `copy_file@v1`.
* Policy evaluation request, risk assessment ref, policy snapshot ref, `allow` decision, and returned path-bound condition set.
* Tool authorization ref showing `toolId`, `toolVersion`, `toolCallId`, allowed argument hash, and attached `executionSpaceId`.
* One pre-action checkpoint ref.
* Tool invocation record with request args ref, normalized result ref, side-effect refs, and adapter type.
* Sandbox file-broker records showing one bounded read from `/workspace/input/templates/plan.md` and one bounded write to `/workspace/scratch/drafts/plan.md`.
* Runtime events linking the policy decision, authorization, checkpoint, tool execution, and final output.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views.

`Required replay artifacts:`

* Context snapshot ref for the reasoning step.
* Model request and response refs for the tool-request step and final-response step.
* Policy snapshot ref, decision ref, and condition set.
* Tool authorization ref plus tool request and result refs.
* Execution-space ref, sandbox broker events, and side-effect refs.
* Checkpoint refs for post-context assembly, pre-action, post-tool, and terminal completion.
* Immutable replay manifest with authoritative or explicitly declared deterministic-lab posture.

`Pass/fail oracle:`

* `copy_file@v1` runs exactly once only after a replay-visible `allow` decision, the resulting side-effect refs show source and destination paths stayed inside the approved boundaries, no approval artifact exists, and replay can reconstruct the action from stored policy, authorization, checkpoint, tool, and sandbox evidence.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service with machine-enforceable path conditions
* Internal-tool catalog snapshot fixture
* Sandbox harness with separate input and scratch mounts plus file-broker tracing
* Deterministic file-mutation tool harness
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` User asks for a repo patch and the run pauses for approval before resuming and executing
* `Risk level:` High
* `Rationale:` Proves the core approval happy path end to end: the high-risk action is not executed immediately, an immutable approval artifact is created, runtime checkpoints and enters `waiting_approval`, approval resolves against the original request and snapshot, runtime resumes from a valid boundary, and the side effect executes exactly once afterward.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 2: Agent Runtime legal state transitions through `running -> waiting_approval -> resuming -> running -> completed`
* Layer 2: Agent Runtime checkpoint rules before `waiting_approval`, before external side effects, and after completed tool steps
* Layer 2: Policy and Approval `require_approval`, approval artifact creation, exact request-hash binding, and approval-resolution validation
* Layer 2: Tool Execution Framework authorization verification and exact-bound execution after approval
* Layer 2: Context Assembly refresh on approval resume with immutable snapshot lineage
* Layer 2: Internal Tool Catalog `patch_file@v1` high-risk file-mutation metadata
* Layer 2: Sandbox / Execution Space read-write file broker under attached `executionSpaceId`
* Layer 2: Observability lifecycle, approval, checkpoint, tool, and replay-manifest completeness

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_policy_patch`, one open thread `thread_policy_patch`, one collaborative scope `scope_docs_patch`, and one deterministic config snapshot with `requireExactApprovalHash = true` and a conservative approval TTL.
* Seeded policy rules: classify `patch_file@v1` as `high`, return `require_approval` for the exact patch request under `/workspace/repo/docs`, and bind any approval to the original request hash, scope, execution space, and path condition set.
* Seeded memory and retrieval stores: available but unused.
* Selected model mode: recorded model adapter mode that emits one `patch_file@v1` request, pauses, and after resume emits one final response.
* Selected tool implementations: sandbox-backed `patch_file@v1` against a fixed repo snapshot where the patch applies cleanly.
* Expected capability set: `patch_file@v1` is exposed as an executable candidate for the step, but execution is blocked pending approval.
* Execution-space posture: one per-run execution space with `fileMode = read_write`, `networkMode = off`, `allowProcessExec = false`, and allowed paths limited to `/workspace/repo/docs`.
* Approval or replay fixtures: one approver identity `reviewer_docs_admin`, one approval transport fixture capable of resolving the pending request, and authoritative replay capture for policy, approval, checkpoint, context, tool, and final output refs.

### Given / When / Then

Given a canonical inbound message asking the agent to apply a seeded textual patch to `/workspace/repo/docs/guide.md`,
When runtime creates the run, computes an effective tool set containing `patch_file@v1`, the model emits the patch request, policy evaluates the exact `tool_execution` request as `require_approval`, the Policy and Approval subsystem creates an `ApprovalRequest`, runtime checkpoints before entering `waiting_approval`, an approver later resolves the same approval request as approved against the original request hash and policy snapshot, runtime resumes from the checkpoint, rebuilds the context snapshot with approval-wait lineage, checkpoints again before the side effect boundary, and Tool Execution executes the patch inside the approved execution space,
Then the patch is applied exactly once after approval, the run reaches a legal resumed completion path, and the final response is linked to both the approval evidence and the resulting tool output.

### Required assertions

`Required fixtures:`

* The recorded patch applies cleanly to the seeded file content.
* The approval TTL remains unexpired through approval resolution.
* The approver identity is authorized to resolve the pending request.
* The approved path boundary remains `/workspace/repo/docs`.
* The execution space attached on resume matches the approved `executionSpaceId`.

`Required observability artifacts:`

* Canonical inbound envelope ref and raw provider payload ref.
* Identity resolution and thread resolution records.
* Runtime state-transition events showing `running -> waiting_approval -> resuming -> running -> completed`.
* Capability exposure decision record for `patch_file@v1`.
* Policy evaluation request, risk assessment ref, policy snapshot ref, and `require_approval` decision.
* `ApprovalRequest` artifact with `approvalId`, `decisionId`, `requestHash`, `requiredReview`, conditions, status `pending`, and expiry metadata.
* Checkpoint ref created before entering `waiting_approval`.
* Approval resolution record showing approval by `reviewer_docs_admin`, resolution time, and decision linkage.
* Resume events, refreshed context snapshot ref, and new pre-action checkpoint ref before tool execution.
* Tool authorization ref and one tool invocation record with normalized result and side-effect refs.
* Sandbox file-broker records showing the bounded patch operation under the same `executionSpaceId`.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the approval wait and resume boundary.

`Required replay artifacts:`

* Pre-wait context snapshot ref and post-resume context snapshot ref with lineage linkage.
* Model input and output refs for the pre-approval tool-request step and the post-tool final-response step.
* Policy snapshot ref, `require_approval` decision ref, and risk assessment ref.
* Approval request ref and approval resolution ref.
* Checkpoint refs for post-context assembly, pre-wait, post-resume pre-action, post-tool, and terminal completion.
* Tool authorization ref plus `patch_file@v1` request and result refs.
* Execution-space ref and sandbox trace refs.
* Immutable replay manifest with authoritative posture and ordered wait/resume boundaries.

`Pass/fail oracle:`

* The run enters `waiting_approval` before any patch side effect, an approval artifact and checkpoint exist for that wait, the tool executes exactly once only after a valid approval resolution bound to the original request and snapshot, the resumed run follows legal state transitions, and replay can reconstruct the full approval and execution sequence without missing refs.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with approval pause and resume sequence
* Policy fixture service supporting `require_approval`
* Approval fixture service with approver identity, resolution transport, and expiry control
* Internal-tool catalog snapshot fixture
* Sandbox harness with read-write file broker and checkpoint-safe reattachment
* Deterministic patch tool harness
* Trace collector, checkpoint inspector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` User asks for a high-risk file write and approval denial prevents execution
* `Risk level:` High
* `Rationale:` Proves the negative approval path: a high-risk action may create an approval artifact and pause the run, but a denied approval must not be reinterpreted as allow, must not produce a tool authorization, and must leave zero external side effects.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime wait-state checkpointing and resume boundary around approval denial
* Layer 2: Policy and Approval `require_approval`, immutable approval artifact creation, denial resolution, and fail-closed denial semantics
* Layer 2: Tool Execution Framework requirement to reject execution when authorization is missing
* Layer 2: Internal Tool Catalog `write_file@v1` high-risk file-mutation metadata
* Layer 2: Sandbox / Execution Space absence-of-execution evidence for denied writes
* Layer 2: Observability capture of approval denial, wait boundary, and zero-side-effect outcome

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_policy_write`, one open thread `thread_policy_write`, one collaborative scope `scope_sensitive_write`, and deterministic approval configuration identical to the happy-path approval case.
* Seeded policy rules: classify `write_file@v1` as `high`, return `require_approval` for writes under `/workspace/repo/config`, and bind any approval to the original request hash and path boundary.
* Seeded memory and retrieval stores: unused.
* Selected model mode: recorded model adapter mode that emits one `write_file@v1` request and then waits for approval resolution.
* Selected tool implementations: `write_file@v1` exists and is executable in the lab, but must never be invoked in this scenario.
* Expected capability set: `write_file@v1` is exposed as a requestable capability for the step, but live execution depends on approval.
* Execution-space posture: one per-run execution space is available and traceable, but it must remain unused for write execution after denial.
* Approval or replay fixtures: one approver identity `reviewer_config_admin` resolves the pending approval as denied before expiry.

### Given / When / Then

Given a canonical inbound request asking the agent to overwrite `/workspace/repo/config/settings.yaml` with seeded replacement content,
When the model emits `write_file@v1`, policy returns `require_approval`, runtime checkpoints and enters `waiting_approval`, and the approver resolves the resulting approval request as denied,
Then the run leaves the approval wait path without dispatching `write_file@v1`, no tool authorization is issued, no file mutation occurs, and denial evidence remains replay-visible end to end.

### Required assertions

`Required fixtures:`

* The target file exists in the seeded workspace before the run.
* The approval request is resolved before expiry and by an allowed reviewer.
* No out-of-band process mutates the target file during the scenario.
* The attached execution space remains available so absence of execution cannot be explained by missing infrastructure.

`Required observability artifacts:`

* Capability exposure decision record for `write_file@v1`.
* Policy evaluation request, risk assessment ref, policy snapshot ref, and `require_approval` decision.
* `ApprovalRequest` artifact with pending status before resolution.
* Checkpoint ref created before entering `waiting_approval`.
* Approval resolution record showing status `denied`, resolver identity, and timing.
* Runtime wait and resume events or equivalent approval-resolution handling events.
* Explicit absence of tool invocation records for the denied `toolCallId`.
* Explicit absence of sandbox file-broker write events and side-effect refs for the target path.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the denial path.

`Required replay artifacts:`

* Context snapshot ref for the pre-approval step.
* Model request ref that produced the `write_file@v1` request.
* Policy snapshot ref, `require_approval` decision ref, approval request ref, and approval denial ref.
* Checkpoint ref proving the run was safely paused before the side effect boundary.
* Replay manifest or step fragment showing no tool authorization ref, no tool result ref, and no file side-effect refs for the denied action.

`Pass/fail oracle:`

* An approval artifact exists, the approval is denied, no `ToolAuthorization` or `ToolInvocation` exists for the denied request, the target file remains unchanged, and replay evidence shows the action stopped at the approval boundary rather than after an untracked partial write.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with approval pause
* Policy fixture service supporting `require_approval`
* Approval fixture service with denial resolution
* Workspace hash or file-content verifier for unchanged target assertion
* Sandbox harness with file-broker telemetry even when unused
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* `contract gap:` the design docs define approval denial, non-execution, and replay requirements, but they do not define one canonical runtime terminal state or one canonical outbound user message after approval denial; this scenario therefore asserts the denial boundary and zero-side-effect properties only.

## Scenario 5

### Scenario summary

* `Title:` User asks for a remote fetch and policy denies the concrete network request before any egress
* `Risk level:` High
* `Rationale:` Proves the direct deny path for a high-risk network tool: a capability may be exposed as executable in principle, but the concrete request still must pass policy, and a denied request must not create approval artifacts, tool invocation records, or sandbox network activity.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime request validation and deny-path handling before external action
* Layer 2: Policy and Approval direct `deny` decision for `tool_execution`
* Layer 2: Tool Execution Framework fail-closed behavior when authorization is missing
* Layer 2: Internal Tool Catalog `fetch_url@v1` high-risk network metadata
* Layer 2: Sandbox / Execution Space requirement that no network-required path fall back to host execution
* Layer 2: Observability capture of denied action and explicit absence of side-effect records

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_policy_fetch`, one open thread `thread_policy_fetch`, one collaborative scope `scope_no_external_fetch`, and one deterministic config snapshot where the research fetch profile is enabled for the run but the scope policy denies network access to domains outside an allowlist.
* Seeded policy rules: allow `fetch_url@v1` only for approved domains; return `deny` for `https://blocked.example.test/spec`; do not create approval artifacts for this deny posture.
* Seeded memory and retrieval stores: unused.
* Selected model mode: recorded model adapter mode that emits one `fetch_url@v1` request to the blocked URL.
* Selected tool implementations: `fetch_url@v1` exists and is executable in principle, but it must never be invoked in this scenario.
* Expected capability set: `fetch_url@v1` is exposed for the step because the run-level profile enables it and some domains are allowed in principle.
* Execution-space posture: one per-run execution space with `networkMode = filtered`, but no network broker call should occur because the request is denied before execution.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a user asks the agent to retrieve a document from `https://blocked.example.test/spec`, and the recorded model emits a `fetch_url@v1` request for that exact URL,
When runtime validates the request and policy evaluates the concrete network request as `deny`,
Then no approval request is created, no tool authorization is issued, no tool invocation occurs, and no sandbox network egress is attempted.

### Required assertions

`Required fixtures:`

* The run-level tool profile includes `fetch_url@v1`.
* The blocked URL is outside the seeded allowlist.
* The execution space supports filtered network mode so denial cannot be misattributed to missing sandbox capability.
* The recorded model emits the blocked URL exactly as seeded.

`Required observability artifacts:`

* Capability exposure decision record showing `fetch_url@v1` was available for the step.
* Policy evaluation request, risk assessment ref, immutable policy snapshot ref, and `deny` decision for the exact blocked URL request.
* Runtime step record linking the denied tool request to the policy decision.
* Explicit absence of approval request refs for this action.
* Explicit absence of tool invocation records, network broker events, and downloaded artifact refs for the denied call.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the deny path.

`Required replay artifacts:`

* Context snapshot ref for the step.
* Model request and response refs for the tool-request step or denial-follow-up step as recorded.
* Policy snapshot ref, decision ref, and risk assessment ref.
* Replay manifest or step fragment showing the denied request without any tool authorization, tool result, or network artifact refs.

`Pass/fail oracle:`

* A replay-visible `deny` decision exists for the exact blocked URL request, no approval artifact exists, no network egress or tool execution evidence exists, and the run evidence shows the request was stopped on the governance path rather than by post-facto sandbox failure.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service with URL-aware deny rules
* Internal-tool catalog and run-profile fixture enabling `fetch_url@v1`
* Sandbox harness with filtered network broker telemetry
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` the docs require deny-before-side-effect behavior but do not define one canonical user-visible response contract after a direct policy denial, so this scenario treats the governance and side-effect boundary as the primary oracle.

## Scenario 6

### Scenario summary

* `Title:` User explicitly asks to store team-shared memory and policy denies the persistent write
* `Risk level:` High
* `Rationale:` Proves that policy governs persistent memory writes just as strictly as tool calls, especially when the requested target scope is broader than the current conversational authority, and that denied writes preserve candidate and policy evidence without creating live memory records.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime post-step memory-candidate emission and governed memory-write path
* Layer 2: Policy and Approval deny decision for a persistent write targeting collaborative-scope memory
* Layer 2: Memory System `Candidate -> Classify -> Validate -> Conflict Check -> Score -> Write / Reject` pipeline with policy-gated write boundary
* Layer 2: Observability capture of candidate intake, write rejection, and absence of live memory creation

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_memory_scope`, one open thread `thread_memory_scope`, one collaborative scope `scope_memory_shared`, and deterministic config where collaborative-scope memory writes require explicit allowed target-scope policy.
* Seeded policy rules: deny collaborative-scope memory writes for this user in this scope; allow only thread-scoped memory in the current journey; preserve replay-visible denial evidence.
* Seeded memory and retrieval stores: the target collaborative-scope memory store is empty and queryable for verification; the RAG corpus exists but is irrelevant and unused.
* Selected model mode: recorded model adapter mode that causes runtime to emit one explicit memory candidate from the user request.
* Selected tool implementations: none used.
* Expected capability set: no tool or subagent capability is needed for this journey.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected because this scenario asserts direct denial rather than review-gated persistence.

### Given / When / Then

Given a user explicitly asks the platform to remember a seeded fact for the entire collaborative scope rather than only the current thread,
When runtime emits a `MemoryCandidate` with source `user_explicit`, proposed scope `collaborative_scope`, and the current `MemoryAccessContext`, and the Memory System runs classification, validation, conflict check, scoring, and policy evaluation before the write boundary,
Then the memory write is rejected with a replay-visible policy decision, no live `MemoryRecord` is created in the collaborative-scope store, and the denied candidate remains auditable.

### Required assertions

`Required fixtures:`

* The current run belongs to `scope_memory_shared`.
* The seeded policy denies collaborative-scope writes for this user but does not block thread-scoped requests in general.
* The target collaborative-scope memory store starts empty.
* The emitted candidate carries full provenance and proposed scope metadata.

`Required observability artifacts:`

* Runtime step record or post-run hook record showing memory-candidate emission.
* Memory candidate intake record with candidate id, source, proposed scope, provenance, and caller access context.
* Policy evaluation request, risk assessment ref, immutable policy snapshot ref, and `deny` decision for the persistent write boundary.
* Memory write result with `status = rejected`, reason, and policy decision ref.
* Explicit absence of a live memory-record creation event for the denied candidate.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking the user request, candidate, denial, and write rejection.

`Required replay artifacts:`

* Context snapshot ref for the user request step.
* Model or runtime-derived candidate-generation ref that explains why the candidate existed.
* Memory candidate ref or hash, policy snapshot ref, denial decision ref, and memory write result ref.
* Replay evidence showing the collaborative-scope memory store remained without a newly active record for the denied candidate.

`Pass/fail oracle:`

* The candidate is preserved, the policy decision is `deny`, the `MemoryWriteResult` is `rejected`, no active `MemoryRecord` is created in the collaborative scope, and the denied memory path is reconstructable without conflating memory evidence with RAG.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model or runtime-extraction fixture for explicit memory requests
* Policy fixture service for target-scope denial
* Seeded memory store with query and write-result inspection
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* `contract gap:` the docs define governed memory-write denial but do not define a canonical post-denial user-facing response contract for explicit memory requests, so this scenario uses persistent-store state and replay-visible denial evidence as the deciding oracle.

## Scenario 7

### Scenario summary

* `Title:` User asks for delegated research and policy blocks subagent creation before any child run starts
* `Risk level:` High
* `Rationale:` Proves that delegation is bounded by explicit child contracts and policy, not by the parent model’s intent alone, and that denied child creation produces no child run, no child context pack, and no hidden fallback execution.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime `spawn_subagent` decision handling and rejection before child-run creation
* Layer 2: Policy and Approval evaluation of every `subagent_spawn` request
* Layer 2: Subagent Profiles and Delegation Contracts explicit task bounds, child capability envelope, and fail-closed validation
* Layer 2: Internal Tool Catalog and child profile rules that forbid automatic inheritance of `platform.head.default`
* Layer 2: Observability capture of denied delegation without child lifecycle artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_policy_delegate`, one open thread `thread_policy_delegate`, one collaborative scope `scope_delegate_restricted`, and deterministic config where `delegation.analysis.default@v1` is the only enabled child default and `delegation.research.fetch@v1` is disabled for new use in this scope.
* Seeded policy rules: deny `subagent_spawn` when the requested child capability envelope includes `delegation.research.fetch@v1` or any network-enabled child tool profile in this collaborative scope.
* Seeded memory and retrieval stores: not required.
* Selected model mode: recorded model adapter mode that emits one `spawn_subagent` decision requesting bounded external research through `delegation.research.fetch@v1`.
* Selected tool implementations: child tools are never invoked because no child run may start.
* Expected capability set: the parent run may use its own allowed capabilities, but no child capability envelope beyond `delegation.analysis.default@v1` is permitted.
* Execution-space posture: no child execution space may be allocated because child creation is denied before that boundary.
* Approval or replay fixtures: no approval fixture is expected because the seeded scope policy is direct deny rather than approval-gated child creation.

### Given / When / Then

Given a user asks the platform to delegate external research that would require the opt-in `delegation.research.fetch@v1` profile,
When the parent reasoning step emits `spawn_subagent`, runtime resolves the requested delegation profile, validates the child capability envelope and budget, and policy evaluates the `subagent_spawn` request as `deny` before child creation,
Then no child run is created, no child context pack is materialized, no child tool profile is attached, and the denied delegation remains replay-visible as a parent-run governance event only.

### Required assertions

`Required fixtures:`

* `delegation.analysis.default@v1` remains the only enabled automatic child profile in the current scope.
* `delegation.research.fetch@v1` is disabled by seeded scope configuration or explicit policy deny.
* The recorded model emits a bounded `spawn_subagent` request with explicit task contract and child capability envelope.
* The parent run remains otherwise healthy so denial cannot be explained by unrelated runtime failure.

`Required observability artifacts:`

* Parent-step record showing `spawn_subagent` as the decision class.
* Delegation request artifact or normalized request fields including task contract, requested child profile, capability envelope, and budget.
* Policy evaluation request, risk assessment ref, policy snapshot ref, and `deny` decision for `subagent_spawn`.
* Explicit absence of `childRunId`, child lifecycle events, child context-pack refs, child tool-profile resolution refs, and child result refs.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the denied delegation branch on the parent run only.

`Required replay artifacts:`

* Parent context snapshot ref for the decision step.
* Model request and response refs for the step that emitted `spawn_subagent`.
* Delegation request ref, requested profile ref, policy snapshot ref, risk assessment ref, and denial decision ref.
* Replay manifest or step fragment showing no `subagentRefs` and no child manifest created for the denied branch.

`Pass/fail oracle:`

* The parent step emits a bounded delegation request, policy denies the `subagent_spawn` request before child creation, no child run or child context artifact exists, and replay evidence shows the denial happened on the governance path rather than after an untracked child start.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed `spawn_subagent` decision
* Delegation-profile fixture service with immutable profile refs
* Policy fixture service for `subagent_spawn` denial
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* `contract gap:` the docs define denied child creation and replay requirements but do not define one canonical parent response contract after a `subagent_spawn` denial, so this scenario asserts no-child-creation and replay-visible governance evidence as the required outcome.

## Scenario 8

### Scenario summary

* `Title:` User asks for external retrieval but policy hides the network capability before reasoning
* `Risk level:` Medium
* `Rationale:` Proves the policy-driven capability exposure path itself, not just execution-time deny, by showing that a risky capability that is not allowed in the current scope must be absent from the exposed set before the model reasons about the step.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Policy and Approval `capability_exposure` intent, hidden-capability semantics, and replay-visible exposure decisions
* Layer 2: Agent Runtime candidate-to-effective capability filtering before model execution
* Layer 2: Internal Tool Catalog `fetch_url@v1` risk metadata and candidate-profile membership
* Layer 2: Observability exposure-decision capture and absence of hidden capability requests

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_exposure_hidden`, one open thread `thread_exposure_hidden`, one collaborative scope `scope_no_fetch_capability`, and deterministic policy/config snapshots where the run profile includes `platform.research.fetch@v1` but the collaborative-scope policy denies external retrieval capability exposure.
* Seeded policy rules: return a hidden or denied `capability_exposure` outcome for `fetch_url@v1` in this scope; preserve replay-visible reason codes and snapshot refs; do not create approval artifacts for exposure filtering.
* Seeded memory and retrieval stores: unused.
* Selected model mode: recorded model adapter mode that attempts no tool call when `fetch_url@v1` is absent from the exposed set.
* Selected tool implementations: `fetch_url@v1` exists in the candidate catalog snapshot but must never appear in the effective tool set for the step.
* Expected capability set: candidate tools may include `fetch_url@v1`, but the effective exposed set does not.
* Execution-space posture: any execution-space availability is irrelevant because the capability is filtered before execution can be requested.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a user asks the agent to fetch a remote policy page in a collaborative scope where external retrieval capabilities are not allowed,
When runtime resolves candidate tools, policy evaluates `capability_exposure` for `fetch_url@v1` as hidden in the current scope, and runtime computes the effective tool set for the step,
Then `fetch_url@v1` does not appear in the model-visible capability set, the model emits no `fetch_url` request, and no downstream network or approval path is entered.

### Required assertions

`Required fixtures:`

* The candidate tool snapshot includes `fetch_url@v1`.
* The scope policy that hides external retrieval capabilities is replay-visible.
* The recorded model path for this scenario contains no tool call when the capability is absent.

`Required observability artifacts:`

* Candidate capability-resolution record showing `fetch_url@v1` existed before filtering.
* Capability exposure decision record with policy snapshot ref, reason codes, and hidden/filtered result for `fetch_url@v1`.
* Runtime step record referencing the effective tool set that excludes `fetch_url@v1`.
* Explicit absence of `fetch_url` tool requests, approval artifacts, tool invocation refs, and network side-effect refs.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing exposure filtering before model reasoning.

`Required replay artifacts:`

* Context snapshot ref for the step.
* Effective tool-set ref and capability exposure decision ref.
* Policy snapshot ref and any source refs required to reconstruct why the capability was hidden.
* Replay fragment showing a model step with no `fetch_url` request because the capability never entered the exposed set.

`Pass/fail oracle:`

* `fetch_url@v1` appears in candidate metadata but not in the exposed set, the model issues no request for it, and the run evidence proves the risky capability was hidden on the governance path rather than denied only after a request was made.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service for `capability_exposure`
* Internal-tool catalog and profile snapshot fixture
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* `contract gap:` the policy document defines hidden-capability behavior and replay visibility, but it does not define one canonical user-visible answer when a requested capability is filtered away before reasoning, so this scenario asserts the exposure boundary and non-request outcome only.

## Scenario 9

### Scenario summary

* `Title:` User activates a governed skill, but the skill’s nested file mutation is still denied
* `Risk level:` High
* `Rationale:` Proves the policy document’s two-layer skill rule: allowing or authorizing a skill activation does not implicitly authorize the tool, memory, network, file, or delegation actions produced during that skill’s execution.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Policy and Approval distinct `skill_activation` and `tool_execution` enforcement
* Layer 2: Agent Runtime effective skill exposure and nested action orchestration
* Layer 2: Skills System activation authorization, governed execution, and downstream non-bypass guarantees
* Layer 2: Tool Execution Framework canonical routing of skill-contributed tool calls
* Layer 2: Internal Tool Catalog `write_file@v1` high-risk file-mutation metadata
* Layer 2: Observability separate capture for skill activation and downstream tool denial

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_skill_policy`, one open thread `thread_skill_policy`, one collaborative scope `scope_skill_governed`, and deterministic config where a published workflow skill `skill_workspace_cleanup@v1` is enabled and visible in the current scope.
* Seeded policy rules: allow `skill_activation` for `skill_workspace_cleanup@v1` in the current scope, but deny nested `write_file@v1` requests targeting `/workspace/repo/config`; preserve both decision refs independently.
* Seeded memory and retrieval stores: unused.
* Selected model mode: recorded model adapter mode that selects `skill_workspace_cleanup@v1`.
* Selected tool implementations: the skill package contributes or invokes `write_file@v1`, but the write must never execute because the nested tool policy denies it.
* Expected capability set: the effective skill set includes `skill_workspace_cleanup@v1`; the nested write action still requires its own policy path.
* Execution-space posture: one per-run execution space is available for the skill path, but no file mutation may occur after the nested deny.
* Approval or replay fixtures: no approval fixture is expected in this deterministic deny variant.

### Given / When / Then

Given a user asks the agent to run a seeded workspace-cleanup skill that would normally rewrite a config file as part of its workflow,
When runtime exposes and authorizes `skill_workspace_cleanup@v1`, policy allows the `skill_activation` request, Skills System activates the skill, and the skill later routes a nested `write_file@v1` request through the normal tool path where policy evaluates that concrete file mutation as `deny`,
Then the skill activation remains replay-visible, but the nested file mutation does not execute and the run preserves separate evidence for the allowed skill activation and the denied downstream write.

### Required assertions

`Required fixtures:`

* The skill descriptor, binding, and permission profile for `skill_workspace_cleanup@v1` are pinned and replay-visible.
* The skill authorization matches the exact `skillId`, `version`, and allowed input hash.
* The nested write target is outside the allowed file-mutation boundary for the current scope.

`Required observability artifacts:`

* Effective skill exposure decision record for `skill_workspace_cleanup@v1`.
* Policy evaluation request, risk assessment ref, snapshot ref, and `allow` decision for `skill_activation`.
* Skill authorization ref and skill activation record with execution refs.
* Nested tool request linkage from the skill execution record to the downstream tool policy evaluation.
* Policy evaluation request, snapshot ref, and `deny` decision for the nested `write_file@v1` action.
* Explicit absence of `write_file@v1` tool invocation refs and file side-effect refs.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing skill activation followed by downstream tool denial.

`Required replay artifacts:`

* Skill descriptor ref, binding ref, and skill authorization ref.
* Skill activation request and result refs.
* Nested tool request ref plus downstream policy denial ref.
* Replay fragment showing that the skill ran through a governed activation path and still could not bypass tool policy.

`Pass/fail oracle:`

* The skill activates under its own policy decision, the nested file-mutation action is independently denied, no file side effect occurs, and replay evidence preserves both governance decisions as separate records.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed skill-selection path
* Skill registry and binding fixture service
* Policy fixture service for both `skill_activation` and nested `tool_execution`
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* `contract gap:` the Skills System and Policy documents require downstream governance after skill activation, but they do not define one canonical terminal skill result state when a required nested side effect is denied, so this scenario asserts the separated governance decisions and zero-side-effect outcome rather than one exact final skill status.

## Scenario 10

### Scenario summary

* `Title:` User approves a high-risk patch too late, and the stale approval is rejected before execution
* `Risk level:` High
* `Rationale:` Proves the exact-bound approval rule under change: an approval that no longer matches the original request hash or compatible policy snapshot must not unlock execution, and the run must require re-evaluation instead of silently reusing stale authorization.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Policy and Approval exact approval binding, stale-approval rejection, and immutable snapshot refs
* Layer 2: Agent Runtime approval wait boundary and non-execution after stale approval rejection
* Layer 2: Observability capture of snapshot drift, approval rejection, and absence of tool execution

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_stale_approval`, one open thread `thread_stale_approval`, one collaborative scope `scope_policy_drift`, and deterministic config with `requireExactApprovalHash = true`.
* Seeded policy rules: the original `patch_file@v1` request under `/workspace/repo/docs` returns `require_approval` against policy snapshot `snapshot_v1`; before approval resolution is applied, a new higher-precedence scope policy snapshot `snapshot_v2` supersedes the original posture in a way that is not declared as a compatible successor for reuse.
* Seeded memory and retrieval stores: unused.
* Selected model mode: recorded model adapter mode that emits one high-risk `patch_file@v1` request.
* Selected tool implementations: `patch_file@v1` exists in the lab but must never execute in this stale-approval scenario.
* Expected capability set: `patch_file@v1` is exposed for the original step, but execution remains blocked without a fresh valid approval path.
* Execution-space posture: execution space may remain attached, but it must remain unused for the denied stale-approval path.
* Approval or replay fixtures: one approval request is created against `snapshot_v1`, and one approval-resolution attempt is injected after the snapshot drift so `ResolveApproval` can reject it as stale.

### Given / When / Then

Given a high-risk patch request that has already produced a pending approval request under one immutable policy snapshot,
When the relevant policy snapshot changes materially before the approver response is applied and the Policy and Approval subsystem validates the incoming approval resolution against the original request hash and snapshot context,
Then the approval resolution is rejected as stale, no tool authorization is issued, no patch executes, and the run can proceed only through a fresh policy evaluation path rather than stale approval reuse.

### Required assertions

`Required fixtures:`

* The original approval request is tied to `snapshot_v1`.
* The later policy change produces a distinct replay-visible snapshot ref `snapshot_v2`.
* The stale approval attempt occurs after the drift and before any tool execution boundary.

`Required observability artifacts:`

* Original policy evaluation request, risk assessment ref, `require_approval` decision, and `ApprovalRequest` ref under `snapshot_v1`.
* Replay-visible evidence that `snapshot_v2` superseded the earlier policy state for this action.
* Approval-resolution attempt record and stale-approval rejection record.
* Explicit absence of tool authorization, tool invocation, and file side-effect refs after stale rejection.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the approval wait and stale rejection branch.

`Required replay artifacts:`

* Original policy snapshot ref `snapshot_v1` and any later snapshot ref needed to explain the drift.
* Approval request ref and stale approval-resolution attempt ref.
* Checkpoint ref proving the run remained paused before the side-effect boundary.
* Replay fragment showing that the run stopped at stale approval validation rather than executing the stored patch request.

`Pass/fail oracle:`

* The original approval path is visible, the later approval resolution is rejected as stale because it no longer matches the required request or snapshot context, no tool execution occurs, and replay evidence makes the rejection reason auditable.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service with immutable snapshot versioning
* Approval fixture service capable of injecting delayed or stale approval responses
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* `contract gap:` the policy document requires stale approval rejection and re-evaluation, but it does not define one canonical runtime state transition after a stale approval attempt, so this scenario asserts stale rejection, non-execution, and replay evidence only.

## Scenario 11

### Scenario summary

* `Title:` User requests data from another collaborative scope and approval gates the exact cross-scope slice
* `Risk level:` High
* `Rationale:` Proves the policy document’s cross-scope contract by showing that matching identity alone is insufficient, that the scope transition must be evaluated explicitly, and that an approved cross-scope read remains bounded to the exact scope or data slice cleared by policy.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Policy and Approval `cross_scope_access` enforcement and approval-bounded scope transition
* Layer 2: Agent Runtime approval wait and resume around a non-tool governance boundary
* Layer 2: Memory System cross-scope retrieval rules and `MemoryQuery` with explicit allowed scopes
* Layer 2: Observability capture of approval, scope transition, and bounded retrieval evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_cross_scope`, one current thread in `scope_alpha`, one second collaborative scope `scope_beta` where the same user also has membership, and deterministic config where cross-scope retrieval always requires approval.
* Seeded policy rules: evaluate `cross_scope_access` from `scope_alpha` to `scope_beta` as `require_approval`; if approved, return conditions that bound access to `scope_beta` only and to one deterministic memory slice needed for the request.
* Seeded memory and retrieval stores: `scope_beta` contains a seeded onboarding memory record; the current scope memory store remains separate; the RAG corpus is present but irrelevant.
* Selected model mode: recorded model adapter mode that asks for the cross-scope information and waits through approval.
* Selected tool implementations: none used.
* Expected capability set: no tool capability is needed; the key governed action is `cross_scope_access` plus the subsequent bounded `MemoryQuery`.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: one approver identity `reviewer_scope_admin` may approve the exact scope transition request.

### Given / When / Then

Given a user in `scope_alpha` asks the platform to retrieve a seeded onboarding rule stored in `scope_beta`,
When runtime evaluates the required `cross_scope_access` request, policy returns `require_approval`, runtime checkpoints before the wait, the approver approves the exact transition to `scope_beta`, and runtime resumes and issues a `MemoryQuery` whose `allowedScopes` and policy decision ref match the approved condition set,
Then the Memory System returns only the approved `scope_beta` result slice, no broader cross-scope data is exposed, and the final run evidence ties the retrieval to the exact approval and scope boundary that allowed it.

### Required assertions

`Required fixtures:`

* The same canonical user has valid membership in both `scope_alpha` and `scope_beta`.
* The current thread remains bound to `scope_alpha` throughout the run.
* The approved cross-scope read is narrower than unrestricted multi-scope access.
* The seeded `scope_beta` memory record is distinct from any current-scope memory.

`Required observability artifacts:`

* Policy evaluation request, risk assessment ref, policy snapshot ref, and `require_approval` decision for `cross_scope_access`.
* Approval request ref and approval resolution ref for the scope transition.
* Checkpoint ref before entering the approval wait.
* Resume event and subsequent `MemoryQuery` record with explicit `allowedScopes` and caller access context.
* Memory query result refs showing only `scope_beta` records.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking approval, resume, and bounded retrieval.

`Required replay artifacts:`

* Context snapshot ref for the request step and any post-resume snapshot ref if refreshed.
* Policy snapshot ref, `cross_scope_access` decision ref, approval request ref, and approval resolution ref.
* `MemoryQuery` ref, query result refs, and provenance-rich memory result refs from `scope_beta`.
* Replay fragment proving the cross-scope boundary was crossed only through the approved path and only for the approved scope slice.

`Pass/fail oracle:`

* The cross-scope read does not occur before approval, the approved transition is replay-visible, the resulting memory query is explicitly bounded to `scope_beta`, and no unrelated cross-scope records leak into the result set.

### Required harness capabilities

* Synthetic chat channel driver
* Identity, thread, and scope-membership fixture service
* Recorded model adapter mode with approval pause and resume
* Policy fixture service for `cross_scope_access`
* Approval fixture service
* Seeded memory-store fixtures for multiple collaborative scopes
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Policy allows a bounded file action, but downstream enforcement rejects execution when the condition can no longer be enforced
* `Risk level:` High
* `Rationale:` Proves the policy boundary does not become a fail-open path: an `allow` decision with narrowing conditions is still unsafe if the downstream tool or execution-space path cannot enforce those conditions, so execution must reject before any side effect.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Policy and Approval returned-condition enforcement and `downstream cannot enforce condition` failure mode
* Layer 2: Agent Runtime exact-bound authorization handling
* Layer 2: Tool Execution Framework execution-time defense in depth and fail-closed rejection on incompatible execution context
* Layer 2: Sandbox / Execution Space no-host-fallback rule for required execution-space paths
* Layer 2: Observability capture of allow decision, rejection cause, and zero side effect

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_condition_reject`, one open thread `thread_condition_reject`, one collaborative scope `scope_condition_reject`, and deterministic config allowing one bounded `copy_file@v1` action.
* Seeded policy rules: allow `copy_file@v1` only within exact source and destination prefixes and bind the result to one specific `executionSpaceId`.
* Seeded memory and retrieval stores: unused.
* Selected model mode: recorded model adapter mode that emits one `copy_file@v1` request matching the original allow path.
* Selected tool implementations: `copy_file@v1` exists and would be executable if the original compatible execution space remained attached.
* Expected capability set: `copy_file@v1` is exposed and the initial policy decision is `allow`.
* Execution-space posture: a compatible execution space exists at decision time, but the harness invalidates that compatibility before dispatch so the downstream path can no longer enforce the policy-derived path and execution-space constraints.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a user asks for a bounded file copy that policy allows under exact path and execution-space conditions,
When policy returns `allow`, runtime issues the exact-bound authorization, but the compatible execution-space attachment is no longer enforceable by the time Tool Execution validates the request for dispatch,
Then Tool Execution rejects the action before any side effect, no host fallback occurs, and the run preserves both the original `allow` decision and the later downstream enforcement rejection as separate replay-visible facts.

### Required assertions

`Required fixtures:`

* The original policy decision is tied to one explicit `executionSpaceId`.
* The execution-space incompatibility is introduced before dispatch, not after a partial side effect.
* The requested copy path still matches the originally allowed prefixes so the rejection is attributable to enforcement failure, not a changed request.

`Required observability artifacts:`

* Policy evaluation request, risk assessment ref, policy snapshot ref, and `allow` decision with narrowing conditions.
* Tool authorization ref bound to the original request and execution space.
* Execution-space lifecycle or attachment record showing why the downstream path can no longer enforce the required condition.
* Tool execution rejection record or normalized tool error showing fail-closed non-execution.
* Explicit absence of file side-effect refs for the rejected copy.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing allow decision first and downstream rejection second.

`Required replay artifacts:`

* Context snapshot ref for the step.
* Policy snapshot ref, decision ref, and condition set.
* Tool authorization ref and tool execution rejection ref.
* Execution-space ref plus any state-transition or incompatibility refs needed to explain the reject outcome.
* Replay fragment proving the action stopped at downstream enforcement rather than executing with weakened conditions.

`Pass/fail oracle:`

* The action receives a replay-visible `allow` decision, downstream validation still rejects it because the required condition can no longer be enforced, no file mutation occurs, and no silent host fallback or broadened execution path is observed.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service with exact-bound condition sets
* Sandbox harness that can invalidate execution-space compatibility before dispatch
* Tool harness for `copy_file@v1`
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* `contract gap:` the policy and tool documents define fail-closed rejection when downstream enforcement cannot satisfy conditions, but they do not define one canonical user-visible terminal response for this path, so this scenario asserts the enforcement rejection boundary and zero-side-effect outcome only.

## Module coverage by journey

| Journey | Primary contract cluster | Required modules under test |
| --- | --- | --- |
| Scenario 1 | low-risk tool allow | Channel Gateway, Identity and Thread Management, Agent Runtime, Policy and Approval, Internal Tool Catalog, Tool Execution Framework, Sandbox / Execution Space, Observability |
| Scenario 2 | medium-risk tool allow with conditions | Agent Runtime, Policy and Approval, Internal Tool Catalog, Tool Execution Framework, Sandbox / Execution Space, Observability |
| Scenario 3 | approval wait and resume happy path | Agent Runtime, Policy and Approval, Context Assembly, Internal Tool Catalog, Tool Execution Framework, Sandbox / Execution Space, Observability |
| Scenario 4 | approval wait and denial path | Agent Runtime, Policy and Approval, Internal Tool Catalog, Tool Execution Framework, Sandbox / Execution Space, Observability |
| Scenario 5 | direct deny before network side effect | Agent Runtime, Policy and Approval, Internal Tool Catalog, Tool Execution Framework, Sandbox / Execution Space, Observability |
| Scenario 6 | denied persistent memory write | Agent Runtime, Policy and Approval, Memory System, Observability |
| Scenario 7 | denied subagent spawn | Agent Runtime, Policy and Approval, Subagent Profiles and Delegation Contracts, Internal Tool Catalog, Observability |
| Scenario 8 | capability exposure hidden before reasoning | Agent Runtime, Policy and Approval, Internal Tool Catalog, Observability |
| Scenario 9 | skill activation allowed but nested action denied | Agent Runtime, Policy and Approval, Skills System, Tool Execution Framework, Internal Tool Catalog, Observability |
| Scenario 10 | stale approval rejection | Agent Runtime, Policy and Approval, Observability |
| Scenario 11 | cross-scope access approval and bounded retrieval | Agent Runtime, Policy and Approval, Memory System, Observability |
| Scenario 12 | downstream condition enforcement rejection | Agent Runtime, Policy and Approval, Tool Execution Framework, Sandbox / Execution Space, Observability |

## Coverage notes by module

* `Policy and Approval System`: covered across `capability_exposure`, `skill_activation`, `tool_execution`, `memory_write`, `cross_scope_access`, and `subagent_spawn`, plus stale approval rejection, exact request-hash binding, snapshot traceability, and fail-closed downstream enforcement.
* `Agent Runtime`: covered for inbound start, effective capability computation, reasoning-step boundaries, pre-action checkpointing, `waiting_approval`, `resuming`, stale-approval handling, and deny-path handling without hidden execution.
* `Tool Execution Framework`: covered for candidate executability, authorization verification, schema-bound execution, fail-closed rejection when authorization is absent or conditions cannot be enforced, and replay-grade tool evidence.
* `Sandbox / Execution Space`: covered for read-only file search, bounded file mutation, absence of execution after deny, absence of network egress after direct denial, and no-host-fallback rejection when execution-space conditions become unenforceable.
* `Memory System`: covered for candidate intake, write-pipeline ordering, policy-gated rejection, bounded cross-scope retrieval after approval, and preserved denial evidence without live record creation.
* `Skills System`: covered for effective skill exposure, governed activation, and the requirement that nested skill-produced actions still pass their own downstream policy paths.
* `Subagent Profiles and Delegation Contracts`: covered for explicit child capability envelopes, immutable delegation-profile refs, deny-before-child-creation behavior, and no implicit inheritance of the Head Agent default profile.
* `Context Assembly`: explicitly exercised in the approval resume path where a fresh immutable snapshot is required after the run leaves `waiting_approval`.
* `Observability, Replay, and Cost Control`: required in every scenario for timeline, execution graph, run summary, checkpoint refs, policy refs, approval refs where applicable, and replay-manifest completeness.
