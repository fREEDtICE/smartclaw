---
name: anti-entropy-test-environment-bootstrap
description: >-
  Companion to `$anti-entropy-coding-workflow` for repositories that have
  enough design truth to define a real test-environment contract, but still
  need a bootstrap-only harness substrate and one bounded first slice before
  normal implementation can begin. Use when readiness is blocked by a missing,
  docs-only, or non-executable `test-environment`, and the next job is to
  author or repair `docs/testing/test-environment.yaml`, choose one smoke test
  and one user journey, bound the first writable slice, and promote the
  environment honestly.
---
# Goal
Turn a blocked or docs-only test-environment story into one truthful artifact that can drive the next move.

This skill should produce one of three honest outcomes:
* `blocked`: the repo still lacks enough information to choose the first runtime slice or toolchain
* `bootstrap-only`: the repo can authorize one narrow bootstrap-write batch, but the smoke and journey commands are not real yet
* `implementation-ready`: the commands already exist and run for the selected scope

# Use This Skill When
* `$anti-entropy-coding-workflow` returns `blocked_pending_resolution` because the `test-environment` artifact is missing, docs-only, or non-executable
* `$anti-entropy-coding-workflow` returns `bootstrap_write_authorized`
* the repository has design docs and E2E specs, but no honest bridge to the first runnable smoke and journey checks
* the user wants to create `docs/testing/test-environment.yaml` or repair it so the readiness loop can continue

# Workflow
## Step 1: inspect local context first
Read:
* [../anti-entropy-coding-workflow/references/test-environment-standard.md](../anti-entropy-coding-workflow/references/test-environment-standard.md)
* [../anti-entropy-coding-workflow/references/readiness-discussion-record.md](../anti-entropy-coding-workflow/references/readiness-discussion-record.md)
* [references/bootstrap-write-bridge.md](references/bootstrap-write-bridge.md)

Inspect:
* existing `docs/design`, `docs/e2e`, and `docs/testing` materials
* the repo root for toolchain markers and runtime entrypoints
* the latest readiness discussion record if one exists

Use the repo evidence to determine:
* the single first implementation slice
* the one smoke test and one happy-path or journey test that should prove the slice
* whether the repo is still `blocked`, should be `bootstrap-only`, or can already be `implementation-ready`

## Step 2: choose one first slice
Name exactly one thin slice:
* one scope
* one runtime or build entrypoint
* one smoke test
* one happy-path or journey test
* one bounded set of allowed files or directories if bootstrap-write is needed

Do not authorize multiple slices in one pass.

## Step 3: author or repair `docs/testing/test-environment.yaml`
Always fill the required `test-environment` fields.

If the commands already exist and run, mark the file `implementation-ready`.

If the commands do not yet exist but the first slice is clear, keep the file `bootstrap-only` and add the bootstrap-write bridge fields described in [references/bootstrap-write-bridge.md](references/bootstrap-write-bridge.md).

If the first slice is still unclear, keep the file `blocked` and list the blockers explicitly.

## Step 4: scaffold only the substrate the artifact names
When the user wants code changes, implement only the thinnest substrate needed to make the smoke and journey commands real:
* toolchain selection for the first slice
* runtime entrypoint
* fake or stubbed dependencies
* reset or cleanup hooks
* harness scripts

Keep the write set inside the declared bootstrap bounds.

## Step 5: validate honestly
After writing the artifact or scaffolding:
* rerun `$anti-entropy-coding-workflow` preflight or its checker script
* run the smoke and targeted commands when they actually exist
* promote to `implementation-ready` only when those commands execute for the selected scope

# Output Shape
Return results in this section order:
1. `Decision`
2. `First slice`
3. `Test environment artifact`
4. `Bootstrap-write bounds`
5. `Validation`
6. `Next promotion step`

# Rules
* Do not pretend `bootstrap-only` is `implementation-ready`.
* Do not authorize more than one first slice at a time.
* If the runtime entrypoint or toolchain is still unknown, stop and keep the artifact `blocked`.
* Prefer one smoke test plus one happy-path journey over a large suite.
* If scaffolding is needed, it should only make the planned checks real. It should not broaden the feature surface.
