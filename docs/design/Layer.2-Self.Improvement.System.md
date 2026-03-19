# SmartClaw Agent Platform — Layer 2

## Self-Improvement System Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Self-Improvement System  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Quality and Governance Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Skills System Design
* Policy and Approval System Design
* RAG Infrastructure Design
* Memory System Design
* Observability, Replay, and Cost Control Design
* Sandbox / Execution Space Design
* Model Access Routing
* Internal Tool Catalog and Default Tool Profiles

---

## 2. Purpose

The Self-Improvement System is the platform subsystem that turns offline evidence into **governed candidate changes and governed evaluation assets**.

It exists because improvement should not happen as hidden live-path adaptation.
The platform must support:

* analysis of traces, failures, feedback, conflicts, and anomalies
* creation of candidate prompt, skill, policy, retrieval, and evaluation artifacts
* offline or scheduled experimentation and evaluation
* reviewable evidence bundles for human or governed approval
* versioned promotion handoff to the subsystem that owns live activation

The subsystem owns:

* improvement objective intake and lifecycle
* evidence selection and curation
* candidate artifact generation under bounded execution
* offline evaluation plans, scorecards, and recommendation logic
* review bundle assembly and promotion request handoff
* lineage, audit, and replay artifacts for the full improvement process

This subsystem does **not** own live runtime behavior.
It also does **not** own direct in-place mutation of published prompts, skills, policies, retrieval profiles, or default tool exposure.

The Agent Runtime remains the live execution carrier.  
The Self-Improvement System remains an offline governance plane that can propose changes, but cannot silently activate them.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Self-Improvement System is responsible for:

* defining the canonical objective, evidence, candidate, evaluation, and promotion-handoff models
* accepting operator-triggered, incident-triggered, or scheduled improvement objectives
* pinning the exact baseline artifact versions and evidence scope for each objective
* curating evidence slices from traces, failures, feedback, memory conflicts, prior evaluations, and other approved governance signals
* generating candidate artifacts for prompt, skill, policy, retrieval, or evaluation surfaces
* validating candidate artifacts before review or promotion handoff
* running offline evaluations, replay-based regressions, and scorecard generation
* producing review bundles with rationale, diffs, metrics, and provenance
* creating promotion requests that target the subsystem responsible for live activation
* emitting replay-grade lineage and audit records for all meaningful improvement actions

### Out of Scope

The Self-Improvement System does **not** own:

* live user-triggered execution flow
* direct mutation of published live artifacts
* approval UX or release UX
* skill publication semantics owned by the Skills System
* live policy snapshot compilation or enforcement semantics owned by the Policy and Approval System
* retrieval-serving or ranking execution owned by the RAG Infrastructure
* thread identity resolution
* model training or foundation-model fine-tuning
* silent default-tool-profile mutation on the live path

This subsystem governs candidate change creation and evaluation.
It does not replace the owning subsystem for any artifact that may eventually become live.

---

## 4. Architectural Role

The Self-Improvement System sits on the governance plane between evidence-producing execution subsystems and the release or approval workflows that decide whether a candidate artifact should become live.

```text
Observability / Replay / Cost
Memory conflicts
User feedback
Incident or operator inputs
Existing artifact registries
  -> Self-Improvement System
       -> define objective and pin baseline
       -> curate evidence slices and datasets
       -> generate candidate artifacts in isolated execution
       -> validate and score candidates
       -> run offline evaluations and regressions
       -> assemble review bundle
       -> create promotion request for target subsystem
  -> reviewers / governance workflow
  -> target subsystem admission and publication workflow
  -> approved version or config selection becomes live through normal release controls
```

### Upstream inputs

* run traces, replay manifests, cost records, and failure artifacts
* explicit user or operator feedback records
* memory conflict refs and conflict-resolution history
* current prompt, skill, policy, retrieval, or evaluation artifact refs
* incident records, alert refs, or scheduled governance objectives
* approved model, tool, and execution-space profiles for offline improvement work

### Downstream outputs

* evidence slice refs
* candidate artifact refs
* evaluation dataset versions
* evaluation plans and scorecards
* review bundles
* promotion requests and promotion lineage refs
* structured audit, trace, and replay artifacts

### Primary consumers

