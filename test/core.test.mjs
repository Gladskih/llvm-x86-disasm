import assert from "node:assert/strict";
import { test } from "node:test";
import { createDecoder } from "../dist/core.js";

function nativeRecord(words = [], pointer = 32) {
  const memory = new Uint8Array(128);
  new Uint32Array(memory.buffer, 32, 8).set(words);
  return createDecoder({ HEAPU8: memory, _input_buffer: () => 0,
    _decode_full: () => pointer, _decode_metadata: () => pointer,
    UTF8ToString: address => address === 64 ? "NOOP" : "nop" });
}
test("rejects out-of-bounds native pointers with visible diagnostics", () => {
  assert.equal(nativeRecord([], -1).decode(Uint8Array.of(0x90))[0].error,
    "invalid-native-record");
  assert.equal(nativeRecord([], 97).decode(Uint8Array.of(0x90))[0].error,
    "invalid-native-record");
  assert.equal(nativeRecord([], NaN).decode(Uint8Array.of(0x90))[0].error,
    "invalid-native-record");
});
test("rejects zero and oversized native lengths without looping", () => {
  assert.equal(nativeRecord([1, 0, 64]).decode(Uint8Array.of(0x90))[0].error,
    "invalid-native-record");
  assert.equal(nativeRecord([1, 2, 64]).decode(Uint8Array.of(0x90))[0].error,
    "invalid-native-record");
});
test("rejects unknown status, flow and invalid native string pointers", () => {
  assert.equal(nativeRecord([4, 1, 64]).decode(Uint8Array.of(0x90))[0].status, "invalid");
  assert.equal(nativeRecord([1, 1, 64, 6]).decode(Uint8Array.of(0x90))[0].status, "invalid");
  assert.equal(nativeRecord([1, 1, 128]).decode(Uint8Array.of(0x90))[0].status, "invalid");
  assert.equal(nativeRecord([1, 1, 0]).decode(Uint8Array.of(0x90))[0].status, "invalid");
  assert.equal(nativeRecord([1, 1, 64, 0, 0, 0, 0, 128]).decode(Uint8Array.of(0x90))[0].status,
    "invalid");
});
test("preserves soft-fail and prefix statuses", () => {
  assert.equal(nativeRecord([2, 1, 64]).decodeMetadata(Uint8Array.of(0x90))[0].status,
    "soft-fail");
  assert.equal(nativeRecord([3, 1, 64]).decodeMetadata(Uint8Array.of(0x66))[0].status, "prefix");
});
test("copies native text and exact target words", () => {
  assert.deepEqual(nativeRecord([1, 1, 64, 1, 1, 0xffffffff, 0xffffffff, 80])
    .decode(Uint8Array.of(0x90)), [{ offset: 0, length: 1, status: "decoded",
      opcode: "NOOP", flow: "call", target: 0xffff_ffff_ffff_ffffn, text: "nop" }]);
});
