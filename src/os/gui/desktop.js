/**
 * @file src/os/gui/desktop.js
 * @description Gestiona iconos con algoritmo "Smart Grid" para vitar superposiciones.
 */

import { mk, $} from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';
import { wm } from './window-manager.js'
import { notepad } from '../apps/notepad.js';
import { imageViewer } from '../apps/image-viewer.js';
import { ExplorerApp } from '../apps/explorer.js';

class Desktop{
    constructor() {
        this.rootElement = $('#desktop');
        // Crea el cotenedor especifico para iconos
        this.iconsContainer = mk('div', { id: 'desktop-icons'});
        this.rootElement.appendChild(this.iconsContainer);

        // Crea la caja de seleccion
        this.selectionBox = mk('div', { id: 'selection-box' });
        this.rootElement.appendChild(this.selectionBox);


        this.selectedIcon = null;

        // --- CONSTANETS DE GRILLA ---
        this.GRID_W = 80;
        this.GRID_H = 85;
        this.MARGIN_X = 10;
        this.MARGIN_Y = 10;
    }

    init() {
        this.render();

        // Iniciar listeners de la caja
        this.initSelectionBehavior();

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
        this.iconsContainer.innerHTML = '';
        const rootDir = fs.root.children;

        // 1. Mapa de ocupacion
        // Guarda las coordenadas ocupadas para no poner nada encima.
        const occupiedSlots = new Set();
        
        Object.values(rootDir).forEach(node => {
            if (node.meta && node.meta.pos) {
                // "Snap" a la grilla para asegurar consistencia
                const col = Math.round((node.meta.pos.x - this.MARGIN_X) / this.GRID_W);
                const row = Math.round((node.meta.pos.y - this.MARGIN_Y) / this.GRID_H);
                occupiedSlots.add(`${col},${row}`);
            }
        });

        // 2. Renderizado
        Object.entries(rootDir).forEach(([name, node]) => {
            let finalX, finalY;
            
            if(node.meta && node.meta.pos) {
                // A. Tiene posicion guardada: Usarla
                finalX = node.meta.pos.x;
                finalY = node.meta.pos.y;
            } else{
                // B. Es nuevo: Buscar el primer slot libre
                const freePos = this.findFirstFreeSlot(occupiedSlots);

                // Convertir Col/Row a Pixeles
                finalX = this.MARGIN_X + (freePos.col * this.GRID_W);
                finalY = this.MARGIN_Y + (freePos.row * this.GRID_H);

                // Guarda esta nueva posicion en el VFS inmediatamente
                // para que la proxima vez ya sea "fija".
                fs.updateMeta(name, { pos: { x: finalX, y: finalY } });

                // Marcar este slot como ocupado para el siguiente archivo del loop actual
                occupiedSlots.add(`${freePos.col},${freePos.row}`);
            }

            this.createIcon(name, node, finalX, finalY);
        });
    }

