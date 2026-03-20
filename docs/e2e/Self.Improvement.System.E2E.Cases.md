# Self-Improvement System E2E Cases

This document proposes thirteen deterministic E2E scenarios for the Self-Improvement System subsystem.
It covers both end-to-end user and operator journeys and module smoke scenarios so the same suite can validate offline-only isolation, baseline pinning, immutable candidate creation, scope-safe evidence curation, static validation, evaluation gating, review-bound promotion, bounded delegation, sandboxed generation, replay-grade auditability, and fail-closed recovery.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic chat ingress plus operator objective-intake, review, promotion, audit, and replay drivers
* seeded identity, thread, collaborative-scope, configuration, policy, prompt, skill, policy, retrieval, and dataset registry fixtures
* recorded model adapter mode for live evidence-producing runs plus deterministic offline generation and evaluation modes
* seeded memory-conflict and retrieval-corpus fixtures for evidence curation inputs
* dedicated execution-space fixtures, bounded tool profiles, trace collector, lineage-graph materializer, target-subsystem admission harnesses, and replay verifier

## Suite structure

### User-journey scenarios

1. incident-triggered prompt improvement stays inactive until separate reviewed promotion and later binding selection
2. scheduled retrieval-profile optimization curates replay-visible evidence and holdout data without mixing tuning and evaluation slices
3. permission-broadening skill candidate is review-visible and exact-hash-bound through publication handoff
4. operator audit reconstructs full objective lineage and promotion history with best-effort labeling for non-deterministic generation replay

### Module smoke scenarios

5. objective intake rejects open-ended or under-specified improvement work before queueing
6. cross-scope evidence aggregation without approved dataset governance is denied and no mixed evidence slice is committed
7. candidate generation fails closed when the required dedicated execution space or approved tool profile cannot be attached
8. delegated evaluator child run stays scope-bounded and cannot publish or activate live artifacts
9. evaluation-dataset candidate with tuning or holdout leakage fails static validation before evaluation starts
10. policy-artifact candidate that fails a hard-block safety gate returns `reject_candidate` and emits no promotion request
11. baseline or evaluation-template drift marks the objective `stale` before promotion
12. reviewed candidate hash mismatch is rejected during promotion handoff and leaves the prior live version selected
13. target-surface kill switch stops queued generation without deleting historical evidence

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Incident-triggered prompt candidate remains inactive until reviewed promotion and later binding selection
* `Risk level:` High
* `Rationale:` Proves the core self-improvement guarantee: offline evidence can create a reviewed prompt candidate, but live behavior must remain unchanged until a separate governed promotion and binding step selects the new version.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Self-Improvement objective intake, pinned baseline, inactive-by-default candidate output, review bundle assembly, and promotion handoff
* Layer 2: Observability evaluation-ready feeds, objective timeline, baseline-to-candidate lineage graph, and candidate-to-promotion history
* Layer 2: Policy and Approval evaluation for offline evidence reads, candidate writes, and report-generation tools used by the improvement run
* Layer 2: Context Assembly and agent-configuration ownership of prompt selection on later live runs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one end user `user_si_prompt`, one source thread `thread_si_prompt_source` with replay-visible failed runs in collaborative scope `scope_si_prompt`, one operator `user_si_prompt_ops` with governance thread `thread_si_prompt_ops`, one baseline prompt artifact `prompt.support.default@v7`, and one config snapshot that continues selecting `@v7` for live traffic until an explicit later binding change.
* Seeded policy rules: allow same-scope evidence reads, allow candidate prompt writes only to governed candidate storage, allow diff and report tools inside the offline profile, and deny any direct live prompt-binding mutation from the improvement run.
* Seeded memory and retrieval stores: no memory writes are required; one bounded retrieval corpus of policy-approved runbooks is available for offline evidence curation and remains distinct from the failed-run trace evidence.
* Selected model mode: deterministic offline generation mode that emits one prompt candidate `prompt.support.default@v8-candidate` plus one replay-based evaluator mode for baseline-versus-candidate comparison.
* Selected tool implementations: one deterministic diff-summary tool, one governed candidate-artifact writer, and one report-packager tool.
* Expected capability set: only the approved offline diff, candidate-write, and report-generation capabilities are exposed; no live channel or business-action tools are available.
* Execution-space posture: one dedicated writable execution space `es_si_prompt` with bounded filesystem access to candidate storage, no live user-response channel, and no unrestricted host fallback.
* Approval or replay fixtures: one review decision fixture bound to the exact candidate hash, one promotion-request fixture, one later configuration-binding change fixture, and replay refs for baseline, evidence slice, candidate hash, evaluation result, review bundle, and later live prompt selection.

### Given / When / Then

Given repeated user-visible failures on `prompt.support.default@v7` have produced replay-visible traces and an operator opens a bounded `prompt_artifact` improvement objective,
When the self-improvement run pins the `@v7` baseline, curates the failed-run evidence slice, generates `@v8-candidate` inside `es_si_prompt`, validates and evaluates it, assembles a review bundle, receives approval for the exact candidate hash, and later hands a promotion request to the prompt-owning configuration path,
Then live runs continue using `@v7` until a separate reviewed binding selection explicitly points live configuration at the approved new version, and only later live runs show the promoted prompt hash.

