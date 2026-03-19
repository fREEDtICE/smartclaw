# Tool Execution Framework E2E Cases

This document proposes fourteen deterministic E2E scenarios for the Tool Execution Framework subsystem.
It covers both end-to-end user journeys and module smoke flows driven through the tool-resolution and tool-execution boundaries, including candidate-profile expansion, effective-tool-set consistency, policy-first side effects, approval waits, execution-space enforcement, async waits, idempotency, recovery, replay evidence, and safe child or skill tool handling.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic runtime reasoning steps that produce deterministic tool requests and policy inputs
* seeded user, thread, collaborative-scope, run, and execution-space fixtures
* pinned internal catalog snapshots, immutable descriptor versions, and default profile refs
* fake sandbox, connector, and async adapters with deterministic success, timeout, cancellation, and persistence-failure modes
* replay-visible checkpoints, policy decisions, authorization envelopes, invocation records, artifact refs, and side-effect refs for every meaningful action

## Suite structure

### User-journey scenarios

1. low-risk `read_file` auto-executes from the Head Agent default candidate profile and returns a typed result
2. high-risk `patch_file` waits for approval, resumes, and executes exactly once
3. denied `fetch_url` request produces no network side effect and no tool dispatch
4. long-running `download_artifact` returns `waiting`, then resumes through `PollAsync` to terminal success
5. crash after successful `write_file` resumes without duplicating the file mutation

### Module smoke scenarios

