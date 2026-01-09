/**
 * @file src/main.js
 */

import { initBootSequence } from "./kernel/boot.js";
import { wm } from './os/gui/window-manager.js'; //<--- IMPORTAR WM para test
import { mk } from './os/utils/dom.js'; // <--- IMPORTAR MK para test
import { taskbar } from './os/gui/taskbar.js';
import { fs } from "./os/filesystem/vfs.js";

document.addEventListener('DOMContentLoaded', () => {
    // Iniciar secuencia de arranque
    initBootSequence()
        .then(() => {
            //SE EJECUTA CUANDO EL BOOT TERMINA
            
            //INICIALIZAR BARRA DE TAREAS
            taskbar.init();

            //PRUEBA 1: Leer archivo del disco
            //Intenta leer 'welcome.msg' desde el VFS
            let welcomeText = ''
            try {
                welcomeText = fs.read('welcome.msg');
            } catch(err){
                welcomeText = 'Error loading file.';
                console.error(err);
            }

            //Ventana 1: Bienvenida con texto del VFS
            const welcomeContent = mk('div', {
                text: welcomeText, //Usa el contenido leido del disco
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

            //PRUEBA 2: LISTAR DIRECTORIO SYSTEM
            //Muestra que hay en la carpeta system dentro de la segunda ventana
            const filesInSystem = fs.dir('system'); //Deberia devolver ['readme.txt', 'config.sys']

            const notesContent = mk('div', {
                //Une el array de archivos con saltos de linea
                text: 'Files in /system:\n' + filesInSystem.join('\n'),
                attributes: { style: 'padding: 10px; white-space: pre-line;'}//
            });

            wm.open({
                id: 'system-dir',
                title: 'C:/system', //para simular q el usuario esta explorando
                w: 300,
                h: 200,
                x: 250,
                y: 150,
                content: notesContent
            });
        })
        .catch(console.error);
});

