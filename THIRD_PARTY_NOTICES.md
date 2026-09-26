# Third-party notices

The JavaScript wrapper is MIT licensed. The generated WebAssembly, printer and
metadata incorporate LLVM 21.1.8, licensed under Apache-2.0 WITH LLVM-exception.
The pinned commit and source archive checksum are in `upstream.json`.

The Emscripten 4.0.23 runtime contains components under the licenses distributed
in `licenses/`: Emscripten (MIT and University of Illinois/NCSA), LLVM libc++ and
compiler-rt (Apache-2.0 WITH LLVM-exception), and musl (MIT and component notices).
Redistributions must preserve these license texts and applicable notices.

`scripts/prepare-mc.mjs` adapts upstream X86 MC registration and replaces CPU
scheduling descriptors with the upstream default scheduling model. The upstream
decoder, instruction printer, feature tables, and instruction analysis are used
without semantic modifications. Metadata is generated from resolved LLVM TableGen
records, including verbatim predicate conditions.

The package has no runtime npm dependencies. Build and test tools are development
dependencies and are not included in the published package.
