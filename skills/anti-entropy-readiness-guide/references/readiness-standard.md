# Readiness Standard

Before implementation should begin, the project should have:

* `system-overview`
  Defines the overall structure, boundaries, and major seams.

* `invariant-spec`
  Defines the rules that must not drift during implementation.

* `api-contract` or `interface-contract`
  Defines inputs, outputs, boundaries, and subsystem interaction rules.

* `e2e-spec`
  Defines the important workflows or user journeys that implementation must preserve.

* `test-environment`
  Defines an executable setup, smoke test, and targeted verification path for the selected scope.

A project may be bootstrap-ready before it is implementation-ready.

Implementation-ready is stricter:
* the truth set is present enough to constrain changes
* the target scope is covered by contracts
* the test environment is executable, not placeholder-only or docs-only
