import fs from "node:fs/promises";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cachedTruthManifestSchema;

const TEST_ENV_REQUIRED_FIELDS = [
  "id",
  "owner",
  "scope_tags",
  "implementation_readiness",
  "setup_commands",
  "health_checks",
  "reset_commands",
  "smoke_test_command",
  "targeted_test_patterns",
  "fixtures",
  "external_dependencies",
  "cleanup_commands",
];

const TEST_ENV_READINESS_VALUES = new Set([
  "implementation-ready",
  "bootstrap-only",
  "blocked",
]);

const TEST_ENV_LIST_FIELDS = new Set([
  "scope_tags",
  "setup_commands",
  "health_checks",
  "reset_commands",
  "fixtures",
  "external_dependencies",
  "cleanup_commands",
  "blocking_issues",
]);

const TEST_ENV_MAP_FIELDS = new Set([
  "targeted_test_patterns",
]);

const TOOLCHAIN_MARKER_FILES = [
  "go.mod",
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "Makefile",
  "Justfile",
  "Taskfile.yml",
  "Taskfile.yaml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "requirements.txt",
  "tox.ini",
  "Gemfile",
  "composer.json",
];

const TOOLCHAIN_SCAN_SKIP_DIRS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  ".venv",
  "venv",
  "vendor",
  ".anti-entropy",
]);

const PLACEHOLDER_COMMAND_PATTERNS = [
  /^(test|ls|find|rg|grep|sed|cat|head|tail|wc|stat|pwd)(\s|$)/,
  /^python(?:\d+(?:\.\d+)?)?\s+-m\s+json\.tool(\s|$)/,
  /^jq(\s|$)/,
  /^echo(\s|$)/,
  /^printf(\s|$)/,
  /^true$/,
  /^:\s*$/,
];

const BOOTSTRAP_SEARCH_PATHS = [
  "docs/design",
  "docs/e2e",
  "docs/testing",
  "docs/invariants",
  "openapi",
  "proto",
  "specs",
  "api",
  "contracts",
];

const BOOTSTRAP_ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".markdown",
  ".yaml",
  ".yml",
  ".json",
  ".proto",
  ".feature",
]);

