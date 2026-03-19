# Internal Tool Catalog and Default Tool Profiles E2E Cases

This document proposes nine deterministic E2E scenarios for the Internal Tool Catalog and Default Tool Profiles reference.
It covers both end-to-end user journeys and module smoke scenarios so the same suite can validate head-agent default bootstrap, child-default safety, explicit opt-in bundle attachment, replay-visible catalog pinning, deterministic candidate expansion, overlap deduplication, fail-closed execution-space filtering, configuration-precedence narrowing, and lifecycle-state replay behavior.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator replay driver
* seeded identity, thread, collaborative-scope, configuration, catalog, profile, and lifecycle snapshot fixtures
* recorded model decisions and deterministic tool harnesses where tool execution is part of the journey
* sandbox fixtures with read-only and network-gated execution spaces
* replay-visible tool-resolution results, effective-tool-set refs, policy or approval artifacts, and catalog-membership evidence
* trace collector, run-view materializer, and replay verifier

## Suite structure

### User-journey scenarios

1. broad head-agent default profile narrows to one read-only executable tool for a repo question
2. delegated analysis child receives the conservative child default instead of the broad head-agent pack
3. a read-oriented head agent explicitly opts into the research-fetch bundle before a high-risk network retrieval
4. operator replay reconstructs the exact historical catalog and profile snapshot rather than current live defaults

### Module smoke scenarios

