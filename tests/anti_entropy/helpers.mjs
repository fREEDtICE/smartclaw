import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, "..", "..");
const CHECKER_PATH = path.join(
  REPO_ROOT,
  "skills",
  "anti-entropy-coding-workflow",
  "scripts",
  "check-the-source-of-truth.mjs",
);

const BASE_FILES = {
  "docs/design/overview.md": "# Overview\n",
  "docs/design/invariants.md": "# Invariants\n",
  "docs/design/runtime.md": "# Runtime Contract\n",
  "docs/e2e/journey.md": "# Journey\n",
};

export async function createFixture(state) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "anti-entropy-fixture-"));

  for (const [relativePath, contents] of Object.entries(BASE_FILES)) {
    await writeFile(root, relativePath, contents);
  }

  if (state === "implementation-ready") {
    await writeFile(
      root,
      "package.json",
      `${JSON.stringify({
        name: "fixture",
        private: true,
        type: "module",
      }, null, 2)}\n`,
    );
  }

  if (state === "bootstrap-write-authorized") {
    await writeFile(root, "docs/testing/test-environment.yaml", bootstrapEnvironmentYaml());
  }

  if (state === "implementation-ready") {
    await writeFile(root, "docs/testing/test-environment.yaml", implementationReadyEnvironmentYaml());
  }

  await writeManifest(root, state);
  return { root };
}

export async function removeFixture(root) {
  await fs.rm(root, { recursive: true, force: true });
}

export async function runCheckerDirect(root) {
  const { checkTheSourceOfTruth } = await import(pathToFileURL(CHECKER_PATH).href);
  return checkTheSourceOfTruth({
    projectName: "fixture",
    repoRoot: root,
    scope: ["demo"],
    risk: "medium",
    mode: "strict",
  });
}

export function runCheckerCli(root) {
  return spawnJson([
    "node",
    CHECKER_PATH,
    "--project",
    "fixture",
    "--repo-root",
    root,
    "--scope",
    "demo",
    "--risk",
    "medium",
    "--mode",
    "strict",
  ]);
}

export function assertCheckResult(result, expected) {
  assert.equal(result.check_result, expected);
  assert.ok(Array.isArray(result.blocking_issues));
  assert.ok(Array.isArray(result.warnings));
}

async function writeManifest(root, state) {
  const manifest = {
    schema_version: "2",
    project_name: "fixture",
    generated_at: "2026-03-25T00:00:00Z",
    truth_artifacts: [
      await buildArtifact(root, "overview", "Overview", "docs/design/overview.md", "system-overview"),
      await buildArtifact(root, "invariants", "Invariants", "docs/design/invariants.md", "invariant-spec"),
      await buildArtifact(root, "runtime", "Runtime", "docs/design/runtime.md", "interface-contract"),
      await buildArtifact(root, "journey", "Journey", "docs/e2e/journey.md", "e2e-spec"),
      await buildTestEnvironmentArtifact(root, state),
    ],
    coverage_requirements: [
      {
        id: "demo",
        scope: "demo",
        risk: "medium",
        required_artifact_types: [
          "system-overview",
          "invariant-spec",
          "interface-contract",
          "e2e-spec",
          "test-environment",
        ],
      },
    ],
    change_log: [],
  };

  await writeFile(root, ".anti-entropy/manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
}

async function buildArtifact(root, id, name, relativePath, type) {
  const fingerprint = await fingerprintFor(root, relativePath);
  return {
    id,
    name,
    path: relativePath,
    type,
    authority: "required",
    format: relativePath.endsWith(".yaml") ? "yaml" : "markdown",
    parser: relativePath.endsWith(".yaml") ? "yaml" : "markdown",
    scope_tags: ["demo"],
    coverage_ids: ["demo"],
    owner: "qa",
    last_reviewed_at: "2026-03-25T00:00:00Z",
    fingerprint,
  };
}

async function buildTestEnvironmentArtifact(root, state) {
  if (state === "missing-test-environment") {
    return {
      id: "env",
      name: "Env",
      path: "docs/testing/test-environment.yaml",
      type: "test-environment",
      authority: "required",
      format: "yaml",
      parser: "yaml",
      scope_tags: ["demo"],
      coverage_ids: ["demo"],
      owner: "qa",
      last_reviewed_at: "2026-03-25T00:00:00Z",
      fingerprint: {
        algorithm: "sha256",
        value: "missing-test-environment",
        size: 0,
      },
    };
  }

  return buildArtifact(root, "env", "Env", "docs/testing/test-environment.yaml", "test-environment");
}

async function fingerprintFor(root, relativePath) {
  const fullPath = path.join(root, relativePath);
  const contents = await fs.readFile(fullPath);
  return {
    algorithm: "sha256",
    value: crypto.createHash("sha256").update(contents).digest("hex"),
    size: contents.length,
  };
}

async function writeFile(root, relativePath, contents) {
  const fullPath = path.join(root, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, contents);
}

function bootstrapEnvironmentYaml() {
  return [
    "id: fixture-env",
    "owner: qa",
    "scope_tags:",
    "  - demo",
    "implementation_readiness: bootstrap-only",
    "blocking_issues:",
    "  - smoke and journey commands are planned but not executable yet",
    "bootstrap_write_authorized: true",
    "bootstrap_change_intent: create first runnable smoke and happy-path journey",
    "bootstrap_allowed_paths:",
    "  - cmd/",
    "  - internal/",
    "  - docs/testing/test-environment.yaml",
    "bootstrap_promotion_checks:",
    "  - smoke_test_command executes successfully",
    "  - targeted_test_patterns.demo executes successfully",
    "bootstrap_stop_conditions:",
    "  - scope expands beyond the first journey",
    "setup_commands:",
    "  - node --eval \"console.log('setup')\"",
    "health_checks:",
    "  - node --eval \"console.log('healthy')\"",
    "reset_commands: []",
    "smoke_test_command: node --eval \"console.log('smoke')\"",
    "targeted_test_patterns:",
    "  demo: node --eval \"console.log('journey')\"",
    "fixtures:",
    "  - synthetic input",
    "external_dependencies: []",
    "cleanup_commands: []",
    "",
  ].join("\n");
}

function implementationReadyEnvironmentYaml() {
  return [
    "id: fixture-env",
    "owner: qa",
    "scope_tags:",
    "  - demo",
    "implementation_readiness: implementation-ready",
    "setup_commands:",
    "  - node --eval \"console.log('setup')\"",
    "health_checks:",
    "  - node --eval \"console.log('healthy')\"",
    "reset_commands: []",
    "smoke_test_command: node --eval \"console.log('smoke')\"",
    "targeted_test_patterns:",
    "  demo: node --eval \"console.log('journey')\"",
    "fixtures:",
    "  - synthetic input",
    "external_dependencies: []",
    "cleanup_commands: []",
    "",
  ].join("\n");
}

function spawnJson(command) {
  const completed = spawnSync(command[0], command.slice(1), {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  assert.equal(completed.status, 0, completed.stderr || completed.stdout);
  return JSON.parse(completed.stdout.trim());
}
