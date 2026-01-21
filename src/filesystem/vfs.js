/**
 * @file sc/filesystem/vfs.js
 * @description Virtual File System Manager (v2.0).
 * Soporta operaciones CRUD completas: Read, Write, Delete, Mkdir, Rename.
 */

import { INITIAL_DISK } from "./disk.js";

const STORAGE_KEY = 'web95_hdd_v1';

class VirtualFileSystem {
    constructor() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if(savedData) {
            console.log('[VFS] Hard Drive loaded from storage.');
            this.root = JSON.parse(savedData);
        } else{
            console.log('[VFS] Formatting new disk... ');
            this.root = JSON.parse(JSON.stringify(INITIAL_DISK));
            this.save();
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
    }

    /**
     * Navega por el arbol de directorios.
     */
    resolve(path) {
        if (path === '' || path === '/') return this.root;
        const parts = path.split('/').filter(p => p.length > 0);

        let current = this.root;
        for (const part of parts) {
            if (current.type !== 'dir' || !current.children[part]) {
                return null;
            }
            current = current.children[part];
        }
        return current;
    }

    /**
     * Resuelve el padre de una uta y el nombre del archivo/carpeta final.
     * Utilidad interna para operaciones de escritura/borrado.
     */
    _resolveParent(path) {
        const parts = path.split('/').filter(p => p.length > 0);
        if (parts.length === 0) return null; // Es la raiz

        const fileName = parts.pop();
        const parentPath = parts.join('/');
        const parentNode = parentPath === '' ? this.root : this.resolve(parentPath);

        return { parentNode, fileName };
    }

    read(path) {
        const node = this.resolve(path);
        if (!node) throw new Error(`File not found: ${path}`);
        if (node.type !== 'file') throw new Error(`Path is a directory: ${path}`);
        return node.content;
    }

    write(path,content) {
        // 1. Verificar si ya existe para actualizar
        const existingNode = this.resolve(path);
        if (existingNode) {
            if (existingNode.type !== 'file') throw new Error(`Cannot write to directory: ${path}`);
            existingNode.content = content;
            this.save();
            return;
        }

        // 2. Si no existe, crear nuevo
        const res = this._resolveParent(path);
        if (!res || !res.parentNode || res.parentNode.type !== 'dir') {
            throw new Error (`Parent directory not found for: ${path}`);
        }

        res.parentNode.children[res.fileName] = {
            type: 'file',
            content: content,
            meta: {}
        };
        this.save();
    }

    dir(path = '') {
        const node = path === '' ? this.root : this.resolve(path);
        if (!node || node.type !== 'dir') throw new Error (`Invalid directory: ${path}`);
        return Object.keys(node.children);
    }

    updateMeta(path, newMeta) {
        const node = this.resolve(path);
        if (node) {
            if (!node.meta) node.meta = {};
            Object.assign(node.meta, newMeta);
            this.save();
        }
    }

    /**
     * Crea un directorio nuevo.
     * @param {string} path - Ruta compelta 
     */
    mkdir(path) {
        if (this.resolve(path)) throw new Error(`Path already exists: ${path}`);

        const res = this._resolveParent(path);
        if (!res || !res.parentNode || res.parentNode.type !== 'dir') {
            throw new Error (`Parent directory not found for: ${path}`);
        }

        res.parentNode.children[res.fileName] = {
            type: 'dir',
            children: {},
            meta: {}
        };
        this.save();
        console.log(`[VFS] Directory created: ${path}`);
    }

    /**
     * Elimina un archivo o directorio
     * @param {string} path
     */
    delete(path) {
        if(path == '' || path === '/') throw new Error ("Cannot delete root.");

        const res = this._resolveParent(path);
        if (!res || !res.parentNode) throw new Error("Path not found.");

        if(!res.parentNode.children[res.fileName]) {
            throw new Error (`File not found: ${path}`);
        }

        delete res.parentNode.children[res.fileName];
        this.save();
        console.log(`[VFS] Deleted: ${path}`);
    }

    /**
     * Renombra un archivo o directorio.
     */
    rename(oldPath, newPath) {
        const oldNode = this.resolve(oldPath);
        if(!oldNode) throw new Error(`Source not found: ${oldPath}`);

        const resNew = this._resolveParent(newPath);
        if (!resNew || !resNew.parentNode) throw new Error(`Destination parent not found.`);

        if (resNew.parentNode.children[resNew.fileName]) {
            throw new Error(`Destination already exists: ${newPath}`);
        }

        // Mover la referencia del objecto (Move)
        const resOld = this._resolveParent(oldPath);
        delete resOld.parentNode.children[resOld.fileName]; // Borrar referencia vieja

        resNew.parentNode.children[resNew.fileName] = oldNode; // Asignar nueva

        this.save();
        console.log(`[VFS] Renamed ${oldPath} -> ${newPath}`);
    }
}

export const fs = new VirtualFileSystem();