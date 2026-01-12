/**
 * @file src/os/filesystem/vfs.js
 * @description Virtual File System Manager.
 * Permite leer y escribir archivos en el objeto JSON de memoria.
 */

import { INITIAL_DISK } from "./disk.js";

class VirtualFileSystem {
    constructor() {
        //Carga el disco en memoria (futuro posible localstoraga here)
        this.root = JSON.parse(JSON.stringify(INITIAL_DISK));
    }

    /**
     * Navega por el arbol de directorios hasta encontrar el nodo deaseado.
     * @param {string} path - Ruta del archivo
     * @returns {Object|null} - El nodo del archivo
     */

    resolve(path){
        //1. Normaliza la ruta
        const parts = path.split('/').filter(p => p.length > 0);

        let current = this.root;

        //2. Recorre cada parte de la ruta
        for(const part of parts) {
            if (current.type !== 'dir' || !current.children[part]) {
                return null; // Ruta invalida
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

        if (!node) {
            throw new Error(`File not found: ${path}`);
        }
        if(node.type !== 'file') {
            throw new Error(`Path is a directory, not a file: ${path}`);
        }

        return node.content;
    }

    /**
     * Guarda contenido en un archivo existente.
     * @param {string} path
     * @param {string} content
     */
    write(path,content) {
        //1. Intentar resolver el archivo directamente
        let node = this.resolve(path);

        //2. Si existe, actualizar su contenido
        if (node){
            if (node.type !== 'file'){
                throw new Error (`Cannot write to a directory: ${path}`);
            }
            node.content = content;
            console.log(`[VFS] Updated file: ${path}`);
            return;
        }

        // 3. Si NO existe, intenta crearlo
        // Necesita encontrar la carpeta padre y el nombre del nuevo archivo
        const parts = path.split('/').filter(p => p.length > 0);
        const fileName = parts.pop(); //Saca el ultimo pedazo (nombre)

        // El resto del array 'parts' es la ruta de la caroeta padre
        let parentDir = this.root; //Asume raiz por defecto

        if(parts.length > 0) {
            //Si hay carpetas intermedias, las resuelve
            const parentPath = parts.join('/');
            parentDir = this.resolve(parentPath);
        }

        // Valida que la carpeta padre exista
        if (!parentDir || parentDir.type !== 'dir'){
            throw new Error(`Directory path not found: ${parts.join('/')}`);
        }

        //4. Crear el archivo nuevo en el disco
        parentDir.children[fileName] = {
            type: 'file',
            content: content
        };

        console.log(`[VFS] Created new file: ${path}`);
    }

    /**
     * Lista los archivos de una carpeta.
     * @param {string} path
     * @param {string[]} Array con nombres de archivos.
     */

    dir (path = ''){
        const node = path === '' ? this.root : this.resolve(path);

        if (!node){
            throw new Error(`Directory not found: ${path}`);
        }
        if (node.type !== 'dir') {
            throw new Error(`Path is not a directory: ${path}`);
        }

        return Object.keys(node.children);
    }
}

// Instancia unica (singleton)
export const fs = new VirtualFileSystem();