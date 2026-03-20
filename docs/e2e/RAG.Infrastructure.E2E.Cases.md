# RAG Infrastructure E2E Cases

This document proposes twelve deterministic E2E scenarios for the RAG Infrastructure subsystem.
It covers both end-to-end user and operator journeys and module smoke scenarios so the same suite can validate approved-source ingestion, snapshot publication, bounded retrieval and reranking, citation-rich evidence packaging, restricted-corpus governance, memory-vs-RAG separation, bounded child retrieval, historical replay fidelity, and fail-closed behavior around invalid corpora, invalid filters, snapshot publication, packaging, and replay fallback.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator ingestion, approval, snapshot-read, and replay drivers
* seeded identity, thread, collaborative-scope, configuration, policy, memory-store, and retrievable-corpus fixtures
* recorded model adapter mode with deterministic runtime retrieval requests
* replay-visible ingestion refs, corpus snapshot refs, retrieval query refs, selected result refs, citation package refs, context snapshots, checkpoints, approval refs, and final outputs
* trace collector, run-view materializer, snapshot harness, retrieval-result harness, context-snapshot harness, and replay verifier

## Suite structure

### User-journey scenarios

1. approved source ingestion publishes a replay-visible snapshot and a later user query retrieves cited evidence distinct from memory
2. restricted-corpus retrieval waits for approval, resumes once, and returns cited results only under the approved corpus conditions
3. bounded child retrieval uses a delegated corpus slice and separate parent-child query refs
4. operator replay after corpus refresh uses the historical snapshot and stored result refs rather than the current corpus state

### Module smoke scenarios

5. `Search` rejects an unknown corpus before retrieval begins
6. invalid metadata filter dimensions are rejected before search and reranking
7. restricted corpus access without approval is denied and exposes no unauthorized evidence
8. source-ingestion failure preserves source provenance and publishes no new snapshot
9. snapshot publication failure fails closed before a new snapshot becomes searchable
10. citation packaging failure blocks retrieval success and no uncited authoritative result is emitted
11. lower-precedence overrides cannot widen default corpora or metadata-filter dimensions beyond higher-level policy
12. replay with missing retrieval artifacts falls back only as explicit best-effort when live fallback is allowed

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Approved source ingestion publishes a replay-visible snapshot and a later user query retrieves cited evidence distinct from memory
* `Risk level:` Medium
* `Rationale:` Proves the baseline RAG contract end to end: approved content is ingested into a replay-visible snapshot, later retrieval returns bounded cited evidence from that snapshot, and downstream context keeps RAG distinct from memory.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG `Ingest`, snapshot publication, `Search`, reranking, and citation packaging
* Layer 2: RAG source provenance, corpus snapshot, retrieval query, and result provenance rules
* Layer 2: Context Assembly separate rendering of memory retrieval and RAG results
* Layer 2: Memory System boundary that RAG ingestion and search do not create memory by themselves
* Layer 2: Observability replay-visible retrieval snapshots, query refs, and citation package refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator ingestion actor `op_rag_ingest`, one verified user `user_rag_baseline`, one open thread `thread_rag_baseline`, one collaborative scope `scope_rag_baseline`, one config snapshot with conservative `maxRetrievalResults` and `maxRAGEvidenceTokens`, and one target corpus `corp_product_docs@v1`.
* Seeded policy rules: allow ingestion of the approved source into `corp_product_docs@v1` and allow same-scope retrieval from that corpus on the user run; deny any cross-scope corpus expansion for the same run.
* Seeded memory and retrieval stores: one relevant user-scope memory record exists for context separation; the RAG corpus starts without the new document and receives one approved source document during the ingestion step.
* Selected model mode: recorded user-run model consumes one retrieved memory block and one bounded RAG evidence pack to answer the later question.
* Selected tool implementations: none.
* Expected capability set: no executable tools are required; retrieval occurs through runtime and the RAG subsystem, not a model-exposed tool.
* Execution-space posture: not material.
* Approval or replay fixtures: no approval wait is expected; replay must preserve ingestion request and source refs, published snapshot ref, later retrieval query ref, selected result refs, citation package refs, and the later context snapshot showing separate memory and RAG layers.