5. head-agent bootstrap expands `platform.head.default@v1` into the full fifteen-tool candidate set
6. overlapping profile requests deduplicate exact `toolId` and `version` pairs while preserving profile provenance
7. missing execution space filters out execution-space-bound built-ins and never falls back to host execution
8. lower-precedence run overrides cannot widen access beyond a higher-precedence disabled internal profile
9. `disabled_new_use` and `replay_only` lifecycle states block fresh resolution but preserve historical replay references

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Broad head-agent default narrows to one read-only executable tool for a repo question
* `Risk level:` Medium
* `Rationale:` Proves the catalog's broad Head Agent default profile is only a candidate source. Runtime must narrow that pool to the smallest sufficient executable tool for the step, and the narrowed exposure must stay replay-visible.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Internal Tool Catalog `platform.head.default@v1` as a candidate-only head default and `search_text@v1` catalog metadata
* Layer 2: Tool Execution Framework candidate resolution, applied-profile capture, and execution-space feasibility filtering
* Layer 2: Agent Runtime `ToolResolutionResult -> EffectiveToolSet` narrowing to the minimal task-relevant executable subset
* Layer 2: Policy and Approval allow decision before `tool_execution`
* Layer 2: Sandbox / Execution Space read-only file-broker enforcement
* Layer 2: Observability capture of candidate tools, filtered tools, exposure reason codes, checkpoints, and tool execution evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_catalog_head_read`, one open thread `thread_catalog_head_read`, one active collaborative scope `scope_catalog_repo`, one pinned catalog snapshot `catalog_internal_v1`, and effective config setting `defaultHeadProfileRef = platform.head.default@v1`.
* Seeded policy rules: allow `search_text@v1` for exact requests inside `/workspace/repo`; deny all file mutation, process, and network tool execution in this scope.
* Seeded memory and retrieval stores: both stores exist and remain empty so the scenario isolates catalog and exposure behavior rather than memory or RAG.
* Selected model mode: recorded model adapter mode that emits one `search_text@v1` request followed by one final response.
* Selected tool implementations: deterministic `search_text@v1` executed against a fixed lab repository snapshot.
* Expected capability set: `ToolResolutionResult.candidateTools` comes from `platform.head.default@v1`, but the step-level `EffectiveToolSet` contains only `search_text@v1`.
* Execution-space posture: one attached execution space `es_repo_readonly` with `fileMode = read_only`, `networkMode = off`, `allowProcessExec = false`, and allowed paths limited to `/workspace/repo`.
* Approval or replay fixtures: no approval artifact is expected; replay capture must preserve `catalogSnapshotId`, `profileId`, `profileVersion`, tool origin, filtered reason codes, checkpoints, and tool result refs.

### Given / When / Then

Given an inbound chat message asks where the repository mentions `ToolResolutionResult`, a verified user is already linked to `thread_catalog_head_read`, and head-agent defaults are enabled through `platform.head.default@v1`,
When Tool Execution Framework resolves candidate tools from `catalog_internal_v1`, Agent Runtime narrows the broad head-default pool to the smallest sufficient executable set for the step, the model requests `search_text@v1`, policy evaluates that exact request as `allow`, and runtime checkpoints before dispatch,
Then only `search_text@v1` is exposed and executed, all other head-default built-ins remain replay-visible as filtered or unused candidate sources, and the run completes with a final answer built from the deterministic search result.

### Required assertions

`Required fixtures:`

* `catalog_internal_v1` contains the initial fifteen built-in tools and `platform.head.default@v1`.
* The execution space attached to the run is compatible with read-only file search and incompatible with file mutation, process execution, and network retrieval.
* The recorded model emits only `search_text@v1`, not any other head-default tool.

`Required observability artifacts:`

* One `ToolResolutionResult` carrying `candidateTools`, `appliedProfiles = [platform.head.default@v1]`, and source refs tied to `catalog_internal_v1`.
* One `EffectiveToolSet` carrying `effectiveTools = [search_text@v1]`, `filteredTools`, and `decisionReasons` for the broader head-default pool.
* One capability exposure record showing that only `search_text@v1` reached model-visible reasoning.
* One policy evaluation request, decision ref, and policy snapshot ref for the exact tool request.
* One pre-action checkpoint ref created before tool execution.
* One tool invocation record with argument ref, normalized result ref, and execution-space lineage.
* Sandbox events showing only read-only file-broker access under `es_repo_readonly`.

`Required replay artifacts:`

* `catalogSnapshotId`, `profileId = platform.head.default`, and `profileVersion = v1`.
* Tool origin metadata showing the exposed tool came from `platform.head.default`.
* Replay-visible filtered-tool reason codes for the head-default tools that were not exposed.
* Model input and output refs, tool input and output refs, policy decision ref, checkpoint refs, and final output ref.

`Pass/fail oracle:`

* The scenario passes only if the broad head-default profile is visible as the candidate source, the step-level exposed set is narrowed to `search_text@v1`, policy is recorded before execution, and no other head-default tool is exposed or dispatched.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Internal-catalog snapshot fixture
* Recorded model adapter mode with fixed tool-call sequence
* Policy fixture service
* Deterministic `search_text@v1` harness
* Sandbox harness with read-only file broker
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Delegated analysis child receives the conservative child default instead of the broad head-agent pack
* `Risk level:` Medium
* `Rationale:` Proves subagents do not automatically inherit `platform.head.default`. Child runs must receive an explicit delegated child profile, and the automatic child default must stay conservative.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Internal Tool Catalog `platform.subagent.analysis@v1` as the default child profile and prohibition on automatic `platform.head.default` inheritance
* Layer 2: Subagent Profiles and Delegation Contracts `delegation.analysis.default@v1` and bounded child capability delegation
* Layer 2: Tool Execution Framework candidate resolution for child tool profiles
* Layer 2: Agent Runtime child-run creation, child `EffectiveToolSet`, and parent-owned final response
* Layer 2: Observability subagent lineage, child capability exposure, and merge evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_catalog_child`, one open thread `thread_catalog_child`, one collaborative scope `scope_catalog_child`, one pinned catalog snapshot `catalog_internal_v1`, and default child profile config `defaultChildProfileRef = platform.subagent.analysis@v1`.
* Seeded policy rules: allow same-scope analysis delegation through `delegation.analysis.default@v1`; deny child file mutation, shell execution, and network retrieval in this scope.
* Seeded memory and retrieval stores: parent and child both have empty memory and retrieval stores so the child result depends only on delegated context and read-oriented tools.
* Selected model mode: recorded parent model emits one `spawn_subagent`; recorded child model emits read-only tool use and a structured result artifact.
* Selected tool implementations: deterministic `read_file@v1` and `search_text@v1` against a fixed workspace snapshot.
* Expected capability set: child candidate resolution uses `platform.subagent.analysis@v1`; child step exposure contains only the read-oriented tools needed for the delegated analysis step.
* Execution-space posture: one attached child execution space `es_child_readonly` with read-only file access and no network or process execution.
* Approval or replay fixtures: no approval is expected; replay capture must preserve the delegation profile ref, child tool profile ref, child route profile ref, child effective-tool-set ref, and merge artifact refs.

