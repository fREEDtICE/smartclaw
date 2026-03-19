# Context Assembly E2E Cases

This document proposes fourteen deterministic E2E scenarios for the Context Assembly subsystem.
It covers both end-to-end user journeys and module black-box flows driven through runtime-adjacent contracts.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic channel ingress
* seeded identity, thread, scope, policy, memory, and retrieval fixtures
* recorded model decisions where a model step is part of the journey
* replay-visible context snapshots, inclusion records, and budget reports
* trace, checkpoint, and replay capture for every meaningful assembly action

## Suite structure

### User-journey scenarios

1. follow-up question uses thread summary, memory, and RAG while preserving strict layer order
2. model-window change compacts optional evidence without weakening mandatory layers
3. approval resume rebuilds a fresh snapshot with lineage and approval wait context
4. tool-result refresh carries bounded run-state continuation into the next reasoning step
5. delegated child work receives a bounded subagent context pack instead of a parent clone
6. explicit retrieval refresh rebuilds the snapshot when late evidence arrives

### Module black-box scenarios

7. scope-mismatched blocks are excluded and recorded rather than silently leaking
8. irreducible mandatory-layer overflow returns `budget_blocked`
9. missing mandatory layer fails closed with `missing_mandatory_layer`
10. missing thread summary and empty memory/RAG continue in visible degraded mode
11. optional evidence with missing provenance is excluded and recorded
12. policy-shaped input blocks are excluded instead of overriding higher-precedence layers
13. contradictory scope metadata fails closed with `invalid_scope_envelope`
14. invalid replay lineage fails closed with `replay_snapshot_missing`

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` User asks a follow-up question and Context Assembly preserves canonical order plus memory/RAG separation
* `Risk level:` Low
* `Rationale:` Proves the baseline Context Assembly happy path on a real run: all major source layers are present, no compaction is needed, the snapshot preserves strict Layer 1.5 order, and memory and RAG remain visibly distinct in both rendering and replay artifacts.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Identity and Thread Management `PreRunEnvelope` to `RunEnvelope` propagation into assembly inputs
* Layer 2: Agent Runtime run-start context assembly, context inclusion provenance, and reasoning-step linkage
* Layer 2: Context Assembly strict layer order, distinct memory and RAG rendering, immutable snapshot creation, and inclusion record persistence
* Layer 2: Memory System provenance-rich retrieval outputs for the memory layer
* Layer 2: RAG Infrastructure retrieval snapshot and citation-rich outputs for the RAG layer
* Layer 2: Observability required snapshot, budget, and replay-manifest capture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_context_followup`, one open thread `thread_context_followup`, one collaborative scope `scope_context_followup`, and deterministic configuration with a generous context budget that avoids compaction for this scenario.
* Seeded policy rules: allow the no-tool answer path; provide one applicable collaborative-scope policy block that must appear as the second context layer.
* Seeded memory and retrieval stores: one memory retrieval result recording the user’s standing preference for concise answers and one RAG retrieval result containing a cited product-spec paragraph relevant to the current question.
* Selected model mode: recorded model adapter mode that produces one model-only final response using the assembled context.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or skill capability is required for this journey.
* Execution-space posture: no execution-space-backed action is requested; if an `executionSpaceId` is attached for lineage, it remains metadata only.
* Approval or replay fixtures: no approval fixture is expected; replay capture must preserve the ordered snapshot, render artifacts, inclusion record, budget report, and final output refs.

### Given / When / Then

Given a user on an existing thread asks a follow-up question that requires continuity from the thread summary, one memory preference, and one retrieved RAG passage,
When Identity and Thread Management provides a runnable `PreRunEnvelope`, Agent Runtime creates the run, requests `run_start` assembly with system instructions, one scope-policy block, one agent-profile block, one thread-summary block, one memory block, one RAG block, the current user input, and bounded run-state metadata,
Then Context Assembly emits one immutable snapshot whose ordered blocks preserve the canonical layer sequence and whose rendered artifacts keep memory evidence distinct from RAG evidence before the model produces the final answer.

### Required assertions

`Required fixtures:`

* The seeded thread summary is available and bound to `thread_context_followup`.
* The memory result belongs to the current user or scope and carries memory ids plus scope provenance.
* The RAG result carries retrieval query refs, corpus snapshot refs, and citation metadata.
* The budget envelope is large enough that no compaction or budget exclusion is needed.

`Required observability artifacts:`

* Identity resolution and thread resolution audit refs.
* Runtime lifecycle events through run creation, context assembly, reasoning step, and completion.
* One context snapshot ref with ordered block IDs covering all eight canonical layers.
* One inclusion record showing all seeded blocks were included and none were compacted.
* One budget report showing zero dropped mandatory content.
* One render-artifact ref with a prompt hash and provider-neutral messages.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking the snapshot to the reasoning step and final output.

`Required replay artifacts:`

* Snapshot ref with ordered block IDs, source refs, block content hashes, inclusion record, budget report, render version, and prompt hash.
* Memory retrieval refs and RAG retrieval refs preserved separately in the replay-visible evidence chain.
* Model input and output refs for the final-response step.
* Immutable replay manifest that references the stored snapshot rather than requiring live reconstruction.

`Pass/fail oracle:`