### Given / When / Then

Given an approved product-spec document is ingested into a named corpus and a later user asks a question that also benefits from one remembered preference,
When the operator publishes the new retrievable snapshot, runtime later issues `Search` against the allowed corpus, RAG reranks and packages bounded cited results, and context assembly renders both the memory and RAG evidence for the user turn,
Then the user run retrieves cited evidence from the published corpus snapshot, the RAG evidence remains distinct from memory in the context snapshot, and the ingestion path itself does not create memory.

### Required assertions

`Required fixtures:`

* The ingested source is approved and produces a stable `SourceRef`.
* The later user turn deterministically needs both one memory record and one RAG evidence pack.
* The corpus snapshot published by ingestion is the one later searched by the user run.

`Required observability artifacts:`

* Ingestion request receipt, snapshot publication record, and replay-visible `CorpusSnapshotRef`.
* Later retrieval query receipt, metadata-filter application summary if used, reranking summary, selected result refs, and citation package refs.
* Later context snapshot and inclusion record showing memory retrieval and RAG results as separate evidence groups.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views for the user run showing retrieval activity and later context assembly outputs.
* Explicit absence of memory-write artifacts caused solely by the RAG ingestion or search path.

`Required replay artifacts:`

* Ingestion request ref, source ref, published snapshot ref, retrieval query ref, selected result refs, citation package refs, and later context snapshot.

`Pass/fail oracle:`

* The scenario passes only if ingestion publishes a replay-visible snapshot, later retrieval returns cited evidence from that snapshot, memory and RAG remain distinct in downstream context, and the RAG path does not create memory by itself.

### Required harness capabilities

