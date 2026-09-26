// Adapt the pinned factory registration, preserving upstream decoder/printer logic.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const [source, subtargetPath, output] = process.argv.slice(2);
let cpp = await readFile(source, "utf8");
assert.equal(createHash("sha256").update(cpp).digest("hex"),
  "89306127b9e6427760aed38e02c0b5b96e5c3d01001509a10b03a95739e3dbec",
  "Review MC adapter after updating LLVM");
const registration = /extern "C" LLVM_C_ABI void LLVMInitializeX86TargetMC\(\) \{[\s\S]*?\n\}/g;
assert.equal([...cpp.matchAll(registration)].length, 1);
cpp = cpp.replace(registration, `extern "C" void LLVMInitializeX86DisassemblyMC() {
  for (Target *target : {&getTheX86_32Target(), &getTheX86_64Target()}) {
    RegisterMCAsmInfoFn assembly(*target, createX86MCAsmInfo);
    TargetRegistry::RegisterMCInstrInfo(*target, createX86MCInstrInfo);
    TargetRegistry::RegisterMCRegInfo(*target, createX86MCRegisterInfo);
    TargetRegistry::RegisterMCSubtargetInfo(*target, X86_MC::createX86MCSubtargetInfo);
    TargetRegistry::RegisterMCInstrAnalysis(*target, createX86MCInstrAnalysis);
    TargetRegistry::RegisterMCInstPrinter(*target, createX86MCInstPrinter);
  }
}`);
// Intel syntax is the single supported printer. Remove the ATT constructor reference.
assert(cpp.includes("    return new X86ATTInstPrinter(MAI, MII, MRI);"));
cpp = cpp.replace("  if (SyntaxVariant == 0)\n    return new X86ATTInstPrinter(MAI, MII, MRI);\n", "");
// Disassembly needs feature bits and mode logic, not CPU scheduling models.
const subtarget = await readFile(subtargetPath, "utf8");
function extract(pattern, label) {
  const matches = [...subtarget.matchAll(pattern)];
  assert.equal(matches.length, 1, `Review generated ${label} after LLVM changes`);
  return matches[0][0];
}
const featureTable = extract(
  /extern const llvm::SubtargetFeatureKV X86FeatureKV\[\] = \{[\s\S]*?\n\};/g,
  "feature table");
const generic = extract(/^ \{ "generic", .* &\w+Model \},$/gm, "generic CPU")
  .replace(/&\w+Model/, "&MCSchedModel::Default");
const include = "#define GET_SUBTARGETINFO_MC_DESC\n#include \"X86GenSubtargetInfo.inc\"";
assert(cpp.includes(include));
cpp = cpp.replace(include, `namespace llvm {
${featureTable}
extern const llvm::SubtargetSubTypeKV X86SubTypeKV[] = { ${generic} };
extern const llvm::StringRef X86Names[] = { "generic" };
static inline MCSubtargetInfo *createX86MCSubtargetInfoImpl(
    const Triple &triple, StringRef cpu, StringRef tuneCpu, StringRef featureString) {
  return new MCSubtargetInfo(triple, cpu, tuneCpu, featureString,
      X86Names, X86FeatureKV, X86SubTypeKV,
      nullptr, nullptr, nullptr, nullptr, nullptr, nullptr);
}
}`);
await writeFile(output, cpp);
