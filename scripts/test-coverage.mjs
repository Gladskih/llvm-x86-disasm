import { execFileSync } from "node:child_process";

execFileSync(process.execPath, ["--test", "--experimental-test-coverage",
  "--test-coverage-exclude=test/**", "--test-coverage-exclude=dist/llvm-x86.js",
  "--test-coverage-exclude=dist/features.js", "--test-coverage-lines=100",
  "--test-coverage-branches=100", "--test-coverage-functions=100", "test/*.test.mjs"],
{ stdio: "inherit" });