export async function checkTheSourceOfTruth(options = {}) {
  const normalizedOptions = normalizeOptions(options);
  const resolvedProjectName =
    normalizedOptions.projectName ||
    process.env.ANTI_ENTROPY_PROJECT_NAME?.trim() ||
    path.basename(normalizedOptions.repoRoot);
  const repoRoot = normalizedOptions.repoRoot;
  const checkedAt = new Date().toISOString();

  const repoManifestPath = path.join(repoRoot, ".anti-entropy", "manifest.json");
  const homeManifestPath = path.join(
    os.homedir(),
    ".anti-entropy",
    resolvedProjectName,
    "manifest.json",
  );
  const manifestCandidates = [repoManifestPath, homeManifestPath];
  let manifestFilePath = repoManifestPath;
  let hasAccessibleManifest = false;

  for (const candidate of manifestCandidates) {
    try {
      await fs.access(candidate);
      manifestFilePath = candidate;
      hasAccessibleManifest = true;
      break;
    } catch {
    }
  }

  const baseReport = {
    project_name: resolvedProjectName,
    repo_root: repoRoot,
    manifest_path: manifestFilePath,
    scope: normalizedOptions.scope,
    risk: normalizedOptions.risk,
    mode: normalizedOptions.mode,
    check_result: "proceed",
    artifact_checks: [],
    coverage_checks: [],
    summary: {
      total_artifacts: 0,
      consistent_artifacts: 0,
      modified_artifacts: 0,
      missing_artifacts: 0,
      coverage_pass: 0,
      coverage_warning: 0,
      coverage_fail: 0,
    },
    blocking_issues: [],
    warnings: [],
    checked_at: checkedAt,
  };

  if (!hasAccessibleManifest) {
    if (normalizedOptions.skipBootstrap) {
      return {
        ...baseReport,
        check_result: "bootstrap_required",
        blocking_issues: [
          `Truth manifest not found. Checked: ${manifestCandidates.join(", ")}.`,
        ],
      };
    }

    const bootstrap = await bootstrapManifestFromRepository({
      projectName: resolvedProjectName,
      repoRoot,
      checkedAt,
      scope: normalizedOptions.scope,
      risk: normalizedOptions.risk,
      manifestPath: repoManifestPath,
    });

    if (!bootstrap.created_manifest) {
      return {
        ...baseReport,
        check_result: "bootstrap_required",
        blocking_issues: [
          `Truth manifest not found. Checked: ${manifestCandidates.join(", ")}.`,
          ...bootstrap.blocking_issues,
        ],
        warnings: bootstrap.warnings,
        bootstrap,
      };
    }

    const rerunReport = await checkTheSourceOfTruth({
      ...normalizedOptions,
      skipBootstrap: true,
    });

    return {
      ...rerunReport,
      bootstrap,
      warnings: dedupeStrings([
        `Initialized repo-local truth manifest at ${toPosixPath(path.relative(repoRoot, repoManifestPath))} from repository docs-first discovery.`,
        ...bootstrap.warnings,
        ...rerunReport.warnings,
      ]),
    };
  }

  const raw = await fs.readFile(manifestFilePath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    const st = await safeStat(manifestFilePath);
    return {
      ...baseReport,
      check_result: "refuse_implementation",
      artifact_checks: [
        {
          artifact_id: "manifest.json",
          name: "manifest.json",
          path: "manifest.json",
          type: "manifest",
          authority: "required",
          scope_tags: [],
          coverage_ids: [],
          state: "modified",
          expected_fingerprint: undefined,
          actual_fingerprint: undefined,
          ...(st ? { last_modification_timestamp: st.mtime.toISOString() } : {}),
          reasons: [`manifest.json is not valid JSON: ${
            err instanceof Error ? err.message : String(err)
          }`],
        },
      ],
      summary: {
        ...baseReport.summary,
        total_artifacts: 1,
        modified_artifacts: 1,
      },
      blocking_issues: ["Truth manifest is unreadable and cannot be trusted."],
    };
  }

  const schema = await loadTruthManifestSchema();
  const errors = validateJsonAgainstSchema(manifest, schema, schema);
  if (errors.length > 0) {
    const st = await safeStat(manifestFilePath);
    return {
      ...baseReport,
      check_result: "refuse_implementation",
      artifact_checks: [
        {
          artifact_id: "manifest.json",
          name: "manifest.json",
          path: "manifest.json",
          type: "manifest",
          authority: "required",
          scope_tags: [],
          coverage_ids: [],
          state: "modified",
          expected_fingerprint: undefined,
          actual_fingerprint: undefined,
          ...(st ? { last_modification_timestamp: st.mtime.toISOString() } : {}),
          reasons: [`manifest.json does not satisfy truth-manifest-schema.json: ${stringifyForMessage(
            errors,
          )}`],
        },
      ],
      summary: {
        ...baseReport.summary,
        total_artifacts: 1,
        modified_artifacts: 1,
      },
      blocking_issues: ["Truth manifest is invalid and minimum truth coverage cannot be evaluated."],
    };
  }

  const artifactChecks = await checkTruthArtifacts(manifest.truth_artifacts, repoRoot);
  const coverageChecks = checkCoverageRequirements(
    manifest.coverage_requirements,
    manifest.truth_artifacts,
    artifactChecks,
    normalizedOptions.scope,
  );
  const testEnvironmentAssessment = await assessTestEnvironmentReadiness(
    manifest.truth_artifacts,
    artifactChecks,
    repoRoot,
    normalizedOptions.scope,
  );
  const summary = summarizeChecks(artifactChecks, coverageChecks);
  const { blockingIssues, warnings } = deriveIssues(
    artifactChecks,
    coverageChecks,
    normalizedOptions.mode,
  );
  blockingIssues.push(...testEnvironmentAssessment.blockingIssues);
  warnings.push(...testEnvironmentAssessment.warnings);

  if (manifest.project_name !== resolvedProjectName) {
    warnings.push(
      `Manifest project_name=${manifest.project_name} does not match resolved project name ${resolvedProjectName}.`,
    );
  }
  const checkResult = deriveCheckResult(
    summary,
    blockingIssues,
    warnings,
  );

  return {
    ...baseReport,
    check_result: checkResult,
    artifact_checks: artifactChecks,
    coverage_checks: coverageChecks,
    summary,
    blocking_issues: blockingIssues,
    warnings,
  };
}

async function loadTruthManifestSchema() {
  if (cachedTruthManifestSchema) return cachedTruthManifestSchema;
  const schemaPath = fileURLToPath(
    new URL("./truth-manifest-schema.json", import.meta.url),
  );
  const raw = await fs.readFile(schemaPath, "utf8");
  cachedTruthManifestSchema = JSON.parse(raw);
  return cachedTruthManifestSchema;
}

