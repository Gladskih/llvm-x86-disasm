import { readFile } from "node:fs/promises";
import { loadDisassembler } from "./core.js";
export { features, getInstructionRequirements } from "./metadata.js";

/** Load WASM from a local file. No runtime service or network dependency. */
export async function createDisassembler({ wasmBinary, wasmURL } = {}) {
  return loadDisassembler(wasmBinary ?? await readFile(
    wasmURL ?? new URL("./llvm-x86.wasm", import.meta.url)));
}
