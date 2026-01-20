/**
 * @file src/os/apps/explorer.js
 * @description Ventana de explorador de arhivos con navegacion.
 */

import { mk } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';
import { desktop } from '../gui/desktop.js';

export class ExplorerApp{
    constructor(initialPath = 'root'){
        this.currentPath = initialPath;
        this.contentArea = null;
        this.pathLabel = null;
    }

    run() {
        // 1. Boton "Subir Nivel" (up)
        const btnUp = mk('button', {
            className: 'btn-window',
            text: '⬆',
            attributes: { title: 'Up one level', style: 'width: 25px; height: 22px;'},
            events: {
                click: () => this.goUp()
            }
        });

        // 2. Barra de Direccion (Texto)
        this.pathLabel = mk('span', {
            text: this.currentPath,
            style: 'margin-left: 10px; font-size: 12px; font-family: monospace; border: 2px inset #ddd; background: white; padding: 2px 5px; flex-grow: 1;'
        });

        const toolbar = mk('div', {
            className: 'explorer-toolbar',
            children: [
                mk('span', { text: 'Address:', style: 'font-size: 11px;'}),
                this.pathLabel,
                btnUp
            ]
        });

        // 3. Area de Iconos
        this.contentArea = mk('div', { className: 'explorer-content'});

        // 4. Render inicial
        this.renderFiles();

        return mk('div', {
            className: 'app-explorer',
            children: [toolbar, this.contentArea]
        });
    }

    renderFiles() {
        this.contentArea.innerHTML = '';

        let dirNode;

        if(this.currentPath === 'root') {
            // Si esta en la raiz, usa el nodo raiz directamente del sistema de archivos
            dirNode = fs.root;
        } else{
            //Si es cualquier otra carpeta, busca su ruta
            dirNode = fs.resolve(this.currentPath);
        }
        // ----------------------------------------------------------

        if (!dirNode || dirNode.type !== 'dir') {
            this.contentArea.innerText = 'Error: Directory not found.';
            return;
        }

        // Actualizar barra de direcciones visual
        this.pathLabel.innerText = this.currentPath;

        // Si es root, fs.root.children es directo. Si es otro nodo, tambien tiene children
        const files = Object.entries(dirNode.children);

        if (files.length === 0) {
            this.contentArea.innerText = '(Folder is empty)';
            this.contentArea.style.color = 'gray';
            this.contentArea.style.fontStyle = 'italic';
            return;
        }

        files.forEach(([filename, node]) => {
            this.createIcon(filename, node);
        });
    }

    createIcon(filename, node) {
        // Elegir icono
        let iconChar = '📄';
        if (node.type === 'dir') iconChar = '📁';
        else if (filename.endsWith('.exe')) iconChar = '🚀';
        else if (filename.endsWith('.png')) iconChar = '🖼️';

        const iconDiv = mk('div', {
            className: 'explorer-icon',
            children: [
                mk('div', { text: iconChar, style: 'font-size: 24px;' }),
                mk('span', { className: 'icon-label', text: filename})
            ],
            events: {
                click: (e) => {
                    e.stopPropagation();
                    // Seleccion visual simple (sin drag and drop complejo por ahora)
                    Array.from(this.contentArea.children).forEach(c => c.classList.remove('selected'));
                    iconDiv.classList.add('selected');
                },
                dblclick: () => {
                    if (node.type === 'dir') {
                        let newPath;

                        if(this.currentPath === 'root') {
                            // Si estoy en la raiz, el path es solo el nombre
                            newPath = filename;
                        } else {
                            // Si estoy en otro lado, concateno
                            newPath = this.currentPath + '/' + filename;
                        }

                        this.navigate(newPath);
                        // ----------------------
                    }else {
                        desktop.openFileOrFolder(filename, node);
                    }
                }
            }
        });

        this.contentArea.appendChild(iconDiv);
    }

    navigate(newPath) {
        this.currentPath = newPath;
        this.renderFiles();
    }

    goUp() {
        if (this.currentPath === 'root') return; // No se puede subir mas alla de root
        
        //Cortar la ultima parte del path
        const parts = this.currentPath.split('/');
        parts.pop();
        this.currentPath = parts.join('/');

        if (this.currentPath === '') this.currentPath = 'root';
        
        this.renderFiles();
    }
}
