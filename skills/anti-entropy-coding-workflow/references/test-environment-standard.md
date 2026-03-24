# Test Environment Standard

# Purpose
The testing environment is itself a truth artifact. If a change cannot be validated repeatably, the rest of the truth set is weaker than it looks.

# Required file
Declare the test environment in a stable file such as `docs/testing/test-environment.yaml` and register it in the truth manifest as type `test-environment`.

# Required fields
The file should define:
* `id`
* `owner`
* `scope_tags`
* `implementation_readiness`
* `setup_commands`
* `health_checks`
* `reset_commands`
* `smoke_test_command`
* `targeted_test_patterns`
* `fixtures`
* `external_dependencies`
* `cleanup_commands`

When `implementation_readiness` is not `implementation-ready`, the file should also define:
* `blocking_issues`

# Readiness states
Use one of these explicit states:
* `implementation-ready`: the selected scope has an executable setup path, a real smoke test, and real targeted verification commands
* `bootstrap-only`: truth artifacts can be bootstrapped or repaired, but implementation is still blocked because the runtime or test path is not ready
* `blocked`: the repository cannot support implementation work for the selected scope yet; list the blockers explicitly

# Quality bar
The environment must be:
* scriptable: no hidden manual steps for the normal path
* resettable: can return to a known-good state
* scoped: supports targeted verification for one subsystem or workflow
* time-bounded: smoke checks and targeted checks should have clear expected durations
* observable: health checks must reveal whether the environment is actually ready
* implementation-honest: placeholder checks such as file existence, manifest formatting, or document previews must not be presented as real smoke or targeted tests for code changes

# Fail-closed guidance
Do not mark a test environment as `implementation-ready` unless it names a concrete runtime or build path for the selected scope.

Examples that do **not** qualify as implementation-ready by themselves:
* `test -f ...`
* `rg --files ...`
* `sed -n '1,80p' ...`
* `python -m json.tool ...`
* any command set that only proves documents exist

If the repository is still docs-only or the build toolchain has not been chosen yet, set `implementation_readiness: bootstrap-only` or `implementation_readiness: blocked` and enumerate the blockers instead of pretending the environment is ready.

# Minimum expectations by task
* Low-risk changes: smoke test plus targeted test for the touched scope
* Medium-risk changes: smoke test, targeted tests, and one happy-path E2E
* High-risk changes: smoke test, targeted tests, happy path, failure path, and reset verification

# Example shape
```yaml
id: checkout-test-env
owner: payments-platform
scope_tags:
  - checkout
implementation_readiness: implementation-ready
setup_commands:
  - pnpm install
  - pnpm db:reset
  - pnpm dev:test
health_checks:
  - http://localhost:3000/healthz
reset_commands:
  - pnpm db:reset
smoke_test_command: pnpm test:smoke
targeted_test_patterns:
  checkout: pnpm test checkout
fixtures:
  - test user
  - seeded catalog
external_dependencies:
  - postgres
cleanup_commands:
  - pnpm dev:test:stop
```

# Bootstrap-only example
```yaml
id: platform-bootstrap-env
owner: platform-architecture
scope_tags:
  - platform-core
implementation_readiness: blocked
blocking_issues:
  - no runtime or build toolchain has been selected yet
  - no executable smoke or targeted tests exist for implementation scopes
setup_commands:
  - rg --files docs/design docs/e2e
health_checks:
  - test -f docs/design/Layer.1-Overview.Architecture.md
reset_commands: []
smoke_test_command: python3 -m json.tool .anti-entropy/manifest.json
targeted_test_patterns:
  platform-core: test -f docs/e2e/Basic.User.Journey.Cases.md
fixtures:
  - canonical design docs
external_dependencies: []
cleanup_commands: []
```
