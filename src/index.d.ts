export interface DecodeOptions {
  bitness?: 16 | 32 | 64;
  /** Unsigned 64-bit starting address; arithmetic wraps modulo 2^64. */
  address?: bigint;
}
export interface LoadOptions {
  wasmBinary?: Uint8Array;
  /** Browser: local asset URL. Node: file path or file URL. */
  wasmURL?: string | URL;
}
export interface InstructionMetadata {
  readonly offset: number;
  readonly length: number;
  /** prefix is a standalone LLVM prefix record, not a complete CPU instruction. */
  readonly status: "decoded" | "soft-fail" | "prefix";
  /** LLVM internal opcode name; stable only for the pinned LLVM revision. */
  readonly opcode: string;
  readonly flow: "none" | "call" | "return" | "conditional-branch" |
    "unconditional-branch" | "indirect-branch";
  /** LLVM-evaluated direct target. No target for register/memory indirect branches. */
  readonly target?: bigint;
}
export interface DecodedInstruction extends InstructionMetadata {
  readonly text: string;
}
export interface InvalidInstruction {
  readonly offset: number;
  readonly length: number;
  readonly status: "invalid";
  readonly error: "invalid-or-truncated" | "invalid-native-record";
}
export type DecodeResult = DecodedInstruction | InvalidInstruction;
export type MetadataResult = InstructionMetadata | InvalidInstruction;
export interface Disassembler {
  decode(bytes: Uint8Array, options?: DecodeOptions): DecodeResult[];
  /** Same decoder and instruction boundaries, without printing assembly text. */
  decodeMetadata(bytes: Uint8Array, options?: DecodeOptions): MetadataResult[];
}
export type FeatureExpression = boolean | { feature: string } |
  { all_of: FeatureExpression[] } | { any_of: FeatureExpression[] } |
  { not: FeatureExpression };
export interface InstructionRequirements {
  predicates: { name: string; expression: FeatureExpression }[];
  /** Verbatim instruction-selection conditions, not CPUID requirements. */
  nonAssemblerPredicates: { name: string; condition: string }[];
}
export const features: Record<string, {
  llvmName: string;
  description: string;
  llvmField: string;
  implies: string[];
}>;
export function getInstructionRequirements(opcode: string): InstructionRequirements | undefined;
export function createDisassembler(options?: LoadOptions): Promise<Disassembler>;
