/**
 * @file src/main.js
 */

import { initBootSequence } from "./kernel/boot.js";
import { taskbar } from './os/gui/taskbar.js';
import { desktop } from "./os/gui/desktop.js";
import { startMenu } from "./os/gui/start-menu.js";

document.addEventListener('DOMContentLoaded', () => {
    // Iniciar secuencia de arranque
    initBootSequence()
        .then(() => {
            // 1. Iniciar Componentes GUI
            taskbar.init();
            desktop.init();
            startMenu.init();

            //2. Conectar el boton start con el menu
            taskbar.onStartClick(() => {
                startMenu.toggle();
            });

        })
        .catch(console.error);
});
