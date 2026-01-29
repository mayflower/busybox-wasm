// Deno runner for busybox-wasm (ES module build).
// Provides a simple API for executing BusyBox commands with an in-memory FS.

export interface BusyboxFile {
  path: string;
  content: string | Uint8Array;
}

export interface RunOptions {
  args: string[];
  cwd?: string;
  stdin?: string;
  files?: BusyboxFile[];
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

type BusyboxModule = {
  FS: any;
  callMain: (args: string[]) => void;
  quit?: (status: number, toThrow?: unknown) => void;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
  stdin?: () => number | null;
  noExitRuntime?: boolean;
  noInitialRun?: boolean;
};

type BusyboxModuleFactory = (options: Record<string, unknown>) => Promise<BusyboxModule>;

async function loadDefaultFactory(): Promise<BusyboxModuleFactory> {
  const candidates = ["../busybox.js", "../build/wasm/busybox_unstripped.js"];
  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const moduleUrl = new URL(candidate, import.meta.url);
      const mod = await import(moduleUrl.href);
      if (mod?.default) {
        return mod.default as BusyboxModuleFactory;
      }
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error("Unable to locate busybox.js module factory");
}

function ensureDir(fs: any, path: string): void {
  const parts = path.split("/").filter(Boolean);
  if (parts.length < 2) {
    return;
  }
  let current = "";
  for (const part of parts.slice(0, -1)) {
    current += `/${part}`;
    try {
      fs.mkdir(current);
    } catch (err) {
      const code = err?.code ?? err?.errno ?? "";
      if (code && code !== "EEXIST") {
        // Ignore existing directories, rethrow everything else.
        throw err;
      }
    }
  }
}

function toBytes(input: string): Uint8Array {
  return new TextEncoder().encode(input);
}

export async function createBusyboxRunner(
  factory?: BusyboxModuleFactory,
): Promise<{ run: (options: RunOptions) => Promise<RunResult> }> {
  const createModule = factory ?? await loadDefaultFactory();
  let moduleInstance: BusyboxModule | null = null;
  let wasmPath = "busybox.wasm";

  async function initModule(): Promise<BusyboxModule> {
    if (moduleInstance) {
      return moduleInstance;
    }

    const moduleBase = new URL("../", import.meta.url);
    const module = await createModule({
      noInitialRun: true,
      noExitRuntime: true,
      locateFile(path: string) {
        wasmPath = path;
        return new URL(path, moduleBase).href;
      },
      async instantiateWasm(imports: WebAssembly.Imports, successCallback: (instance: WebAssembly.Instance) => void) {
        const wasmUrl = new URL(wasmPath, moduleBase);
        const wasmBinary = await Deno.readFile(wasmUrl);
        const { instance } = await WebAssembly.instantiate(wasmBinary, imports);
        successCallback(instance);
        return instance.exports;
      },
    });

    moduleInstance = module;
    return module;
  }

  async function run(options: RunOptions): Promise<RunResult> {
    const module = await initModule();

    const stdout: string[] = [];
    const stderr: string[] = [];
    let exitCode = 0;

    module.print = (text: string) => stdout.push(text);
    module.printErr = (text: string) => stderr.push(text);

    if (options.stdin) {
      const bytes = toBytes(options.stdin);
      let offset = 0;
      module.stdin = () => (offset < bytes.length ? bytes[offset++] : null);
    } else {
      module.stdin = () => null;
    }

    if (options.files?.length) {
      for (const file of options.files) {
        ensureDir(module.FS, file.path);
        const content = typeof file.content === "string" ? file.content : file.content;
        module.FS.writeFile(file.path, content, {
          encoding: typeof file.content === "string" ? "utf8" : "binary",
        });
      }
    }

    if (options.cwd) {
      module.FS.chdir(options.cwd);
    }

    const originalQuit = module.quit;
    module.quit = (status: number, toThrow?: unknown) => {
      exitCode = status;
      if (toThrow) {
        throw toThrow;
      }
      throw new Error("ExitStatus");
    };

    try {
      module.callMain(options.args);
    } catch (err) {
      const name = (err && typeof err === "object") ? (err as { name?: string }).name : undefined;
      const message = (err && typeof err === "object") ? (err as { message?: string }).message : undefined;
      if (name != "ExitStatus" && message != "ExitStatus") {
        throw err;
      }
    } finally {
      module.quit = originalQuit;
    }

    return {
      stdout: stdout.join("\n"),
      stderr: stderr.join("\n"),
      exitCode,
    };
  }

  return { run };
}
