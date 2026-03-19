# Subagent Profiles and Delegation Contracts E2E Cases

This document proposes ten deterministic E2E scenarios for the Subagent Profiles and Delegation Contracts reference.
It covers both end-to-end user and operator journeys and module smoke scenarios so the same suite can validate default child delegation behavior, approval-gated child creation, bounded child context construction, explicit child capability narrowing, failure handling, depth and fanout controls, configuration-precedence no-widening, route-profile compatibility, and replay-visible parent-child lineage.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator replay driver
* seeded identity, thread, collaborative-scope, configuration, delegation-profile, child tool-profile, and child route-profile fixtures
* recorded parent and child model decisions
* deterministic child-runtime, tool, and sandbox fixtures
* replay-visible policy decisions, delegation requests, child context packs, checkpoints, child results, merge refs, and subagent manifests
* trace collector, run-view materializer, subagent-tree materializer, and replay verifier

## Suite structure

### User-journey scenarios

1. same-scope analysis delegation uses the default child profile and returns a structured child result
2. elevated execution delegation waits for spawn approval, then child tool execution still goes through its own policy path
3. child timeout returns failure metadata and the parent remains the only owner of bounded recovery or failure handling
4. operator replay reconstructs the exact historical delegation profile, child handoff, and join ordering

### Module smoke scenarios

