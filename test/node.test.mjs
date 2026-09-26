import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createDisassembler } from "../dist/node.js";

test("accepts explicit local WASM path and supplied binary", async () => {
  const path = new URL("../dist/llvm-x86.wasm", import.meta.url);
  const fromPath = await createDisassembler({ wasmURL: path });
  const fromBytes = await createDisassembler({ wasmBinary: await readFile(path),
    wasmURL: "missing.wasm" });
  assert.deepEqual(fromPath.decode(Uint8Array.of(0x90)), fromBytes.decode(Uint8Array.of(0x90)));
  assert.equal(fromPath.decode(Uint8Array.of(0x90))[0].text, "nop");
});
test("reports missing asset and invalid WASM", async () => {
  await assert.rejects(createDisassembler({ wasmURL: new URL("missing.wasm", import.meta.url) }),
    { code: "ENOENT" });
  await assert.rejects(createDisassembler({ wasmBinary: Uint8Array.of(0) }), WebAssembly.RuntimeError);
});
