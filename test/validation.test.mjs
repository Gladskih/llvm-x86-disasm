import assert from "node:assert/strict";
import { test } from "node:test";
import { validateInput } from "../src/validation.js";

test("accepts byte views, all modes and unsigned address boundaries", () => {
  assert.doesNotThrow(() => validateInput(new Uint8Array(), 16, 0n));
  assert.doesNotThrow(() => validateInput(Buffer.of(0x90), 32, 1n));
  assert.doesNotThrow(() => validateInput(Uint8Array.of(0x90), 64, 0xffff_ffff_ffff_ffffn));
});
test("rejects non-byte inputs", () => {
  assert.throws(() => validateInput([], 64, 0n), TypeError);
  assert.throws(() => validateInput(new Uint16Array(), 64, 0n), TypeError);
  assert.throws(() => validateInput(null, 64, 0n), TypeError);
});
test("rejects unsupported modes", () => {
  assert.throws(() => validateInput(new Uint8Array(), 0, 0n), RangeError);
  assert.throws(() => validateInput(new Uint8Array(), 128, 0n), RangeError);
  assert.throws(() => validateInput(new Uint8Array(), "64", 0n), RangeError);
});
test("rejects invalid addresses", () => {
  assert.throws(() => validateInput(new Uint8Array(), 64, -1n), RangeError);
  assert.throws(() => validateInput(new Uint8Array(), 64, 1n << 64n), RangeError);
  assert.throws(() => validateInput(new Uint8Array(), 64, 0), RangeError);
});
