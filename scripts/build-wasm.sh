#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUILD=${BUILD_DIR:-"$ROOT/.build"}
mkdir -p "$BUILD" "$ROOT/artifacts"
BUILD=$(cd "$BUILD" && pwd)
JOBS=${JOBS:-4}
readarray -t PINS < <(python3 -c 'import json,sys; p=json.load(open(sys.argv[1])); print(p["llvmCommit"]); print(p["emsdkCommit"]); print(p["emscriptenVersion"]); print(p["llvmArchiveSha256"])' "$ROOT/upstream.json")
SOURCE=${LLVM_SOURCE:-"$BUILD/llvm"}
SDK=${EMSDK_ROOT:-"$BUILD/emsdk"}
if [[ ! -f "$SOURCE/.source-commit" ]]; then
  curl -fL --retry 3 "https://codeload.github.com/llvm/llvm-project/tar.gz/${PINS[0]}" -o "$BUILD/llvm.tar.gz"
  echo "${PINS[3]}  $BUILD/llvm.tar.gz" | sha256sum --check
  mkdir -p "$SOURCE"
  tar -xzf "$BUILD/llvm.tar.gz" --strip-components=1 -C "$SOURCE"
  echo "${PINS[0]}" > "$SOURCE/.source-commit"
fi
[[ $(cat "$SOURCE/.source-commit") == "${PINS[0]}" ]]
if [[ ! -d "$SDK/.git" ]]; then
  git clone https://github.com/emscripten-core/emsdk.git "$SDK"
fi
git -C "$SDK" fetch origin "${PINS[1]}"
git -C "$SDK" checkout --detach "${PINS[1]}"
"$SDK/emsdk" install "${PINS[2]}"
"$SDK/emsdk" activate "${PINS[2]}"
set +u
source "$SDK/emsdk_env.sh"
set -u
COMMON=(-G Ninja -DCMAKE_BUILD_TYPE=Release -DLLVM_TARGETS_TO_BUILD=X86
  -DLLVM_INCLUDE_TESTS=OFF -DLLVM_INCLUDE_BENCHMARKS=OFF
  -DLLVM_ENABLE_ZSTD=OFF -DLLVM_ENABLE_ZLIB=OFF -DLLVM_ENABLE_LIBXML2=OFF
  -DLLVM_ENABLE_TERMINFO=OFF -DLLVM_ENABLE_LIBEDIT=OFF
  -DLLVM_ENABLE_BINDINGS=OFF -DLLVM_INCLUDE_EXAMPLES=OFF)
cmake -S "$SOURCE/llvm" -B "$BUILD/host" "${COMMON[@]}"
cmake --build "$BUILD/host" --target llvm-tblgen -j "$JOBS"
"$BUILD/host/bin/llvm-tblgen" --dump-json -I "$SOURCE/llvm/include" \
  -I "$SOURCE/llvm/lib/Target/X86" "$SOURCE/llvm/lib/Target/X86/X86.td" \
  -o "$BUILD/x86-records.json"
python3 "$ROOT/scripts/generate-metadata.py" "$BUILD/x86-records.json" "$ROOT/artifacts/features.js"
emcmake cmake -S "$SOURCE/llvm" -B "$BUILD/wasm" "${COMMON[@]}" \
  -DLLVM_HOST_TRIPLE=wasm32-unknown-emscripten \
  -DLLVM_DEFAULT_TARGET_TRIPLE=x86_64-none-unknown \
  -DLLVM_TABLEGEN="$BUILD/host/bin/llvm-tblgen" -DLLVM_ENABLE_THREADS=OFF \
  -DLLVM_ENABLE_BACKTRACES=OFF -DLLVM_ENABLE_UNWIND_TABLES=OFF \
  -DCMAKE_C_FLAGS_RELEASE='-Oz -DNDEBUG -flto' \
  -DCMAKE_CXX_FLAGS_RELEASE='-Oz -DNDEBUG -flto'
cmake --build "$BUILD/wasm" --target LLVMX86Disassembler LLVMX86Desc LLVMX86Info -j "$JOBS"
emcmake cmake -S "$ROOT/native" -B "$BUILD/bridge" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release -DLLVM_DIR="$BUILD/wasm/lib/cmake/llvm" \
  -DLLVM_SOURCE_ROOT="$SOURCE/llvm" -DLLVM_BUILD_ROOT="$BUILD/wasm"
cmake --build "$BUILD/bridge" -j "$JOBS"
node "$ROOT/scripts/verify-footprint.mjs" "$BUILD/bridge"
cp "$BUILD/bridge/llvm-x86.js" "$BUILD/bridge/llvm-x86.wasm" "$ROOT/artifacts/"
node "$ROOT/scripts/build-manifest.mjs"
node "$ROOT/scripts/build.mjs"