* reviewers and governance workflows
* Skills System
* Policy and Approval System
* Context Assembly and agent-profile configuration layers
* RAG Infrastructure
* Observability, Replay, and Cost Control
* release and rollout workflows

### Execution path

* live path: no
* asynchronous path: yes
* scheduled path: yes
* user-facing synchronous path: no

---

## 5. Goals and Non-Goals

### Goals

The Self-Improvement System must optimize for:

* governed improvement instead of hidden live adaptation
* evidence-grounded candidate generation
* immutable, versioned candidate artifacts
* baseline-pinned evaluation and reproducible review inputs
* strong regression detection before promotion
* explicit separation between candidate creation and live activation
* tenant-, scope-, and policy-safe evidence handling
* reusable improvement workflows across prompts, skills, policy artifacts, retrieval profiles, and evaluation datasets
* full auditability of why a candidate existed, how it was evaluated, and how it was promoted or rejected

### Non-Goals

The Self-Improvement System is not trying to optimize for:

* real-time self-modification during live runs
* automatic rollout of impactful changes into production behavior
* replacing target-subsystem admission or publication logic
* mutating historical evidence to fit a new narrative
* mixing unrelated tenant or scope evidence by default
* promoting broad permission expansion without explicit review visibility
* using production traffic as an ungoverned experimentation surface

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the self-improvement-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The Self-Improvement System must support:

* controlled self-improvement as a governed platform capability
* analysis of traces, failures, feedback, and anomalies
* production of candidate improvements to prompts, skills, policies, retrieval, or evaluation sets
* keeping impactful changes behind review and approval
* gradual improvement of agent quality under governance rather than inside the live execution path

### From Layer 1.5

The Self-Improvement System must implement:

* offline or scheduled execution only
* no participation in the live execution path
* intake of traces, failures, user feedback, and memory conflicts as first-class inputs
* production of reviewable candidate artifacts rather than live mutations
* inactive-by-default outputs that require reviewed promotion before activation
* versioned, traceable promotion records separate from live user-triggered runs
* prohibition on directly modifying live prompts, skills, policies, or default tool exposure from scheduled or offline jobs
* policy-first handling of any tools, skills, memory writes, network access, file writes, or delegated work used by the improvement process itself
* observability, replay, and scope-isolation requirements that apply to all platform execution

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Self-Improvement System must:

* register bounded improvement objectives with explicit targets, baselines, success criteria, and scope
* pin the exact baseline artifact versions and evidence selection policy used by each objective
* curate immutable evidence slices from approved data sources
* create and store candidate artifacts without altering live published artifacts in place
* validate candidate artifact integrity, risk posture, and target-specific admission readiness
* run offline evaluation plans against pinned datasets, replay slices, or regression suites
* compare candidate performance and risk posture against the pinned baseline
* assemble review bundles that contain evidence, rationale, diffs, evaluation results, and promotion intent
* emit promotion requests bound to exact candidate hashes and target subsystem refs
* preserve full lineage from source evidence to candidate artifact to review decision to promotion outcome
* support kill switches, budget limits, and scope restrictions for improvement work
* keep rejected, failed, superseded, and promoted candidate history replay-readable

---

## 8. Core Invariants

The Self-Improvement System must obey the global platform invariants.

Additional self-improvement-specific invariants:

1. **Improvement is never a hidden live-path mutation.**  
   No live agent behavior may change merely because an offline job completed.

2. **Candidate artifacts are inactive by default.**  
   Every generated prompt, skill, policy, retrieval, or evaluation artifact must remain non-live until a reviewed promotion path selects it.

3. **Baselines are pinned and immutable per objective.**  
   A candidate must always be compared against the exact artifact versions and evaluation policy it was created to improve.

4. **Promotion is by new version or new config selection, not in-place overwrite.**  
   Historical artifacts used by past runs must remain replay-resolvable.

5. **The subsystem cannot self-approve impactful activation.**  
   Generation, scoring, and recommendation may be automated; final approval and live activation remain outside the candidate-generation path.

6. **Evidence remains scope-safe.**  
   Cross-scope aggregation requires an explicit approved dataset contract or equivalent governance boundary; it must not happen implicitly.

7. **Evaluation precedes promotion.**  
   Every candidate intended for live consideration must have an attached evaluation record, even if the result is “insufficient evidence”.

