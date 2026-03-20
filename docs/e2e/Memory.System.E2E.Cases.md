# Memory System E2E Cases

This document proposes twelve deterministic E2E scenarios for the Memory System subsystem.
It covers both end-to-end user and operator journeys and module smoke scenarios so the same suite can validate explicit user memory writes, approval-gated shared-scope persistence, conflict preservation and resolution, lifecycle-aware retrieval, replay fidelity, bounded child-memory access, and fail-closed behavior around validation, policy, storage, and configuration precedence.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator audit, approval, conflict-resolution, and replay drivers
* seeded identity, thread, collaborative-scope, configuration, policy, memory-store, and RAG-corpus fixtures
* recorded model adapter mode plus deterministic runtime extraction hooks
* replay-visible candidate refs, policy decisions, approval refs, conflict-set refs, retrieval query and result refs, context snapshots, checkpoints, and final outputs
* trace collector, run-view materializer, memory-record harness, conflict-set harness, context-snapshot harness, and replay verifier

## Suite structure

### User-journey scenarios

1. explicit user memory request writes pinned user memory and later retrieval appears separately from RAG evidence
2. collaborative-scope memory write waits for approval, resumes once, and later same-scope retrieval sees the approved record
3. a conflicting inferred update is preserved as a conflict set until an operator audits and resolves it explicitly
4. operator replay of historical memory activity prefers stored write and retrieval refs and labels missing retrieval evidence as best-effort

### Module smoke scenarios

