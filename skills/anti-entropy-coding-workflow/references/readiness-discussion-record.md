# Readiness Discussion Record

# Goal
Provide a durable handoff between `$anti-entropy-readiness-guide` and `$anti-entropy-coding-workflow`.

# Status
A readiness discussion record is supplemental, not authoritative by default.
Use it to preserve:
* resolved decisions
* unresolved questions
* missing artifact gaps
* the single best next artifact

Accepted decisions in the record may guide bootstrap and prioritization, but they do not replace authoritative truth artifacts.

# Preferred locations
Store the record in one of these locations:
* `.anti-entropy/discussions/<scope>.md`
* `docs/anti-entropy/readiness/<scope>.md`

Prefer the first location for workflow-local notes. Prefer the second only if the team intentionally wants the discussion record versioned in the repo.

# Required fields
Each record should contain:
* `discussion_id`
* `scope`
* `status`
* `source_skill`
* `created_at`
* `updated_at`
* `repo_root`
* `repo_signals`
* `readiness_gaps`
* `resolved_decisions`
* `unresolved_questions`
* `best_next_artifact`
* `promotion_targets`

# Status values
* `draft`: exploratory discussion; not stable enough for workflow assumptions
* `reviewed`: useful guidance, but still awaiting confirmation
* `accepted`: the user or team has accepted these decisions as the current working plan

# Workflow rules
For `$anti-entropy-readiness-guide`:
* inspect and update the latest record for the relevant scope when one already exists
* persist a new record when the repository is available and writing is allowed
* keep unresolved questions and the chosen next artifact explicit

For `$anti-entropy-coding-workflow`:
* read the latest relevant record before repeating readiness questions
* use `accepted` decisions to guide manifest bootstrap, artifact discovery, and question prioritization
* treat unresolved questions as blockers until promoted into authoritative artifacts or explicitly resolved
* never treat the record itself as a substitute for `system-overview`, `invariant-spec`, `interface-contract`, `e2e-spec`, or `test-environment`

# Suggested Markdown shape
```md
# Readiness Discussion Record

- discussion_id: runtime-core-2026-03-24
- scope: runtime-core
- status: accepted
- source_skill: anti-entropy-readiness-guide
- created_at: 2026-03-24T00:00:00Z
- updated_at: 2026-03-24T00:00:00Z
- repo_root: /path/to/repo

## Repo signals
- Existing design docs cover runtime, policy, and sandbox.
- No executable test-environment artifact exists yet.

## Readiness gaps
- Missing `docs/testing/test-environment.yaml`
- Interface contract still prose-only for runtime execution

## Resolved decisions
- First implementation scope is runtime-core.
- Smoke test should start one local runtime instance and verify health.

## Unresolved questions
- What exact command seeds deterministic fixtures?
- Which targeted verification command should cover runtime-core?

## Best next artifact
- docs/testing/test-environment.yaml

## Promotion targets
- Promote resolved smoke-test and scope decisions into the test-environment artifact and manifest coverage requirement.
```
