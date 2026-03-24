# Step 2: Anti-Entropy Coding Loop

# Goal
Implement one bounded change without letting the task expand beyond the truth artifacts that justify it.

# Inputs
Collect these inputs before each loop:
* `run-id`
* `scope`
* `change-intent`
* `risk`
* relevant truth artifacts and extracted claims
* targeted verification command for the scope

# Workflow
1. Pick one scope and one concrete objective.
2. Load only the truth artifacts relevant to that scope.
3. Write a checkpoint entry that states:
   * intended outcome
   * files expected to change
   * truth claims that must remain true
   * targeted tests to run
4. Implement a bounded batch of code.
5. Run targeted verification immediately.
6. Record outcome, changed files, and unresolved risks in the run state.
7. Stop if the scope widened, verification failed repeatedly, or required truth became unclear.

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

# Rules
* Do not mix unrelated scopes in one loop.
* If a change needs new truth artifacts, pause and update Step 1 inputs first.
* If the targeted tests are not available, treat that as a risk signal, not a reason to skip verification silently.
* Do not treat bootstrap-only checks such as file existence, manifest formatting, or document previews as sufficient verification for implementation work.