async function checkTruthArtifacts(truthArtifacts, repoRoot) {
  const checks = [];
  for (const artifact of truthArtifacts) {
    const artifactPath = String(artifact?.path ?? "");
    const fingerprint = artifact?.fingerprint ?? {};
    const expectedAlgorithm = fingerprint?.algorithm;
    const expectedSize = fingerprint?.size;
    const expectedHash = fingerprint?.value;
    const fullPath = path.isAbsolute(artifactPath)
      ? artifactPath
      : path.join(repoRoot, artifactPath);

    const stat = await safeStat(fullPath);
    if (!stat) {
      checks.push({
        artifact_id: String(artifact?.id ?? artifactPath),
        name: String(artifact?.name ?? artifactPath),
        path: artifactPath,
        type: String(artifact?.type ?? "unknown"),
        authority: String(artifact?.authority ?? "informative"),
        scope_tags: toStringArray(artifact?.scope_tags),
        coverage_ids: toStringArray(artifact?.coverage_ids),
        state: "missing",
        expected_fingerprint: expectedHash,
        actual_fingerprint: undefined,
        reasons: ["file not found"],
      });
      continue;
    }

    const lastModificationTimestamp = stat.mtime.toISOString();
    if (!stat.isFile()) {
      checks.push({
        artifact_id: String(artifact?.id ?? artifactPath),
        name: String(artifact?.name ?? artifactPath),
        path: artifactPath,
        type: String(artifact?.type ?? "unknown"),
        authority: String(artifact?.authority ?? "informative"),
        scope_tags: toStringArray(artifact?.scope_tags),
        coverage_ids: toStringArray(artifact?.coverage_ids),
        state: "modified",
        expected_fingerprint: expectedHash,
        actual_fingerprint: undefined,
        last_modification_timestamp: lastModificationTimestamp,
        reasons: ["path exists but is not a file"],
      });
      continue;
    }
    if (expectedAlgorithm !== "sha256" || !Number.isInteger(expectedSize) || expectedSize < 0 || !expectedHash) {
      checks.push({
        artifact_id: String(artifact?.id ?? artifactPath),
        name: String(artifact?.name ?? artifactPath),
        path: artifactPath,
        type: String(artifact?.type ?? "unknown"),
        authority: String(artifact?.authority ?? "informative"),
        scope_tags: toStringArray(artifact?.scope_tags),
        coverage_ids: toStringArray(artifact?.coverage_ids),
        state: "modified",
        expected_fingerprint: expectedHash,
        actual_fingerprint: undefined,
        last_modification_timestamp: lastModificationTimestamp,
        reasons: ["manifest fingerprint is missing or invalid"],
      });
      continue;
    }

    const actualHash = await hashFile(fullPath, expectedAlgorithm);
    const reasons = [];
    if (stat.size !== expectedSize) {
      reasons.push(`size mismatch: expected ${expectedSize}, actual ${stat.size}`);
    }
    if (actualHash !== expectedHash) {
      reasons.push(`fingerprint mismatch: expected ${expectedHash}, actual ${actualHash}`);
    }

    checks.push({
      artifact_id: String(artifact?.id ?? artifactPath),
      name: String(artifact?.name ?? artifactPath),
      path: artifactPath,
      type: String(artifact?.type ?? "unknown"),
      authority: String(artifact?.authority ?? "informative"),
      scope_tags: toStringArray(artifact?.scope_tags),
      coverage_ids: toStringArray(artifact?.coverage_ids),
      state: reasons.length === 0 ? "consistent" : "modified",
      expected_fingerprint: expectedHash,
      actual_fingerprint: actualHash,
      last_modification_timestamp: lastModificationTimestamp,
      reasons,
    });
  }
  return checks;
}

async function safeStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch {
    return undefined;
  }
}

