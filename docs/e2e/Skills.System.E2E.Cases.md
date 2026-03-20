# Skills System E2E Cases

This document proposes thirteen deterministic E2E scenarios for the Skills System subsystem.
It covers both end-to-end user and operator journeys and module smoke scenarios so the same suite can validate candidate skill resolution, low-risk instruction skills, approval-gated runtime-backed skills, async wait and resume, contributed-tool governance, memory-candidate boundaries, replay readability for disabled historical versions, and fail-closed behavior around authorization, schema validation, execution-space loss, configuration precedence, and approval expiry.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator replay, descriptor-read, and approval drivers
* seeded identity, thread, collaborative-scope, configuration, policy, skill-descriptor, binding, tool-descriptor, and execution-space fixtures
* recorded model adapter mode with deterministic skill requests and runtime-issued authorizations
* replay-visible binding refs, descriptor refs, instruction refs, runtime-bundle refs, policy decisions, approval refs, checkpoints, execution-space refs, tool invocation refs, context-delta refs, wait handles, and final outputs
* trace collector, run-view materializer, descriptor harness, invocation-store harness, context-snapshot harness, and replay verifier

## Suite structure

### User-journey scenarios

1. low-risk instruction-overlay skill activates from the bound candidate set and contributes a `run_state_overlay` without side effects
2. high-risk runtime-backed skill waits for approval, resumes inside an execution space, and its internal tool still follows the normal tool policy path
3. async workflow skill returns `waiting`, then `PollAsync` resumes the same invocation to terminal success
4. operator replay of a now-disabled historical environment-bound skill resolves the exact descriptor and recorded outputs without re-emitting live side effects

### Module smoke scenarios

