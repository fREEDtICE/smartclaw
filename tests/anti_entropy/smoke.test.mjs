import test from "node:test";
import assert from "node:assert/strict";

import {
  assertCheckResult,
  createFixture,
  removeFixture,
  runCheckerCli,
  runCheckerDirect,
} from "./helpers.mjs";

test("smoke: checker module can be imported and returns proceed for an implementation-ready fixture", async (t) => {
  const fixture = await createFixture("implementation-ready");
  t.after(async () => {
    await removeFixture(fixture.root);
  });

  const result = await runCheckerDirect(fixture.root);
  assertCheckResult(result, "proceed");
  assert.equal(result.blocking_issues.length, 0);
});

test("smoke: checker CLI returns JSON for an implementation-ready fixture", async (t) => {
  const fixture = await createFixture("implementation-ready");
  t.after(async () => {
    await removeFixture(fixture.root);
  });

  const result = runCheckerCli(fixture.root);
  assertCheckResult(result, "proceed");
  assert.match(JSON.stringify(result), /"check_result":"proceed"/);
});
