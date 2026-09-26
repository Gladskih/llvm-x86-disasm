import { expect, test } from "@playwright/test";

test("browser loads WASM and decodes mode, branch and diagnostic records", async ({ page }) => {
  await page.goto("/test/browser.html");
  const result = await page.evaluate(async () => {
    const { createDisassembler, getInstructionRequirements } = await import("/dist/browser.js");
    const decoder = await createDisassembler();
    return {
      decoded: decoder.decode(Uint8Array.of(0x90, 0xeb, 0xfd, 0x0f), { address: 0x1000n }),
      opcode16: decoder.decodeMetadata(Uint8Array.of(0x89, 0xe5), { bitness: 16 })[0].opcode,
      requirements: getInstructionRequirements("VADDPSYrr"),
    };
  });
  expect(result.decoded[0]).toMatchObject({ status: "decoded", text: "nop" });
  expect(result.decoded[1]).toMatchObject({ flow: "unconditional-branch", target: 0x1000n });
  expect(result.decoded[2]).toMatchObject({ status: "invalid", error: "invalid-or-truncated" });
  expect(result.opcode16).toBe("MOV16rr");
  expect(result.requirements.nonAssemblerPredicates[0].name).toBe("HasAVX");
});

test("worker loads supplied WASM locally", async ({ page }) => {
  await page.goto("/test/browser.html");
  const result = await page.evaluate(() => new Promise((resolve, reject) => {
    const worker = new Worker("/test/worker.mjs", { type: "module" });
    worker.onmessage = event => { worker.terminate(); resolve(event.data); };
    worker.onerror = event => { worker.terminate(); reject(new Error(event.message)); };
  }));
  expect(result).toMatchObject({ status: "decoded", opcode: "RET64", flow: "return" });
});

test("browser reports missing WASM", async ({ page }) => {
  await page.goto("/test/browser.html");
  const message = await page.evaluate(async () => {
    const { createDisassembler } = await import("/dist/browser.js");
    return createDisassembler({ wasmURL: "/missing.wasm" }).catch(error => error.message);
  });
  expect(message).toContain("HTTP 404");
});