async function assessTestEnvironmentReadiness(
  truthArtifacts,
  artifactChecks,
  repoRoot,
  scopeFilter,
) {
  const blockingIssues = [];
  const warnings = [];
  const requestedScopes = new Set(scopeFilter);
  const checksByArtifactId = new Map(artifactChecks.map((check) => [check.artifact_id, check]));
  const toolchainEvidence = await findToolchainMarkers(repoRoot);

  for (const artifact of truthArtifacts) {
    if (artifact?.type !== "test-environment") continue;

    const scopeTags = toStringArray(artifact.scope_tags);
    const coverageIds = toStringArray(artifact.coverage_ids);
    const isRelevant = requestedScopes.size === 0
      || scopeTags.some((scope) => requestedScopes.has(scope))
      || coverageIds.some((scope) => requestedScopes.has(scope));
    if (!isRelevant) continue;

    const artifactId = String(artifact?.id ?? artifact?.path ?? "");
    const check = checksByArtifactId.get(artifactId);
    if (check?.state !== "consistent") continue;

    const artifactPath = String(artifact?.path ?? "");
    const fullPath = path.isAbsolute(artifactPath)
      ? artifactPath
      : path.join(repoRoot, artifactPath);

    const raw = await fs.readFile(fullPath, "utf8");
    const parsed = parseYamlishTestEnvironment(raw);
    const missingFields = TEST_ENV_REQUIRED_FIELDS.filter((field) => !parsed.topLevelKeys.has(field));
    if (missingFields.length > 0) {
      blockingIssues.push(
        `Test environment ${artifactPath} is missing required fields: ${missingFields.join(", ")}.`,
      );
      continue;
    }

    const readiness = parsed.scalarFields.get("implementation_readiness");
    if (!TEST_ENV_READINESS_VALUES.has(readiness)) {
      blockingIssues.push(
        `Test environment ${artifactPath} has invalid implementation_readiness=${stringifyForMessage(readiness)}.`,
      );
      continue;
    }

    const blockingEntries = parsed.listFields.get("blocking_issues") ?? [];
    if (readiness !== "implementation-ready") {
      blockingIssues.push(
        `Test environment ${artifactPath} is marked ${readiness} and does not authorize implementation for this scope.`,
      );
      if (blockingEntries.length === 0) {
        warnings.push(
          `Test environment ${artifactPath} should list blocking_issues when implementation_readiness=${readiness}.`,
        );
      }
      continue;
    }

    const setupCommands = parsed.listFields.get("setup_commands") ?? [];
    const smokeCommand = parsed.scalarFields.get("smoke_test_command") ?? "";
    const targetedCommands = (parsed.mapFields.get("targeted_test_patterns") ?? [])
      .map(([, command]) => command);
    const implementationCommands = [
      ...setupCommands,
      smokeCommand,
      ...targetedCommands,
    ].filter((command) => command.length > 0);

    if (implementationCommands.length === 0) {
      blockingIssues.push(
        `Test environment ${artifactPath} does not define executable setup, smoke, or targeted commands for implementation work.`,
      );
      continue;
    }

    if (implementationCommands.every((command) => isPlaceholderValidationCommand(command))) {
      blockingIssues.push(
        `Test environment ${artifactPath} only contains placeholder or document-structure checks and is not implementation-ready.`,
      );
      continue;
    }

    if (isPlaceholderValidationCommand(smokeCommand)) {
      blockingIssues.push(
        `Test environment ${artifactPath} has a placeholder smoke_test_command and cannot justify Step 2 implementation.`,
      );
    }

    if (targetedCommands.length === 0 || targetedCommands.every((command) => isPlaceholderValidationCommand(command))) {
      blockingIssues.push(
        `Test environment ${artifactPath} lacks a real targeted test command for the selected scope.`,
      );
    }

    if (toolchainEvidence.length === 0) {
      blockingIssues.push(
        `Test environment ${artifactPath} claims implementation-ready, but no common build or runtime manifest was found under ${repoRoot}.`,
      );
    }
  }

  return { blockingIssues, warnings };
}