* The assembled snapshot preserves strict layer order, memory appears before RAG and remains separately attributed, no compaction or cross-layer collapse occurs, and replay can reconstruct the final model step from the stored snapshot and final output refs.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Seeded memory store with retrieval-result fixtures
* Seeded RAG corpus and retrieval fixture service
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` User continues a long thread after a model-window downgrade and Context Assembly compacts optional layers under budget pressure
* `Risk level:` Medium
* `Rationale:` Proves that the subsystem can handle a runtime-triggered model-window change without violating the context contract: output reserve is honored, mandatory layers are protected, optional evidence is compacted or dropped in the documented order, and every inclusion or exclusion decision remains traceable.

### Contracts validated

* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Agent Runtime `model-window change` trigger, budget-envelope handoff, and context-refresh linkage
* Layer 2: Context Assembly budget reservation, compaction order, and explicit inclusion/exclusion reporting
* Layer 2: Memory System and RAG Infrastructure separate evidence outputs under competition for budget
* Layer 2: Observability capture of compaction strategy, dropped token counts, and final snapshot refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_context_budget`, one open thread `thread_context_budget`, one collaborative scope `scope_context_budget`, one parent snapshot produced under a larger model window, and deterministic configuration where the next step is reassigned to a smaller model profile with a deliberately tight `BudgetEnvelope`.
* Seeded policy rules: provide one mandatory scope-policy block; no external action is requested.
* Seeded memory and retrieval stores: one long thread summary, multiple memory retrieval blocks, multiple RAG result blocks, and a non-empty run-state block representing prior tool-result summaries.
* Selected model mode: recorded model adapter mode that first records the model-window downgrade decision and then produces a model-only final answer after compaction succeeds.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or skill capability is required.
* Execution-space posture: no execution-space-backed action is requested.
* Approval or replay fixtures: no approval fixture is expected; replay capture must include the compacted snapshot, decisions, and budget report.

### Given / When / Then

Given a user continues a long-running thread after runtime switches the next step to a smaller model window and more optional evidence now exists than can fit in the reduced budget,
When Agent Runtime records the model-window change, requests `step_refresh` assembly with the smaller budget envelope, and Context Assembly reserves output tokens, protects mandatory instruction and interaction layers, compacts eligible run-state and thread-summary blocks, then compacts memory and RAG evidence in the documented order until the snapshot fits,
Then the subsystem emits one valid immutable snapshot that preserves mandatory layers and distinct memory/RAG groups while recording every compacted or excluded block in the inclusion record and budget report.

### Required assertions

`Required fixtures:`

* The seeded budget envelope is smaller than the total candidate token cost.
* The scenario includes evidence that the immediately previous step used a larger model window or larger effective budget.
* System instructions, scope policy, user input, and minimal run-state continuation are all mandatory.
* At least one memory block and one RAG block are eligible for compaction or exclusion.

`Required observability artifacts:`

* One budget report showing reserved output tokens, used input tokens, dropped token count, and compacted token count.
* One runtime event or step metadata record showing the model-window change that triggered reassembly.
* One inclusion record with reason codes such as `compacted_for_budget` and `excluded_budget_limit`.
* One snapshot ref whose ordered blocks still preserve the canonical layer order.
* Runtime step records linking the compacted snapshot to the reasoning step and final output.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing budgeted assembly before model execution.

`Required replay artifacts:`

* Snapshot ref, inclusion record, budget report, and render artifacts for the compacted step.
* Parent snapshot ref from the pre-downgrade step and child snapshot ref from the compacted step.
* Source refs for every remaining memory and RAG block after compaction.
* Model input and output refs for the step using the compacted snapshot.
* Replay evidence proving that system instructions and scope-policy blocks were not weakened or dropped to fit budget.

`Pass/fail oracle:`

* Mandatory layers remain present, optional evidence is compacted or excluded only in the documented order, memory and RAG stay distinct after compaction, and the stored inclusion record plus budget report explain exactly how the final snapshot fit the downgraded model budget.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Configurable budget-envelope fixture
* Runtime fixture that can declare a model-window change between steps
* Seeded memory and RAG fixtures with controllable token sizes
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` User approves a pending action and Context Assembly rebuilds a resume snapshot with lineage
* `Risk level:` High
* `Rationale:` Proves the resume contract around Context Assembly: approval resume must produce a new immutable snapshot, it must reference the parent snapshot, and it must include approval wait context in bounded run state rather than reconstructing the run from scratch or re-running identity entry flow.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime resume semantics, checkpoint restore, and approval-resume trigger for reassembly
* Layer 2: Identity and Thread Management rule that resume paths reuse persisted metadata rather than re-running inbound resolution
* Layer 2: Context Assembly `resume` mode, parent snapshot lineage, and approval wait context in `run_state`
* Layer 2: Observability checkpoint, resume, and snapshot-lineage capture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_context_resume`, one paused or waiting-approval run on `thread_context_resume`, one collaborative scope `scope_context_resume`, and deterministic config preserving the prior snapshot and checkpoint refs.
* Seeded policy rules: approval has already been granted on the pending request so runtime may resume from the checkpoint.
* Seeded memory and retrieval stores: unchanged from the pre-wait snapshot and available for reassembly if still relevant.
* Selected model mode: recorded model adapter mode that completes the resumed journey after one post-resume step.
* Selected tool implementations: one previously approved action may continue after the resume boundary, but the Context Assembly test focuses on the resume snapshot itself.
* Expected capability set: capability exposure is recomputed by runtime after the resume snapshot exists; no new undocumented capability should appear because of resume.
* Execution-space posture: any attached `executionSpaceId` must propagate into the resumed run metadata where applicable.
* Approval or replay fixtures: one valid approval resolution payload and one persisted checkpoint ref tied to the pre-wait snapshot.