6. candidate resolution removes execution-space-bound tools when no compatible execution space is attached
7. expired or mismatched `ToolAuthorization` fails closed before dispatch
8. invalid tool arguments fail schema validation before execution
9. execution-time loss of the required execution space fails closed with no silent host fallback
10. duplicate idempotent `read_file` invocation reuses the prior result safely
11. timed-out tool returns non-success plus partial refs and propagated cancellation evidence
12. artifact-store persistence failure prevents the framework from claiming success
13. child default tool resolution excludes Head Agent mutation, process, and network tools
14. skill-contributed tool without a published canonical descriptor version is rejected from candidate resolution

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Low-risk `read_file` auto-executes from the Head Agent default candidate profile and returns a typed result
* `Risk level:` Low
* `Rationale:` Proves the baseline tool path: the framework resolves Head Agent defaults into executable candidates, runtime filters them into the effective set, policy allows a low-risk read, and execution happens inside the attached execution space with replay-visible typed output.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Tool Execution Framework candidate resolution, authorization validation, sandbox dispatch, result normalization, and invocation persistence
* Layer 2: Internal Tool Catalog and Default Tool Profiles `platform.head.default@v1` membership and replay-visible profile composition
* Layer 2: Policy and Approval System allow decision on one low-risk `tool_execution` intent
* Layer 2: Agent Runtime effective-tool-set computation, pre-action checkpointing, and post-tool continuation
* Layer 2: Sandbox / Execution Space read-only file-broker boundary for environment-bound file access

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_tool_read`, one open thread `thread_tool_read`, one active collaborative scope `scope_tool_read`, one run `run_tool_read`, and one system-pinned default head profile `platform.head.default@v1`.
* Seeded policy rules: low-risk filesystem read is allowed inside the attached execution space under the current scope and path boundary.
* Seeded memory and retrieval stores: both stores exist and remain empty so the journey isolates tool execution rather than memory or retrieval behavior.
* Selected model mode: one tool-enabled deterministic reasoning step that requests `read_file(path="/workspace/README.md")`.
* Selected tool implementations: internal built-in `read_file@v1` only.
* Expected capability set: `read_file@v1` is exposed because it survives candidate resolution, runtime filtering, policy filtering, and execution-space feasibility checks.
* Execution-space posture: one attached execution space `es_tool_read` exposes read-only access to `/workspace` through the file broker.
* Approval or replay fixtures: pinned catalog snapshot containing `platform.head.default@v1`, schema validator fixture, sandbox file-broker fixture, provider-free runtime tool stub, checkpoint store, trace collector, and replay verifier.

### Given / When / Then

Given Head Agent defaults are enabled and runtime asks the Tool Execution Framework to resolve candidate tools for one tool-enabled step,
When the framework expands `platform.head.default@v1`, runtime computes an effective set that still includes `read_file@v1`, policy allows the exact request, and runtime sends one authorized execution request,
Then the framework executes `read_file@v1` inside `es_tool_read`, returns a typed success result, persists invocation metadata plus artifact refs, and runtime continues without any policy or sandbox ambiguity.

### Required assertions

`Required fixtures:`

* `read_file@v1` exists in the pinned catalog snapshot and is part of `platform.head.default@v1`.
* The attached execution space remains compatible with `requiresExecutionSpace = true` for the entire request.
* The authorization envelope matches the exact `toolId`, `toolVersion`, `toolCallId`, and argument hash.

`Required observability artifacts:`

* Candidate-resolution trace showing profile expansion and the reason `read_file@v1` remained executable.
* Effective-tool-set artifact showing `read_file@v1` exposed and any other tools filtered with reason codes.
* Policy decision ref for the allowed tool execution.
* Pre-action checkpoint, tool invocation record, `tool.execute` span, normalized success result, and post-tool continuation trace.

`Required replay artifacts:`

* Catalog snapshot id, profile ref, descriptor version, and effective-tool-set ref.
* Execution request hash or argument refs, authorization ref, and execution-space ref.
* Invocation record, output artifact refs, and any stdout or stderr refs if the adapter emits them.

`Pass/fail oracle:`

* `read_file@v1` is exposed only because it is executable in the current path, policy evaluation occurs before dispatch, execution happens inside the execution space, and replay can reconstruct the exact descriptor, profile, authorization, and result.

### Required harness capabilities

* Runtime tool-step fixture
* Internal catalog and profile snapshot fixture service
* Policy fixture service
* Execution-space file-broker fixture
* Tool adapter fixture for `read_file`
* Checkpoint store, trace collector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` High-risk `patch_file` waits for approval, resumes, and executes exactly once
* `Risk level:` High
* `Rationale:` Proves the approval-gated side-effect path: runtime must checkpoint before entering `waiting_approval`, later resume with approval payload, and the framework must execute the exact authorized patch once without broadening path or content scope.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Tool Execution Framework high-risk authorization verification, bounded execution, and normalized file-mutation result
* Layer 2: Policy and Approval System `require_approval` decision, approval resolution binding, and scope-bound decision lineage
* Layer 2: Agent Runtime pre-approval checkpoint, `waiting_approval` state, resume contract, and pre-action checkpoint before side effect
* Layer 2: Internal Tool Catalog and Default Tool Profiles high-risk `patch_file@v1` metadata and Head Agent candidate membership
* Layer 2: Sandbox / Execution Space file-mutation boundary and least-privilege path constraints

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_tool_patch`, one open thread `thread_tool_patch`, one scope `scope_tool_patch`, one run `run_tool_patch`, and default head profile `platform.head.default@v1`.
* Seeded policy rules: `patch_file@v1` is high risk and returns `require_approval` for mutations under `/workspace/src`, with approval conditions pinned to path boundary, timeout, and output-size limits.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: one tool-enabled deterministic reasoning step that requests `patch_file(path="/workspace/src/app.go", patch=<bounded diff>)`.
* Selected tool implementations: internal built-in `patch_file@v1`.
* Expected capability set: `patch_file@v1` is in the effective tool set before execution, but execution remains blocked until approval resolves.
* Execution-space posture: one attached execution space `es_tool_patch` with writable scratch and approved workspace mount.
* Approval or replay fixtures: one approval request record, one approval resolution payload bound to the original request hash, deterministic patch adapter fixture, checkpoint store, and replay verifier.

### Given / When / Then

Given runtime exposes `patch_file@v1` to a Head Agent step and the model requests one bounded file edit,
When policy returns `require_approval`, runtime checkpoints and enters `waiting_approval`, later resumes with the exact approval payload, and sends a runtime-authorized execution request,
Then the framework executes the approved patch once inside `es_tool_patch`, returns a structured mutation result, and replay shows one approval-gated mutation rather than duplicate or broadened execution.

### Required assertions

`Required fixtures:`

* The approval artifact binds to the original request hash, tool id, tool version, scope, and execution-space context.
* The execution-space path boundary includes `/workspace/src/app.go` and excludes unrelated paths.
* The adapter fixture applies the bounded diff deterministically.

`Required observability artifacts:`

* Policy decision ref with `require_approval` outcome and attached conditions.
* Checkpoint written before entering `waiting_approval`.
* Resume trace with approval payload lineage.
* Pre-action checkpoint before actual tool dispatch.
* Tool invocation record, side-effect refs, normalized result, and post-tool checkpoint.

`Required replay artifacts:`

* Effective-tool-set ref showing `patch_file@v1` was exposed.
* Approval request ref, approval resolution ref, authorization ref, and execution-space ref.
* Invocation record, mutation side-effect refs, and checkpoint refs proving exactly-once execution after approval.

`Pass/fail oracle:`

* No patch executes before approval, resume occurs from a valid checkpoint, the approved patch is executed exactly once within approved boundaries, and replay can prove the approval-to-execution chain end to end.

### Required harness capabilities

* Runtime approval-wait fixture
* Policy and approval fixture service
* Checkpoint and resume fixture service
* Execution-space file-mutation fixture
* Tool adapter fixture for `patch_file`
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Denied `fetch_url` request produces no network side effect and no tool dispatch
* `Risk level:` High
* `Rationale:` Proves the deny path for a networked high-risk tool: policy may block the request entirely, and the framework must not receive or execute a live outbound call as a result.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Policy and Approval System deny decision for `tool_execution` plus `network_request` posture
* Layer 2: Agent Runtime tool-request validation, deny handling, and no-dispatch behavior
* Layer 2: Tool Execution Framework execution boundary by absence of execution request
* Layer 2: Internal Tool Catalog and Default Tool Profiles network tool metadata for `fetch_url@v1`
* Layer 2: Sandbox / Execution Space network trust boundary and no-egress enforcement when execution never starts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_tool_fetch_deny`, one thread `thread_tool_fetch_deny`, one scope `scope_tool_fetch_deny`, one run `run_tool_fetch_deny`, and default head profile `platform.head.default@v1`.
* Seeded policy rules: outbound retrieval to the requested domain is denied for the current scope even though `fetch_url@v1` is otherwise a resolvable candidate tool.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: one tool-enabled reasoning step that requests `fetch_url(url="https://blocked.example.test/report")`.
* Selected tool implementations: internal built-in `fetch_url@v1`.
* Expected capability set: `fetch_url@v1` may appear in the effective set, but the exact execution request is denied.
* Execution-space posture: one attached execution space `es_tool_fetch_deny` with network broker available but policy-cleared egress denied for the requested domain.
* Approval or replay fixtures: policy deny fixture, network broker spy, checkpoint store, and trace collector.