function parseYamlishTestEnvironment(raw) {
  const topLevelKeys = new Set();
  const scalarFields = new Map();
  const listFields = new Map();
  const mapFields = new Map();
  const lines = String(raw ?? "").split(/\r?\n/);
  let currentSection;
  let currentSectionKind;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) continue;

    const topLevelMatch = line.match(/^([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (topLevelMatch) {
      const key = topLevelMatch[1];
      const remainder = normalizeYamlScalar(topLevelMatch[2] ?? "");
      topLevelKeys.add(key);
      currentSection = undefined;
      currentSectionKind = undefined;

      if (TEST_ENV_LIST_FIELDS.has(key)) {
        listFields.set(key, []);
        currentSection = key;
        currentSectionKind = "list";
      } else if (TEST_ENV_MAP_FIELDS.has(key)) {
        mapFields.set(key, []);
        currentSection = key;
        currentSectionKind = "map";
      } else if (remainder.length > 0) {
        scalarFields.set(key, remainder);
      } else {
        scalarFields.set(key, "");
      }
      continue;
    }

    if (currentSectionKind === "list") {
      const listMatch = line.match(/^\s*-\s+(.*)$/);
      if (listMatch) {
        listFields.get(currentSection)?.push(normalizeYamlScalar(listMatch[1]));
      }
      continue;
    }

    if (currentSectionKind === "map") {
      const mapMatch = line.match(/^\s*([^:#][^:]*)\s*:\s*(.*)$/);
      if (mapMatch) {
        mapFields.get(currentSection)?.push([
          mapMatch[1].trim(),
          normalizeYamlScalar(mapMatch[2]),
        ]);
      }
    }
  }

  return {
    topLevelKeys,
    scalarFields,
    listFields,
    mapFields,
  };
}

function normalizeYamlScalar(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

async function findToolchainMarkers(repoRoot, maxDepth = 4) {
  const matches = [];
  await walkForToolchainMarkers(repoRoot, 0, maxDepth, matches);
  return matches;
}

async function walkForToolchainMarkers(currentPath, depth, maxDepth, matches) {
  if (depth > maxDepth) return;

  let entries;
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (TOOLCHAIN_SCAN_SKIP_DIRS.has(entry.name)) continue;
      await walkForToolchainMarkers(
        path.join(currentPath, entry.name),
        depth + 1,
        maxDepth,
        matches,
      );
      continue;
    }

    if (TOOLCHAIN_MARKER_FILES.includes(entry.name)) {
      matches.push(path.join(currentPath, entry.name));
    }
  }
}

function isPlaceholderValidationCommand(command) {
  const normalized = normalizeYamlScalar(command);
  if (!normalized) return true;
  if (/^https?:\/\//.test(normalized)) return false;
  return PLACEHOLDER_COMMAND_PATTERNS.some((pattern) => pattern.test(normalized));
}

function checkCoverageRequirements(
  coverageRequirements,
  truthArtifacts,
  artifactChecks,
  scopeFilter,
) {
  const requestedScopes = new Set(scopeFilter);
  const checksByArtifactId = new Map(artifactChecks.map((check) => [check.artifact_id, check]));
  const results = [];

  for (const requirement of coverageRequirements) {
    if (requestedScopes.size > 0 && !requestedScopes.has(requirement.scope)) continue;

    const relatedArtifacts = truthArtifacts.filter((artifact) => {
      const coverageIds = toStringArray(artifact.coverage_ids);
      const scopeTags = toStringArray(artifact.scope_tags);
      return coverageIds.includes(requirement.id) || scopeTags.includes(requirement.scope);
    });

    const missingArtifactTypes = [];
    const reasons = [];

    for (const requiredType of requirement.required_artifact_types) {
      const candidates = relatedArtifacts.filter((artifact) => artifact.type === requiredType);
      if (candidates.length === 0) {
        missingArtifactTypes.push(requiredType);
        reasons.push(`missing artifact declaration for required type ${requiredType}`);
        continue;
      }

      const hasConsistentCandidate = candidates.some((artifact) => {
        const check = checksByArtifactId.get(String(artifact.id ?? artifact.path));
        return check?.state === "consistent";
      });
      if (!hasConsistentCandidate) {
        missingArtifactTypes.push(requiredType);
        reasons.push(`required type ${requiredType} has no consistent artifact`);
      }
    }

    results.push({
      coverage_id: String(requirement.id),
      scope: String(requirement.scope),
      risk: String(requirement.risk),
      state: missingArtifactTypes.length === 0 ? "pass" : "fail",
      required_artifact_types: toStringArray(requirement.required_artifact_types),
      missing_artifact_types: missingArtifactTypes,
      reasons,
    });
  }

  return results;
}

function summarizeChecks(artifactChecks, coverageChecks) {
  let consistent = 0;
  let modified = 0;
  let missing = 0;
  let coveragePass = 0;
  let coverageWarning = 0;
  let coverageFail = 0;

  for (const c of artifactChecks) {
    if (c.state === "consistent") consistent++;
    else if (c.state === "modified") modified++;
    else if (c.state === "missing") missing++;
  }
  for (const c of coverageChecks) {
    if (c.state === "pass") coveragePass++;
    else if (c.state === "warning") coverageWarning++;
    else if (c.state === "fail") coverageFail++;
  }

  return {
    total_artifacts: artifactChecks.length,
    consistent_artifacts: consistent,
    modified_artifacts: modified,
    missing_artifacts: missing,
    coverage_pass: coveragePass,
    coverage_warning: coverageWarning,
    coverage_fail: coverageFail,
  };
}

function deriveIssues(artifactChecks, coverageChecks, mode) {
  const blockingIssues = [];
  const warnings = [];

  for (const check of artifactChecks) {
    if (check.state === "consistent") continue;
    const target = `${check.path} (${check.type})`;
    if (check.authority === "required") {
      blockingIssues.push(`Required truth artifact is ${check.state}: ${target}. ${check.reasons.join("; ")}`);
    } else if (check.authority === "recommended") {
      warnings.push(`Recommended truth artifact is ${check.state}: ${target}. ${check.reasons.join("; ")}`);
    } else {
      warnings.push(`Informative artifact is ${check.state}: ${target}. ${check.reasons.join("; ")}`);
    }
  }

  for (const coverageCheck of coverageChecks) {
    if (coverageCheck.state === "fail") {
      blockingIssues.push(
        `Coverage requirement ${coverageCheck.coverage_id} for scope ${coverageCheck.scope} is incomplete: ${coverageCheck.reasons.join("; ")}`,
      );
    } else if (coverageCheck.state === "warning") {
      warnings.push(
        `Coverage requirement ${coverageCheck.coverage_id} for scope ${coverageCheck.scope} has warnings: ${coverageCheck.reasons.join("; ")}`,
      );
    }
  }

  if (mode === "high-risk" && blockingIssues.length === 0) {
    warnings.push("High-risk mode should include semantic consistency review for the selected scope.");
  }

  return { blockingIssues, warnings };
}

function deriveCheckResult(summary, blockingIssues, warnings) {
  if (summary.total_artifacts === 0 && blockingIssues.length > 0) {
    return "bootstrap_required";
  }
  if (blockingIssues.length > 0) {
    return "blocked_pending_resolution";
  }
  if (warnings.length > 0) {
    return "proceed_with_warnings";
  }
  return "proceed";
}

async function bootstrapManifestFromRepository({
  projectName,
  repoRoot,
  checkedAt,
  scope,
  risk,
  manifestPath,
}) {
  const existingSearchPaths = [];
  const discoveredFiles = [];

  for (const relativeSearchPath of BOOTSTRAP_SEARCH_PATHS) {
    const absoluteSearchPath = path.join(repoRoot, relativeSearchPath);
    const stat = await safeStat(absoluteSearchPath);
    if (!stat) continue;

    existingSearchPaths.push(relativeSearchPath);
    if (stat.isFile()) {
      if (isBootstrapCandidateFile(absoluteSearchPath)) {
        discoveredFiles.push(absoluteSearchPath);
      }
      continue;
    }

    if (stat.isDirectory()) {
      discoveredFiles.push(...(await collectBootstrapFiles(absoluteSearchPath)));
    }
  }

  const coverageScope = scope.length > 0 ? scope[0] : "global";
  const coverageId = `${slugifyIdentifier(coverageScope)}-core`;
  const scopeTags = scope.length > 0 ? scope : [coverageScope];
  const truthArtifacts = [];

  for (const filePath of discoveredFiles.sort()) {
    const relativePath = toPosixPath(path.relative(repoRoot, filePath));
    const classification = classifyBootstrapArtifact(relativePath);
    if (!classification) continue;
    truthArtifacts.push(await buildBootstrapArtifact({
      filePath,
      relativePath,
      checkedAt,
      scopeTags,
      coverageId,
      classification,
    }));
  }

  const selectedArtifacts = dedupeArtifactsByPath(truthArtifacts);
  const preferredContractType = pickPreferredContractType(selectedArtifacts);
  const requiredArtifactTypes = [
    "system-overview",
    "invariant-spec",
    preferredContractType,
    "e2e-spec",
    "test-environment",
  ];
  const selectedTypes = new Set(selectedArtifacts.map((artifact) => artifact.type));
  const missingRequiredTypes = requiredArtifactTypes.filter((type) => !selectedTypes.has(type));

  if (selectedArtifacts.length === 0) {
    return {
      created_manifest: false,
      manifest_path: manifestPath,
      search_paths: existingSearchPaths.map(toPosixPath),
      selected_artifacts: [],
      missing_required_types: requiredArtifactTypes,
      blocking_issues: [
        "Docs-first discovery found no authoritative truth-artifact candidates in common repository locations.",
      ],
      warnings: [],
    };
  }

  const manifest = {
    schema_version: "2",
    project_name: projectName,
    generated_at: checkedAt,
    truth_artifacts: selectedArtifacts,
    coverage_requirements: [
      {
        id: coverageId,
        scope: coverageScope,
        risk,
        required_artifact_types: requiredArtifactTypes,
        notes: "Bootstrapped from docs-first repository discovery. Missing required types still block implementation.",
      },
    ],
    change_log: [
      {
        timestamp: checkedAt,
        changes: [
          {
            change_kind: "file-added",
            path: ".anti-entropy/manifest.json",
            from: "-",
            to: "docs-first-bootstrap",
          },
        ],
      },
    ],
  };

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    created_manifest: true,
    manifest_path: manifestPath,
    search_paths: existingSearchPaths.map(toPosixPath),
    selected_artifacts: selectedArtifacts.map((artifact) => artifact.path),
    missing_required_types: missingRequiredTypes,
    blocking_issues: [],
    warnings: missingRequiredTypes.length === 0
      ? []
      : [
        `Bootstrap manifest created from repository docs, but required artifact types are still missing: ${missingRequiredTypes.join(", ")}.`,
      ],
  };
}

async function collectBootstrapFiles(rootPath) {
  const pending = [rootPath];
  const files = [];

  while (pending.length > 0) {
    const currentPath = pending.pop();
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (TOOLCHAIN_SCAN_SKIP_DIRS.has(entry.name)) continue;
        pending.push(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isBootstrapCandidateFile(entryPath)) continue;
      files.push(entryPath);
    }
  }

  return files;
}

function isBootstrapCandidateFile(filePath) {
  return BOOTSTRAP_ALLOWED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function classifyBootstrapArtifact(relativePath) {
  const normalizedPath = toPosixPath(relativePath).toLowerCase();
  const fileName = path.posix.basename(normalizedPath);

  if (normalizedPath.startsWith("docs/testing/") || fileName.includes("test-environment")) {
    return { type: "test-environment", authority: "required" };
  }

  if (
    normalizedPath.startsWith("docs/e2e/")
    || normalizedPath.includes("/e2e/")
    || normalizedPath.endsWith(".feature")
    || fileName.includes("e2e")
  ) {
    return { type: "e2e-spec", authority: "required" };
  }

  if (normalizedPath.startsWith("docs/invariants/") || fileName.includes("invariant")) {
    return { type: "invariant-spec", authority: "required" };
  }

  if (
    normalizedPath.startsWith("openapi/")
    || normalizedPath.includes("/openapi/")
    || normalizedPath.startsWith("api/")
  ) {
    return { type: "api-contract", authority: "required" };
  }

  if (normalizedPath.startsWith("proto/") || normalizedPath.endsWith(".proto")) {
    return { type: "interface-contract", authority: "required" };
  }

  if (
    normalizedPath.includes("/contracts/")
    || fileName.includes("contract")
    || fileName.includes("interface")
  ) {
    return { type: "interface-contract", authority: "required" };
  }

  if (
    normalizedPath.startsWith("docs/design/")
    && (
      fileName === "readme.md"
      || fileName.includes("overview")
      || fileName.includes("architecture")
      || fileName.includes("system")
    )
  ) {
    return { type: "system-overview", authority: "required" };
  }

  if (fileName.includes("boundary")) {
    return { type: "architecture-boundary", authority: "recommended" };
  }

  if (fileName.includes("state-machine") || fileName.includes("state")) {
    return { type: "state-machine", authority: "recommended" };
  }

  if (fileName.includes("lifecycle")) {
    return { type: "lifecycle-spec", authority: "recommended" };
  }

  if (fileName.includes("risk")) {
    return { type: "risk-zone", authority: "recommended" };
  }

  return undefined;
}

async function buildBootstrapArtifact({
  filePath,
  relativePath,
  checkedAt,
  scopeTags,
  coverageId,
  classification,
}) {
  const stat = await fs.stat(filePath);
  const { format, parser } = inferArtifactFormatAndParser(relativePath, classification.type);
  return {
    id: buildArtifactId(relativePath, classification.type),
    name: buildArtifactName(relativePath, classification.type),
    path: relativePath,
    type: classification.type,
    authority: classification.authority,
    format,
    parser,
    scope_tags: scopeTags,
    coverage_ids: [coverageId],
    owner: "unassigned",
    last_reviewed_at: checkedAt,
    fingerprint: {
      algorithm: "sha256",
      value: await hashFile(filePath, "sha256"),
      size: stat.size,
    },
  };
}

function inferArtifactFormatAndParser(relativePath, artifactType) {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".md" || extension === ".markdown") {
    return { format: "markdown", parser: "markdown" };
  }
  if (extension === ".yaml" || extension === ".yml") {
    if (artifactType === "api-contract") {
      return { format: "openapi", parser: "openapi" };
    }
    return { format: "yaml", parser: "yaml" };
  }
  if (extension === ".json") {
    if (artifactType === "api-contract") {
      return { format: "openapi", parser: "openapi" };
    }
    return { format: "json", parser: "json" };
  }
  if (extension === ".proto") {
    return { format: "protobuf", parser: "none" };
  }
  if (extension === ".feature") {
    return { format: "executable-test", parser: "cucumber" };
  }
  return { format: "other", parser: "plain-text" };
}

function buildArtifactId(relativePath, artifactType) {
  return `${artifactType}-${slugifyIdentifier(relativePath)}`;
}

function buildArtifactName(relativePath, artifactType) {
  const baseName = path.basename(relativePath, path.extname(relativePath))
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return baseName || artifactType;
}

function pickPreferredContractType(truthArtifacts) {
  if (truthArtifacts.some((artifact) => artifact.type === "api-contract")) {
    return "api-contract";
  }
  return "interface-contract";
}

function dedupeArtifactsByPath(artifacts) {
  const deduped = new Map();
  for (const artifact of artifacts) {
    if (!deduped.has(artifact.path)) {
      deduped.set(artifact.path, artifact);
    }
  }
  return Array.from(deduped.values());
}

function dedupeStrings(values) {
  const seen = new Set();
  const deduped = [];
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function slugifyIdentifier(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "artifact";
}

function toPosixPath(value) {
  return String(value ?? "").split(path.sep).join(path.posix.sep);
}

async function hashFile(filePath, algorithm) {
  const hash = crypto.createHash(algorithm);
  const buf = await fs.readFile(filePath);
  hash.update(buf);
  return hash.digest("hex");
}

function toStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item == null ? "" : String(item)))
    .filter((item) => item.length > 0);
}

