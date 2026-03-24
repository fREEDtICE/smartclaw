# Content Consistency Review

# Goal
After fingerprint checks pass or reveal changes, determine whether the current truth artifacts are semantically aligned for the affected scope.

# What to compare
Normalize each relevant artifact into claims:
* invariants: rules that must always hold
* API or interface contracts: inputs, outputs, auth, errors, side effects
* E2E specs: preconditions, actions, expected outcomes
* architecture docs: module boundaries and allowed dependencies
* state or lifecycle docs: allowed transitions and terminal states
* test environment: setup, reset, and verification assumptions

# Deterministic checks first
Run structural checks before any semantic review:
* required artifact types exist for the scope
* fingerprints match the manifest
* referenced files exist
* critical scopes satisfy `coverage_requirements`
* structured contracts do not contradict each other on obvious fields such as endpoint names, state names, or documented error codes

# Semantic review second
Use a semantic reviewer for prose-heavy consistency questions such as:
* one document allows guest checkout while another requires auth
* an E2E failure path exists but the API contract has no corresponding error contract
* a state machine forbids a transition that the workflow doc assumes
* a risk-zone doc names a safety rule missing from invariants or tests

If the host supports a subagent or DeepResearch capability, use it only on the affected scope and only with selected authoritative artifacts.

# Output contract
The reviewer should return structured findings using [../scripts/truth-manifest-consitency-check-schema.json](../scripts/truth-manifest-consitency-check-schema.json). Each finding should include:
* the scope
* the two or more artifacts in tension
* why the content conflicts or what point is missing
* severity and confidence
* recommended next action

# DeepResearch guidance
Use DeepResearch only when one of these is true:
* the scope is `high` risk
* required artifacts changed recently
* the conflict depends on prose interpretation rather than machine-readable contracts

Do not use it as a free-form brainstormer. Give it:
* a bounded scope
* a fixed artifact list
* a required report schema
* instructions to identify conflicts, missing points, and unsupported assumptions