8. **Risk broadening is review-visible.**  
   Permission expansion, risk-level increases, policy widening, or broader retrieval access must be explicitly surfaced in review materials.

9. **Improvement execution itself is governed.**  
   If the subsystem uses models, tools, network access, file writes, or subagents, those actions remain subject to the normal policy, sandbox, and observability contracts.

---

## 9. Domain Model and Target Surfaces

Self-improvement needs a target-aware but uniform model so one governance pipeline can serve multiple artifact types without collapsing them into one indistinct “optimization” blob.

### 9.1 Target surfaces

| Target surface | Candidate output | Owning live subsystem | Activation note |
| --- | --- | --- | --- |
| `prompt_artifact` | Immutable prompt or instruction candidate version plus optional binding proposal | Context Assembly and agent-profile configuration | May become live only through reviewed selection of a new approved version or binding. |
| `skill_version` | Candidate immutable skill package version or binding proposal | Skills System | Publication and binding rules remain owned by the Skills System. |
| `policy_artifact` | Candidate policy artifact or rule-set diff | Policy and Approval System | Snapshot compilation, precedence, and approval semantics remain owned there. |
| `retrieval_profile` | Candidate retrieval/rerank/source-selection profile | RAG Infrastructure | Serving and live retrieval behavior remain owned by the RAG subsystem. |
| `evaluation_dataset` | New or revised evaluation dataset version, labels, splits, or suite definitions | Self-Improvement System with replay-visible storage in Observability | May become authoritative for future evaluations only after review. |

Changes to default tool exposure are not a direct first-class target surface of this subsystem.
If improvement work recommends such a change, it must do so through a governed policy or tool-profile artifact proposal rather than direct live mutation.

### 9.2 Canonical records

| Record | Purpose | Required shape |
| --- | --- | --- |
| `ImprovementObjective` | Defines one bounded improvement effort | target surface, target subject ref, baseline ref, scope, initiator, success criteria, status |
| `ImprovementRun` | One execution attempt for an objective | objective ref, run attempt id, execution-space ref, model/tool profile refs, status |
| `EvidenceSlice` | Immutable curated evidence selection | objective ref, source refs, selection rationale, scope class, time window, redaction class |
| `CandidateArtifact` | One generated candidate output | objective ref, target surface, baseline ref, candidate artifact ref, diff ref, risk posture, status |
| `EvaluationPlan` | Defines how baseline and candidate are compared | objective ref, dataset refs, replay refs, metrics, gates, determinism posture |
| `EvaluationResult` | Captures one completed evaluation outcome | candidate ref, plan ref, metric outputs, regressions, recommendation, reproducibility class |
| `ReviewBundle` | Review-facing package for decision-making | objective ref, candidate refs, evidence refs, evaluation refs, reviewer checklist, status |
| `PromotionRequest` | Handoff to the owning live subsystem | review bundle ref, target subsystem ref, activation intent, requested artifact ref, status |

---

## 10. Objective Intake, Scheduling, and State Model

Self-improvement must remain bounded and reviewable.
An objective therefore needs explicit intent before any offline generation work begins.

### 10.1 Objective initiators

An objective may be created by:

* an operator request
* a scheduled governance job
* an incident or alert follow-up workflow
* a failed regression or evaluation workflow
* a product quality program that has an approved template and scope

The system must preserve the initiating principal or service identity for every objective.

### 10.2 Objective requirements

Before an objective enters execution, it must declare:

* target surface and target subject
* baseline artifact ref or baseline selection rule
* collaborative scope and any narrower scope boundaries
* objective statement and success criteria
* evaluation policy or required evaluation template
* model, tool, and execution-space profile constraints
* budget, timeout, and candidate-count limits

Open-ended objectives such as “improve everything” are invalid.

### 10.3 Objective state model

```text
draft
  -> queued
  -> curating_evidence
  -> generating_candidates
  -> validating
  -> evaluating
  -> review_pending
  -> approved | rejected | failed | cancelled | stale

approved
  -> promotion_requested
  -> promoted | promotion_rejected | archived
```

Rules:

* `stale` means the pinned baseline or governing evaluation template changed in a way that invalidates the candidate comparison
* `approved` means approved for promotion handoff, not automatically live
* `promoted` means the target subsystem accepted and published or activated the candidate through its own governed path
* `archived` preserves rejected, superseded, or abandoned objectives for replay and audit