### Given / When / Then

Given the model requests `fetch_url@v1` for a blocked destination,
When runtime evaluates policy and receives a deny decision for that exact request,
Then no execution request is dispatched to the Tool Execution Framework, no network side effect occurs, and the run continues or fails with deny evidence only.

### Required assertions

`Required fixtures:`

* `fetch_url@v1` remains a valid candidate tool so the scenario proves deny-on-execution rather than candidate-resolution filtering.
* The network broker spy would record any attempted outbound request.
* The deny decision is bound to the exact destination and request hash.

`Required observability artifacts:`

* Effective-tool-set artifact showing whether `fetch_url@v1` was available to the step.
* Policy decision ref with deny reasons and any network-condition lineage.
* Explicit absence of tool invocation, adapter dispatch, and network broker execution records.
* Run trace showing denial handling after model tool request.

`Required replay artifacts:`

* Tool request artifact from the reasoning step.
* Policy snapshot ref and deny decision ref.
* Evidence that no execution request or invocation record exists for the denied call.

`Pass/fail oracle:`

* A denied request must produce governance evidence only; any network dispatch, invocation record, or outbound broker call fails the scenario.

### Required harness capabilities

* Runtime tool-request fixture
* Policy deny fixture service
* Network broker spy
* Execution-space network fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Long-running `download_artifact` returns `waiting`, then resumes through `PollAsync` to terminal success
* `Risk level:` Medium
* `Rationale:` Proves the bounded async contract: the framework may return a stable wait handle for long-running work, and later `PollAsync` must preserve invocation identity and produce one authoritative terminal result.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 2: Tool Execution Framework async wait-handle contract, invocation persistence, and `PollAsync` identity preservation
* Layer 2: Policy and Approval System exact authorization for a high-risk network tool
* Layer 2: Agent Runtime waiting or resumed work orchestration and checkpoint lineage around non-terminal tool state
* Layer 2: Sandbox / Execution Space network-bound execution and managed artifact output handling
* Layer 2: Internal Tool Catalog and Default Tool Profiles `download_artifact@v1` network-retrieval posture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_tool_async`, one thread `thread_tool_async`, one scope `scope_tool_async`, one run `run_tool_async`, and an opt-in profile or agent config that exposes `download_artifact@v1`.
* Seeded policy rules: the exact download target is allowed under bounded network and artifact-class conditions.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: one tool-enabled reasoning step that requests `download_artifact(url="https://example.test/archive.zip", artifactClass="reference")`.
* Selected tool implementations: internal built-in `download_artifact@v1` backed by a deterministic async adapter fixture.
* Expected capability set: `download_artifact@v1` is exposed and executable under the current execution-space and network posture.
* Execution-space posture: one attached execution space `es_tool_async` with approved network mode and managed artifact storage.
* Approval or replay fixtures: async adapter fixture that returns `waiting` first and terminal success on a later poll, wait-handle store, checkpoint store, and replay verifier.

### Given / When / Then

Given runtime submits one authorized `download_artifact@v1` request whose adapter is configured as long-running,
When the framework returns `waiting` with a stable wait handle and runtime later resumes the same invocation through `PollAsync`,
Then the framework returns one terminal success result for the original invocation and the artifact output remains attributable to the original `toolCallId`.

### Required assertions

`Required fixtures:`

* The async adapter fixture preserves one stable invocation id across the initial execute call and the later poll.
* The wait handle is replay-visible and bound to `runId`, `stepId`, and `toolCallId`.
* The final artifact is persisted to managed storage before success is claimed.

`Required observability artifacts:`

* Initial `tool.execute` trace ending in `waiting`.
* Invocation record with `waitId` or equivalent async identity.
* `tool.async_wait` trace for the resumed poll.
* Terminal success result with artifact refs and no duplicated invocation identity.

`Required replay artifacts:`

* Descriptor version, authorization ref, execution-space ref, and wait-handle artifact.
* Initial non-terminal result and later terminal result linked to the same invocation.
* Checkpoint refs or resume refs proving the async path remained attributable.

`Pass/fail oracle:`

* Async work must return a stable wait handle instead of hanging, later completion must preserve original invocation identity, and replay must reconstruct both the wait phase and the terminal result.

### Required harness capabilities

* Runtime async-tool fixture
* Async adapter fixture
* Wait-handle store
* Execution-space network and artifact fixture
* Checkpoint store, trace collector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` Crash after successful `write_file` resumes without duplicating the file mutation
* `Risk level:` High
* `Rationale:` Proves the recovery seam between runtime and tool execution: once a high-risk tool completed and the invocation plus result refs were persisted, a later runtime crash must not reissue the mutation on resume.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 2: Tool Execution Framework invocation persistence, result reuse, and idempotency-compatible recovery posture
* Layer 2: Agent Runtime pre-action checkpoint, completed-tool checkpoint, and resume rules preventing duplicate side effects
* Layer 2: Policy and Approval System exact authorization for the original file mutation
* Layer 2: Sandbox / Execution Space file-mutation isolation and side-effect capture
* Layer 2: Internal Tool Catalog and Default Tool Profiles `write_file@v1` high-risk metadata

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_tool_resume`, one thread `thread_tool_resume`, one scope `scope_tool_resume`, one run `run_tool_resume`, and default head profile `platform.head.default@v1`.
* Seeded policy rules: the exact `write_file@v1` request is allowed after explicit conditions for path and timeout.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: one tool-enabled reasoning step requesting `write_file(path="/workspace/out/report.txt", content=<deterministic body>)`.
* Selected tool implementations: internal built-in `write_file@v1`.
* Expected capability set: `write_file@v1` is exposed and executable inside the attached execution space.
* Execution-space posture: one attached execution space `es_tool_resume` with bounded writable output area.
* Approval or replay fixtures: deterministic write adapter fixture, invocation store, checkpoint store, crash injector that fires after invocation persistence but before the next reasoning step completes, and replay verifier.

### Given / When / Then

Given runtime has already sent one authorized `write_file@v1` execution request and the framework has completed the write plus persisted invocation metadata and result refs,
When the runtime process crashes before the run finishes the next reasoning step and later resumes from the latest valid checkpoint,
Then resume reuses the completed tool state and does not dispatch `write_file@v1` a second time.

### Required assertions

`Required fixtures:`

* The framework persists invocation metadata and side-effect refs before the injected crash occurs.
* The checkpoint data records whether the external action completed.
* The file broker or mutation spy can detect duplicate writes.

`Required observability artifacts:`

* Pre-action checkpoint and completed-tool checkpoint or equivalent completed-action refs.
* Tool invocation record marked terminal before the crash.
* Runtime resume trace showing checkpoint restoration.
* Explicit absence of a second tool invocation after resume.

`Required replay artifacts:`

* Authorization ref, execution request hash, invocation record, and mutation side-effect refs.
* Checkpoint refs proving the tool call already completed before the crash.
* Resume artifact showing prior-result reuse or completed-action recognition.

`Pass/fail oracle:`

* Once the first `write_file@v1` completed and was checkpoint-visible, resume must not repeat the mutation; any second write or second invocation fails the scenario.

### Required harness capabilities

* Runtime crash-and-resume fixture
* Checkpoint store
* Invocation store
* Execution-space file-mutation spy
* Tool adapter fixture for `write_file`
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 6

### Scenario summary

* `Title:` Candidate resolution removes execution-space-bound tools when no compatible execution space is attached
* `Risk level:` Medium
* `Rationale:` Proves the executable-capability boundary at resolution time: candidate tools that require an execution space must be filtered out before runtime exposes them when no compatible space is attached.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework `ResolveCandidateTools` execution-feasibility filtering
* Layer 2: Internal Tool Catalog and Default Tool Profiles explicit `requiresExecutionSpace` metadata and default-profile expansion
* Layer 2: Agent Runtime effective-tool-set seam using candidate descriptors returned by the framework

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one head-agent run `run_tool_no_space`, default head profile `platform.head.default@v1`, and no attached execution space.
* Seeded policy rules: policy does not remove tools first so the test isolates execution-space feasibility filtering.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one upcoming tool-enabled step that has not yet executed.
* Selected tool implementations: internal built-ins from `platform.head.default@v1`, including `read_file@v1`, `shell_exec@v1`, `fetch_url@v1`, and `inspect_attachment@v1`.
* Expected capability set: tools requiring an execution space are ineligible; tools not requiring one may remain candidates.
* Execution-space posture: no attached or compatible execution space exists.
* Approval or replay fixtures: pinned catalog snapshot and candidate-resolution explainer.

### Given / When / Then

Given runtime asks for candidate tools for a Head Agent step with defaults enabled but no attached execution space,
When the framework expands `platform.head.default@v1` and checks execution feasibility,
Then it removes execution-space-bound tools such as `read_file@v1`, `shell_exec@v1`, and `fetch_url@v1` from the returned candidates instead of advertising them as executable.

### Required assertions

`Required fixtures:`

* The pinned catalog snapshot marks the affected tools with `requiresExecutionSpace = true`.
* At least one non-execution-space-bound tool such as `inspect_attachment@v1` remains available to prove selective filtering rather than total failure.
* No execution space is attached anywhere in the request context.

`Required observability artifacts:`

* Candidate-resolution record showing expanded profile members.
* Filtering reason codes showing execution-space incompatibility for removed tools.
* Returned candidate set and applied profile refs.

`Required replay artifacts:`

* Catalog snapshot id, profile ref, and filtered candidate summary.
* Resolution request context showing absence of `executionSpaceId`.
* Explanation artifact for why filtered tools were removed.

`Pass/fail oracle:`

* Any execution-space-bound tool returned as executable without a compatible execution space fails the scenario.

### Required harness capabilities

* Candidate-resolution fixture service
* Internal catalog snapshot fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Expired or mismatched `ToolAuthorization` fails closed before dispatch
* `Risk level:` High
* `Rationale:` Proves execution-time defense in depth: the framework must reject unsafe ambiguity when the authorization envelope does not exactly match the requested call.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework authorization verification and fail-closed behavior
* Layer 2: Policy and Approval System exact, context-bound approval or decision lineage
* Layer 2: Agent Runtime authorization-envelope handoff to the framework

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_auth_mismatch` with a valid effective tool set containing `copy_file@v1`.
* Seeded policy rules: the original request would have been allowed if the authorization were valid.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled reasoning step already chose `copy_file@v1`.
* Selected tool implementations: internal built-in `copy_file@v1`.
* Expected capability set: `copy_file@v1` is executable only when the exact authorization matches tool id, version, call id, scope, execution space, and argument hash.
* Execution-space posture: one compatible execution space exists so the failure is specifically about authorization.
* Approval or replay fixtures: malformed authorization fixtures covering one expired envelope and one mismatched argument hash.

