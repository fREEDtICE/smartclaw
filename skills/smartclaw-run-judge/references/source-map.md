# Source Map

Read the smallest document set that can justify the verdict.

## Read Order

1. Read the approved scenario spec first.
2. Read the authored test script second.
3. Read the run record, trace artifacts, replay artifacts, and any side-effect evidence third.
4. Read any explicit E2E harness contract or run-package README that ships with the artifacts.
5. Read [../../../docs/design/README.md](../../../docs/design/README.md) for document priority.
6. Read [../../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md](../../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md) for non-negotiable global contracts.
7. Read only the Layer 2 subsystem documents needed for the exercised concerns.

If the scenario package references a proof surface that is absent from the checkout, do not invent it. Judge from the evidence you have and record the missing proof surface as `harness defect`, `test failure`, `contract gap`, or `inconclusive` only when the documents support that classification.

## Concern-to-Document Map

* lifecycle transitions, checkpoint boundaries, pause or resume behavior, and terminal status
  * Read [../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md](../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md)
  * Read [../../../docs/design/Layer.2-Identity.and.Thread.Management.md](../../../docs/design/Layer.2-Identity.and.Thread.Management.md) when run creation or resume semantics matter

* policy timing relative to external side effects, approval waits, deny paths, and risk binding
  * Read [../../../docs/design/Layer.2-Policy.and.Approval.System.md](../../../docs/design/Layer.2-Policy.and.Approval.System.md)
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md) when a tool action is gated
  * Read [../../../docs/design/Layer.2-Skills.System.md](../../../docs/design/Layer.2-Skills.System.md) when a skill action is gated
  * Read [../../../docs/design/Layer.2-Memory.System.md](../../../docs/design/Layer.2-Memory.System.md) when memory writes are under test

* capability exposure correctness and executable-tool-set narrowing
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md)
  * Read [../../../docs/design/Layer.2-Internal.Tool.Catalog.and.Default.Tool.Profiles.md](../../../docs/design/Layer.2-Internal.Tool.Catalog.and.Default.Tool.Profiles.md)
  * Read [../../../docs/design/Layer.2-Model.Routing.and.Access.md](../../../docs/design/Layer.2-Model.Routing.and.Access.md) when routing or model profile affects exposure
  * Read [../../../docs/design/Layer.2-Skills.System.md](../../../docs/design/Layer.2-Skills.System.md) when skill exposure is part of the scenario

* memory versus retrieval separation and evidence provenance
  * Read [../../../docs/design/Layer.2-Memory.System.md](../../../docs/design/Layer.2-Memory.System.md)
  * Read [../../../docs/design/Layer.2-RAG.Infrastructure.md](../../../docs/design/Layer.2-RAG.Infrastructure.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md)

* sandbox enforcement, execution-space isolation, and execution-space lineage
  * Read [../../../docs/design/Layer.2-Sandbox.Execution.Space.md](../../../docs/design/Layer.2-Sandbox.Execution.Space.md)
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md)

* bounded subagent delegation, child capability limits, child context inheritance, and child lineage
  * Read [../../../docs/design/Layer.2-Subagent.Profiles.and.Delegation.Contracts.md](../../../docs/design/Layer.2-Subagent.Profiles.and.Delegation.Contracts.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md)
  * Read [../../../docs/design/Layer.2-Policy.and.Approval.System.md](../../../docs/design/Layer.2-Policy.and.Approval.System.md) when spawn approval is relevant

* replay artifact completeness, observability completeness, timeline reconstruction, and replay posture
  * Read [../../../docs/design/Layer.2-Observability.Replay.and.Cost.Control.md](../../../docs/design/Layer.2-Observability.Replay.and.Cost.Control.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md) when snapshot lineage or prompt reconstruction matters
  * Read [../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md](../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md) when run-state and checkpoint evidence must align with replay artifacts

* identity, scope lineage, inbound event normalization, and thread attachment
  * Read [../../../docs/design/Layer.2-Identity.and.Thread.Management.md](../../../docs/design/Layer.2-Identity.and.Thread.Management.md)
  * Read [../../../docs/design/Layer.2-Channel.Gateway.md](../../../docs/design/Layer.2-Channel.Gateway.md) for ingress contracts

## Contract-Gap Rule

Record `contract gap` instead of guessing whenever the docs do not define:

* the required state transition
* the required artifact or identifier
* the required approval or policy posture
* the required replay fidelity or observability signal
* the required delegation, sandbox, or capability boundary

## Harness Rule

Suspect `harness defect` when the scenario and docs require a proof surface, but the artifact package is incomplete because the harness failed to capture or expose it and the run record does not prove a product-side omission.
