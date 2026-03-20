# Observability, Replay, and Cost Control E2E Cases

This document proposes twelve deterministic E2E scenarios for the Observability, Replay, and Cost Control subsystem.
It covers both end-to-end user and operator journeys and module smoke scenarios so the same suite can validate causal traceability, replay-manifest completeness, fidelity posture, timeline and graph materialization, subagent-tree lineage, raw-vs-redacted artifact access, leaf-preserving cost attribution, and fail-closed behavior when replay-critical evidence is unsafe or incomplete.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator replay and artifact-read drivers
* seeded identity, thread, collaborative-scope, policy, configuration, retention, and pricing fixtures
* recorded model adapter mode, deterministic tool and memory fixtures, and sandbox fixtures
* replay-visible context snapshots, capability exposure decisions, policy decisions, checkpoints, tool and memory refs, provider usage refs, child-run refs, and final output refs
* trace collector, run-view materializer, replay verifier, cost-query harness, and artifact-index harness

## Suite structure

### User-journey scenarios

1. a mixed memory, retrieval, and tool-backed run produces complete run views, artifact refs, and cost rollups
2. approval wait and resume preserve ordered checkpoint, approval, and finalization evidence without duplicate side effects
3. bounded subagent work produces a reconstructable `SubagentTree` and leaf-preserving cost attribution
4. operator replay of a streamed run distinguishes best-effort deltas from the authoritative final result

### Module smoke scenarios