### Given / When / Then

Given runtime sends a tool execution request whose descriptor and execution-space context are otherwise valid,
When the framework verifies an expired or mismatched `ToolAuthorization`,
Then it rejects the request before adapter dispatch and records fail-closed authorization evidence.

### Required assertions

`Required fixtures:`

* The adapter spy would record any dispatch attempt.
* The authorization mismatch is deterministic and unambiguous.
* The request remains otherwise valid on schema, descriptor, and execution-space checks.

`Required observability artifacts:`

* Authorization verification trace showing the exact mismatch condition.
* Terminal failure result or rejection artifact from the framework.
* Explicit absence of adapter dispatch or side-effect refs.

`Required replay artifacts:`

* Execution request artifact and authorization ref.
* Descriptor version and execution-space ref.
* Failure artifact preserving the authorization-mismatch evidence.

`Pass/fail oracle:`

* Any adapter dispatch after a mismatched or expired authorization fails the scenario; the framework must stop before execution.

### Required harness capabilities

* Tool execution request fixture
* Authorization fixture service
* Adapter spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Invalid tool arguments fail schema validation before execution
* `Risk level:` Medium
* `Rationale:` Proves typed execution correctness: undocumented or invalid arguments must be rejected before a side effecting adapter sees them.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework input-schema validation and fail-fast request handling
* Layer 2: Agent Runtime effective-tool-set membership is insufficient without schema-valid arguments
* Layer 2: Internal Tool Catalog and Default Tool Profiles stable descriptor schema contract

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_bad_args` with `make_dir@v1` in the effective tool set.
* Seeded policy rules: the exact tool would be allowed if the arguments satisfied schema.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled reasoning step that requested `make_dir@v1`.
* Selected tool implementations: internal built-in `make_dir@v1`.
* Expected capability set: `make_dir@v1` is exposed and executable only with schema-valid arguments.
* Execution-space posture: one compatible execution space exists.
* Approval or replay fixtures: malformed argument payload fixture with hidden or missing required fields, schema validator fixture, and adapter spy.

### Given / When / Then

Given runtime submits an authorized `make_dir@v1` request whose arguments do not satisfy the published input schema,
When the framework validates the request,
Then it rejects the call before execution and returns a validation failure rather than dispatching the adapter.

### Required assertions

`Required fixtures:`

* The malformed payload violates the published input schema deterministically.
* The adapter spy detects any accidental dispatch.
* The authorization envelope matches the malformed request so the failure is about schema, not auth drift.

`Required observability artifacts:`

* Descriptor lookup or validation trace showing the pinned schema version.
* Terminal validation failure record.
* Explicit absence of adapter dispatch and side-effect refs.

`Required replay artifacts:`

* Descriptor version and schema ref or hash.
* Invalid argument payload ref or hash.
* Failure artifact preserving validation context.

`Pass/fail oracle:`

* Schema-invalid arguments must be rejected before execution; any side effect or adapter dispatch fails the scenario.

### Required harness capabilities

* Schema-validator fixture
* Tool execution request fixture
* Adapter spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Execution-time loss of the required execution space fails closed with no silent host fallback
* `Risk level:` High
* `Rationale:` Proves the trust-boundary rule at execution time, not only at candidate resolution: even if a tool was previously exposed, the framework must re-validate the presence of a compatible execution space when the call actually executes.

### Contracts validated

* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework execution-time defense in depth
* Layer 2: Sandbox / Execution Space no-host-fallback rule
* Layer 2: Agent Runtime exposure-vs-execution boundary

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_space_lost` with `shell_exec@v1` in the effective tool set from an earlier valid resolution step.
* Seeded policy rules: policy allows the exact command if the execution space still exists.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled step already chose `shell_exec@v1`.
* Selected tool implementations: internal built-in `shell_exec@v1`.
* Expected capability set: `shell_exec@v1` requires an execution space at both exposure and execution time.
* Execution-space posture: the originally attached execution space is detached, expired, or otherwise no longer compatible before execution starts.
* Approval or replay fixtures: execution-space lifecycle fixture, host-execution spy, and adapter dispatch spy.

