// em-shell.js - Emscripten JS library for vfork/exec emulation
// Updated for Emscripten 3.x

mergeInto(LibraryManager.library, {
    js_fork__sig: 'i',
    js_fork: function() {
        // In a web worker context, this would call workerFork()
        // For standalone builds, return a fake PID
        if (typeof workerFork !== 'undefined') {
            return workerFork();
        }
        return 100; // fake child PID
    },

    js_unfork__sig: 'vi',
    js_unfork: function(status) {
        // In a web worker context, this would call workerUnfork()
        if (typeof workerUnfork !== 'undefined') {
            return workerUnfork(status);
        }
        // standalone: do nothing
    },

    js_spawn__sig: 'ipp',
    js_spawn: function(file, argv) {
        // In a web worker context, this would call workerSpawn()
        if (typeof workerSpawn !== 'undefined') {
            return workerSpawn(file, argv);
        }
        // standalone: return ENOSYS (function not implemented)
        return 38;
    },

    js_waitpid__sig: 'iipp',
    js_waitpid: function(childPid, statusPtr, options) {
        // In a web worker context, this would call workerWaitpid()
        if (typeof workerWaitpid !== 'undefined') {
            return workerWaitpid(childPid, statusPtr, options);
        }
        // standalone: return -1 with ECHILD
        return -1;
    }
});
