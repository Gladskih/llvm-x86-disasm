# Security policy

Use the latest published release. Report vulnerabilities privately through the
repository's GitHub security advisory page; avoid posting sensitive reproductions
in public issues. The decoder handles untrusted bytes locally. Decode large inputs
in bounded chunks and a worker so malformed data cannot monopolize the UI thread.

Release artifacts are built from pinned LLVM/Emscripten sources and include
checksums and npm provenance. Runtime consumers do not execute install scripts.