### Given / When / Then

Given runtime previously exposed `shell_exec@v1` while an execution space was attached,
When the execution space becomes unavailable before the actual execution request reaches the framework,
Then the framework fails closed and does not fall back to host execution.

### Required assertions

`Required fixtures:`

* The earlier effective-tool-set artifact shows `shell_exec@v1` was once valid.
* The execution-space lifecycle change is replay-visible.
* The host-execution spy records any forbidden fallback path.

`Required observability artifacts:`

* Execution-time validation trace proving the missing or incompatible execution space.
* Terminal failure artifact from the framework.
* Explicit absence of sandbox dispatch and host execution.

`Required replay artifacts:`

* Earlier effective-tool-set ref and current execution-space lifecycle refs.
* Execution request ref and failure artifact.
* Evidence that no execution backend ran after the space was lost.

`Pass/fail oracle:`

* If a sandbox-required path runs on the host or runs without a valid execution space, the scenario fails.

### Required harness capabilities

* Execution-space lifecycle fixture
* Tool execution request fixture
* Host-fallback spy
* Adapter spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Duplicate idempotent `read_file` invocation reuses the prior result safely
* `Risk level:` Medium
* `Rationale:` Proves the dedupe contract for safe idempotent work: duplicate requests with the same tool call identity should reuse the original result when the framework can prove reuse is safe.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework idempotency and prior-result reuse rules
* Layer 2: Agent Runtime duplicate-request resilience
* Layer 2: Sandbox / Execution Space read-only execution boundary remains attributable

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_dedupe` with `read_file@v1` in the effective tool set.
* Seeded policy rules: the original `read_file@v1` request is allowed.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled step that emits one duplicate request pair for the same read operation.
* Selected tool implementations: internal built-in `read_file@v1`.
* Expected capability set: `read_file@v1` is safe for prior-result reuse under duplicate `toolCallId` or explicit idempotency key.
* Execution-space posture: one stable execution space is attached.
* Approval or replay fixtures: invocation store seeded with a completed first invocation and an adapter spy for any accidental second dispatch.

### Given / When / Then

Given the framework already recorded a successful `read_file@v1` invocation for one `toolCallId`,
When an equivalent duplicate execution request arrives with the same idempotency identity,
Then the framework returns the prior result instead of dispatching a second read execution.

### Required assertions

`Required fixtures:`

* The first invocation is terminal, replay-visible, and safe to reuse.
* The duplicate request is identical on tool id, version, arguments, and effective execution context.
* The adapter spy captures any unexpected second dispatch.

`Required observability artifacts:`

* Original invocation record and result artifact.
* Idempotency-hit log or trace on the duplicate request.
* Returned result showing prior-result reuse semantics.

`Required replay artifacts:`

* Original invocation record and result refs.
* Duplicate request ref and idempotency-hit evidence.
* Absence of a second invocation record for the duplicate request.

`Pass/fail oracle:`

* The duplicate request must reuse the prior result when safe; a second live dispatch or hidden duplicate side effect fails the scenario.

### Required harness capabilities

* Invocation store fixture
* Duplicate-request fixture
* Adapter spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Timed-out tool returns non-success plus partial refs and propagated cancellation evidence
* `Risk level:` High
* `Rationale:` Proves bounded execution and partial-evidence preservation: when a tool times out after producing some output or mutation evidence, the framework must cancel active execution and keep the partial refs visible instead of masking them.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 2: Tool Execution Framework timeout, cancellation, and partial-evidence preservation rules
* Layer 2: Sandbox / Execution Space cancellation propagation into the active backend
* Layer 2: Agent Runtime handling of terminal non-success tool results

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_timeout_partial` with `shell_exec@v1` or another bounded long-running tool in the effective set and a conservative timeout.
* Seeded policy rules: the exact request is allowed and scoped to one working directory and timeout budget.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled step that requests a bounded long-running command.
* Selected tool implementations: internal built-in `shell_exec@v1` backed by a deterministic timeout fixture that emits partial stdout or stderr before timing out.
* Expected capability set: the tool is executable, but runtime expects a bounded non-success outcome when the timeout is hit.
* Execution-space posture: one active execution space with process broker and cancellation support.
* Approval or replay fixtures: process adapter fixture that times out after partial output, cancellation spy, and artifact store.

