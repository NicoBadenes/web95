/**
 * @file src/os/filesystem/vfs.js
 * @description Virtual File System Manager.
 * Permite leer y escribir archivos en el objeto JSON de memoria.
 */

import { INITIAL_DISK } from "./disk.js";

const STORAGE_KEY = 'web95_hdd_v1';

class VirtualFileSystem {
    constructor() {
        // 1. Intenta cargar del LOcalStorage
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (savedData) {
            console.log('[VFS] Hard Drive loaded from storage.');
            this.root = JSON.parse(savedData);
        } else{
            //2. Si no hay nada, carga la imagen de fabrica (disk.js)
            //Usa JSON parse/stringfy para romper la referencia y hacer una copia limpia
            console.log('[VFS] Formatting new disk...');
            this.root = JSON.parse(JSON.stringify(INITIAL_DISK));
            this.save();
        }
    }

    /**
     * Guarda el estado actual en el navegador
     */
    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.root));
    }

    /**
     * Navega por el arbol de directorios hasta encontrar el nodo deaseado.
     * @param {string} path - Ruta del archivo
     * @returns {Object|null} - El nodo del archivo
     */

    resolve(path){
        //Si el path es vacio o '/', devuelve la raiz
        if (path === '' || path === '/') return this.root;

        const parts = path.split('/').filter(p => p.length > 0);
        let current = this.root;

        for(const part of parts) {
            if (current.type !== 'dir' || !current.children[part]) {
                return null;
            }
            current = current.children[part];
        }
        return current;
    }

    /**
     * Lee el contenido de un archivo.
     * @param {string} path
     * @param {string} El contenido del archivo
     */

    read(path) {
        const node = this.resolve(path);
        if (!node) throw new Error(`File not found: ${path}`);
        if(node.type !== 'file') throw new Error(`Path is a directory: ${path}`);
        return node.content;
    }

    /**
     * Guarda contenido en un archivo existente.
     * @param {string} path
     * @param {string} content
     */
    write(path,content) {
        let node = this.resolve(path);

        //A. Si existe, actualizar su contenido
        if (node){
            if (node.type !== 'file'){
                throw new Error (`Cannot write to a directory: ${path}`);
            }
            node.content = content;
            this.save();
            return;
        }

        // 3. Si NO existe, intenta crearlo
        const parts = path.split('/').filter(p => p.length > 0);
        const fileName = parts.pop();

        // Resuelve carpeta padre
        // Si parts queda vacio, es que el padrees la raiz
        let parentDir = parts.length === 0 ? this.root : this.resolve(parts.join('/'));

        if (!parentDir || parentDir.type !== 'dir'){
            throw new Error(`Directory path not found: ${parts.join('/')}`);
        }

        // Crea archivo (conservando metadata vacia por si acaso)
        parentDir.children[fileName] = {
            type: 'file',
            content: content,
            meta: {}
        };

        console.log(`[VFS] Created: ${path}`);
        this.save();
    }

    dir (path = '') {
        const node = path === '' ? this.root : this.resolve(path);
        if (!node || node.type !== 'dir') throw new Error (`Invalid directory: ${path}`);
        return Object.keys(node.children);
    }

    /**
     * Actualiza metadatos (como la posocion X, Y en el escritorio)
     * sin tocar el contenido del archivo.
     */
    updateMeta(path, newMeta) {
        const node = this.resolve(path);
        if (node) {
            // Inicializa meta si no existe
            if (!node.meta) node.meta = {};

            // Fusiona los datos nuevos
            Object.assign(node.meta, newMeta);

            this.save();
        }
    }
}

export const fs = new VirtualFileSystem();