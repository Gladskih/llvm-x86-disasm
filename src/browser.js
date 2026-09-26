import { loadDisassembler } from "./core.js";
export { features, getInstructionRequirements } from "./metadata.js";

/** Load the packaged local asset, or use provided bytes without fetching. */
export async function createDisassembler({ wasmBinary, wasmURL } = {}) {
  let binary = wasmBinary;
  if (!binary) {
    const response = await fetch(wasmURL ?? new URL("./llvm-x86.wasm", import.meta.url));
    if (!response.ok) throw new Error(`Could not load LLVM WASM: HTTP ${response.status}`);
    binary = new Uint8Array(await response.arrayBuffer());
  }
  return loadDisassembler(binary);
}