5. `ResolveCandidateSkills` filters out `draft`, `disabled`, out-of-scope, and execution-infeasible skills before runtime exposure
6. `Activate` fails closed when `SkillAuthorization` does not match the concrete request
7. input schema validation fails before policy-sensitive execution begins
8. skill-emitted memory candidates remain proposals and do not create live memory without the Memory System path
9. execution-space loss after exposure blocks runtime-backed activation with no silent host fallback
10. internal contributed-tool failure returns `partial` plus tool and side-effect refs instead of opaque success
11. duplicate safe skill-call detection returns the prior persisted result when the same deterministic call is retried
12. lower-precedence config cannot broaden imported-skill or contributed-candidate-tool exposure beyond higher-level controls
13. approval timeout on a high-risk skill preserves the checkpoint boundary but leaves terminal skill-status semantics underspecified

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Low-risk instruction-overlay skill activates from the bound candidate set and contributes a `run_state_overlay` without side effects
* `Risk level:` Low
* `Rationale:` Proves the baseline skill path for a deterministic, instruction-only capability: candidate resolution returns an executable skill, runtime authorizes one concrete activation, policy allows it, and the skill contributes a bounded context delta in the correct layer instead of creating side effects or a new top-level context layer.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Skills candidate resolution, runtime-issued authorization, low-risk activation, and normalized success result
* Layer 2: Skills context placement rules for `run_state_overlay`
* Layer 2: Agent Runtime skill exposure decision, post-skill continuation, and checkpoint-safe step completion
* Layer 2: Context Assembly strict order and run-state placement of dynamic skill deltas
* Layer 2: Observability skill activation, context-delta, and result replay artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_skill_overlay`, one open thread `thread_skill_overlay`, one collaborative scope `scope_skill_overlay`, one published bound skill `skill.concise.rewrite@v1`, and one config snapshot with `allowSkillCandidateExposure = true` and no skill kill switches for that skill.
* Seeded policy rules: allow low-risk `skill_activation` for `skill.concise.rewrite@v1` in the current scope with no approval requirement.
* Seeded memory and retrieval stores: both stores exist and remain unchanged so the journey isolates skill activation rather than memory or RAG behavior.
* Selected model mode: recorded model requests the bound skill once, then produces the final answer after the skill result is merged into runtime state.
* Selected tool implementations: none; the skill has no tool contributions and no runtime bundle.
* Expected capability set: the skill is returned by `ResolveCandidateSkills`, survives runtime exposure filtering, and is eligible for one low-risk activation.
* Execution-space posture: not material because the skill performs no code execution and no direct side effects.
* Approval or replay fixtures: no approval wait is expected; replay must preserve binding ref, descriptor ref, instruction content refs and hashes, authorization ref, policy decision ref, context-delta ref, result ref, and the post-activation context snapshot.

### Given / When / Then

Given a user asks for a concise rewrite and the recorded model requests one published instruction-overlay skill that is already bound to the agent,
When runtime resolves candidate skills, exposes the executable skill, issues a matching `SkillAuthorization`, policy allows activation, and the Skills System materializes the skill output,
Then the skill returns a `succeeded` result with a `SkillContextDelta` placed as `run_state_overlay`, runtime continues reasoning with that delta, and no tool, network, file, or memory side effect occurs.

### Required assertions

`Required fixtures:`

* The bound skill version is `published`, in scope, and deterministic.
* The skill declares no runtime bundle and no side-effecting permissions.
* The authorization envelope matches the exact `skillId`, `version`, `skillCallId`, and input hash.

`Required observability artifacts:`

* Candidate-resolution records showing the bound skill remained executable.
* Runtime exposure decision for the skill before model-facing reasoning.
* Activation start and completion records, authorization verification record, and policy decision ref.
* One `SkillContextDelta` ref showing placement `run_state_overlay`.
* One post-skill checkpoint and one later context snapshot or inclusion record showing the dynamic skill delta in the run-state layer.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing skill activation and later reasoning continuation.

`Required replay artifacts:`

* Binding ref, descriptor ref, instruction content refs and hashes, authorization ref, policy decision ref, context-delta ref, result ref, and post-activation checkpoint ref.

`Pass/fail oracle:`

* The scenario passes only if the skill is exposed because it is executable, activation happens only after authorization and policy allow, the contributed context lands in `run_state_overlay`, and no hidden side effects occur.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Skill descriptor and binding fixture service
* Context-snapshot harness
* Invocation-store harness
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` High-risk runtime-backed skill waits for approval, resumes inside an execution space, and its internal tool still follows the normal tool policy path
* `Risk level:` High
* `Rationale:` Proves the two-layer skill governance model: approval for skill activation does not authorize all downstream actions, and a runtime-backed skill must still execute inside an execution space and route internal tool use through the Tool Execution Framework.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Skills runtime-backed activation, approval gating, execution-space rules, and internal contributed-tool path
* Layer 2: Policy and Approval `skill_activation` evaluation, approval binding, and later downstream `tool_execution` evaluation
* Layer 2: Agent Runtime checkpoint-before-wait, resume-after-approval, and final response ownership
* Layer 2: Tool Execution Framework canonical tool execution and replay capture for skill-internal tool calls
* Layer 2: Sandbox / Execution Space least-privilege execution boundary for runtime-backed skill code

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_skill_patch`, one open thread `thread_skill_patch`, one collaborative scope `scope_skill_patch`, one published bound skill `skill.repo.patch.assist@v1`, and one config snapshot with `maxSkillExecutionDuration` and artifact-size limits pinned conservatively.
* Seeded policy rules: activating `skill.repo.patch.assist@v1` is high risk because it has a runtime bundle plus bounded filesystem write permissions, so `skill_activation` returns `require_approval`; after approval, one internal `patch_file@v1` tool call is separately allowed under path-bounded conditions.
* Seeded memory and retrieval stores: both stores exist and remain unchanged.
* Selected model mode: recorded model requests the skill once; after the resumed skill result returns, runtime produces the final user-visible response.
* Selected tool implementations: one canonical `patch_file@v1` tool contribution with `internal` exposure mode only.
* Expected capability set: the skill is resolved and exposed as executable only because a compatible execution space exists; its internal contributed tool is not model-visible and is available only inside governed skill execution.
* Execution-space posture: one attached execution space `es_skill_patch` with bounded writable paths under `/workspace/src`, no unrestricted host access, and no unconstrained network mode.
* Approval or replay fixtures: one approval request artifact, one approval resolution bound to the original activation request hash and policy snapshot, one checkpoint before `waiting_approval`, and replay refs for the runtime bundle, execution-space ref, internal tool invocation, and final skill result.

### Given / When / Then

Given a user requests a bounded code edit and the recorded model chooses one high-risk runtime-backed skill,
When runtime issues a concrete `SkillAuthorization`, policy returns `require_approval`, runtime checkpoints before `waiting_approval`, approval later resolves for the exact activation request, and the skill resumes inside `es_skill_patch`,
Then the skill executes through the governed runtime boundary, its internal `patch_file@v1` call still goes through the Tool Execution Framework and its own tool policy path, and runtime alone emits the final user-visible response.

### Required assertions

`Required fixtures:`

* The approval resolution binds to the original activation request hash, scope, and execution-space context.
* The internal contributed tool is declared with `internal` exposure mode and canonical tool version pinning.
* The execution space remains compatible with the skill's permission profile for the whole resumed activation.

`Required observability artifacts:`

* Candidate-resolution and runtime exposure records for the skill.
* Skill-activation policy decision, approval request ref, approval resolution ref, and policy snapshot ref.
* One checkpoint ref before `waiting_approval` and one resumed activation trace after approval.
* Execution-space ref, runtime-bundle execution start and end records, internal tool invocation refs, downstream tool policy decision ref, side-effect refs, and final `SkillExecutionResult`.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing approval wait, resumed skill execution, internal tool usage, and final runtime completion.

`Required replay artifacts:`

* Binding ref, descriptor ref, runtime-bundle ref, authorization ref, approval request and resolution refs, execution-space ref, internal tool invocation refs, side-effect refs, result ref, and checkpoint refs.

`Pass/fail oracle:`

* The scenario passes only if the skill does not execute before approval, runtime resumes from a valid checkpoint, the internal tool call remains separately governed and replay-visible, and the runtime-backed code runs only inside the execution space.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Skill descriptor and binding fixture service
* Policy and approval fixture service
* Tool adapter fixture for `patch_file`
* Execution-space fixture for bounded runtime-backed skills
* Checkpoint and resume fixture service
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Async workflow skill returns `waiting`, then `PollAsync` resumes the same invocation to terminal success
* `Risk level:` Medium
* `Rationale:` Proves the async skill contract is stable and attributable: the wait handle must preserve identity, `PollAsync` must continue the same invocation, and terminal completion must not look like a second independent activation.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Skills async lifecycle, `waiting` result status, `SkillWaitHandle`, `PollAsync`, and invocation-store identity preservation
* Layer 2: Agent Runtime resume-safe handling of non-terminal skill work
* Layer 2: Observability async wait, completion, and replay artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_skill_async`, one open thread `thread_skill_async`, one collaborative scope `scope_skill_async`, one published workflow skill `skill.report.generate@v1`, and one config snapshot with bounded `maxSkillExecutionDuration`.
* Seeded policy rules: allow `skill_activation` for `skill.report.generate@v1` and allow bounded artifact writes associated with the skill.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model requests the async skill once and later uses the finished report artifact in the final response.
* Selected tool implementations: none; the async behavior is owned by the skill itself.
* Expected capability set: the skill is returned by candidate resolution and exposed for one activation.
* Execution-space posture: one attached execution space `es_skill_async` is available because the skill writes bounded artifacts during async processing.
* Approval or replay fixtures: replay must preserve the original `skillCallId`, invocation record, wait handle, async completion record, result ref, and post-completion checkpoint.

