# Basic User Journey Test Scripts

This document converts the seven approved scenarios in `Basic.User.Journey.Cases.md` into deterministic executable black-box test specifications.
Each script uses only approved scenario requirements plus documented Smartclaw harness and contract surfaces.

## Script 1

### Test name

Model-only chat reply on an existing thread

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 1
* Approved title: `Inbound chat to model-only response`
* Primary contracts: identity propagation, recoverable run lifecycle, observable execution, executable capability exposure, replay-visible inbound-to-response flow

### Harness capabilities used

* synthetic chat channel driver
* identity and thread fixture service
* recorded or golden model adapter mode
* run-state inspection
* trace inspection through `RunTimeline`, `ExecutionGraph`, and `RunSummary`
* replay verification
* seeded empty memory store
* seeded empty retrieval corpus fixture

### Fixture setup

* Seed one verified chat user, one open canonical thread, and one active collaborative scope.
* Seed deterministic system, environment, scope, agent, channel, user, and run configuration for the test scope.
* Seed policy fixtures that allow runtime start and final outbound response handling for the synthetic chat channel and expose no extra capabilities.
* Seed empty memory and retrieval stores so any inclusion record can prove both evidence sources are unused and distinct.
* Configure the recorded or golden model adapter to return exactly one model-only completion and no tool, skill, or subagent decision.
* Prepare trace collection and replay capture for the full run.

### Test procedure

1. Inject one canonical inbound chat event through the synthetic channel driver with a stable provider payload ref and an existing provider-to-user identity linkage.
2. Wait for identity and thread resolution to return `resolutionDisposition = "start_run"` with a runnable `RuntimeStartEnvelope`.
3. Inspect the runtime start handoff and confirm a `PreRunEnvelope` exists before run creation.
4. Wait for the runtime to create the run, assemble context, open one reasoning step, call model access, and reach `completed`.
5. Inspect the synthetic outbound response emitted for the chat channel.
6. Inspect the run record for identity resolution, thread resolution, lifecycle events, reasoning-step record, capability exposure decision, context snapshot ref, and final output ref.
7. Inspect the materialized `RunTimeline`, `ExecutionGraph`, and `RunSummary`.
8. Inspect the replay manifest and linked artifacts for the single reasoning step.

### Assertions

* Visible output: the final outbound chat response matches the recorded model-only completion and is linked to the original inbound event.
* Lifecycle and checkpoints: one run is created from the inbound event, the run transitions through create and running to completed, one reasoning step is recorded, and checkpoint evidence exists after context assembly or the configured step boundary plus terminal completion.
* Capability exposure: the effective tool set for the reasoning step is empty, and no tool, skill, or child-run execution record exists.
* Context and prompt evidence: a context snapshot ref exists for the step and shows no admitted memory or RAG evidence for this run.
* Trace and observability: canonical inbound envelope ref, provider payload ref, identity resolution record, thread resolution record, reasoning-step record, capability exposure decision, final output ref, `RunTimeline`, `ExecutionGraph`, and `RunSummary` are all present.

### Replay checks

* Verify the replay manifest declares deterministic replay support for the run.
* Verify the manifest links the context snapshot ref, model input ref, model output ref, checkpoint ref, and final output ref for the single step.
* Verify replay reconstruction does not require any tool, skill, memory-write, or child-run artifact.

### Cleanup

* Reset the synthetic chat event and outbound message fixtures.
* Clear the recorded model fixture for this test case.
* Remove trace and replay artifacts created only for this test run.

### Missing harness capabilities / blockers

None

## Script 2

### Test name

Allowed read-only tool call from chat

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 2
* Approved title: `Inbound chat to allowed deterministic tool use and response`
* Primary contracts: policy-first tool execution, recoverable run boundaries, observable tool path, executable capability exposure, replay-authoritative tool evidence

### Harness capabilities used

