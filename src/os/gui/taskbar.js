/**
 * @file src/os/gui/taskbar.js
 * @description Gestiona la barra de tareas, el boton de inicio y el reloj.
 */

import { mk, $ } from '../utils/dom.js';

class Taskbar{
    constructor() {
        this.element = $('#taskbar');
        this.tasksContainer = null; //Donde van los botones de las ventanas
        this.tasks = {}; //Registro de tareas activas { id: element }
    }

    init() {
        //1. Boton Start
        const startBtn = mk('button', {
            className: 'btn-start',
            children: [ mk('span', { text: 'Start' }) ],
            events: { click: () => console.log('Start Menu Toggled') }
        });

        //2. Separador y Contenedor de Tareas (NUEVO)
        // Crea un div flexible que ocupa el espacio central
        this.tasksContainer = mk('div', {
            attributes : {
                style: 'display: flex; gap: 2px; flex-grow: 1; padding-left: 5px; overFlow-x: auto;'
            }
        });

        //3. Area derecha (Reloj)
        const clockText = mk('span', { className: 'system-clock', text: '00:00' });
        const tray = mk('div', {
            className: 'tray-area',
            children: [clockText]
        });

        //4. Inyectar todo en orden
        this.element.innerHTML = '';
        this.element.appendChild(startBtn);
        this.element.appendChild(this.tasksContainer);
        this.element.appendChild(tray);

        this.startClock(clockText);
    }

    startClock(clockElement){
        const update = () => {
            const now = new Date();
            clockElement.textContent = now.toLocaleTimeString('en-US', {
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        };
        update();
        setInterval(update, 1000);
    }

    /**
     * Agrega un boton a la barra de tareas.
     */
    addTask(windowId, title) {
        const btn = mk('button', {
            text: title,
            className: 'task-btn',
            attributes: {
                style: `
                    height: 22px;
                    padding: 0 5px;
                    min-width: 100px;
                    max-width: 150px;
                    text-align: left;
                    font-size: 12px;
                    white-space: nowrap;
                    overflow:hidden;
                    text-overflow: ellipsis;
                    border: 2px solid var(--clr-white);
                    border-right-color: var(--clr-black);
                    border-bottom-color: var(--clr-black);
                    background: var(--clr-silver);
                    cursor: pointer;
                `
            },
            events: {
                //Futuro: Al hacer click, minimizar o restaurar la ventana
                click: () => console.log(`Task clicked: ${windowId}`)
            }
        });

        this.tasksContainer.appendChild(btn);
        this.tasks[windowId] = btn;
    }

    /** 
     * Elimina un boton cuando se cierra la ventana.
    */
    removeTask(windowId) {
        const btn = this.tasks[windowId];
        if (btn) {
            btn.remove();
            delete this.tasks[windowId];
        }
    }
}

export const taskbar = new Taskbar();