### Required assertions

`Required fixtures:`

* The baseline prompt version selected for live traffic remains `prompt.support.default@v7` until the explicit later binding change.
* Candidate artifact storage is separate from the live prompt-selection path.
* The review decision is bound to the exact candidate hash and immutable candidate ref.

`Required observability artifacts:`

* Objective lifecycle events from intake through review and promotion request.
* Evidence-slice ref with selection rationale and source run refs.
* Candidate-generation refs, diff summary ref, validation outcome, and evaluation result.
* Review bundle ref, reviewer decision ref, and promotion-request ref.
* Later configuration snapshot ref showing when the selected prompt version changes.
* Later live-run context or render artifact ref proving which prompt hash was actually selected.

`Required replay artifacts:`

* Baseline prompt ref, evidence-slice ref, offline model input and output refs, tool input and output refs, policy decision refs, candidate artifact ref and hash, evaluation plan ref, evaluation result ref, review bundle ref, and promotion-request ref.
* Later binding snapshot ref and later live-run prompt hash or render artifact ref.

`Pass/fail oracle:`

* The scenario passes only if the candidate stays inactive through generation, evaluation, and approval, no live run switches prompt versions before the separate binding-selection event, and replay can prove the full chain from source evidence to later live prompt selection.

### Required harness capabilities

* Synthetic chat channel driver
* Identity and thread fixture service
* Operator objective-intake and review drivers
* Deterministic offline generation and replay-evaluation model modes
* Governed candidate-artifact storage harness
* Sandbox harness with dedicated writable execution space
* Prompt-binding admission or configuration-selection harness
* Trace collector, lineage-graph materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Scheduled retrieval-profile objective curates replay-visible evidence and separate holdout data before promotion review
* `Risk level:` Medium
* `Rationale:` Proves evidence-grounded retrieval optimization remains governed: the subsystem must curate evidence explicitly, keep synthesis inputs distinct from evaluation holdout data, preserve citation and cost tradeoffs, and avoid any hidden live retrieval change.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Memory and Retrieval Must Remain Distinct`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement evidence-slice curation, dataset curation rules, evaluation planning, and retrieval-profile promotion handoff
* Layer 2: RAG retrieval-profile ownership, citation compatibility, and replay-visible query and result refs
* Layer 2: Observability evaluation-ready feeds, redaction and scope-safe export rules, and scorecard-comparison views

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one scheduled governance principal `svc_si_retrieval`, one governance thread `thread_si_retrieval_ops`, one collaborative scope `scope_si_retrieval`, one baseline retrieval profile `retrieval.docs.default@v3`, and one config snapshot that keeps `@v3` live until a later reviewed RAG rollout.
* Seeded policy rules: allow same-scope reads of replay-visible degraded runs and retrieval artifacts, allow governed writes to candidate profile storage and evaluation scorecards, and deny cross-scope corpus access.
* Seeded memory and retrieval stores: one same-scope retrieval corpus snapshot, one evaluation-ready feed of degraded or expensive runs, and one disjoint holdout dataset version `eval.retrieval.si@v2` whose examples do not overlap with the candidate-synthesis slice.
* Selected model mode: deterministic offline generation mode that proposes one retrieval-profile candidate `retrieval.docs.default@v4-candidate` and one deterministic evaluation mode that runs replay-based regression plus holdout scoring.
* Selected tool implementations: one profile-diff tool, one citation-check tool, and one scorecard writer.
* Expected capability set: only offline analysis, citation-check, diff, and governed artifact-writing capabilities are exposed.
* Execution-space posture: one dedicated read-write execution space `es_si_retrieval` with access to pinned replay artifacts and candidate storage, but no live retrieval-serving path.
* Approval or replay fixtures: one scheduled-objective fixture, one evaluation-plan fixture with hard gates for citation integrity and regression bounds, one review-bundle fixture, and replay refs for evidence slices, split definitions, profile diff, and evaluation results.

### Given / When / Then

Given a scheduled governance job targets a retrieval profile that has produced replay-visible costly or degraded runs in one collaborative scope,
When the self-improvement system pins `retrieval.docs.default@v3`, curates a bounded synthesis evidence slice from the degraded runs, keeps a separate holdout dataset version for evaluation, generates `@v4-candidate`, runs citation and cost-aware evaluation, and assembles a review bundle for the RAG-owning subsystem,
Then the candidate remains non-live, the tuning slice and holdout dataset remain separately versioned, and the review materials show the exact tradeoffs required before any RAG publication or selection step.

### Required assertions

`Required fixtures:`

* The synthesis evidence slice and holdout dataset are distinct immutable refs.
* The baseline retrieval profile remains the live selection throughout the offline run.
* Citation and cost gates are pinned in the evaluation plan.

`Required observability artifacts:`

* Scheduled objective trigger ref and objective lifecycle events.
* Evidence-slice refs with source-run linkage and selection rationale.
* Dataset split or normalization refs proving tuning-versus-holdout separation.
* Candidate profile ref, diff summary ref, citation-check output, evaluation plan ref, evaluation result ref, and scorecard-comparison view.
* Review bundle ref with requested target subsystem and activation intent.

`Required replay artifacts:`

* Baseline retrieval-profile ref, evidence-slice refs, dataset-version refs, offline model refs, tool refs, policy decision refs, candidate profile ref, evaluation plan ref, evaluation result ref, and review-bundle ref.

`Pass/fail oracle:`

* The scenario passes only if the subsystem produces a separately versioned candidate and holdout evaluation package, keeps live retrieval unchanged, and preserves enough replay evidence to explain exactly why the candidate was or was not worth promotion review.

### Required harness capabilities

* Scheduled governance objective driver
* Identity and thread fixture service
* Seeded retrieval-corpus and evaluation-feed fixtures
* Deterministic offline generation and evaluation modes
* Citation-check and scorecard harnesses
* Sandbox harness with dedicated execution space
* RAG target-admission harness
* Trace collector, scorecard materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Permission-broadening skill candidate is review-visible and exact-hash-bound through publication handoff
* `Risk level:` High
* `Rationale:` Proves self-improvement can propose a stronger skill version only through explicit governance. Permission expansion must be surfaced, approval must bind to the exact candidate hash, and the Skills System must publish a new immutable version rather than mutate an existing one.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement target-specific static validation, risk-change detection, review-bundle requirements, and promotion handoff
* Layer 2: Skills immutable versioning, admission rules, risk-visible governance, and publication-state rules
* Layer 2: Sandbox dedicated execution-space requirement for runtime-backed skill validation
* Layer 2: Policy and Approval evaluation for offline code analysis, tool access, and candidate publication handoff

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_skill_ops`, one governance thread `thread_si_skill_ops`, one collaborative scope `scope_si_skill`, one baseline skill version `skill.repo.repair@v12`, and one binding snapshot that still selects `@v12` for live activation.
* Seeded policy rules: allow same-scope evidence reads, allow offline bundle inspection and governed candidate writes, require explicit review visibility for any permission broadening, and deny direct live binding mutation from the improvement run.
* Seeded memory and retrieval stores: one bounded same-scope evidence slice that includes failed live runs and one separate retrieval pack of published skill documentation; no memory writes are required.
* Selected model mode: deterministic offline generation mode that produces one runtime-backed skill candidate `skill.repo.repair@v13-candidate` with a broader declared permission profile and one deterministic evaluation mode for non-regression checks.
* Selected tool implementations: one bundle-integrity checker, one permission-diff analyzer, one governed artifact writer, and one report-packager.
* Expected capability set: only offline validation, diffing, and governed candidate-storage tools are exposed; live publication and binding controls are not exposed to the generation run.
* Execution-space posture: one dedicated execution space `es_si_skill` capable of bounded bundle validation, filesystem inspection, and controlled network denial, with no unrestricted host access.
* Approval or replay fixtures: one review decision fixture bound to the exact skill-candidate hash, one Skills admission harness, one immutable publication fixture for the accepted new version, and replay refs for permission diff, evaluation result, review bundle, and publication outcome.

