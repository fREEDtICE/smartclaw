# Step 2: Anti-Entropy Coding Loop

# Goal
Implement one bounded change without letting the task expand beyond the truth artifacts that justify it.

Use this step only after Step 1 reports `proceed` or `proceed_with_warnings`.
If Step 1 reports `bootstrap_write_authorized`, use Step 1.5 first.

Before code is written, create a batch contract using [batch-contract-standard.md](batch-contract-standard.md).

# Inputs
Collect these inputs before each loop:
* `run-id`
* `scope`
* `change-intent`
* `risk`
* relevant truth artifacts and extracted claims
* targeted verification command for the scope
* batch contract

# Workflow
1. Pick one scope and one concrete objective.
2. Load only the truth artifacts relevant to that scope.
3. Write `.anti-entropy/runs/<run-id>/contract.yaml` that states:
   * intended outcome
   * allowed paths
   * truth claims that must remain true
   * planned checks and failure checks
   * evidence targets
   * done criteria
   * stop conditions
4. Write a checkpoint entry that states:
   * intended outcome
   * files expected to change
   * truth claims that must remain true
   * targeted tests to run
5. Implement a bounded batch of code.
6. Run targeted verification immediately.
7. Record outcome, changed files, and unresolved risks in the run state.
8. Stop if the scope widened, verification failed repeatedly, or required truth became unclear.

# Loop size
Prefer loops that fit inside one focused work session:
* low-risk scope: 10 to 20 minutes
* medium-risk scope: 15 to 30 minutes
* high-risk scope: 20 to 45 minutes plus semantic review if required

# Required outputs
Persist a checkpoint such as `.anti-entropy/runs/<run-id>/state.json` with:
* current scope
* touched files
* completed checks
* failed checks
* unresolved questions
* next step

Persist `.anti-entropy/runs/<run-id>/contract.yaml` as the evaluator-facing definition of `done` for the batch.

# Rules
* Do not mix unrelated scopes in one loop.
* Do not start code before the contract is specific enough for an independent evaluator to grade.
* If a change needs new truth artifacts, pause and update Step 1 inputs first.
* If the targeted tests are not available, treat that as a risk signal, not a reason to skip verification silently.
* Do not treat bootstrap-only checks such as file existence, manifest formatting, or document previews as sufficient verification for implementation work.