* Operator ingestion driver
* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Approved source-content fixture service
* Seeded memory store and retrievable corpus fixtures
* Snapshot harness
* Context-snapshot harness
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Restricted-corpus retrieval waits for approval, resumes once, and returns cited results only under the approved corpus conditions
* `Risk level:` High
* `Rationale:` Proves the restricted read path is governed rather than implied. Cross-scope or restricted corpus access must not occur without policy approval, and runtime must resume safely after the approval boundary.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG corpus-access rules for restricted corpora and `Search` bounded by approved corpora
* Layer 2: Policy and Approval `cross_scope_access` evaluation, approval binding, and immutable decision refs
* Layer 2: Agent Runtime checkpoint-before-wait and resume-after-approval behavior
* Layer 2: Context Assembly replay-visible snapshot and evidence-layer construction after approved retrieval
* Layer 2: Observability approval, checkpoint, retrieval, and final-output artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_rag_restricted`, one open thread `thread_rag_restricted`, one caller scope `scope_public_docs`, one restricted corpus `corp_restricted_ops@v3`, and one config snapshot with replay capture enabled and `allowLiveRetrievalFallbackOnReplay = false`.
* Seeded policy rules: classify cross-scope access to `corp_restricted_ops@v3` as high risk, return `require_approval` for the exact retrieval request hash, and after approval allow only that named restricted corpus with the same metadata-filter dimensions and result bounds.
* Seeded memory and retrieval stores: no memory material is required; the restricted corpus contains deterministic results relevant to the user question.
* Selected model mode: recorded model produces the final response only after the approved retrieval results are present.
* Selected tool implementations: none.
* Expected capability set: no tools are exposed; the governed action is the restricted retrieval request.
* Execution-space posture: not material.
* Approval or replay fixtures: one approval request artifact, one approval resolution bound to the original request hash and corpus conditions, one checkpoint before `waiting_approval`, and replay refs for the approved retrieval query, results, and citations.

### Given / When / Then

Given a user asks a question whose answer requires a restricted corpus outside the default allowed set,
When runtime prepares the exact retrieval request, policy returns `require_approval`, runtime checkpoints before `waiting_approval`, approval later resolves for the same corpus and filter conditions, and runtime resumes and executes `Search` exactly once,
Then the restricted retrieval occurs only after approval, the cited results remain bounded to the approved corpus conditions, and replay makes the approval, checkpoint, resume, and retrieval sequence explicit.

### Required assertions

`Required fixtures:`

* The approval resolution is bound to the original retrieval request hash and policy snapshot.
* The approved corpus ids and metadata-filter dimensions match the originally presented request.
* The retrieval query is issued only after resume from the approval checkpoint.

`Required observability artifacts:`

* Cross-scope access evaluation request, risk assessment ref, approval request ref, approval resolution ref, and policy snapshot ref.
* One checkpoint ref before `waiting_approval` and one resumed retrieval query record after approval.
* Retrieval query ref, reranking summary, selected result refs, citation package refs, and final output ref.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing approval wait, resume, retrieval, and completion order.

`Required replay artifacts:`

* Approval request and resolution refs, checkpoint refs, approved retrieval query ref, selected result refs, citation package refs, context snapshot ref if assembled after retrieval, and final output ref.

`Pass/fail oracle:`

* The scenario passes only if the restricted retrieval does not happen before bound approval resolves, executes at most once across the wait boundary, and returns results only from the approved corpus conditions.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy and approval fixture service
* Restricted-corpus fixture service
* Checkpoint inspector
* Retrieval-result harness
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Bounded child retrieval uses a delegated corpus slice and separate parent-child query refs
* `Risk level:` High
* `Rationale:` Proves RAG respects delegation boundaries. Child retrieval must remain bounded by the delegated task and preserve separate parent and child provenance.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 2: RAG subagent interaction rules for bounded child retrieval, separate query refs, and unrelated-RAG exclusion
* Layer 2: Context Assembly bounded child-context packs and separate RAG evidence layer
* Layer 2: Agent Runtime child-run lineage and bounded delegated context
* Layer 2: Observability parent-child retrieval lineage and replay refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run `run_rag_parent`, one child run `run_rag_child`, one collaborative scope `scope_rag_child`, one parent-allowed corpus set containing `corp_public_api@v2` and `corp_internal_changelog@v4`, and one delegated child task contract allowing only `corp_public_api@v2` with explicit result-count and token budgets.
* Seeded policy rules: allow same-scope child retrieval only for the delegated corpus slice and deny any widening to the parent's full corpus set.
* Seeded memory and retrieval stores: one relevant memory record may exist but remains separate from RAG; the RAG corpora contain relevant results in both corpora so exclusion can be proven.
* Selected model mode: recorded parent model delegates the lookup task; recorded child model consumes child retrieval results and returns a structured child answer; parent later merges that answer.
* Selected tool implementations: none.
* Expected capability set: no tools are exposed; the child uses delegated retrieval only through the RAG subsystem.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve parent and child retrieval query refs, result refs, citation package refs, child-context pack refs, and parent-child lineage refs.

### Given / When / Then

Given a parent run delegates a focused lookup task to a child run with a smaller allowed corpus set than the parent can see,
When the child issues `Search` using its own run lineage and delegated corpus slice,
Then the child receives only the delegated RAG evidence, unrelated parent-visible RAG blocks stay out of child context by default, and parent and child retrieval remain separately traceable.

### Required assertions

`Required fixtures:`

* The delegated child corpus set is narrower than the parent's allowed corpus set.
* Relevant results exist in both the allowed and disallowed corpora so exclusion is provable.
* Parent and child runs have distinct `runId` values and separate retrieval query ids.

`Required observability artifacts:`

* Parent-child lineage refs and child retrieval query receipt with child run lineage.
* Child selected result refs and citation package refs containing only the delegated corpus.
* Child-context pack ref or equivalent retrieval linkage showing the bounded RAG handoff.
* `RunTimeline`, `ExecutionGraph`, and `SubagentTree` views showing child retrieval as child-owned work distinct from any parent retrieval.

`Required replay artifacts:`

* Parent and child retrieval query refs, selected result refs, citation package refs, child-context pack ref, and parent-child lineage refs.

`Pass/fail oracle:`

* The scenario passes only if the child sees only the delegated corpus slice, parent and child retrieval remain separately replay-visible, and unrelated parent-visible RAG evidence does not silently enter the child context.

### Required harness capabilities

* Deterministic parent-child runtime fixture
* Recorded parent and child model adapter mode
* Seeded multi-corpus retrieval fixture service
* Child-context or delegated-task fixture service
* Retrieval-result harness
* Trace collector, run-view materializer, subagent-tree materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Operator replay after corpus refresh uses the historical snapshot and stored result refs rather than the current corpus state
* `Risk level:` Medium
* `Rationale:` Proves corpus refresh does not break replay. Historical retrieval must stay anchored to the snapshot and result refs that were actually used, not silently drift to a newer corpus version.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG replay-visible snapshot publication, `GetSnapshot`, and historical result provenance
* Layer 2: RAG rule that corpus refresh must not silently erase replay-visible prior snapshots
* Layer 2: Observability replay manifest fidelity posture and retrieval evidence refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one completed historical run `run_rag_replay`, one historical snapshot `snap_rag_hist_v1`, one newer snapshot `snap_rag_hist_v2` for the same corpus published after the run, and one replay config with live fallback disabled.
* Seeded policy rules: not material beyond the historical decision refs already stored.
* Seeded memory and retrieval stores: the historical retrieval query ref, selected result refs, citation package refs, and referenced `snap_rag_hist_v1` all still exist; `snap_rag_hist_v2` contains materially different current content.
* Selected model mode: none for live execution; replay reads stored artifacts only.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: the replay manifest includes the historical query ref, result refs, citation package refs, and snapshot ref; `GetSnapshot` can read the historical snapshot directly.

### Given / When / Then

Given a historical run used one corpus snapshot and the corpus has since been refreshed to a different newer snapshot,
When an operator replays the historical run and reads the referenced snapshot through `GetSnapshot`,
Then replay remains anchored to the historical snapshot and stored result refs instead of silently substituting the newer corpus state.

### Required assertions

`Required fixtures:`

* The historical and current snapshots are distinguishable and contain meaningfully different content.
* The historical result refs and citation packages still point to `snap_rag_hist_v1`.

`Required observability artifacts:`

* Historical retrieval query ref, selected result refs, citation package refs, and `CorpusSnapshotRef` for `snap_rag_hist_v1`.
* Later snapshot publication artifact for `snap_rag_hist_v2`.
* Replay manifest or run summary showing authoritative historical replay posture.

`Required replay artifacts:`

* Historical query ref, selected result refs, citation package refs, `snap_rag_hist_v1`, and `GetSnapshot` read evidence for the referenced snapshot.

`Pass/fail oracle:`

* The scenario passes only if replay uses the historical snapshot and stored result refs, and the existence of a newer snapshot does not rewrite the historical retrieval history.

### Required harness capabilities

* Operator replay driver
* Snapshot harness
* Seeded historical-query fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` `Search` rejects an unknown corpus before retrieval begins
* `Risk level:` Medium
* `Rationale:` Proves query validation fails fast. The subsystem must not search or rerank when the caller names a corpus that is not known or published.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: RAG `Search` validation and unknown-corpus failure mode

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one retrieval request `query_rag_unknown_corpus` with full caller lineage and `allowedCorpora = [corp_missing_404]`.
* Seeded policy rules: not material because the corpus is unknown before access can be granted meaningfully.
* Seeded memory and retrieval stores: no published corpus exists for `corp_missing_404`.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the rejected query ref and validation-failure artifact.

