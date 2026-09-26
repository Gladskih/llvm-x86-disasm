import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const directory = process.argv[2];
const archives = await readFile(resolve(directory, "archive-inputs.tsv"), "utf8");
for (const forbidden of ["X86MCCodeEmitter.cpp.o", "X86AsmBackend.cpp.o",
  "X86ELFObjectWriter.cpp.o", "X86MachObjectWriter.cpp.o", "X86WinCOFFObjectWriter.cpp.o",
  "X86ATTInstPrinter::printInst", "SandyBridgeModel", "X86WriteLatencyTable"]) {
  assert(!archives.includes(forbidden), `Unexpected linked component: ${forbidden}`);
}
const adapter = await readFile(resolve(directory, "X86DisassemblyMC.cpp"), "utf8");
assert(!adapter.includes("GET_SUBTARGETINFO_MC_DESC"), "Scheduling descriptor must be stripped");
assert(!adapter.includes("RegisterMCCodeEmitter"), "Code emitter registration must be stripped");
console.log("Verified disassembly-only MC registration and linked archive footprint");