5. `ResolveDelegationDefaults` deterministically fills the automatic child default from config and immutable profile state
6. missing child route profile or child tool refs fail closed before any child run starts
7. child capability resolution rejects automatic inheritance of `platform.head.default`
8. runtime hard-stops nested delegation when `maxDepth` or `maxFanout` would be exceeded
9. lower-precedence run overrides cannot widen child profile choice or limits beyond higher-precedence restrictions
10. a broader child route profile than the parent policy or budget posture is rejected before child creation

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Same-scope analysis delegation uses the default child profile and returns a structured child result
* `Risk level:` High
* `Rationale:` Proves the baseline bounded-delegation journey for the delegation control plane: runtime resolves the automatic child delegation profile, builds a bounded child context pack, narrows child tools and route access, preserves lineage, and keeps the parent as the sole owner of the final response.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Subagent Profiles and Delegation Contracts `delegation.analysis.default@v1`, `SubagentTaskContract`, `DelegationBudget`, `ChildCapabilityEnvelope`, `ChildContextInheritance`, and `MergeContract`
* Layer 2: Agent Runtime `spawn_subagent`, bounded child capability assignment, and parent-owned final response
* Layer 2: Context Assembly `BuildSubagentPack` and exclusion of the full parent scratchpad
* Layer 2: Policy and Approval evaluation of `subagent_spawn`
* Layer 2: Internal Tool Catalog default child tool profile `platform.subagent.analysis@v1`
* Layer 2: Model Routing explicit delegated child route profile `route.subagent.analysis.default@v1`
* Layer 2: Observability `SubagentTree`, join ordering, and linked replay manifests

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_delegate_analysis`, one open thread `thread_delegate_analysis`, one active collaborative scope `scope_delegate_analysis`, one config snapshot with `defaultChildDelegationProfileRef = delegation.analysis.default@v1`, and one immutable delegation profile fixture `delegation.analysis.default@v1`.
* Seeded policy rules: allow one same-scope bounded `subagent_spawn` using `delegation.analysis.default@v1`; deny broader child capability envelopes, cross-scope spawn, and nested delegation beyond the seeded depth limit.
* Seeded memory and retrieval stores: one relevant memory slice, one relevant retrieval evidence pack, and unrelated memory and retrieval blocks that must stay out of the child pack; memory and retrieval remain separately tagged.
* Selected model mode: recorded parent model emits one `spawn_subagent` decision and one later parent synthesis response; recorded child model emits one read-oriented analysis step and one structured child result artifact.
* Selected tool implementations: child candidate tools resolve only from `platform.subagent.analysis@v1`; deterministic `read_file@v1` and `search_text@v1` are available in the child execution path.
* Expected capability set: the parent step may request delegation; the child receives `platform.subagent.analysis@v1` and `route.subagent.analysis.default@v1`, not the full parent tool pack or parent route profile.
* Execution-space posture: one read-only child execution space `es_child_analysis` is attached where file-backed child work occurs; no network or process execution is allowed.
* Approval or replay fixtures: no approval wait is expected in this allow variant; replay must preserve the delegation profile ref, child tool profile ref, child route profile ref, child context pack ref, child result ref, and parent merge ref.

### Given / When / Then

Given a user asks for a decomposable repo-analysis task that the recorded parent model is defined to delegate,
When runtime resolves `delegation.analysis.default@v1`, evaluates policy for the exact `subagent_spawn` request, builds a bounded child context pack in `summary_plus_evidence` mode, creates the child run with explicit budget and delegated child capabilities, waits for the child result artifact, and merges that structured result into parent working state,
Then exactly one child run completes under the default analysis delegation profile, the child never writes directly to the final user channel, and the parent emits the final user-visible response with replay-visible parent-child lineage.

### Required assertions

`Required fixtures:`

* The normalized child request contains explicit `objective`, `successCriteria`, `budget`, `toolProfileRefs`, `routeProfileRef`, `inheritanceMode`, and `mergeContract`.
* The child tool profile is `platform.subagent.analysis@v1` and is not `platform.head.default`.
* The child route profile is `route.subagent.analysis.default@v1`.
* The child context pack excludes the full parent scratchpad and unrelated memory or retrieval blocks.

`Required observability artifacts:`

* Parent reasoning-step record with `spawn_subagent` as the decision class.
* Policy evaluation request, policy snapshot ref, and `allow` decision for `subagent_spawn`.
* One `SubagentRequest` artifact with task contract, capability envelope, budget, context inheritance, and merge contract.
* One child context-pack ref with parent and child lineage metadata.
* Child run creation record, child lifecycle events, child result artifact ref, and parent merge event.
* `RunTimeline`, `ExecutionGraph`, `SubagentTree`, and `RunSummary` views showing child creation and join ordering.

`Required replay artifacts:`

* Parent and child model input and output refs.
* Child context-pack ref plus bounded evidence refs.
* Delegation profile ref, child tool profile ref, child route profile ref, policy decision ref, and child result artifact ref.
* Parent and child checkpoint refs and linked replay manifests preserving child creation and join order.

`Pass/fail oracle:`

* The scenario passes only if the child run is created from a replay-visible bounded delegation contract, the child receives only the delegated child profile and route profile, the child context remains bounded, the parent merges the child result, and only the parent emits the final user-visible output.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Delegation-profile fixture resolver
* Child route-profile and tool-profile fixture service
* Recorded parent and child model adapter mode
* Deterministic child-runtime harness
* Deterministic `read_file@v1` and `search_text@v1` harnesses
* Sandbox harness with read-only child execution space
* Seeded memory and retrieval fixtures
* Trace collector, run-view materializer, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Elevated execution delegation waits for spawn approval, then child tool execution still goes through its own policy path
* `Risk level:` High
* `Rationale:` Proves that approval of child creation is bound to the delegated task contract, child capability envelope, and budget, but does not implicitly authorize later child actions. Child tool execution must still use the normal governed tool path.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Subagent Profiles and Delegation Contracts `delegation.exec.limited@v1`, approval binding to task contract, child capability envelope, and budget, plus explicit child tool and route refs
* Layer 2: Policy and Approval `require_approval` for `subagent_spawn` and later `allow` for the child `tool_execution`
* Layer 2: Agent Runtime checkpoint-before-wait, child creation after approval, and parent merge
* Layer 2: Context Assembly bounded child-context pack for execution work
* Layer 2: Internal Tool Catalog child tool profile `platform.subagent.exec.limited@v1`
* Layer 2: Tool Execution Framework normal child-tool validation and execution
* Layer 2: Observability approval wait, child creation, child tool execution, and join lineage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_delegate_exec`, one open thread `thread_delegate_exec`, one collaborative scope `scope_delegate_exec`, one config snapshot that does not auto-enable `delegation.exec.limited@v1`, and one explicit run request for that immutable delegation profile.
* Seeded policy rules: classify the requested `subagent_spawn` as high risk because the child capability envelope includes `platform.subagent.exec.limited@v1`; return `require_approval` for the spawn request; after spawn approval, allow one exact child `patch_file@v1` request under bounded path conditions.
* Seeded memory and retrieval stores: one relevant evidence pack needed for the child patch task; no unrelated evidence should enter the child pack.
* Selected model mode: recorded parent model emits one `spawn_subagent` decision; recorded child model emits one `patch_file@v1` request and one structured child result.
* Selected tool implementations: child candidate tools resolve from `platform.subagent.exec.limited@v1`; deterministic `patch_file@v1` runs against a bounded writable lab workspace.
* Expected capability set: child creation uses `delegation.exec.limited@v1`; the child step later exposes only the minimal executable tool set for the patch step rather than the full exec-limited profile.
* Execution-space posture: one attached child execution space `es_child_exec` with bounded writable scratch paths, no network access, and no unrestricted host fallback.
* Approval or replay fixtures: one persisted approval request and one later approval resolution bound to the original `subagent_spawn` request hash, task contract, child capability envelope, and budget; replay must also preserve the later child `tool_execution` policy decision separately.