### Given / When / Then

Given a caller issues `Search` against a corpus id that has no published snapshot,
When the subsystem validates the retrieval request,
Then it rejects the query before retrieval, reranking, or result packaging begins.

### Required assertions

`Required fixtures:`

* The named corpus truly has no published snapshot.

`Required observability artifacts:`

* Retrieval query receipt and validation-failure artifact.
* Explicit absence of `rag.filter`, `rag.rerank`, and `rag.package_results` success artifacts for the rejected query.

`Required replay artifacts:`

* Rejected query ref and validation-failure output.

`Pass/fail oracle:`

* The scenario passes only if unknown-corpus validation stops the request before any retrieval work claims success.

### Required harness capabilities

* Retrieval-query harness
* Seeded unknown-corpus fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Invalid metadata filter dimensions are rejected before search and reranking
* `Risk level:` Medium
* `Rationale:` Proves filter validation is a real safety boundary. Unsupported or disallowed filter dimensions must not degrade into ambiguous retrieval behavior.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: RAG metadata-filter support and invalid-filter failure mode
* Layer 2: RAG configuration for `allowMetadataFilterDimensions`

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one retrieval request `query_rag_bad_filter`, one published corpus `corp_docs_filter@v2`, and one config snapshot whose allowed metadata filter dimensions exclude `secret_owner_team`.
* Seeded policy rules: allow access to `corp_docs_filter@v2` only under supported filter dimensions.
* Seeded memory and retrieval stores: the corpus exists and contains matching content, so rejection is caused only by the invalid filter dimension.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the rejected query and filter-validation artifact.

