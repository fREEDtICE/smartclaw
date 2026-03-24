# Truth Artifact Content Standard

# Goal
Truth artifacts constrain the LLM only when they contain stable, explicit, scope-bound information. High-level prose is not enough.

# Global content requirements
Every truth artifact should contain:
* stable artifact title
* stable artifact or section IDs where practical
* explicit scope or subsystem name
* owner
* last reviewed date
* normative statements for anything critical
* at least one concrete example, counterexample, or failure mode where ambiguity would otherwise remain

These fields reduce LLM drift because they give the model stable anchors for:
* what the artifact governs
* what is forbidden
* what evidence should prove compliance

# `system-overview`
Must include:
* system purpose
* system boundary
* major components or subsystems
* critical seams between subsystems
* external dependencies
* explicitly out-of-scope areas
* first development scope or implementation focus

Why this constrains the LLM:
* prevents scope creep
* prevents inventing subsystems or boundaries
* gives a stable top-level map for local code edits

# `invariant-spec`
Each invariant should include:
* invariant ID
* scope
* rule stated with `MUST`, `MUST NOT`, or equivalent normative language
* rationale
* violation example
* enforcement hook such as test, policy, or runtime check
* severity

Why this constrains the LLM:
* gives explicit non-negotiable rules
* makes local “reasonable” edits easier to reject when they violate global guarantees

# `api-contract` or `interface-contract`
Each contract should include:
* contract ID or version
* caller and callee
* request or input shape
* response or output shape
* error cases
* side effects
* auth or policy constraints
* ordering or idempotency rules where relevant
* compatibility or versioning rules

Why this constrains the LLM:
* prevents invented interfaces
* constrains allowed data flow and interaction semantics
* makes contradiction detection much easier across docs and code

# `e2e-spec`
Each scenario should include:
* scenario ID
* scope
* preconditions or fixtures
* user or system steps
* expected visible outcome
* expected state transition or side effect
* at least one important failure path
* oracle or evidence to inspect

Why this constrains the LLM:
* ties implementation to whole-flow behavior, not just local code shape
* provides a concrete acceptance bar for changes

# `test-environment`
Must include:
* required toolchain or prerequisites
* setup commands
* seed or reset commands
* health checks
* smoke test command
* targeted verification command pattern by scope
* fixtures or external dependencies
* cleanup commands
* expected runtime assumptions or ports

Why this constrains the LLM:
* determines whether implementation can actually be validated
* prevents the model from treating docs-only or placeholder checks as sufficient

# `architecture-boundary`
Must include:
* module or subsystem names
* ownership
* allowed dependencies
* forbidden dependencies
* data ownership boundaries
* seam contracts

Why this constrains the LLM:
* prevents accidental cross-layer coupling
* reduces entropy from “quick” edits that pierce boundaries

# `state-machine`
Must include:
* state IDs
* legal transitions
* guards or preconditions
* illegal transitions
* terminal states
* recovery behavior

Why this constrains the LLM:
* prevents invalid lifecycle transitions
* makes semantic review and test generation deterministic

# `lifecycle-spec`
Must include:
* phase IDs
* entry criteria
* exit criteria
* checkpoints
* rollback or recovery points
* observable evidence for phase completion

Why this constrains the LLM:
* clarifies long-running workflows and resumability rules
* gives the model stable boundaries for partial implementation

# `risk-zone`
Must include:
* risk ID
* affected scope
* failure modes
* policy or approval constraints
* mandatory reviews
* required tests
* forbidden shortcuts

Why this constrains the LLM:
* highlights the places where local optimization is most dangerous
* prevents the agent from treating high-risk areas like ordinary code

# Supplemental records
Readiness discussion records may be useful, but they are not truth artifacts by default.
They become binding only after their accepted decisions are promoted into one of the authoritative artifact types above.
