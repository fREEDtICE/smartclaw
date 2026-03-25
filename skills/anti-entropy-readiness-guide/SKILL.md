---
name: anti-entropy-readiness-guide
description: >-
  Companion to `$anti-entropy-coding-workflow` for projects that are not yet
  solid enough to start AI-assisted development. Use when that workflow returns
  `bootstrap_required`, `blocked_pending_resolution`, `refuse_implementation`,
  or otherwise fails readiness checks. This skill is not free-form
  brainstorming: it should act like a guidance expert that explains what good
  looks like, what is weak, and which questions matter next. It should produce
  or update a durable readiness discussion record that the coding workflow can
  read later.
---
# Goal
Turn a blocked or weak-readiness repository into a concrete guidance session instead of leaving the user with a dead-end report.

This skill does three things:
* explains why system entropy keeps growing with AI coding agents
* states the readiness standard required before implementation should begin
* asks a small set of project-specific questions that will unblock the next artifact or decision

# Use This Skill When
* the user asks how to get a project ready for implementation
* `$anti-entropy-coding-workflow` returns `bootstrap_required`, `blocked_pending_resolution`, or `refuse_implementation`
* a readiness or anti-entropy preflight is missing critical truth artifacts or has no executable test path
* the user wants guidance on the open questions instead of coding immediately
* the repository has some docs, but the authoritative scope or executable test path is still unclear

# Workflow
## Step 1: inspect local context first
If `repo-root` is known, inspect the repository before asking questions.
Start with likely truth-artifact locations such as `docs/design`, `docs/e2e`, `docs/testing`, `docs/invariants`, `openapi`, `proto`, `specs`, `api`, and `contracts`.
Read [../anti-entropy-coding-workflow/references/readiness-discussion-record.md](../anti-entropy-coding-workflow/references/readiness-discussion-record.md) before you begin so the result can be persisted in a shape the coding workflow understands.

Use the local context to determine:
* which parts of the readiness standard are already satisfied
* which artifact classes are missing or weak
* whether the best available test-environment path is executable, bootstrap-only, or absent
* whether an existing readiness discussion record already captures part of this discussion

## Step 2: explain entropy clearly
Give a short explanation of why entropy grows with AI coding agents. Use the framing in [references/entropy-brief.md](references/entropy-brief.md).

Keep this section short and concrete. The goal is to explain why the readiness bar exists, not to lecture.

## Step 3: state the standard and judge the repo
Tell the user the required standard using [references/readiness-standard.md](references/readiness-standard.md).
For detailed minimum content expectations for each truth artifact, also use [../anti-entropy-coding-workflow/references/truth-artifact-content-standard.md](../anti-entropy-coding-workflow/references/truth-artifact-content-standard.md).

At minimum, call out:
* system overview
* invariants
* API or interface contracts
* E2E or workflow specs
* executable test environment

Be explicit about:
* what is already good enough
* what is weak or missing
* why the current state is unsafe for AI-assisted implementation if readiness is still blocked

This skill should take a position. Do not present all options as equally good if the repo clearly lacks essential constraints.

## Step 4: ask targeted open questions
Ask only the highest-leverage questions for the current repository. Use [references/question-framework.md](references/question-framework.md).

Rules:
* ask at most 3 to 5 questions in one pass
* tailor the questions to what is missing in the actual repo
* prefer questions that help create the next authoritative artifact or make one blocked readiness decision clean
* prefer concrete, answerable questions over broad exploratory prompts
* use your own judgment to sharpen vague user goals into precise questions

## Step 5: persist the discussion record
When the repository is available and writing is allowed, create or update a readiness discussion record following [../anti-entropy-coding-workflow/references/readiness-discussion-record.md](../anti-entropy-coding-workflow/references/readiness-discussion-record.md).

Preferred location:
* `.anti-entropy/discussions/<scope>.md`

If a record already exists for the scope, update it instead of duplicating it.

## Step 6: end with the next artifact
Always end by naming the single next artifact or decision that should be produced first.

Examples:
* `docs/testing/test-environment.yaml`
* `docs/design/invariants.md`
* `openapi/runtime.yaml`
* `docs/e2e/core-runtime-workflows.md`

# Output Shape
Return results in this section order:
1. `Why entropy grows`
2. `What good looks like`
3. `What is weak here`
4. `Key questions`
5. `Discussion record`
6. `Best next artifact`

# Rules
* Inspect local repo context before asking questions when the repo is available.
* Do not ask the user to enumerate every artifact manually on the first pass.
* Do not start implementation planning if the test-environment path is still non-executable or missing.
* Prefer updating an existing readiness discussion record over creating multiple disconnected records.
* Make the bond to `$anti-entropy-coding-workflow` explicit: your result should be readable and reusable by that workflow on the next pass.
* If the missing work is specifically the test-environment bridge from docs-only truth to the first runnable slice, recommend `$anti-entropy-test-environment-bootstrap` as the next execution skill.
* If the repo is implementation-ready but still lacks a skeptical batch-review loop, recommend adding the batch contract and `$anti-entropy-evaluator` path before broadening scope.
* This is a guide, not a neutral brainstormer. Say clearly what is good, what is bad, and what should happen next.
* Keep the number of questions low. A good first pass is usually 3 questions, rarely more than 5.