### Given / When / Then

Given a caller issues `Search` with a metadata filter dimension that is not allowed by the effective configuration,
When the subsystem validates the query,
Then it rejects the query before retrieval and reranking instead of silently ignoring or broadening the filter.

### Required assertions

`Required fixtures:`

* The only invalid element of the query is the unsupported or disallowed filter dimension.

`Required observability artifacts:`

* Retrieval query receipt and filter-validation failure artifact.
* Explicit absence of successful retrieval, reranking, and result-packaging artifacts for the query.

`Required replay artifacts:`

* Query ref, config snapshot ref or effective config evidence, and filter-validation failure output.

`Pass/fail oracle:`

* The scenario passes only if invalid metadata filters fail closed before retrieval work begins.

### Required harness capabilities

* Retrieval-query harness
* Config fixture service
* Seeded filterable-corpus fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Restricted corpus access without approval is denied and exposes no unauthorized evidence
* `Risk level:` High
* `Rationale:` Proves corpus access boundaries are real even on the read path. The subsystem must not leak evidence from restricted corpora when approval is absent.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: RAG restricted-corpus access rules and access-denial behavior
* Layer 2: Policy and Approval deny path for `cross_scope_access`

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one caller access context `ctx_rag_restricted_denied`, one restricted corpus `corp_secret_ops@v1`, and no approval or allow decision for that corpus.
* Seeded policy rules: deny `cross_scope_access` to `corp_secret_ops@v1` for this caller.
* Seeded memory and retrieval stores: the restricted corpus contains relevant results; no authorized corpus contains equivalent answers.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the denied access decision and rejected retrieval artifact.

### Given / When / Then

Given a caller requests retrieval from a restricted corpus without approval,
When policy evaluates the cross-scope or restricted access request,
Then the retrieval is denied and no evidence from the restricted corpus is returned.

### Required assertions

`Required fixtures:`

* The only matching evidence lives in the restricted corpus.
* No approval artifact exists for the request.

`Required observability artifacts:`

* Access evaluation request and deny decision ref.
* Rejected retrieval artifact or denial record.
* Explicit absence of selected result refs and citation package refs from the restricted corpus.

`Required replay artifacts:`

* Query ref, deny decision ref, and rejected retrieval outcome.

`Pass/fail oracle:`

* The scenario passes only if unauthorized corpus evidence is not returned and the denied read remains replay-visible.

### Required harness capabilities

* Retrieval-query harness
* Policy fixture service for restricted corpus access
* Restricted-corpus fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Source-ingestion failure preserves source provenance and publishes no new snapshot
* `Risk level:` Medium
* `Rationale:` Proves ingestion fails audibly instead of disappearing. Source provenance must survive a failed ingest so operators can audit what was attempted.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG ingestion failure mode for connector or normalization failure
* Layer 2: RAG source-provenance preservation on failed ingestion

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one ingestion request `ingest_rag_source_fail` for corpus `corp_ingest_fail@v1`, one approved source whose connector or normalization step is forced to fail, and one config snapshot with normal publication rules.
* Seeded policy rules: allow ingestion of the source if normalization succeeds.
* Seeded memory and retrieval stores: the target corpus has a prior stable snapshot but no new content from this failed ingestion.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the source ref, ingestion request ref, and failure artifact.

### Given / When / Then

Given an approved source is submitted for ingestion and normalization fails,
When `Ingest` processes the request,
Then the subsystem records the failed ingest with source provenance and does not publish a new searchable snapshot.

### Required assertions

`Required fixtures:`

* The failure occurs during connector or normalization work rather than snapshot publication.

`Required observability artifacts:`

* Ingestion request receipt, source ref, and ingestion-failure artifact.
* Explicit absence of a new snapshot publication artifact for the failed ingest.

