/**
 * @file src/os/gui/desktop.js
 * @description Gestiona los iconos del escritorio y sus interacciones.
 */

import { mk, $} from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';
import { wm } from './window-manager.js'
import { notepad } from '../apps/notepad.js';
import { imageViewer } from '../apps/image-viewer.js';

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

        // Ca;ci;p de grilla
        let x = 10;
        let y = 10;
        const gapY = 85; // Espacio vertical entre iconos

        //Itera sobre cada archivo/carpeta
        Object.entries(rootDir).forEach(([name, node]) => {
            this.createIcon(name, node, x, y);

            // Calcular posicion del siguiente
            y += gapY;
            if (y > window.innerHeight - 100) { // Si se acaba el alto...
                y = 10;
                x += 80; // Salta a la siguiente columna
            }
        });
    }

    createIcon(name, node, x, y){
        // Determina el emoji segun el tipo (Placeholder temporal)
        const iconSymbol = node.type === 'dir' ? '📁' : '📄';

        //1. Crear imagen
        const img = mk('div', { className: 'icon-img', text: iconSymbol });

        //2.Crear etiqueta
        const label = mk ('span', {className: 'icon-label', text: name});

        //3. Crear contenedor
        const iconNode = mk('div', {
            className: 'desktop-icon',
            attributes: {
                'data-path': name,
                style: `left: ${x}px; top: ${y}px;`
            },
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
        this.makeDraggable(iconNode);

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
            // === MODO ARCHIVO (LOGICA DE EXTENSIONES) ===
            const ext = name.split('.').pop().toLowerCase();

            // Importaciones dinamicas (Lazy loading) pueden ir aca
            // pero por ahora se va a usar las globales que importe arriba.

            if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)){

                // --- ABRIR CON IMAGE VIEWER ---
                const appContent = imageViewer.run(name, node.content);

                wm.open({
                    id: `img-${name}`,
                    title: `${name} - Image Viewer`,
                    w: 400, h: 400, // Ventana mas cuadrada para fotos
                    content: appContent
                });
            } else{

                // --- ABRIR CON NOTEPAD ---
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

    /**
     * Habilita el arrastre del icono
     */
    makeDraggable(element) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        }

        const onMouseUp = () => {
            isDragging = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            initialLeft = element.offsetLeft;
            initialTop = element.offsetTop;

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

}


export const desktop = new Desktop();