### Given / When / Then

Given repeated failures on `skill.repo.repair@v12` motivate a bounded `skill_version` improvement objective,
When the self-improvement system generates `@v13-candidate`, static validation detects that the candidate broadens permissions relative to `@v12`, evaluation confirms non-regression, reviewers approve the exact candidate hash with visible warnings, and the Skills System admits the candidate through its own publication rules,
Then the target subsystem publishes a new immutable skill version rather than changing `@v12` in place, and the promotion lineage remains replay-visible from evidence slice to published version.

### Required assertions

`Required fixtures:`

* The candidate permission profile is broader than the baseline and the diff is deterministically detectable.
* The approved review decision is bound to the exact candidate hash and immutable artifact ref.
* Live binding still points to `skill.repo.repair@v12` until a separate binding change occurs outside the generation path.

`Required observability artifacts:`

* Objective lifecycle events, evidence-slice ref, candidate-skill ref, permission-diff output, validation outcome, and evaluation result.
* Review bundle ref showing risk broadening, unresolved issues, and requested target subsystem.
* Approval decision ref bound to the exact candidate hash.
* Skills publication outcome ref showing creation of a new immutable version rather than mutation of `@v12`.

`Required replay artifacts:`

* Baseline skill ref, candidate skill ref and hash, offline model refs, tool refs, policy decision refs, evaluation plan and result refs, review-bundle ref, approval ref, and Skills publication outcome ref.

`Pass/fail oracle:`

* The scenario passes only if permission broadening is surfaced to reviewers, approval stays bound to the exact candidate hash, the target subsystem publishes a new immutable version, and no existing published skill version is mutated in place.

### Required harness capabilities

