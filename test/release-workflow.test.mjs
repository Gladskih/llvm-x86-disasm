import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("publication preserves the exact required verify job without duplicating a build", async () => {
  const ci = (await readFile(".github/workflows/ci.yml", "utf8")).replaceAll("\r\n", "\n");
  const publish = (await readFile(".github/workflows/publish.yml", "utf8")).replaceAll("\r\n", "\n");
  assert.deepEqual(publish.split("\njobs:\n")[1].split("\n  publish:\n")[0].trimEnd(),
    ci.split("\njobs:\n")[1].trimEnd());
  assert(publish.includes("    needs: verify\n"));
});