### Given / When / Then

Given a run is paused at `waiting_approval` with a valid checkpoint and an earlier context snapshot already stored,
When runtime receives a valid approval result, restores the checkpoint, and requests Context Assembly in `resume` mode using the persisted run envelope and prior source refs,
Then Context Assembly emits a new immutable snapshot with a new `snapshotId`, references the prior snapshot as its parent, includes approval wait context in bounded `run_state`, and allows runtime to continue the resumed step without re-running inbound identity resolution.

### Required assertions

`Required fixtures:`

* The pre-resume checkpoint is valid and points to one existing parent snapshot.
* The approval payload is bound to the current run and accepted by runtime before resume.
* Persisted user, thread, and scope metadata are available without invoking inbound identity resolution again.

`Required observability artifacts:`

* Checkpoint load record and resume event.
* Parent snapshot ref and resumed snapshot ref with parent linkage.
* Inclusion record for the resumed snapshot showing bounded `run_state` continuation that includes approval wait context.
* Runtime lifecycle events covering `waiting_approval -> resuming -> running`.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the resume boundary.

`Required replay artifacts:`

* Pre-resume checkpoint ref and parent snapshot ref.
* Resumed snapshot ref with `parentSnapshotId`.
* Approval resolution ref tied to the resume event.
* Any model or action refs produced after the resumed snapshot is used.
* Replay manifest showing the resume sequence from checkpoint to new snapshot to continued execution.

`Pass/fail oracle:`

* Resume produces a new immutable snapshot rather than mutating the old one, the parent-child snapshot lineage is preserved, approval wait context appears in bounded run state, and the resumed path continues with persisted run identity rather than a fresh inbound-resolution flow.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service with persisted run metadata
* Approval fixture service
* Checkpoint store fixture
* Recorded model adapter mode
* Trace collector, checkpoint inspector, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` User asks a two-step question and Context Assembly refreshes after a tool result using bounded run state
* `Risk level:` Medium
* `Rationale:` Proves the step-refresh contract on a normal multi-step run: after a tool completes, Context Assembly must produce a fresh snapshot that carries only bounded run-state continuation such as prior tool-result summaries, not the full scratchpad or tool metadata as a substitute capability contract.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Agent Runtime `step_refresh` trigger after material tool result change
* Layer 2: Context Assembly refresh semantics, bounded run-state rules, and prohibition on raw scratchpad/tool-metadata leakage
* Layer 2: Tool Execution Framework side-effect/result refs feeding runtime state rather than prompt capability injection
* Layer 2: Observability snapshot refresh, tool result, and reasoning-step linkage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_context_tool_refresh`, one open thread `thread_context_tool_refresh`, one collaborative scope `scope_context_tool_refresh`, and deterministic config that allows one low-risk read-only tool call followed by a second reasoning step.
* Seeded policy rules: allow the seeded read-only tool path and final no-tool answer path.
* Seeded memory and retrieval stores: available but not material to the second step.
* Selected model mode: recorded model adapter mode that emits one read-only tool request and then one final response after refresh.
* Selected tool implementations: one deterministic read-only tool whose result should become a bounded run-state summary for the next step.
* Expected capability set: tool exposure is managed separately by runtime and must not be injected into the canonical context snapshot.
* Execution-space posture: if the read-only tool requires execution space, the `executionSpaceId` remains outside the canonical context-layer contract and stays in runtime/action metadata.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a user asks a question that the recorded model answers in two steps by first calling one deterministic read-only tool and then producing a final answer,
When the first tool call completes and runtime decides the result materially changes working state, runtime requests `step_refresh` assembly with a bounded run-state summary of the prior tool result,
Then Context Assembly emits a new snapshot whose `run_state` layer contains only the structured continuation needed for the next reasoning step and does not include the full raw scratchpad or tool metadata as a substitute capability contract.

### Required assertions

`Required fixtures:`

* The tool result is available in runtime working state before refresh.
* The follow-up reasoning step is configured to use the refreshed snapshot.
* No raw chain-of-thought or unrestricted scratchpad material is present in any input block.

`Required observability artifacts:`

* One parent snapshot ref for the pre-tool step and one child snapshot ref for the post-tool refresh.
* Tool invocation record linked to the refresh-triggering step.
* Inclusion record for the refreshed snapshot showing a bounded `run_state` block derived from the tool result.
* Runtime reasoning-step records showing tool step then final-response step.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the tool result followed by snapshot refresh.

`Required replay artifacts:`

* Pre-refresh and post-refresh snapshot refs with parent linkage.
* Tool request and result refs.
* Render-artifact refs for the refreshed step.
* Model input and output refs for the final-response step using the refreshed snapshot.

`Pass/fail oracle:`