### Given / When / Then

Given a user asks for a bounded code-edit task that the recorded parent model chooses to delegate through `delegation.exec.limited@v1`,
When runtime validates the `subagent_spawn` request, policy returns `require_approval`, runtime checkpoints before `waiting_approval`, approval later resolves against the original task contract and child capability envelope, runtime creates the child run, the child requests `patch_file@v1`, and the child tool request still goes through a normal `tool_execution` policy evaluation before dispatch,
Then the child is created only after spawn approval, the child patch executes only after its own separate policy decision, and the parent merges the child result without any hidden authorization bypass.

### Required assertions

`Required fixtures:`

* The spawn approval is bound to the exact delegated task contract, child capability envelope, and budget.
* The child tool policy decision is recorded separately from the spawn approval.
* The child execution space enforces the approved writable path boundary.

`Required observability artifacts:`

* Parent reasoning-step record with `spawn_subagent`.
* Policy evaluation request, approval request ref, approval resolution ref, and policy snapshot ref for `subagent_spawn`.
* One checkpoint ref before `waiting_approval` and one child-creation record after approval.
* One child `EffectiveToolSet` artifact for the patch step.
* One policy evaluation request and `allow` decision ref for the child `tool_execution`.
* One tool invocation record for `patch_file@v1`, child result artifact ref, and parent join or merge event.
* `RunTimeline`, `ExecutionGraph`, and `SubagentTree` views showing approval wait, child creation, child action, and join order.

`Required replay artifacts:`

* Spawn approval request and resolution refs bound to the original request hash.
* Child context-pack ref, child model input and output refs, child effective-tool-set ref, child tool input and output refs, and child tool policy decision ref.
* Parent and child checkpoint refs and linked replay manifests.

`Pass/fail oracle:`

