# Goal
Determine whether implementation may start for the requested scope, and whether semantic consistency review is required before coding.

Implementation readiness is stricter than manifest bootstrap. A repository may have enough truth artifacts to bootstrap Step 1 while still being blocked for Step 2 because the test environment is placeholder-only, docs-only, or otherwise not executable for the selected scope.

# Inputs
Collect these inputs before running the checker:
* `project-name`: optional. Defaults to the repository name when omitted.
* `repo-root`: strongly preferred. Use the repository root on the local filesystem.
* `scope`: optional comma-separated list such as `api,checkout`.
* `risk`: optional `low`, `medium`, or `high`.
* `mode`: optional `lite`, `strict`, or `high-risk`.

If `repo-root` is not explicit:
* if the current directory is a git repository, use that root
* otherwise stop and ask for `project-name` and `repo-root`

# Workflow
1. Determine the project name, repository root, scope, risk, and mode.
2. Before repeating readiness questions, look for the latest readiness discussion record using [readiness-discussion-record.md](readiness-discussion-record.md).
3. If a relevant record exists, read it first and reuse:
   * accepted decisions for bootstrap guidance and artifact prioritization
   * unresolved questions as current blockers
4. If no usable manifest exists and `repo-root` is known, run docs-first discovery before treating the project as uninitialized:
   * search the common truth-artifact locations inside the repository
   * classify the best local candidates
   * if discovery finds authoritative material, write a repo-local scaffold manifest at `.anti-entropy/manifest.json`
5. Run `scripts/check-the-source-of-truth.mjs` from the repository root.
6. Read the JSON report and inspect:
   * manifest validity
   * artifact fingerprint checks
   * coverage checks for the requested scope
   * test-environment readiness for the requested scope, including whether setup, smoke, and targeted checks are executable rather than placeholder-only
   * blocking issues and warnings
7. If `mode` is `high-risk`, or required truth artifacts changed, run the semantic review workflow in [content-consistency-review.md](content-consistency-review.md).
8. Return a concise report using the section order in `## Report format`.

# Bootstrap discovery workflow
If the checker finds no usable manifest, do not immediately ask the user to enumerate every truth artifact by hand. Use this discovery flow first:
1. If `repo-root` is known, search the repository automatically before asking the user for anything.
2. Start with common locations such as `docs/design`, `docs/e2e`, `docs/testing`, `docs/invariants`, `openapi`, `proto`, `specs`, `api`, and `contracts`.
3. Use local filesystem listing to build a broad candidate set inside those paths. Prefer `rg --files` to enumerate files. If `rg` is not installed, fall back to `find -type f`. If the repository is tracked by git, `git ls-files` is also acceptable for file enumeration.
4. Start from structure, not a fixed keyword list. Let the agent inspect directory names, filenames, extensions, and a bounded preview of candidate files such as the first lines, headings, or schema shape.
5. Read only a bounded set of top candidates and let the model classify which files are likely authoritative truth artifacts, which are supporting context, and which required coverage groups are still missing.
6. If discovery finds enough authoritative material to scaffold safely, write `.anti-entropy/manifest.json` inside the repository from the best local candidates and rerun the readiness check.
7. Only return `bootstrap_required` or ask the user for additional paths when `repo-root` is unknown, the current directory is not a repository, or the automatic search finds too little to bootstrap from.

Use this user question only when bootstrap inputs are still missing after automatic local discovery:
`I searched the repository root but still do not have enough authoritative sources to bootstrap the truth manifest. Give me 1-6 additional local paths to scan for design docs, invariants, API or interface contracts, E2E specs, or test-environment docs. Files or directories are fine.`

Do not ask the user to paste document contents on the first pass unless local paths are unavailable.

# Script invocation
```bash
node skills/anti-entropy-coding-workflow/scripts/check-the-source-of-truth.mjs \
  --project example-repo \
  --repo-root /path/to/repo \
  --scope checkout \
  --risk high \
  --mode strict
```