* A fresh snapshot is created after the tool result, the refreshed `run_state` is bounded and structured, tool capability metadata remains outside the canonical context layers, and replay can reconstruct both steps with the correct snapshot-tool-step ordering.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with two-step tool sequence
* Deterministic tool harness
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` User asks for delegated analysis and Context Assembly builds a bounded child pack instead of cloning the parent context
* `Risk level:` High
* `Rationale:` Proves the child-context contract end to end: delegated work receives a fresh ordered snapshot with explicit task bounds, approved child tool set, relevant parent evidence only, and explicit exclusions for unrelated memory, RAG, and parent scratchpad content.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Agent Runtime bounded delegation and child-run creation from a context spec
* Layer 2: Context Assembly `subagent_pack` mode, child-budget use, explicit exclusions, and new ordered child snapshot
* Layer 2: Subagent Profiles and Delegation Contracts explicit task, evidence, tool-profile, and budget requirements
* Layer 2: Observability child-pack lineage and subagent replay refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_context_subagent`, one open thread `thread_context_subagent`, one collaborative scope `scope_context_subagent`, and deterministic config enabling a bounded analysis child profile.
* Seeded policy rules: allow the bounded subagent spawn path for the current task.
* Seeded memory and retrieval stores: the parent run contains both relevant and irrelevant memory/RAG evidence so exclusions can be tested.
* Selected model mode: recorded model adapter mode that chooses a delegated analysis path.
* Selected tool implementations: the child run receives only the effective child tool-set reference approved by runtime.
* Expected capability set: the child pack may reference only the runtime-approved effective child tool set; the parent default tool pack must not be inherited automatically.
* Execution-space posture: child execution-space needs are determined by runtime and child tool set, but the child pack itself must remain a bounded context artifact rather than a host clone.
* Approval or replay fixtures: no approval fixture is expected in this deterministic allow variant.

### Given / When / Then

Given a user asks for an analysis task that runtime chooses to delegate to a bounded child run,
When runtime prepares a `SubagentContextRequest` containing the delegated objective, success criteria, child budget, effective child tool-set reference, parent summary blocks, and relevant evidence blocks,
Then Context Assembly emits a `SubagentContextPack` whose snapshot preserves canonical layer order for the child, includes only the allowed evidence slices, and explicitly excludes the full parent scratchpad, unrelated memory blocks, unrelated RAG blocks, and parent-only tool access.

### Required assertions

`Required fixtures:`

* The delegated task contract and success criteria are explicit.
* The parent evidence set contains at least one irrelevant memory block and one irrelevant RAG block that must be excluded.
* The child budget is smaller than the parent budget.
* The runtime-approved child tool-set reference is narrower than the parent default tool pack.

`Required observability artifacts:`

* Parent reasoning-step record showing `spawn_subagent`.
* `SubagentContextRequest` ref and `SubagentContextPack` ref.
* Child snapshot inclusion record showing included relevant evidence and excluded unrelated evidence.
* Child snapshot or pack metadata showing `delegationId`, `parentRunId`, and `childRunId`.
* `RunTimeline`, `ExecutionGraph`, and `SubagentTree` views linking parent and child context artifacts.

`Required replay artifacts:`

* Parent snapshot ref and child snapshot ref.
* Delegation profile or request refs, child budget refs, and effective child tool-set ref.
* Replay-visible exclusion evidence for unrelated parent context.
* Child handoff refs included in the replay manifest or linked child manifest.

`Pass/fail oracle:`

* The child context is built as a new bounded snapshot, not as a raw parent prompt clone; only relevant evidence crosses the boundary; the effective child tool set is explicitly referenced; and replay can reconstruct the parent-to-child handoff from stored lineage refs.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode with fixed delegation decision
* Delegation-profile fixture service
* Seeded memory and RAG fixtures with relevant and irrelevant evidence
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` User waits for late retrieval evidence and Context Assembly rebuilds the snapshot on explicit retrieval refresh
* `Risk level:` Medium
* `Rationale:` Proves the explicit retrieval-refresh trigger end to end: newly arrived memory or RAG evidence must cause a fresh immutable snapshot with parent linkage, and only the newly admissible evidence may be added without disturbing higher-precedence layers or collapsing memory and RAG into one bucket.

### Contracts validated

* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime explicit retrieval-refresh trigger after new evidence arrival
* Layer 2: Context Assembly `step_refresh` ordering, parent snapshot linkage, and late-evidence admission rules
* Layer 2: Memory System and RAG Infrastructure retrieval provenance as consumed by refresh assembly
* Layer 2: Observability snapshot-lineage, inclusion-record, and replay-manifest completeness for refresh

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_context_refresh`, one open thread `thread_context_refresh`, one collaborative scope `scope_context_refresh`, and one parent snapshot already committed from the immediately previous reasoning step.
* Seeded policy rules: provide one applicable scope-policy block; no external action is requested.
* Seeded memory and retrieval stores: the first step starts with empty or incomplete retrieval results, then a deterministic late-arriving memory result and one deterministic RAG result become available before the next reasoning step.
* Selected model mode: recorded model adapter mode that waits for the retrieval refresh and then produces a final response using the refreshed snapshot.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or skill capability is required for this journey.
* Execution-space posture: no execution-space-backed action is requested.
* Approval or replay fixtures: no approval fixture is expected; replay capture must preserve the parent snapshot, refreshed snapshot, new evidence refs, and final output refs.

### Given / When / Then

Given a run has already produced one snapshot for the current turn but late memory and RAG evidence becomes available before the next reasoning step,
When Agent Runtime records an explicit retrieval refresh trigger and requests Context Assembly to rebuild from the parent snapshot plus the newly available evidence blocks,
Then Context Assembly emits a fresh immutable snapshot with `parentSnapshotId` set to the earlier snapshot, includes the newly admissible memory and RAG blocks in their canonical layers, and allows the next model step to use the refreshed context without mutating the original snapshot.

### Required assertions

`Required fixtures:`

* A parent snapshot exists before the retrieval refresh.
* The late-arriving memory block and RAG block both carry valid source refs and scope provenance.
* The refreshed budget is large enough to admit the new evidence without forcing mandatory-layer loss.