* Operator objective-intake and review drivers
* Identity and thread fixture service
* Deterministic offline generation and evaluation modes
* Bundle-integrity and permission-diff harnesses
* Sandbox harness with dedicated execution space
* Skills publication and admission harness
* Trace collector, lineage-graph materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Operator audit reconstructs objective lineage and labels non-deterministic generation replay as best effort
* `Risk level:` Medium
* `Rationale:` Proves the subsystem is auditable after the fact. Operators must be able to reconstruct what evidence was used, what was reviewed, and what was promoted, while distinguishing authoritative records from best-effort generation replay.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement required signals, required views, and replay posture
* Layer 2: Observability artifact-index, replay-manifest posture, and evaluation-ready feed lineage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator auditor `user_si_audit`, one governance thread `thread_si_audit`, one collaborative scope `scope_si_audit`, and one previously completed improvement objective with immutable refs for evidence, candidate, evaluation, review, and promotion outcome.
* Seeded policy rules: allow the operator to read redacted raw artifacts, lineage views, review decisions, and promotion outcomes for the relevant scope.
* Seeded memory and retrieval stores: not material beyond the fact that some underlying evidence originated from memory-conflict and retrieval-related feeds already captured in the immutable evidence slice.
* Selected model mode: one historical non-deterministic generation run whose exact generation replay posture is `best_effort`, plus deterministic evaluation artifacts recorded authoritatively.
* Selected tool implementations: one audit-read artifact resolver and one lineage-graph viewer.
* Expected capability set: read-only audit and replay capabilities only.
* Execution-space posture: no new side-effecting execution is required; audit reads operate over stored artifacts and views.
* Approval or replay fixtures: one immutable objective timeline view, one baseline-to-candidate lineage graph, one candidate-to-promotion history view, one replay manifest, and stored generation, evaluation, review, and promotion refs.

### Given / When / Then

Given an operator audits a prior self-improvement objective whose generation path used a non-deterministic model profile,
When the audit flow loads the objective timeline, evidence-to-candidate lineage, evaluation scorecards, review decision, promotion outcome, and replay manifest,
Then the operator can reconstruct exactly what was reviewed and promoted, and the system labels candidate-generation replay as `best_effort` rather than implying exact determinism where the evidence does not support it.

### Required assertions

`Required fixtures:`

* The stored replay posture for the generation step is non-authoritative and explicitly labeled.
* The evaluation, review, and promotion refs remain immutable and readable in the auditor's scope.

`Required observability artifacts:`

* Objective timeline view.
* Baseline-to-candidate lineage graph.
* Evidence-to-candidate trace.
* Candidate-to-promotion history view.
* Evaluation scorecard comparison view.
* Replay manifest showing posture for the generation step.

`Required replay artifacts:`

* Evidence-slice refs, baseline refs, candidate refs and hashes, evaluation-plan refs, evaluation-result refs, review-bundle ref, approval refs, promotion outcome refs, and replay-posture metadata.

`Pass/fail oracle:`

* The scenario passes only if the audit flow can reconstruct the full governance chain and clearly labels any non-deterministic generation replay as best effort while keeping the reviewed and promoted artifact refs authoritative.

### Required harness capabilities

* Operator audit driver
* Identity and thread fixture service
* Artifact-index and lineage-graph harnesses
* Replay-manifest reader
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` Open-ended objective never enters the execution queue
* `Risk level:` Medium
* `Rationale:` Proves the intake boundary is bounded. The subsystem must reject under-specified work such as "improve everything" instead of allowing ungoverned offline generation to start.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Self-Improvement objective requirements and bounded objective intake rules

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_invalid`, one governance thread `thread_si_invalid`, one collaborative scope `scope_si_invalid`, and one config snapshot that requires target surface, baseline ref, evaluation template, budget ceiling, timeout ceiling, and candidate-count limit before execution.
* Seeded policy rules: allow objective submission logging but no execution attempt for invalid objectives.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none, because no offline run should start.
* Selected tool implementations: none.
* Expected capability set: no generation or evaluation capability may be exposed because the objective is invalid before execution.
* Execution-space posture: no execution space may be allocated.
* Approval or replay fixtures: one invalid objective payload fixture whose statement is open-ended and omits baseline, evaluation template, and budget constraints.

### Given / When / Then

Given an operator submits an objective equivalent to "improve everything" without a target surface, pinned baseline, evaluation template, or budget limits,
When intake validates the required objective fields,
Then the objective does not enter `queued`, no improvement run attempt or execution-space allocation occurs, and the rejection reason is preserved as governance evidence.

### Required assertions

`Required fixtures:`

* The submitted objective is missing at least one required boundedness field and is explicitly open-ended.
* No pre-existing valid objective version is attached that could be reused.

`Required observability artifacts:`

* Objective-submission ref.
* Validation-failure record describing the missing required fields.
* Explicit absence of any queued run-attempt, execution-space allocation, candidate artifact, or evaluation-plan refs.

`Required replay artifacts:`

* Invalid objective payload ref, validation-failure ref, and effective configuration snapshot ref that made the objective invalid.

`Pass/fail oracle:`

* The scenario passes only if the invalid objective remains outside the execution queue and the subsystem records why it was rejected without creating any run attempt or candidate artifact.

### Required harness capabilities