### Given / When / Then

Given runtime sends one authorized long-running tool request with a bounded timeout,
When the active execution exceeds the allowed deadline after already producing partial output,
Then the framework propagates cancellation, returns a non-success result with partial refs where available, and records the incomplete execution explicitly.

### Required assertions

`Required fixtures:`

* The adapter fixture produces partial output deterministically before timeout.
* Cancellation signals are observable at the active backend.
* Partial refs persist even though the overall call did not complete cleanly.

`Required observability artifacts:`

* Tool execution start trace and timeout or cancellation trace.
* Partial stdout, stderr, or side-effect refs if produced.
* Terminal non-success result with timeout evidence.
* Invocation record showing the call did not complete successfully.

`Required replay artifacts:`

* Execution request ref, authorization ref, and execution-space ref.
* Partial output refs and timeout or cancellation artifact.
* Invocation record and normalized result artifact.

`Pass/fail oracle:`

* Timeout must not disappear into a generic success or silent cancellation; the framework must surface the incomplete outcome and preserve any partial evidence it already produced.

### Required harness capabilities

* Long-running tool adapter fixture
* Cancellation spy
* Artifact store fixture
* Execution-space process fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The design defines `waiting`, `failed`, and `partial` as result states, and it says timeout should return partial refs where available, but it does not define whether a timed-out tool with partial evidence must report `status = failed` or `status = partial`. The suite can assert non-success plus evidence preservation today, but the exact normalized status contract remains undefined.

