---
name: anti-entropy-coding-workflow
description: Contract-driven preflight and coding workflow for repositories where AI drift is risky. Use when asked whether a project or scope is solid enough to start development, ready for implementation, missing truth artifacts, or needs scoped implementation and review loops before coding can proceed safely. Companion to `$anti-entropy-readiness-guide`, which handles failed readiness checks, guides the user through the key blocked decisions, and produces a durable discussion record for this workflow to read.
---
# Goal
Reduce coding entropy by forcing three things:
* deterministic checks before implementation
* small scoped implementation batches
* explicit review and reset points

Use this skill when:
* the user asks whether a project, repository, or scope is ready to start development or implementation
* the user asks whether truth artifacts are sufficient, missing, or inconsistent before coding starts
* the repository has design docs, invariants, API contracts, or E2E specs
* a change touches risky domains such as auth, billing, workflow state, or migrations
* consistency matters more than raw speed

Do not use this as a universal blocker for trivial edits. Use `lite` mode when the repo does not yet have a mature truth manifest.

# Modes
* `lite`: bootstrap or repair truth artifacts, but do not start implementation unless the required test-environment artifact is explicitly implementation-ready for the selected scope
* `strict`: require a valid manifest, artifact fingerprint checks, and scope coverage checks before coding
* `high-risk`: `strict` plus bounded semantic consistency review on the affected scope; use a subagent or DeepResearch capability only if the host supports it

# Workflow
## Step 1: check the source of truth
Read [references/step1-check-the-source-of-truth.md](references/step1-check-the-source-of-truth.md).
Read [references/readiness-discussion-record.md](references/readiness-discussion-record.md) so Step 1 can consume the latest readiness discussion before asking the user to restate open questions.

If the repository does not yet have a usable manifest, inspect repository docs and contracts first, then bootstrap a repo-local `.anti-entropy/manifest.json` from the best local candidates using:
* [references/truth-artifact-standard.md](references/truth-artifact-standard.md)
* [references/truth-artifact-content-standard.md](references/truth-artifact-content-standard.md)
* [references/test-environment-standard.md](references/test-environment-standard.md)
* [references/content-consistency-review.md](references/content-consistency-review.md)

If Step 1 finds no usable manifest and `repo-root` is known, search the repository automatically before asking the user for anything. Start with common truth-artifact locations such as `docs/design`, `docs/e2e`, `docs/testing`, `docs/invariants`, `openapi`, `proto`, `specs`, `api`, and `contracts`. If local discovery finds authoritative materials, initialize a repo-local scaffold manifest and rerun the readiness check. Ask the user for extra paths only if `repo-root` is unknown or the automatic search finds too little to bootstrap from.

## Step 1.5: bootstrap-write bridge
Read [references/step1.5-bootstrap-write-loop.md](references/step1.5-bootstrap-write-loop.md).

Use this step only when Step 1 returns `bootstrap_write_authorized`. This is not normal implementation readiness. It is a narrow bridge that allows one bounded batch to make the first smoke and journey checks real without widening into feature work.

If the missing work is primarily test-environment definition, harness substrate, or promotion criteria for the first runnable slice, use `$anti-entropy-test-environment-bootstrap`.

## Step 2: anti-entropy coding loop
Read [references/step2-anti-entropy-coding-loop.md](references/step2-anti-entropy-coding-loop.md).
Read [references/batch-contract-standard.md](references/batch-contract-standard.md).

Implement only one bounded scope at a time. Each loop must end with a checkpoint, targeted verification, and a clear continue or stop decision.

Do not use Step 2 for a repo that is still `bootstrap-only`. That bridge belongs to Step 1.5.

## Step 3: anti-entropy review and reset loop
Read [references/step3-anti-entropy-review-and-reset-loop.md](references/step3-anti-entropy-review-and-reset-loop.md).
Read [references/evaluation-report-standard.md](references/evaluation-report-standard.md).
Read [references/evaluation-rubric.md](references/evaluation-rubric.md).

Re-check the changed scope against truth claims, then decide whether to continue, escalate, or reset to a smaller scope.

For medium-risk or high-risk work, prefer using `$anti-entropy-evaluator` as the independent judge for the batch before deciding to continue.

If Step 1 or Step 3 fails readiness checks and the user wants guidance on the missing decisions or artifacts instead of coding, use `$anti-entropy-readiness-guide`.
That companion skill should update a readiness discussion record, and this workflow should read that record on the next preflight pass.

# Rules
* Deterministic checks come before semantic review.
* A semantic reviewer is an evidence producer, not the source of truth.
* Missing required truth artifacts is never treated as a clean pass.
* Missing manifest should trigger docs-first discovery and scaffold work before the workflow asks the user to enumerate artifacts by hand.
* Read the latest readiness discussion record before reopening the same bootstrap discussion. Reuse accepted decisions and unresolved questions instead of asking the user to restate them.
* A readiness discussion record is supplemental guidance, not authoritative truth. Only accepted decisions that have been promoted into real artifacts may justify implementation.
* A bootstrapped manifest is not enough to justify implementation. The required `test-environment` artifact must describe an executable build and verification path for the selected scope.
* `bootstrap_write_authorized` is a bounded bridge, not a clean pass. Use it only to establish the thinnest runnable path and promote the test environment honestly.
* Every Step 2 batch should have an explicit batch contract before code and an evaluation record after code.
* For medium-risk or high-risk work, the generator should not be the final judge of its own output when an independent evaluator can be used.
* Placeholder checks such as file existence, document structure inspection, or manifest formatting do not qualify as implementation-ready verification for Step 2.
* Prefer scoped work over broad edits. Smaller loops reduce entropy faster than large rewrites.
* Persist run state under `.anti-entropy/runs/<run-id>/` when the host supports long-running or resumable work.
