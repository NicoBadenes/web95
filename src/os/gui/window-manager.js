/**
 * @file src/os/gui/window-manager.js
 * @description v2.2 - Gestion de ventanas con Drag & Drop, minimizar, max, y close, y Sitema de foco (Z-Index).
 */

import { mk , $ } from '../../utils/dom.js';
import { taskbar } from './taskbar.js';
class WindowManager{
    constructor(){
        this.desktopArea = $('#window-area');
        this.windows = [];
        this.baseZIndex = 100; //Capa inicial (Z)
        this.activeWindow = null; //Registro de foco
    }

    /**
     * Abre una ventana nueva.
     */

    open(config) {
        const id = `win-${config.id || Date.now()}`;

        const isFixed = config.fixedSize || false;

        //1. Crear botones de control (min, max, close)

        // A. Minimizar
        const btnMin = mk('button', {
            className: 'btn-window',
            text: '_',
            attributes: { 'aria-label': 'Minimize', title: 'Minimize' },
            events: {
                click: (e) => {
                    e.stopPropagation();
                    this.toggleWindow(id);
                }
            }
        });

        // B. Maximizar
        const btnMax = mk('button', {
            className: 'btn-window',
            text: '□',
            attributes: { 'aria-label': 'Maximize', title: 'Maximize' },
            events: {
                click: (e) => {
                    e.stopPropagation();
                    if(!isFixed) this.toggleMaximize(windowNode);
                }
            }
        });

        // Si es fixed, deshabilitar visualmente el boton
        if(isFixed) {
            btnMax.disabled = true;
            btnMax.style.color = '#888';
            btnMax.style.cursor = 'default';
        }

        // C. Cerrar
        const btnClose = mk('button', {
            // className: 'btn-window btn-close', --> Causa error
            text: 'X',
            attributes: { 
                'class': 'btn-window btn-close', // --> Forma segura para remplazar la linea anterior comentada
                'aria-label': 'Close',
                title: 'Close'
            },
            events:{
                click: (e) => {
                    e.stopPropagation();
                    this.close(windowNode);
                }
            }
        });

        //2. Barra de titulo
        const titleBar = mk('div', {
            className: 'window-title-bar',
            children: [
                mk('span', { text: config.title, className: 'title-text' }),
                mk('div', { 
                    className: 'window-controls', 
                    children: [btnMin, btnMax, btnClose] })
            ],
            events: {
                //Al hacer click en la barra, la ventana se corre al frente
                mousedown: () => this.focus(windowNode),

                dblclick: () => {
                    if (!isFixed) this.toggleMaximize(windowNode);
                }
            }
        });

        //3. Cuerpo de la ventana
        const body = mk('div', {
            className: 'window-body',
            children: [config.content]
        });

        //4. Contenedor Principal
        const windowNode = mk('div', {
            id: id,
            className: 'window',
            attributes: {
                style: `
                    width: ${config.w}px;
                    height: ${config.h}px;
                    top: ${config.y || 100}px;
                    left: ${config.x || 100}px;
                    z-index: ${this.baseZIndex}
                `
            },
            children: [titleBar, body]
        });

        //Guardar referencia directa al titulo para cambiarle el color facilmente en el futuro
        windowNode._titleBar = titleBar;

        // ESTADO INTERNO: Guardar dimensiones originales para restaurar al minimizar de vuelta
        windowNode._restoreState = null;

        // Inyectar handles de redimensionado
        if (!isFixed) {
            const dirs = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
            dirs.forEach(dir => {
                const handle = mk('div', {
                    className: ['resize-handle', `handle-${dir}`]
                });
                // Conectar logica
                this.makeResizable(windowNode, handle, dir);
                windowNode.appendChild(handle);
            });
        }

        //5. Inyectar y activar logica
        this.desktopArea.appendChild(windowNode);
        this.windows.push(windowNode);

        //ACTIVAR FISICA
        this.makeDraggable(windowNode,titleBar);

        // === Pasa la funcion "CallBack" ===
        taskbar.addTask(id, config.title, () => this.toggleWindow(id));

        //Darle foco inmediato a la nueva ventana
        this.focus(windowNode);
    }

    /**
     * Cierra una ventana y limpia referencia.
     */

    close(windowNode){
        //Quitar de la barra de tareas usando el ID
        taskbar.removeTask(windowNode.id);
    
        windowNode.remove();
        this.windows = this.windows.filter(w => w !== windowNode);
    }

    /**
     * LOGICA DE FOCO: Trae una ventana al frente y gestiona colores (azul/gris).
     */
    focus(targetNode){
        //Si ya es la activa, no gastar recursos
        if (this.activeWindow === targetNode) return;

        //1. Subirla al frente (Incrementar Z-Index global)
        this.baseZIndex++;
        targetNode.style.zIndex = this.baseZIndex;

        // 2.Pintar la activa de AZUL (visual Feedback)
        targetNode._titleBar.style.backgroundColor = 'var(--clr-blue-dark)';

        //3.Pintar la anterior de GRIS (si existe)
        if (this.activeWindow && this.activeWindow !== targetNode) {
            this.activeWindow._titleBar.style.backgroundColor = 'var(--clr-gray)';
        }

        //Actualizar el puntero
        this.activeWindow = targetNode;

        // Avisar a la barra de tareas
        taskbar.setActive(targetNode.id);
    }