## Scenario 12

### Scenario summary

* `Title:` Artifact-store persistence failure prevents the framework from claiming success
* `Risk level:` High
* `Rationale:` Proves the replay-integrity boundary: even if an adapter completed useful work, the framework must fail closed if it cannot persist the required result refs or side-effect evidence.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework persistence-before-success rule and failure-mode handling
* Layer 2: Agent Runtime dependence on persisted result refs for safe continuation
* Layer 2: Sandbox / Execution Space and artifact-store boundary for replay-addressable output

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_artifact_fail` with `inspect_attachment@v1` or another artifact-producing tool in the effective set.
* Seeded policy rules: the exact request is allowed.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled step requesting a tool that produces a structured output plus at least one persisted artifact ref.
* Selected tool implementations: deterministic tool adapter that finishes successfully before persistence.
* Expected capability set: the tool is fully executable and would have succeeded if persistence completed.
* Execution-space posture: compatible if required by the selected tool.
* Approval or replay fixtures: artifact-store fixture forced to fail after adapter completion but before result refs are durably stored.

### Given / When / Then

Given the tool adapter finishes execution and hands the framework a valid result payload,
When persistence of the required artifact refs fails,
Then the framework must not return a terminal success result.

### Required assertions

`Required fixtures:`

* The adapter completion is deterministic and distinguishable from persistence failure.
* The artifact store fails after the adapter result exists but before durable refs are committed.
* The runtime would otherwise continue on success, so a false success would be visible.

`Required observability artifacts:`

* Adapter-completion trace and persistence-failure trace.
* Terminal framework failure artifact or equivalent non-success result.
* Explicit absence of a success result that references missing artifacts.

`Required replay artifacts:`

* Execution request ref and invocation record.
* Persistence-failure evidence.
* Any partial output refs that were safely retained before the failure.

`Pass/fail oracle:`

* If the framework reports success without persisted result refs, the scenario fails; success requires replay-addressable outputs.

### Required harness capabilities

* Tool adapter fixture
* Artifact-store failure injector
* Invocation store
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Child default tool resolution excludes Head Agent mutation, process, and network tools
* `Risk level:` High
* `Rationale:` Proves the bounded-delegation rule on the tool boundary: subagents must receive the conservative child default profile, not the full Head Agent default pack, unless an explicit child profile is delegated.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework child-tool candidate resolution
* Layer 2: Internal Tool Catalog and Default Tool Profiles `platform.subagent.analysis@v1` versus `platform.head.default@v1`
* Layer 2: Agent Runtime child effective-tool-set ownership and delegated subset rules
* Layer 2: Subagent Profiles and Delegation child capability narrowing

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run `run_tool_parent`, one child run `run_tool_child`, one system-pinned default child profile `platform.subagent.analysis@v1`, and no explicit opt-in child execution profile.
* Seeded policy rules: policy does not independently remove the child analysis tools so the test isolates profile-default behavior.
* Seeded memory and retrieval stores: not material.
* Selected model mode: a delegated child analysis step that may use read or inspection tools only.
* Selected tool implementations: internal catalog built-ins from the child default profile plus broader Head Agent tools present only in the parent defaults.
* Expected capability set: the child can receive analysis tools such as `read_file@v1` and `inspect_attachment@v1`, but not `write_file@v1`, `shell_exec@v1`, or `fetch_url@v1`.
* Execution-space posture: one compatible execution space may exist, but execution-space availability must not broaden child defaults automatically.
* Approval or replay fixtures: parent and child resolution artifacts, pinned catalog snapshot, and child-delegation fixture.

### Given / When / Then

Given runtime creates a child run using the default child tool posture and no explicit execution-oriented child profile,
When the framework resolves candidate tools for the child run,
Then it returns the conservative child default set and excludes the broader Head Agent mutation, process, and network tools.

### Required assertions

`Required fixtures:`

* `platform.subagent.analysis@v1` is the effective child default profile.
* No explicit child opt-in profile such as `platform.subagent.exec.limited@v1` is delegated.
* The parent run still has broader Head Agent defaults so the test proves non-inheritance rather than absence of broader tools in the system.

`Required observability artifacts:`

* Parent and child candidate-resolution artifacts.
* Applied child profile refs and filtered tool lists for the child run.
* Explanation evidence showing why broader Head Agent tools were absent from the child result.

`Required replay artifacts:`

* Catalog snapshot id, parent profile ref, child profile ref, and child resolution result.
* Child run lineage refs showing the delegated context.
* Candidate-resolution explanation artifact.

`Pass/fail oracle:`

* If the child receives `platform.head.default` tools without explicit delegation, the scenario fails.

### Required harness capabilities

* Parent-child runtime fixture
* Catalog and profile snapshot fixture service
* Candidate-resolution fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 14

### Scenario summary

* `Title:` Skill-contributed tool without a published canonical descriptor version is rejected from candidate resolution
* `Risk level:` Medium
* `Rationale:` Proves the safe-extensibility boundary: skills may contribute tool refs only when the framework can resolve them to canonical published descriptors and apply the normal execution contract.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Tool Execution Framework skill-contributed tool acceptance rules
* Layer 2: Skills boundary that tools may contribute refs but not bypass canonical execution contracts
* Layer 2: Agent Runtime effective-tool-set computation using valid candidate sources only

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_tool_skill_missing_descriptor` and one skill activation that contributes `skill.todo.extract@v3` as a tool ref.
* Seeded policy rules: policy does not block the tool first, so the scenario isolates descriptor publication rules.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one tool-enabled step where runtime merges skill tool refs into normal candidate resolution.
* Selected tool implementations: one skill-contributed tool ref with no published canonical descriptor version in the registry snapshot.
* Expected capability set: the missing-descriptor skill tool must not enter the candidate or effective tool set.
* Execution-space posture: not material because descriptor publication fails first.
* Approval or replay fixtures: skill registry fixture, tool registry snapshot missing the descriptor version, and candidate-resolution explainer.

