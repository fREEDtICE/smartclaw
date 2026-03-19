# Script Shape

Write one deterministic executable black-box script per approved scenario.

## Required Sections

### Test name

Use a short, specific journey name. Mention the risk or contract only when it clarifies the path under test.

### Scenario reference

Point to the approved scenario identifier, title, or source artifact. If the scenario names validated contracts, repeat them briefly here rather than rediscovering new ones.

### Harness capabilities used

List only the harness surfaces the procedure actually needs, such as:

* canonical inbound event injection
* fixture seeding
* fake tool or fake external system adapters
* approval controls
* resume controls
* run-state inspection
* trace inspection
* replay verification
* side-effect evidence inspection

### Fixture setup

List the seeded user, thread, scope, config, policy fixtures, model mode, tool fakes, memory or retrieval fixtures, sandbox posture, and replay mode required before the first inbound event.

### Test procedure

Prefer numbered steps. Build the procedure from harness actions only:

1. Seed fixtures and fake dependencies.
2. Inject the canonical inbound event.
3. Advance policy, approval, or resume controls when required.
4. Wait for the documented terminal or intermediate run state.
5. Inspect visible output, run record, trace, replay artifacts, and side-effect evidence.

### Assertions

Separate assertions by concern. Include only the groups the scenario exercises.

* Visible output:
  * response text, outbound event, or other externally visible result
* Lifecycle and checkpoints:
  * run created, paused, resumed, completed, or failed in the documented order
  * required checkpoints exist at documented boundaries
* Policy and approval:
  * no side effect before policy decision
  * approval wait entered before gated action
  * approval or deny binds to the exact protected action
* Capability exposure:
  * exposed tool or skill set equals the effective allowed set
  * executed capability belongs to that set
* Context and prompt evidence:
  * context-layer or source separation facts when the scenario calls for them
  * keep these separate from capability assertions
* Side effects:
  * expected side effect exists, or forbidden side effect does not exist
  * side-effect evidence is persisted when the docs require it
* Delegation:
  * child creation stays within delegated profile, budget, tools, and route limits
  * child context does not assume full parent scratchpad inheritance
* Trace and observability:
  * lifecycle, policy, capability, tool, checkpoint, and child events are present when relevant

### Replay checks

State the replay proof required for this scenario. For deterministic or recorded runs, require the relevant stored artifacts:

* model inputs and outputs
* tool inputs and outputs
* policy decisions or approval refs
* checkpoints
* context snapshot or inclusion refs when relevant
* child delegation refs and merge evidence when relevant

If the scenario is not replayable under the documented mode, state the expected degraded replay posture instead of pretending full determinism.

### Cleanup

Remove or reset only the fixtures and temporary artifacts created for the test. Do not include product-internal cleanup steps unless the harness contract exposes them.

### Missing harness capabilities / blockers

Write `None` when the harness can prove every required condition. Otherwise prefix each missing item with `missing harness capability:`.

## Authoring Guardrails

* Prefer fake tools and recorded model behavior to live integrations.
* Do not assume internal package names, structs, RPC methods, or database tables.
* Do not collapse run-record assertions into final-response assertions.
* Do not claim the test is executable if a required harness action or inspection surface is missing.
