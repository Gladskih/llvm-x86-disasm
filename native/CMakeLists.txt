cmake_minimum_required(VERSION 3.20)
project(x86_disasm LANGUAGES C CXX)
file(READ "${CMAKE_CURRENT_SOURCE_DIR}/../upstream.json" UPSTREAM_JSON)
string(JSON PINNED_LLVM_VERSION GET "${UPSTREAM_JSON}" llvmVersion)
find_package(LLVM ${PINNED_LLVM_VERSION} EXACT REQUIRED CONFIG)
find_program(NODE_EXECUTABLE node REQUIRED)
set(X86_SOURCE "${LLVM_SOURCE_ROOT}/lib/Target/X86")
set(MINIMAL_MC "${CMAKE_CURRENT_BINARY_DIR}/X86DisassemblyMC.cpp")
add_custom_command(OUTPUT "${MINIMAL_MC}"
  COMMAND "${NODE_EXECUTABLE}" "${CMAKE_CURRENT_SOURCE_DIR}/../scripts/prepare-mc.mjs"
    "${X86_SOURCE}/MCTargetDesc/X86MCTargetDesc.cpp"
    "${LLVM_BUILD_ROOT}/lib/Target/X86/X86GenSubtargetInfo.inc" "${MINIMAL_MC}"
  DEPENDS "${CMAKE_CURRENT_SOURCE_DIR}/../scripts/prepare-mc.mjs"
    "${X86_SOURCE}/MCTargetDesc/X86MCTargetDesc.cpp"
    "${LLVM_BUILD_ROOT}/lib/Target/X86/X86GenSubtargetInfo.inc" VERBATIM)
add_executable(llvm-x86 bridge.cpp "${MINIMAL_MC}")
target_compile_features(llvm-x86 PRIVATE cxx_std_17)
target_include_directories(llvm-x86 PRIVATE ${LLVM_INCLUDE_DIRS}
  "${X86_SOURCE}" "${X86_SOURCE}/MCTargetDesc" "${LLVM_BUILD_ROOT}/lib/Target/X86")
target_compile_definitions(llvm-x86 PRIVATE ${LLVM_DEFINITIONS})
llvm_map_components_to_libnames(LLVM_LIBS X86Disassembler X86Desc X86Info MCDisassembler MC Support)
target_link_libraries(llvm-x86 PRIVATE ${LLVM_LIBS})
target_compile_options(llvm-x86 PRIVATE -Oz -flto -fno-exceptions -fno-rtti)
target_link_options(llvm-x86 PRIVATE -Oz -flto --no-entry
  "-Wl,-Map=${CMAKE_BINARY_DIR}/llvm-x86.map"
  "-Wl,--why-extract=${CMAKE_BINARY_DIR}/archive-inputs.tsv"
  "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sENVIRONMENT=web,worker,node"
  "-sALLOW_MEMORY_GROWTH=1" "-sFILESYSTEM=0" "-sASSERTIONS=0" "-sSTACK_SIZE=1048576"
  "-sEXPORTED_FUNCTIONS=['_decode_full','_decode_metadata','_input_buffer']"
  "-sEXPORTED_RUNTIME_METHODS=['UTF8ToString','HEAPU8']")
set_target_properties(llvm-x86 PROPERTIES SUFFIX ".js")
