import createModule from "./llvm-x86.js";
import { validateInput } from "./validation.js";

const flows = ["none", "call", "return", "conditional-branch", "unconditional-branch",
  "indirect-branch"];

function validRecord(module, word, available) {
  return word(0) <= 3 && word(1) >= 1 && word(1) <= available &&
    word(3) < flows.length && word(2) > 0 && word(2) < module.HEAPU8.byteLength &&
    word(7) < module.HEAPU8.byteLength;
}

function readInstruction(module, pointer, offset, available) {
  // native/bridge.cpp ABI: eight little-endian uint32 words.
  if (!Number.isInteger(pointer) || pointer < 0 || pointer > module.HEAPU8.byteLength - 32) {
    return { offset, length: 1, status: "invalid", error: "invalid-native-record" };
  }
  const record = new DataView(module.HEAPU8.buffer, pointer, 32);
  const word = index => record.getUint32(index * 4, true);
  if (word(0) === 0) {
    return { offset, length: 1, status: "invalid", error: "invalid-or-truncated" };
  }
  if (!validRecord(module, word, available)) {
    return { offset, length: 1, status: "invalid", error: "invalid-native-record" };
  }
  return { offset, length: word(1),
    status: ["invalid", "decoded", "soft-fail", "prefix"][word(0)],
    opcode: module.UTF8ToString(word(2)), flow: flows[word(3)],
    ...(word(4) ? { target: BigInt(word(6)) << 32n | BigInt(word(5)) } : {}),
    ...(word(7) ? { text: module.UTF8ToString(word(7)).trim() } : {}) };
}

function decodeBuffer(module, nativeDecode, bytes, { bitness = 64, address = 0n } = {}) {
  validateInput(bytes, bitness, address);
  const instructions = [];
  const input = module._input_buffer();
  for (let offset = 0; offset < bytes.length;) {
    // Intel SDM Vol. 2: maximum instruction length is 15 bytes.
    const count = Math.min(15, bytes.length - offset);
    const pc = BigInt.asUintN(64, address + BigInt(offset));
    module.HEAPU8.set(bytes.subarray(offset, offset + count), input);
    const pointer = nativeDecode(count, bitness, Number(pc & 0xffff_ffffn), Number(pc >> 32n));
    const instruction = readInstruction(module, pointer, offset, count);
    instructions.push(instruction);
    offset += instruction.length;
  }
  return instructions;
}

export function createDecoder(module) {
  return {
    decode: (bytes, options) => decodeBuffer(module, module._decode_full, bytes, options),
    decodeMetadata: (bytes, options) =>
      decodeBuffer(module, module._decode_metadata, bytes, options),
  };
}

export async function loadDisassembler(wasmBinary) {
  return createDecoder(await createModule({ wasmBinary }));
}