### 10.4 Improvement run state model

One objective may have multiple execution attempts.

```text
queued -> provisioning -> running -> waiting_input -> completed | failed | cancelled
```

Rules:

* each run attempt must bind to one objective version and one pinned baseline set
* retries must create new run-attempt records rather than mutating the prior attempt
* runs must execute in a dedicated execution space and budget envelope

---

## 11. Evidence Selection and Dataset Curation

Evidence must be curated explicitly rather than inferred from whatever data happens to be easy to read.

### 11.1 Approved evidence sources

Evidence may be selected from:

* replay-visible run traces and step records
* tool, skill, memory, policy, and sandbox failure artifacts
* explicit user feedback, corrections, or operator annotations
* memory conflict sets and resolution outcomes
* prior evaluation datasets and scorecards
* incident records, support tickets, or alert summaries where policy permits

### 11.2 Evidence curation rules

* each evidence slice must be immutable once committed
* selection rationale must be recorded for every evidence slice
* evidence must remain reference-addressable; broad raw payload duplication should be avoided
* evidence must be scope-filtered before use
* redaction class and retention class must be attached before broad reviewer visibility
* evidence selection must be reproducible for the same objective definition and source snapshot

### 11.3 Dataset curation rules

Evaluation datasets created or updated by this subsystem must obey:

* training or candidate-synthesis evidence must remain distinguishable from evaluation holdout evidence
* one example must not simultaneously serve as both tuning input and holdout evaluation evidence for the same objective
* dataset splits, labels, and normalization rules must be versioned
* label provenance and reviewer confidence must be preserved when labels are human-generated or inferred
* cross-scope datasets require explicit approval, anonymization, or aggregation rules defined up front

### 11.4 Evidence quality posture

The subsystem should classify evidence quality as:

* `authoritative`
* `high_confidence`
* `advisory`
* `weak_signal`

Weak-signal evidence may inform candidate generation, but it must not be presented as conclusive proof in review bundles.

---

## 12. Candidate Generation and Static Validation

Candidate generation is an offline synthesis workflow, not a direct publish action.

### 12.1 Generation pipeline

```text
Objective
  -> pinned baseline refs
  -> curated evidence slice
  -> constrained generation run
  -> candidate artifact(s)
  -> static validation
  -> evaluation queue
```

### 12.2 Generation rules

* candidate generation must use approved model, tool, and execution-space profiles
* the number of generated candidates per objective must be bounded
* every candidate must reference the exact baseline artifact it was derived from
* generation prompts, model routes, tool use, and runtime artifacts must be traceable
* candidate artifacts must be stored by immutable ref and content hash
* the generation path must not write directly to the live publication state of any target subsystem

### 12.3 Target-specific static validation

| Target surface | Required validation |
| --- | --- |
| `prompt_artifact` | variable binding compatibility, unresolved placeholder detection, instruction structure integrity, forbidden live-secret embedding checks |
| `skill_version` | descriptor completeness, runtime bundle integrity, permission diff analysis, input/output schema integrity, tool contribution pinning |
| `policy_artifact` | precedence-shape validity, condition integrity, widening-risk diff analysis, unsupported rule detection |
| `retrieval_profile` | source/index ref validity, ranking parameter shape, citation-compatibility rules, unsupported retrieval-mode detection |
| `evaluation_dataset` | split integrity, schema validity, label provenance completeness, duplicate leakage checks |

### 12.4 Risk-change detection

Static validation must classify whether a candidate:

* narrows risk
* preserves risk
* broadens risk
* has unknown risk delta

Broadening or unknown risk deltas must be made review-visible and must not be silently treated as normal improvements.

---

## 13. Evaluation and Scoring Model

Evaluation is the required bridge between “candidate exists” and “candidate is worth review or promotion”.

### 13.1 Evaluation modes

The subsystem should support:

* replay-based regression evaluation against historical slices
* benchmark or curated dataset evaluation
* failure-reproduction evaluation against known bad cases
* cost and latency comparison when relevant to the target surface
* safety and policy regression evaluation

### 13.2 Evaluation plan contents

Every evaluation plan must pin:

* baseline artifact refs
* candidate artifact refs
* dataset or replay refs
* metric definitions
* hard gates
* determinism posture
* retry or repeated-trial policy for non-deterministic evaluations