5. `WriteCandidates` rejects a candidate missing explicit scope before conflict check
6. cross-scope `Query` without policy approval is rejected and exposes no unauthorized memory
7. approval timeout on a high-risk memory write yields a non-live timeout outcome and no live record
8. `Query` excludes non-live lifecycle states by default and widens only through explicit audit-state selection
9. duplicate candidate intake reuses the prior replay-visible outcome instead of creating a duplicate live record
10. persistence failure during conflict resolution fails closed before lifecycle transitions claim success
11. child-run memory retrieval is bounded by delegated `allowedScopes` and child access context rather than the full parent memory surface
12. lower-precedence overrides cannot create a live inferred cross-scope memory with widened retention

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Explicit user memory request writes pinned user memory and later retrieval appears separately from RAG evidence
* `Risk level:` Medium
* `Rationale:` Proves the baseline memory contract end to end: an explicit user request becomes governed pinned memory, later retrieval returns it with provenance, and context assembly keeps memory distinct from RAG on the next turn.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory `user_explicit` write rules, `WriteCandidates`, `Query`, provenance-rich retrieval, and pinned retention
* Layer 2: Agent Runtime post-run extraction hook and later memory retrieval request
* Layer 2: Policy and Approval `memory_write` evaluation before persistent write
* Layer 2: Context Assembly ordered rendering of memory before RAG and distinct evidence-group reporting
* Layer 2: RAG Infrastructure distinct retrieval provenance and no overwrite of memory semantics
* Layer 2: Observability replay-visible memory write and retrieval artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_mem_explicit`, one open thread `thread_mem_explicit`, one collaborative scope `scope_mem_explicit`, one config snapshot with conservative retrieval budgets and normal `allowInferredMemoryWrites`, and one user-scope memory store initially missing the requested preference.
* Seeded policy rules: allow one same-user `memory_write` for type `preference` in user scope and allow later same-scope retrieval; deny any cross-scope write or read for the same run.
* Seeded memory and retrieval stores: no pre-existing matching user preference record; one deterministic RAG corpus slice about Python formatting that becomes relevant on the second turn.
* Selected model mode: recorded turn-one model produces a normal response and the runtime emits one `user_explicit` memory candidate; recorded turn-two model consumes retrieved memory and RAG evidence to answer the follow-up.
* Selected tool implementations: none.
* Expected capability set: no executable tools are required; the governed action is the persistent memory write.
* Execution-space posture: not material.
* Approval or replay fixtures: no approval wait is expected; replay must preserve candidate refs, classification output, validation output, policy decision ref, final write result, later retrieval query ref, later retrieval result refs, and both turn context snapshots.

### Given / When / Then

Given a user says "remember that I prefer concise bullet answers for Python questions" and later asks a Python question that also needs external documentation,
When runtime finishes the first turn, emits a `user_explicit` memory candidate, policy allows the user-scope write, memory persists the record as pinned, and the second turn retrieves both memory and RAG evidence for context assembly,
Then the stored preference is returned as memory with memory id and scope provenance, RAG remains a separate evidence group, and the second-turn answer reflects the remembered preference without relabeling RAG as memory.

### Required assertions

`Required fixtures:`

* The first-turn candidate source is `user_explicit`.
* The target scope is user scope for the same canonical user and thread lineage.
* The second-turn question deterministically requires one RAG evidence pack so memory and retrieval must both appear.

`Required observability artifacts:`

* Candidate-intake, classify, validate, score, policy, and write records for the first turn.
* One `MemoryWriteResult` with `written` status, a new `memoryId`, and a replay-visible policy decision ref.
* One later memory retrieval query ref and bounded retrieval result refs including memory id, scope provenance, source provenance, and reason codes.
* One later context snapshot and inclusion record showing a memory layer and a separate RAG layer.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing first-turn write activity and second-turn retrieval activity.

`Required replay artifacts:`

* Candidate ref and hash, classification output, validation output, score output, policy decision ref, write result, memory record ref, second-turn retrieval query ref, second-turn retrieval result refs, and both turn context snapshots.

`Pass/fail oracle:`

* The scenario passes only if the explicit request becomes a pinned user-scope memory record after policy allow, the later retrieval returns that memory with provenance, and context assembly keeps memory and RAG as distinct evidence groups.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Deterministic runtime extraction fixture
* Seeded memory store and RAG corpus fixtures
* Policy fixture service for `memory_write`
* Context-snapshot harness
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Collaborative-scope memory write waits for approval, resumes once, and later same-scope retrieval sees the approved record
* `Risk level:` High
* `Rationale:` Proves the memory write boundary obeys the policy-first and recoverability contracts when the target scope is shared. Approval must gate the write, runtime must checkpoint and resume correctly, and the approved record must be written at most once.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory write policy and approval rules for shared-scope persistence
* Layer 2: Memory `WriteCandidates` and later same-scope `Query`
* Layer 2: Agent Runtime checkpoint-before-wait and resume-after-approval behavior
* Layer 2: Policy and Approval `memory_write` evaluation, approval binding, and immutable decision refs
* Layer 2: Observability approval, checkpoint, write, and retrieval artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_mem_shared`, one open thread `thread_mem_shared`, one collaborative scope `scope_mem_shared`, one config snapshot with replay capture enabled, and no pre-existing matching collaborative-scope record.
* Seeded policy rules: classify collaborative-scope `memory_write` as high risk, return `require_approval` for the exact request hash, and allow the same request after approval only if target scope remains `scope_mem_shared` and type remains `constraint`.
* Seeded memory and retrieval stores: collaborative-scope memory store starts without the requested constraint; no RAG material is required.
* Selected model mode: recorded first-turn model and runtime emit one explicit collaborative-scope memory candidate; recorded resumed execution writes exactly one record; recorded second-turn model uses the shared memory on a later query.
* Selected tool implementations: none.
* Expected capability set: no tools are exposed; the governed action is shared-scope memory persistence.
* Execution-space posture: not material.
* Approval or replay fixtures: one approval request artifact, one later approval resolution bound to the original request hash and policy snapshot, one checkpoint before `waiting_approval`, and replay refs for write and later retrieval.

### Given / When / Then