* synthetic chat channel driver
* identity and thread fixture service
* recorded model adapter mode with fixed tool-call sequence
* deterministic tool harness with schema validation
* policy fixture service with exact request-hash matching
* run-state inspection
* checkpoint inspection
* trace inspection
* replay verification

### Fixture setup

* Seed one verified chat user, one open thread, and deterministic configuration for the run scope.
* Seed policy fixtures that allow one exact low-risk read-only `tool_execution` request and deny all other tool executions.
* Seed empty or unused memory and retrieval stores.
* Seed one deterministic read-only tool descriptor with immutable version, valid schema, and a lab adapter that records each invocation.
* Configure runtime-facing tool availability so the seeded tool is the only member of the effective tool set.
* Configure the recorded model adapter to emit exactly one tool request followed by one final response after the tool result.
* Enable trace, checkpoint, and replay capture for both reasoning steps.

### Test procedure

1. Inject one canonical inbound chat event whose recorded-model behavior requires the seeded read-only tool.
2. Wait for identity and thread resolution to produce a runnable start outcome and for runtime to open the first reasoning step.
3. Inspect the first step capability exposure record and confirm the seeded tool is the only exposed executable capability.
4. Wait for the model result that requests the tool, then inspect the bound policy evaluation for the exact `tool_execution` request hash.
5. Inspect the pre-action checkpoint created before tool dispatch.
6. Wait for the deterministic tool harness to execute once and return a normalized result.
7. Wait for runtime to continue to the final response step and reach `completed`.
8. Inspect the outbound chat response, tool invocation record, policy decision record, checkpoint evidence, and run views.
9. Inspect the replay manifest and linked model, policy, tool, checkpoint, and final-output refs.

### Assertions

* Visible output: the final outbound response matches the recorded post-tool completion and reflects the deterministic tool result.
* Lifecycle and checkpoints: the run reaches completed, the tool path is represented by a tool-request step followed by a final-response step, and a pre-action checkpoint exists before tool execution.
* Policy and approval: a replay-visible `allow` decision exists for the exact tool request before tool dispatch, and no approval wait or approval artifact appears in this scenario.
* Capability exposure: the effective tool set contains exactly the seeded read-only tool, and the executed tool id and version match the exposed descriptor.
* Side effects: the tool harness records exactly one invocation and one normalized result for the request.
* Trace and observability: the run record contains capability exposure, policy evaluation, checkpoint, tool invocation, final output, `RunTimeline`, `ExecutionGraph`, and `RunSummary` with policy-before-tool ordering.

### Replay checks

* Verify the replay manifest includes model inputs and outputs for the tool-request step and the final-response step.
* Verify the manifest includes the policy snapshot ref, policy decision ref, tool request ref, tool result ref, checkpoint refs, and final output ref.
* Verify replay can reconstruct the tool path without inventing missing policy or tool evidence.

### Cleanup

* Reset the synthetic chat event and outbound message fixtures.
* Reset the deterministic tool adapter invocation log.
* Clear the recorded model and policy fixtures used for this test case.
* Remove trace, checkpoint, and replay artifacts created only for this test run.

### Missing harness capabilities / blockers

None

## Script 3

### Test name

Email reply forced onto a new thread by higher-precedence scope config

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 3
* Approved title: `Inbound reply resolves thread outcome from layered configuration precedence`
* Primary contracts: predictable configuration precedence, identity propagation, observable thread decisioning, recoverable inbound-to-run start path

### Harness capabilities used

* synthetic email channel driver
* identity and thread fixture service
* layered configuration fixture service with source refs and precedence control
* scope-membership fixture service
* recorded model adapter mode
* run-state inspection
* trace inspection
* replay verification

### Fixture setup

