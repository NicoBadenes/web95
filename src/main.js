/**
 * @file src/main.js
 * @description Punto de entrada principal.
 */

import { initBootSequence } from "./kernel/boot.js";
import { wm } from './os/gui/window-manager.js'; //<--- IMPORTAR WM para test
import { mk } from './os/utils/dom.js'; // <--- IMPORTAR MK para test
import { taskbar } from './os/gui/taskbar.js';

document.addEventListener('DOMContentLoaded', () => {
    // Iniciar secuencia de arranque
    initBootSequence()
        .then(() => {
            //SE EJECUTA CUANDO EL BOOT TERMINA
            
            //INICIALIZAR BARRA DE TAREAS
            taskbar.init();

            //Ventana 1: Bienvenida (fondo)
            const welcomeContent = mk('div', {
                text: 'Welcome to WebOS v1.0. System Ready.',
                attributes: { style: 'padding: 10px; font-family: sans-serif;'}   
            });

            wm.open({
                id: 'welcome',
                title: 'Welcome',
                w: 400,
                h: 200,
                x: 50, //izquierda
                y: 50, //Arriba
                content: welcomeContent
            });

            //3. VENTANA 2: (frente - para probar foco y arrastre)
            const notesContent = mk('div', {
                text: 'Try dragging this window over the other one. Click on the windows to swtich focus.',
                attributes: { style: 'padding: 10px'}
            });

            wm.open({
                id: 'readme',
                title: 'Read Me.txt',
                w: 300,
                h: 200,
                x: 250,
                y: 150,
                content: notesContent
            });
        })
        .catch(console.error);
});

