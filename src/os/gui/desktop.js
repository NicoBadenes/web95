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

        // --- CONSTANETS DE GRILLA ---
        this.GRID_W = 80;
        this.GRID_H = 85;
        this.MARGIN_X = 10;
        this.MARGIN_Y = 10;
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

        // Inicia con el margen exacto
        let x = this.MARGIN_X;
        let y = this.MARGIN_Y;

        //Itera sobre cada archivo/carpeta
        Object.entries(rootDir).forEach(([name, node]) => {
            this.createIcon(name, node, x, y);

            // Calcular posicion del siguiente
            y += this.GRID_H;
            if (y + this.GRID_H > window.innerHeight) { // Si se acaba el alto...
                y = this.MARGIN_Y; //Volver arriba
                x += this.GRID_W; // Salta a la siguiente columna
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
     * Revisa si hay otro icono en las coordenadas dadas
     */
    isSlotOccupied(x, y, ignoreElement) {
        // Obtiene todos los iconos del DOM
        const icons = Array.from(this.iconsContainer.children);

        return icons.some(icon => {
            if (icon === ignoreElement) return false; // No chocar con uno mismo

            // Lee su posicion actual
            const iconLeft = parseInt(icon.style.left);
            const iconTop = parseInt(icon.style.top);

            //Compara (con un pqueño margen de rror por si acaos, aunque aca deberia ser exacto)
            return Math.abs(iconLeft - x) < 5 && Math.abs(iconTop - y) < 5;
        });
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
        
            //1. Definir tamaño de la celda (Debe coincidir aprox con el render inicial)
            const rawLeft = parseInt(element.style.left) || 0; 
            const rawTop = parseInt(element.style.top) || 0;

            // Formula: (Posicion - Marge) / TamañoCelda
            let col = Math.round((rawLeft - this.MARGIN_X) / this.GRID_W);
            let row = Math.round((rawTop - this.MARGIN_Y) / this.GRID_H);

            // Evitar indices negativos
            if (col < 0) col = 0;
            if (row < 0) row = 0;

            //2. Obtener posicion final cruda (Snap)
            let snapLeft = this.MARGIN_X + (col * this.GRID_W);
            let snapTop = this.MARGIN_Y + (row * this.GRID_H);

            //3. Limites de pantalla (Derecha y Abajo)
            const maxLeft = window.innerWidth - this.GRID_W;
            const maxTop = window.innerHeight - 40 - this.GRID_H;

            if (snapLeft > maxLeft) snapLeft = this.MARGIN_X + (Math.floor((maxLeft - this.MARGIN_X) / this.GRID_W) * this.GRID_W);
            if (snapTop > maxTop) snapTop = this.MARGIN_Y + (Math.floor((maxTop - this.MARGIN_Y) / this.GRID_H) * this.GRID_H);


            //4. Deteccion de colisiones
            // Si el lugar esta ocupado, REBOTA a la posicion original (initialLeft/Top)
            if (this.isSlotOccupied(snapLeft, snapTop, element)) {
                console.log("Slot occupied! Bouncing back."); // Debug
                snapLeft = initialLeft;
                snapTop = initialTop;
            }

            // 5. Aplicar
            element.style.transition = 'top 0.2s, left 0.2s';
            element.style.left = `${snapLeft}px`;
            element.style.top = `${snapTop}px`;

            setTimeout(() => { element.style.transition = 'none';}, 200);
            element.style.zIndex = '';
        };

        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            isDragging = true;
            element.style.transition = 'none';
            element.style.zIndex = 100;

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