5. replay-critical signals missing required lineage are rejected or quarantined instead of being silently accepted
6. `SealStep` fails closed when a step lacks required authoritative refs for an observed action
7. replay-authoritative store outage blocks commit and prevents false terminal success
8. redaction failure on a secret-bearing replay-critical payload quarantines or fails the write before broad visibility
9. `ReadArtifact` enforces raw-vs-redacted access and preserves tombstone or absence reasons for expired evidence
10. cost reconciliation creates explicit `CostAdjustment` records and preserves leaf attribution in `CostRollup`
11. budget-threshold alerts remain derived, queryable, and linked back to canonical cost evidence
12. lower-level overrides and emergency kill switches cannot create a silent fail-open path for mandatory capture

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Mixed memory, retrieval, and tool-backed run produces complete run views, artifact refs, and cost rollups
* `Risk level:` Medium
* `Rationale:` Proves the baseline observability contract for a realistic run: the subsystem must correlate memory, retrieval, provider, tool, policy, checkpoint, and final-output evidence into one auditable run record without collapsing distinct evidence types.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability canonical envelope, required signal families, `RunTimeline`, `ExecutionGraph`, `RunSummary`, `ArtifactIndex`, and `CostRollup`
* Layer 2: Context Assembly context snapshot creation and inclusion metadata
* Layer 2: Memory System retrieval refs and observability artifacts
* Layer 2: RAG or retrieval evidence capture via context snapshot and retrieval refs
* Layer 2: Agent Runtime lifecycle, checkpoint refs, capability exposure, and final output refs
* Layer 2: Tool Execution Framework tool request, result, and side-effect refs
* Layer 2: LLM Provider Abstraction normalized usage metrics and final model output

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_obs_baseline`, one open thread `thread_obs_baseline`, one collaborative scope `scope_obs_baseline`, one config snapshot with conservative raw-capture settings and normal `operations_standard` plus `replay_long` retention, and one pricing fixture for model usage.
* Seeded policy rules: allow one deterministic read-only `search_text@v1` execution and allow the associated memory and retrieval reads already admitted by context assembly.
* Seeded memory and retrieval stores: one relevant memory record, one relevant retrieval corpus slice with provenance metadata, and unrelated evidence that remains excluded; memory and retrieval sources stay separately tagged.
* Selected model mode: recorded model adapter mode that uses the context evidence, emits one `search_text@v1` request, and then returns one final answer.
* Selected tool implementations: deterministic `search_text@v1` against a fixed lab workspace snapshot.
* Expected capability set: the step exposes only the executable read-only tool required for the journey, and observability records that exposure separately from the context layers.
* Execution-space posture: one attached read-only execution space `es_obs_readonly` with file access limited to the lab repository and no network or process execution.
* Approval or replay fixtures: no approval wait is expected; replay must preserve context snapshot refs, memory refs, retrieval refs, model refs, tool refs, policy decision refs, checkpoint refs, final output ref, and usage or cost refs.

### Given / When / Then

Given a user asks a repo question that requires one remembered preference, one retrieval evidence pack, and one deterministic search tool call,
When runtime assembles context with distinct memory and retrieval sources, exposes the executable tool set, executes the recorded model and `search_text@v1` path, checkpoints at the required boundaries, and emits the final output,
Then observability materializes a complete `RunTimeline`, `ExecutionGraph`, `RunSummary`, `ArtifactIndex`, and `CostRollup` that link the context evidence, model usage, tool result, checkpoint boundaries, and final output without collapsing memory into retrieval or vice versa.

### Required assertions

`Required fixtures:`

* The context snapshot retains separate source refs for memory and retrieval evidence.
* The exposed tool set contains exactly the deterministic read-only tool used by the journey.
* The pricing fixture can derive a cost record from the provider usage metrics.

`Required observability artifacts:`

* One context snapshot ref with inclusion metadata and distinct memory and retrieval source refs.
* One capability exposure record for the step.
* One policy decision ref for the tool action.
* One tool invocation record with request ref, result ref, and side-effect refs if any.
* Runtime lifecycle events, model request and response refs, checkpoint refs, final output ref, and usage records.
* `RunTimeline`, `ExecutionGraph`, `RunSummary`, `ArtifactIndex`, and `CostRollup` views for the run.

`Required replay artifacts:`

* Context snapshot refs, memory refs, retrieval refs, model input and output refs, tool input and output refs, policy decision ref, checkpoint refs, and final output ref.
* Replay manifest with authoritative posture for the run.

`Pass/fail oracle:`

* The scenario passes only if the run views and replay manifest capture the full causal chain of the run, preserve distinct memory and retrieval evidence, and expose leaf usage or cost attribution for the model and tool path.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Deterministic `search_text@v1` harness
* Seeded memory and retrieval stores
* Sandbox harness with read-only execution space
* Pricing and cost-query fixture service
* Trace collector, run-view materializer, artifact-index harness, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Approval wait and resume preserve ordered checkpoint, approval, and finalization evidence without duplicate side effects
* `Risk level:` High
* `Rationale:` Proves the observability subsystem records the wait, resume, and completion boundary correctly. Approval lifecycle, checkpoint refs, and final output must appear in logical order and remain replay-authoritative.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability required signal families for approvals, checkpoints, tool refs, and final output plus `RunTimeline` ordering rules
* Layer 2: Agent Runtime approval wait, resume, and finalization behavior
* Layer 2: Policy and Approval decision, approval request, and approval resolution evidence
* Layer 2: Tool Execution Framework governed side-effect execution and result refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_obs_approval`, one open thread `thread_obs_approval`, one collaborative scope `scope_obs_approval`, one config snapshot with mandatory replay-authoritative capture enabled, and one approval-capable workflow fixture.
* Seeded policy rules: classify one bounded `patch_file@v1` request as `require_approval`; after approval, allow the exact request under enforceable path conditions.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model emits one `patch_file@v1` request and one final response after the patch result returns.
* Selected tool implementations: deterministic `patch_file@v1` against a bounded writable lab workspace.
* Expected capability set: the step exposes the high-risk tool only as an executable candidate that still requires live approval before execution.
* Execution-space posture: one bounded writable execution space `es_obs_patch` with no network or unrestricted host access.
* Approval or replay fixtures: one approval request artifact, one later approval resolution artifact, and replay refs for all wait and resume boundaries.

### Given / When / Then

Given a run reaches a high-risk file-patch action that requires approval,
When runtime records the policy decision, persists the pre-wait checkpoint, enters `waiting_approval`, later resumes from the checkpoint after a valid approval resolution, executes the patch exactly once, and seals the final output,
Then observability records the approval wait, checkpoint, resume, tool execution, and finalization in logical order and the replay manifest proves no duplicate side effect occurred across the wait boundary.

### Required assertions

`Required fixtures:`

* The approval resolution is bound to the original request hash and policy snapshot.
* The pre-wait checkpoint and resumed tool execution both target the same logical step lineage.

