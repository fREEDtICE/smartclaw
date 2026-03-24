# Sandbox / Execution Space E2E Cases

This document proposes two deterministic E2E scenarios for the Sandbox / Execution Space subsystem.
It covers high-risk module smoke flows so the suite can validate quota enforcement, partial-output preservation, secret-broker isolation, no-host-fallback behavior, and leak-resistant observability.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* runtime-issued execution requests with deterministic tool-step fixtures rather than free-form live shells
* seeded user, thread, collaborative-scope, run, execution-space, capability-grant, and resource-budget fixtures
* sandbox process, file, artifact, and secret-broker harnesses with deterministic quota, denial, and capture behavior
* replay-visible execution-space refs, lease refs, resource budgets, broker denials, quota events, output refs, and security events
* trace collector, artifact-index harness, and replay verifier

## Suite structure

### Module smoke scenarios

1. sandbox-backed `shell_exec` exceeding CPU or time quota is cancelled with partial evidence and no host fallback
2. secret access outside declared broker scope is denied and no secret material reaches outputs or traces

## Scenario 1

### Scenario summary

* `Title:` Sandbox-backed `shell_exec` exceeding CPU or time quota is cancelled with partial evidence and no host fallback
* `Risk level:` High
* `Rationale:` Proves the sandbox trust boundary holds under resource exhaustion. When work exceeds the granted CPU or timeout budget after starting to emit output, the platform must terminate or cancel execution explicitly, preserve attributable partial evidence, and never escape to host execution.

### Contracts validated

* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Sandbox / Execution Space resource controls, bounded-execution rules, and no-host-fallback invariant
* Layer 2: Tool Execution Framework bounded sandbox dispatch and non-success result propagation
* Layer 2: Agent Runtime handling of replay-visible bounded execution failure

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_sandbox_quota` issues one bounded tool execution inside execution space `es_sandbox_quota`, and one config snapshot pins conservative sandbox budgets plus stdout or stderr capture.
* Seeded policy rules: allow the exact `shell_exec@v1` request only inside the attached execution space and only under the granted resource budget.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one deterministic tool-enabled step requests a CPU-bound command that emits one early stdout chunk before continuing past the granted budget.
* Selected tool implementations: internal built-in `shell_exec@v1` backed by a deterministic process fixture that exceeds either `cpuMillis` or `timeoutSeconds` after partial output.
* Expected capability set: `shell_exec@v1` remains executable only through the attached execution space and its bounded process broker.
* Execution-space posture: one active execution space `es_sandbox_quota` with process execution enabled, host fallback disabled, and a small `ResourceBudget` that the command is designed to exceed.
* Approval or replay fixtures: quota-enforcement fixture, process-broker cancellation spy, host-execution spy, artifact store fixture, trace collector, and replay verifier.

### Given / When / Then

Given runtime sends one authorized `shell_exec@v1` request into `es_sandbox_quota`,
When the command emits partial output and then exceeds the granted CPU or timeout budget,
Then the sandbox enforces the budget, terminates or cancels the work explicitly, preserves partial output refs where available, and the platform returns a replay-visible non-success result without any host fallback.

### Required assertions

`Required fixtures:`

* The execution-space lease records the exact resource budget used for enforcement.
* The process fixture emits partial output before quota or timeout enforcement.
* The host-execution spy records any uncontrolled fallback attempt.

`Required observability artifacts:`

* `sandbox.execute` trace tied to `executionSpaceId = es_sandbox_quota`.
* Quota or timeout enforcement event tied to the same lease and run lineage.
* Process-broker cancellation or termination trace.
* Partial stdout or stderr refs if produced.
* Tool invocation record and normalized non-success result.

`Required replay artifacts:`

* Execution-space ref, lease ref, and resource-budget ref.
* Tool request ref, authorization ref, and partial output refs.
* Quota-enforcement or cancellation artifact and terminal lifecycle state.
* Evidence that no host execution backend ran after sandbox enforcement.

`Pass/fail oracle:`

* The scenario passes only if quota exhaustion or timeout enforcement is explicit, partial evidence remains attributable, and no uncontrolled host execution path runs after sandbox cancellation.

### Required harness capabilities

* Runtime tool-step fixture
* Sandbox quota-enforcement process harness
* Process-broker cancellation spy
* Host-fallback spy
* Tool adapter fixture for `shell_exec`
* Artifact-index harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Secret access outside declared broker scope is denied and no secret material reaches outputs or traces
* `Risk level:` High
* `Rationale:` Proves secret isolation is a real execution-space boundary rather than a naming convention. A sandboxed tool may run, but any undeclared secret read must fail closed and leave only denial evidence, not leaked secret values, in outputs or observability artifacts.

### Contracts validated

* Layer 1.5: `Sandbox Is a Trust Boundary`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Sandbox / Execution Space secret-isolation rules, secret-broker scope enforcement, and controlled-output rules
* Layer 2: Tool Execution Framework sandbox-backed execution and normalized failure propagation
* Layer 2: Observability, Replay, and Cost Control redaction or quarantine behavior for secret-bearing sandbox outputs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one run `run_sandbox_secret_deny` executes one sandbox-backed command in `es_sandbox_secret_deny`, and one config snapshot enables controlled stdout or stderr capture with secret-safe observability.
* Seeded policy rules: allow the bounded command itself but grant no secret scope matching the attempted secret and deny any direct raw filesystem read from the isolated `Secrets` zone.
* Seeded memory and retrieval stores: not material.
* Selected model mode: one deterministic tool-enabled step requests a bounded command that attempts one undeclared secret read and prints the result only if it succeeds.
* Selected tool implementations: internal built-in `shell_exec@v1` backed by a deterministic process fixture that attempts both a direct secrets-path read and one secret-broker read for a disallowed scope.
* Expected capability set: `shell_exec@v1` is executable as a process tool, but the attached execution space exposes no permission to read the targeted secret.
* Execution-space posture: one active execution space `es_sandbox_secret_deny` with `secretScopes = ["ci_readonly"]`, controlled output capture, and no raw secrets mount in scratch or output zones.
* Approval or replay fixtures: secret-broker spy, file-access spy, output scanning or redaction fixture, trace collector, and replay verifier.

### Given / When / Then

Given runtime sends one authorized sandbox-backed command into `es_sandbox_secret_deny`,
When the command attempts a direct file read from the isolated `Secrets` zone and a brokered read outside the granted secret scope,
Then the sandbox denies the access, emits attributable denial evidence, and no secret value appears in stdout, stderr, output artifacts, or broadly queryable traces.

### Required assertions

`Required fixtures:`

* The targeted secret is outside the granted `secretScopes`.
* Any stdout or stderr capture passes through scanning or redaction before broad persistence.
* Secret-broker and file-access spies can distinguish direct-path attempts from scoped-broker denials.

`Required observability artifacts:`

* `sandbox.secret_access` or equivalent security-event record for the denied read.
* Tool invocation record and normalized failure or denied result.
* Captured stdout, stderr, or output artifact refs, if any, containing only denied-access evidence or redacted placeholders.
* Explicit absence of raw secret value in queryable telemetry or released artifacts.

`Required replay artifacts:`

* Execution-space ref with granted `secretScopes`, tool request ref, and denial artifact.
* Any redacted output refs produced by the failed command.
* Evidence that no secret-bearing artifact ref was published to the output zone.

`Pass/fail oracle:`

* The scenario passes only if undeclared secret access fails closed, the denial remains observable, and no secret material leaks through stdout, stderr, artifacts, or replay-visible traces.

### Required harness capabilities

* Runtime tool-step fixture
* Sandbox secret-broker harness
* File-access spy for isolated secret paths
* Output scanning or redaction harness
* Tool adapter fixture for `shell_exec`
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module coverage map

* Quota enforcement, cancellation, and partial-output coverage: Scenario 1
* Secret isolation, leak prevention, and controlled-output coverage: Scenario 2