Given a user with shared-scope rights asks the assistant to remember a team deployment constraint for the collaborative scope,
When runtime emits the memory candidate, policy returns `require_approval`, runtime checkpoints before `waiting_approval`, approval later resolves for the exact request, runtime resumes, and memory writes the collaborative-scope record exactly once,
Then the approved record becomes retrievable for later same-scope runs and replay shows the approval, checkpoint, resume, write, and later retrieval boundaries in order.

### Required assertions

`Required fixtures:`

* The approval resolution is bound to the original request hash and policy snapshot.
* The target scope and memory type remain unchanged between the original request and resumed write.
* The same collaborative scope is used on the later retrieval turn.

`Required observability artifacts:`

* Policy evaluation request, risk assessment ref, approval request ref, approval resolution ref, and policy snapshot ref.
* One checkpoint ref before `waiting_approval` and one write-completion record after resume.
* One `MemoryWriteResult` with a replay-visible outcome ref and no duplicate record creation.
* One later retrieval query ref and retrieval result ref for the approved collaborative-scope memory.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing approval wait, resume, write, and later retrieval.

`Required replay artifacts:`

* Candidate ref, policy decision ref, approval request and resolution refs, checkpoint refs, write result, resulting memory record ref, later retrieval query ref, and later retrieval result ref.

`Pass/fail oracle:`

* The scenario passes only if the shared-scope memory write occurs only after bound approval resolves, happens at most once across the wait boundary, and later same-scope retrieval returns the approved record.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Deterministic runtime extraction fixture
* Policy and approval fixture service
* Seeded collaborative-scope memory fixture
* Checkpoint inspector
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` A conflicting inferred update is preserved as a conflict set until an operator audits and resolves it explicitly
* `Risk level:` Medium
* `Rationale:` Proves the conflict contract is governance-first rather than overwrite-first. An inferred update must not silently replace active memory, and explicit audit plus resolution must drive any lifecycle transition.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory conflict detection, `conflicted` write outcome, `GetRecord`, `GetConflictSet`, and `ResolveConflict`
* Layer 2: Memory trust and lifecycle rules preserving conflict metadata
* Layer 2: Policy and Approval `memory_write` evaluation before the competing candidate is admitted
* Layer 2: Observability conflict refs and lifecycle-transition artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_mem_conflict`, one open thread `thread_mem_conflict`, one config snapshot with normal inferred-write handling, and one existing active user-scope `preference` record that conflicts semantically with the new candidate.
* Seeded policy rules: allow same-user inferred `memory_write` for the target type and allow operator audit reads and explicit conflict resolution in the same scope.
* Seeded memory and retrieval stores: one active conflicting record already exists; no RAG material is required.
* Selected model mode: recorded runtime extraction emits one `runtime_extract` candidate with incompatible content and lower trust than the existing record.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve candidate refs, conflict-set ref, read refs for both records, resolution request and result refs, and lifecycle-transition refs.

### Given / When / Then

Given an active user-scope preference already exists and runtime later extracts an incompatible inferred preference for the same subject,
When memory validates the new candidate, detects the conflict, records a `conflicted` outcome instead of overwriting the active record, an operator audits the participating records through `GetConflictSet` and `GetRecord`, and the operator resolves the set with an explicit `supersede` action,
Then the prior conflict state remains replay-visible, lifecycle transitions are recorded explicitly, and later normal retrieval returns only the resolved winner as live memory.

### Required assertions

`Required fixtures:`

* The existing record and the new candidate share scope and type but have incompatible values.
* The new candidate has lower or different trust posture than the existing active record.
* The operator access context matches the relevant user and scope lineage.

`Required observability artifacts:`

* Candidate-intake, classify, validate, conflict-check, score, and write records for the competing candidate.
* One `MemoryWriteResult` with `conflicted` status and a `conflictSetId`.
* One `GetConflictSet` read trail and one or more `GetRecord` read trails for operator audit.
* One explicit `ResolveConflict` request and result with lifecycle-transition records for every updated memory id.
* `RunTimeline` and `ExecutionGraph` views showing conflict creation, audit reads, and resolution.

`Required replay artifacts:`

