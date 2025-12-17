## BusyBox + Emscripten + nanozip + diff3

[![Build](https://github.com/mayflower/busybox-wasm/actions/workflows/make.yml/badge.svg)](https://github.com/mayflower/busybox-wasm/actions/workflows/make.yml)

BusyBox compiled to WebAssembly using Emscripten. This repo contains build scripts without being a full fork of BusyBox, making version upgrades easier.

**Current versions:** BusyBox 1.37.0, Emscripten 4.x

### Download

Pre-built binaries are available on the [Releases](https://github.com/mayflower/busybox-wasm/releases) page:
- `busybox-linux-x86_64` - Native Linux binary
- `busybox.js` / `busybox.wasm` - WebAssembly build

### Build

Requires [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) for WASM builds.

```shell
# native version
make build/native/busybox

# wasm version
make build/wasm/busybox_unstripped.js
```

### Custom Applets

This repo includes two [custom](https://git.busybox.net/busybox/plain/docs/new-applet-HOWTO.txt) BusyBox applets:

- [nanozip](https://github.com/vadimkantorov/nanozip) - [miniz](https://github.com/richgel999/miniz)-based imitation of `zip` utility:
  ```
  busybox nanozip [-r] [[-x EXCLUDED_PATH] ...] OUTPUT_NAME.zip INPUT_PATH [...]
  ```

- [diff3](https://github.com/openbsd/src/blob/master/usr.bin/diff3/diff3prog.c) - OpenBSD-based implementation of diff3:
  ```
  busybox diff3 [-exEX3] /tmp/d3a.?????????? /tmp/d3b.?????????? file1 file2 file3
  ```

### Credits

The `em-shell.c`, `em-shell.h`, `em-shell.js` files are based on the excellent work by [Todd Fleming](https://tbfleming.github.io/):
- [tbfleming/em-shell](https://github.com/tbfleming/em-shell)
- [tbfleming/em-busybox](https://github.com/tbfleming/em-busybox)

These have been updated for modern Emscripten (4.x) compatibility.