* Operator objective-intake driver
* Identity and thread fixture service
* Objective-validation harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Cross-scope evidence aggregation without approved dataset governance is denied
* `Risk level:` High
* `Rationale:` Proves scope-safe evidence handling. The subsystem must not mix evidence across collaborative scopes unless an explicit approved dataset contract allows it.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Self-Improvement evidence-safety invariant and dataset curation rules for cross-scope evidence
* Layer 2: Policy and Approval cross-scope read rules and explicit scope-transition conditions
* Layer 2: Observability evaluation-ready export redaction and scope-control rules

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_scope`, one governance thread `thread_si_scope`, one objective bound to collaborative scope `scope_A`, and no approved cross-scope dataset contract for `scope_B`.
* Seeded policy rules: allow same-scope evidence reads in `scope_A`, deny unapproved cross-scope trace, memory-conflict, and retrieval-feed access from `scope_B`, and require any approved scope transition to name the exact data slice.
* Seeded memory and retrieval stores: one same-scope evidence slice in `scope_A` and one tempting but unauthorized evidence slice in `scope_B`.
* Selected model mode: none required beyond evidence selection; no generation may proceed after denial.
* Selected tool implementations: one evidence-selector tool that must request policy for every scope transition.
* Expected capability set: only same-scope evidence reads are executable; mixed-scope access is not executable without explicit approval.
* Execution-space posture: one read-only execution space `es_si_scope` used for bounded evidence inspection.
* Approval or replay fixtures: one attempted mixed-scope evidence-selection request and one denial fixture with scope-transition conditions omitted because approval was not granted.

### Given / When / Then

Given an improvement objective in `scope_A` attempts to aggregate degraded-run evidence from both `scope_A` and `scope_B`,
When the evidence-selector requests cross-scope access and policy evaluates the transition,
Then policy denies the mixed-scope read, no combined evidence slice is committed, and the objective retains only authorized same-scope evidence.

### Required assertions

`Required fixtures:`

* No approved cross-scope dataset contract exists for the requested scope pair.
* The unauthorized evidence slice in `scope_B` would have been relevant if policy had allowed it.

`Required observability artifacts:`

* Evidence-selection request ref with requested source scopes.
* Policy evaluation request, decision ref, and any returned deny reasons.
* Explicit absence of a committed mixed-scope evidence-slice ref.
* Objective event showing continued bounded status after the denial.

`Required replay artifacts:`

* Evidence-selection request ref, policy decision ref, authorized same-scope evidence refs, and effective scope metadata.

`Pass/fail oracle:`

* The scenario passes only if unapproved cross-scope evidence is excluded, the denial is replay-visible, and no mixed evidence slice becomes available to generation or review.

### Required harness capabilities

* Operator objective-intake driver
* Identity and thread fixture service
* Policy fixture service for cross-scope reads
* Read-only sandbox harness
* Evidence-slice harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Generation run fails closed when the required dedicated execution space cannot be attached
* `Risk level:` High
* `Rationale:` Proves the execution-space trust boundary is real for self-improvement. If the offline run cannot get the required dedicated sandbox or approved tool profile, generation must fail before any candidate artifact is written.

### Contracts validated

* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Self-Improvement dedicated execution-space requirement and bounded tool posture
* Layer 2: Sandbox allocation, attachment, and fail-closed enforcement rules

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_exec`, one governance thread `thread_si_exec`, one objective whose target surface requires static analysis and diff generation, and one offline tool profile that requires a writable execution space.
* Seeded policy rules: allow the requested offline tools only if a compatible execution space is attached with the approved path and quota constraints.
* Seeded memory and retrieval stores: one same-scope evidence slice is available for analysis; no persistent memory writes are allowed.
* Selected model mode: deterministic offline generation mode that would request static-analysis and diff tools if the execution environment is valid.
* Selected tool implementations: one static-analysis tool and one diff tool, both sandbox-backed.
* Expected capability set: the tools become executable only when the required execution space is attached successfully.
* Execution-space posture: the test fixture simulates failed allocation or incompatible attachment for `es_si_exec`.
* Approval or replay fixtures: one failed allocation fixture, one host-execution spy, and one candidate-storage spy to detect any unintended fallback.

### Given / When / Then

Given an improvement run reaches `provisioning` for a candidate-generation path that requires sandbox-backed analysis tools,
When execution-space allocation or attachment fails for the approved offline profile,
Then the run fails closed before generation starts, no host fallback occurs, and no candidate artifact or report claims successful generation.

### Required assertions

`Required fixtures:`

* The requested tools genuinely require a dedicated execution space under the configured offline profile.
* The host-execution spy would record any improper fallback outside the sandbox.

`Required observability artifacts:`

* Improvement-run attempt ref showing `queued -> provisioning -> failed`.
* Execution-space allocation or attachment failure ref.
* Capability exposure decision showing the sandbox-backed tools were not executable after the failure.
* Explicit absence of candidate-artifact write success, report success, or host-execution refs.

`Required replay artifacts:`

* Improvement-run attempt ref, execution-space request ref, failure ref, policy decision ref for the intended tool use, capability-exposure decision ref, and preserved failure artifacts sufficient for diagnosis and a later retry attempt.

`Pass/fail oracle:`

* The scenario passes only if generation stops before any candidate write, no host-side execution occurs, and replay shows the failure happened at the execution-space boundary rather than after an unsafe fallback.

### Required harness capabilities

* Operator objective-intake driver
* Identity and thread fixture service
* Deterministic offline generation mode
* Sandbox allocation and attachment harness
* Host-execution spy
* Candidate-storage spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Delegated evaluator child run stays bounded and cannot publish live artifacts
* `Risk level:` High
* `Rationale:` Proves self-improvement delegation remains governed. Child runs may help evaluate candidates, but they must receive only bounded context and must never publish or activate artifacts directly.

