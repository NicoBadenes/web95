/**
 * @file src/os/gui/context-menu.js
 * @description Gestiona los menus click-derecho en todo el sistema.
 */

import { mk, $ } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';
import { desktop } from './desktop.js';
import { notepad } from '../apps/notepad.js';
import { wm } from './window-manager.js';

class ContextMenu {
    constructor() {
        this.activeMenu = null;
    }

    init() {
        // Escuchar el click derecho globalmente
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault(); // Bloquear menu del navegador real
            this.handleRightClick(e);
        });

        // Click izquierdo cierra el menu
        document.addEventListener('click', () => this.close());
    }

    close() {
        if (this.activeMenu) {
            this.activeMenu.remove();
            this.activeMenu = null;
        }
    }

    handleRightClick(e) {
        this.close(); // Cerrar anterior si existe

        const target = e.target;
        let menuItems = [];

        // Caso 1: Click en un ICONO del escritorio
        const iconElement = target.closest('.desktop-icon');
        if (iconElement) {
            const filePath = iconElement.getAttribute('data-path');
            const node = fs.resolve(filePath);

            menuItems = [
                { label: 'Open', action: () => desktop.openFileOrFolder(filePath, node)},
                { separator: true },
                { label: 'Rename', action: () => this.actionRename(filePath) },
                { label: 'Delete', action: () => this.actionDelete(filePath) },
                { separator: true },
                { label: 'Properties', action: () => alert(`File: ${filePath}\nType: ${node.type}`) } 
            ];
        }
        // CASO 2: Click en el FONDO del escritorio
        else if(target.id === 'desktop' || target.id === 'desktop-icons') {
            menuItems = [
                { label: 'New Folder', action: () => this.actionNewFolder() },
                { label: 'New Text Document', action: () => this.actionNewFile() },
                { separator: true },
                { label: 'Refresh', action: () => desktop.render() },
                { label: 'Properties', action: () => alert('Display properties not implemented yet.') }
            ];
        }
        // CASO 3: Click en Barra de tareas 
        else if(target.closest('#taskbar')) {
            menuItems = [
                { label: 'Task Manager', action: () => alert('Task Manager...') },
                { label: 'Properties', action: () => alert('Taskbar Properties...') }
            ];
        }

        // Si hay items, renderizar
        if (menuItems.length > 0) {
            this.render(e.clientX, e.clientY, menuItems);
        }
    }

    render(x, y, items) {
        const menu = mk('div', { className: 'context-menu' });

        items.forEach(item => {
            if (item.separator) {
                menu.appendChild(mk('div', { className: 'context-separator' }));
            } else{
                const row = mk('div', {
                    className: 'context-item',
                    text: item.label,
                    events: {
                        click: (e) => {
                            e.stopPropagation();
                            this.close();
                            if (!item.disabled) item.action();
                        }
                    }
                });

                // Soporte visual apra items deshabilitados (por si lo necsito despues)
                if (item.disabled) row.classList.add('disabled');

                menu.appendChild(row);
            }
        });

        // 1. Inyectar primero para poder leer sus dimensiones reales
        // (Usando visibility hidden para que no parpadee en la posicion incorrecta si fuera lento)
        menu.style.visibility = 'hidden';
        document.body.appendChild(menu);

        // 2. Calcular dimensiones y limites
        const menuRect = menu.getBoundingClientRect();
        const winWidth   = window.innerWidth;
        const winHeight = window.innerHeight;
        
        let finalX = x;
        let finalY = y;

        // COLISION VERTICAL (Abajo)
        if (y + menuRect.height > winHeight) {
            // Si no entra abajo, se muestra arriba del cursor
            finalY = y - menuRect.height;
        }

        // COLISION HORIZONTAL (Derecha)
        if (x + menuRect.width > winWidth) {
            // Si no entra a la derecha, se muestra a la izquierda del cursor
            finalX = x - menuRect.width;
        }

        // 3. Aplicar coordenadas finales y mostrar
        menu.style.left = `${finalX}px`;
        menu.style.top = `${finalY}px`;
        menu.style.visibility = 'visible';

        this.activeMenu = menu;
    }

    // --- ACCIONES DEL SISTEMA ---

    actionDelete(path) {
        if (confirm(`Are you sure you want to delete '${path}'?`)) {
            try{
                fs.delete(path);
                desktop.render(); // Refrescar iconos
            } catch(err) {
                alert(err.message);
            }
        }
    }

    actionRename(oldPath) {
        const newName = prompt('Rename to:', oldPath);
        if (newName && newName !== oldPath) {
            try {
                fs.rename(oldPath, newName);
                desktop.render();
            } catch(err) {
                alert(err.message);
            }
        }
    }

    actionNewFolder() {
        const name = prompt('New Folder Name:', 'New Folder');
        if (name) {
            try {
                fs.mkdir(name);
                desktop.render();
            } catch (err) {
                alert(err.message);
            }
        }
    }

    actionNewFile() {
        const name = prompt('New Filename:', 'New Text Document.txt');
        if (name) {
            try {
                fs.write(name, ''); //Crear vacio
                desktop.render();
            } catch(err) {
                alert(err.message);
            }
        }
    }
}

export const contextMenu = new ContextMenu();