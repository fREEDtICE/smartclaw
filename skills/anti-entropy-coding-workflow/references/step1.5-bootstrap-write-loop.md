# Step 1.5: Bootstrap-Write Bridge

# Goal
Allow one narrow writing batch to establish the first runnable smoke and journey path without pretending the repository is already implementation-ready.

# When to use this step
Use this step only when Step 1 returns `bootstrap_write_authorized`.

That result means:
* the non-test truth set is strong enough to bound a first slice
* the `test-environment` artifact is still `bootstrap-only`
* the `test-environment` artifact explicitly authorizes one bounded bootstrap write batch

# Inputs
Collect these inputs before the loop:
* `run-id`
* `scope`
* `risk`
* relevant truth artifacts and extracted claims
* the selected `test-environment` artifact
* `bootstrap_change_intent`
* `bootstrap_allowed_paths`
* `bootstrap_promotion_checks`
* `bootstrap_stop_conditions`

# Workflow
1. Confirm Step 1 returned `bootstrap_write_authorized`.
2. Load only the truth artifacts needed for the first runnable slice.
3. Read the `test-environment` artifact and extract:
   * planned setup, reset, health, smoke, and targeted commands
   * fixtures and external dependencies
   * `bootstrap_change_intent`
   * `bootstrap_allowed_paths`
   * `bootstrap_promotion_checks`
   * `bootstrap_stop_conditions`
4. Write a checkpoint entry that states:
   * intended narrow slice
   * allowed files or directories
   * promotion checks that must become real by the end of the batch
   * explicit stop conditions that would abort the batch
5. Implement only the substrate and thinnest runnable path needed to make:
   * one smoke test executable
   * one scoped user journey or happy-path check executable
6. Run the promotion checks immediately after the batch.
7. Update the `test-environment` artifact honestly:
   * keep `implementation_readiness: bootstrap-only` if the checks are still not real
   * promote to `implementation-ready` only when the smoke and targeted checks execute for the selected scope
8. Rerun Step 1 before entering normal Step 2 coding.

# Typical allowed work
This bridge may include:
* choosing the concrete toolchain for the first slice
* creating the thinnest runtime entrypoint
* adding fake or stubbed dependencies needed for deterministic smoke coverage
* creating the first harness scripts or commands
* wiring one happy-path journey hook that the smoke or targeted checks can exercise

# Forbidden shortcuts
Do not use this bridge to:
* add unrelated product features
* broaden the scope beyond the declared first slice
* expose capabilities that the slice cannot yet execute safely
* mark the environment `implementation-ready` when commands still only prove docs exist

# Exit decisions
At the end of the loop, make one of these decisions:
* `promote`: the smoke and targeted checks now execute, the environment can be marked `implementation-ready`, and Step 1 should be rerun
* `stay_bootstrap_only`: the batch produced useful substrate, but promotion checks are still not real or not green
* `reset`: the slice widened, the truth became unclear, or the stop conditions fired

# Required outputs
Persist a checkpoint such as `.anti-entropy/runs/<run-id>/state.json` with:
* current scope
* touched files
* promotion checks attempted
* promotion checks passed
* promotion checks failed
* unresolved blockers
* next recommendation
