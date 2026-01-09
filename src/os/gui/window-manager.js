/**
 * @file src/os/gui/window-manager.js
 * @description v2.0 - Gestion de ventanas con Drag & Drop y Ssitema de foco (Z-Index).
 */

import { mk , $ } from '../utils/dom.js';

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

        //1. Boton Cerrar
        const btnClose = mk('button', {
            className: 'btn-window',
            text: 'X',
            attributes: { 'aria-label': 'Close' },
            events:{
                click: (e) => {
                    //IMPORTANTE: stopPropagation evita que al cerrar se active el foco de la ventana
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
                mk('div', { className: 'window-controls', children: [btnClose] })
            ],
            events: {
                //Al hacer click en la barra, la ventana se corre al frente
                mousedown: () => this.focus(windowNode)
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
                //Posicion inicial dinamica (o por defecto 100,100)
                style: `
                    width: ${config.w}px;
                    height ${config.h}px;
                    top: ${config.y || 100}px;
                    left: ${config.x || 100}px;
                    z-index: ${this.baseZIndex}
                `
            },
            children: [titleBar, body]
        });

        //Guardar referencia directa al titulo para cambiarle el color facilmente en el futuro
        windowNode._titleBar = titleBar;

        //5. Inyectar y activar logica
        this.desktopArea.appendChild(windowNode);
        this.windows.push(windowNode);

        //ACTIVAR FISICA
        this.makeDraggable(windowNode,titleBar);

        //Darle foco inmediato a la nueva ventana
        this.focus(windowNode);
    }

    /**
     * Cierra una ventana y limpia referencia.
     */

    close(windowNode){
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
    }

    /**
     * MOTOR DE FISICA: Logica de Arrastrar y Soltar.
     * @param {HTMLElement} element - La ventana completa.
     * @param {HTMLElement} handle - La barra de titulo (desde donde se arrastra).
     */
    makeDraggable(element, handle) {
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        //A. INICIO DEL ARRASTRE
        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; //Solo click izquierdo

            isDragging = true;

            // Guardar donde estaba el mouse
            startX = e.clientX;
            startY = e.clientY;

            //Guardar donde estaba la ventana
            const rect = element.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            //Feedback visual cursor
            document.body.style.cursor = 'move';
        });

        //B. DURANTE EL ARRASTRE (movimiento)
        //Se usa 'window para no perder el evento si el mouse sale rapido de la ventana
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            e.preventDefault(); //evita seleccionar texto sin querer

            //Matematica del movimiento: (posicion actual- posicion inicial)
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            //Aplicar nueva posicion
            element.style.left = `${initialLeft + dx}px`;
            element.style.top = `${initialTop + dy}px`;
        });

        //C. FIN DEL ARRASTRE
        window.addEventListener('mouseup', () => {
            if(isDragging) {
                isDragging = false;
                document.body.style.cursor = 'default';
            }
        });
    }
}

export const wm = new WindowManager();