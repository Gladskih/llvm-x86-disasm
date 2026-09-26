import assert from "node:assert/strict";
import { test } from "node:test";
import { createDisassembler } from "../dist/node.js";

const decoder = await createDisassembler();
test("prints Intel syntax and instruction boundaries", () => {
  assert.deepEqual(decoder.decode(Uint8Array.of(0x90, 0x48, 0x89, 0xe5)), [
    { offset: 0, length: 1, status: "decoded", opcode: "NOOP", flow: "none", text: "nop" },
    { offset: 1, length: 3, status: "decoded", opcode: "MOV64rr", flow: "none",
      text: "mov\trbp, rsp" },
  ]);
});
test("decodes 16 and 32 bit mode using upstream mode features", () => {
  assert.equal(decoder.decode(Uint8Array.of(0x89, 0xe5), { bitness: 16 })[0].opcode, "MOV16rr");
  assert.equal(decoder.decode(Uint8Array.of(0x89, 0xe5), { bitness: 32 })[0].opcode, "MOV32rr");
});
test("evaluates direct call and jump targets at unsigned 64-bit addresses", () => {
  // Intel SDM Vol. 2 CALL rel32: target = next RIP + signed displacement.
  const call = decoder.decode(Uint8Array.of(0xe8, 0xfb, 0xff, 0xff, 0xff),
    { address: 0xffff_ffff_ffff_ffffn })[0];
  assert.equal(call.target, 0xffff_ffff_ffff_ffffn);
  assert.equal(call.flow, "call");
  assert.equal(decoder.decode(Uint8Array.of(0x75, 0xfe))[0].target, 0n);
  assert.equal(decoder.decode(Uint8Array.of(0xeb, 0xfe))[0].flow, "unconditional-branch");
});
test("classifies return and indirect branch without inventing a direct target", () => {
  assert.equal(decoder.decode(Uint8Array.of(0xc3))[0].flow, "return");
  assert.equal(decoder.decode(Uint8Array.of(0xff, 0xe0))[0].flow, "indirect-branch");
  assert.equal(decoder.decode(Uint8Array.of(0xff, 0xe0))[0].target, undefined);
});
test("empty and truncated inputs remain bounded and make progress", () => {
  assert.deepEqual(decoder.decode(new Uint8Array()), []);
  assert.deepEqual(decoder.decode(Uint8Array.of(0x0f)), [
    { offset: 0, length: 1, status: "invalid", error: "invalid-or-truncated" },
  ]);
  assert.deepEqual(decoder.decode(new Uint8Array(16).fill(0x66)).map(
    ({ offset, length, status }) => ({ offset, length, status })), [
    { offset: 0, length: 15, status: "prefix" },
    { offset: 15, length: 1, status: "prefix" },
  ]);
});
test("uses the input view bounds and preserves the caller buffer", () => {
  const bytes = Uint8Array.of(0x0f, 0x90, 0x0f);
  assert.equal(decoder.decode(bytes.subarray(1, 2))[0].opcode, "NOOP");
  assert.deepEqual(bytes, Uint8Array.of(0x0f, 0x90, 0x0f));
});
test("metadata path shares decoder boundaries without formatting", () => {
  const bytes = Uint8Array.of(0x90, 0xe8, 0, 0, 0, 0, 0x0f);
  assert.deepEqual(decoder.decodeMetadata(bytes),
    decoder.decode(bytes).map(({ text: _text, ...rest }) => rest));
});
test("separate instances and mode changes do not leak state", async () => {
  const other = await createDisassembler();
  assert.equal(other.decode(Uint8Array.of(0x89, 0xe5), { bitness: 16 })[0].opcode, "MOV16rr");
  assert.equal(decoder.decode(Uint8Array.of(0x89, 0xe5))[0].opcode, "MOV32rr");
});
test("rejects invalid API inputs before entering LLVM", () => {
  assert.throws(() => decoder.decode([]), TypeError);
  assert.throws(() => decoder.decode(new Uint8Array(), { bitness: 128 }), RangeError);
  assert.throws(() => decoder.decodeMetadata(new Uint8Array(), { address: -1n }), RangeError);
});
