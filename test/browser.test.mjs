import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { createDisassembler } from "../dist/browser.js";

test("browser loader fetches the default local asset", async context => {
  const binary = await readFile(new URL("../dist/llvm-x86.wasm", import.meta.url));
  const fetch = context.mock.method(globalThis, "fetch", async () => new Response(binary));
  const decoder = await createDisassembler();
  assert.equal(decoder.decode(Uint8Array.of(0x90))[0].text, "nop");
  assert.equal(fetch.mock.calls[0].arguments[0].pathname.endsWith("/dist/llvm-x86.wasm"), true);
});
test("browser supplied bytes bypass fetch", async context => {
  const fetch = context.mock.method(globalThis, "fetch", () => assert.fail("unexpected fetch"));
  const decoder = await createDisassembler({ wasmBinary: await readFile(
    new URL("../dist/llvm-x86.wasm", import.meta.url)) });
  assert.equal(decoder.decodeMetadata(Uint8Array.of(0xc3))[0].flow, "return");
  assert.equal(fetch.mock.callCount(), 0);
});
test("browser loader reports HTTP errors and respects custom URL", async context => {
  const fetch = context.mock.method(globalThis, "fetch", async () => new Response(null,
    { status: 404 }));
  await assert.rejects(createDisassembler({ wasmURL: "custom.wasm" }), /HTTP 404/);
  assert.equal(fetch.mock.calls[0].arguments[0], "custom.wasm");
});