`Required observability artifacts:`

* Policy evaluation request, approval request ref, approval resolution ref, and policy snapshot ref.
* One checkpoint ref before `waiting_approval` and one checkpoint or seal ref after resumed completion.
* One tool invocation record with request ref and result ref.
* Runtime lifecycle events showing `running -> waiting_approval -> resuming -> running -> completed`.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the approval and resume boundary before final completion.

`Required replay artifacts:`

* Approval request and resolution refs, checkpoint refs, model refs, tool refs, and final output ref.
* Replay manifest with authoritative posture and no duplicate tool call refs for the same action.

`Pass/fail oracle:`

* The scenario passes only if the approval wait and resume ordering is replay-visible, the side effect occurs at most once, and the final output is sealed only after the authoritative refs for approval, checkpoint, tool result, and final output exist.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy and approval fixture service
* Deterministic `patch_file@v1` harness
* Sandbox harness with bounded writable execution space
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Bounded subagent work produces a reconstructable `SubagentTree` and leaf-preserving cost attribution
* `Risk level:` High
* `Rationale:` Proves observability handles parent-child execution as one evidence graph without erasing child lineage or cost leaf records. This is the strongest end-to-end test of correlation anchors, subagent views, and child-run rollups.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 2: Observability `SubagentTree`, parent-child ordering, `CostRollup`, and leaf attribution rules
* Layer 2: Subagent Profiles and Delegation Contracts child lineage and child result refs
* Layer 2: Agent Runtime child creation, join, and merge refs
* Layer 2: LLM Provider Abstraction normalized usage metrics for parent and child model calls
* Layer 2: Tool Execution Framework tool invocation refs for child work when used

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_obs_subagent`, one open thread `thread_obs_subagent`, one collaborative scope `scope_obs_subagent`, one config snapshot with normal replay retention and cost reconciliation enabled, and one immutable delegation profile fixture `delegation.analysis.default@v1`.
* Seeded policy rules: allow one bounded same-scope child spawn and the child’s deterministic read-only work.
* Seeded memory and retrieval stores: optional parent evidence and child evidence refs exist for the bounded delegation path.
* Selected model mode: recorded parent model emits one `spawn_subagent` decision and one later synthesis response; recorded child model emits one analysis result.
* Selected tool implementations: deterministic child read-only tool path when needed.
* Expected capability set: the child receives only the explicit delegated tool and route posture required by the task.
* Execution-space posture: child read-only execution space `es_obs_child` when file-backed analysis is needed.
* Approval or replay fixtures: replay must preserve parent-child manifests, child result refs, merge refs, usage records, cost records, and rollup views.

### Given / When / Then

Given a decomposable analysis task causes the parent run to spawn one bounded child run,
When the child run executes and returns a structured result that the parent merges into its final answer,
Then observability materializes a reconstructable `SubagentTree`, links the child lifecycle into the `RunTimeline` and `ExecutionGraph`, and rolls child usage and cost into the head run while preserving child leaf attribution.

### Required assertions

`Required fixtures:`

* Parent and child runs have distinct but linked `runId` values.
* Usage and cost fixtures exist for both the parent and child model calls.

`Required observability artifacts:`

* Parent-child lineage refs, child lifecycle events, child result ref, and parent merge ref.
* `SubagentTree` view with delegated objective summary refs and join status.
* `RunTimeline` and `ExecutionGraph` views showing child creation and join order.
* Usage records and cost records attributed to both head run and child run.
* `CostRollup` showing rolled-up totals with child-run attribution preserved.

`Required replay artifacts:`

* Parent and child replay manifests or manifest linkage refs, child result ref, merge ref, and cost or usage refs.
* Parent and child model refs and any child tool refs that participated in the run.

`Pass/fail oracle:`

* The scenario passes only if the child lineage is reconstructable in run views, the parent-child ordering is preserved in replay, and the rollup retains the ability to trace cost back to the child leaf records.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded parent and child model adapter mode
* Delegation-profile fixture service
* Deterministic child-runtime harness
* Optional deterministic child tool harness
* Pricing and cost-query fixture service
* Trace collector, run-view materializer, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Operator replay of a streamed run distinguishes best-effort deltas from the authoritative final result
* `Risk level:` Medium
* `Rationale:` Proves replay fidelity is declared rather than assumed. Stream deltas are useful diagnostics, but the final normalized output remains the authoritative replay artifact.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability replay posture, manifest `modeSupport`, `fidelity`, and `nonDeterministicRefs`
* Layer 2: LLM Provider Abstraction stream-event vs final-result contract
* Layer 2: Agent Runtime authoritative final output boundary

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one completed streamed run `run_obs_stream`, one stored config snapshot, and one observability config that allows capture of stream diagnostics while preserving mandatory final-output capture.
* Seeded policy rules: not material beyond the stored run artifacts.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded streamed provider mode that emits ordered `StreamEvent` values and exactly one final `StreamResult`.
* Selected tool implementations: none.
* Expected capability set: no tool path is required; the focus is provider streaming evidence and final sealed output.
* Execution-space posture: not material.
* Approval or replay fixtures: replay manifest and artifact refs include stream diagnostics, final normalized output, and replay posture metadata.

### Given / When / Then

Given an operator requests replay of a previously streamed run,
When observability reads the immutable replay manifest and the provider stream evidence for that run,
Then the replay makes stream deltas visible as best-effort diagnostics while treating the final normalized output artifact as the authoritative replay result.

### Required assertions

`Required fixtures:`

* The stored streamed run contains both non-authoritative stream events and one authoritative final result.
* The replay manifest declares fidelity and mode support explicitly.

`Required observability artifacts:`

* Stream diagnostic refs, final output ref, and `RunSummary` replay posture.
* `RunTimeline` and `ExecutionGraph` views showing the stream sequence and final completion.

`Required replay artifacts:`

* Replay manifest with `modeSupport`, `fidelity`, `modelCallRefs`, `finalOutputRef`, and any `nonDeterministicRefs` or missing refs needed by posture.

`Pass/fail oracle:`

* The scenario passes only if replay exposes stream diagnostics as non-authoritative, uses the final normalized output as authoritative, and labels the replay posture explicitly rather than implying more certainty than the stored evidence supports.

### Required harness capabilities

* Operator replay driver
* Recorded streamed provider fixture
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` Replay-critical signals missing required lineage are rejected or quarantined instead of being silently accepted
* `Risk level:` High
* `Rationale:` Proves the canonical envelope is enforced at ingest. Observability cannot reconstruct causal order if replay-critical records arrive without required lineage.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability canonical envelope rules, required lineage validation, and reject-or-quarantine behavior for structurally unsafe replay-critical records

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one ingest attempt for `run_obs_bad_lineage`, one observability config with `mandatorySignalWriteMode = fail closed`, and one malformed replay-critical signal batch.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: the malformed signal batch omits required run or step lineage for a replay-critical record class.