* The scenario passes only if child creation is blocked until spawn approval resolves, the later child tool request still uses its own policy path, the patch executes exactly once inside the approved execution space, and replay makes both governance boundaries explicit.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Delegation-profile fixture resolver
* Recorded parent and child model adapter mode
* Policy and approval fixture service
* Deterministic child-runtime harness
* Deterministic `patch_file@v1` harness
* Sandbox harness with bounded writable child execution space
* Seeded evidence fixture service
* Trace collector, checkpoint inspector, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Child timeout returns failure metadata and the parent remains the only owner of bounded recovery or failure handling
* `Risk level:` Medium
* `Rationale:` Proves the failure side of bounded delegation: a child timeout must not become an unbounded background task, and the parent must receive structured child failure metadata rather than losing the branch.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Subagent Profiles and Delegation Contracts explicit timeout, failure metadata, `SubagentResult`, and parent responsibility for replanning or failure
* Layer 2: Agent Runtime child lifecycle handling, failure propagation, and parent-owned control after child failure
* Layer 2: Observability child timeout, child failure, and parent follow-on branch visibility

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_delegate_timeout`, one open thread `thread_delegate_timeout`, one collaborative scope `scope_delegate_timeout`, one config snapshot enabling `delegation.analysis.default@v1`, and a normalized child budget with a short `timeoutMs`.
* Seeded policy rules: allow the bounded spawn request; no additional approval wait is required for creation.
* Seeded memory and retrieval stores: one relevant evidence pack for the delegated task; unrelated evidence exists and remains excluded from the child pack.
* Selected model mode: recorded parent model emits one `spawn_subagent`; child runtime fixture times out before producing a successful result; parent follow-on behavior is constrained to the documented branch that consumes failure metadata rather than hiding it.
* Selected tool implementations: none are required to succeed because the child branch ends in timeout.
* Expected capability set: the child capability envelope is explicit and bounded even though the child ultimately times out.
* Execution-space posture: any child execution space remains bounded and is released after timeout; no background child work continues after the timeout boundary.
* Approval or replay fixtures: replay must preserve the child timeout boundary, the failure-bearing `SubagentResult`, and the parent branch that receives the failure metadata.

### Given / When / Then

Given a parent run delegates a bounded analysis task with an explicit child timeout,
When the child run starts but exceeds the delegated timeout before producing a successful result and runtime returns a `SubagentResult` carrying failure metadata to the parent,
Then the child branch terminates as a bounded failure, no orphan background child work continues, and the parent remains the only authority for any recovery, replanning, or terminal failure outcome.

### Required assertions

`Required fixtures:`

* The child timeout is explicit in the delegated budget.
* The child branch actually starts so the scenario exercises post-start failure rather than spawn rejection.
* The child does not continue running after timeout.

`Required observability artifacts:`

* Parent `spawn_subagent` step record and child run creation record.
* Child lifecycle events showing start and timeout or failure transition.
* One `SubagentResult` artifact with `status`, `failureInfo`, `provenanceRefs`, and `unresolvedIssues`.
* Parent-side record showing receipt of the failure-bearing child result.
* `RunTimeline`, `ExecutionGraph`, and `SubagentTree` views showing timeout before join completion.

`Required replay artifacts:`

* Child run refs, timeout-bearing budget ref, child lifecycle refs, and the failure-bearing `SubagentResult`.
* Parent replay manifest linked to the child manifest or child refs in the order the failure was observed.

`Pass/fail oracle:`

* The scenario passes only if child failure after start produces an explicit `SubagentResult` with failure metadata, the child does not become an unbounded background task, and the parent retains exclusive control over whatever recovery or failure handling happens next.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Delegation-profile fixture resolver
* Deterministic child-runtime harness with timeout injection
* Trace collector, run-view materializer, subagent-tree materializer, and replay verifier
* Seeded evidence fixture service

### Open questions / contract gaps

* `contract gap:` the docs define that the parent receives a failure-bearing `SubagentResult` and remains responsible for replanning or failure, but they do not define one canonical parent-facing response contract after child timeout, so this scenario asserts bounded child termination and failure propagation rather than one mandatory user-visible phrasing.

## Scenario 4

### Scenario summary

* `Title:` Operator replay reconstructs the exact historical delegation profile, child handoff, and join ordering
* `Risk level:` Medium
* `Rationale:` Proves delegation is a first-class replay boundary. Historical replay must rebuild child creation from stored delegation refs rather than current live profile state.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Subagent Profiles and Delegation Contracts replay-visible `delegationProfileId`, `delegationProfileVersion`, task contract, child tool profile refs, child route profile ref, budget, context inheritance, merge contract, and child result refs
* Layer 2: Observability replay manifest linkage, `SubagentTree`, and join-order preservation
* Layer 2: Context Assembly stored child context-pack replay refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one completed historical parent run `run_delegate_replay_parent`, one historical child run `run_delegate_replay_child`, one stored config snapshot, and one stored delegation profile ref `delegation.analysis.default@v1`.
* Seeded policy rules: not material beyond the stored decision refs already captured in the historical run.
* Seeded memory and retrieval stores: no live retrieval is needed; replay uses stored child context-pack refs and stored evidence refs.
* Selected model mode: replay mode only; no live model execution is required.
* Selected tool implementations: none are executed during replay.
* Expected capability set: replay reconstructs the same child tool profile ref, child route profile ref, and merge contract that the historical run used.
* Execution-space posture: if the historical child run had an `executionSpaceId`, replay preserves it from stored artifacts rather than allocating a new live space.
* Approval or replay fixtures: the replay manifest contains parent and child manifests, child handoff refs, child result ref, and join-order refs; the live control plane may now have newer delegation profile versions.

### Given / When / Then

Given an operator selects a historical run whose child creation used `delegation.analysis.default@v1`,
When replay loads the stored manifests and reconstructs the parent-child delegation boundary from stored refs rather than current live delegation profile state,
Then the replayed branch shows the exact historical delegation profile version, child tool profile refs, child route profile ref, child context pack, child result artifact, and join order used by the original run.

### Required assertions

`Required fixtures:`

* The historical replay data includes stored child manifests or linked child refs.
* The live control plane contains a newer delegation profile version or changed defaults so the test proves pinning rather than accidental equality.
* Replay reads stored artifacts rather than launching a live child run.

`Required observability artifacts:`

* Historical parent and child replay-manifest refs.
* `SubagentTree`, `ExecutionGraph`, and `RunTimeline` views reconstructed from stored refs.
* Replay-mode record showing stored-artifact reconstruction.

`Required replay artifacts:`

* `delegationProfileId`, `delegationProfileVersion`, task contract, child tool profile refs, child route profile ref, budget, context inheritance, merge contract, and child result ref.
* Parent and child manifest linkage preserving creation and join order.

`Pass/fail oracle:`

* The scenario passes only if replay reconstructs the delegation boundary from stored historical refs, refuses to substitute a newer live delegation profile version, and preserves child creation plus join ordering.

### Required harness capabilities

* Operator replay driver
* Historical parent and child manifest fixture service
* Delegation-profile snapshot fixture service
* Trace collector, run-view materializer, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` `ResolveDelegationDefaults` deterministically fills the automatic child default from config and immutable profile state
* `Risk level:` Low
* `Rationale:` Proves the delegation control plane can resolve a partially specified child request into a normalized bounded request using the configured default child delegation profile without depending on ad hoc runtime behavior.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Subagent Profiles and Delegation Contracts `ResolveDelegationDefaults`, immutable `DelegationProfile`, and deterministic default resolution
* Layer 2: Internal Tool Catalog child default tool profile `platform.subagent.analysis@v1`
* Layer 2: Model Routing child default route profile `route.subagent.analysis.default@v1`

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one partial child request for `user_delegate_defaults` on `thread_delegate_defaults`, one config snapshot with `defaultChildDelegationProfileRef = delegation.analysis.default@v1`, and one immutable profile fixture `delegation.analysis.default@v1`.
* Seeded policy rules: not applied yet because the scenario stops at default resolution before live spawn.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: not material because no child run starts.
* Expected capability set: normalization fills `toolProfileRefs = [platform.subagent.analysis@v1]`, `routeProfileRef = route.subagent.analysis.default@v1`, default budget, `summary_plus_evidence`, and `structured_result_required`.
* Execution-space posture: not material.
* Approval or replay fixtures: default-resolution artifacts must preserve the effective config snapshot and immutable profile refs.