`Required observability artifacts:`

* One runtime event showing explicit retrieval refresh rather than generic trace activity.
* One parent snapshot ref and one child snapshot ref with parent linkage.
* One inclusion record showing the newly included memory and RAG blocks.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking the late evidence to the refreshed snapshot and next reasoning step.

`Required replay artifacts:`

* Parent snapshot ref and refreshed snapshot ref.
* Memory retrieval refs, RAG retrieval refs, and any query or corpus snapshot refs for the late evidence.
* Render-artifact refs and model input/output refs for the step that uses the refreshed snapshot.
* Replay evidence that the earlier snapshot remained immutable and reconstructable.

`Pass/fail oracle:`

* Retrieval refresh produces a new immutable snapshot with parent linkage, the late evidence appears only in the refreshed snapshot and only in its proper memory or RAG layer, and replay can reconstruct both the pre-refresh and post-refresh context states.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Retrieval fixture service that can release late memory and RAG evidence between steps
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Module black-box scenarios

## Scenario 7

### Scenario summary

* `Title:` Scope-mismatched blocks are excluded and recorded instead of leaking into the snapshot
* `Risk level:` High
* `Rationale:` Proves the subsystem’s fail-safe scope boundary directly: blocks from another scope, thread, run, or delegated task must not be silently admitted, and the exclusion must remain visible in the inclusion record.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Context Assembly scope filtering, source isolation, and leakage-prevention rules
* Layer 2: Memory System and RAG Infrastructure scope provenance contracts as consumed by Context Assembly
* Layer 2: Observability persisted inclusion/exclusion reporting

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run envelope for `user_scope_filter`, `thread_scope_filter`, and `scope_filter_A`.
* Seeded policy rules: no special approval or deny behavior; the key contract is scope-safe admission.
* Seeded memory and retrieval stores: one valid memory block for `scope_filter_A`, one invalid memory block from `scope_filter_B`, one valid RAG block for the current request, and one stale run-state block from another run instance.
* Selected model mode: not invoked; this scenario stops at assembly output.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a `ContextAssemblyInput` contains both valid current-scope blocks and invalid blocks whose scope or run lineage does not match the current run envelope,
When Context Assembly performs scope filtering before ordering and budgeting,
Then only the valid current-scope blocks remain eligible for the snapshot and every rejected block is preserved in the inclusion record with a scope-mismatch exclusion reason instead of being silently dropped.

### Required assertions

`Required fixtures:`

* At least one invalid block disagrees on collaborative scope.
* At least one invalid block disagrees on run identity or delegated-task boundary.
* The valid blocks are sufficient to produce a legal snapshot after exclusion.

`Required observability artifacts:`

* One inclusion record showing included current-scope blocks and excluded mismatched blocks.
* Exclusion reason codes for scope or lineage mismatch.
* One snapshot ref produced only from the valid blocks.
* Assembly logs or events that record scope filtering as part of the assembly lifecycle.

`Required replay artifacts:`

* Snapshot ref and inclusion record with explicit excluded block IDs.
* Source refs and scope metadata for included and excluded blocks.
* Replay evidence that excluded blocks never entered the final rendered artifact.

`Pass/fail oracle:`

* All mismatched blocks are excluded with recorded reason codes, no invalid block appears in the final ordered snapshot, and the resulting snapshot remains valid for replay and audit.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Fixture builder for canonical context blocks with controllable scope metadata
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Mandatory layers alone exceed budget and assembly fails with `budget_blocked`
* `Risk level:` High
* `Rationale:` Proves that Context Assembly must fail closed rather than weaken mandatory constraints when the irreducible mandatory set cannot fit inside the budget envelope.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Context Assembly mandatory budget reservation, explicit budget-blocked failure, and prohibition on dropping system or scope-policy blocks
* Layer 2: Agent Runtime larger-window or fail-step fallback trigger after assembly failure
* Layer 2: Observability error and budget reporting for failed assembly

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run envelope with mandatory system instructions, mandatory scope-policy blocks, mandatory user input, and minimal required run-state continuation whose combined token cost already exceeds the budget envelope after output reserve.
* Seeded policy rules: not applicable beyond the mandatory scope-policy layer being required.
* Seeded memory and retrieval stores: may be empty because optional evidence is not needed to trigger this failure.
* Selected model mode: not invoked because assembly must fail before model execution.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a `ContextAssemblyInput` whose mandatory layers alone cannot fit after the output reserve is subtracted from the model-input budget,
When Context Assembly performs budget reservation and finds no safe way to admit all mandatory content,
Then the subsystem returns an explicit `budget_blocked` failure instead of weakening mandatory instruction or scope-policy layers.

### Required assertions

`Required fixtures:`

* The token cost of the mandatory set is deterministically larger than the remaining budget after output reserve.
* Optional memory and RAG evidence are not necessary to trigger the failure.

`Required observability artifacts:`

* One assembly error record with code `budget_blocked`.
* One budget report or equivalent failure metadata explaining the shortfall.
* Runtime error or fallback event showing assembly blocked before model execution.

`Required replay artifacts:`

* Assembly input refs for the mandatory layers.
* Failure artifact or error ref with `budget_blocked`.
* Replay evidence that no weakened snapshot was committed for this failed assembly action.

`Pass/fail oracle:`

