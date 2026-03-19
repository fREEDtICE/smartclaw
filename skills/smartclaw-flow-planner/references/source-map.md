# Source Map

Read documents in this order:

1. [../../../docs/design/README.md](../../../docs/design/README.md) for layer precedence.
2. [../../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md](../../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md) for mandatory invariants, lifecycle, context, policy, replay, observability, configuration, and delegation rules.
3. [../../../docs/e2e/End-to-End.Testing.Strategy.RFC.md](../../../docs/e2e/End-to-End.Testing.Strategy.RFC.md) for deterministic-first planning, scenario shape, priority cases, and harness vocabulary.
4. Only then read the Layer 2 docs needed for the selected contract cluster.

Use the smallest relevant doc set:

* Policy-first side effects, approval waits, deny paths, and configuration traceability
  * Read [../../../docs/design/Layer.2-Policy.and.Approval.System.md](../../../docs/design/Layer.2-Policy.and.Approval.System.md)
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md) when the journey involves tool execution
  * Read [../../../docs/design/Layer.2-Skills.System.md](../../../docs/design/Layer.2-Skills.System.md) when the journey involves skill activation
  * Extract the `Intent -> Risk Classification -> Policy Evaluation -> Decision -> Enforcement` pipeline, `allow | deny | require_approval`, snapshot traceability, and any execution-time authorization checks

* Recoverability, checkpoints, run states, and resumability
  * Read [../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md](../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md)
  * Read [../../../docs/design/Layer.2-Identity.and.Thread.Management.md](../../../docs/design/Layer.2-Identity.and.Thread.Management.md) for `PreRunEnvelope` and run-start handoff requirements
  * Extract lifecycle boundaries, required checkpoints, legal state transitions, and restart boundaries

* Observability, replay, and cost-governed traceability
  * Read [../../../docs/design/Layer.2-Observability.Replay.and.Cost.Control.md](../../../docs/design/Layer.2-Observability.Replay.and.Cost.Control.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md) when snapshot lineage or prompt reconstruction matters
  * Extract required signals, replay modes, artifact refs, timeline or graph expectations, and any declared degraded replay posture

* Identity, thread, scope, and lineage propagation
  * Read [../../../docs/design/Layer.2-Identity.and.Thread.Management.md](../../../docs/design/Layer.2-Identity.and.Thread.Management.md)
  * Read [../../../docs/design/Layer.2-Channel.Gateway.md](../../../docs/design/Layer.2-Channel.Gateway.md) for inbound envelope or multi-channel flows
  * Extract canonical identifiers, thread outcomes, scope attachment rules, and the point where `PreRunEnvelope` becomes `RunEnvelope`

* Memory vs retrieval separation
  * Read [../../../docs/design/Layer.2-Memory.System.md](../../../docs/design/Layer.2-Memory.System.md)
  * Read [../../../docs/design/Layer.2-RAG.Infrastructure.md](../../../docs/design/Layer.2-RAG.Infrastructure.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md)
  * Extract write-pipeline semantics, retrieval provenance, cross-scope rules, source metadata, and separate rendering of memory versus RAG evidence

* Executable capability exposure
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md)
  * Read [../../../docs/design/Layer.2-Internal.Tool.Catalog.and.Default.Tool.Profiles.md](../../../docs/design/Layer.2-Internal.Tool.Catalog.and.Default.Tool.Profiles.md)
  * Read [../../../docs/design/Layer.2-Model.Routing.and.Access.md](../../../docs/design/Layer.2-Model.Routing.and.Access.md) when route profiles or model tool exposure affects the journey
  * Extract candidate sources, effective-tool-set narrowing, execution-space feasibility, descriptor immutability, and execution-time defense in depth

* Sandbox enforcement and execution-space isolation
  * Read [../../../docs/design/Layer.2-Sandbox.Execution.Space.md](../../../docs/design/Layer.2-Sandbox.Execution.Space.md)
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md) when a tool requires execution-space validation
  * Extract trust zones, quotas, explicit host-fallback prohibition, and `executionSpaceId` propagation requirements

* Bounded delegation and child-run governance
  * Read [../../../docs/design/Layer.2-Subagent.Profiles.and.Delegation.Contracts.md](../../../docs/design/Layer.2-Subagent.Profiles.and.Delegation.Contracts.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md) for child-context construction
  * Read [../../../docs/design/Layer.2-Policy.and.Approval.System.md](../../../docs/design/Layer.2-Policy.and.Approval.System.md) for spawn approval semantics
  * Extract child budgets, tool and route narrowing, result merge rules, explicit exclusions, and lineage evidence

* Configuration precedence
  * Start with Layer 1.5 configuration order
  * Read the subsystem document under test to find how it applies system, environment, collaborative scope, agent, channel, user, and run overrides
  * Extract only explicit precedence, narrowing, and traceability rules

Prefer journeys already prioritized by the RFC:

* P0: tool allow or deny, approval wait, crash or resume, capability exposure mismatch prevention, memory vs RAG separation, sandbox restriction, bounded delegation, debug replay
* P1: multi-channel identity continuity, thread expiry, configuration precedence, memory conflict handling, non-deterministic replay posture

Declare a contract gap when the documents do not define:

* the required state transition
* the required artifact or identifier
* the policy or replay posture for the action under test
* the merge or conflict behavior needed to finish the scenario
