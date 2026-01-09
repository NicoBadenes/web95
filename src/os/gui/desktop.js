/**
 * @file src/os/gui/desktop.js
 * @description Gestiona los iconos del escritorio y sus interacciones.
 */

import { mk, $} from '../utils/dom.js';
import { fs } from '../filesystem/vfs.js';
import { wm } from './window-manager.js'

class Desktop{
    constructor() {
        this.rootElement = $('#desktop');
        // Crea el cotenedor especifico para iconos
        this.iconsContainer = mk('div', { id: 'desktop-icons'});
        this.rootElement.appendChild(this.iconsContainer);

        this.selectedIcon = null;
    }

    init() {
        this.render();

        //Click en el fondo vacio deselecciona los iconos
        this.rootElement.addEventListener('mousedown', (e) => {
            if (e.target === this.rootElement || e.target === this.iconsContainer) {
                this.deselectAll();
            }
        });
    }

    /**
     * Dibuja los iconos basados en los archivos de la raiz (C:/)
     */
    render(){
        // Limpia por las dudas
        this.iconsContainer.innerHTML = '';

        // Obtiene los hijos del nodo raiz
        const rootDir = fs.root.children;

        //Itera sobre cada archivo/carpeta
        Object.entries(rootDir).forEach(([name, node]) => {
            this.createIcon(name, node);
        });
    }

    createIcon(name, node){
        // Determina el emoji segun el tipo (Placeholder temporal)
        const iconSymbol = node.type === 'dir' ? '📁' : '📄';

        //1. Crear imagen
        const img = mk('div', { className: 'icon-img', text: iconSymbol });

        //2.Crear etiqueta
        const label = mk ('span', {className: 'icon-label', text: name});

        //3. Crear contenedor
        const iconNode = mk('div', {
            className: 'desktop-icon',
            attributes: {'data-path': name}, //Guarda la ruta
            children: [img, label],
            events: {
                //Click Simple: Seleccionar
                click: (e) => {
                    e.stopPropagation();
                    this.selectIcon(iconNode);
                },
                //Doble click: abrir
                dblclick: () => {
                    this.openFileOrFolder(name, node);
                }
            }
        });

        this.iconsContainer.appendChild(iconNode);
    }

    selectIcon(node) {
        this.deselectAll(); //Quitar seleccion a otros
        node.classList.add('selected');
        this.selectedIcon = node;
    }

    deselectAll(){
        if (this.selectedIcon){
            this.selectedIcon.classList.remove('selected');
            this.selectedIcon = null;
        }
    }

    /**
     * Logica simple para abrir archivos al hacer doble click.
     */

    openFileOrFolder(name, node){
        if (node.type === 'dir'){
            //POR AHORA: abre una ventana mostrando la lista de archivos (simulando un explorador de archivos)
            const files = fs.dir(name);
            const content = mk('div', {
                text: `Contents of /${name}:\n\n` + files.join('\n'),
                attributes: { style: 'padding: 10px; white-space: pre;'}
            });

            wm.open({
                id: `dir-${name}`,
                title: name,
                w: 300, h: 200,
                content: content
            });
        } else{
            //Es un archivo. Se abre y muestra su contenido
            const content = mk('div', {
                text: node.content,
                attributes: { style: 'padding: 10px; font-family: monospace;' }
            });

            wm.open({
                id:`file-${name}`,
                title: name,
                w: 400, h: 300,
                content: content
            });
        }
    }
}


export const desktop = new Desktop();