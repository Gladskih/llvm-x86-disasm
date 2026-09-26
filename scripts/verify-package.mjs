import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { createDisassembler } from "../dist/node.js";

const root = new URL("../", import.meta.url);
const wasm = await readFile(new URL("dist/llvm-x86.wasm", root));
const pins = JSON.parse(await readFile(new URL("upstream.json", root)));
const manifest = JSON.parse(await readFile(new URL("dist/build-info.json", root)));
const gzipBytes = gzipSync(wasm, { level: 9 }).length;
assert.deepEqual((await readdir(new URL("dist/", root))).sort(), [
  "browser.js", "build-info.json", "core.js", "features.js", "index.d.ts",
  "llvm-x86.js", "llvm-x86.wasm", "metadata.js", "node.js", "validation.js",
]);
assert(WebAssembly.validate(wasm));
assert(wasm.length < 1_950_000, `WASM size budget exceeded: ${wasm.length}`);
assert(gzipBytes < 580_000, "Compressed WASM size budget exceeded");
for (const [name, value] of Object.entries(pins)) assert.equal(manifest[name], value);
assert.equal(manifest.wasmBytes, wasm.length);
assert.equal(manifest.wasmSha256, createHash("sha256").update(wasm).digest("hex"));
assert.equal(manifest.wasmGzipBytes, gzipBytes);
assert((await readFile(new URL("dist/llvm-x86.js", root))).length < 20_000);
// Emscripten minifies WASM names: three bridge functions, ctor and runtime timeout.
assert.equal(WebAssembly.Module.exports(new WebAssembly.Module(wasm))
  .filter(entry => entry.kind === "function").length, 5);
const decoder = await createDisassembler({ wasmBinary: wasm });
assert.equal(decoder.decode(Uint8Array.of(0x90))[0].opcode, "NOOP");
console.log(`Verified LLVM ${pins.llvmVersion}: ${wasm.length} WASM bytes`);