### Given / When / Then

Given a replay-critical signal batch arrives with missing required lineage such as absent `runId`, `stepId`, or `sequenceKey`,
When `Record` validates the canonical envelope,
Then the subsystem rejects or quarantines the unsafe record instead of silently accepting it into replay-authoritative storage.

### Required assertions

`Required fixtures:`

* The malformed signal is replay-critical and missing lineage that the envelope rules require.

`Required observability artifacts:`

* Ingest rejection or quarantine result for the malformed signal.
* Explicit absence of the malformed record from replay-authoritative read views.

`Required replay artifacts:`

* Quarantine or rejection artifact identifying the missing lineage.

`Pass/fail oracle:`

* The scenario passes only if unsafe replay-critical signals are blocked at ingest and do not become replay-authoritative evidence.

### Required harness capabilities

* Observability ingest harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` `SealStep` fails closed when a step lacks required authoritative refs for an observed action
* `Risk level:` High
* `Rationale:` Proves the subsystem does not let a step appear committed until the evidence required by its observed actions is actually persisted.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability `SealStep` behavior and replay-authoritative durability rules

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one partially recorded step for `run_obs_unsealed` with a model request, tool request, and checkpoint ref but a missing tool result ref.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none beyond the missing authoritative result ref.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: the step fragment is intentionally incomplete for an observed tool action.

### Given / When / Then

Given observability has a step fragment whose recorded actions include a tool call but not the required authoritative tool result ref,
When `SealStep` attempts to commit the replay-visible step fragment,
Then it fails closed and does not claim the step is sealed successfully.

### Required assertions

`Required fixtures:`

* The step fragment clearly records that a tool action occurred.
* The required authoritative ref for that action is missing.

`Required observability artifacts:`

* Step-seal failure result or failure artifact.
* Explicit absence of a sealed replay fragment that would imply the step completed safely.

`Required replay artifacts:`

* Incomplete step fragment refs plus the failure artifact showing why sealing was refused.

`Pass/fail oracle:`

* The scenario passes only if `SealStep` refuses to seal a step whose observed actions lack required authoritative evidence.

### Required harness capabilities

* Step-seal harness
* Replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Replay-authoritative store outage blocks commit and prevents false terminal success
* `Risk level:` High
* `Rationale:` Proves failure-closed behavior for the most dangerous observability outage: if replay-authoritative persistence is unavailable, the platform must not pretend the associated step or run committed safely.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability durability classes, failure modes, and fail-closed recovery strategy for replay-authoritative store outages

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one terminal run-finalization attempt for `run_obs_store_outage`, one config snapshot with `mandatorySignalWriteMode = fail closed`, and an injected outage on the replay-authoritative store.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: not material.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: the final output ref and rolled-up usage are ready, but authoritative persistence is unavailable during `FinalizeRun`.

### Given / When / Then

Given a run is ready to seal its final output, replay posture, and cost rollup,
When the replay-authoritative store is unavailable during `FinalizeRun`,
Then observability fails closed, surfaces the persistence failure, and prevents the run from being reported as safely finalized.

### Required assertions

`Required fixtures:`

* The outage affects replay-authoritative persistence rather than only best-effort diagnostics.

`Required observability artifacts:`

* Persistence-failure artifact or alert tied to the blocked finalization attempt.
* Explicit absence of a terminal committed manifest or run summary that would imply successful finalization.

`Required replay artifacts:`

* Failure artifact showing the blocked authoritative write and the missing sealed terminal refs.

`Pass/fail oracle:`

* The scenario passes only if replay-authoritative store failure blocks commit and no false terminal success is materialized.

### Required harness capabilities

* Failure-injection harness for replay-authoritative storage
* Run-finalization harness
* Alert-query harness
* Replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Redaction failure on a secret-bearing replay-critical payload quarantines or fails the write before broad visibility
* `Risk level:` High
* `Rationale:` Proves the subsystem protects sensitive payloads even under failure. Replay-critical payload capture cannot silently store secrets unsafely.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability redaction classes, secret-handling rules, and quarantine or fail-closed behavior on redaction failure

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one signal batch for `run_obs_redaction_fail`, one config snapshot with raw tool payload capture enabled where policy allows, and one redaction pipeline fixture that fails on a secret-bearing payload.
* Seeded policy rules: raw capture of the payload would normally be permitted only through redaction or scoped protected storage.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: one tool result payload contains secret-like material that requires `secret` or `hash_only` handling.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: the payload is replay-critical and would become queryable if not quarantined or failed safely.

### Given / When / Then

Given a replay-critical payload arrives with secret-bearing data that requires redaction before broad persistence,
When the redaction pipeline fails during `Record`,
Then the subsystem quarantines the payload or fails the write closed instead of storing unsafe cleartext telemetry.

### Required assertions

`Required fixtures:`

* The payload is replay-critical and secret-bearing.
* The redaction pipeline failure occurs before broad persistence.

`Required observability artifacts:`

* Quarantine or failure artifact for the unsafe payload.
* Explicit absence of a broadly queryable raw artifact for that payload.

`Required replay artifacts:`

* Quarantine ref, failure artifact, or safe hash linkage showing the payload was not silently persisted unsafely.

`Pass/fail oracle:`

* The scenario passes only if redaction failure prevents unsafe broad persistence of the secret-bearing payload and leaves auditable evidence of the blocked write.

### Required harness capabilities

* Observability ingest harness
* Redaction failure-injection harness
* Artifact-index harness
* Replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` `ReadArtifact` enforces raw-vs-redacted access and preserves tombstone or absence reasons for expired evidence
* `Risk level:` Medium
* `Rationale:` Proves the artifact-read boundary is governed by scope and redaction, and that expired evidence remains auditable through tombstones or absence reasons when replay or audit previously referenced it.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Observability access rules, raw-vs-redacted read distinctions, and tombstone or absence-reason preservation

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one artifact ref referenced by a historical replay manifest for `run_obs_artifact_read`, one caller with metadata access but not raw-payload access, and one retention fixture where the raw payload has expired or been deleted.
* Seeded policy rules: scope-aware reads permit metadata access but not raw payload access to the caller.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: not material.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: the replay manifest or audit record still references the artifact even though the raw payload is no longer available.