### Contracts validated

* Layer 1.5: `Delegation Must Be Bounded`
* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Self-Improvement bounded subagent posture and child publication prohibition
* Layer 2: Policy and Approval delegation rules and explicit child-capability narrowing
* Layer 2: Observability parent-child lineage and child-result traceability

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_child`, one governance thread `thread_si_child`, one collaborative scope `scope_si_child`, and one objective whose evaluation plan permits a bounded delegated analysis step.
* Seeded policy rules: allow one same-scope child spawn with explicit budget, timeout, and allowed-evidence-slice refs; deny any publication, binding, or promotion capability in child runs.
* Seeded memory and retrieval stores: one bounded evidence slice and one bounded holdout dataset ref delegated to the child; unrelated evidence exists but is intentionally excluded.
* Selected model mode: deterministic parent evaluation mode that spawns one child run and deterministic child mode that returns one structured analysis result.
* Selected tool implementations: one read-only metrics tool available to the child and one parent-only promotion-packaging tool that is not delegated.
* Expected capability set: the child receives only the read-only metrics tool and the delegated evidence refs; it receives no candidate-write, publication, or binding capabilities.
* Execution-space posture: one read-only child execution space `es_si_child_readonly` with no write path to live subsystem storage.
* Approval or replay fixtures: one child-delegation approval fixture, one child-result ref, and one parent merge ref.

### Given / When / Then

Given a parent improvement run needs one bounded evaluator child to score a candidate on a delegated evidence subset,
When policy approves the child spawn with explicit task bounds, the child executes using only the delegated evidence and read-only metrics tool, and the parent merges the returned result into the final evaluation package,
Then the child result remains lineage-linked to the parent objective, and the child never gains a path to publish, bind, or activate any live artifact.

### Required assertions

`Required fixtures:`

* The child run has a distinct `runId` but inherits bounded lineage from the parent objective.
* The delegated evidence slice excludes unrelated evidence that exists in the broader scope.
* No publication or promotion capability is present in the child's effective capability set.

`Required observability artifacts:`

* Delegation policy decision ref, child spawn ref, child run lifecycle events, child capability set, child result ref, and parent merge ref.
* Parent-child lineage in the objective timeline or execution graph.
* Explicit absence of child publication or promotion-request refs.

`Required replay artifacts:`

* Parent and child run refs, delegated evidence refs, child tool refs, child result ref, parent merge ref, and delegation approval ref.

`Pass/fail oracle:`

* The scenario passes only if the child run is replay-visible as a bounded subset of the parent evaluation path, receives no live-publication capability, and contributes only a structured evaluation result back to the parent.

### Required harness capabilities

* Parent and child evaluation drivers
* Identity and thread fixture service
* Policy fixture service for delegated child runs
* Deterministic child model mode
* Read-only child tool harness
* Read-only sandbox harness
* Trace collector, lineage-graph materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Evaluation-dataset candidate with split leakage fails static validation before evaluation
* `Risk level:` Medium
* `Rationale:` Proves dataset governance is enforced before scoring. A dataset candidate that reuses the same example for synthesis and holdout evidence must be rejected before evaluation starts.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement dataset curation rules, target-specific static validation for `evaluation_dataset`, and candidate immutability

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_dataset`, one governance thread `thread_si_dataset`, one collaborative scope `scope_si_dataset`, and one objective targeting `evaluation_dataset`.
* Seeded policy rules: allow same-scope evidence reads and dataset-candidate writes to governed candidate storage only.
* Seeded memory and retrieval stores: one bounded evidence slice and one candidate dataset draft where at least one example appears in both the tuning input set and the evaluation holdout split.
* Selected model mode: deterministic offline dataset-construction mode that emits one candidate dataset version `eval.support.si@v3-candidate`.
* Selected tool implementations: one duplicate-leakage checker and one schema validator.
* Expected capability set: dataset validation and governed candidate storage only.
* Execution-space posture: one dedicated execution space `es_si_dataset` with bounded file access to the dataset draft.
* Approval or replay fixtures: one validation-failure fixture for split leakage and one candidate-storage spy for post-validation actions.

### Given / When / Then

Given a bounded `evaluation_dataset` objective produces a candidate dataset whose tuning and holdout splits accidentally share at least one example,
When target-specific static validation checks split integrity and duplicate leakage,
Then validation fails before any evaluation plan starts, the candidate remains inactive, and the failure is preserved for audit and retry.

### Required assertions

`Required fixtures:`

* The duplicated example is deterministically present in both the tuning and holdout splits.
* No pre-existing validated dataset version can be substituted silently.

`Required observability artifacts:`

* Candidate dataset ref and hash.
* Validation output naming the split-leakage failure.
* Explicit absence of evaluation-plan, evaluation-result, review-bundle, and promotion-request refs for the invalid candidate.

`Required replay artifacts:`

* Candidate dataset ref, validation output ref, policy decision refs for dataset reads and writes, and effective split-definition refs.

`Pass/fail oracle:`

* The scenario passes only if validation stops the flow before evaluation, the invalid candidate remains non-live, and replay shows exactly why the split leakage made the candidate ineligible.

### Required harness capabilities

