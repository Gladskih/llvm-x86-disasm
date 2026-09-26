# llvm-x86-disasm

[![CI](https://github.com/Gladskih/llvm-x86-disasm/actions/workflows/ci.yml/badge.svg)](https://github.com/Gladskih/llvm-x86-disasm/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/llvm-x86-disasm)](https://www.npmjs.com/package/llvm-x86-disasm)

Local LLVM x86/x64 disassembly for browsers, Web Workers and Node.js. Designed for
binary101 entrypoint previews and comparison with iced-x86 and Intel XED. Ships
prebuilt WebAssembly, ESM and TypeScript declarations, with **zero runtime npm
dependencies**. Users do not need LLVM, Emscripten or a compiler.

```sh
npm install llvm-x86-disasm
```

```js
import { createDisassembler, getInstructionRequirements } from "llvm-x86-disasm";

const decoder = await createDisassembler();
const instructions = decoder.decode(Uint8Array.of(0x48, 0x89, 0xe5, 0xc3), {
  bitness: 64,
  address: 0x140001000n,
});
const requirements = getInstructionRequirements(instructions[0].opcode);
```

## API

`createDisassembler({ wasmBinary?, wasmURL? })` asynchronously creates an isolated
instance. In browsers the default URL is relative to the packaged JS asset; Node
reads the local file. Bundlers should emit/copy `llvm-x86.wasm` as an asset, or
provide its URL explicitly. The WASM has its own export path for asset resolution.
Use `wasmBinary: Uint8Array` to bypass fetching entirely. Browser assets can be
served from your application origin; no CDN or analysis service is required.

`decode(bytes, { bitness = 64, address = 0n })` returns instruction records with
`offset`, `length`, `status`, LLVM `opcode`, Intel-syntax `text`, control-flow `flow`
and an optional direct `target` as bigint. Text retains LLVM's tab spacing. Offsets
are relative to the supplied Uint8Array view. Addresses wrap modulo 2^64, including
in 16/32-bit modes: targets are LLVM's MC analysis results, not a simulation of
segmented execution. Indirect targets are omitted.

`decodeMetadata(bytes, options)` uses the same decoder, boundaries and metadata
without invoking the instruction printer or returning text. Use this path for
bulk classification and compare it separately from formatted disassembly.

Successful records have status `decoded`, LLVM `soft-fail`, or `prefix`. A standalone
LLVM prefix record (`data16`, `lock`, etc.) has status `prefix`; it is **not a complete
CPU instruction**. Failed records have status `invalid` and error `invalid-or-truncated`:
LLVM's API does not reliably distinguish these cases. Failures consume one byte for
conservative resynchronization; all decode calls make bounded forward progress.
Do not infer a reliable code boundary after corrupt bytes.

Malformed file bytes produce diagnostic records. Incorrect API arguments (non-byte
arrays, unsupported bitness, non-bigint or out-of-range addresses) throw before
entering native code. Missing or malformed WASM assets reject initialization.
Decode bounded sections/chunks in a worker for large files. The wrapper copies at
most 15 input bytes per instruction; the returned result array still takes memory
proportional to the number of records. Keep up to 14 bytes across chunk boundaries
and decode the final tail only once its actual extent is known.

## Metadata and ISA limits

`getInstructionRequirements(opcode)` returns the resolved TableGen assembler
predicate expressions and separate `nonAssemblerPredicates` with **verbatim C++
conditions**. Unknown opcodes return `undefined`; known empty predicate lists mean
that LLVM declares none there, not that an instruction requires no ISA extensions.
`features` exposes LLVM feature names, descriptions, field names and implications.
Treat these shared metadata objects as read-only.

LLVM x86 instruction-selection predicates are not a canonical CPUID or ISA-set
database. Conditions such as `NoVLX` may express code-generator preferences rather
than hardware restrictions; some opcodes have no predicates despite requiring a
particular mode, and APX register extensions can share opcode names with ordinary
register encodings. This package deliberately does not guess CPUID requirements
from mnemonics. It is suitable for decoding and inspecting LLVM metadata; use a
separately validated capability mapping or iced/XED for definitive ISA checking.
Decoding success alone never proves processor or OS execution support.

Sources: pinned [X86InstrPredicates.td](https://github.com/llvm/llvm-project/blob/2078da43e25a4623cab2d0d60decddf709aaea28/llvm/lib/Target/X86/X86InstrPredicates.td),
[X86Disassembler.cpp](https://github.com/llvm/llvm-project/blob/2078da43e25a4623cab2d0d60decddf709aaea28/llvm/lib/Target/X86/Disassembler/X86Disassembler.cpp),
and [X86MCTargetDesc.cpp](https://github.com/llvm/llvm-project/blob/2078da43e25a4623cab2d0d60decddf709aaea28/llvm/lib/Target/X86/MCTargetDesc/X86MCTargetDesc.cpp).
LLVM opcode names are version-specific and must not be persisted as stable identifiers.

## Size and build scope

LLVM 21.1.8 / Emscripten 4.0.23, pinned by commit; LLVM source archive verified by
SHA-256. WASM is approximately **1.87 MB raw / 554 KB gzip**. `dist/build-info.json`
records exact sizes, checksums and toolchain pins for each build.

Only X86 MC disassembly, Intel formatting, instruction information and control-flow
analysis are registered. No assembler, encoder, object writers, LLVM IR, optimization
passes or code generator is exposed. `-Oz`, LTO, disabled exceptions/RTTI/threads,
and removal of CPU scheduling models reduce the runtime. Feature/mode logic and
upstream instruction semantics remain intact. Size budgets and link-footprint
checks prevent accidental growth.

## Development and release

See [CONTRIBUTING.md](CONTRIBUTING.md) for the quality gate. Linux or WSL requires
CMake, Ninja, a host C++ compiler, Python 3, curl, git, and Node 24/npm. The build
downloads the pinned LLVM/Emscripten sources and builds host llvm-tblgen first.

```sh
npm ci
npm run build:wasm
npm run lint
npm run test:coverage
npm run test:types
npm run test:mutation
python3 -m unittest discover -s test -p '*_test.py'
npx playwright install chromium
npm run test:browser
npm run verify:package
```

`BUILD_DIR`, `JOBS`, `LLVM_SOURCE`, and `EMSDK_ROOT` support local build directories
and reuse of the exact pinned toolchain. Do not reuse build directories after
changing the toolchain pins. `npm run build` assembles the package from built artifacts.
Generated files and toolchains are not committed.

CI rebuilds WASM from pinned sources, runs coverage, focused mutation checks,
browser/worker tests and an offline installation of the **exact npm tarball**.
Tag `v<package version>` triggers `publish.yml`, which repeats verification and
publishes that tested artifact using npm Trusted Publishing/OIDC with provenance.
No npm token secret is used. All GitHub Actions are pinned by full commit SHA;
Dependabot maintains updates. Release assets include the tarball and its checksum.

For a new package, npm currently requires a first authenticated publication before
trust can be configured. After that publication, the owner runs:

```sh
npm trust github llvm-x86-disasm --file publish.yml \
  --repo Gladskih/llvm-x86-disasm --allow-publish --yes
```

See [npm trust prerequisites](https://docs.npmjs.com/cli/v11/commands/npm-trust/).
The workflow is rerunnable and verifies integrity if that exact version already exists.

License: MIT wrapper; LLVM and toolchain components retain their original licenses.
See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and `licenses/`.
