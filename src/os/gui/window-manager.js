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
                    this.toggleMaximize(windowNode);
                }
            }
        });

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
                dblclick: () => this.toggleMaximize(windowNode)
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
}

export const wm = new WindowManager();