### Given / When / Then

Given runtime holds a partial `SubagentRequest` with explicit task contract but no explicit delegation profile details beyond the current config context,
When `ResolveDelegationDefaults` applies the configured default child delegation profile against the immutable profile store,
Then it returns one normalized bounded child request with explicit child tool profile refs, child route profile ref, budget, inheritance mode, and merge contract derived from `delegation.analysis.default@v1`.

### Required assertions

`Required fixtures:`

* The default-child-delegation config is pinned to `delegation.analysis.default@v1`.
* The immutable profile definition contains `platform.subagent.analysis@v1`, `route.subagent.analysis.default@v1`, `summary_plus_evidence`, and `structured_result_required`.

`Required observability artifacts:`

* One default-resolution artifact or normalized request record carrying the applied delegation profile ref and effective config snapshot ref.

`Required replay artifacts:`

* Effective config snapshot ref, `delegationProfileId`, `delegationProfileVersion`, normalized child tool profile refs, child route profile ref, budget, context inheritance, and merge contract.

`Pass/fail oracle:`

* The scenario passes only if default resolution is deterministic for a fixed config snapshot and immutable profile version and produces a fully bounded normalized child request.

### Required harness capabilities

* Delegation-profile fixture resolver
* Configuration fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Missing child route profile or child tool refs fail closed before any child run starts
* `Risk level:` High
* `Rationale:` Proves the delegation contract rejects underspecified child requests. A child run must not start without the explicit capability and routing contract defined by the Layer 2 reference.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Subagent Profiles and Delegation Contracts creation preconditions and fail-closed validation
* Layer 2: Agent Runtime rejection of invalid `spawn_subagent` requests before child creation
* Layer 2: Observability denial or rejection evidence without child lifecycle artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run for `user_delegate_invalid` on `thread_delegate_invalid`, one malformed `SubagentRequest` variant missing `childRouteProfileRef`, and one malformed variant missing both `toolProfileRefs` and `explicitToolRefs`.
* Seeded policy rules: not reached if validation fires first.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded parent model emits one invalid `spawn_subagent` request per test variant.
* Selected tool implementations: none, because no child run may start.
* Expected capability set: the invalid child request has no executable child capability envelope.
* Execution-space posture: none, because child creation must stop before any child execution-space work.
* Approval or replay fixtures: validation failure artifacts must be replay-visible and must show no child refs.