### 13.3 Metric families

Metrics may include:

* quality or task-success measures
* policy or safety violation counts
* tool or skill execution failure rate
* retrieval relevance or citation quality
* latency and cost changes
* approval-rate changes when the candidate influences approval-triggering behavior

### 13.4 Gate classes

Evaluation gates should distinguish:

* `hard_block`
* `non_regression`
* `improvement_target`
* `informational_only`

Rules:

* candidates that fail a hard-block gate must not be recommended for promotion
* candidates that fail non-regression gates may proceed to review only under explicit override posture and with visible warnings
* informational metrics may inform reviewers, but they must not be treated as gates unless configured as such

### 13.5 Recommendation posture

Each completed evaluation should return one of:

* `promote_candidate`
* `review_with_warnings`
* `reject_candidate`
* `insufficient_evidence`

The recommendation is advisory to the review workflow and must not itself activate the candidate.

---

## 14. Review, Approval, and Promotion Workflow

The review path exists to preserve human and governance control over impactful change.

### 14.1 Review bundle requirements

A review bundle must include:

* objective statement and initiating source
* pinned baseline refs
* candidate artifact refs and human-readable diff summaries
* evidence sample refs and selection rationale
* evaluation plans and evaluation results
* risk-change summary
* unresolved issues and caveats
* requested promotion target and activation intent

### 14.2 Review rules

* the subsystem must not self-approve impactful activation
* reviewers must see whether the candidate broadens permissions, risk posture, or scope reach
* reviewers must be able to trace every candidate back to baseline and evidence refs
* approval must bind to the exact candidate hash or immutable artifact ref that was reviewed
* if a reviewed candidate becomes stale before promotion, a re-review or re-evaluation path is required

### 14.3 Promotion handoff

Promotion is a handoff, not a side effect of approval.

```text
review_pending
  -> approved
  -> promotion_requested
  -> target subsystem validates admission rules
  -> target subsystem publishes or binds new version
  -> release or config workflow selects approved version
  -> candidate becomes live
```

Rules:

* approval alone does not make a candidate live
* promotion requests must reference the exact reviewed bundle and candidate artifact
* the target subsystem may reject the promotion request if its own admission rules fail
* live activation must happen through normal version publication, binding, or configuration precedence rules
* rollback must select a prior approved version or config, not mutate the promoted artifact in place

---

## 15. Target-Subsystem Adapters and Boundaries

The Self-Improvement System needs explicit adapters for different artifact surfaces because generation is generic but live activation is not.

### 15.1 Prompt and instruction artifacts

For prompt or instruction updates, the subsystem should produce:

* a new immutable prompt or instruction artifact version
* a binding proposal that identifies where the version would be selected
* evaluation evidence showing baseline-versus-candidate behavior

The Context Assembly and agent-configuration layers remain authoritative for what instruction version is actually selected on live runs.

### 15.2 Skill artifacts

For skill improvements, the subsystem should produce:

* a candidate skill package version or a governed patch that can become a new version
* permission and risk diff analysis
* target binding suggestions when relevant

The Skills System remains authoritative for publication state, binding state, and kill switches.

### 15.3 Policy artifacts

For policy improvements, the subsystem should produce:

* a candidate policy artifact or rule diff
* replay-based evidence showing the expected decision changes
* widening-risk analysis and approval-surface impact summary

The Policy and Approval System remains authoritative for snapshot compilation, precedence resolution, and live enforcement.

### 15.4 Retrieval profiles

For retrieval improvements, the subsystem should produce:

* a candidate retrieval profile or rerank configuration
* evidence of relevance, citation, and cost tradeoffs
* any required source-set or index-selection diff

The RAG Infrastructure remains authoritative for ingestion, retrieval serving, and live ranking execution.

### 15.5 Evaluation datasets

For evaluation datasets, the subsystem should produce:

* a new dataset version or dataset diff
* split definitions and label provenance
* retention and scope metadata

Approved datasets may become authoritative inputs for later evaluation workflows, but only through reviewed publication of the dataset version itself.

---

## 16. Execution Model, Isolation, and Safety Controls

Self-improvement work may use the same lower-level platform services as live runs, but it must do so under offline governance and tighter isolation.

### 16.1 Execution posture

