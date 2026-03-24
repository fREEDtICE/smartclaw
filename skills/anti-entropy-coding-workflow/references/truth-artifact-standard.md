# Truth Artifact Standard

# Purpose
Truth artifacts are the durable contracts that constrain implementation. They are not general project notes. A truth artifact must define behavior, boundaries, or verification in a way that should not change implicitly.

# Required artifact types
Every critical scope must have these artifact types:
* `system-overview`
* `invariant-spec`
* `api-contract` or `interface-contract`
* `e2e-spec`
* `test-environment`

# Recommended artifact types
Use these when the scope is complex, stateful, or high-risk:
* `architecture-boundary`
* `state-machine`
* `lifecycle-spec`
* `risk-zone`

# Artifact quality bar
Each truth artifact should satisfy these standards:
* stable path in the repository
* unique `id`
* explicit owner
* explicit scope tags such as `checkout`, `auth`, or `billing`
* last reviewed timestamp
* fingerprint that detects content change, not just existence
* language that is normative for critical behavior such as `MUST`, `MUST NOT`, or explicit examples
* the required content fields for its artifact type, as defined in [truth-artifact-content-standard.md](truth-artifact-content-standard.md)

# Preferred formats
Use machine-readable formats where possible:
* API contracts: OpenAPI, protobuf, JSON Schema
* E2E specs: executable tests or structured scenario YAML
* Test environment: YAML
* Invariants, architecture, and state docs: Markdown with stable headings and scope tags

# Required content by artifact type
The manifest is not enough by itself. Each artifact type must also contain specific constraint-bearing information. See [truth-artifact-content-standard.md](truth-artifact-content-standard.md) for the per-type minimum content contract.

# Manifest fields
Each entry in `manifest.json` should include:
* `id`
* `name`
* `path`
* `type`
* `authority`
* `format`
* `parser`
* `scope_tags`
* `coverage_ids`
* `owner`
* `last_reviewed_at`
* `fingerprint`

# Authorities
* `required`: missing or inconsistent artifacts block implementation
* `recommended`: missing or inconsistent artifacts produce warnings and may block high-risk work
* `informative`: useful context but not binding by itself

Readiness discussion records are not authoritative by default. If stored in the repository or referenced by the workflow, they should be treated as supplemental planning artifacts until their accepted decisions are promoted into real truth artifacts.

# Coverage requirements
Add `coverage_requirements` to the manifest so each critical scope declares the minimum artifact set it needs. A coverage requirement should define:
* `id`
* `scope`
* `risk`
* `required_artifact_types`

This is what lets Step 1 detect missing coverage before coding begins.

# Fingerprints
Use content fingerprints, not size-only checks.
* default algorithm: `sha256`
* store both hash and size in the manifest
* refresh the fingerprint whenever a truth artifact is intentionally updated

# Minimal manifest example
```json
{
  "schema_version": "2",
  "project_name": "example-repo",
  "generated_at": "2026-03-24T00:00:00Z",
  "truth_artifacts": [
    {
      "id": "checkout-invariants",
      "name": "Checkout invariants",
      "path": "docs/invariants/checkout.md",
      "type": "invariant-spec",
      "authority": "required",
      "format": "markdown",
      "parser": "markdown",
      "scope_tags": ["checkout"],
      "coverage_ids": ["checkout-core"],
      "owner": "payments-platform",
      "last_reviewed_at": "2026-03-24T00:00:00Z",
      "fingerprint": {
        "algorithm": "sha256",
        "value": "abc123",
        "size": 1024
      }
    }
  ],
  "coverage_requirements": [
    {
      "id": "checkout-core",
      "scope": "checkout",
      "risk": "high",
      "required_artifact_types": [
        "invariant-spec",
        "api-contract",
        "e2e-spec",
        "test-environment"
      ]
    }
  ],
  "change_log": []
}
```
