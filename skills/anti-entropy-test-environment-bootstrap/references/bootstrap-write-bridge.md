# Bootstrap-Write Bridge

Use this bridge only when the repository has enough truth to bound the first runnable slice, but does not yet have executable smoke and targeted checks.

The bridge lives in `docs/testing/test-environment.yaml`.

# Required test-environment fields
Keep the normal required fields:
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

# Bootstrap-write fields
Add these only when `implementation_readiness: bootstrap-only` and one bounded write batch is justified:
* `bootstrap_write_authorized: true`
* `bootstrap_change_intent`
* `bootstrap_allowed_paths`
* `bootstrap_promotion_checks`
* `bootstrap_stop_conditions`

# What these fields mean
* `bootstrap_change_intent`: one sentence describing the thinnest batch that should happen next
* `bootstrap_allowed_paths`: the only files or directories the batch may touch
* `bootstrap_promotion_checks`: the smoke and journey checks that must become real before the environment can be promoted
* `bootstrap_stop_conditions`: reasons to stop or reset instead of widening the scope

# Promotion rule
Do not promote the file to `implementation-ready` until:
* the smoke test command executes for the selected scope
* at least one targeted happy-path or journey command executes for the selected scope
* the repo has a concrete runtime or build entrypoint for that slice

# Example shape
```yaml
id: runtime-bootstrap-env
owner: platform-runtime
scope_tags:
  - execution-core
implementation_readiness: bootstrap-only
blocking_issues:
  - smoke and journey commands are planned but not executable yet
bootstrap_write_authorized: true
bootstrap_change_intent: create the first runtime entrypoint plus one smoke and one happy-path journey hook
bootstrap_allowed_paths:
  - cmd/runtime/
  - internal/runtime/
  - internal/testkit/
  - docs/testing/test-environment.yaml
bootstrap_promotion_checks:
  - smoke_test_command executes successfully
  - targeted_test_patterns.execution-core executes successfully
bootstrap_stop_conditions:
  - the batch needs a second independent journey
  - the batch needs broad policy or delegation behavior before the smoke path works
setup_commands:
  - go mod download
health_checks:
  - ./scripts/healthcheck-runtime.sh
reset_commands:
  - ./scripts/reset-runtime-fixtures.sh
smoke_test_command: go test ./cmd/runtime/smoke -run TestRuntimeSmoke
targeted_test_patterns:
  execution-core: go test ./internal/testkit/e2e -run TestBasicJourney
fixtures:
  - synthetic channel input
  - stub model adapter
external_dependencies: []
cleanup_commands:
  - ./scripts/stop-runtime-fixtures.sh
```