* each improvement run must execute in a dedicated execution space
* improvement work must not share live user-response channels
* improvement work should use dedicated model and tool profiles rather than broad live-agent defaults
* scheduled work must respect separate budgets and quotas from live runtime traffic

### 16.2 Tool and capability posture

Improvement tool access should be limited to capabilities such as:

* evidence read or export under policy control
* candidate artifact writing to governed candidate storage
* diffing, evaluation, and report generation
* sandboxed static analysis or test execution where allowed

The subsystem should not receive broad outbound-channel or business-action tools by default.

### 16.3 Subagent posture

If improvement work uses delegated subagents:

* delegation must remain bounded and policy-evaluated
* child contexts must exclude unrelated evidence by default
* child agents must not publish or activate live artifacts directly

### 16.4 Secret and data posture

* evidence reads should be read-only by default
* improvement runs should avoid broad access to raw secrets
* any secret, network, filesystem, or code execution use must remain inside the Execution Space trust boundary
* retention and redaction policies must apply before candidate artifacts or review bundles are made widely visible

---

## 17. Observability, Replay, and Audit

The Self-Improvement System is itself a governed subsystem and must therefore be observable and replayable.

### 17.1 Required signals

The subsystem must emit:

* objective lifecycle events
* improvement run events and attempt lineage
* evidence selection refs and rationale
* candidate generation refs and diff summaries
* validation outcomes
* evaluation plan refs and evaluation results
* review decisions and reviewer refs
* promotion requests, promotion outcomes, and rollback-related refs

### 17.2 Required views

Operators should be able to inspect:

* objective timeline
* baseline-to-candidate lineage graph
* evidence-to-candidate trace
* candidate-to-promotion history
* evaluation scorecard comparisons

### 17.3 Replay posture

Replay should support:

* exact recovery of evidence slices, baselines, candidate refs, evaluation plans, and review decisions
* best-effort replay of candidate generation when the generation path is non-deterministic
* authoritative reconstruction of what was reviewed and what was promoted

The subsystem must never imply that a non-deterministic candidate-generation replay is identical unless the evidence proves that it is.

---

## 18. Configuration Direction

The Self-Improvement System must respect the platform-wide configuration precedence contract for any overlapping fields.

Improvement-specific configuration should include:

* target surfaces enabled for a system or collaborative scope
* allowed model, tool, and execution-space profiles
* candidate-count, budget, and timeout ceilings
* evidence-retention windows and dataset-curation rules
* required evaluation templates and gate thresholds
* reviewer requirements and approval policies
* kill switches for target surfaces or schedules

Rules:

* system or environment settings may globally disable target surfaces or tighten budgets
* collaborative-scope settings may narrow what evidence or targets are allowed for that scope
* objective templates and schedules may narrow constraints further, but must not broaden permissions or scope beyond higher-precedence controls
* target-subsystem admission rules remain authoritative for what can ultimately be published or activated

---

## 19. Contract Sketch

