#!/usr/bin/env python3

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional


ALLOWED_ARTIFACT_TYPES = {
    "system-overview",
    "invariant-spec",
    "api-contract",
    "interface-contract",
    "e2e-spec",
    "test-environment",
    "architecture-boundary",
    "state-machine",
    "lifecycle-spec",
    "risk-zone",
    "supplemental",
}

ALLOWED_AUTHORITIES = {"required", "recommended", "informative"}
ALLOWED_FORMATS = {
    "markdown",
    "yaml",
    "json",
    "openapi",
    "json-schema",
    "protobuf",
    "executable-test",
    "other",
}
ALLOWED_PARSERS = {
    "markdown",
    "yaml",
    "json",
    "openapi",
    "json-schema",
    "playwright",
    "cucumber",
    "plain-text",
    "none",
}

REQUIRED_MANIFEST_FIELDS = (
    "schema_version",
    "project_name",
    "generated_at",
    "truth_artifacts",
    "coverage_requirements",
    "change_log",
)
REQUIRED_ARTIFACT_FIELDS = (
    "id",
    "name",
    "path",
    "type",
    "authority",
    "format",
    "parser",
    "scope_tags",
    "coverage_ids",
    "owner",
    "last_reviewed_at",
    "fingerprint",
)
REQUIRED_COVERAGE_FIELDS = ("id", "scope", "risk", "required_artifact_types")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check the repo-local anti-entropy manifest.")
    parser.add_argument("--manifest", required=True, help="Path to the manifest JSON file.")
    parser.add_argument("--repo-root", required=True, help="Repository root used to resolve artifact paths.")
    parser.add_argument("--scope", help="Optional scope to filter coverage checks.")
    return parser.parse_args()


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(65536)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def fail_report(
    manifest_path: Path, repo_root: Path, scope: Optional[str], message: str, result: str
) -> dict:
    return {
        "project_name": repo_root.name,
        "repo_root": str(repo_root.resolve()),
        "manifest_path": str(manifest_path.resolve()),
        "scope": scope,
        "checked_at": iso_now(),
        "check_result": result,
        "artifact_checks": [],
        "coverage_checks": [],
        "summary": {
            "total_artifacts": 0,
            "consistent_artifacts": 0,
            "modified_artifacts": 0,
            "missing_artifacts": 0,
            "coverage_pass": 0,
            "coverage_warning": 0,
            "coverage_fail": 0,
        },
        "blocking_issues": [message],
        "warnings": [],
    }


def validate_manifest_shape(manifest: dict) -> list[str]:
    issues: list[str] = []
    for field in REQUIRED_MANIFEST_FIELDS:
        if field not in manifest:
            issues.append(f"manifest missing required field: {field}")

    if manifest.get("schema_version") != "2":
        issues.append("schema_version must equal '2'")

    if not isinstance(manifest.get("truth_artifacts"), list):
        issues.append("truth_artifacts must be an array")
    if not isinstance(manifest.get("coverage_requirements"), list):
        issues.append("coverage_requirements must be an array")
    if not isinstance(manifest.get("change_log"), list):
        issues.append("change_log must be an array")

    for index, artifact in enumerate(manifest.get("truth_artifacts", [])):
        if not isinstance(artifact, dict):
            issues.append(f"truth_artifacts[{index}] must be an object")
            continue
        for field in REQUIRED_ARTIFACT_FIELDS:
            if field not in artifact:
                issues.append(f"truth_artifacts[{index}] missing required field: {field}")
        if artifact.get("type") not in ALLOWED_ARTIFACT_TYPES:
            issues.append(f"truth_artifacts[{index}] has invalid type: {artifact.get('type')}")
        if artifact.get("authority") not in ALLOWED_AUTHORITIES:
            issues.append(f"truth_artifacts[{index}] has invalid authority: {artifact.get('authority')}")
        if artifact.get("format") not in ALLOWED_FORMATS:
            issues.append(f"truth_artifacts[{index}] has invalid format: {artifact.get('format')}")
        if artifact.get("parser") not in ALLOWED_PARSERS:
            issues.append(f"truth_artifacts[{index}] has invalid parser: {artifact.get('parser')}")
        if not isinstance(artifact.get("scope_tags"), list):
            issues.append(f"truth_artifacts[{index}] scope_tags must be an array")
        if not isinstance(artifact.get("coverage_ids"), list):
            issues.append(f"truth_artifacts[{index}] coverage_ids must be an array")

        fingerprint = artifact.get("fingerprint", {})
        if not isinstance(fingerprint, dict):
            issues.append(f"truth_artifacts[{index}] fingerprint must be an object")
        else:
            if fingerprint.get("algorithm") != "sha256":
                issues.append(f"truth_artifacts[{index}] fingerprint.algorithm must equal 'sha256'")
            if not isinstance(fingerprint.get("value"), str) or not fingerprint.get("value"):
                issues.append(f"truth_artifacts[{index}] fingerprint.value must be a non-empty string")
            if not isinstance(fingerprint.get("size"), int) or fingerprint.get("size") < 0:
                issues.append(f"truth_artifacts[{index}] fingerprint.size must be a non-negative integer")

    for index, coverage in enumerate(manifest.get("coverage_requirements", [])):
        if not isinstance(coverage, dict):
            issues.append(f"coverage_requirements[{index}] must be an object")
            continue
        for field in REQUIRED_COVERAGE_FIELDS:
            if field not in coverage:
                issues.append(f"coverage_requirements[{index}] missing required field: {field}")
        if not isinstance(coverage.get("required_artifact_types"), list) or not coverage.get(
            "required_artifact_types"
        ):
            issues.append(f"coverage_requirements[{index}] required_artifact_types must be a non-empty array")

    return issues


