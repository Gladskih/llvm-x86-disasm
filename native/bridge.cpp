#include "llvm/ADT/ArrayRef.h"
#include "llvm/MC/MCAsmInfo.h"
#include "llvm/MC/MCContext.h"
#include "llvm/MC/MCDisassembler/MCDisassembler.h"
#include "llvm/MC/MCInst.h"
#include "llvm/MC/MCInstPrinter.h"
#include "llvm/MC/MCInstrAnalysis.h"
#include "llvm/MC/MCInstrInfo.h"
#include "llvm/MC/MCRegisterInfo.h"
#include "llvm/MC/MCSubtargetInfo.h"
#include "llvm/MC/TargetRegistry.h"
#include "llvm/Support/raw_ostream.h"
#include "MCTargetDesc/X86BaseInfo.h"
#include <algorithm>
#include <memory>
#include <string>

extern "C" void LLVMInitializeX86TargetInfo();
extern "C" void LLVMInitializeX86DisassemblyMC();
extern "C" void LLVMInitializeX86Disassembler();

using namespace llvm;
namespace {
// Intel SDM Vol. 2: an x86 instruction is at most 15 bytes.
uint8_t input[15];
struct Decoder {
  Triple triple;
  std::unique_ptr<MCRegisterInfo> registers;
  std::unique_ptr<MCAsmInfo> assembly;
  std::unique_ptr<MCSubtargetInfo> subtarget;
  std::unique_ptr<MCInstrInfo> instructions;
  std::unique_ptr<MCContext> context;
  std::unique_ptr<MCDisassembler> disassembler;
  std::unique_ptr<MCInstPrinter> printer;
  std::unique_ptr<MCInstrAnalysis> analysis;
  explicit Decoder(unsigned bitness)
      : triple(bitness == 64 ? "x86_64-none-unknown" :
               bitness == 16 ? "i386-none-unknown-code16" : "i386-none-unknown") {
    LLVMInitializeX86TargetInfo();
    LLVMInitializeX86DisassemblyMC();
    LLVMInitializeX86Disassembler();
    std::string error;
    const auto *target = TargetRegistry::lookupTarget(triple, error);
    if (!target) return;
    registers.reset(target->createMCRegInfo(triple.str()));
    if (!registers) return;
    assembly.reset(target->createMCAsmInfo(*registers, triple.str(), MCTargetOptions{}));
    subtarget.reset(target->createMCSubtargetInfo(triple.str(), "generic", ""));
    instructions.reset(target->createMCInstrInfo());
    if (!assembly || !subtarget || !instructions) return;
    context = std::make_unique<MCContext>(triple, assembly.get(), registers.get(), subtarget.get());
    disassembler.reset(target->createMCDisassembler(*subtarget, *context));
    // llvm-mc --output-asm-variant=1 selects Intel syntax.
    printer.reset(target->createMCInstPrinter(triple, 1, *assembly, *instructions, *registers));
    analysis.reset(target->createMCInstrAnalysis(instructions.get()));
  }
};
Decoder *getDecoder(unsigned bitness) {
  static std::unique_ptr<Decoder> decoders[3];
  if (bitness != 16 && bitness != 32 && bitness != 64) return nullptr;
  const unsigned index = bitness == 16 ? 0 : bitness == 32 ? 1 : 2;
  if (!decoders[index]) decoders[index] = std::make_unique<Decoder>(bitness);
  return decoders[index].get();
}
unsigned controlFlow(Decoder &decoder, const MCInst &inst) {
  auto &analysis = *decoder.analysis;
  return analysis.isCall(inst) ? 1 : analysis.isReturn(inst) ? 2 :
      analysis.isConditionalBranch(inst) ? 3 : analysis.isIndirectBranch(inst) ? 5 :
      analysis.isUnconditionalBranch(inst) ? 4 : 0;
}
bool hasDisassemblyState(const Decoder *decoder) {
  return decoder && decoder->disassembler && decoder->analysis && decoder->printer;
}
// Eight uint32 words: status, size, opcode-name pointer, flow, hasTarget,
// target low/high, text pointer. Storage is copied by JS before the next call.
uint32_t result[8];
void decodeInstruction(Decoder *decoder, unsigned length, uint64_t address, MCInst &inst) {
  std::fill(std::begin(result), std::end(result), 0);
  result[1] = length ? 1 : 0;
  if (!hasDisassemblyState(decoder)) return;
  uint64_t size = 0;
  const auto status = decoder->disassembler->getInstruction(inst, size,
      ArrayRef<uint8_t>(input, std::min(length, 15u)), address, nulls());
  // Conservative single-byte resynchronization: LLVM cannot reliably distinguish
  // a malformed encoding from a truncated instruction (MCDisassembler::Fail).
  if (status == MCDisassembler::Fail || size == 0 || size > std::min(length, 15u)) return;
  result[0] = status == MCDisassembler::Success ? 1 : 2;
  // Upstream X86II::isPrefix identifies standalone PrefixByte records.
  if (X86II::isPrefix(decoder->instructions->get(inst.getOpcode()).TSFlags)) result[0] = 3;
  result[1] = uint32_t(size);
  result[2] = uint32_t(uintptr_t(decoder->instructions->getName(inst.getOpcode()).data()));
  result[3] = controlFlow(*decoder, inst);
  uint64_t target;
  if (decoder->analysis->evaluateBranch(inst, address, size, target)) {
    result[4] = 1;
    result[5] = uint32_t(target);
    result[6] = uint32_t(target >> 32);
  }
}
}
extern "C" uint8_t *input_buffer() { return input; }
extern "C" const uint32_t *decode_metadata(unsigned length, unsigned bitness,
                                          uint32_t addressLow, uint32_t addressHigh) {
  MCInst inst;
  decodeInstruction(getDecoder(bitness), length,
      (uint64_t(addressHigh) << 32) | addressLow, inst);
  return result;
}
extern "C" const uint32_t *decode_full(unsigned length, unsigned bitness,
                                      uint32_t addressLow, uint32_t addressHigh) {
  auto *decoder = getDecoder(bitness);
  const uint64_t address = (uint64_t(addressHigh) << 32) | addressLow;
  MCInst inst;
  decodeInstruction(decoder, length, address, inst);
  if (result[0] == 0) return result;
  static std::string formatted;
  formatted.clear();
  raw_string_ostream stream(formatted);
  // X86 printers expect the address AFTER the instruction (upstream llvm-mc).
  decoder->printer->printInst(&inst, address + result[1], "", *decoder->subtarget, stream);
  result[7] = uint32_t(uintptr_t(formatted.c_str()));
  return result;
}
