# SmartClaw Agent Platform — Layer 2

## Sandbox / Execution Space Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Sandbox / Execution Space  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Runtime Isolation Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Tool Execution Framework Design
* Skills System Design
* Policy and Approval System Design
* LLM Provider Abstraction Design
* Identity and Thread Management
* Observability and Replay Design

---

## 2. Purpose

The Sandbox / Execution Space subsystem is the platform subsystem that turns an approved execution request into an **isolated runtime boundary with controlled resources, secrets, filesystem, process, and network behavior**.

It exists because sandboxing is not an implementation detail.
The platform must support:

* per-run or per-user isolated execution environments
* filesystem isolation
* process isolation
* network control
* secret isolation
* resource limits and quotas
* controlled output handling and scanning
* replay-visible execution-space identity and lifecycle

The subsystem owns:

* execution-space allocation and attachment contracts
* trust-zone layout
* least-privilege broker surfaces
* resource control enforcement
* environment-bound execution records
* cleanup and terminalization of isolated runtime state

The Agent Runtime decides **when a run needs an execution space**.  
The Sandbox / Execution Space subsystem decides **how an isolated environment is provisioned, constrained, exposed, and retired safely**.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Sandbox / Execution Space subsystem is responsible for:

* defining the canonical execution-space model and lifecycle
* allocating or attaching isolated execution environments for approved work
* enforcing filesystem, process, network, and secret isolation
* exposing trusted zones such as input, scratch, output, secrets, and network controls
* enforcing CPU, memory, time, and storage limits
* providing governed brokers or facades for filesystem, process, secret, network, and artifact operations
* capturing stdout, stderr, diagnostics, and execution artifacts where required
* supporting cancellation, expiry, teardown, and lease semantics
* preserving replay-visible execution-space refs and lifecycle events

### Out of Scope

The Sandbox / Execution Space subsystem does **not** own:

* identity resolution
* general policy authoring or approval UX
* tool descriptor contracts
* skill package lifecycle
* the main reasoning loop
* long-term memory persistence
* RAG retrieval logic
* application-specific business logic executed inside the space

This subsystem owns the isolation boundary.
It does not decide which actions are allowed or what application logic should do.

---

## 4. Architectural Role

The Sandbox / Execution Space subsystem sits beneath governed execution paths for tools, skills, and other runtime-backed work that touches code, files, processes, secrets, or networks.

```text
Agent Runtime / Tool Framework / Skills System
  -> request execution-space capability
  -> Sandbox / Execution Space
       -> allocate or attach isolated environment
       -> expose least-privilege brokers
       -> enforce quotas and trust zones
       -> capture outputs and diagnostics
  -> caller executes approved work inside boundary
  -> Sandbox / Execution Space
       -> teardown / expire / persist artifacts
```

### Upstream inputs

* execution-space requests from runtime or approved execution subsystems
* propagated identity, thread, run, collaborative scope, and execution-space metadata
* policy-cleared resource, path, network, and secret constraints
* execution strategy requirements such as filesystem, process, or network usage
* cancellation and timeout signals

### Downstream outputs

* execution-space refs and leases
* broker handles for bounded file, network, secret, and artifact access
* execution artifacts such as stdout, stderr, logs, and output refs
* lifecycle events, diagnostics, and replay records

### Primary consumers

* Agent Runtime
* Tool Execution Framework
* Skills System
* Policy and Approval System
* Observability and Replay

---

## 5. Goals and Non-Goals

### Goals

The Sandbox / Execution Space subsystem must optimize for:

* explicit trust-boundary enforcement
* least-privilege runtime access
* predictable isolation semantics
* bounded and observable side effects
* replay-visible environment identity
* safe support for tool and skill execution
* clean separation between collaborative scope and runtime isolation
* deterministic interfaces even when execution behavior is environment-bound

### Non-Goals

The Sandbox / Execution Space subsystem is not trying to optimize for:

* replacing policy or approval systems
* embedding application logic directly into the sandbox layer
* providing unrestricted host access for convenience
* silently sharing state across unrelated runs
* treating sandboxing as optional for file, process, or networked code paths
* hiding environment-bound failures behind vague tool or skill errors

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the sandbox-related features declared in Layer 1 and Layer 1.5.

### From Layer 1

The subsystem must support:

* per-run or per-user isolated execution environments
* separate trusted inputs, outputs, scratch space, and secrets
* CPU, memory, time, and storage limits
* network access policy enforcement
* output handling and scanning where needed
* modular separation from runtime, tools, skills, policy, and observability

### From Layer 1.5

The subsystem must implement:

* the invariant that sandbox is a trust boundary
* execution of code, file access, and network access inside an Execution Space
* filesystem isolation
* process isolation
* network control
* secret isolation
* CPU, memory, timeout, and storage quota controls
* trust zones for input, scratch, output, secrets, and network

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Sandbox / Execution Space subsystem must:

