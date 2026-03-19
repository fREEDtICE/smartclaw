# Scenario Shape

Mirror the RFC's standard E2E structure and assertion language.

## Template

```md
## Scenario summary
Title: <short journey name>
Risk level: <High|Medium|Low>
Rationale: <why this scenario matters and which guarantee it proves>

## Contracts validated
- Layer 1.5: <named contract>
- Layer 2: <named subsystem contract>

## Preconditions and fixtures
- Seeded user/thread/scope/config: ...
- Seeded policy rules: ...
- Seeded memory and retrieval stores: ...
- Selected model mode: ...
- Selected tool implementations: ...
- Expected capability set: ...
- Execution-space posture: ...

## Given / When / Then
Given ...
When ...
Then ...

## Required assertions
Required fixtures:
- ...
Required observability artifacts:
- timeline events
- execution graph nodes or edges
- subagent tree refs when applicable
- capability exposure decisions
- policy decisions
- checkpoints
Required replay artifacts:
- model inputs and outputs
- tool inputs and outputs
- policy snapshot or decision refs
- context snapshot or inclusion refs when relevant
- non-determinism posture when relevant
- child handoff refs when relevant
Pass/fail oracle:
- ...

## Required harness capabilities
- synthetic channel driver
- identity/thread fixture service
- model adapter mode
- tool harness
- sandbox harness
- seeded memory and retrieval stores
- trace collector and replay verifier

## Open questions / contract gaps
- None
```

## Assertion Checklist

Check only what the docs define:

* outbound response or visible action outcome
* run creation or resumption behavior
* context assembly order when relevant
* effective capability filtering
* policy decision timing
* checkpoint creation
* side-effect presence or absence
* trace event set
* replay artifact completeness

Use the RFC assertion vocabulary where possible:

* policy assertions
  * no side effect before policy decision
  * policy decision recorded for every protected action
  * approval wait entered before gated action
  * deny produces zero external side effect
* state assertions
  * run states follow the legal transition graph
  * checkpoints exist at required boundaries
  * resume starts only at a step boundary
  * duplicate side effects do not occur after resume
* context assertions
  * context layer order is respected
  * memory and RAG appear as distinct sources
  * token budget enforcement is traceable
  * subagent context excludes the full parent scratchpad by default
* capability assertions
  * exposed tool set equals effective tool set
  * executed tool belongs to the effective tool set
  * subagent tool set is a delegated subset or profile
  * unavailable tools are not exposed
* identity and scope assertions
  * `userId`, `threadId`, and `runId` are present where required
  * `collaborativeScopeId` is present when required
  * `executionSpaceId` is present when applicable
  * scope is attached to memory, tool, and policy paths
* observability assertions
  * lifecycle events are present
  * capability exposure events are present
  * tool execution events are present
  * policy events are present
  * memory write events are present when relevant
  * timeline, execution graph, and subagent tree are reconstructable
* replay assertions
  * model inputs and outputs are stored
  * tool inputs and outputs are stored
  * policy decisions are stored
  * checkpoints are stored
  * replay mode behavior is valid for deterministic versus non-deterministic steps

## Harness Selection Rules

Prefer the deterministic lab components from the RFC:

* Use `golden mode` or `record/replay mode` before `live mode`.
* Use fake tools and safe corpora before live integrations.
* Use sandbox fixtures that can prove filesystem, process, network, secret, quota, and trust-zone enforcement.
* Use trace collection and replay verification whenever the scenario depends on observability, resume, or replay guarantees.

Escalate the scenario to a contract gap instead of guessing when the docs do not define the harness capability needed to prove the flow.
