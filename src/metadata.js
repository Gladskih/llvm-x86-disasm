import metadata from "./features.js";

/** Upstream LLVM feature descriptions and implication relationships. */
export const features = metadata.features;

/** Unknown opcodes return undefined, not a fabricated empty requirement. */
export function getInstructionRequirements(opcode) {
  if (!Object.hasOwn(metadata.opcodes, opcode)) return undefined;
  return metadata.requirements[metadata.opcodes[opcode]];
}