### Given / When / Then

Given a user asks for a report that the bound workflow skill produces asynchronously,
When runtime activates the skill, the skill returns `waiting` with a stable `SkillWaitHandle`, and a later `PollAsync` call on that handle returns a terminal `succeeded` result,
Then the completed result is attributable to the original skill invocation, no second independent activation occurs, and runtime can safely continue from the terminal async result.

### Required assertions

`Required fixtures:`

* The wait handle preserves `runId`, `stepId`, and `skillCallId` through the async boundary.
* The terminal result is returned only through `PollAsync`, not through a new activation.

`Required observability artifacts:`

* Activation start record, `waiting` result record, wait-handle ref, and invocation-store record keyed by the original `skillCallId`.
* One later `PollAsync` record that reuses the original invocation identity.
* Terminal success result ref, artifact refs, and post-completion checkpoint.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the initial wait and later completion as one invocation lineage.

`Required replay artifacts:`

* Descriptor ref, binding ref, authorization ref, invocation-store record, wait-handle ref, terminal result ref, artifact refs, and completion checkpoint ref.

`Pass/fail oracle:`

* The scenario passes only if `waiting` and terminal completion are linked to the same invocation identity and replay can reconstruct the async boundary without inventing a new activation.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Skill descriptor and binding fixture service
* Async skill runtime fixture
* Invocation-store harness
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Operator replay of a now-disabled historical environment-bound skill resolves the exact descriptor and recorded outputs without re-emitting live side effects
* `Risk level:` Medium
* `Rationale:` Proves disabled skills remain replay-readable and that environment-bound skill replay prefers recorded outputs rather than live side-effect re-execution.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Skills immutable descriptor, replay store, disabled-skill replay readability, and determinism-class replay behavior
* Layer 2: Skills `GetDescriptor` contract for historical versions
* Layer 2: Observability replay fidelity and skill-call lineage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one historical run `run_skill_replay`, one historical invocation for `skill.live.status.snapshot@v2`, one later package-state transition that marks `skill.live.status.snapshot@v2` as `disabled`, and one replay configuration that prefers recorded outputs.
* Seeded policy rules: new activation of `skill.live.status.snapshot@v2` is blocked after disablement, but replay and audit reads remain allowed.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none for live execution; replay reads stored descriptor, invocation, and result artifacts only.
* Selected tool implementations: none during replay; historical side effects already have recorded refs.
* Expected capability set: not material for new exposure because the scenario is replay or audit only.
* Execution-space posture: the historical invocation carried one execution-space ref; replay does not allocate a fresh execution space because recorded outputs exist.
* Approval or replay fixtures: replay must preserve descriptor ref, runtime-bundle ref if any, authorization ref, determinism-class metadata, output refs, artifact refs, side-effect refs, and invocation-store records.