* allocate, attach, and retire execution spaces under explicit identity and run lineage
* enforce trust-zone boundaries inside each execution space
* mount or expose read-only input, writable scratch, controlled output, secret, and network surfaces
* enforce quotas for CPU, memory, time, and storage
* enforce network mode and destination restrictions
* expose least-privilege broker interfaces rather than raw host access where possible
* capture environment diagnostics, output refs, and terminal state
* propagate cancellation and expiration into active execution environments
* preserve execution-space records for replay and audit

---

## 8. Core Invariants

The Sandbox / Execution Space subsystem must obey the global platform invariants.

Additional sandbox-specific invariants:

1. **Execution Space is a trust boundary.**  
   It is not merely a scheduling detail or convenience wrapper.

2. **Isolation is explicit.**  
   Filesystem, process, network, and secret boundaries must be defined and enforced per execution space.

3. **Execution-space identity must propagate.**  
   Any work that depends on an execution space must retain the `executionSpaceId` in downstream logs, traces, and authorization context.

4. **Least privilege is the default.**  
   A space receives only the files, secrets, brokers, and network modes needed for the approved work.

5. **Collaborative scope is not execution scope.**  
   Shared business context and runtime isolation must remain separate concepts and records.

6. **Terminal cleanup must not erase auditability.**  
   Teardown may remove live runtime state, but it must preserve replay-visible records and retained artifacts.

7. **No sandbox-required path may fall back to host execution silently.**  
   If a path requires an execution space and none is available, the action must fail or degrade explicitly.

---

## 9. Execution Space Model

The subsystem needs explicit models for execution-space identity, lifecycle, and capability grants.

### Execution-space model

