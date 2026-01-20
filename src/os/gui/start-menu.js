/**
 * @file src/os/gui/start-menu.js
 * @description Logica del menu de inicio clasico
 */

import { mk, $ } from '../../utils/dom.js';
import { wm } from '../gui/window-manager.js';
import { desktop } from '../gui/desktop.js';
import { fs } from '../../filesystem/vfs.js';
import { terminal } from '../apps/terminal.js';
import { snakeGame } from '../apps/snake.js';
import { calculator } from '../apps/calculator.js';
import { browser } from '../apps/browser.js';

class StartMenu {
    constructor() {
        this.element = null;
        this.isVisible = false;
    }

    init() {
        //1. Crear la estructura
        this.element = mk('div', { id: 'start-menu' });

        //2. Franja lateral "Web95"
        const sideBanner = mk('div', {
            className: 'start-side-banner',
            children: [
                mk('span', { className: 'start-side-text', text: 'Web95' })
            ]
        });

        // 3. Opciones del menu
        const optionsContainer = mk('div', { className: 'start-options' });

        const items = [
            {
                icon: '📁', label: 'Documents',
                action: () => {
                    //Abre la carpeta root/documents
                    const docsNode = fs.resolve('documents');
                    desktop.openFileOrFolder('documents', docsNode);
                }
            },
            {
                icon: '📝', label: 'Notepad',
                action: () => {
                    desktop.openFileOrFolder('Untitled.txt', { type: 'file', content: ''});
                }
            },

            {
                icon: '🌐', label: 'Internet Explorer', // O "Netscape", o inventar un nombre proximamente
                action: () => {
                    wm.open({
                        id: 'browser',
                        title: 'Internet Explorer',
                        w: 800, h: 600, // Tama;o de ventana grande
                        content: browser.run()
                    });
                }
            },

            {
                icon: '🖩', label: 'Calculator',
                action: () => {
                    wm.open({
                        id: 'calc',
                        title: 'Calculator',
                        w: 250, h:320,
                        content: calculator.run(),
                        fixedSize: true
                    });
                }
            },

            {
                icon: '🐍', label: 'Snake Game',
                action: () => {
                    wm.open({
                        id: 'snake',
                        title: 'Snake',
                        w: 440, h: 520,
                        content: snakeGame.run()
                    });
                }
            },
            
            {
                icon: '💻', label: 'Run...',
                action: () => {
                    // Lanza la terminal
                    const termContent = terminal.run();

                    wm.open({
                        id: 'cmd-prompt',
                        title: 'MS-DOS Prompt',
                        w: 500, h: 300,
                        content: termContent
                    });
                }
            },
            
            //Separador visual (por ahora simple)
            {
                icon: '🛑', label: 'Shut Down...',
                action: () => {
                    if(confirm('Are you sure you want to restart the computer?')) {
                        window.location.reload(); 
                    }
                }
            }
        ];

        //Crear los items
        items.forEach(item => {
            const div = mk('div', {
                className: 'start-item',
                children: [
                    mk('span', { className: 'start-icon', text: item.icon }),
                    mk('span', { text: item.label })
                ],
                events: {
                    click: () => {
                        this.toggle(); //Cerrar menu
                        item.action(); //Ejectuar accion
                    }
                }
            });
            optionsContainer.appendChild(div);
        });

        // 4.Ensamblar
        this.element.appendChild(sideBanner);
        this.element.appendChild(optionsContainer);
        document.body.appendChild(this.element);

        //5. Detectar clicks fuera para cerrar
        document.addEventListener('mousedown', (e) => {
            if(this.isVisible &&
                !this.element.contains(e.target) &&
                !e.target.classList.contains('btn-start')) { //Ignorar el boton de start
                    this.toggle();
                }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        if (this.isVisible) {
            this.element.classList.add('visible');
            $('.btn-start').classList.add('active'); //Efecto presionado para el btn
        } else{
            this.element.classList.remove('visible');
            $('.btn-start').classList.remove('active');
        }
    }
}

export const startMenu = new StartMenu();