def check_artifacts(manifest: dict, repo_root: Path) -> list[dict]:
    checks: list[dict] = []
    for artifact in manifest.get("truth_artifacts", []):
        artifact_path = Path(artifact["path"])
        full_path = artifact_path if artifact_path.is_absolute() else repo_root / artifact_path

        base = {
            "artifact_id": artifact["id"],
            "name": artifact["name"],
            "path": artifact["path"],
            "type": artifact["type"],
            "authority": artifact["authority"],
            "scope_tags": artifact["scope_tags"],
            "coverage_ids": artifact["coverage_ids"],
            "expected_fingerprint": artifact["fingerprint"]["value"],
        }

        if not full_path.exists():
            checks.append(
                {
                    **base,
                    "state": "missing",
                    "actual_fingerprint": None,
                    "reasons": ["file not found"],
                }
            )
            continue

        if not full_path.is_file():
            checks.append(
                {
                    **base,
                    "state": "modified",
                    "actual_fingerprint": None,
                    "reasons": ["path exists but is not a file"],
                }
            )
            continue

        actual_hash = sha256_file(full_path)
        actual_size = full_path.stat().st_size
        reasons: list[str] = []
        if actual_size != artifact["fingerprint"]["size"]:
            reasons.append(
                f"size mismatch: expected {artifact['fingerprint']['size']}, actual {actual_size}"
            )
        if actual_hash != artifact["fingerprint"]["value"]:
            reasons.append(
                f"fingerprint mismatch: expected {artifact['fingerprint']['value']}, actual {actual_hash}"
            )

        checks.append(
            {
                **base,
                "state": "consistent" if not reasons else "modified",
                "actual_fingerprint": actual_hash,
                "reasons": reasons,
            }
        )

    return checks


def check_coverage(manifest: dict, artifact_checks: list[dict], scope: Optional[str]) -> list[dict]:
    consistent_artifacts = {
        artifact["artifact_id"]: artifact for artifact in artifact_checks if artifact["state"] == "consistent"
    }
    manifest_artifacts = {artifact["id"]: artifact for artifact in manifest.get("truth_artifacts", [])}
    coverage_checks: list[dict] = []

    for coverage in manifest.get("coverage_requirements", []):
        if scope and coverage.get("scope") != scope:
            continue

        seen_types = set()
        artifact_ids = []
        for artifact_id, artifact in consistent_artifacts.items():
            manifest_artifact = manifest_artifacts.get(artifact_id)
            if not manifest_artifact:
                continue
            if coverage["id"] in manifest_artifact.get("coverage_ids", []):
                seen_types.add(manifest_artifact["type"])
                artifact_ids.append(artifact_id)

        missing_types = [
            artifact_type
            for artifact_type in coverage.get("required_artifact_types", [])
            if artifact_type not in seen_types
        ]
        coverage_checks.append(
            {
                "coverage_id": coverage["id"],
                "scope": coverage["scope"],
                "risk": coverage["risk"],
                "state": "passed" if not missing_types else "failed",
                "artifact_ids": artifact_ids,
                "missing_artifact_types": missing_types,
            }
        )

    if scope and not coverage_checks:
        coverage_checks.append(
            {
                "coverage_id": None,
                "scope": scope,
                "risk": None,
                "state": "failed",
                "artifact_ids": [],
                "missing_artifact_types": [],
                "reasons": [f"requested scope '{scope}' has no coverage requirement"],
            }
        )

    return coverage_checks


