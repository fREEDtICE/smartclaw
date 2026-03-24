# What is ground truth of an coding project?
The ground truth of an coding project is the set of permanent artifacts that define the project's behavior and constraints, and MUST NEVER change implicitly or accidentally. Includes:
### Required
* whole system introduction
* do-not-change invariants
* critical interface/API contracts
* critical end-to-end workflow definitions or tests
* testing environment build/run instructions
### Strongly recommended
* architecture/module boundary doc
* state machine or lifecycle spec for critical domains
* risk-zone declaration such as auth/billing/data migration
### Not authoritative by default
* meeting notes
* brainstorming docs
* unreviewed TODO lists
* chat history

# Workflow
1. Determine the project name and local repository root.
3. Run scripts/check-the-source-of-truth.mjs with the inputs to check the consistency of the manifest and local paths.
4. Read the JSON report from the script.
5. **spawn** the subagent to conduct deep research on the *required* and *strongly recommended* level artifacts to check consistency.
6. Return a concise report to the caller using the exact section order in ## Report format.

# Inputs
Collect these inputs before running the script:
* `project-name`: required. Used to locate ~/.anti-entropy/${project-name}/manifest.json.
* `repo-root`: optional but strongly preferred. Use the repository root on the local filesystem.
* `scope`: optional comma-separated list such as api,checkout.
* `risk`: optional low, medium, or high.

If no project name or local repository is not explicitly set, check the current directory whether is a git repository.
* If it is a git repository, use the project name as the repository name.
* If it is not a git repository, stop and ask the user to set the project name and local repository root.


# Outputs
The script prints a JSON object to stdout. The exact shape depends on the execution scenario.

## Output schemas
* Manifest schema (input file): [scripts/truth-manifest-schema.json](../scripts/truth-manifest-schema.json)
* File check report schema (when manifest exists): [scripts/truth-manifest-file-check-schema.json](../scripts/truth-manifest-file-check-schema.json)

## Possible results

### Case A: project not initialized yet (manifest.json missing)
```json
{
  "check_result": "the <project-name> doesn't initliaze yet."
}
```

### Case B: manifest exists (file check report)
This case covers:
* manifest.json is valid and passes truth-manifest-schema validation, then all `truth_artifacts[*].path` are checked
* manifest.json exists but is invalid JSON or fails truth-manifest-schema validation, then a synthetic check entry for `manifest.json` is returned

```json
{
  "artifact_checks": [
    {
      "path": "docs/design/README.md",
      "state": "consistent",
      "last_modification_timestamp": "2026-03-23T00:00:00Z"
    }
  ],
  "summary": {
    "total": 1,
    "consistent": 1,
    "modified": 0,
    "missing": 0
  },
  "checked_at": "2026-03-23T00:00:00Z"
}
```

Notes:
* For each truth artifact, the script checks file existence and compares `size` (bytes).
* Relative `path` values are resolved against the current working directory, so run the script from the repository root (or set cwd to repo-root).

# Decision rules

Interpret the result from the script conservatively:

* `proceed`: manifest is present, required artifacts are present, and no blocking issues were found for the current inputs.
* `proceed_with_warnings`: implementation may proceed cautiously, but the report contains warnings such as optional artifact gaps or stale metadata.
* `blocked_pending_resolution`: do not implement until the missing required artifacts or blocking inconsistencies are resolved.
* `refuse_implementation`: do not implement. Use this when the manifest is missing, unreadable, invalid, or the report indicates minimum truth coverage is unavailable.