### Given / When / Then

Given a historical run used an environment-bound skill version that is now disabled for new activation,
When an operator reads the exact descriptor through `GetDescriptor` and replays the historical invocation,
Then the platform resolves the exact historical descriptor and recorded outputs, and replay does not re-emit the live side effects that the skill originally performed.

### Required assertions

`Required fixtures:`

* The historical skill version is now disabled for new activation but still present for replay or audit reads.
* The historical invocation has recorded outputs or side-effect evidence sufficient for replay without live re-execution.

`Required observability artifacts:`

* Historical activation and completion records, descriptor ref, determinism-class metadata, output refs, and side-effect refs.
* Disablement or kill-switch record for the historical version.
* Replay-manifest or run-summary artifacts showing replay used recorded evidence rather than live execution.

`Required replay artifacts:`

* Descriptor ref, binding ref used historically, runtime-bundle ref if present, authorization ref, invocation-store record, output refs, side-effect refs, and replay posture markers.

`Pass/fail oracle:`

* The scenario passes only if the exact disabled historical version remains replay-readable and replay uses recorded artifacts instead of re-emitting live side effects.

### Required harness capabilities

* Operator replay driver
* Descriptor harness
* Invocation-store harness
* Seeded historical skill-run fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` `ResolveCandidateSkills` filters out `draft`, `disabled`, out-of-scope, and execution-infeasible skills before runtime exposure
* `Risk level:` High
* `Rationale:` Proves the exposure boundary is executable and governed. Candidate resolution must never hand runtime a skill that cannot legally or technically activate on the current path.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 2: Skills publication-state, binding-scope, runtime-bundle, and execution-space filtering during candidate resolution
* Layer 2: Skills deterministic `ResolveCandidateSkills` behavior

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one resolution request `resolve_skill_matrix_01`, one current scope `scope_skill_filter`, and five candidate skills consisting of one `published` in-scope instruction skill, one `draft` skill, one `disabled` skill, one published skill bound to a different collaborative scope, and one published runtime-backed skill that requires an execution space when none is attached.
* Seeded policy rules: allow exposure of the valid in-scope published skill only; no approval path is relevant because filtering must happen before activation.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: tool contributions exist only on the runtime-backed skill that should be filtered out.
* Expected capability set: exactly one executable in-scope `published` skill survives candidate resolution.
* Execution-space posture: no execution space is attached for this scenario.
* Approval or replay fixtures: replay must preserve descriptor refs, binding refs, and source refs for both included and excluded candidates.

### Given / When / Then

Given runtime asks for candidate skills for a run with no attached execution space,
When `ResolveCandidateSkills` expands bindings and descriptors,
Then it returns only the published, in-scope, execution-feasible skill and filters out the `draft`, `disabled`, out-of-scope, and execution-infeasible candidates.

### Required assertions

`Required fixtures:`

* Each excluded skill differs by exactly one exclusion reason so filtering is attributable.
* No execution space is attached even though one candidate requires it.

`Required observability artifacts:`

* Candidate-resolution records, binding-load records, and exclusion reasons for each filtered skill.
* Runtime exposure decision inputs showing only the surviving candidate skill.
* Explicit absence of contributed-tool refs from filtered-out skills in the returned candidate set.

`Required replay artifacts:`

* Resolution input ref, returned candidate-skill refs, filtered binding refs, descriptor refs, and source refs.

`Pass/fail oracle:`

* The scenario passes only if no non-executable or unavailable skill survives candidate resolution.

### Required harness capabilities

* Skill resolution harness
* Skill descriptor and binding fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` `Activate` fails closed when `SkillAuthorization` does not match the concrete request
* `Risk level:` High
* `Rationale:` Proves skill execution cannot proceed on ambiguous authorization. The authorization envelope must bind to the exact skill call, skill version, scope, and input hash.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 2: Skills activation-bound authorization rules and fail-closed behavior on mismatch

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one published skill `skill.auth.checked@v1`, one visible binding, and one activation request whose `SkillAuthorization` carries a mismatched `allowedInputHash` for the concrete input payload.
* Seeded policy rules: not material because authorization mismatch must fail before live execution.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: the skill is otherwise valid and exposed for activation.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the mismatched authorization ref and activation rejection artifact.