### Given / When / Then

Given an operator can see that a replay-critical artifact exists but is not authorized to read the raw payload and the raw payload has also expired under retention policy,
When `ReadArtifact` resolves the artifact ref,
Then it returns only the authorized redacted or metadata view and preserves a tombstone or absence reason for the missing raw payload instead of returning unauthorized or misleading data.

### Required assertions

`Required fixtures:`

* The caller is authorized for metadata but not raw payload access.
* The raw payload has expired or been deleted after prior reference by replay or audit evidence.

`Required observability artifacts:`

* Artifact-index metadata for the ref including retention and redaction posture.
* Access-denial or redacted-read result as appropriate.
* Tombstone or absence-reason record for the expired raw payload.

`Required replay artifacts:`

* Replay or audit refs that still point to the artifact identity.
* Artifact-read result showing redacted or tombstoned behavior.

`Pass/fail oracle:`

* The scenario passes only if `ReadArtifact` honors scope and redaction rules, withholds unauthorized raw payloads, and leaves an auditable tombstone or absence reason for expired evidence.

### Required harness capabilities

* Artifact-read driver
* Artifact-index harness
* Retention-expiry fixture service
* Replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Cost reconciliation creates explicit `CostAdjustment` records and preserves leaf attribution in `CostRollup`
* `Risk level:` Medium
* `Rationale:` Proves the cost plane is not allowed to silently rewrite historical records. Reconciliation must remain explicit and leaf attribution must survive rollups across child runs.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Delegation Must Be Bounded`
* Layer 2: Observability `UsageRecord`, `CostRecord`, `CostAdjustment`, `BudgetSnapshot`, `CostRollup`, and leaf-attribution rules
* Layer 2: LLM Provider Abstraction normalized usage metrics

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one head run with one child run for `run_obs_cost_reconcile`, one config snapshot with `enableCostReconciliation = true`, and one pricing fixture that changes after initial estimated cost records were written.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded parent and child model usage sufficient to produce usage and cost records.
* Selected tool implementations: optional child tool usage may be present but is not required.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: initial usage and cost records already exist, and later reconciliation data becomes available.

### Given / When / Then

Given a head run and one child run already have leaf usage and estimated cost records,
When reconciliation runs after a pricing update or vendor-reported adjustment becomes available,
Then observability creates explicit `CostAdjustment` records, updates `CostRollup`, and preserves the original leaf cost and usage records for both head and child runs.

### Required assertions

`Required fixtures:`

* Initial estimated or vendor-reported leaf records exist before reconciliation.
* Reconciliation uses an explicit pricing or adjustment reference.

`Required observability artifacts:`

* Original leaf `UsageRecord` and `CostRecord` entries for the head run and child run.
* One or more `CostAdjustment` records referencing the affected leaf cost ids.
* Updated `CostRollup` and any `BudgetSnapshot` outputs if applicable.

`Required replay artifacts:`

* Original leaf refs plus the explicit adjustment refs that modify aggregate reporting without mutating historical leaf attribution silently.

`Pass/fail oracle:`

* The scenario passes only if reconciliation is explicit, leaf records remain traceable after rollup, and the rolled-up totals can still be decomposed back to head and child leaves.

### Required harness capabilities

* Pricing and reconciliation fixture service
* Cost-query harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Budget-threshold alerts remain derived, queryable, and linked back to canonical cost evidence
* `Risk level:` Medium
* `Rationale:` Proves cost-control outputs are derived products rather than substitute truth. Operators must be able to traverse from an alert back to the underlying budget snapshot, usage records, and cost records that caused it.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Observability derived alert-event rules and `ListAlerts` behavior
* Layer 2: Observability `UsageRecord`, `CostRecord`, `BudgetSnapshot`, and `CostRollup`
* Layer 2: Observability cost-alert threshold configuration and source-linkage requirements for derived products

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_obs_budget_alert`, one collaborative scope budget subject with warning and hard thresholds, one config snapshot with `costAlertThresholds` enabled, and one pricing fixture that produces deterministic spend records.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded usage sufficient to cross the configured warning threshold without ambiguity.
* Selected tool implementations: optional tool usage may contribute cost, but is not required.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: source usage and cost records already exist and are queryable before alert derivation runs.

