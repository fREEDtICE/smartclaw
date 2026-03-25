import test from "node:test";
import assert from "node:assert/strict";

import {
  assertCheckResult,
  createFixture,
  removeFixture,
  runCheckerDirect,
} from "./helpers.mjs";

test("user journey: missing test environment blocks implementation", async (t) => {
  const fixture = await createFixture("missing-test-environment");
  t.after(async () => {
    await removeFixture(fixture.root);
  });

  const result = await runCheckerDirect(fixture.root);
  assertCheckResult(result, "blocked_pending_resolution");
  assert.ok(
    result.blocking_issues.some((issue) => issue.includes("docs/testing/test-environment.yaml")),
  );
});

test("user journey: bootstrap-only environment can authorize a bounded bridge", async (t) => {
  const fixture = await createFixture("bootstrap-write-authorized");
  t.after(async () => {
    await removeFixture(fixture.root);
  });

  const result = await runCheckerDirect(fixture.root);
  assertCheckResult(result, "bootstrap_write_authorized");
  assert.equal(result.blocking_issues.length, 0);
  assert.ok(
    result.warnings.some((warning) => warning.includes("bootstrap-only but authorizes")),
  );
});

test("user journey: implementation-ready environment proceeds cleanly", async (t) => {
  const fixture = await createFixture("implementation-ready");
  t.after(async () => {
    await removeFixture(fixture.root);
  });

  const result = await runCheckerDirect(fixture.root);
  assertCheckResult(result, "proceed");
  assert.equal(result.warnings.length, 0);
  assert.equal(result.blocking_issues.length, 0);
});
