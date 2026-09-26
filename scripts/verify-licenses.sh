#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BUILD=${BUILD_DIR:-"$ROOT/.build"}
SOURCE=${LLVM_SOURCE:-"$BUILD/llvm"}
SDK=${EMSDK_ROOT:-"$BUILD/emsdk"}
cmp "$SOURCE/LICENSE.TXT" "$ROOT/licenses/LLVM.txt"
cmp "$SDK/upstream/emscripten/LICENSE" "$ROOT/licenses/emscripten-LICENSE.txt"
cmp "$SDK/upstream/emscripten/AUTHORS" "$ROOT/licenses/emscripten-AUTHORS.txt"
cmp "$SDK/upstream/emscripten/system/lib/libc/musl/COPYRIGHT" "$ROOT/licenses/musl.txt"
cmp "$SDK/upstream/emscripten/system/lib/libcxx/LICENSE.TXT" "$ROOT/licenses/libcxx.txt"
cmp "$SDK/upstream/emscripten/system/lib/compiler-rt/LICENSE.TXT" "$ROOT/licenses/compiler-rt.txt"
