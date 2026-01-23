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
            const clickPath = iconElement.getAttribute('data-path');

            // Logica de Seleccion Inteligente
            // Si le das click derecho a alog que NO esta seleccionado
            // asume que queres seleccioanr SOLO eso y olvidar el resto.
            if (!iconElement.classList.contains('selected')) {
                desktop.deselectAll();
                iconElement.classList.add('selected');
            }

            // Ahora recuepra todos los seleccionados (puede ser 1 o muchos)
            const selectedPaths = desktop.getSelectedFiles();

            // Texto dinamico
            const count = selectedPaths.length;
            const suffix = count > 1 ? ` (${count})` : '';

            menuItems = [
                {
                    label: `Open${suffix}`,
                    action: () => this.actionOpen(selectedPaths),
                    style: 'font-weight: bold;'
                },
                { separator: true},
                // Rename solo tiene sentido para un archivo a la vez
                {
                    label: 'Rename',
                    disabled: count > 1, //Deshabilitar para multiples
                    action: () => this.actionRename(clickPath)
                },
                {
                    label: `Delete${suffix}`,
                    action: () => this.actionDelete(selectedPaths)
                },
                { separator: true },
                {
                    label: 'Properties',
                    action: () => alert(`Properties of ${count} items`)
                }
            ];
        }
        // Caso 2: Click en desktop
        else if(target.id === 'desktop' || target.id === 'desktop-icons') {
            menuItems = [
                { label: 'View', disabled: true },
                { separator: true },

                // Submenu
                {
                    label: 'New',
                    submenu: [
                        { label: 'Folder', action: () => this.actionNewFolder() },
                        { label: 'Text Document', action: () => this.actionNewFile() }
                    ]
                },

                { separator: true},
                { label: 'Refresh', action: () => desktop.render() },
                { separator: true},
                { label: 'Properties', action: () => alert('Display Properties')}
            ];
        }

        // Caso 3: Click en Taskbar
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

    actionDelete(paths) {
        // pa asegurar q es un array
        const targets = Array.isArray(paths) ? paths : [paths];
        
        const count = targets.length;
        const msg = count === 1
            ? `Delete '${targets[0]}'?`
            : `Delete these ${count} items?`;

        if (confirm(msg)) {
            let errors = [];
            targets.forEach(path => {
                try {
                    fs.delete(path);
                } catch(e) {
                    errors.push(`${path}: ${e.message}`);
                }
            });

            if (errors.length > 0) alert(`Errors:\n${errors.join('\n')}`);
            
            // Refresh desktop
            desktop.render();
        }
    }

    actionOpen(paths) {
        // Para segurarse
        const targets = Array.isArray(paths) ? paths : [paths];

        // Limites de seguridad
        if (targets.length > 5) {
            if (!confirm(`Are you sure you want to open ${targets.length} windows?`)) return;
        }

        targets.forEach(path => {
            // Resolver el nodo para saber si es carpeta o archivo
            try {
                const node = fs.resolve(path);
                desktop.openFileOrFolder(path, node);
            } catch (err) {
                console.error(`Could not open ${path}:`, err);
            }
        });
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