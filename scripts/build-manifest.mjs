import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const root = new URL("../", import.meta.url);
const pins = JSON.parse(await readFile(new URL("upstream.json", root)));
const wasm = await readFile(new URL("artifacts/llvm-x86.wasm", root));
await writeFile(new URL("artifacts/build-info.json", root), JSON.stringify({
  ...pins, wasmBytes: wasm.length, wasmGzipBytes: gzipSync(wasm, { level: 9 }).length,
  wasmSha256: createHash("sha256").update(wasm).digest("hex"),
  target: "X86", syntax: "intel", optimization: "-Oz -flto",
}, null, 2) + "\n");