    /**
     * Minimiza o restaura una ventana segun su estado.
     */
    toggleWindow(id) {
        const win = this.windows.find(w => w.id === id);
        if (!win) return;

        //CASO 1: MINIMIZAR
        if (this.activeWindow === win && !win.classList.contains('minimized')) {
            win.classList.add('minimized');
            this.activeWindow = null;

            taskbar.setActive(null);
        }
        //CASO 2: RESTAURAR
        else {
            win.classList.remove('minimized');
            this.focus(win);
        }
    }

    /**
     * Logica de Maximiza / Restaurar
     */
    toggleMaximize(win){
        if (win.classList.contains('maximized')){
            // --- RESTAURAR ---
            // Recupera las dimensiones guardadas
            const state = win._restoreState;
            if(state){
                win.style.top = state.top;
                win.style.left = state.left;
                win.style.width = state.width;
                win.style.height = state.height;
            }
            win.classList.remove('maximized');
        } else{
            // --- MAXIMIZAR ---
            // 1. Guardar el estadoa ctual antes de romperlo
            win._restoreState = {
                top: win.style.top,
                left: win.style.left,
                width: win.style.width,
                height: win.style.height
            };

            // 2. Aplicar pantalla completa (menos la barra de tareas)
            win.style.top = '0px';
            win.style.left = '0px';
            win.style.width = '100%';
            // Asumo q la taskbar mide unos 30px aprox (no tengo idea)
            win.style.height = 'calc(100% - 30px)';

            win.classList.add('maximized');
            this.focus(win);
        }
    }

    /**
     * MOTOR DE FISICA: Logica de Arrastrar y Soltar (Optimizado).
     */
    makeDraggable(element, handle) {   
        let startX, startY, initialLeft, initialTop;

        const onMouseMove = (e) => {
            e.preventDefault(); 
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        };

        // Funcion que se ejecuta al soltar el click
        const onMouseUp = () => {
            document.body.style.cursor = 'default';

            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        // INICIO del arrastre
        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || element.classList.contains('maximized')) return; // Solo click izquierdo

            startX = e.clientX;
            startY = e.clientY;

            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            document.body.style.cursor = 'move';

            //
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }

    /**
     * Logica de redimensionado
     * @param {HTMLElement} node
     * @param {HTMLElement} handle
     * @param {string} dir
     */
    makeResizable(node, handle, dir) {
        let startX, startY, startW, startH, startLeft, startTop;

        const onMouseMove = (e) => {
            e.preventDefault();

            // Cuanto se movio el mouse
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            // Variables finales calculadas
            let newW = startW;
            let newH = startH;
            let newLeft = startLeft;
            let newTop = startTop;

            // 1. Calcular cambios segun direccion
            // Este (derecha) -> Solo cambia ancho
            if (dir.includes('e')) {
                newW = startW + dx;
            }
            // Oeste (Izquierda) -> Cambia acnho Y posicion (el borde izq se mueve)
            if (dir.includes('w')) {
                newW = startW - dx;
                newLeft = startLeft + dx
            }
            // Sur (Abajo) -> Solo cambia alto
            if (dir.includes('s')) {
                newH = startH + dy;
            }
            // Norte (Arriba) -> Cambia alto y posicion Top
            if (dir.includes('n')) {
                newH = startH - dy;
                newTop = startTop + dy;
            }

            // 2. Aplicar restricciones (Min Width/Height)
            // Si el nuevo acnho es menor al minimo, se bloquea
            if (newW < this.MIN_WIDTH) {
                newW = this.MIN_WIDTH;
                // Si esta en modo OESTE, hay que corregir el Left para q deje de  moverse
                if (dir.includes('w')) {
                    newLeft = startLeft + (startW - this.MIN_WIDTH);
                }
            }
            if (newH < this.MIN_HEIGHT) {
                newH = this.MIN_HEIGHT;
                // Si esta en modo NORTE, corregir TOP
                if (dir.includes('n')) {
                    newTop = startTop + (startH - this.MIN_HEIGHT);
                }
            }

            // 3. Renderizar
            node.style.width = `${newW}px`;
            node.style.height = `${newH}px`;
            node.style.left = `${newLeft}px`;
            node.style.top = `${newTop}px`;
        };

        const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0 || node.classList.contains('maximized')) return;
            e.stopPropagation(); // Pa q no active el drag de la ventana

            this.focus(node);

            // Guardar estado inicial
            startX = e.clientX;
            startY = e.clientY;

            // Estilos computados actuales
            const rect = node.getBoundingClientRect();
            startW = rect.width;
            startH = rect.height;
            startLeft = rect.left;
            startTop = rect.top;

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        });
    }
}

export const wm = new WindowManager();