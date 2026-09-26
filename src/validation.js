export function validateInput(bytes, bitness, address) {
  if (!(bytes instanceof Uint8Array)) throw new TypeError("bytes must be a Uint8Array");
  if (![16, 32, 64].includes(bitness)) throw new RangeError("bitness must be 16, 32, or 64");
  if (typeof address !== "bigint" || address < 0n || address > 0xffff_ffff_ffff_ffffn) {
    throw new RangeError("address must be an unsigned 64-bit bigint");
  }
}