### Given / When / Then

Given runtime submits a skill activation request with an authorization envelope that does not match the exact input payload,
When `Activate` validates the request,
Then the activation fails closed before execution and requires runtime re-evaluation rather than silent broadening.

### Required assertions

`Required fixtures:`

* The only failing condition is the authorization mismatch.

`Required observability artifacts:`

* Authorization verification record showing the mismatch.
* Activation rejection artifact.
* Explicit absence of policy execution, runtime-bundle execution, tool invocation, or side-effect artifacts for the rejected call.

`Required replay artifacts:`

* Activation request ref, authorization ref, and rejection artifact.

`Pass/fail oracle:`

* The scenario passes only if authorization mismatch prevents execution and produces replay-visible failure evidence.

### Required harness capabilities

* Skill activation harness
* Skill descriptor and binding fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Input schema validation fails before policy-sensitive execution begins
* `Risk level:` Medium
* `Rationale:` Proves schema validation is a real activation boundary. Invalid input must not drift into policy approval, runtime code execution, or tool invocation.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Skills input-schema validation and activation failure handling

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one published workflow skill `skill.schema.strict@v1`, one visible binding, and one activation request whose input payload is authorization-matched but invalid under the skill input schema.
* Seeded policy rules: allow the activation if validation succeeds.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: the skill is visible and otherwise executable.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the validation-failure artifact.

### Given / When / Then

Given a visible skill receives an input payload that fails its declared input schema,
When `Activate` validates the request,
Then the subsystem returns a validation failure before policy-sensitive execution begins.

### Required assertions

`Required fixtures:`

* The authorization envelope matches the invalid payload exactly, so failure is due to schema validation rather than authorization mismatch.

`Required observability artifacts:`

* Validation record and validation-failure artifact.
* Explicit absence of policy decision, execution-space use, tool invocation, and side-effect artifacts.

`Required replay artifacts:`

* Activation request ref, schema-validation failure output, and descriptor ref.

