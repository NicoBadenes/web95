/**
 * @file src/os/gui/start-menu.js
 * @description Logica del menu de inicio clasico
 */

import { mk, $ } from '../../utils/dom.js';
import { wm } from '../gui/window-manager.js';
import { desktop } from '../gui/desktop.js';
import { fs } from '../../filesystem/vfs.js';
import { terminal } from '../apps/terminal/terminal.js';
import { snakeGame } from '../apps/snake.js';
import { calculator } from '../apps/calculator.js';
import { browser } from '../apps/browser.js';
import { solitaireApp } from '../apps/solitaire/index.js';

class StartMenu {
    constructor() {
        this.element = null;
        this.isVisible = false;
    }

    init() {
        // Crear la estructura
        this.element = mk('div', { id: 'start-menu' });

        // Franja lateral "Web95"
        const sideBanner = mk('div', {
            className: 'start-side-banner',
            children: [
                mk('span', { className: 'start-side-text', text: 'Web95' })
            ]
        });

        // Opciones del menu
        const optionsContainer = mk('div', { className: 'start-options' });

        const items = [
            {
                icon: '📁', label: 'Documents',
                action: () => {
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
                icon: '🌐', label: 'Internet Explorer',
                action: () => {
                    wm.open({
                        id: 'browser',
                        title: 'Internet Explorer',
                        w: 800, h: 600,
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
                icon: '🃏', label: 'Solitaire',
                action: () => {
                    wm.open({
                        id: 'solitaire',
                        title: 'Solitaire',
                        w: 600, h: 700,
                        content: solitaireApp.run(),
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
                        content: snakeGame.run(),
                        fixedSize: true
                    });
                }
            },
            
            {
                icon: '💻', label: 'Run...',
                action: () => {
                    const termContent = terminal.run();

                    wm.open({
                        id: 'cmd-prompt',
                        title: 'MS-DOS Prompt',
                        w: 600, h: 400,
                        content: termContent
                    });
                }
            },
            
            {
                icon: '🛑', label: 'Shut Down...',
                action: () => {
                    if(confirm('CRITICAL WARNING: This will simulate a Hard Power Off.\nAll user data, passwords, and saved files will be permanently deleted.\n\nAre you sure you want to continue?')) {
                        document.body.style.cursor = 'wait';

                        setTimeout(() => {
                            localStorage.clear();
                            window.location.reload(); 
                        }, 1000); // 1 segundo antes del shutdown 
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
                        this.toggle(); 
                        item.action(); 
                    }
                }
            });
            optionsContainer.appendChild(div);
        });

        this.element.appendChild(sideBanner);
        this.element.appendChild(optionsContainer);
        document.body.appendChild(this.element);

        // Detectar clicks fuera para cerrar
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
            $('.btn-start').classList.add('active');
        } else{
            this.element.classList.remove('visible');
            $('.btn-start').classList.remove('active');
        }
    }
}

export const startMenu = new StartMenu();