* Operator objective-intake driver
* Identity and thread fixture service
* Deterministic dataset-construction mode
* Duplicate-leakage and schema-validation harnesses
* Sandbox harness with bounded file access
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Policy-artifact candidate that fails a hard-block safety gate yields `reject_candidate`
* `Risk level:` High
* `Rationale:` Proves evaluation gates are authoritative. A policy candidate that increases unsafe high-risk access must be rejected before any promotion handoff is emitted.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement evaluation gates, recommendation posture, and policy-artifact target boundary
* Layer 2: Policy and Approval replay-visible decision semantics for high-risk cross-scope access

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_policy`, one governance thread `thread_si_policy`, one collaborative scope `scope_si_policy`, one baseline policy artifact `policy.agent.access@v5`, and one evaluation template with a hard-block gate for increased unsafe cross-scope allow decisions.
* Seeded policy rules: allow offline replay of historical policy decisions and candidate evaluation, but do not allow live publication from the evaluation path.
* Seeded memory and retrieval stores: one replay slice containing historical denied high-risk cross-scope requests that the baseline policy correctly blocked.
* Selected model mode: deterministic policy-diff generation mode that proposes one candidate `policy.agent.access@v6-candidate` and deterministic replay-evaluation mode over the historical slice.
* Selected tool implementations: one policy-diff summarizer and one regression-score writer.
* Expected capability set: offline diffing, replay evaluation, and governed artifact storage only.
* Execution-space posture: one dedicated execution space `es_si_policy` with no live enforcement path.
* Approval or replay fixtures: one evaluation plan whose hard-block gate fails when the candidate increases unsafe allow decisions on the replay slice.

### Given / When / Then

Given a policy improvement objective proposes a new rule set that appears to reduce friction but broadens high-risk access on historical replay cases,
When the evaluation plan replays the historical denied cases and the candidate fails the hard-block safety gate,
Then the evaluation result returns `reject_candidate`, no promotion request is emitted, and the candidate remains inactive even though it is stored for audit.

### Required assertions

`Required fixtures:`

* The replay slice contains at least one historically denied high-risk action that the candidate would newly allow.
* The unsafe-allow threshold is configured as a hard-block gate rather than an informational metric.

`Required observability artifacts:`

* Candidate policy ref, diff summary ref, evaluation plan ref, evaluation result ref, and gate-outcome details.
* Recommendation posture showing `reject_candidate`.
* Explicit absence of promotion-request or target-publication refs for the failed candidate.

`Required replay artifacts:`

* Baseline policy ref, candidate policy ref, replay-slice refs, evaluation plan ref, evaluation result ref, and gate-definition refs.

`Pass/fail oracle:`

* The scenario passes only if the hard-block failure forces `reject_candidate`, no promotion handoff occurs, and replay can show which historical cases caused the unsafe regression.

### Required harness capabilities

* Operator objective-intake driver
* Identity and thread fixture service
* Deterministic policy-diff generation mode
* Replay-based evaluation harness
* Scorecard and regression writer harnesses
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Baseline or evaluation-template drift marks the objective `stale` before promotion
* `Risk level:` Medium
* `Rationale:` Proves baseline pinning is real. If the pinned baseline or required evaluation template changes after review but before promotion, the objective must become `stale` and require re-evaluation or re-review.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement immutable baseline pinning, `stale` state semantics, and re-review requirement before promotion

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_stale`, one governance thread `thread_si_stale`, one collaborative scope `scope_si_stale`, one approved review bundle for candidate `prompt.support.default@v8-candidate`, one pinned baseline `prompt.support.default@v7`, and one pinned evaluation template `eval.prompt.regression@v2`.
* Seeded policy rules: allow staleness inspection and audit reads but do not allow promotion when the reviewed baseline or evaluation template no longer matches the approved bundle.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none required beyond staleness detection.
* Selected tool implementations: one staleness-check comparator over baseline and evaluation-template refs.
* Expected capability set: audit and staleness-check capabilities only.
* Execution-space posture: not material; read-only comparison over stored refs is sufficient.
* Approval or replay fixtures: one changed baseline or evaluation-template ref that invalidates the earlier comparison, plus one approved review bundle still bound to the older refs.

### Given / When / Then

Given a candidate has already been reviewed and approved against baseline `@v7` and evaluation template `@v2`,
When a later promotion attempt sees that the baseline selection or required evaluation template has changed since the approval was granted,
Then the objective is marked `stale`, promotion does not proceed, and the system requires re-evaluation or re-review against the updated pinned refs.

### Required assertions

`Required fixtures:`

* The approved review bundle is bound to the older baseline or evaluation-template refs.
* The current baseline selection or required template ref differs in a way that invalidates the earlier comparison.

`Required observability artifacts:`

* Approved review-bundle ref.
* Staleness-detection event naming the mismatched baseline or template refs.
* Objective state transition or status update showing `stale`.
* Explicit absence of successful promotion outcome for the stale candidate.

`Required replay artifacts:`

* Original baseline and template refs, updated baseline or template refs, approved review-bundle ref, and staleness-detection ref.

`Pass/fail oracle:`

* The scenario passes only if the stale condition blocks promotion, the mismatched refs are replay-visible, and the system does not treat the old review as still valid for live activation.