`Pass/fail oracle:`

* The scenario passes only if invalid input is rejected before policy or execution work begins.

### Required harness capabilities

* Skill activation harness
* Schema-validation fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Skill-emitted memory candidates remain proposals and do not create live memory without the Memory System path
* `Risk level:` Medium
* `Rationale:` Proves the skills subsystem does not bypass the Memory System. Skill outputs may include `memoryCandidateRefs`, but those refs are proposals only until the governed memory write path runs separately.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 2: Skills memory-boundary rules for `memoryCandidateRefs`
* Layer 2: Memory System rule that skill-generated candidates must not bypass the memory write pipeline

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one published workflow skill `skill.preference.extract@v1`, one visible binding, and one run where runtime will not call the Memory System write path during the same scenario.
* Seeded policy rules: allow low-risk skill activation; no memory-write decision is issued because no memory write is attempted during the scenario.
* Seeded memory and retrieval stores: one empty target memory scope and one Memory System audit fixture to prove no live memory record is created.
* Selected model mode: recorded model requests the skill once and then continues reasoning from the returned structured result.
* Selected tool implementations: none.
* Expected capability set: the skill is visible and executable.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve `memoryCandidateRefs` in the skill result and the absence of a memory-write outcome in the same path.

### Given / When / Then

Given a workflow skill extracts durable-looking user preferences during a run,
When `Activate` succeeds and returns `memoryCandidateRefs` as part of the normalized skill result,
Then the refs remain proposals only and no live memory record is created until the Memory System path runs separately.

### Required assertions

`Required fixtures:`

* The scenario stops at the skill boundary and does not invoke the Memory System write operation.

`Required observability artifacts:`

* Skill activation record and terminal result containing `memoryCandidateRefs`.
* Explicit absence of any same-path `MemoryWriteResult` or live-memory creation artifact.

`Required replay artifacts:`

* Descriptor ref, authorization ref, skill result ref with `memoryCandidateRefs`, and negative evidence that no memory-write artifact was produced on the skill path.

`Pass/fail oracle:`

* The scenario passes only if the skill emits memory candidate refs without bypassing the governed Memory System write pipeline.

### Required harness capabilities

* Skill activation harness
* Skill descriptor and binding fixture service
* Memory audit fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Execution-space loss after exposure blocks runtime-backed activation with no silent host fallback
* `Risk level:` High
* `Rationale:` Proves the execution-space trust boundary is real at activation time, not only during candidate resolution. If the required execution space disappears after exposure, the skill must fail closed.

### Contracts validated

* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Skills execution-space rules and failure mode when the execution boundary cannot be satisfied
* Layer 2: Sandbox no-host-fallback rule for sandbox-required paths

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one published runtime-backed skill `skill.runtime.inspect@v1`, one visible binding, one authorization envelope, and one execution space `es_skill_lost` that is present during candidate resolution but intentionally detached before activation.
* Seeded policy rules: allow activation if the execution space remains attached and compatible.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: the skill was initially visible because the execution-space requirement was satisfiable during exposure.
* Execution-space posture: `es_skill_lost` disappears after exposure and before execution.
* Approval or replay fixtures: replay must preserve the original execution-space ref, detachment or loss artifact, and activation failure.

### Given / When / Then

Given a runtime-backed skill was exposed while a compatible execution space existed,
When that execution space becomes unavailable before `Activate` begins execution,
Then the activation fails closed and the platform does not silently fall back to unrestricted host execution.

### Required assertions

`Required fixtures:`

* The skill genuinely requires an execution space under its permission profile.
* The only activation blocker is loss of the execution space after exposure.

`Required observability artifacts:`

* Original exposure record showing the skill was executable at exposure time.
* Execution-space loss or detachment artifact.
* Activation failure artifact showing execution-space unavailability.
* Explicit absence of runtime-bundle execution, tool invocation, or host-fallback execution artifacts.

`Required replay artifacts:`

* Descriptor ref, authorization ref, original execution-space ref, detachment artifact, and activation-failure ref.

`Pass/fail oracle:`

* The scenario passes only if loss of the execution space prevents activation and no host fallback occurs.

