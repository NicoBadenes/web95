/**
 * @file src/os/apps/notepad.js
 * @description Editor de texto capaz de leer y escribir en el VFS.
 * Gestiona la creacion de archivos nuevos y la edicion de existentes
 */

import { mk } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';
import { wm } from '../gui/window-manager.js';
class NotepadApp {

    /**
     * Inicializa una instancia del Notepad.
     * Puede abrirse vacio (Untitled) o con un archivo existente.
     * * @param {string|null} filePath - Ruta completa del archivo en el VFS.
     * @param {string} [initialContent] - Contenido inicial si se abre desde el VFS.
     * @returns {HTMLElement} - El elemento DOM de la app.
     */
    run(filePath = null , initialContent = '') {
        //Estado interno de esta instancia de Notepad
        let currentPath = filePath;
        let isDirty = false; // TODO: para detectar cambios sin guardar en el futuro

        // 1. Area de texto
        const textarea = mk('textarea', {
            className: 'notepad-area',
            text: initialContent, //Si es null, sera string vacio
            events: {
                // Importante: Stop propagation para que al hacer click en el texto
                // no se active el arrastre de ventana del WindowManager por error.
                mousedown: (e) => e.stopPropagation(),
                input: () => { isDirty = true; }
            }
        });

        // 2. Logica de guardado
        const handleSave = () => {
            const content = textarea.value;

            if(currentPath && currentPath !== 'Untitled.txt') {
                //CASO A: Archivo existente => Sobreescribir
                this.saveToDisk(currentPath, content);
            }else {
                // CASO B: Archivo nuevo -> "Guardar Como"
                // en el futuro esto deberia ser un DIalog modal del SO.
                const filename = prompt('Save As - Enter filename (e.g., /notes.txt):', '/new-file.txt');

                if (filename) {
                    // Validar extension simple
                    const finalPath = filename.includes('.') ? filename: `${filename}.txt`;

                    if (this.saveToDisk(finalPath,content)) {
                        currentPath = finalPath;
                        //Actualizar titulo de la ventana 
                        // En un futuro, el WindowPanager deberia exponer un metodo .setTitle(id, title)
                        alert(`File saved to ${finalPath}`);
                    }
                }
            }
        };

        // 3. Menu superior (File, Edit...)
        const btnSave = mk ('div', {
            className: 'menu-item',
            text: 'Save',
            events: { click: handleSave}
        });

        const btnExit = mk ('div', {
            className: 'menu-item',
            text: 'Exit',
            events: {
                click: (e) => {
                    // Busca el boton de cerrar de la ventana y lo clickea
                    // Esto es un workaround temporal
                    const win = e.target.closest('.window');
                    if (win) {
                        const closeBtn = win.querySelector('.btn-window');
                        if (closeBtn) closeBtn.click();
                    }
                }
            }
        });

        const menubar = mk('div', {
            className: 'menubar',
            children: [
                mk('div', { text: 'File', className: 'menu-item', style: 'font-weight:bold' }),
                btnSave,
                btnExit
            ]
        });

        // 4. Ensamblaje Final
        return mk('div', {
            className: 'app-notepad',
            children: [menubar, textarea]
        });
    }

    /**
     * Intenta escribir en el disco y maneja errores.
     * @param {string} path - Ruta de destino.
     * @param {string} content - Texto a guardar.
     * @returns {boolean} True si tuvo exito
     */
    saveToDisk(path,content){
        try{
            //fs.write lanza error si la ruta es invalida (ej: carpeta no existe)
            fs.write(path, content);
            console.log(`[Notepad] Saved to ${path}`);
            return true;
        } catch (err) {
            console.error(err);
            alert(`Error saving file:\n${err.message}`);
            return false;
        }
    }
}

export const notepad = new NotepadApp();