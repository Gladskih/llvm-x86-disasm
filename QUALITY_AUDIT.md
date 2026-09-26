# CONTRIBUTING.md audit

Scope: the LLVM x86 WASM bridge, ESM loaders, wrapper, metadata generator, tests,
package contents and CI/release automation. binary101 and the sibling repositories
are not modified.

- Small modules with named responsibilities; no generic utility modules. Source
  functions stay below 50 lines and ESLint enforces complexity below 10. Double
  quotes, const by default, descriptive identifiers and no production console.log.
  Native decode validation is factored so its complexity is at most nine, including
  short-circuit boolean operators; decoder construction and other helpers stay below ten.
  Long tool invocation lines and verbatim upstream license text are intentional.
- No boolean flow-control parameters, argument-bag types, duplicated calculated
  addresses, DOM objects, runtime dependencies or external analysis services.
  Each instruction is decoded once; the metadata path never formats it.
- Uint8Array view boundaries, bitness, unsigned bigint addresses, native result
  pointers, lengths, statuses and string pointers are validated. Native reads are
  capped at 15 bytes. Invalid/truncated bytes yield visible diagnostic records and
  advance safely. Standalone prefixes have their own status. Buffers are not mutated.
- Instruction logic comes from checksum-pinned upstream LLVM source. Factory
  adaptation is source-hash guarded; scheduling-table extraction checks its schema.
  Feature predicates preserve authoritative TableGen expressions/C++ conditions.
  CPUID capability inference and post-corruption boundaries are explicitly limited.
- Byte arrays are already bounded inputs, with at most 15 bytes copied into WASM
  per instruction. No file parser, DOM renderer, application CSS or parseForUi
  contract is introduced; the binary101-specific I/O/UI rules do not apply here.
  README documents worker use, output-array memory costs and chunk boundary handling.
- Public modules have happy-path and invalid-input coverage, including mode/address
  extremes, truncated bytes, native ABI corruption, missing/malformed WASM, instance
  isolation, browser/worker loading, and bounded arbitrary-byte partitions.
  Validation, metadata and standalone-prefix regressions were observed failing
  before fixes. Focused mutation checks remove guards and alter results, restore
  each original file, and require a green baseline: 16/16 mutations killed.
- Wrapper coverage gates require 100% lines, branches and functions. Generated
  LLVM/Emscripten JS and feature data are excluded; this is not a claim of 100%
  upstream/native C++ coverage. Native behavior is tested through the WASM ABI.
  Tests use contract/encoding expectations rather than imported production constants;
  setup loops live in fixture functions. No redundant test:unit run is required.
- LLVM TableGen generation has nine focused Python tests, including unknown schemas,
  missing records and invalid expressions. TypeScript verifies public declarations
  and rejects unsupported modes/number addresses and formatted metadata access.
- Package verification enforces size budgets, WASM validity, checksums, exact dist
  contents and the narrow export surface. CI verifies license texts against source,
  tests the exact offline-installed tarball and records the link footprint.
  Local WSL and clean GitHub builds produced identical WASM SHA-256:
  `85626f44ead5b000cf2914e4837ddca0d21fc77cc1ff6b39c210516205e15ea5`.
- Commit messages use present-tense imperative wording. Releases are tag/version
  checked, publish the tested artifact, use least-privilege GitHub permissions and
  npm OIDC/provenance, and pin actions by immutable commit SHA. First publication
  still requires npm owner authentication before a trusted publisher can be added.