| Category | Values | Notes |
| --- | --- | --- |
| Execution-space mode | `per_run`, `per_user` | Mode determines reuse and isolation posture. |
| Execution-space state | `allocating`, `attached`, `active`, `expiring`, `released`, `failed` | Every transition must be replay-visible. |

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ExecutionIdentity` | `userId`, `threadId`, `runId`, `executionSpaceId` | `stepId`, `collaborativeScopeId` | Identity lineage must remain attached through allocation, attachment, and release. |
| `ResourceBudget` | `cpuMillis`, `memoryBytes`, `storageBytes`, `timeoutSeconds` | None | Captures the bounded resources granted to one space or lease. |
| `ExecutionSpaceRef` | `executionSpaceId`, `mode`, `state`, `createdAt`, `identity`, `budget` | `expiresAt` | Stable reference returned to runtime, tools, and replay paths. |

### Model rules

* every active space must have one stable `executionSpaceId`
* execution-space mode must be explicit because reuse and isolation semantics differ
* identity lineage must remain attached to allocation, attachment, and teardown records
* state transitions must be replay-visible

---

## 10. Trust Zones and Data Planes

Layer 1.5 requires explicit trust zones.

### Trust zones

Each execution space must provide:

```text
Input (read-only)
Scratch
Output (controlled)
Secrets
Network
```

### Zone rules

* `Input` is read-only and should contain approved input artifacts or references only
* `Scratch` is writable temporary workspace for in-flight execution
* `Output` is the controlled egress surface for artifacts that may leave the space
* `Secrets` is an isolated brokered surface, not a general-purpose file dump
* `Network` is an explicit capability boundary with policy-compatible restrictions

### Output-control rules

* outputs may be scanned, size-bounded, or reference-addressed before leaving the space
* stdout and stderr should be treated as controlled outputs when captured
* output release must remain attributable to the originating execution space and action

---

## 11. Isolation and Broker Model

The sandbox should expose least-privilege brokers instead of broad host access wherever possible.

### Isolation requirements

Each execution space must provide:

* filesystem isolation
* process isolation
* network control
* secret isolation

### Broker rules

Representative broker classes:

* file broker
* process broker
* artifact broker
* network broker
* secret broker

Rules:

* brokers must enforce the same path, size, network, and secret constraints attached to the space
* broker operations must remain observable and attributable
* callers must not receive permissions broader than those granted to the execution space

### Broker model

| Category | Values | Notes |
| --- | --- | --- |
| File mode | `read_only`, `read_write` | Controls filesystem mutability inside the space. |
| Network mode | `off`, `filtered`, `open` | Controls whether network egress is disabled, bounded, or broadly allowed. |

| Capability grant | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `SpaceCapabilities` | `fileMode`, `networkMode`, `secretScopes`, `allowedPaths`, `allowProcessExec` | None | Must be enforced consistently by every broker exposed from the space. |

| Broker surface | Operation set | Notes |
| --- | --- | --- |
| File broker | Read file, write file | Must enforce allowed path prefixes and file mode. |
| Process broker | Execute a process with argv and workdir | Available only when process execution was explicitly granted. |
| Artifact broker | Persist an output artifact by kind | The controlled egress surface for outputs leaving the space. |
| Network broker | Perform a network request through the space boundary | Must enforce network mode and destination restrictions. |
| Secret broker | Read one scoped secret value | Must enforce declared secret scopes and preserve audit lineage. |

---

## 12. Resource Controls and Quotas

Layer 1 and Layer 1.5 require CPU, memory, timeout, and storage controls.

### Resource-control rules

Each execution space must enforce:

* CPU limits
* memory limits
* timeouts
* storage quotas

Additional rules:

* quotas must apply for the lifetime of the space or the active lease as configured
* resource exhaustion must produce typed, observable failure outcomes
* increasing resource grants requires a new approved request path; callers must not self-escalate in place

### Bounded-execution rules

* runtime cancellation must propagate into the active space
* timeout expiration must terminate or suspend work explicitly according to the calling contract
* partial outputs must remain attributable when quota or timeout failures occur

---

## 13. Network and Secret Controls

Layer 1 requires network policy enforcement and secret broker semantics inside sandbox boundaries.

### Network-control rules

* network access must be explicit, not implicit
* network mode must be declared or derived from an approved execution request
* destination restrictions and egress modes must be enforceable inside the space
* callers must not widen network reach beyond what policy or authorization allowed

### Secret-isolation rules

* secrets must be isolated from general scratch and output surfaces
* secret access should occur through a scoped broker or equivalent controlled interface
* secret reads must remain attributable and bounded to allowed scopes
* secrets must not be copied into uncontrolled output channels by default

### Interaction rules

* tool and skill runtimes may consume network and secret brokers only when their descriptor or package contract allows it
* broker access must remain tied to the execution-space identity and the originating request lineage

---

## 14. Allocation, Attachment, and Lease Lifecycle

The subsystem must make lifecycle state explicit so runtime and execution subsystems can reason about availability and replay.

### Lifecycle phases

Representative lifecycle:

```text
Request -> Allocate -> Attach -> Active Use -> Expire / Release
```

### Lifecycle rules

* allocation must validate that requested capabilities and budgets fit policy-cleared constraints
* attachment must bind the space to the current run or caller context explicitly
* spaces should expire or release predictably rather than lingering indefinitely
* release must preserve retained artifacts, diagnostics, and lifecycle records

### Lease rules

* active spaces should carry a bounded lease or equivalent liveness constraint
* expired leases must not silently permit continued execution
* lease renewal, if supported, must remain explicit and replay-visible

### Lifecycle contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `AllocationRequest` | `requestId`, `mode`, `identity`, `budget`, `capabilities` | None | Used for new-space allocation after policy-cleared validation. |
| `AllocationResult` | `space`, `lease` | None | Returned by both allocation and successful attachment when a lease is active. |
| `AttachRequest` | `requestId`, `executionSpaceId`, `identity` | None | Rebinds an existing space to the current caller context when allowed. |
| `LeaseRef` | `leaseId`, `expiresAt` | None | Defines the liveness window for active use of the space. |

---

## 15. Runtime, Tool, Skill, and Policy Interaction

The Sandbox / Execution Space subsystem is shared infrastructure.
It must stay separate from the subsystems that decide or perform business actions inside it.

### Runtime boundary

The Agent Runtime:

* decides when a run needs an execution space
* carries policy results and checkpoints around risky actions
* records execution-space refs in run state and replay data

The Sandbox / Execution Space subsystem:

* allocates or attaches the isolated environment
* enforces quotas and trust zones
* returns broker surfaces and lifecycle refs

### Tool boundary

The Tool Execution Framework:

* decides adapter strategy
* validates authorization and descriptor requirements
* dispatches into sandbox-backed execution when required

The sandbox layer:

* provides the security boundary for file, process, and networked internal tool execution
* must not reinterpret tool authorization beyond the granted space constraints

### Skill boundary

Skills may run runtime-backed code inside an execution space.
The sandbox layer must support that path without taking over skill lifecycle or policy decisions.

### Policy boundary

The Policy and Approval System may constrain execution-space use through conditions such as:

* allowed path prefixes
* network mode
* destination restrictions
* secret scopes
* timeout and resource bounds

The sandbox layer must enforce these constraints where they map to execution-space controls, and fail closed if it cannot.

---

## 16. Replay and Observability

Sandboxing is a major audit boundary because it contains direct side effects and environment-bound behavior.

### Required logs

The subsystem must emit structured logs for:

* allocation request receipt
* attachment and activation
* brokered file, network, and secret operations when policy permits logging them
* quota or timeout enforcement events
* stdout, stderr, and diagnostic artifact publication
* release, expiry, and cleanup

### Required trace spans

At minimum:

* `sandbox.allocate`
* `sandbox.attach`
* `sandbox.execute`
* `sandbox.network`
* `sandbox.secret_access`
* `sandbox.output_publish`
* `sandbox.release`

### Replay capture

The subsystem must preserve:

* execution-space ref
* space mode and capability grant
* lease ref
* resource budget
* output artifact refs
* stdout and stderr refs when captured
* network and secret access refs when recorded
* terminal lifecycle state

### Replay behavior

* replay should prefer recorded outputs and diagnostics over re-executing environment-bound work
* if a live rerun is required because artifacts are missing, replay must clearly mark it as best-effort rather than authoritative

---

## 17. Configuration Direction

The subsystem must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `defaultExecutionSpaceMode` | default isolation mode for eligible actions | string | conservative | system or agent |
| `maxExecutionSpaceCPU` | cap CPU allocation | integer | conservative | system |
| `maxExecutionSpaceMemoryBytes` | cap memory allocation | integer | conservative | system |
| `maxExecutionSpaceStorageBytes` | cap storage allocation | integer | conservative | system |
| `defaultExecutionSpaceTimeout` | default lease or timeout bound | duration | conservative | system or tool/skill |
| `defaultNetworkMode` | default network posture | string | off or filtered | system |
| `captureSandboxStdout` | retain stdout refs | boolean | true or conservative | system |
| `captureSandboxStderr` | retain stderr refs | boolean | true or conservative | system |
| `sandboxKillSwitches` | deny selected capabilities or modes | list | empty | system or scope |

### Configuration rules

* all sandbox configuration must declare scope explicitly
* overrides must be traceable and replay-visible
* lower-level config must not widen host access beyond higher-level policy
* configuration must not blur collaborative scope and execution-space identity

---

## 18. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `Allocate` | Create a new execution space with bounded capabilities and resources. | `AllocationRequest` | `AllocationResult` |
| `Attach` | Attach to a previously allocated compatible execution space. | `AttachRequest` | `AllocationResult` |
| `Release` | Terminate or retire a space while preserving retained artifacts and lifecycle records. | `executionSpaceId` | No payload beyond success or failure |
| `GetSpace` | Read one replay-visible execution-space reference. | `executionSpaceId` | `ExecutionSpaceRef` |

### Behavioral expectations

* `Allocate` must fail closed if requested capabilities, budgets, or lineage are incomplete or unenforceable
* `Allocate` must not claim success before the execution-space ref and lease are persisted or reference-addressable
* `Attach` must validate that the target space is compatible with the caller identity, mode, lease, and capability constraints
* `Release` must preserve required retained artifacts and lifecycle records
* `GetSpace` must return the replay-visible execution-space record used by downstream audit and resume paths

---

## 19. Failure Modes and Recovery

The subsystem must fail closed on unsafe ambiguity and preserve evidence for audit.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| allocation unavailable | capacity or dependency failure | sandbox-required action blocked | fail action or retry according to caller contract |
| incomplete capability grant | validation failure | unsafe ambiguity | reject before allocation |
| quota exhaustion | runtime enforcement event | execution interrupted | terminate or return partial outputs with refs |
| network rule violation | broker or boundary check failure | unsafe egress attempt blocked | deny request and emit security event |
| secret scope mismatch | broker validation failure | unsafe secret exposure risk | deny access |
| lease expiry during execution | expiry event | environment no longer valid | terminate or surface explicit expiry failure |
| cleanup failure | teardown error | resource leak risk | mark failed release and schedule operator-visible remediation |
| missing artifact persistence | output publication failure | replay gap risk | fail closed before claiming successful release of outputs |

### Recovery principles

* fail closed for unsafe isolation ambiguity
* never fall back to uncontrolled host execution silently
* preserve diagnostic and lifecycle evidence even when execution fails
* prefer explicit termination over undefined partial isolation

---

## 20. Final Architectural Position

The Sandbox / Execution Space subsystem should be designed as the platform’s **runtime isolation and controlled side-effect boundary**, not as a general compute scheduler or policy engine.

Its authoritative contract is:

* allocate and track isolated execution spaces
* enforce trust zones, quotas, network rules, and secret isolation
* expose least-privilege broker surfaces
* capture outputs and environment diagnostics
* preserve replay-grade lifecycle and artifact records

It must remain separate from:

* policy authoring
* runtime orchestration
* tool and skill business logic
* collaborative scope semantics
* application logic

That separation keeps sandboxing explicit, enforceable, auditable, and consistent with the Layer 1 and Layer 1.5 contracts.