# Bootstrap discovery search examples:
```bash
rg --files docs/design docs/e2e docs/testing docs/invariants openapi proto specs api contracts
```

Fallback when `rg` is unavailable:
```bash
find docs/design docs/e2e docs/testing docs/invariants openapi proto specs api contracts -type f
```

Optional git-based file enumeration:
```bash
git ls-files docs/design docs/e2e docs/testing docs/invariants openapi proto specs api contracts
```

After enumeration, inspect a bounded set of likely files by reading only the opening section first. For example:
```bash
sed -n '1,80p' docs/design/system-overview.md
sed -n '1,80p' openapi/payment.yaml
sed -n '1,80p' specs/e2e/checkout.md
```

# Outputs
The script prints a JSON object to stdout.

## Output schemas
* Manifest schema (input file): [../scripts/truth-manifest-schema.json](../scripts/truth-manifest-schema.json)
* File and coverage check report schema: [../scripts/truth-manifest-artifacts-check-schema.json](../scripts/truth-manifest-artifacts-check-schema.json)
* Semantic consistency review schema: [../scripts/truth-manifest-consitency-check-schema.json](../scripts/truth-manifest-consitency-check-schema.json)

The bootstrap discovery search should produce:
* the scanned search paths
* a shortlist of likely truth artifact candidates
* the agent's classification of which candidates are authoritative enough to bootstrap from
* a summary of required artifact coverage found and still missing, including the `api-contract` or `interface-contract` requirement
* a clear statement of whether the best available `test-environment` candidate is implementation-ready, bootstrap-only, or blocked

# Decision rules
Interpret the result conservatively:

* `bootstrap_required`: the repository has no usable manifest yet and automatic docs-first bootstrap could not proceed because the repository root is unknown, inaccessible, or local discovery found too little to scaffold from safely.
* `proceed`: manifest is valid, required artifacts for the requested scope are consistent, the required `test-environment` is explicitly implementation-ready, and no blocking issues were found.
* `proceed_with_warnings`: implementation may proceed cautiously, but the report contains only non-blocking issues. A placeholder, bootstrap-only, or blocked test environment is never just a warning.
* `blocked_pending_resolution`: do not implement until required artifacts, required coverage, or test-environment gaps are resolved. Use this when the test-environment artifact is missing, placeholder-only, bootstrap-only, blocked, or lacks executable setup/smoke/targeted verification for the selected scope.
* `refuse_implementation`: do not implement because the manifest is unreadable, invalid, or minimum truth coverage cannot be evaluated.

Use these additional readiness rules:
* a bootstrapped or draft manifest does not imply Step 2 may start
* `docs-only`, `bootstrap-only`, or similarly non-executable verification commands do not qualify as implementation readiness
* file-existence checks, formatting checks, and document previews may support bootstrap work, but they must not be treated as sufficient smoke or targeted tests for code implementation
* if the repository does not yet have a concrete runtime or build toolchain, the checker should return `blocked_pending_resolution` with the missing toolchain or setup path called out explicitly

If there is no usable manifest:
* in any mode, run the automatic docs-first bootstrap discovery workflow first when `repo-root` is known
* if automatic discovery finds enough authoritative material, initialize `.anti-entropy/manifest.json` inside the repository and rerun Step 1 before declaring the project uninitialized
* in `strict` or `high-risk` mode, bootstrap is allowed, but Step 2 remains blocked until the rerun reports implementation readiness
* ask the user for extra paths only after automatic local discovery is exhausted
* if the readiness check fails and the user wants guidance on the missing decisions, artifact gaps, or next questions rather than implement immediately, switch to `$anti-entropy-readiness-guide`
* when a readiness discussion record exists, use it to avoid repeating already-settled questions

# Report format
Return the result in this exact section order:
1. `Decision`
2. `Blocking issues`
3. `Warnings`
4. `Conflicts and missing coverage`
5. `Recommended next action`