* Seed one verified email user, one recent open canonical thread in `scope-A`, and one inbound event that resolves to `scope-B`.
* Seed system, channel, user, and collaborative-scope configuration layers so lower-precedence settings allow continuity but the higher-precedence collaborative-scope setting `forceNewThreadOnScopeChange = true` is active for `scope-B`.
* Seed policy fixtures that allow same-user runtime start in `scope-B` and deny any cross-scope data reuse needed to keep using the old thread.
* Seed no tool, memory, or retrieval fixtures for this scenario.
* Configure the recorded model adapter to return one model-only completion on the newly resolved thread.
* Enable trace and replay capture for inbound resolution, config selection, and the first runtime step.

### Test procedure

1. Inject one canonical inbound email reply event whose lower-precedence continuity hints would normally support reuse of the recent thread in `scope-A`.
2. Wait for identity resolution to match the canonical user.
3. Inspect scope resolution and confirm the inbound interaction resolves to `scope-B` before runtime start.
4. Inspect the thread resolution outcome and the effective configuration snapshot or source refs used for the decision.
5. Wait for identity and thread management to return `resolutionDisposition = "start_run"` with `sessionState = "created"` and a `PreRunEnvelope` containing the new `threadId`.
6. Wait for runtime to start on the new thread and reach `completed`.
7. Inspect the outbound email response, runtime start evidence, run views, and replay manifest.

### Assertions

* Visible output: the response is produced for the inbound email on the newly created canonical thread in `scope-B`.
* Lifecycle and checkpoints: runtime starts only after a runnable `PreRunEnvelope` is produced, the new `threadId` is carried into the run, and the run reaches completed on the new thread.
* Policy and approval: no cross-scope reuse path is taken for the old thread in `scope-A`.
* Capability exposure: no tool or child capability is exposed for the reasoning step.
* Trace and observability: canonical inbound envelope ref, identity resolution record, scope-resolution evidence, thread-resolution record with `outcome = "created"`, applied config snapshot refs, runtime start evidence, `RunTimeline`, `ExecutionGraph`, and `RunSummary` are present.

### Replay checks

* Verify the replay artifacts include inbound payload ref, canonical inbound envelope ref, config snapshot refs showing the applied precedence order, identity and thread resolution refs with reason codes, model input and output refs for the first step, and the replay manifest.
* Verify replay of the ingress decision path does not rely on live re-inference of configuration precedence.

### Cleanup

* Reset the synthetic email event and outbound message fixtures.
* Remove the temporary configuration overrides used only for this test case.
* Remove trace and replay artifacts created only for this run.

### Missing harness capabilities / blockers

None

## Script 4

### Test name

Email reply attaches to the existing canonical thread

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 4
* Approved title: `Inbound email reply attaches to existing canonical thread`
* Primary contracts: identity propagation, observable thread attachment, recoverable start path on an existing conversation, thread-summary inclusion in context

### Harness capabilities used

* synthetic email channel driver
* identity and thread fixture service with provider-thread bindings
* recorded model adapter mode
* thread-summary fixture loader
* run-state inspection
* trace inspection
* replay verification

### Fixture setup

* Seed one verified email account linked to one canonical user.
* Seed one active `ProviderThreadBinding`, one open canonical thread, and one stored thread summary for that thread.
* Seed deterministic configuration resolved before runtime start.
* Seed policy fixtures that allow same-scope runtime start and outbound email response handling.
* Configure the recorded model adapter to require the seeded thread summary and produce one model-only completion.
* Enable trace and replay capture for inbound normalization, thread attachment, context assembly, and final output.

### Test procedure

1. Inject one canonical inbound email reply event whose `providerThreadKey` and verified sender account match the seeded active binding.
2. Wait for identity resolution to match the pre-seeded canonical user.
3. Wait for thread resolution to return `outcome = "attached"` and a runnable `RuntimeStartEnvelope`.
4. Inspect the returned `PreRunEnvelope` and confirm it carries the existing `threadId`.
5. Wait for runtime to create a new run on that thread, assemble context, include the stored thread summary, and reach `completed`.
6. Inspect the outbound response and the run record.
7. Inspect the context snapshot, run views, and replay manifest.

### Assertions