### Given / When / Then

Given a user asks for a comparison of two design docs and the parent runtime chooses bounded analysis delegation,
When Agent Runtime resolves `delegation.analysis.default@v1`, creates a child run with explicit task bounds, applies the default child tool profile `platform.subagent.analysis@v1`, and the child performs the delegated analysis using only read-oriented tools,
Then the child run completes with a structured result artifact, the parent remains the source of truth for the final user response, and no child candidate or exposed capability comes from `platform.head.default`.

### Required assertions

`Required fixtures:`

* The delegated child request resolves through `delegation.analysis.default@v1`.
* The child tool profile ref is `platform.subagent.analysis@v1`.
* The child execution space is read-only and bound to the child run lineage.

`Required observability artifacts:`

* One `SubagentRequest` carrying explicit task bounds, budget, and `toolProfileRefs = [platform.subagent.analysis@v1]`.
* Parent and child lineage records tied by `parentRunId`, `parentStepId`, and `childRunId`.
* Child `ToolResolutionResult` and child `EffectiveToolSet` showing conservative read-oriented capability exposure.
* Child tool invocation records for only read-oriented tools.
* Parent join and merge records proving the parent authored the final response.

`Required replay artifacts:`

* Delegation profile ref, child tool profile ref, child route profile ref, and child context handoff refs.
* Child model input and output refs, tool input and output refs, and final child result artifact ref.
* Child and parent replay manifests with preserved lineage ordering.

`Pass/fail oracle:`

* The scenario passes only if the child uses `platform.subagent.analysis@v1`, no child candidate or exposed tool comes from `platform.head.default`, no file mutation, shell, or network capability appears in the child path, and the parent still owns the final user-visible answer.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Delegation-profile fixture service
* Internal-catalog snapshot fixture
* Recorded parent and child model adapter mode
* Deterministic `read_file@v1` and `search_text@v1` harnesses
* Sandbox harness with read-only child execution space
* Trace collector, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Read-oriented head agent explicitly opts into `platform.research.fetch@v1` before a high-risk network retrieval
* `Risk level:` High
* `Rationale:` Proves opt-in profiles are explicit control-plane attachments, not hidden defaults. It also proves risky network tools stay visibly high-risk and approval-gated even when they enter the candidate set through an explicit opt-in bundle.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Internal Tool Catalog `platform.head.readonly@v1`, `platform.research.fetch@v1`, and `fetch_url@v1` risk and profile membership metadata
* Layer 2: Tool Execution Framework profile merge, candidate resolution, and execution-space validation
* Layer 2: Agent Runtime minimal effective-tool exposure after candidate resolution
* Layer 2: Policy and Approval `require_approval` before high-risk network execution
* Layer 2: Sandbox / Execution Space network-gated execution
* Layer 2: Observability applied profile refs, approval wait, network execution, and degraded replay posture for non-deterministic retrieval

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_catalog_fetch`, one open thread `thread_catalog_fetch`, one collaborative scope `scope_catalog_fetch`, one pinned catalog snapshot `catalog_internal_v1`, and agent config `defaultHeadProfileRef = platform.head.readonly@v1`.
* Seeded policy rules: high-risk `fetch_url@v1` requires approval in this scope, and approved URLs must stay under `https://docs.example.test/*`.
* Seeded memory and retrieval stores: both stores exist and remain empty so the response depends on the explicitly fetched source rather than prior memory or RAG.
* Selected model mode: recorded model emits one `fetch_url@v1` request followed by one final response after approval and fetch completion.
* Selected tool implementations: sandbox-backed `fetch_url@v1` with deterministic fixture responses for the approved domain.
* Expected capability set: candidate resolution merges `platform.head.readonly@v1` with the explicitly requested `platform.research.fetch@v1`, but the step-level `EffectiveToolSet` narrows to `fetch_url@v1`.
* Execution-space posture: one attached execution space `es_fetch_net` with approved-network mode limited to `https://docs.example.test/*`, no process execution, and no arbitrary filesystem write access.
* Approval or replay fixtures: one approval request artifact, one later approval resolution bound to the original request hash, and replay metadata that declares non-deterministic or network-bound execution posture explicitly.

