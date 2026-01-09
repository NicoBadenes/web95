/**
 * @file src/os/gui/taskbar.js
 * @description Gestiona la barra de tareas, el boton de inicio y el reloj.
 */

import { mk, $ } from '../utils/dom.js';

class Taskbar {
    constructor() {
        this.element = $('#taskbar');
    }

    /**
     * Inicializa la barra de tareas.
     */
    init() {
        // 1. Crear boton de Inicio
        const startBtn = mk ('button', {
            className: 'btn-start',
            children: [
                //Simulacion de icono de windows con texto (remplazar despues por una imagen)
                mk('span', { text: 'Start'})
            ],
            events: {
                click: () => console.log('Start Menu Toggled') //Futura funcionalidad
            }
        });

        // 2. Crear Area de notificaciones (Tray) y Reloj
        const clockText = mk('span', { className: 'system-clock', text: '00:00 AM'});

        const tray = mk('div', {
            className: 'tray-area',
            children: [clockText]
        });

        //3. Inyectar barra
        this.element.appendChild(startBtn);
        //Aca iria la lista de tareas (ventanas abiertas) en el medio
        const spacer = mk('div', { attributes: { style: 'flex-grow: 1; '}});
        this.element.appendChild(spacer);
        this.element.appendChild(tray);

        // 4. Iniciar el reloj
        this.startClock(clockText);
    }

    /**
     * Actualiza el reloj cada minuto
     * @param {HTMLElement} elementElement
     */
    startClock(clockElement) {
        const update = () => {
            const now = new Date();
            //Formato de hora corta en ingles
            const timeString = now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
            clockElement.textContent = timeString;
        };

        update(); //Ejectuar inmediatamente
        setInterval(update, 1000); //Actualizar cada segundo
    }
}

export const taskbar = new Taskbar();