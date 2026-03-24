# Step 3: Anti-Entropy Review And Reset Loop

# Goal
Re-check the changed scope against the truth set, then decide whether to continue, escalate, or reset to a smaller task boundary.

# Workflow
1. Collect the changed files and the latest checkpoint state.
2. Re-run the source-of-truth check for the affected scope.
3. Compare implementation outcomes against the relevant truth claims.
4. Run targeted regression checks for the changed scope.
5. If the scope is high-risk or the truth set changed, run semantic consistency review.
6. Make one of three decisions:
   * `continue`: the scope is stable and the next bounded loop is clear
   * `escalate`: the task requires new truth, broader review, or human decision
   * `reset`: shrink the scope, revert the plan, or stop after recording blockers

# What reset means
Reset does not automatically mean reverting code. It means returning to a smaller, clearer problem statement with an updated checkpoint.

# Review outputs
The review should produce:
* changed scope
* blocking issues
* warnings
* truth conflicts
* missing coverage
* recommended next action

# Time profile
This step should usually be shorter than Step 2:
* low-risk scope: 5 to 10 minutes
* medium-risk scope: 10 to 20 minutes
* high-risk scope: 15 to 30 minutes plus semantic review time

# Host capability guidance
If the skill host supports long-running or resumable tasks, store the review output alongside the run state. If it does not, compress the review into a short report and stop cleanly at the current checkpoint.