### Given / When / Then

Given a user asks the agent to fetch one vendor documentation page, the agent normally boots with the conservative `platform.head.readonly@v1` profile, and the run explicitly requests `platform.research.fetch@v1`,
When Tool Execution Framework merges the explicit opt-in profile into candidate resolution, Agent Runtime narrows the step exposure to `fetch_url@v1`, policy returns `require_approval`, runtime checkpoints before `waiting_approval`, approval is later granted, and the tool executes inside the network-gated execution space,
Then the fetch completes exactly once after approval, the final answer cites the fetched content, and the run shows that the high-risk network tool entered through an explicit opt-in profile rather than an undocumented default.

### Required assertions

`Required fixtures:`

* Without the explicit run-level opt-in, the head-agent default profile is `platform.head.readonly@v1` and does not include `fetch_url@v1`.
* The approval resolution is bound to the original request hash and approved URL conditions.
* The execution space network policy allows only the seeded vendor-doc domain.

`Required observability artifacts:`

* One `ToolResolutionResult` carrying `appliedProfiles = [platform.head.readonly@v1, platform.research.fetch@v1]`.
* One `EffectiveToolSet` showing that the step exposed `fetch_url@v1` and filtered out unused opt-in tools such as `download_artifact@v1`.
* One policy evaluation request, approval request ref, approval resolution ref, and immutable policy snapshot ref.
* One pre-wait checkpoint ref and one pre-action checkpoint ref after resume.
* One network-tool invocation record with request ref, result ref, and execution-space lineage.
* Sandbox network events showing egress only to the approved domain.

`Required replay artifacts:`

* `catalogSnapshotId`, applied profile refs, and tool origin metadata showing `fetch_url@v1` came from `platform.research.fetch@v1`.
* Approval request and resolution refs, checkpoint refs, and tool input or output refs.
* Replay metadata declaring simulate, skip, or degraded posture for the network-bound execution step as required by replay policy.

`Pass/fail oracle:`

* The scenario passes only if `fetch_url@v1` becomes eligible solely because the explicit opt-in profile was attached, approval is recorded before execution, the network call stays inside the approved execution-space boundary, and replay preserves the opt-in profile lineage plus non-deterministic posture.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Internal-catalog snapshot fixture
* Recorded model adapter mode with approval-carrying tool-call sequence
* Policy and approval fixture service
* Sandbox harness with domain-gated network broker
* Deterministic `fetch_url@v1` harness
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Operator replay reconstructs the exact historical catalog and profile snapshot rather than current live defaults
* `Risk level:` Medium
* `Rationale:` Proves historical replay depends on stored catalog and profile snapshots, not whatever the live control plane contains later. This is the main replay guarantee specific to catalog and profile evolution.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Internal Tool Catalog replay-visible `catalogSnapshotId`, `profileId`, `profileVersion`, tool origin, and filtered-reason preservation
* Layer 2: Tool Execution Framework deterministic candidate resolution for a fixed snapshot
* Layer 2: Observability replay manifest preference for stored artifacts over live recompute

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one completed historical run `run_catalog_replay` for `user_catalog_replay` on `thread_catalog_replay`, plus the stored configuration snapshot used when that run originally resolved tools.
* Seeded policy rules: not material beyond the fact that the historical run already contains replay-visible policy refs where needed.
* Seeded memory and retrieval stores: not material.
* Selected model mode: replay mode only; no live model execution is needed for the scenario.
* Selected tool implementations: none are executed during replay; replay reads stored resolution and step artifacts.
* Expected capability set: replay reconstructs the same candidate-tool and effective-tool artifacts that were stored for the historical run.
* Execution-space posture: if the historical run carried an `executionSpaceId`, replay preserves that lineage from stored artifacts rather than allocating a new space.
* Approval or replay fixtures: historical replay manifest contains `catalogSnapshotId`, `profileId`, `profileVersion`, `toolId`, `toolVersion`, tool-origin metadata, and filtered reason codes; the live catalog may now contain newer profile versions.