### Given / When / Then

Given a parent reasoning step emits a `spawn_subagent` request missing a required child route profile or required child tool refs,
When runtime validates the request against the delegation creation preconditions before child creation,
Then it fails closed, creates no child run, builds no child context pack, and records the rejection as a parent-side governance or validation failure only.

### Required assertions

`Required fixtures:`

* The invalid request variants each omit one mandatory field set defined by the delegation contract.
* The parent run is otherwise healthy so rejection cannot be attributed to unrelated runtime failure.

`Required observability artifacts:`

* Parent reasoning-step record with `spawn_subagent`.
* Validation failure or rejection artifact tied to the malformed request.
* Explicit absence of child run creation, child context-pack refs, child lifecycle events, and child result refs.

`Required replay artifacts:`

* Parent model request and response refs for the malformed delegation step.
* Rejection artifact or failure ref showing which required contract element was missing.
* Replay manifest fragment showing no child refs were created for the rejected branch.

`Pass/fail oracle:`

* The scenario passes only if malformed child requests fail before child creation, produce replay-visible rejection evidence, and never create partial hidden child state.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded parent model adapter mode
* Delegation validation harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Child capability resolution rejects automatic inheritance of `platform.head.default`
* `Risk level:` High
* `Rationale:` Proves the most important capability-seam rule in the delegation stack: children do not inherit the full Head Agent default tool pack automatically.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Subagent Profiles and Delegation Contracts explicit child capability delegation and no wholesale inheritance
* Layer 2: Internal Tool Catalog prohibition on automatic `platform.head.default` inheritance and default child profile `platform.subagent.analysis@v1`
* Layer 2: Agent Runtime child capability narrowing

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run for `user_delegate_no_head_pack` on `thread_delegate_no_head_pack`, one broader parent tool surface sourced from `platform.head.default@v1`, and one child delegation request resolved through `delegation.analysis.default@v1`.
* Seeded policy rules: allow same-scope analysis delegation only.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none beyond the capability-resolution path.
* Selected tool implementations: child capability-resolution fixtures can resolve `platform.subagent.analysis@v1`; the broader parent pack includes tools absent from the child profile such as `patch_file@v1`, `shell_exec@v1`, and `fetch_url@v1`.
* Expected capability set: the child receives only the explicit child tool profile or subset; no automatic inheritance from `platform.head.default@v1` occurs.
* Execution-space posture: any child execution space remains compatible only with the explicit child capability set.
* Approval or replay fixtures: child capability-resolution artifacts must preserve applied child profile refs and filtered-reason evidence.

### Given / When / Then

Given a parent run currently has a broader tool surface than the delegated child needs,
When runtime resolves child capabilities for a bounded analysis child,
Then the child capability set contains only the explicit delegated child tool profile or subset and excludes parent-only tools that would have arrived only through `platform.head.default@v1`.