* Assembly fails explicitly with `budget_blocked`, no snapshot is emitted that omits or weakens required layers, and the failure metadata is sufficient for runtime and replay tooling to explain why assembly stopped.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Deterministic token-size fixture generator
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Missing mandatory layer causes assembly to fail closed with `missing_mandatory_layer`
* `Risk level:` High
* `Rationale:` Proves the subsystem’s contract-error posture directly: required layers such as system instructions, applicable scope-policy blocks, or mandatory user input cannot be synthesized away when absent.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 2: Context Assembly fail-closed conditions and `missing_mandatory_layer` error category
* Layer 2: Agent Runtime error-path handling before model execution
* Layer 2: Observability capture of assembly contract failure

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run envelope for a scoped run where a scope-policy layer is applicable.
* Seeded policy rules: the collaborative-scope policy block is required for this run.
* Seeded memory and retrieval stores: not relevant.
* Selected model mode: not invoked.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a scoped assembly input is missing one mandatory layer required by the current run, such as the applicable scope-policy block or mandatory user input,
When Context Assembly performs intake validation and mandatory-layer checks,
Then the subsystem fails closed with `missing_mandatory_layer` and does not emit a usable snapshot.

### Required assertions

`Required fixtures:`

* The run configuration makes the missing layer mandatory rather than optional.
* All other provided blocks are structurally valid so the failure is attributable to the missing required layer.

`Required observability artifacts:`

* One assembly error record with code `missing_mandatory_layer`.
* Runtime error-path event showing the step never reached model execution.
* Any audit metadata needed to identify which required layer was absent.

`Required replay artifacts:`

* Assembly input refs identifying the provided layers.
* Failure artifact or error ref carrying `missing_mandatory_layer`.
* Replay evidence that no snapshot or render artifact was committed for the failed attempt.

`Pass/fail oracle:`

* Assembly stops with `missing_mandatory_layer`, no snapshot is emitted, and the failure artifacts clearly identify that a required context layer was absent.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Fixture builder for mandatory-layer omission
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Missing thread summary and empty memory/RAG continue in visible degraded mode
* `Risk level:` Low
* `Rationale:` Proves the subsystem’s degraded-but-allowed posture: absence of optional or recoverably missing upstream evidence should not fail the run, but the degradation must remain visible in the resulting metadata.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 2: Context Assembly degraded-but-allowed rules for missing thread summary and empty evidence layers
* Layer 2: Agent Runtime run-start behavior with minimal viable context
* Layer 2: Observability degraded-mode visibility in assembly metadata

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one new or thin thread `thread_context_degraded` with no available thread summary yet and deterministic config allowing no-tool model-only handling.
* Seeded policy rules: one applicable scope-policy block remains present.
* Seeded memory and retrieval stores: both return empty result sets.
* Selected model mode: recorded model adapter mode that answers from the remaining context.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or skill capability is required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a new or sparsely populated thread where no thread summary exists yet and both memory retrieval and RAG retrieval return empty results,
When runtime requests `run_start` assembly with system instructions, scope policy, agent profile, current user input, and minimal run-state continuation,
Then Context Assembly produces a valid snapshot in degraded mode, marks the missing thread summary and empty evidence layers in output metadata, and allows the run to continue.

### Required assertions

`Required fixtures:`

* The current user input is present and valid.
* The scope-policy layer is present.
* Thread summary, memory, and RAG are empty or missing only in the ways the document allows as degraded-not-fatal.

`Required observability artifacts:`

* One snapshot ref with included system, scope-policy, agent-profile, user-input, and run-state layers.
* One inclusion record showing the absence of memory and RAG blocks without recording them as contract errors.
* Degraded-mode metadata or equivalent assembly status visible in logs or snapshot metadata.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking degraded assembly to the subsequent model step.

`Required replay artifacts:`

* Snapshot ref, inclusion record, and budget report for the degraded run-start assembly.
* Model input and output refs for the model-only response.
* Replay evidence showing that missing optional evidence did not force a synthesized or mislabeled memory/RAG layer.

`Pass/fail oracle:`

* Assembly succeeds despite missing thread summary and empty memory/RAG, the degraded posture is explicitly visible, and the resulting snapshot contains only the valid remaining layers without inventing evidence.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Empty memory and RAG fixture services
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Optional evidence with missing provenance is excluded and recorded instead of entering the snapshot
* `Risk level:` High
* `Rationale:` Proves that provenance validation is enforced at the evidence boundary: optional memory or RAG blocks that lack required source references must be excluded with an auditable reason code rather than being silently admitted or upgraded into trusted context.

### Contracts validated

* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Context Assembly provenance validation and `excluded_missing_provenance` handling
* Layer 2: Memory System and RAG Infrastructure provenance contracts as consumed by Context Assembly
* Layer 2: Observability persisted inclusion and exclusion reporting

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid run envelope for `user_missing_provenance`, `thread_missing_provenance`, and `scope_missing_provenance`.
* Seeded policy rules: one applicable scope-policy block is present; no approval behavior is relevant.
* Seeded memory and retrieval stores: one valid memory block, one valid RAG block, and one additional optional evidence block whose scope metadata is correct but whose required provenance fields are missing or null.
* Selected model mode: not invoked; this scenario stops at assembly output.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a `ContextAssemblyInput` contains otherwise admissible optional evidence whose required provenance is missing,
When Context Assembly validates provenance before final ordering and budgeting,
Then the invalid optional block is excluded from the snapshot and the inclusion record captures `excluded_missing_provenance` instead of silently trusting the block.

### Required assertions

