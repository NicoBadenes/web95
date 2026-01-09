/**
 * @file src/main.js
 */

import { initBootSequence } from "./kernel/boot.js";
import { taskbar } from './os/gui/taskbar.js';
import { desktop } from "./os/gui/desktop.js";

document.addEventListener('DOMContentLoaded', () => {
    // Iniciar secuencia de arranque
    initBootSequence()
        .then(() => {
            // === SISTEMA LISTO ===

            //1. Iniciar Barra de tareas
            taskbar.init();

            //2. Iniciar Iconos Del Escritorio
            desktop.init();

        })
        .catch(console.error);
});