### Given / When / Then

Given an operator selects a historical run whose stored replay artifacts reference `platform.head.default@v1` and a fixed catalog snapshot,
When replay loads the stored manifest and reconstructs candidate-tool resolution and effective-tool exposure from the historical snapshot rather than current live defaults,
Then the replayed step shows the exact historical profile version, tool versions, tool origins, and filtered reason codes used by the original run, with no silent substitution of newer catalog or profile state.

### Required assertions

`Required fixtures:`

* The historical replay manifest includes the stored catalog and profile refs required by the internal catalog contract.
* The live control plane contains at least one newer profile or descriptor version so the test proves snapshot preference instead of accidental equality.
* Replay reads stored artifacts rather than attempting live tool execution.

`Required observability artifacts:`

* Historical replay manifest ref for `run_catalog_replay`.
* Stored `ToolResolutionResult`, stored `EffectiveToolSet`, and any linked reasoning-step artifacts referenced by the replay manifest.
* Replay mode record showing stored-artifact reconstruction for this step.

`Required replay artifacts:`

* `catalogSnapshotId`, `profileId`, `profileVersion`, `toolId`, `toolVersion`, tool-origin metadata, and filtered reason codes from the historical run.
* Stored configuration snapshot ref associated with the original candidate resolution.

`Pass/fail oracle:`

* The scenario passes only if replay reconstructs the candidate and exposure state from the stored snapshot and refuses to substitute a newer live profile version, descriptor version, or default-profile mapping.

### Required harness capabilities