### Required assertions

`Required fixtures:`

* The parent tool surface contains tools outside the child contract.
* The child delegation profile resolves to `platform.subagent.analysis@v1`.

`Required observability artifacts:`

* Child capability-resolution artifact carrying explicit child tool profile refs and the final effective child tool set.
* Filtered-reason evidence showing the child did not inherit parent-only tools.

`Required replay artifacts:`

* Parent tool-set ref, child tool profile refs, effective child tool-set ref, and filtered-reason refs.

`Pass/fail oracle:`

* The scenario passes only if the child tool set is explicit and narrow and no capability appears solely because the parent had `platform.head.default@v1`.

### Required harness capabilities

* Delegation-profile fixture resolver
* Child capability-resolution harness
* Internal tool-profile fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Runtime hard-stops nested delegation when `maxDepth` or `maxFanout` would be exceeded
* `Risk level:` High
* `Rationale:` Proves delegation remains bounded under pressure. Depth and fanout limits must hard-stop further child creation rather than letting delegation expand silently.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Subagent Profiles and Delegation Contracts explicit `maxDepth` and `maxFanout` limits plus hard-stop rule
* Layer 2: Agent Runtime `maxSubagentDepth` and `maxSubagentFanout` enforcement
* Layer 2: Observability blocked nested-delegation evidence without hidden child creation

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run `run_delegate_limits_parent`, one active child run lineage already at the configured maximum depth or one parent step already at the configured maximum fanout, and runtime config `maxSubagentDepth` or `maxSubagentFanout` set to the seeded limit.
* Seeded policy rules: allow ordinary bounded delegation within limits so the stop condition is caused by runtime bounds, not policy deny.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model emits one additional `spawn_subagent` decision beyond the configured limit.
* Selected tool implementations: no new child tools run because the extra child must never start.
* Expected capability set: the existing delegated children remain valid, but the extra requested child is rejected before start.
* Execution-space posture: no new child execution space may be allocated for the blocked nested spawn.
* Approval or replay fixtures: limit-enforcement artifacts must preserve the relevant config snapshot or runtime config refs and show no new child refs.

### Given / When / Then

Given a parent or child run has already reached the configured delegation depth or fanout limit,
When a later reasoning step emits another `spawn_subagent` decision,
Then runtime hard-stops the additional delegation, creates no further child run, allocates no further child context pack or execution space, and records the blocked nested delegation as a bounded parent-side event.

### Required assertions

`Required fixtures:`

* The limit is explicit in config and already reached before the blocked spawn attempt.
* The parent or child branch remains otherwise healthy.

`Required observability artifacts:`

* The attempted `spawn_subagent` step record.
* Limit-enforcement or rejection artifact tied to `maxDepth` or `maxFanout`.
* Explicit absence of a new child run, new child context-pack ref, and new child lifecycle records for the blocked attempt.

`Required replay artifacts:`

* Runtime config refs for `maxSubagentDepth` or `maxSubagentFanout`.
* Attempted delegation step ref and blocked-delegation artifact.
* Replay fragment showing no new child refs after the blocked attempt.

`Pass/fail oracle:`

* The scenario passes only if the system hard-stops further delegation exactly at the configured bound and does not create hidden child work beyond the depth or fanout limit.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with nested delegation attempt
* Runtime limit fixture service
* Trace collector, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Lower-precedence run overrides cannot widen child profile choice or limits beyond higher-precedence restrictions
* `Risk level:` Medium
* `Rationale:` Proves the delegation control plane obeys configuration precedence and no-widening rules for profile selection and limits.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Subagent Profiles and Delegation Contracts config precedence, `disabledDelegationProfiles`, `maxDelegationDepth`, `maxDelegationFanout`, and no-widening rules
* Layer 2: Agent Runtime delegated-limit enforcement under effective config

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run for `user_delegate_precedence` on `thread_delegate_precedence`, one collaborative-scope config `disabledDelegationProfiles = [delegation.exec.limited]`, one system or agent config with conservative `maxDelegationDepth`, and one run-level override attempting to request `delegation.exec.limited@v1` and a deeper delegation depth.
* Seeded policy rules: not material because the scenario proves config precedence before live child creation.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none beyond resolution and validation.
* Selected tool implementations: none, because blocked widening prevents child creation.
* Expected capability set: the effective config snapshot excludes `delegation.exec.limited@v1` and preserves the tighter depth limit despite the run-level request.
* Execution-space posture: no child execution space is allocated because widening is blocked before child start.
* Approval or replay fixtures: config snapshot refs and blocked-widening artifacts must be replay-visible.