def summarize(artifact_checks: list[dict], coverage_checks: list[dict]) -> dict:
    return {
        "total_artifacts": len(artifact_checks),
        "consistent_artifacts": sum(1 for item in artifact_checks if item["state"] == "consistent"),
        "modified_artifacts": sum(1 for item in artifact_checks if item["state"] == "modified"),
        "missing_artifacts": sum(1 for item in artifact_checks if item["state"] == "missing"),
        "coverage_pass": sum(1 for item in coverage_checks if item["state"] == "passed"),
        "coverage_warning": 0,
        "coverage_fail": sum(1 for item in coverage_checks if item["state"] == "failed"),
    }


def derive_issues(artifact_checks: list[dict], coverage_checks: list[dict]) -> tuple[list[str], list[str]]:
    blocking_issues: list[str] = []
    warnings: list[str] = []

    for artifact in artifact_checks:
        if artifact["authority"] == "required" and artifact["state"] != "consistent":
            blocking_issues.append(
                f"required artifact {artifact['artifact_id']} is {artifact['state']}: {', '.join(artifact['reasons'])}"
            )
        elif artifact["authority"] != "required" and artifact["state"] != "consistent":
            warnings.append(
                f"non-required artifact {artifact['artifact_id']} is {artifact['state']}: {', '.join(artifact['reasons'])}"
            )

    for coverage in coverage_checks:
        if coverage["state"] == "failed":
            if coverage.get("missing_artifact_types"):
                blocking_issues.append(
                    f"coverage {coverage['coverage_id']} for scope {coverage['scope']} is missing artifact types: "
                    + ", ".join(coverage["missing_artifact_types"])
                )
            else:
                blocking_issues.append(
                    f"coverage for scope {coverage['scope']} could not be evaluated"
                )

    return blocking_issues, warnings


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest)
    repo_root = Path(args.repo_root)

    if not manifest_path.exists():
        report = fail_report(
            manifest_path,
            repo_root,
            args.scope,
            f"Truth manifest not found at {manifest_path}. Bootstrap required before strict implementation.",
            "bootstrap_required",
        )
        print(json.dumps(report, indent=2))
        return 1

    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        report = fail_report(
            manifest_path,
            repo_root,
            args.scope,
            f"Truth manifest is not valid JSON: {exc}",
            "refuse_implementation",
        )
        print(json.dumps(report, indent=2))
        return 1

    shape_issues = validate_manifest_shape(manifest)
    if shape_issues:
        report = fail_report(
            manifest_path,
            repo_root,
            args.scope,
            "Truth manifest is invalid and minimum truth coverage cannot be evaluated: "
            + "; ".join(shape_issues),
            "refuse_implementation",
        )
        print(json.dumps(report, indent=2))
        return 1

    artifact_checks = check_artifacts(manifest, repo_root)
    coverage_checks = check_coverage(manifest, artifact_checks, args.scope)
    summary = summarize(artifact_checks, coverage_checks)
    blocking_issues, warnings = derive_issues(artifact_checks, coverage_checks)

    report = {
        "project_name": manifest["project_name"],
        "repo_root": str(repo_root.resolve()),
        "manifest_path": str(manifest_path.resolve()),
        "scope": args.scope,
        "checked_at": iso_now(),
        "check_result": (
            "blocked_pending_resolution"
            if blocking_issues
            else "proceed_with_warnings"
            if warnings
            else "proceed"
        ),
        "artifact_checks": artifact_checks,
        "coverage_checks": coverage_checks,
        "summary": summary,
        "blocking_issues": blocking_issues,
        "warnings": warnings,
    }
    print(json.dumps(report, indent=2))
    return 1 if blocking_issues else 0


if __name__ == "__main__":
    sys.exit(main())
