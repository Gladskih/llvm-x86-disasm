import { createDisassembler } from "../dist/browser.js";

const response = await fetch(new URL("../dist/llvm-x86.wasm", import.meta.url));
const decoder = await createDisassembler({ wasmBinary: new Uint8Array(await response.arrayBuffer()) });
postMessage(decoder.decodeMetadata(Uint8Array.of(0xc3))[0]);