* Visible output: the outbound email response is produced on the existing conversation path.
* Lifecycle and checkpoints: the inbound event resolves to `resolutionDisposition = "start_run"` with an attached thread outcome, runtime creates a new run on that thread, and no replacement thread is created.
* Capability exposure: no tool or child capability is exposed for the reasoning step.
* Context and prompt evidence: the context snapshot includes the stored thread summary with provenance tied to the seeded thread summary fixture.
* Trace and observability: canonical inbound envelope ref, identity resolution record, thread resolution record with `outcome = "attached"`, runtime start evidence, context snapshot ref, final output ref, `RunTimeline`, `ExecutionGraph`, and `RunSummary` are present.

### Replay checks

* Verify replay artifacts include provider payload ref, inbound envelope ref, identity and thread audit refs, context snapshot ref with thread summary provenance, model input and output refs, checkpoint evidence, and the replay manifest.
* Verify replay reconstructs the attached-thread path rather than creating a replacement thread.

### Cleanup

* Reset the synthetic email event and outbound message fixtures.
* Reset the provider-thread binding and thread-summary fixtures only if the harness marks them temporary for this test.
* Remove trace and replay artifacts created only for this run.

### Missing harness capabilities / blockers

None

## Script 5

### Test name

Memory retrieval and RAG evidence stay separate in one answer

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 5
* Approved title: `Inbound request uses memory retrieval and RAG evidence without conflation`
* Primary contracts: memory-vs-retrieval separation, identity propagation, observable retrieval-backed reasoning, replay-visible evidence layering

### Harness capabilities used

* synthetic chat channel driver
* identity and thread fixture service
* seeded memory store with provenance-preserving retrieval
* seeded retrieval corpus and snapshot fixture service
* recorded model adapter mode
* run-state inspection
* trace inspection
* replay verification

### Fixture setup

* Seed one user, one open thread, one collaborative scope, and deterministic configuration for the run.
* Seed policy fixtures that allow same-scope memory retrieval and access to one seeded retrieval corpus and deny any memory write during the test.
* Seed one live memory record with explicit provenance in the allowed scope.
* Seed one retrieval corpus snapshot with relevant chunks and citations for the same user question.
* Configure the recorded model adapter to expect both evidence sources in separate context layers and return one evidence-based response.
* Expose no tool capability for the reasoning step.
* Enable trace and replay capture for memory reads, retrieval queries, context assembly, model call, and final output.

### Test procedure

1. Inject one canonical inbound chat event whose question requires both the seeded memory preference and the seeded retrieval corpus evidence.
2. Wait for runtime to create the run and request one memory retrieval and one retrieval query during context assembly.
3. Inspect the memory query record and `MemoryQueryResult`.
4. Inspect the retrieval query ref, retrieval result snapshot ref, rerank metadata, and citation-packaging refs.
5. Inspect the assembled context snapshot and inclusion record.
6. Wait for the recorded model completion and for the run to reach `completed`.
7. Inspect the outbound response, run views, and the absence of any memory candidate or memory-write artifact.
8. Inspect the replay manifest and linked memory, retrieval, context, and model refs.

### Assertions

* Visible output: the final response reflects the seeded scoped preference and cites the retrieved document evidence.
* Lifecycle and checkpoints: the run completes without any tool call or memory write path.
* Capability exposure: no extra tool capability is exposed for the reasoning step.
* Context and prompt evidence: the context snapshot preserves the strict ordering of `memory_retrieval` before `rag_results`, and the two evidence groups remain separate with distinct provenance.
* Side effects: no memory candidate, memory write request, or memory write artifact is created during the run.
* Trace and observability: memory query record, `MemoryQueryResult`, retrieval query ref, corpus snapshot ref, citation refs, context snapshot ref, final output ref, `RunTimeline`, `ExecutionGraph`, and `RunSummary` are all present.

### Replay checks