function validateJsonAgainstSchema(value, schema, rootSchema, instancePath = "") {
  if (!schema || typeof schema !== "object") {
    return [
      {
        path: instancePath || "/",
        message: "schema is not an object",
      },
    ];
  }

  if (typeof schema.$ref === "string") {
    const resolved = resolveJsonPointer(rootSchema, schema.$ref);
    if (!resolved) {
      return [
        {
          path: instancePath || "/",
          message: `unresolved $ref: ${schema.$ref}`,
        },
      ];
    }
    return validateJsonAgainstSchema(value, resolved, rootSchema, instancePath);
  }

  let errors = [];

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf) {
      errors = errors.concat(
        validateJsonAgainstSchema(value, sub, rootSchema, instancePath),
      );
    }
  }

  if (schema.if && schema.then) {
    const ifErrors = validateJsonAgainstSchema(
      value,
      schema.if,
      rootSchema,
      instancePath,
    );
    if (ifErrors.length === 0) {
      errors = errors.concat(
        validateJsonAgainstSchema(value, schema.then, rootSchema, instancePath),
      );
    }
  }

  if (schema.const !== undefined) {
    if (value !== schema.const) {
      errors.push({
        path: instancePath || "/",
        message: `expected const ${stringifyForMessage(schema.const)}`,
      });
    }
  }

  if (Array.isArray(schema.enum)) {
    if (!schema.enum.some((v) => v === value)) {
      errors.push({
        path: instancePath || "/",
        message: `expected one of ${stringifyForMessage(schema.enum)}`,
      });
    }
  }

  if (schema.type) {
    if (!isJsonType(value, schema.type)) {
      errors.push({
        path: instancePath || "/",
        message: `expected type ${stringifyForMessage(schema.type)}`,
      });
      return errors;
    }
  }

  if (schema.type === "string") {
    if (typeof schema.minLength === "number" && value.length < schema.minLength) {
      errors.push({
        path: instancePath || "/",
        message: `expected minLength ${schema.minLength}`,
      });
    }
    if (schema.format === "date-time" && !isDateTimeString(value)) {
      errors.push({
        path: instancePath || "/",
        message: "expected date-time format",
      });
    }
  }

  if (schema.type === "integer") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      errors.push({
        path: instancePath || "/",
        message: `expected minimum ${schema.minimum}`,
      });
    }
  }

  if (schema.type === "array") {
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        errors = errors.concat(
          validateJsonAgainstSchema(
            value[i],
            schema.items,
            rootSchema,
            `${instancePath}/${i}`,
          ),
        );
      }
    }
  }

  if (schema.type === "object") {
    const props = schema.properties && typeof schema.properties === "object"
      ? schema.properties
      : {};

    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          errors.push({
            path: instancePath || "/",
            message: `missing required property ${stringifyForMessage(key)}`,
          });
        }
      }
    }

    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) {
          errors.push({
            path: instancePath || "/",
            message: `unexpected property ${stringifyForMessage(key)}`,
          });
        }
      }
    }

    for (const [key, propSchema] of Object.entries(props)) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
      errors = errors.concat(
        validateJsonAgainstSchema(
          value[key],
          propSchema,
          rootSchema,
          `${instancePath}/${escapeJsonPointerToken(key)}`,
        ),
      );
    }
  }

  return errors;
}

