import assert from "node:assert/strict";
import { test } from "node:test";
import { features, getInstructionRequirements } from "../dist/metadata.js";
import { createDisassembler } from "../dist/node.js";

test("returns authoritative AVX predicates for decoded VEX instruction", async () => {
  // VEX vaddps ymm0, ymm0, ymm0; see pinned LLVM X86Disassembler.cpp and X86.td.
  const decoder = await createDisassembler();
  const instruction = decoder.decodeMetadata(Uint8Array.of(0xc5, 0xfc, 0x58, 0xc0))[0];
  assert.equal(instruction.opcode, "VADDPSYrr");
  assert.deepEqual(getInstructionRequirements(instruction.opcode).nonAssemblerPredicates,
    [{ name: "HasAVX", condition: "Subtarget->hasAVX()" },
      { name: "NoVLX", condition: "!Subtarget->hasVLX()" }]);
  assert.equal(features.FeatureAVX.llvmName, "avx");
  assert(features.FeatureAVX.implies.includes("FeatureSSE42"));
});
test("preserves mode predicates and known empty requirements", () => {
  assert.deepEqual(getInstructionRequirements("NOOP"),
    { predicates: [], nonAssemblerPredicates: [] });
  assert(getInstructionRequirements("REX64_PREFIX").predicates.some(
    predicate => predicate.name === "In64BitMode"));
});
test("unknown and inherited property names do not fabricate requirements", () => {
  assert.equal(getInstructionRequirements("missing-opcode"), undefined);
  assert.equal(getInstructionRequirements("toString"), undefined);
  assert.equal(getInstructionRequirements("__proto__"), undefined);
});
