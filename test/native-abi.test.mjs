import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import createModule from "../dist/llvm-x86.js";

const module = await createModule({ wasmBinary: await readFile(
  new URL("../dist/llvm-x86.wasm", import.meta.url)) });
function record(pointer) {
  return Array.from(new Uint32Array(module.HEAPU8.buffer, pointer, 8));
}
test("native ABI rejects unsupported mode and empty input without reading bytes", () => {
  module.HEAPU8.set(Uint8Array.of(0x90), module._input_buffer());
  assert.deepEqual(record(module._decode_metadata(0, 64, 0, 0)), new Array(8).fill(0));
  assert.deepEqual(record(module._decode_full(1, 128, 0, 0)), [0, 1, 0, 0, 0, 0, 0, 0]);
});
test("native ABI clamps oversized lengths to its fixed input buffer", () => {
  // A prefix-only tail must stop exactly at the ABI's 15-byte buffer boundary.
  module.HEAPU8.set(new Uint8Array(15).fill(0x66), module._input_buffer());
  const decoded = record(module._decode_metadata(0xffffffff, 64, 0, 0));
  assert.equal(decoded[0], 3);
  assert.equal(decoded[1], 15);
  assert.equal(module.UTF8ToString(decoded[2]), "DATA16_PREFIX");
});