* Candidate ref and hash, existing memory record ref, conflict-set ref, policy decision ref, read refs for the audited records, conflict-resolution request ref, conflict-resolution result ref, and lifecycle-transition refs.

`Pass/fail oracle:`

* The scenario passes only if the competing inferred candidate does not silently overwrite the active record, the conflict remains auditable, and later live retrieval reflects only the explicit resolution outcome.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded runtime extraction fixture
* Seeded conflicting memory fixture
* Policy fixture service
* Memory-record and conflict-set harnesses
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Operator replay of historical memory activity prefers stored write and retrieval refs and labels missing retrieval evidence as best-effort
* `Risk level:` Medium
* `Rationale:` Proves replay uses stored memory artifacts rather than recomputing live decisions, while honestly degrading retrieval fidelity when result refs are missing.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory replay capture for candidate refs, policy refs, write results, retrieval query refs, and retrieval result refs
* Layer 2: Memory replay behavior preferring stored write decisions and stored retrieval results over live recomputation
* Layer 2: Context Assembly replay preference for stored snapshots over live retrieval
* Layer 2: Observability replay manifest fidelity posture and required artifact refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one completed historical run `run_mem_replay`, one stored config snapshot, and one replay configuration that disallows silent live fallback.
* Seeded policy rules: not material beyond the historical decision refs already stored.
* Seeded memory and retrieval stores: the historical write artifacts and resulting memory record still exist; the historical retrieval query ref exists but the original retrieval result payloads are intentionally missing to force replay degradation.
* Selected model mode: none for live execution; replay reads stored artifacts only.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: the replay manifest includes candidate refs, classification and validation outputs, policy decision ref, final write result, retrieval query ref, and explicit missing retrieval result refs or degraded posture markers.

### Given / When / Then

Given an operator requests replay of a deterministic historical run that both wrote memory and later retrieved memory for context,
When replay loads the stored write-path artifacts and discovers that the historical retrieval result artifacts are missing even though the query ref is present,
Then replay reconstructs the memory write path from stored artifacts, prefers stored write decisions over live re-evaluation, and marks the retrieval portion as best-effort rather than authoritative.

### Required assertions

`Required fixtures:`

* The write-path artifacts remain intact and immutable.
* The retrieval query ref exists but the original retrieval result artifacts are intentionally unavailable.
* Replay configuration does not allow silent certainty inflation.

`Required observability artifacts:`

* Replay manifest with explicit fidelity posture and missing-ref or degraded-replay metadata.
* Historical write-path artifacts for candidate intake, classification, validation, policy, and write result.
* Historical retrieval query ref and degraded replay indicator for missing retrieval result refs.
* `RunSummary` and replay-visible audit record explaining the degraded retrieval posture.

`Required replay artifacts:`

* Candidate ref, classification output, validation output, policy decision ref, write result, resulting memory record ref, retrieval query ref, replay manifest, and fidelity or missing-ref markers.

`Pass/fail oracle:`

* The scenario passes only if replay uses stored memory write artifacts without recomputing policy or scoring, and any retrieval re-execution or missing-result condition is labeled best-effort instead of authoritative.

### Required harness capabilities