### Given / When / Then

Given a run and its collaborative scope cross a configured budget warning threshold,
When observability derives budget snapshots and alert events from the underlying usage and cost records and an operator queries alerts,
Then `ListAlerts` returns a derived threshold alert that links back to the canonical source records and `QueryCosts` still exposes the underlying cost evidence as the source of truth.

### Required assertions

`Required fixtures:`

* The warning threshold crossing is caused by concrete persisted usage and cost records.
* The alert is derived after source records exist, not emitted as a standalone synthetic fact.

`Required observability artifacts:`

* Source `UsageRecord`, `CostRecord`, `CostRollup`, and `BudgetSnapshot` entries for the affected subject.
* One derived `alert_event` for the threshold crossing.
* Alert metadata that links back to canonical source signal ids, cost refs, or budget snapshot refs.

`Required replay artifacts:`

* Source cost and usage refs remain queryable even though the alert itself is a derived product.

`Pass/fail oracle:`

* The scenario passes only if the alert is queryable through `ListAlerts`, is explicitly derived rather than authoritative execution evidence, and links back to the underlying cost records and budget snapshot that caused it.

### Required harness capabilities

* Pricing and budget-threshold fixture service
* Cost-query harness
* Alert-query harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Lower-level overrides and emergency kill switches cannot create a silent fail-open path for mandatory capture
* `Risk level:` High
* `Rationale:` Proves configuration precedence and kill-switch behavior do not weaken replay-critical evidence capture. Emergency reductions may affect non-authoritative telemetry only.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Observability configuration precedence, `mandatorySignalWriteMode`, raw-capture settings, and kill-switch rules

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_obs_killswitch`, one system config with `mandatorySignalWriteMode = fail closed`, one higher-level policy requiring replay-critical capture for final output and policy refs, one lower-level override attempting to reduce capture, and one emergency kill-switch fixture targeting only non-authoritative signal families.
* Seeded policy rules: the run includes at least one replay-critical step and one best-effort debug stream so both classes can be distinguished.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model run producing both mandatory final-output evidence and optional debug diagnostics.
* Selected tool implementations: none required.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: the run includes enough evidence to show which capture classes are mandatory and which are optional.

### Given / When / Then

Given system-level configuration requires fail-closed handling for replay-authoritative capture and an emergency kill switch is activated for non-authoritative diagnostics,
When the run emits both replay-critical records and best-effort debug telemetry under lower-level override pressure,
Then the subsystem may reduce the non-authoritative telemetry but must still capture the mandatory replay-critical evidence and must not silently weaken required audit capture.

### Required assertions

`Required fixtures:`

* The effective config snapshot shows the higher-level mandatory-capture requirement and the lower-level attempted override.
* The kill switch targets only non-authoritative capture classes.

`Required observability artifacts:`

* Effective config snapshot ref for the run.
* Presence of mandatory replay-critical records such as final output, checkpoint, or policy refs.
* Reduced or absent best-effort debug records only where the kill switch explicitly allows that reduction.

`Required replay artifacts:`

* Effective config snapshot ref, final output ref, and other mandatory replay-critical refs preserved despite kill-switch activation.

`Pass/fail oracle:`

* The scenario passes only if lower-level overrides and kill switches never create a silent fail-open path for mandatory capture and any reduction is limited to explicitly non-authoritative telemetry.

### Required harness capabilities

* Configuration fixture service with precedence controls
* Kill-switch fixture service
* Recorded model run fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None
