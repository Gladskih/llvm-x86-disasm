import assert from "node:assert/strict";
import { test } from "node:test";
import { createDisassembler } from "../dist/node.js";

const decoder = await createDisassembler();
function verifyPartition(bytes, bitness) {
  const records = decoder.decodeMetadata(bytes, { bitness });
  let consumed = 0;
  for (const record of records) {
    assert.equal(record.offset, consumed);
    assert(record.length >= 1 && record.length <= 15);
    consumed += record.length;
    assert(consumed <= bytes.length);
  }
  assert.equal(consumed, bytes.length);
}
function verifyAllEncodings() {
  for (const bitness of [16, 32, 64]) {
    for (let byte = 0; byte <= 255; byte++) {
      verifyPartition(Uint8Array.of(byte), bitness);
      verifyPartition(Uint8Array.of(0x0f, byte), bitness);
    }
  }
}
function arbitraryBytes() {
  let seed = 1;
  const bytes = new Uint8Array(8192);
  for (let index = 0; index < bytes.length; index++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    bytes[index] = seed >>> 24;
  }
  return bytes;
}
test("all one-byte encodings and their truncated two-byte tails are bounded", () => {
  verifyAllEncodings();
});
test("deterministic arbitrary bytes remain a complete bounded partition", () => {
  const bytes = arbitraryBytes();
  verifyPartition(bytes, 16);
  verifyPartition(bytes, 32);
  verifyPartition(bytes, 64);
});