### Required harness capabilities

* Skill activation harness
* Execution-space fixture service with detach or expiry control
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Internal contributed-tool failure returns `partial` plus tool and side-effect refs instead of opaque success
* `Risk level:` High
* `Rationale:` Proves skill-contributed tools remain tools and that partial failure is normalized explicitly. A skill must not hide downstream tool failure behind a vague success string.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Skills internal contributed-tool routing, `partial` result status, and side-effect evidence rules
* Layer 2: Tool Execution Framework canonical tool execution and failure normalization

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one published runtime-backed skill `skill.sync.files@v1`, one visible binding, and one activation request authorized for a bounded sync task.
* Seeded policy rules: allow skill activation and allow the internal contributed tool under bounded conditions.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: one internal contributed `write_file@v1` or equivalent canonical tool that is forced to fail after a partial mutation.
* Expected capability set: the skill is executable and its internal tool remains internal-only rather than model-visible.
* Execution-space posture: one compatible execution space `es_skill_partial` is attached.
* Approval or replay fixtures: replay must preserve internal tool invocation refs, partial side-effect refs, and the resulting non-success skill result.

### Given / When / Then

Given a runtime-backed skill executes successfully up to one internal canonical tool call,
When the internal tool reports a partial mutation or downstream error,
Then the skill returns `partial` rather than opaque success and preserves the tool refs and side-effect evidence needed for audit and recovery.

### Required assertions

`Required fixtures:`

* The internal tool is canonical, version-pinned, and routed through the Tool Execution Framework.
* The tool failure occurs after at least one partial side effect is recorded.

`Required observability artifacts:`

* Skill activation record, internal tool invocation refs, downstream tool failure record, partial side-effect refs, and terminal `SkillExecutionResult` with status `partial`.
* `RunTimeline` and `ExecutionGraph` views showing the skill-to-tool lineage.

`Required replay artifacts:`

* Descriptor ref, authorization ref, execution-space ref, tool invocation refs, side-effect refs, partial result ref, and error info.

`Pass/fail oracle:`

* The scenario passes only if the skill surfaces partial failure explicitly with tool and side-effect lineage instead of claiming clean success.

### Required harness capabilities

* Skill activation harness
* Tool adapter fixture with partial-mutation failure mode
* Execution-space fixture service
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Duplicate safe skill-call detection returns the prior persisted result when the same deterministic call is retried
* `Risk level:` Medium
* `Rationale:` Proves skill execution can recover from safe duplicate activation attempts without duplicating work or muddying audit history.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Skills duplicate skill-call detection and prior-result reuse

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one published deterministic instruction or workflow skill `skill.normalize.todo@v1`, one visible binding, and one previously completed activation persisted under the same `skillCallId`.
* Seeded policy rules: allow the original activation.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none; the skill has no side effects so safe reuse is permitted.
* Expected capability set: the skill is visible and deterministic.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the prior invocation result and the duplicate-detection path.

### Given / When / Then

Given a deterministic skill call with no side effects has already completed successfully,
When the same skill call is retried safely,
Then the subsystem returns the prior persisted result instead of executing a second independent activation.

### Required assertions

`Required fixtures:`

* The prior persisted result is still resolvable and safe for reuse.
* The duplicate retry matches the original call identity closely enough for safe reuse.

`Required observability artifacts:`

* Original activation and result records.
* Duplicate-detection record or reused-result linkage.
* Explicit absence of a second independent execution record for the same safe duplicate call.

`Required replay artifacts:`

* Original invocation record, original result ref, duplicate activation request ref, and reused-result linkage.

`Pass/fail oracle:`

* The scenario passes only if safe duplicate activation reuses the prior result rather than duplicating execution.

### Required harness capabilities