`Required replay artifacts:`

* Ingestion request ref, source ref, and failure artifact.

`Pass/fail oracle:`

* The scenario passes only if source provenance is preserved and no new snapshot becomes available from the failed ingest.

### Required harness capabilities

* Operator ingestion driver
* Failure-injection harness for source normalization
* Snapshot harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Snapshot publication failure fails closed before a new snapshot becomes searchable
* `Risk level:` High
* `Rationale:` Proves replay-visible publication is a hard boundary. If snapshot publication fails, the subsystem must not act as if the new snapshot is searchable.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG snapshot-publication rules and failure mode
* Layer 2: RAG rule that published retrieval snapshots are replay-visible and must be stable for replay

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one ingestion request `ingest_rag_publish_fail` for corpus `corp_publish_fail@v4`, one approved source that normalizes successfully, and one injected failure during snapshot publication.
* Seeded policy rules: allow the ingest if publication succeeds.
* Seeded memory and retrieval stores: a previous snapshot exists for the corpus so accidental promotion of partially published content can be detected.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the ingestion request, source ref, and publication-failure artifact while keeping the prior snapshot as the last active snapshot.

### Given / When / Then

Given normalization succeeds for new corpus content but snapshot publication fails,
When `Ingest` attempts to publish the new searchable snapshot,
Then the subsystem fails closed and does not mark the new snapshot as searchable or active.

### Required assertions

`Required fixtures:`

* The failure occurs during snapshot publication after normalization is complete.
* A previous stable snapshot exists so accidental replacement can be detected.

`Required observability artifacts:`

* Ingestion request receipt, source ref, and snapshot-publication failure artifact.
* Explicit absence of a successful new `CorpusSnapshotRef` becoming active.
* Continued visibility of the prior active snapshot.

`Required replay artifacts:`

* Ingestion request ref, source ref, failure artifact, and prior active snapshot ref.

`Pass/fail oracle:`

* The scenario passes only if publication failure prevents the new snapshot from becoming searchable and leaves the prior snapshot as the authoritative active state.

### Required harness capabilities

* Operator ingestion driver
* Failure-injection harness for snapshot publication
* Snapshot harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Citation packaging failure blocks retrieval success and no uncited authoritative result is emitted
* `Risk level:` High
* `Rationale:` Proves provenance is mandatory, not decorative. Retrieval must not claim success if citation packaging cannot preserve source identity.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG citation and evidence packaging rules
* Layer 2: RAG citation-packaging failure mode and no-uncited-authoritative-result guarantee

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one retrieval query `query_rag_package_fail`, one published snapshot with matching results, and one injected packaging failure after retrieval and reranking but before final result assembly.
* Seeded policy rules: allow access to the target corpus and filters.
* Seeded memory and retrieval stores: matching chunks exist and retrieval plus reranking can succeed deterministically.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the query ref, intermediate result refs if any, and packaging-failure artifact.

### Given / When / Then

Given retrieval and reranking produce candidate results but citation packaging fails before final assembly,
When the subsystem tries to produce the final `RetrievalResult`,
Then it fails closed and does not emit an uncited authoritative result set.

### Required assertions

`Required fixtures:`

* Retrieval and reranking succeed before packaging fails.

`Required observability artifacts:`

* Query receipt, filter and rerank summaries, and citation-packaging failure artifact.
* Explicit absence of a successful final `RetrievalResult` or citation package ref for the failed request.

`Required replay artifacts:`

* Query ref, any intermediate selected-result refs, and packaging-failure artifact.

`Pass/fail oracle:`

* The scenario passes only if packaging failure prevents authoritative success from being claimed and no uncited result is treated as authoritative evidence.

### Required harness capabilities

