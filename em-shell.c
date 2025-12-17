#include "em-shell.h"
#include <emscripten.h>
#include <errno.h>

#undef _exit

jmp_buf vfork_jump_buffer;
static int vfork_child_active = 0;
static int vfork_child_pid = 0;

// JS function declarations - implemented in em-shell.js
extern int js_fork(void);
extern void js_unfork(int status);
extern int js_spawn(const char *file, char *const argv[]);

int em_vfork(int is_parent) {
    if (is_parent) {
        vfork_child_active = 0;
        errno = 0;
        return vfork_child_pid;
    }
    else {
        vfork_child_active = 1;
        vfork_child_pid = js_fork();
        return 0;
    }
}

void em_exit(int status) {
    if (vfork_child_active) {
        js_unfork(status);
        longjmp(vfork_jump_buffer, 1);
    } else
        _exit(status);
}

int em_execvp(const char *file, char *const argv[]) {
    errno = js_spawn(file, argv);
    if (errno)
        return -1;
    else if (vfork_child_active)
        longjmp(vfork_jump_buffer, 1);
    else
        _exit(0);
}