    /**
     * Busca la primera celda (Columna, Fila) que no esta en el Set de ocupados.
     */
    findFirstFreeSlot(occupiedSlots) {
        // Limites de pantalla (aproximados)
        const maxCols = Math.floor((window.innerWidth - this.MARGIN_X) / this.GRID_W);
        const maxRows = Math.floor((window.innerHeight - 40 - this.MARGIN_Y) / this.GRID_H);

        for (let col = 0; col < maxCols; col ++) {
            for (let row = 0; row < maxRows; row++) {
                const key = `${col},${row}`;
                if (!occupiedSlots.has(key)) {
                    return { col, row};
                }
            }
        }
        // Si todo esta lleno, apilar en el 0,0 (fallback)
        return { col: 0, row: 0};
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

                    if (e.ctrlKey) {
                        // ctrl: Alternar seleccion individual
                        iconNode.classList.toggle('selected');
                        // Si se selecciono, se marca como el ultimo para el shift
                        if (iconNode.classList.contains('selected')) this.selectedIcon = iconNode;
                    } else if (e.shiftKey && this.selectedIcon) {
                        // shift: Seleccionar rango (basado en el orden del DOM)
                        this.selectRange(this.selectedIcon, iconNode);
                    } else {
                        // normal: Deseleccionar todo y seleccionar el actual
                        this.deselectAll();
                        iconNode.classList.add('selected');
                        this.selectedIcon = iconNode;
                    };
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

    /**
     * Deveulve una lista con los 'data-pathd de todos los iconos seleccionados.      
    */
    getSelectedFiles() {
        const selectedElements = this.iconsContainer.querySelectorAll('.selected');
        return Array.from(selectedElements).map(el => el.getAttribute('data-path'));
    }

    deselectAll(){
        const selected = this.iconsContainer.querySelectorAll('.selected');
        selected.forEach(el => el.classList.remove('selected'));
        this.selectedIcon = null;
    }

    /**
     * Logica simple para abrir archivos al hacer doble click.
     */

    openFileOrFolder(name, node){
        if (node.type === 'dir'){
            // --- ExplorerApp ---

            //Calcula ruta absoluta.
            // Si venia del desktop, se asume que esta en 'root' + nombre carpeta
            // (Si implemento sub-carpetas en el futuro, esto es mejorable)
            const explorer = new ExplorerApp(name);

            wm.open({
                id: `dir-${name}`,
                title: name,
                w: 400, h: 300,
                content: explorer.run()
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
        let startX, startY;
        let dragGroup = [];

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Aplicar mismo desplazamiento a tds los elmentos del grupo
            dragGroup.forEach(item => {
                item.el.style.left = `${item.initialL + dx}px`;
                item.el.style.top = `${item.initialT + dy}px`;
            })
        }

        const onMouseUp = () => {
            isDragging = false;
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);

            //1. Calcular grilla para cada icono del grupo individualmente
            dragGroup.forEach(item => {
                const el = item.el;
                const rawLeft = parseInt(el.style.left) || 0;
                const rawTop = parseInt(el.style.top) || 0;

                let col = Math.round((rawLeft - this.MARGIN_X) / this.GRID_W);
                let row = Math.round((rawTop - this.MARGIN_Y) / this.GRID_H);

                if(col < 0) col = 0;
                if(row < 0) row = 0;

                let snapLeft = this.MARGIN_X + (col * this.GRID_W);
                let snapTop = this.MARGIN_Y + (row * this.GRID_H);

                // 2. Limites
                const maxLeft = window.innerWidth - this.GRID_W;
                const maxTop = window.innerHeight - 40 - this.GRID_H;

                if (snapLeft > maxLeft) snapLeft = this.MARGIN_X + (Math.floor((maxLeft - this.MARGIN_X) / this.GRID_W) * this.GRID_W);
                if (snapTop > maxTop) snapTop = this.MARGIN_Y + (Math.floor((maxTop - this.MARGIN_Y) / this.GRID_H) * this.GRID_H);

                // 3. Colisiones
                if (this.isSlotOccupied(snapLeft, snapTop, el)) {
                    console.log("Bouncing by colission");
                    snapLeft = item.initialL;
                    snapTop = item.initialT;
                }    

                //4. Aplicar visualmente
                el.style.transition = 'top 0.2s, left 0.2s';
                el.style.left = `${snapLeft}px`;
                el.style.top = `${snapTop}px`;

                //5. Guardar en disco duro
                const filename = element.getAttribute('data-path');

                // Llama a la nueva funcion de VFS
                fs.updateMeta(filename, {
                    pos: { x: snapLeft, y: snapTop}
                });

                setTimeout(() => { 
                    el.style.transition = 'none';
                    element.style.zIndex = '';
                }, 200);                
            });
        };

        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            // Si el icono que se quiere arrastrar no es parte del grupo, 
            // se deselecciona el grupo y se arrastra solo ese icono
            if (!element.classList.contains('selected')) {
                // Solo deselecciona si NO esta intentando una multiseleccion
                if (!e.ctrlKey && !e.shiftKey) {
                    this.deselectAll();
                    element.classList.add('selected');
                    this.selectedIcon = element;
                }   
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const selectedIcons = Array.from(this.iconsContainer.querySelectorAll('.selected'));
            dragGroup = selectedIcons.map(el => {
                el.style.transition = 'none';
                el.style.zIndex = 100;
                return {
                    el: el,
                    initialL: el.offsetLeft,
                    initialT: el.offsetTop
                };
            });

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    /**
     * Logica para dibujar la caja azul y seleccionar
     */
    initSelectionBehavior(){
        let isSelecting = false;
        let startX, startY;

        // 1. Al holdear en el fondo
        this.rootElement.addEventListener('mousedown', (e) => {
            // Si clickeo un icono o la barra, no inicia caja
            if (e.target !== this.rootElement && e.target !== this.iconsContainer) return;
            if (e.button !== 0) return; //Solo el izquierdo

            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;

            this.deselectAll();

            // Resetear y mostrar caja en tamaño 0
            this.selectionBox.style.left = `${startX}px`;
            this.selectionBox.style.top = `${startY}px`;
            this.selectionBox.style.width = '0px';
            this.selectionBox.style.height = '0px';
            this.selectionBox.style.display = 'block';
        });

        // 2. Al mover el mouse
        window.addEventListener('mousemove', (e) => {
            if (!isSelecting)return;
            e.preventDefault(); //Evitar seleccionar texto del navegador

            const currentX = e.clientX;
            const currentY = e.clientY;

            // Calcular geometria
            const left = Math.min(currentX, startX);
            const top = Math.min(currentY, startY);
            const width = Math.abs(currentX - startX);
            const height = Math.abs(currentY - startY);

            // Aplicar estilos visuales
            this.selectionBox.style.left = `${left}px`;
            this.selectionBox.style.top = `${top}px`;
            this.selectionBox.style.width = `${width}px`;
            this.selectionBox.style.height = `${height}px`;

            // Detectar q inconos toca
            this.checkSelectionCollisions(left, top, width, height);
        });

        // 3. Al soltar el click
        window.addEventListener('mouseup', () => {
            if (isSelecting) {
                isSelecting = false;
                this.selectionBox.style.display = 'none';
            }
        });
    }
        /**
         * Reivsa colisiones (AABB) entre caja y los iconos
         */
    checkSelectionCollisions(boxX, boxY, boxW, boxH) {
        const icons = Array.from(this.iconsContainer.children);

        const boxRight = boxX + boxW;
        const boxBottom = boxY + boxH;

        icons.forEach(icon => {
            const rect = icon.getBoundingClientRect();

            // Matematica de interseccion de rectangulos
            const noOverlap = (
                rect.left > boxRight ||
                rect.right < boxX ||
                rect.top > boxBottom ||
                rect.bottom < boxY
            );

            if (!noOverlap) {
                icon.classList.add('selected');
            } else{
                icon.classList.remove('selected');
            }
        });
    }

    selectRange(startNode, endNode) {
        const allIcons = Array.from(this.iconsContainer.children);
        const startIndex = allIcons.indexOf(startNode);
        const endIndex = allIcons.indexOf(endNode);

        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);

        for (let i = start; i <= end; i++) {
            allIcons[i].classList.add('selected');
        }
    }
}


export const desktop = new Desktop();