* Retrieval-query harness
* Failure-injection harness for citation packaging
* Retrieval-result harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Lower-precedence overrides cannot widen default corpora or metadata-filter dimensions beyond higher-level policy
* `Risk level:` High
* `Rationale:` Proves configuration and policy precedence actually constrain retrieval access. Lower-level inputs may tighten a query, but they must not broaden corpus reach or filter power against higher-level controls.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: RAG configuration precedence for `defaultAllowedCorpora` and `allowMetadataFilterDimensions`
* Layer 2: RAG no-widening rule for lower-level config against higher-level policy

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one system or scope-level config allowing only `corp_public_docs@v1` and filter dimensions `doc_type` and `product`, one lower-precedence run override attempting to add `corp_secret_docs@v2` and filter dimension `secret_owner_team`, and one retrieval request whose business goal could match documents in both corpora.
* Seeded policy rules: allow retrieval only within `corp_public_docs@v1` and only within the higher-level allowed filter dimensions.
* Seeded memory and retrieval stores: both corpora contain relevant matches so widened access would be observable.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the effective config snapshot, policy decision ref if used, and final retrieval outcome.

### Given / When / Then

Given higher-precedence configuration and policy allow only one public corpus and a limited filter set,
When a lower-precedence override attempts to widen the retrieval request to an additional secret corpus and a disallowed filter dimension,
Then the subsystem must not search the widened corpus set or apply the disallowed filter dimension, and the winning higher-precedence posture must remain replay-visible.

### Required assertions

`Required fixtures:`

* Relevant matches exist in both the allowed and attempted-widened corpora.
* The higher-precedence config and policy restrictions are both present in the effective evaluation context.

`Required observability artifacts:`

* Effective config snapshot ref showing the higher-precedence allowed corpora and filter dimensions.
* Policy decision ref or access-control evidence for the effective corpus boundary.
* Retrieval query ref and final retrieval outcome.
* Explicit absence of selected result refs from the widened secret corpus.

`Required replay artifacts:`

* Effective config snapshot ref, query ref, policy decision or access-control ref, and final retrieval outcome refs.

`Pass/fail oracle:`

* The scenario passes only if lower-precedence inputs do not broaden the actual retrieval access and replay shows the higher-precedence config and policy posture that blocked widening.

### Required harness capabilities

* Retrieval-query harness
* Config fixture service with precedence controls
* Policy fixture service
* Seeded multi-corpus retrieval fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Replay with missing retrieval artifacts falls back only as explicit best-effort when live fallback is allowed
* `Risk level:` Medium
* `Rationale:` Proves replay fidelity is declared rather than assumed. Live rerun may help operators when artifacts are missing, but it must never masquerade as authoritative history.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: RAG replay behavior for missing artifacts and `allowLiveRetrievalFallbackOnReplay`
* Layer 2: Observability replay manifest fidelity posture and missing-ref handling

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one historical run `run_rag_best_effort`, one config snapshot with `allowLiveRetrievalFallbackOnReplay = true`, one stored retrieval query ref, and intentionally missing selected-result or citation-package artifacts.
* Seeded policy rules: the rerun query is still allowed against the same corpus boundary.
* Seeded memory and retrieval stores: the referenced corpus snapshot or a live retrievable equivalent exists so live rerun is possible, but the original historical result artifacts are missing.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: none.
* Execution-space posture: not material.
* Approval or replay fixtures: the replay manifest includes missing-ref markers or degraded posture metadata tied to the absent retrieval artifacts.

### Given / When / Then

Given a historical retrieval query is replayed after its original result artifacts are missing and live replay fallback is explicitly allowed,
When replay re-executes retrieval to provide operator assistance,
Then the replay result is marked best-effort rather than authoritative and the missing historical artifacts remain visible as the reason for degradation.

### Required assertions

`Required fixtures:`

* Original retrieval result artifacts are unavailable.
* Live fallback is explicitly enabled in the effective config.

`Required observability artifacts:`

* Replay manifest or run summary with best-effort fidelity posture.
* Missing-ref or degraded-replay markers tied to the absent retrieval artifacts.
* Live rerun query record and any returned operator-assistance result refs.

`Required replay artifacts:`

* Original historical query ref, missing-artifact markers, effective config snapshot ref enabling fallback, live rerun query ref if executed, and best-effort replay posture markers.

`Pass/fail oracle:`

* The scenario passes only if live fallback happens only when allowed and any replay produced from rerun retrieval is labeled best-effort instead of authoritative.

### Required harness capabilities

* Operator replay driver
* Config fixture service
* Seeded missing-artifact historical-run fixture service
* Retrieval-query harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None