* Skill activation harness
* Invocation-store harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Lower-precedence config cannot broaden imported-skill or contributed-candidate-tool exposure beyond higher-level controls
* `Risk level:` High
* `Rationale:` Proves configuration precedence is real. Lower-level overrides may tighten exposure, but they must not broaden imported skill activation or candidate-tool exposure against higher-level controls.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Skills configuration precedence for `allowImportedSkills`, `requireSignedSkills`, and `allowSkillContributedCandidateTools`
* Layer 2: Skills no-broadening rule for published skill permissions and exposure

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one system-level config with `allowImportedSkills = false`, `requireSignedSkills = true`, and `allowSkillContributedCandidateTools = false`, one lower-precedence run override attempting to enable imported unsigned skills and contributed candidate-tool exposure, and one unsigned imported skill `skill.imported.audit@v1` with a `candidate` tool contribution.
* Seeded policy rules: no policy override exists that would permit the higher-risk imported skill or its candidate tool exposure.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: the contributed tool exists canonically but should not surface because the source skill is blocked.
* Expected capability set: neither the imported skill nor its candidate tool should appear in runtime-facing exposure.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the effective config snapshot, descriptor ref, binding ref, and filtered exposure result.

### Given / When / Then

Given higher-precedence configuration disallows imported unsigned skills and candidate-tool exposure from skills,
When a lower-precedence override attempts to broaden exposure for one imported unsigned skill and its candidate tool,
Then `ResolveCandidateSkills` must not expose the skill or the contributed candidate tool, and the higher-precedence configuration that blocked widening must remain replay-visible.

### Required assertions

`Required fixtures:`

* The only route to exposure would be the attempted lower-precedence broadening.

`Required observability artifacts:`

* Effective config snapshot ref showing the winning higher-precedence controls.
* Candidate-resolution records and exclusion reasons for the imported skill and its candidate tool contribution.
* Explicit absence of the imported skill and contributed tool in the runtime-facing exposure result.

`Required replay artifacts:`

* Effective config snapshot ref, descriptor ref, binding ref, and filtered resolution result.

`Pass/fail oracle:`

* The scenario passes only if lower-precedence overrides do not broaden skill or contributed-tool exposure and replay shows why.

### Required harness capabilities

* Skill resolution harness
* Config fixture service with precedence controls
* Skill descriptor and binding fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Approval timeout on a high-risk skill preserves the checkpoint boundary but leaves terminal skill-status semantics underspecified
* `Risk level:` High
* `Rationale:` Proves a high-risk skill cannot activate after approval expiry, while also surfacing a documentation gap in how the Skills System should encode the final timed-out activation result.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Skills approval-timeout failure mode and checkpoint preservation
* Layer 2: Policy and Approval approval expiry semantics

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one high-risk runtime-backed skill `skill.ops.apply.change@v1`, one visible binding, one activation request that reaches approval, and one checkpoint written before `waiting_approval`.
* Seeded policy rules: `skill_activation` returns `require_approval` for the exact request hash; the approval request later expires without a valid resolution.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none because execution must never begin after approval expiry.
* Expected capability set: the skill is visible but blocked at approval.
* Execution-space posture: one compatible execution space could have been used if approval succeeded, but it must never be entered after expiry.
* Approval or replay fixtures: replay must preserve the approval request ref, approval-expiry artifact, checkpoint ref, and the absence of live execution.

### Given / When / Then

Given a high-risk skill activation is paused in `waiting_approval`,
When the approval window expires before a valid resolution is returned,
Then the skill does not activate, the pre-approval checkpoint remains the recovery boundary, and the expired approval remains replay-visible.

### Required assertions

`Required fixtures:`

* The activation request is otherwise valid enough to reach the approval boundary.
* No valid approval resolution exists before expiry.

`Required observability artifacts:`

* Original `require_approval` decision and approval request ref.
* Checkpoint ref written before `waiting_approval`.
* Approval-expiry artifact.
* Explicit absence of runtime-bundle execution, tool invocation, or terminal success artifacts.

`Required replay artifacts:`

* Activation request ref, authorization ref, approval request ref, approval-expiry artifact, and checkpoint ref.

`Pass/fail oracle:`

* The scenario passes only if approval expiry blocks activation and preserves the replay-visible checkpoint boundary.

### Required harness capabilities

* Skill activation harness
* Policy and approval fixture service
* Checkpoint and resume fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The failure-mode section says approval timeout should "return wait expiry and preserve checkpoint", but the skills result-status table does not define one canonical non-success terminal encoding for an expired approval path.