* Verify replay artifacts include the memory query ref and result ref, retrieval query ref, retrieval result snapshot ref, citation refs, context snapshot ref with inclusion provenance, model input and output refs, and the replay manifest.
* Verify replay reconstruction preserves separate memory and retrieval evidence instead of collapsing them into one evidence class.

### Cleanup

* Reset the synthetic chat event and outbound message fixtures.
* Reset the seeded retrieval query and memory retrieval result fixtures if they are marked temporary.
* Remove trace and replay artifacts created only for this run.

### Missing harness capabilities / blockers

None

## Script 6

### Test name

Explicit user request writes one scoped memory preference

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 6
* Approved title: `Explicit user memory request persists a scoped preference`
* Primary contracts: policy-first memory write, memory-vs-retrieval separation, observable memory mutation, replay-visible candidate-to-write path

### Harness capabilities used

* synthetic chat channel driver
* identity and thread fixture service
* memory candidate and write-path fixture service
* policy fixture service for `memory_write`
* recorded model adapter mode
* run-state inspection
* trace inspection
* replay verification

### Fixture setup

* Seed one user, one open thread, and deterministic configuration for the run.
* Seed policy fixtures that allow same-user, same-scope explicit memory writes for one preference record and deny any cross-scope write.
* Seed the target memory scope with no conflicting active preference record.
* Configure the runtime memory-candidate path to emit one `user_explicit` candidate for the inbound request.
* Configure the recorded model adapter to return one acknowledgement after the governed memory-write path succeeds.
* Expose no tool capability for the reasoning step.
* Enable trace and replay capture for memory candidate creation, policy evaluation, write result, created memory record, and final acknowledgement.

### Test procedure

1. Inject one canonical inbound chat event that explicitly asks the platform to remember a personal preference in the user scope.
2. Wait for runtime to create the run and emit one `user_explicit` memory candidate for the request.
3. Inspect the memory candidate ref and confirm the target scope and memory type.
4. Inspect the exact `memory_write` policy evaluation for the candidate batch or write request.
5. Wait for the Memory System to classify, validate, conflict-check, score, and persist the candidate as a live scoped record.
6. Wait for runtime to complete with the recorded acknowledgement.
7. Inspect the created memory record ref, write result ref, outbound response, run views, and replay manifest.

### Assertions

* Visible output: the outbound response matches the recorded acknowledgement after the governed write succeeds.
* Policy and approval: a replay-visible `allow` decision exists for the exact `memory_write` request before the persistent write occurs.
* Capability exposure: no tool capability is required or exposed for the step.
* Side effects: exactly one live memory record is created in the intended scope, the record carries explicit trust, retention, and provenance metadata, and no cross-scope or duplicate write artifact exists.
* Trace and observability: memory candidate ref, write request ref, policy decision ref, memory write result with `status = "written"`, created `memoryId`, runtime linkage to the final acknowledgement, `RunTimeline`, `ExecutionGraph`, and `RunSummary` are present.

### Replay checks

* Verify replay artifacts include the memory candidate ref with provenance, policy snapshot ref, policy decision ref, memory write result ref, created memory record ref, model input and output refs for the acknowledgement step, and the replay manifest.
* Verify replay can reconstruct the write path without depending on reconstructed guesses or a live rescan of current memory state.

### Cleanup

* Reset the synthetic chat event and outbound message fixtures.
* Delete or tombstone the created test memory record if the harness marks it temporary.
* Clear the recorded model and policy fixtures used only for this case.
* Remove trace and replay artifacts created only for this run.

### Missing harness capabilities / blockers

None

## Script 7

### Test name

Bounded child analysis run joins back into the parent response

### Scenario reference

* Source: `Basic.User.Journey.Cases.md` Scenario 7
* Approved title: `Complex request delegates bounded analysis to one child run`
* Primary contracts: bounded delegation, observable parent-child lineage, identity propagation across child runs, replay-visible child handoff and merge

### Harness capabilities used