function resolveJsonPointer(rootSchema, ref) {
  if (ref === "#") return rootSchema;
  if (!ref.startsWith("#/")) return undefined;
  const tokens = ref
    .slice(2)
    .split("/")
    .map((t) => unescapeJsonPointerToken(t));
  let cur = rootSchema;
  for (const token of tokens) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = cur[token];
  }
  return cur;
}

function isJsonType(value, type) {
  if (Array.isArray(type)) return type.some((t) => isJsonType(value, t));
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "boolean") return typeof value === "boolean";
  if (type === "null") return value === null;
  return false;
}

function isDateTimeString(value) {
  if (typeof value !== "string") return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function escapeJsonPointerToken(token) {
  return token.replaceAll("~", "~0").replaceAll("/", "~1");
}

function unescapeJsonPointerToken(token) {
  return token.replaceAll("~1", "/").replaceAll("~0", "~");
}

function stringifyForMessage(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function parseArgsFromArgv(argv) {
  const args = argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--project" || arg === "-p") {
      options.projectName = args[i + 1];
      i++;
    } else if (arg === "--repo-root" || arg === "-r") {
      options.repoRoot = args[i + 1];
      i++;
    } else if (arg === "--scope" || arg === "-s") {
      options.scope = (args[i + 1] ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      i++;
    } else if (arg === "--risk") {
      options.risk = args[i + 1];
      i++;
    } else if (arg === "--mode") {
      options.mode = args[i + 1];
      i++;
    } else if (!arg.startsWith("-") && !options.projectName) {
      options.projectName = arg;
    }
  }

  return options;
}

function normalizeOptions(options) {
  const repoRoot = options.repoRoot
    ? path.resolve(options.repoRoot)
    : process.cwd();
  return {
    projectName: options.projectName?.trim() || undefined,
    repoRoot,
    scope: Array.isArray(options.scope) ? options.scope : [],
    risk: normalizeEnum(options.risk, ["low", "medium", "high"], "medium"),
    mode: normalizeEnum(options.mode, ["lite", "strict", "high-risk"], "strict"),
    skipBootstrap: options.skipBootstrap === true,
  };
}

function normalizeEnum(value, allowedValues, fallback) {
  const normalized = String(value ?? "").trim();
  return allowedValues.includes(normalized) ? normalized : fallback;
}

const argsFromArgv = parseArgsFromArgv(process.argv);
const result = await checkTheSourceOfTruth(argsFromArgv);
process.stdout.write(`${JSON.stringify(result)}\n`);