`Required fixtures:`

* At least one optional evidence block lacks the required source or provenance fields.
* The remaining valid blocks are sufficient to produce a legal snapshot after exclusion.

`Required observability artifacts:`

* One inclusion record showing the invalid block excluded with `excluded_missing_provenance`.
* One valid snapshot ref produced from the remaining admissible blocks.
* Assembly logs or events showing provenance validation before render.

`Required replay artifacts:`

* Snapshot ref and inclusion record with the excluded block ID and exclusion reason.
* Source refs for the valid included blocks.
* Replay evidence that the provenance-deficient block never entered the render artifacts.

`Pass/fail oracle:`

* The provenance-deficient optional block is excluded with the correct reason code, no render artifact includes it, and the final snapshot remains replay-safe and auditable.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Fixture builder for optional evidence blocks with controllable provenance fields
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Policy-shaped user or run-state input is excluded instead of overriding higher-precedence layers
* `Risk level:` High
* `Rationale:` Proves the precedence-safety boundary directly: user input or run-state blocks that attempt to restate or override system or scope-policy instructions must not be admitted as effective policy and must be recorded as policy-input exclusions.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Context Assembly precedence rules and `excluded_policy_input` handling
* Layer 2: Agent Runtime separation between task input, working state, and higher-precedence policy layers
* Layer 2: Observability persisted exclusion reasoning

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid run envelope where a scope-policy block is applicable and must remain authoritative.
* Seeded policy rules: the active scope-policy block constrains the run in a way that a user-input or run-state block tries to bypass.
* Seeded memory and retrieval stores: not material to the failure condition.
* Selected model mode: not invoked; this scenario stops at assembly output.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a `ContextAssemblyInput` includes a user-input or run-state block that tries to inject policy-like instructions that conflict with the system or scope-policy layers,
When Context Assembly validates block admissibility and precedence before rendering,
Then the conflicting block is excluded with `excluded_policy_input` and the authoritative higher-precedence layers remain unchanged in the final snapshot.

### Required assertions

`Required fixtures:`

* The scenario includes one authoritative scope-policy or system block and one lower-precedence block that conflicts with it.
* The remaining admitted blocks are sufficient to produce a legal snapshot.

`Required observability artifacts:`

* One inclusion record showing the conflicting lower-precedence block excluded with `excluded_policy_input`.
* One snapshot ref whose authoritative policy layers remain unchanged.
* Assembly lifecycle events showing exclusion happened before render and model execution.

`Required replay artifacts:`

* Snapshot ref and inclusion record containing the excluded block ID and reason code.
* Source refs for the authoritative system or scope-policy blocks that remained in force.
* Replay evidence that no render artifact admitted the excluded policy-shaped input.

`Pass/fail oracle:`

* The conflicting user-input or run-state block is excluded with `excluded_policy_input`, the higher-precedence layers remain authoritative, and replay can prove that the model never saw the excluded policy-shaped input as active context.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Fixture builder for conflicting policy and user/run-state blocks
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Contradictory scope metadata fails closed with `invalid_scope_envelope`
* `Risk level:` High
* `Rationale:` Proves the subsystem’s fail-closed envelope validation: when the run, thread, scope, or delegation metadata is contradictory or incomplete, Context Assembly must stop rather than guessing which boundary should win.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Context Assembly intake validation and `invalid_scope_envelope` error category
* Layer 2: Agent Runtime error-path handling before model execution
* Layer 2: Observability assembly-error visibility for contradictory envelopes

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one assembly request whose run envelope carries contradictory identity or lineage metadata, such as mismatched `threadId` and `collaborativeScopeId` ownership or a delegated-task marker that conflicts with the current run.
* Seeded policy rules: not directly relevant beyond requiring the current scope to be well-formed.
* Seeded memory and retrieval stores: not relevant to the failure condition.
* Selected model mode: not invoked because assembly must fail before the next step.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: no approval fixture is expected.

### Given / When / Then

Given a `ContextAssemblyInput` arrives with contradictory or incomplete scope-envelope metadata,
When Context Assembly validates the run, thread, scope, and delegation boundaries before any ordering or budgeting work,
Then the subsystem fails closed with `invalid_scope_envelope` and does not emit a snapshot that would guess past the contradiction.

### Required assertions

`Required fixtures:`

* The contradictory envelope is deterministic and attributable to one explicit metadata conflict.
* All provided blocks are otherwise structurally valid so the failure is attributable to the envelope contradiction.

`Required observability artifacts:`

* One assembly error record with code `invalid_scope_envelope`.
* One runtime error-path event showing the step never reached ordering, budgeting, or model execution.
* Audit metadata identifying the contradictory envelope fields.

`Required replay artifacts:`

* Assembly input ref containing the contradictory envelope metadata.
* Failure artifact or error ref carrying `invalid_scope_envelope`.
* Replay evidence that no snapshot or render artifact was committed after envelope validation failed.

`Pass/fail oracle:`

* Assembly fails with `invalid_scope_envelope`, no snapshot is emitted, and the stored failure artifacts make the boundary contradiction explicit rather than silently picking one side of the conflict.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Fixture builder for contradictory scope-envelope metadata
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 14

### Scenario summary