* Operator replay driver
* Seeded historical run and artifact fixture service
* Replay-manifest harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` `WriteCandidates` rejects a candidate missing explicit scope before conflict check
* `Risk level:` Medium
* `Rationale:` Proves the write pipeline fails fast on invalid scope posture. Memory without explicit scope is contract-invalid and must not proceed into conflict handling or persistence.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Memory validation rules for explicit scope and scope eligibility
* Layer 2: Memory `WriteCandidates` pipeline ordering and failure handling

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one write request `req_mem_missing_scope` with a full access context and one malformed candidate lacking `proposedScope`.
* Seeded policy rules: not material because validation must fail before policy-gated persistence.
* Seeded memory and retrieval stores: one active record exists only to prove conflict checks must not be reached.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the malformed candidate ref and validation failure artifact.

### Given / When / Then

Given a write batch contains a candidate with no explicit target scope,
When `WriteCandidates` runs the memory pipeline,
Then the candidate is rejected during validation before conflict check and no live record or conflict set is created.

### Required assertions

`Required fixtures:`

* The malformed candidate omits `proposedScope`.
* A potentially conflicting existing record is present only to detect accidental conflict-check execution.

`Required observability artifacts:`

* Candidate-intake and validation-failure records.
* Explicit absence of conflict-check, score, and write-success artifacts for the malformed candidate.

`Required replay artifacts:`

* Malformed candidate ref and validation failure output.

`Pass/fail oracle:`

* The scenario passes only if scope validation fails before conflict handling and no replay-visible outcome implies persistence or conflict-set creation.

### Required harness capabilities

* Memory write harness
* Seeded invalid-candidate fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Cross-scope `Query` without policy approval is rejected and exposes no unauthorized memory
* `Risk level:` High
* `Rationale:` Proves the read path obeys the same governance boundary as writes. Matching user identity alone must not grant cross-scope memory access.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Memory cross-scope read rules and `Query` behavioral expectations
* Layer 2: Policy and Approval `cross_scope_access` evaluation and deny path

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one caller access context `ctx_mem_cross_scope_denied` with user and run lineage for scope `scope_a`, one target memory set in `scope_b`, and no approval or allow decision for crossing scopes.
* Seeded policy rules: deny `cross_scope_access` for the caller from `scope_a` to `scope_b`.
* Seeded memory and retrieval stores: one relevant record exists only in `scope_b`; no same-scope matches exist.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the denied access decision and rejected query artifact.

### Given / When / Then

Given a caller issues `Query` with `allowedScopes` that would cross from the current scope into another scope without approval,
When memory validates access and policy for the query,
Then the cross-scope query is rejected and no memory result from the unauthorized scope is returned.

### Required assertions

`Required fixtures:`

* The only semantically matching record is outside the caller's authorized scope.
* No approval artifact exists for the requested cross-scope read.

`Required observability artifacts:`

* Cross-scope access evaluation request and deny decision ref.
* Rejected query artifact or read-denial record.
* Explicit absence of unauthorized `MemoryResult` payloads in query outputs.

`Required replay artifacts:`

* Query ref, denied policy decision ref, and rejected read outcome.

`Pass/fail oracle:`

* The scenario passes only if cross-scope memory is not exposed and replay makes the denied read decision explicit.

### Required harness capabilities

* Memory query harness
* Policy fixture service for `cross_scope_access`
* Seeded multi-scope memory fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Approval timeout on a high-risk memory write yields a non-live timeout outcome and no live record
* `Risk level:` High
* `Rationale:` Proves the write boundary stays fail-closed when approval expires. A memory candidate must not become live after approval timeout, and the timeout must be auditable.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Memory approval-timeout failure mode and no-write guarantee
* Layer 2: Policy and Approval `require_approval` lifecycle and expiration binding

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one shared-scope or otherwise high-risk write request `req_mem_approval_timeout`, one full access context, and no pre-existing target record.
* Seeded policy rules: classify the `memory_write` as high risk and return `require_approval`; the approval request later expires without a valid resolution.
* Seeded memory and retrieval stores: no matching live record exists before or after the timeout.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: one approval request ref, one expiry or timeout artifact, and replay evidence that no live write completed.

### Given / When / Then

Given a memory write requires approval and the approval window expires before a valid resolution is returned,
When runtime or the calling workflow re-evaluates the pending write after the timeout,
Then the candidate does not become a live record, the timeout is replay-visible, and the write requires fresh evaluation rather than silent continuation.

### Required assertions

`Required fixtures:`

* The candidate is otherwise valid enough to have reached the approval boundary.
* No valid approval resolution is returned before expiry.

`Required observability artifacts:`

* Original policy decision with `require_approval`.
* Approval request ref plus expiry or timeout artifact.
* Final write outcome artifact showing the candidate did not become live.

`Required replay artifacts:`

* Candidate ref, original policy decision ref, approval request ref, timeout or expiry ref, and final non-live outcome ref.

`Pass/fail oracle:`

* The scenario passes only if approval expiry leaves no live record and forces re-evaluation rather than implicit authorization.

### Required harness capabilities

* Memory write harness
* Policy and approval fixture service
* Timeout-expiry fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The failure-mode section says approval timeout should return a `pending/expired` outcome, but the `MemoryWriteResult` status table does not define an explicit timeout or expired status value.

## Scenario 8

### Scenario summary

* `Title:` `Query` excludes non-live lifecycle states by default and widens only through explicit audit-state selection
* `Risk level:` Medium
* `Rationale:` Proves lifecycle state actually controls live visibility. Normal retrieval must hide non-live records, while audit or resolution workflows widen state selection explicitly rather than accidentally.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Memory lifecycle-visibility rules and `Query` `includeStates` behavior
* Layer 2: Memory `GetRecord` and audit-read posture for replay-visible records

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one access context `ctx_mem_lifecycle_query`, one config snapshot with `includeConflictedMemoryByDefault = false`, and one scope containing records in `active`, `pending_review`, `conflicted`, `superseded`, `expired`, and `tombstoned` states.
* Seeded policy rules: allow same-scope live retrieval and allow same-scope audit retrieval with explicit state widening.
* Seeded memory and retrieval stores: the live and non-live records all match the same query subject closely enough to appear if not filtered.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve both the normal query and the widened audit query.

### Given / When / Then

Given a scope contains both live and non-live records relevant to the same query,
When a normal `Query` runs with default state behavior and a later audit `Query` runs with explicit `includeStates`,
Then the normal result returns only live memory, while the audit result widens visibility only to the explicitly requested non-live states.

### Required assertions

`Required fixtures:`

* The same semantic subject exists across multiple lifecycle states.
* The default configuration does not include conflicted or other non-live records in normal retrieval.

`Required observability artifacts:`

* One normal query ref and result set containing only live records.
* One later audit query ref and widened result set containing the explicitly requested non-live states.
* Query summaries preserving lifecycle state and provenance for returned records.

`Required replay artifacts:`

* Both query refs, both result refs, and the config snapshot or access context showing why the default and widened behaviors differ.

`Pass/fail oracle:`

* The scenario passes only if non-live states stay out of normal retrieval by default and appear only through an explicit widened query path.

### Required harness capabilities

* Memory query harness
* Seeded multi-state memory fixture service
* Config fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Duplicate candidate intake reuses the prior replay-visible outcome instead of creating a duplicate live record
* `Risk level:` Medium
* `Rationale:` Proves idempotent behavior for safe duplicates. Memory history should stay auditable without duplicating semantically identical writes when the prior outcome is already known.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory duplicate-candidate failure mode and prior-outcome reuse
* Layer 2: Memory immutable write history and no duplicate write inflation

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one prior successful write outcome for `candidate_dup_mem_01`, one new request containing a duplicate candidate with the same effective content and provenance hash, and one config snapshot with normal dedupe behavior.
* Seeded policy rules: allow the original write; the duplicate path should reuse the prior safe outcome rather than requiring a widened new decision.
* Seeded memory and retrieval stores: the original resulting memory record already exists in active state.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve both the original outcome and the duplicate-detection path.

### Given / When / Then

Given a duplicate candidate arrives that matches a prior replay-visible write outcome safely enough for dedupe,
When `WriteCandidates` processes the duplicate,
Then it returns the prior outcome or an equivalent reused outcome reference instead of creating a second live record for the same memory content.

### Required assertions

`Required fixtures:`

* The duplicate candidate matches the earlier candidate on the effective dedupe identity the subsystem uses safely.
* The earlier outcome is replay-visible and still resolvable.

`Required observability artifacts:`

* Original write artifacts and resulting memory record ref.
* Duplicate-detection record and reused-outcome artifact or reference.
* Explicit absence of a second distinct live record for the same semantic write.

`Required replay artifacts:`

* Original candidate ref and result ref plus duplicate-candidate ref and reused-outcome linkage.

`Pass/fail oracle:`

* The scenario passes only if duplicate intake does not inflate live records and replay can trace the duplicate back to the prior authoritative outcome.

### Required harness capabilities

* Memory write harness
* Seeded duplicate-candidate fixture service
* Memory-record harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Persistence failure during conflict resolution fails closed before lifecycle transitions claim success
* `Risk level:` High
* `Rationale:` Proves lifecycle mutation remains atomic from the caller’s perspective. If persistence fails while resolving a conflict, the subsystem must not pretend the winner or terminal states were committed.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Memory `ResolveConflict` behavioral expectations
* Layer 2: Memory storage-unavailable failure mode for write or lifecycle transition completion

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one existing conflict set `conflict_mem_store_fail`, one operator access context authorized to resolve it, and one injected persistence failure during lifecycle-transition commit.
* Seeded policy rules: allow the operator to resolve the conflict set if persistence succeeds.
* Seeded memory and retrieval stores: the conflict set contains at least two replay-visible records eligible for a `supersede` resolution.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the attempted resolution request and the storage-failure artifact while leaving the prior conflict state intact.

### Given / When / Then

Given an operator chooses an explicit `supersede` resolution for a tracked conflict set,
When `ResolveConflict` encounters a storage failure while trying to persist the lifecycle transitions,
Then the subsystem fails closed, does not report successful resolution, and preserves the prior conflict state for later retry or audit.

### Required assertions

`Required fixtures:`

* The failure occurs during lifecycle-transition persistence, not before request validation.
* The pre-failure conflict state is replay-visible and inspectable.

`Required observability artifacts:`

* Conflict-resolution request ref.
* Storage-failure artifact tied to the attempted resolution.
* Explicit absence of a successful `ConflictResolutionResult` claiming resolved state.
* Continued visibility of the pre-existing conflict-set state.

`Required replay artifacts:`

* Conflict-set ref, resolution request ref, storage-failure artifact, and prior unresolved state refs.

`Pass/fail oracle:`

* The scenario passes only if persistence failure prevents success from being reported and the old conflict state remains the authoritative state.

### Required harness capabilities

* Conflict-resolution harness
* Failure-injection harness for memory persistence
* Conflict-set harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Child-run memory retrieval is bounded by delegated `allowedScopes` and child access context rather than the full parent memory surface
* `Risk level:` High
* `Rationale:` Proves the memory subsystem enforces delegation boundaries on read access. A child run must receive only the memory slice granted to its own access context and delegated scope set.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Memory subagent interaction rules for bounded child retrieval and child `MemoryAccessContext`
* Layer 2: Memory `Query` scope, lifecycle, provenance, and execution-space enforcement
* Layer 2: Context Assembly child-context construction from curated memory ids or replay-visible retrieval result refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run `run_mem_parent`, one child run `run_mem_child`, one delegated child task contract with explicit memory-result and token budgets, and one child access context carrying inherited user, thread, collaborative-scope, and execution-space lineage.
* Seeded policy rules: allow child same-scope retrieval only for the delegated `allowedScopes`; deny any attempt to widen beyond the delegated set.
* Seeded memory and retrieval stores: relevant thread-scope and collaborative-scope memories exist for the delegated task; unrelated user-scope and unrelated collaborative-scope memories also exist and must stay excluded.
* Selected model mode: recorded child execution issues one deterministic `MemoryQuery` for the delegated task and does not perform any memory write.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: one child execution space id is present in the access context for lineage, but it is not treated as a primary memory scope.
* Approval or replay fixtures: replay must preserve the child query ref, result refs, delegated allowed-scope set, and child-context pack or retrieval refs.

### Given / When / Then

Given a parent run delegates a child task with an explicit bounded memory scope set,
When the child issues `Query` using its own `MemoryAccessContext` and the delegated `allowedScopes`,
Then the memory subsystem returns only the permitted slice, excludes unrelated parent-visible memory by default, and makes the bounded child retrieval replay-visible.

### Required assertions

`Required fixtures:`

* The delegated `allowedScopes` are narrower than the full parent-visible memory surface.
* The child access context uses the child run id, not the parent run id.
* Unrelated memory exists to prove exclusion.

`Required observability artifacts:`

* Child query ref with child run lineage and delegated scope metadata.
* Child query result refs containing only permitted memories with provenance.
* Child-context pack ref or equivalent retrieval linkage showing curated handoff into child reasoning.
* `RunTimeline` and `ExecutionGraph` views showing child retrieval as child-owned work.

`Required replay artifacts:`

* Child access context lineage, child query ref, child query result refs, delegated allowed-scope metadata, and child-context pack or retrieval refs.

`Pass/fail oracle:`

* The scenario passes only if the child sees only the delegated memory slice and replay shows that the query was executed under child lineage rather than unrestricted parent scope.

### Required harness capabilities

* Deterministic parent-child runtime fixture
* Memory query harness
* Seeded multi-scope memory fixture service
* Child-context or delegated-task fixture service
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Lower-precedence overrides cannot create a live inferred cross-scope memory with widened retention
* `Risk level:` High
* `Rationale:` Proves configuration precedence and policy together prevent quiet permission widening. Lower-level requests may propose scope or retention, but they must not turn an inferred candidate into a broader-scope, broader-retention live record against higher-level constraints.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Memory configuration precedence, `allowInferredMemoryWrites`, and no-widening rules for retention and cross-scope access
* Layer 2: Memory validation and policy preconditions for target scope
* Layer 2: Policy and Approval no cross-scope data access without approval

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one system-level config with `allowInferredMemoryWrites = false` and conservative default retention, one lower-precedence run-level override attempt proposing inferred-write enablement and broader retention, and one valid `runtime_extract` candidate proposing `collaborative_scope` with `requestedRetain = pinned`.
* Seeded policy rules: allow only same-user, same-scope writes for this run and deny cross-scope promotion without approval.
* Seeded memory and retrieval stores: no matching live collaborative-scope record exists.
* Selected model mode: recorded runtime extraction emits exactly one inferred candidate that is otherwise structurally valid.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the effective config snapshot, policy decision refs, candidate refs, and final non-widened outcome.

### Given / When / Then

Given higher-precedence configuration disables inferred live writes and higher-precedence policy does not allow cross-scope promotion,
When a lower-precedence run override and the candidate itself both attempt to widen the write into pinned collaborative-scope memory,
Then the memory subsystem must not create a live pinned collaborative-scope record and must make the effective config and policy constraints replay-visible.

### Required assertions

`Required fixtures:`

* The candidate is structurally valid aside from the disallowed widening.
* The higher-precedence config and policy restrictions are both present in the effective evaluation context.

`Required observability artifacts:`

* Effective config snapshot ref showing higher-precedence settings.
* Policy evaluation ref for the target scope.
* Candidate-intake, classification, validation, and final non-live or rejected outcome refs.
* Explicit absence of a live pinned collaborative-scope record produced by the candidate.

`Required replay artifacts:`

* Effective config snapshot ref, candidate ref, policy decision ref, and final outcome ref.

`Pass/fail oracle:`

* The scenario passes only if lower-precedence inputs do not produce the widened live record and replay makes the winning higher-precedence config and policy posture explicit.

### Required harness capabilities

* Memory write harness
* Config fixture service with precedence controls
* Policy fixture service
* Seeded inferred-candidate fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The document defines that lower-precedence config must not widen inferred-write behavior, retention, or cross-scope access, but it does not define one canonical `MemoryWriteResult.status` for an otherwise valid inferred candidate suppressed by higher-precedence configuration.
