import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

let cachedTruthManifestSchema;

export async function checkTheSourceOfTruth(projectName) {
  const resolvedProjectName =
    projectName?.trim() ||
    process.env.ANTI_ENTROPY_PROJECT_NAME?.trim() ||
    path.basename(process.cwd());

  const manifestFilePath = path.join(
    os.homedir(),
    ".anti-entropy",
    resolvedProjectName,
    "manifest.json",
  );

  try {
    await fs.access(manifestFilePath);
  } catch {
    return {
      check_result: `the ${resolvedProjectName} doesn't initliaze yet.`,
    };
  }

  const raw = await fs.readFile(manifestFilePath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (err) {
    const st = await safeStat(manifestFilePath);
    return {
      artifact_checks: [
        {
          path: "manifest.json",
          state: "modified",
          ...(st ? { last_modification_timestamp: st.mtime.toISOString() } : {}),
          reason: `manifest.json is not valid JSON: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ],
      summary: {
        total: 1,
        consistent: 0,
        modified: 1,
        missing: 0,
      },
      checked_at: new Date().toISOString(),
    };
  }

  const schema = await loadTruthManifestSchema();
  const errors = validateJsonAgainstSchema(manifest, schema, schema);
  if (errors.length > 0) {
    const st = await safeStat(manifestFilePath);
    return {
      artifact_checks: [
        {
          path: "manifest.json",
          state: "modified",
          ...(st ? { last_modification_timestamp: st.mtime.toISOString() } : {}),
          reason: `manifest.json doesn't satisfy truth-manifest-schema.json: ${stringifyForMessage(
            errors,
          )}`,
        },
      ],
      summary: {
        total: 1,
        consistent: 0,
        modified: 1,
        missing: 0,
      },
      checked_at: new Date().toISOString(),
    };
  }

  const repoRoot = process.cwd();
  const artifactChecks = await checkTruthArtifacts(manifest.truth_artifacts, repoRoot);
  const summary = summarizeArtifactChecks(artifactChecks);
  return {
    artifact_checks: artifactChecks,
    summary,
    checked_at: new Date().toISOString(),
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
    const expectedSize = artifact?.size;
    const fullPath = path.isAbsolute(artifactPath)
      ? artifactPath
      : path.join(repoRoot, artifactPath);

    const stat = await safeStat(fullPath);
    if (!stat) {
      checks.push({
        path: artifactPath,
        state: "missing",
        reason: "file not found",
      });
      continue;
    }

    const lastModificationTimestamp = stat.mtime.toISOString();
    if (!stat.isFile()) {
      checks.push({
        path: artifactPath,
        state: "modified",
        last_modification_timestamp: lastModificationTimestamp,
        reason: "path exists but is not a file",
      });
      continue;
    }
    if (!Number.isInteger(expectedSize) || expectedSize < 0) {
      checks.push({
        path: artifactPath,
        state: "modified",
        last_modification_timestamp: lastModificationTimestamp,
        reason: "manifest size is missing or invalid",
      });
      continue;
    }

    if (stat.size !== expectedSize) {
      checks.push({
        path: artifactPath,
        state: "modified",
        last_modification_timestamp: lastModificationTimestamp,
        reason: `size mismatch: expected ${expectedSize}, actual ${stat.size}`,
      });
      continue;
    }

    checks.push({
      path: artifactPath,
      state: "consistent",
      last_modification_timestamp: lastModificationTimestamp,
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

function summarizeArtifactChecks(artifactChecks) {
  let consistent = 0;
  let modified = 0;
  let missing = 0;
  for (const c of artifactChecks) {
    if (c.state === "consistent") consistent++;
    else if (c.state === "modified") modified++;
    else if (c.state === "missing") missing++;
  }
  return {
    total: artifactChecks.length,
    consistent,
    modified,
    missing,
  };
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

function parseProjectNameFromArgv(argv) {
  const args = argv.slice(2);
  if (args.length === 0) return undefined;

  const flagIndex = args.findIndex((v) => v === "--project" || v === "-p");
  if (flagIndex !== -1) return args[flagIndex + 1];

  if (args[0].startsWith("-")) return undefined;
  return args[0];
}

const projectNameFromArgv = parseProjectNameFromArgv(process.argv);
const result = await checkTheSourceOfTruth(projectNameFromArgv);
process.stdout.write(`${JSON.stringify(result)}\n`);