* Operator replay driver
* Historical run fixture with stored replay manifest
* Catalog and profile snapshot fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` Head-agent bootstrap expands `platform.head.default@v1` into the full fifteen-tool candidate set
* `Risk level:` Low
* `Rationale:` Proves the control-plane source of truth is complete and deterministic for head-agent bootstrap: the initial broad default must resolve to the exact built-in set documented in the catalog.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Internal Tool Catalog immutable catalog snapshot, immutable profile definition, and `platform.head.default@v1` membership
* Layer 2: Tool Execution Framework `ResolveCandidateTools` determinism for a fixed snapshot and profile set
* Layer 2: Observability applied profile refs and source refs for candidate resolution

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one head-agent capability-resolution request for `user_catalog_smoke_head` on `thread_catalog_smoke_head`, one pinned catalog snapshot `catalog_internal_v1`, and effective config with `defaultHeadProfileRef = platform.head.default@v1`.
* Seeded policy rules: not applied yet because this scenario stops at candidate resolution before runtime filtering or execution.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none; no model execution is needed.
* Selected tool implementations: adapters for all fifteen built-in descriptors are available and compatible with the attached execution space.
* Expected capability set: candidate resolution returns the fifteen initial built-in tools from `platform.head.default@v1`.
* Execution-space posture: one compatible execution space `es_catalog_full` is attached so execution-space feasibility does not remove any head-default tools at the candidate stage.
* Approval or replay fixtures: resolution must preserve `catalogSnapshotId`, `appliedProfiles`, and source refs for replay.

### Given / When / Then

Given a head-agent capability-resolution request with defaults enabled and a pinned catalog snapshot,
When Tool Execution Framework resolves candidate tools against `platform.head.default@v1` and `catalog_internal_v1`,
Then the result contains exactly the fifteen documented built-in descriptors from the head default, plus replay-visible profile and snapshot refs.

### Required assertions

`Required fixtures:`

* `catalog_internal_v1` contains the initial fifteen built-in entries and `platform.head.default@v1`.
* The attached execution space is compatible with every execution-space-bound descriptor in the head default.

`Required observability artifacts:`

* One candidate-resolution artifact carrying `candidateTools`, `appliedProfiles = [platform.head.default@v1]`, and source refs.
* One catalog-snapshot ref tied to the resolution artifact.

`Required replay artifacts:`

* `catalogSnapshotId`, `profileId = platform.head.default`, `profileVersion = v1`, and all fifteen `(toolId, toolVersion)` pairs.

`Pass/fail oracle:`

* The scenario passes only if candidate resolution is deterministic and complete for the documented head default: fifteen unique built-in descriptors, one applied head-default profile, and one pinned catalog snapshot.

### Required harness capabilities

* Capability-resolution fixture service
* Internal-catalog snapshot fixture
* Execution-space fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Overlapping profile requests deduplicate exact `toolId` and `version` pairs while preserving profile provenance
* `Risk level:` Low
* `Rationale:` Proves the catalog and profile layer does not create duplicate candidate descriptors when multiple profiles contain the same tool, while still keeping membership explanation replay-visible for audit.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Internal Tool Catalog profile-composition rules, exact-version deduplication, and `ExplainProfileMembership`
* Layer 2: Tool Execution Framework deterministic multi-profile candidate resolution
* Layer 2: Observability source refs and membership evidence for overlapping profile contributions

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one capability-resolution request for `user_catalog_smoke_dedupe` on `thread_catalog_smoke_dedupe`, one pinned catalog snapshot `catalog_internal_v1`, and requested profiles `[platform.head.default@v1, platform.head.readonly@v1]`.
* Seeded policy rules: not material because no execution occurs.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: adapters for all candidate descriptors are available.
* Expected capability set: overlapping read-oriented tools appear once in `candidateTools` even though they belong to both requested profiles.
* Execution-space posture: one compatible execution space is attached so feasibility filtering does not hide the deduplication behavior.
* Approval or replay fixtures: membership explanation artifacts are available for overlapped tools such as `read_file@v1` and `search_text@v1`.

### Given / When / Then

Given runtime requests candidate tools from both `platform.head.default@v1` and `platform.head.readonly@v1`,
When Tool Execution Framework expands both immutable profiles against the same catalog snapshot,
Then each unique `(toolId, version)` pair appears only once in the candidate descriptor set, while profile provenance still shows which tools came from one profile versus both.

### Required assertions

`Required fixtures:`

* The two requested profiles overlap on `read_file@v1`, `list_dir@v1`, `glob_search@v1`, `search_text@v1`, `file_stat@v1`, and `inspect_attachment@v1`.
* The catalog snapshot pins one exact descriptor version for each overlapped tool.

`Required observability artifacts:`

* One candidate-resolution artifact carrying the unique candidate descriptor set and both applied profile refs.
* Source refs or membership explanation artifacts showing multi-profile provenance for each overlapped tool.

`Required replay artifacts:`

* `catalogSnapshotId`, both applied profile refs, and the deduplicated candidate-tool list.
* At least one `ExplainProfileMembership` artifact for an overlapped tool proving that deduplication did not erase provenance.

`Pass/fail oracle:`

* The scenario passes only if duplicated descriptors are collapsed by exact `toolId` and `version`, while audit and replay evidence still preserve multi-profile membership provenance.

### Required harness capabilities

* Capability-resolution fixture service
* Internal-catalog snapshot fixture
* Membership-explanation probe
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Missing execution space filters out execution-space-bound built-ins and never falls back to host execution
* `Risk level:` High
* `Rationale:` Proves the execution-space requirement is enforced at candidate resolution. The platform must fail closed rather than advertising tools it cannot safely execute on the current path.

### Contracts validated

* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Internal Tool Catalog explicit `requiresExecutionSpace` metadata for built-in tools
* Layer 2: Tool Execution Framework execution-space feasibility filtering and fail-closed behavior
* Layer 2: Agent Runtime effective-tool exposure from already-feasible candidate tools only
* Layer 2: Observability filtered reason codes for execution-space-unavailable tools

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one head-agent capability-resolution request for `user_catalog_no_space` on `thread_catalog_no_space`, one pinned catalog snapshot `catalog_internal_v1`, and effective config `defaultHeadProfileRef = platform.head.default@v1`.
* Seeded policy rules: not material because the scenario stops before live tool execution.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: `inspect_attachment@v1` remains available without an execution space; all other built-in tools require an execution space according to the catalog snapshot.
* Expected capability set: candidate resolution excludes every execution-space-bound built-in and may leave only `inspect_attachment@v1`.
* Execution-space posture: no `executionSpaceId` is attached and no compatible execution space can be allocated for the request.
* Approval or replay fixtures: candidate-resolution artifacts must preserve filtered reason codes for every removed execution-space-bound descriptor.

### Given / When / Then

Given a head-agent capability-resolution request arrives without any attached execution space,
When Tool Execution Framework evaluates the head-default candidate pool against descriptor-level execution-space requirements,
Then every descriptor that requires an execution space is filtered out before runtime exposure, no host fallback is attempted, and only descriptors that are still executable on the current path remain candidates.

### Required assertions

`Required fixtures:`

* `read_file@v1`, `search_text@v1`, `shell_exec@v1`, `fetch_url@v1`, and the other built-in filesystem, process, and network tools all declare `Requires Execution Space = true`.
* `inspect_attachment@v1` is the only initial built-in tool that does not require an execution space.

`Required observability artifacts:`

* One candidate-resolution artifact carrying filtered entries and reason codes tied to missing execution-space compatibility.
* One `EffectiveToolSet` or exposure artifact proving runtime did not reintroduce the filtered tools later.

`Required replay artifacts:`

* `catalogSnapshotId`, applied profile ref, filtered-tool reason codes, and the surviving candidate-tool list.

`Pass/fail oracle:`

* The scenario passes only if execution-space-bound tools are excluded before exposure, no host fallback occurs, and the final candidate or effective set contains only tools that remain executable without an execution space.

### Required harness capabilities

* Capability-resolution fixture service
* Internal-catalog snapshot fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Lower-precedence run override cannot widen access beyond a higher-precedence disabled internal profile
* `Risk level:` High
* `Rationale:` Proves the configuration-precedence rule for internal profiles: run-level overrides may narrow the catalog or profile set, but they must not widen access beyond higher-precedence restrictions.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Internal Tool Catalog configuration precedence, `disabledInternalProfiles`, and no-widening rule
* Layer 2: Tool Execution Framework candidate resolution under effective config context
* Layer 2: Agent Runtime effective-tool exposure from already-narrowed candidate sources
* Layer 2: Observability config-snapshot and filtered-reason capture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one head-agent request for `user_catalog_precedence` on `thread_catalog_precedence`, one pinned catalog snapshot `catalog_internal_v1`, agent config `defaultHeadProfileRef = platform.head.readonly@v1`, collaborative-scope config `disabledInternalProfiles = [platform.research.fetch]`, and a run-level override that explicitly requests `platform.research.fetch@v1`.
* Seeded policy rules: not material because the scenario proves configuration precedence before policy or execution.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: not material beyond descriptor availability in the catalog.
* Expected capability set: the effective config context excludes `platform.research.fetch@v1` despite the run-level request, so network tools from that profile never become candidates.
* Execution-space posture: one otherwise compatible execution space may be attached so the outcome is driven by configuration precedence, not sandbox feasibility.
* Approval or replay fixtures: config snapshot ref must be preserved with profile disablement and resulting filtered reason codes.

### Given / When / Then

Given the collaborative scope disables `platform.research.fetch` and the run later tries to opt that same profile back in,
When the platform resolves the effective config context using `System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run` precedence and expands candidate profiles against that context,
Then the higher-precedence scope disable wins, the run-level override does not widen access, and the resulting candidate or exposed set contains no tool sourced from `platform.research.fetch@v1`.

### Required assertions

`Required fixtures:`

* The collaborative-scope disable is present in the effective configuration snapshot.
* The run-level request explicitly asks for the disabled profile so the test proves the no-widening rule instead of accidental omission.

`Required observability artifacts:`

* One configuration snapshot ref showing the higher-precedence disabled-profile setting and the lower-precedence run override.
* One candidate-resolution or capability-exposure artifact showing the requested profile was blocked with a reason code tied to effective configuration precedence.

`Required replay artifacts:`

* Effective configuration snapshot ref, applied profile refs, filtered reason codes, and final candidate-tool list.

`Pass/fail oracle:`

* The scenario passes only if the scope-level disable blocks `platform.research.fetch@v1` despite the run-level request and the blocking decision is traceable in replay-visible configuration evidence.

### Required harness capabilities

* Configuration fixture service with precedence controls
* Capability-resolution fixture service
* Internal-catalog snapshot fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` `disabled_new_use` and `replay_only` lifecycle states block fresh resolution but preserve historical replay references
* `Risk level:` Medium
* `Rationale:` Proves lifecycle-state evolution does not break replay. Fresh candidate resolution must respect deprecation posture, while historical runs must still resolve the old membership and version mapping they used.

