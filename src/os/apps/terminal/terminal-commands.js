/**
 * @file src/os/apps/terminal/terminal-commands.js
 * @description Define la logica pura de los comandos del sistema
 * *@typedef {Object} CommandContext
 * @property {Function} print - (text, color) => void
 * @property {Function} clear = () => void
 * @property {string[]} currentPath - Stack actual de directorios
 * @property {Function} updatePath - (newStack) => void
 */

import { fs } from '../../../filesystem/vfs.js';
import { desktop } from '../../gui/desktop.js';

// Utilidades privadas

/**
 * Resuelve una ruta (relativa o absoluta) a un stack de directorios.
 * Maneja '..', '.', y rutas compuestas 'folder/subfolder'.
 * @param {string} inputPath
 * @param {string[]} currentStack
 * @returns {string[]} El nuevo stack de directorios
 */
function resolvePath(inputPath, currentStack) { 
    if (!inputPath) return currentStack;

    // 1. Si empieza con '/', es absoluta (desde root)
    let stack = inputPath.startsWith('/') ? [] : [...currentStack];

    // 2. Normalizar slashes
    const parts = inputPath.replace(/\\/g, '/').split('/');

    for (const part of parts) {
        if (part === '' || part === '.') continue;

        if (part === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }
    return stack;
}

/**
 * Formatea un nodo del VFS para mostrarlo en lista
 */
function formatDirItem(name, node) {
    // Espaciado fijo para simular columnas (padding manual)
    const namePad = name.padEnd(20, ' ');
    const type = node.type === 'dir' ? '<DIR> ' : '      ';
    
    // -------- Agregar tamaño de archivos en el futuro tal vez? -----------
    return `${type} ${namePad}`;
}

// Registro de comandos

export const COMMAND_REGISTRY = {

    /**
     * @command help
     */
    help: (args, ctx) => {
        const c = '#fff';
        const g = '#aaa';

        ctx.print('--- Web95 Command List ---', c);
        ctx.print(' FILE OPERATIONS:', g);
        ctx.print('  dir / ls       : List contents of current directory.');
        ctx.print('  cd <path>      : Change a directory (supports ".." and relative path).');
        ctx.print('  mkdir <name>   : Create a new directory.');
        ctx.print('  rm <path>      : Delete a file or directory.');
        ctx.print('  cat <file>     : Display file content.');
        ctx.print(' ');
        ctx.print(' SYSTEM:', g);
        ctx.print('  cls / clear    : Clear the screen.');
        ctx.print('  whoami         : Display current user.');
        ctx.print('  date           : Display current system time.');
        ctx.print('  echo <text>    : Print text to the console.');
    },

    /**
     * @command cls
     */
    cls: (args, ctx) => ctx.clear(),
    clear: (args, ctx) => ctx.clear(),

    /**
     * @command echo
     */
    echo: (args, ctx) => {
        ctx.print(args.join(' '));
    },

    /**
     * @command whoami
     */
    whoami: (args, ctx) => {
        ctx.print('root (Administrator)', '#00ffff');
    },

    /**
     * @command date
     */
    date: (args, ctx) => {
        ctx.print(new Date().toString());
    },

    /**
     * @command ls / dir
     */
    ls: (args, ctx) => runDir(args, ctx),
    dir: (args, ctx) => runDir(args, ctx),

    /**
     * @command cd
     */
    cd: (args, ctx) => {
        const target = args[0];

        // Caso: cd solo -> ir a raiz
        if (!target) {
            ctx.updatePath([]);
            return;
        }

        // 1. Calcular ruta destino propuesta
        const newStack = resolvePath(target, ctx.currentPath);
        const pathStr = newStack.join('/');

        // 2. Verificar existencia en VFS
        const node = fs.resolve(pathStr);

        if (!node) {
            ctx.print(`Path not found: "${target}"`, '#ff5555');
            return;
        }
        if (node.type !== 'dir') {
            ctx.print(`Directory name is invalid: "${target}"`, '#ff5555');
            return;
        }

        // 3. Aplicar cambio
        ctx.updatePath(newStack);
    },

    /**
     * @command mkdir
     */
    mkdir: (args, ctx) => {
        if (!args[0]) return ctx.print('Usage: mkdir <name>', '#ff5555');

        const targetPath = args[0];
        // Resolver ruta completa (permite mkdir folder/subfolder)
        const stack = resolvePath(targetPath, ctx.currentPath);
        const fullPath = stack.join('/');

        try {
            fs.mkdir(fullPath);
            desktop.render(); // Actualiza escritorio inmediatamente
            ctx.print(`Directory created.`);
        } catch (e) {
            ctx.print(`Error: ${e.message}`, '#ff5555');
        }
    },

    /**
     * @command rm
     */
    rm: (args, ctx) => {
        if (!args[0]) return ctx.print('Usage: rm <path>', '#ff5555');

        const targetPath = args[0];
        const stack = resolvePath(targetPath, ctx.currentPath);
        const fullPath = stack.join('/');

        try {
            // Protecccion contra borrar root
            if (fullPath === '') throw new Error("Cannot delete root directory.");

            fs.delete(fullPath);
            desktop.render(); // Actualiza escritorio inmediatamente
            ctx.print(`Delete: ${targetPath}`);
        } catch (e) {
            ctx.print(`Error: ${e.message}`, '#ff5555');
        }
    },

    /**
     * @command cat
     */
    cat: (args, ctx) => {
        if (!args[0]) return ctx.print('Usage: cat <filename>', '#ff5555');

        const targetPath = args[0];
        const stack = resolvePath(targetPath, ctx.currentPath);
        const fullPath = stack.join('/');

        try {
            const content = fs.read(fullPath);
            ctx.print(content);
        } catch (e) {
            ctx.print(`Error: ${e.message}`, '#ff5555');
        }
    }
};

// Helpers de comandos

function runDir(args, ctx) {
    try {
        // Por defecto lista el actual, o el argumento si se provee
        const targetPath = args[0] || '';
        const stack = resolvePath(targetPath, ctx.currentPath);
        const pathStr = stack.join('/');

        const files = fs.dir(pathStr);

        if (files.length === 0) {
            ctx.print('(Empty directory)', '#888');
            return;
        }

        ctx.print(`Directory of C:\\${stack.join('\\')}`);
        ctx.print('');

        files.forEach(fileName => {
            // Resolver nodo para ver metadata
            const fullPath = pathStr ? `${pathStr}/${fileName}` : fileName;
            const node = fs.resolve(fullPath);

            if (node) {
                ctx.print(formatDirItem(fileName, node));
            }
        });

        ctx.print('');
        ctx.print(`  ${files.length} File(s)`);
    } catch (e) {
        ctx.print(`Error listing directory: ${e.message}`, '#ff5555');
    }
}