### Given / When / Then

Given runtime merges one skill-contributed tool ref into a normal candidate-resolution request,
When the framework cannot resolve that ref to a published canonical descriptor version,
Then it rejects the skill-contributed tool from candidate resolution instead of exposing an untyped or bypassed execution path.

### Required assertions

`Required fixtures:`

* The skill ref is syntactically well formed so the failure is specifically about missing canonical publication.
* The registry snapshot deterministically lacks the referenced descriptor version.
* No alternate implicit tool path exists for the same skill capability.

`Required observability artifacts:`

* Candidate-resolution trace showing the skill source ref and the failed descriptor lookup.
* Returned candidate result excluding the unresolved skill-contributed tool.
* Explanation artifact linking the rejection to missing canonical publication.

`Required replay artifacts:`

* Skill source ref and registry snapshot ref.
* Candidate-resolution result and rejection evidence.
* Absence of any execution path or descriptor version for the unresolved tool.

`Pass/fail oracle:`

* Any unresolved skill-contributed tool that reaches model exposure or tool execution fails the scenario; unresolved tools must be rejected before they become executable capabilities.

### Required harness capabilities

* Skill registry fixture
* Tool registry snapshot fixture
* Candidate-resolution fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module coverage map

* Core allow, deny, and approval coverage: Scenarios 1, 2, and 3
* Async, recovery, and idempotency coverage: Scenarios 4, 5, 10, 11, and 12
* Execution-space and sandbox-boundary coverage: Scenarios 1, 3, 6, 9, and 11
* Candidate-resolution and profile-boundary coverage: Scenarios 1, 6, 13, and 14
* Replay, checkpoint, and audit-lineage coverage: Scenarios 2, 4, 5, 10, 11, and 12
