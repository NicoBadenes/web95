/**
 * @file src/os/apps/notepad.js
 * @description Editor de texto simple
 */

import { mk } from '../utils/dom.js';
import { fs } from '../filesystem/vfs.js';

class NotepadApp {

    /**
     * Lanza la aplicacion Notepad
     * @param {string} filePath - Ruta del archivo a abrir
     * @returns {HTMLElement} - El contenido visual de la app.
     */
    run(filePath, initialContent = null) {
        //1. Leer contenido actual
        let content = '';

        if (initialContent !== null){
            // Si hay contenido, se usa
            content = initialContent;
        } else{
            //Si no, intenta leer del disco
            try {
            content = fs.read(filePath);
            }catch(e){
                content = 'Error loading file.';
            }
        }

        //2. Crear el area de texto
        const textarea = mk('textarea', {
            className: 'notepad-area',
            text: content,
            events: {
                //Evita que el click en el texto se propague y enfoque mal la ventana
                mousedown: (e) => e.stopPropagation()
            }
        });

        //3. Crear menu (File > Save)
        const btnSave = mk('div', {
            className: 'menu-item',
            text: 'Save',
            events: {
                click: () => {
                    this.saveFile(filePath, textarea.value);
                }
            }
        });

        const menubar = mk('div', {
            className: 'menubar',
            children: [
                mk('div', { text: 'File:', style: 'margin-right:5px; color:#666;' }),
                btnSave
            ]
        });

        //4. Empaquetar todo
        return mk('div', {
            className: 'app-notepad',
            children: [menubar, textarea]
        });
    }

    saveFile(path, newContent){
        try {
            fs.write(path, newContent);
            alert(`File saved: ${path}`); //Feedback simple por ahora
        } catch (err) {
            console.error(err);
            alert('Error saving file');
        }
    }
}

export const notepad = new NotepadApp();