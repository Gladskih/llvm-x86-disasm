// Focused, deterministic mutations of boundary checks and externally visible behavior.
// This does not claim the exhaustive mutation score of a general-purpose engine.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const mutations = [
  ["src/validation.js", "!(bytes instanceof Uint8Array)", "false"],
  ["src/validation.js", "![16, 32, 64].includes(bitness)", "false"],
  ["src/validation.js", "address < 0n", "false"],
  ["src/validation.js", "address > 0xffff_ffff_ffff_ffffn", "false"],
  ["dist/core.js", "pointer < 0", "false"],
  ["dist/core.js", "pointer > module.HEAPU8.byteLength - 32", "false"],
  ["dist/core.js", "word(1) >= 1", "true"],
  ["dist/core.js", "word(1) <= available", "true"],
  ["dist/core.js", "word(0) <= 3", "true"],
  ["dist/core.js", "word(3) < flows.length", "true"],
  ["dist/core.js", "word(2) < module.HEAPU8.byteLength", "true"],
  ["dist/core.js", "word(7) < module.HEAPU8.byteLength", "true"],
  ["dist/core.js", "BigInt(word(6)) << 32n", "0n"],
  ["dist/core.js", "module._decode_metadata, bytes", "module._decode_full, bytes"],
  ["dist/core.js", "\"soft-fail\", \"prefix\"", "\"soft-fail\", \"decoded\""],
  ["dist/metadata.js", "if (!Object.hasOwn(metadata.opcodes, opcode)) return undefined;",
    "if (!Object.hasOwn(metadata.opcodes, opcode)) return {};"],
];
function testsPass() {
  return spawnSync(process.execPath, ["--test", "test/validation.test.mjs", "test/core.test.mjs",
    "test/decode.test.mjs", "test/metadata.test.mjs"], { timeout: 15_000 }).status === 0;
}
assert(testsPass(), "Mutation baseline must pass");
for (const [path, before, after] of mutations) {
  const original = await readFile(path, "utf8");
  assert(original.includes(before), `Missing mutation target in ${path}: ${before}`);
  try {
    await writeFile(path, original.replace(before, after));
    assert(!testsPass(), `Surviving mutation in ${path}: ${before}`);
  } finally {
    await writeFile(path, original);
  }
}
console.log(`Killed ${mutations.length}/${mutations.length} focused mutations`);