### Required harness capabilities

* Operator promotion driver
* Identity and thread fixture service
* Staleness-check harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Reviewed candidate hash mismatch is rejected during promotion handoff
* `Risk level:` High
* `Rationale:` Proves candidate immutability at the final handoff. Approval must bind to the exact reviewed hash, and target-subsystem admission must reject any mutated or substituted artifact before live selection changes.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Self-Improvement approval binding to exact candidate hash, promotion handoff by immutable ref, and no in-place mutation
* Layer 2: Skills immutable publication rules and target admission checks

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one operator `user_si_hash`, one governance thread `thread_si_hash`, one collaborative scope `scope_si_hash`, one approved review bundle for `skill.repo.repair@v13-candidate` bound to hash `H1`, and one live binding that still selects `skill.repo.repair@v12`.
* Seeded policy rules: allow promotion handoff only when the requested artifact ref and hash match the reviewed bundle exactly.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none; this is a governed handoff check.
* Selected tool implementations: one immutable-artifact resolver and one Skills admission validator.
* Expected capability set: promotion handoff and admission validation only.
* Execution-space posture: not material.
* Approval or replay fixtures: one promotion request that references a mutated or substituted candidate artifact with hash `H2 != H1`, one target-admission rejection fixture, and one live-binding snapshot that must remain unchanged.

### Given / When / Then

Given reviewers approved `skill.repo.repair@v13-candidate` at hash `H1`,
When promotion handoff resolves a candidate artifact whose current immutable hash is `H2`,
Then the target admission path rejects the handoff, no new live version is selected, and the prior live binding remains on `skill.repo.repair@v12`.

### Required assertions

`Required fixtures:`

* The approved review bundle is bound to hash `H1`.
* The promotion request resolves to a different immutable hash `H2`.
* A prior approved live version remains available for selection.

`Required observability artifacts:`

* Approved review-bundle ref with hash `H1`.
* Promotion-request ref naming the requested artifact.
* Target-admission rejection ref naming the hash mismatch.
* Live-binding snapshot ref proving the selected live version did not change.

`Required replay artifacts:`

* Candidate artifact refs for both `H1` and `H2`, approved review-bundle ref, promotion-request ref, target-admission outcome ref, and unchanged live-binding snapshot ref.

`Pass/fail oracle:`

* The scenario passes only if the hash mismatch blocks promotion, the rejection is replay-visible, and the previously selected live version remains active with no hidden mutation or substitution.

### Required harness capabilities

* Operator promotion driver
* Identity and thread fixture service
* Immutable-artifact resolver
* Skills admission harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Target-surface kill switch stops queued generation without deleting history
* `Risk level:` Medium
* `Rationale:` Proves emergency controls fail closed. A kill switch may stop new self-improvement work for one target surface, but it must preserve existing evidence, prior candidates, and audit history.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Self-Improvement configuration rules for target-surface kill switches and failure or kill-switch recovery rules

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one scheduled governance principal `svc_si_killswitch`, one governance thread `thread_si_killswitch`, one collaborative scope `scope_si_killswitch`, one queued `skill_version` objective with prior evidence and failed-attempt history already stored, and one higher-precedence system config that disables `skill_version` self-improvement work through a kill switch.
* Seeded policy rules: allow audit reads of existing objective history, but do not allow new run attempts for a disabled target surface.
* Seeded memory and retrieval stores: existing evidence slices remain readable; no new evidence writes are required.
* Selected model mode: none, because no new run may start.
* Selected tool implementations: none beyond audit reads.
* Expected capability set: no generation, evaluation, or promotion capability is executable while the kill switch is active.
* Execution-space posture: no new execution space may be allocated.
* Approval or replay fixtures: one queued objective fixture, one active kill-switch config snapshot, and one preserved history fixture containing prior evidence, prior candidate refs, and prior failed-attempt refs.

### Given / When / Then

Given a queued objective exists for a target surface that is later disabled by a higher-precedence kill switch,
When the scheduler or worker reloads effective configuration before creating a new run attempt,
Then it refuses to start generation, leaves the historical evidence and prior attempts intact for replay and audit, and exposes no executable self-improvement capability for that target surface while the kill switch remains active.

### Required assertions

`Required fixtures:`

* The kill switch is set at a higher-precedence configuration layer than the queued objective template.
* Historical evidence and prior failed-attempt refs already exist before the kill switch is activated.

`Required observability artifacts:`

* Effective configuration snapshot ref showing the active kill switch.
* Scheduler or worker decision ref explaining why no new run attempt was created.
* Explicit absence of new execution-space allocation, generation, evaluation, or promotion-request refs after the kill switch takes effect.
* Preserved objective-history refs that remain readable.

`Required replay artifacts:`

* Queued objective ref, effective configuration snapshot ref, kill-switch decision ref, and preserved historical evidence and prior-attempt refs.

`Pass/fail oracle:`

* The scenario passes only if the kill switch prevents any new generation attempt while preserving prior evidence, prior attempts, and replay readability for the already existing history.

### Required harness capabilities

* Scheduled governance objective driver
* Identity and thread fixture service
* Configuration-precedence harness
* Objective-history reader
* Trace collector and replay verifier

### Open questions / contract gaps

* None
