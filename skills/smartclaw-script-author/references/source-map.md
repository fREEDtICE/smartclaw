# Source Map

Read the smallest doc set that can justify the script.

## Read Order

1. Read the approved scenario spec first.
2. Read any explicit harness contract or E2E RFC that ships with the scenario package.
3. Read [../../../docs/design/README.md](../../../docs/design/README.md) for document priority.
4. Read [../../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md](../../../docs/design/Layer.1.5-Cross.Cutting.Contracts.md) for non-negotiable lifecycle, policy, observability, replay, identity, capability, sandbox, and delegation rules.
5. Read only the Layer 2 subsystem documents needed for the scenario.

If the scenario references a harness capability or RFC that is absent in the checkout, do not guess. Author the test from the approved scenario plus the design contracts you do have, and record the missing proof surface under `Missing harness capabilities / blockers`.

## Concern-to-Document Map

* Canonical inbound event injection, ingress identity, thread attachment, or duplicate delivery handling
  * Read [../../../docs/design/Layer.2-Channel.Gateway.md](../../../docs/design/Layer.2-Channel.Gateway.md)
  * Read [../../../docs/design/Layer.2-Identity.and.Thread.Management.md](../../../docs/design/Layer.2-Identity.and.Thread.Management.md)
  * Read [../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md](../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md) for runtime handoff

* Run-state inspection, checkpoints, resumability, pause or resume behavior
  * Read [../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md](../../../docs/design/Layer.2-Agent.Runtime.Subsystem.md)
  * Read [../../../docs/design/Layer.2-Identity.and.Thread.Management.md](../../../docs/design/Layer.2-Identity.and.Thread.Management.md) when run creation or resume depends on thread state

* Policy allow, deny, approval wait, approval resume, or risk binding
  * Read [../../../docs/design/Layer.2-Policy.and.Approval.System.md](../../../docs/design/Layer.2-Policy.and.Approval.System.md)
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md) when a tool action is gated
  * Read [../../../docs/design/Layer.2-Skills.System.md](../../../docs/design/Layer.2-Skills.System.md) when a skill action is gated

* Tool capability exposure, executable tool-set narrowing, tool outputs, or side-effect evidence
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md)
  * Read [../../../docs/design/Layer.2-Internal.Tool.Catalog.and.Default.Tool.Profiles.md](../../../docs/design/Layer.2-Internal.Tool.Catalog.and.Default.Tool.Profiles.md)

* Skill activation, skill-owned artifacts, or skill execution boundaries
  * Read [../../../docs/design/Layer.2-Skills.System.md](../../../docs/design/Layer.2-Skills.System.md)

* Trace inspection, replay verification, timeline or graph reconstruction, or cost-governed evidence capture
  * Read [../../../docs/design/Layer.2-Observability.Replay.and.Cost.Control.md](../../../docs/design/Layer.2-Observability.Replay.and.Cost.Control.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md) when replay depends on prompt or snapshot lineage

* Memory versus retrieval separation
  * Read [../../../docs/design/Layer.2-Memory.System.md](../../../docs/design/Layer.2-Memory.System.md)
  * Read [../../../docs/design/Layer.2-RAG.Infrastructure.md](../../../docs/design/Layer.2-RAG.Infrastructure.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md)

* Sandbox or execution-space restrictions
  * Read [../../../docs/design/Layer.2-Sandbox.Execution.Space.md](../../../docs/design/Layer.2-Sandbox.Execution.Space.md)
  * Read [../../../docs/design/Layer.2-Tool.Execution.Framework.md](../../../docs/design/Layer.2-Tool.Execution.Framework.md)

* Bounded delegation, child capability limits, child context inheritance, or child replay evidence
  * Read [../../../docs/design/Layer.2-Subagent.Profiles.and.Delegation.Contracts.md](../../../docs/design/Layer.2-Subagent.Profiles.and.Delegation.Contracts.md)
  * Read [../../../docs/design/Layer.2-Context.Assembly.Subsystem.md](../../../docs/design/Layer.2-Context.Assembly.Subsystem.md)
  * Read [../../../docs/design/Layer.2-Policy.and.Approval.System.md](../../../docs/design/Layer.2-Policy.and.Approval.System.md)

* Configuration precedence affecting the scenario
  * Start with Layer 1.5 configuration order
  * Read the subsystem doc under test for narrowing and traceability rules

## Contract-Gap Rule

Record a blocker instead of guessing whenever the docs do not define:

* the required harness action
* the run-state or checkpoint signal to inspect
* the trace or replay artifact needed to prove the scenario
* the side-effect evidence surface
* the capability or delegation boundary required by the scenario
