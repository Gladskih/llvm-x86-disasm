import { createDisassembler, features, getInstructionRequirements,
  type DecodeResult, type MetadataResult } from "llvm-x86-disasm";

const decoder = await createDisassembler({ wasmURL: new URL("file:///local/decoder.wasm") });
const instructions: DecodeResult[] = decoder.decode(new Uint8Array(), { bitness: 16, address: 0n });
const metadata: MetadataResult[] = decoder.decodeMetadata(new Uint8Array(), { bitness: 32 });
for (const instruction of instructions) {
  if (instruction.status === "invalid") instruction.error satisfies string;
  else instruction.text satisfies string;
}
for (const instruction of metadata) {
  if (instruction.status !== "invalid") {
    instruction.target satisfies bigint | undefined;
    getInstructionRequirements(instruction.opcode)?.nonAssemblerPredicates satisfies
      { name: string; condition: string }[] | undefined;
  }
}
features.FeatureAVX.implies satisfies string[];
// @ts-expect-error unsupported execution mode
decoder.decode(new Uint8Array(), { bitness: 128 });
// @ts-expect-error address must retain 64-bit precision
decoder.decode(new Uint8Array(), { address: 123 });
// @ts-expect-error metadata path does not return formatting
metadata[0].text;