### Contracts validated

* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Internal Tool Catalog lifecycle states, fresh-resolution exclusion rules, and historical replay preservation
* Layer 2: Tool Execution Framework candidate resolution from current versus historical snapshots
* Layer 2: Observability capture of lifecycle-state-driven filtering and historical replay refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one fresh head-agent request for `user_catalog_lifecycle` on `thread_catalog_lifecycle`, one current catalog snapshot `catalog_internal_current`, and one historical catalog snapshot `catalog_internal_old`.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none for fresh resolution; replay mode only for the historical path.
* Selected tool implementations: not material because the scenario focuses on catalog lifecycle state rather than live execution.
* Expected capability set: current candidate resolution excludes any tool marked `disabled_new_use` or `replay_only`; historical replay may still reference those tools through `catalog_internal_old`.
* Execution-space posture: not material.
* Approval or replay fixtures: `catalog_internal_current` marks at least one built-in as `disabled_new_use` and one as `replay_only`, while the historical replay manifest references the older active snapshot.

### Given / When / Then

Given the current catalog snapshot has moved one historical built-in to `disabled_new_use` and another to `replay_only`, while a stored historical run still references the older active snapshot,
When fresh candidate resolution runs against the current snapshot and replay later loads the historical snapshot for the old run,
Then the fresh request does not receive either lifecycle-restricted tool in candidate resolution, but the historical replay path still resolves the older membership and version mapping without loss of auditability.

### Required assertions

`Required fixtures:`

* `catalog_internal_current` includes explicit lifecycle-state values for the affected tools.
* The historical replay manifest points to `catalog_internal_old`, not the current snapshot.

`Required observability artifacts:`

* One current candidate-resolution artifact showing lifecycle-state-based filtering.
* One historical replay-manifest ref or catalog-snapshot ref showing preserved historical membership.

`Required replay artifacts:`

* Current `catalogSnapshotId`, filtered reason codes for `disabled_new_use` or `replay_only`, and the fresh candidate-tool list.
* Historical `catalogSnapshotId`, historical `profileId` and `profileVersion`, plus the old `(toolId, toolVersion)` mapping referenced by the run.

`Pass/fail oracle:`

* The scenario passes only if fresh resolution excludes lifecycle-restricted tools while historical replay remains able to resolve and audit the exact older tool and profile membership those past runs used.

### Required harness capabilities

* Capability-resolution fixture service
* Historical replay driver
* Current and historical catalog snapshot fixtures
* Trace collector and replay verifier

### Open questions / contract gaps

* None
