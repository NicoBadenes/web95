/**
 * @file src/os/gui/desktop.js
 * @description Gestiona los iconos del escritorio y sus interacciones.
 */

import { mk, $} from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';
import { wm } from './window-manager.js'
import { notepad } from '../apps/notepad.js';

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
            
            //1. Obtiene la lista de nombres de archivos
            const files = fs.dir(name);

            //2. Crea un contenedor para la lista
            const listContainer = mk('div', {
                attributes: { style: 'padding: 5px; background-color: white; height: 100%;'}
            });

            //3. Genera un elemento clickeable por cada archivo
            files.forEach(fileName => {
                const item = mk('div', {
                    text: fileName,
                    attributes: {
                        //Estilos para que parezca un item seleccionable
                        style: 'cursor: pointer; padding: 2px 5px; margin-bottom: 2px;'
                    },
                    events: {
                        //Efecto Hover simple
                        mouseenter: (e) => {
                            e.target.style.backgroundColor = 'var(--clr-blue-dark)';
                            e.target.style.color = 'white';
                        },
                        mouseleave: (e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = 'black';
                        },
                        //DOBLE CLICK
                        dblclick: () => {
                            //Calcula la ruta completa
                            //Si 'name' ya contiene una ruta, esto funciona igual
                            const fullPath = `${name}/${fileName}`;

                            // Busca el nodo real de ese archivo
                            const childNode = fs.resolve(fullPath);

                            if(childNode){
                                this.openFileOrFolder(fullPath, childNode);
                            }
                        }
                    }
                });

                //Añadir iconos
                const icon = childNode => childNode.type === 'dir' ? '📁 ' : '📄 ';
                //Resolver el nodo para saber el icono, por ahora texto simple para no complicarla.

                listContainer.appendChild(item);
            });

            // Si la carpeta esta vacia
            if (files.length === 0) {
                listContainer.innerText = '(Empty folder)';
                listContainer.style.color = 'gray';
            }

            //4. Abre la ventana con la lista interactiva
            wm.open({
                id: `dir-${name}`,
                title: name,
                w: 300, h: 200,
                content: listContainer
            });

        }else {
            // === MODO ARCHIVO (NOTEPAD) ===
            const appContent = notepad.run(name, node.content);

            wm.open({
                id: `notepad-${name}`,
                title: `${name} - Notepad`,
                w: 400, h: 300,
                content: appContent
            });
        }
    }
}


export const desktop = new Desktop();