* `Title:` Resume or refresh with an invalid parent snapshot reference fails closed with `replay_snapshot_missing`
* `Risk level:` High
* `Rationale:` Proves replay-lineage integrity at the Context Assembly boundary: when a required parent snapshot or replay lineage ref cannot be resolved, the subsystem must stop rather than emitting a synthetic best-guess snapshot.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Context Assembly snapshot-lineage rules, replay position, and `replay_snapshot_missing` error category
* Layer 2: Agent Runtime resume/refresh error-path handling
* Layer 2: Observability replay-manifest and assembly-error visibility

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one resumable or refreshable run whose next assembly action declares a parent snapshot ref.
* Seeded policy rules: not directly relevant.
* Seeded memory and retrieval stores: available if needed, but not sufficient to bypass missing replay lineage.
* Selected model mode: not invoked because assembly must fail before the next step.
* Selected tool implementations: none invoked.
* Expected capability set: none required.
* Execution-space posture: no execution-space-backed action is required.
* Approval or replay fixtures: the declared parent snapshot ref is intentionally corrupted, deleted, or otherwise unresolved in the deterministic fixture store.

### Given / When / Then

Given a resume or refresh assembly action depends on a parent snapshot reference that should exist for lineage and replay,
When Context Assembly attempts to resolve that required lineage reference and cannot,
Then the subsystem fails closed with `replay_snapshot_missing` instead of emitting a reconstructed snapshot that would hide the lineage gap.

### Required assertions

`Required fixtures:`

* The current assembly action declares a required parent snapshot ref.
* The referenced parent snapshot cannot be resolved by the replay fixture store.
* All other assembly inputs are valid so the failure is attributable to replay-lineage loss.

`Required observability artifacts:`

* One assembly error record with code `replay_snapshot_missing`.
* One runtime error or blocked-resume event showing the run cannot safely continue from this boundary.
* Replay or audit metadata identifying the missing parent snapshot ref.

`Required replay artifacts:`

* The broken parent snapshot reference itself.
* Failure artifact or error ref carrying `replay_snapshot_missing`.
* Replay evidence that no replacement snapshot was committed after lineage resolution failed.

`Pass/fail oracle:`

* Assembly fails with `replay_snapshot_missing`, no new snapshot is emitted, and the error artifacts make the broken replay lineage explicit rather than silently falling back to a synthetic snapshot.

### Required harness capabilities

* Context-assembly black-box driver for `Assemble`
* Replay-lineage fixture store with controllable missing refs
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module coverage by scenario

| Scenario | Test style | Primary contract cluster | Required modules under test |
| --- | --- | --- | --- |
| Scenario 1 | user journey | strict ordering and memory/RAG separation | Identity and Thread Management, Agent Runtime, Context Assembly, Memory System, RAG Infrastructure, Observability |
| Scenario 2 | user journey | model-window-triggered compaction | Agent Runtime, Context Assembly, Memory System, RAG Infrastructure, Observability |
| Scenario 3 | user journey | resume snapshot lineage | Agent Runtime, Identity and Thread Management, Context Assembly, Observability |
| Scenario 4 | user journey | step refresh and bounded run state | Agent Runtime, Context Assembly, Tool Execution Framework, Observability |
| Scenario 5 | user journey | bounded subagent pack | Agent Runtime, Context Assembly, Subagent Profiles and Delegation Contracts, Observability |
| Scenario 6 | user journey | explicit retrieval refresh and immutable parent linkage | Agent Runtime, Context Assembly, Memory System, RAG Infrastructure, Observability |
| Scenario 7 | module black-box | scope filtering and leakage prevention | Context Assembly, Memory System, RAG Infrastructure, Observability |
| Scenario 8 | module black-box | irreducible budget failure | Context Assembly, Agent Runtime, Observability |
| Scenario 9 | module black-box | missing mandatory layer | Context Assembly, Agent Runtime, Observability |
| Scenario 10 | module black-box | degraded-but-allowed assembly | Agent Runtime, Context Assembly, Observability |
| Scenario 11 | module black-box | provenance exclusion for optional evidence | Context Assembly, Memory System, RAG Infrastructure, Observability |
| Scenario 12 | module black-box | exclusion of policy-shaped lower-precedence input | Context Assembly, Agent Runtime, Observability |
| Scenario 13 | module black-box | contradictory scope envelope failure | Context Assembly, Agent Runtime, Observability |
| Scenario 14 | module black-box | replay-lineage integrity failure | Context Assembly, Agent Runtime, Observability |

## Coverage notes by module

* `Context Assembly`: covered for strict ordering, provenance validation, scope filtering, budget reservation, model-window-triggered compaction, degraded-mode continuation, immutable snapshot lineage, bounded child-pack construction, and policy-input exclusion.
* `Agent Runtime`: covered for run-start assembly, model-window change, step refresh, explicit retrieval refresh, resume-triggered reassembly, subagent handoff preparation, and error handling when assembly cannot safely produce a snapshot.
* `Memory System`: covered as a distinct upstream evidence source whose retrieval outputs must remain separate from RAG in both snapshot structure and replay.
* `RAG Infrastructure`: covered as a distinct retrieval layer with snapshot and citation provenance that must not collapse into memory semantics.
* `Identity and Thread Management`: covered where `PreRunEnvelope` becomes `RunEnvelope` at run start and where resume paths must reuse persisted identity metadata instead of re-running inbound resolution.
* `Subagent Profiles and Delegation Contracts`: covered where delegated tasks require a bounded child context with explicit evidence slices, child budgets, and explicit exclusions.
* `Observability, Replay, and Cost Control`: required in every scenario for snapshot refs, inclusion records, budget reports, run views, checkpoint refs where applicable, and replay-manifest completeness.