* synthetic chat channel driver
* identity and thread fixture service
* recorded parent and child model adapter mode
* delegation profile fixture resolver
* child-run orchestration harness
* run-state inspection
* trace inspection through `RunTimeline`, `ExecutionGraph`, `SubagentTree`, and `RunSummary`
* replay verification
* optional seeded evidence fixture service for child handoff packs

### Fixture setup

* Seed one user, one open thread, and deterministic configuration for the run.
* Seed policy fixtures that allow one same-scope bounded child spawn using `delegation.analysis.default@v1` and deny broader child profiles, cross-scope spawn, nested delegation beyond the configured depth, or any direct child publication path.
* Seed optional parent evidence and exactly selected child evidence refs, plus unrelated evidence that must remain excluded from the child pack.
* Configure recorded parent and child model behavior so the parent emits one `spawn_subagent` decision, the child returns one structured result artifact, and the parent finalizes using that artifact.
* Seed the delegation profile resolver so the child tool profile and route profile resolve to the documented delegated refs and not to `platform.head.default`.
* Enable trace, checkpoint, and replay capture for parent reasoning, policy evaluation for spawn, child creation, child lifecycle, merge, and final output.

### Test procedure

1. Inject one canonical inbound chat event whose approved deterministic path requires bounded delegated analysis.
2. Wait for the parent run to create the first reasoning step and emit `spawn_subagent`.
3. Inspect the spawn request and confirm it carries explicit objective, success criteria, budget, child route profile ref, child tool profile ref, inheritance mode, and merge contract.
4. Inspect the exact `subagent_spawn` policy evaluation and wait for the runtime to create the child run only after the decision permits it.
5. Inspect the bounded child context pack and confirm it uses `summary_plus_evidence` mode.
6. Wait for the child run to execute with the delegated profile, produce one structured result artifact, and reach its terminal state.
7. Wait for the parent run to join the child result, merge it, produce the final user response, and reach `completed`.
8. Inspect the parent and child run records, capability refs, child result artifact, merge event, `RunTimeline`, `ExecutionGraph`, `SubagentTree`, `RunSummary`, and linked replay manifests.

### Assertions

* Visible output: only the parent run emits the final user-visible response, and that response is produced after the child result is merged.
* Lifecycle and checkpoints: exactly one child run is created from the parent spawn decision, parent and child lifecycle ordering is visible, and parent and child checkpoint refs preserve creation and join order.
* Policy and approval: policy evaluation for `subagent_spawn` occurs before child creation and is bound to the exact spawn request.
* Capability exposure: the child tool profile is a delegated subset, not `platform.head.default`, and the child route profile ref matches the resolved delegation profile.
* Context and prompt evidence: the child context pack uses `summary_plus_evidence`, includes delegated objective and limits, and excludes the full parent scratchpad plus unrelated evidence blocks.
* Delegation: the child request preserves explicit task bounds, success criteria, budget, inheritance mode, and merge contract, and no nested delegation beyond the configured depth occurs.
* Trace and observability: parent reasoning-step record with `spawn_subagent`, child creation record, child lifecycle events, child result artifact ref, parent merge event, `RunTimeline`, `ExecutionGraph`, `SubagentTree`, and `RunSummary` are present and linked by lineage refs.

### Replay checks

* Verify replay artifacts include parent and child model input and output refs, child context pack ref, delegated evidence refs, delegation profile ref, child capability refs, policy decision ref, child result artifact ref, parent merge ref, parent and child checkpoint refs, and linked replay manifests.
* Verify replay reconstruction preserves child creation and join ordering and does not imply that the child inherited the full parent scratchpad.

### Cleanup

* Reset the synthetic chat event and outbound message fixtures.
* Reset the recorded parent and child model fixtures.
* Reset delegated evidence-pack fixtures and child-run orchestration fixtures created only for this case.
* Remove trace, checkpoint, and replay artifacts created only for this test run.

### Missing harness capabilities / blockers

None