The following records are the minimum conceptual contracts this subsystem should expose or persist.

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ImprovementObjective` | `objectiveId`, `targetSurface`, `targetSubjectRef`, `initiatorType`, `initiatorRef`, `baselineRef`, `successCriteriaRef`, `status` | `collaborativeScopeId`, `scheduleRef`, `budgetRef` | Long-lived governance work item. |
| `ImprovementRun` | `improvementRunId`, `objectiveId`, `attempt`, `executionSpaceRef`, `modelProfileRef`, `toolProfileRef`, `status` | `parentRunRef` | One execution attempt under pinned baseline context. |
| `EvidenceSliceRef` | `evidenceSliceId`, `objectiveId`, `sourceKind`, `sourceRefs`, `selectionReason`, `scopeClass`, `hash` | `timeWindow`, `redactionClass` | Immutable curated evidence boundary. |
| `CandidateArtifactRef` | `candidateId`, `objectiveId`, `targetSurface`, `baselineRef`, `artifactRef`, `diffRef`, `status` | `riskDelta`, `generatedByRunRef` | Inactive by default. |
| `EvaluationPlan` | `evaluationPlanId`, `objectiveId`, `candidateRefs`, `baselineRefs`, `datasetRefs`, `metricDefs`, `gateDefs` | `repeatPolicy`, `replayMode` | Binds the exact comparison contract. |
| `EvaluationResult` | `evaluationResultId`, `evaluationPlanId`, `candidateId`, `metricSummaryRef`, `gateOutcome`, `recommendation` | `regressionRefs`, `reproducibilityClass` | Never activates the candidate. |
| `ReviewBundle` | `reviewBundleId`, `objectiveId`, `candidateRefs`, `evidenceRefs`, `evaluationResultRefs`, `status` | `reviewChecklistRef`, `riskSummaryRef` | Review-facing decision package. |
| `PromotionRequest` | `promotionRequestId`, `reviewBundleId`, `targetSubsystem`, `requestedArtifactRef`, `activationIntent`, `status` | `requestedBindingRef`, `approvalRefs` | Handoff only; not direct activation. |

---

## 20. Failure Modes and Recovery

The subsystem must fail closed with respect to live behavior.

Representative failure modes:

* evidence sources are unavailable or incomplete
* baseline artifact cannot be resolved
* candidate generation exceeds budget or timeout
* static validation fails
* evaluation is inconclusive or non-reproducible
* review bundle becomes stale before promotion
* target subsystem rejects promotion because admission rules fail

Recovery rules:

* no failure may default into silent live activation
* failed runs must preserve enough artifacts for diagnosis and retry
* stale objectives should require rebase or re-evaluation rather than best-guess promotion
* rejected promotion requests must not mutate the reviewed candidate in place; a new candidate or objective revision is required
* kill switches must stop new generation or promotion handoff without deleting historical evidence

---

## 21. Explicit Boundaries with Other Subsystems

The Self-Improvement System depends on many subsystems but must not absorb their responsibilities.

### Agent Runtime

* may be reused as a bounded execution engine for offline generation or evaluation work
* remains separate from the live user-interaction runtime path
* must not wait on or accept unreviewed self-improvement outputs inside a live run

### Observability, Replay, and Cost Control

* owns authoritative execution evidence and replay manifests
* provides source evidence to this subsystem
* does not decide whether evidence should become a candidate change

### Policy and Approval System

* governs tool use, data access, subagent spawning, and any live policy artifact activation
* remains authoritative for policy enforcement and live policy publication

### Skills System

* remains authoritative for skill package publication, binding, deprecation, and disablement
* receives promotion requests for reviewed skill candidates

### Context Assembly and agent configuration

* remain authoritative for which prompt or instruction artifact version becomes live
* may consume approved prompt candidates only through reviewed version selection

### RAG Infrastructure

* remains authoritative for ingestion, index selection, reranking, and serving
* may consume reviewed retrieval-profile candidates through its own governed rollout path

### Memory System

* supplies conflict evidence and memory-related signals
* does not decide improvement objectives or promotion outcomes

### Sandbox / Execution Space

* provides isolation and trust boundaries for candidate generation, validation, or evaluation work that touches code, files, network, or secrets

---

## 22. Test and Validation Strategy

This subsystem needs both design-level and implementation-level validation.

The test strategy should cover at least:

1. **Live-path isolation tests**  
   Verify that completion of an improvement objective cannot change live behavior without a separate reviewed promotion step.

2. **Scope and evidence isolation tests**  
   Verify that evidence curation respects collaborative-scope boundaries, redaction rules, and approved aggregation posture.

3. **Baseline pinning and staleness tests**  
   Verify that baseline changes mark candidates stale and force re-evaluation where required.

4. **Candidate immutability tests**  
   Verify that reviewed or promoted candidates are never mutated in place.

5. **Evaluation gate tests**  
   Verify that hard-block failures prevent promotion recommendation and that warnings are surfaced correctly.

6. **Target-adapter integration tests**  
   Verify handoff behavior for prompt, skill, policy, retrieval, and evaluation-dataset surfaces.

7. **Audit and replay tests**  
   Verify that an objective can be reconstructed from evidence selection through promotion outcome.

8. **Failure and kill-switch tests**  
   Verify that generation, evaluation, or promotion failures fail closed and preserve audit history.

---

## 23. Final Architectural Position

The Self-Improvement System should be built as a **governed offline optimization plane**, not as a background process that quietly rewrites the live agent.

Its job is to:

* turn evidence into candidate change
* prove or disprove value through evaluation
* package that work for review
* hand off approved artifacts to the subsystem that owns live activation

That separation is the architectural safeguard that allows the platform to improve over time without losing auditability, replayability, or operational control.
