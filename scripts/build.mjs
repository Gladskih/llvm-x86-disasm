import { copyFile, mkdir } from "node:fs/promises";

await mkdir(new URL("../dist/", import.meta.url), { recursive: true });
for (const name of ["browser.js", "node.js", "core.js", "validation.js", "metadata.js",
  "index.d.ts"]) {
  await copyFile(new URL(`../src/${name}`, import.meta.url),
    new URL(`../dist/${name}`, import.meta.url));
}
for (const name of ["llvm-x86.js", "llvm-x86.wasm", "features.js", "build-info.json"]) {
  await copyFile(new URL(`../artifacts/${name}`, import.meta.url),
    new URL(`../dist/${name}`, import.meta.url));
}