### Given / When / Then

Given a higher-precedence config disables `delegation.exec.limited` and preserves tighter delegation limits,
When a run-level override attempts to request that disabled profile and a broader depth budget,
Then the higher-precedence restrictions win, the run-level override does not widen delegation profile choice or limits, and no child run may start from the widened request.

### Required assertions

`Required fixtures:`

* The higher-precedence config snapshot clearly contains the disabled profile and tighter delegation limit.
* The run-level override explicitly requests the forbidden widening so the test proves precedence rather than omission.

`Required observability artifacts:`

* Effective config snapshot ref showing both the higher-precedence restriction and the lower-precedence attempted override.
* Blocked-delegation-resolution or validation artifact showing the no-widening outcome.

`Required replay artifacts:`

* Effective config snapshot ref, requested override refs, and blocked-widening artifact.

`Pass/fail oracle:`

* The scenario passes only if lower-precedence run overrides fail to widen delegation profile choice or limits beyond the higher-precedence restrictions and the blocked outcome is replay-visible.

### Required harness capabilities

* Configuration fixture service with precedence controls
* Delegation-profile fixture resolver
* Validation harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` A broader child route profile than the parent policy or budget posture is rejected before child creation
* `Risk level:` High
* `Rationale:` Proves child model access is explicitly delegated and cannot be silently broader than the parent-allowed posture. This is the routing-side equivalent of explicit child tool narrowing.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Subagent Profiles and Delegation Contracts rule that child route profiles may be narrower but must not be silently broader
* Layer 2: Model Routing explicit child route-profile requirement and prohibition on automatic parent-profile inheritance
* Layer 2: Agent Runtime pre-creation validation of child route compatibility

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run for `user_delegate_route_guard` on `thread_delegate_route_guard`, one parent route posture that allows only the analysis child route, and one attempted child request asking for `route.subagent.research.fetch@v1` or another broader route posture than the parent policy and budget allow.
* Seeded policy rules: deny or block broader child model-access posture in this scope; only analysis-child routing is permitted.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none beyond child-request validation.
* Selected tool implementations: none, because child creation must fail before a child model step exists.
* Expected capability set: the requested broader child route profile is incompatible with parent policy or budget posture and therefore cannot be normalized into a valid child capability envelope.
* Execution-space posture: no child execution-space allocation occurs because child creation is rejected before start.
* Approval or replay fixtures: route-compatibility failure or policy-deny artifacts must be replay-visible and must show no child refs.

### Given / When / Then

Given a parent run with an analysis-only delegated posture attempts to create a child using a broader route profile than its policy or budget posture allows,
When runtime validates the child capability envelope and child route compatibility before child creation,
Then the broader child route profile is rejected before any child run starts and the blocked branch remains visible as a parent-side governance or validation event only.

### Required assertions

`Required fixtures:`

* The requested child route profile is broader than the permitted delegated posture.
* The parent run itself remains otherwise healthy.

`Required observability artifacts:`

* Parent `spawn_subagent` step record or normalized child request record.
* Route-compatibility rejection or policy-deny artifact tied to the requested child route profile.
* Explicit absence of child creation, child context-pack refs, and child lifecycle events.

`Required replay artifacts:`

* Requested child route profile ref, parent delegated posture refs, and rejection artifact.
* Replay fragment showing no child refs for the rejected branch.

`Pass/fail oracle:`

* The scenario passes only if broader child route access is blocked before child creation and never sneaks in through silent inheritance from the parent route posture.

### Required harness capabilities

* Delegation validation harness
* Child route-profile fixture service
* Policy fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None
