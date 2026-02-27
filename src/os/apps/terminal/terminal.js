/**
 * @file src/os/apps/terminal.js
 * @description Controlador de la Termial.
 * Gestiona el I/O, historial de comandos, renderizado y scroll.
*/

import { mk } from '../../../utils/dom.js';
import { COMMAND_REGISTRY } from './terminal-commands.js';
import { fs } from '../../../filesystem/vfs.js';

class TerminalApp {
    constructor() {
        // Estado del SIstema de Archivos
        this.currentPath = []; // [] = Root, ['folder'] = C:\folder

        // Estado del Historial
        this.cmdHistory = [];
        this.historyIndex = -1; // -1 es "escribiendo comando nuevo"
        
        // Referecias DOM
        this.rootElement = null;
        this.outputElement = null;
        this.inputElement = null;
        this.promptElement = null;
    }

    /**
     * Inicializa y renderiza la interfaz.
     */
    run() {
        // Reset de sesion
        this.currentPath = [];
        this.historyIndex = this.cmdHistory.length; // Resetea el puntero del historial, pero mantiene comandos previos

        // 1. Contenedor de salida (Log)
        this.outputElement = mk('div', { className: 'terminal-output' });

        // Mensaje de bienvenida inicial
        this.printHeader();

        // 2. Prompt (C:\>)
        this.promptElement = mk('span', {
            className: 'terminal-prompt',
            text: this.getPromptString()
        });

        // 3. Input (Donde escribe el usuario)
        this.inputElement = mk('input', {
            className: 'terminal-input',
            attributes: {
                type: 'text',
                autocomplete: 'off',
                spellcheck: 'false',
                autofocus: 'true'
            },
            events: {
                keydown: (e) => this.handleKeyDown(e)
            }
        });

        // 4. Linea activa (Prompt + Input)
        const inputLine = mk('div', {
            className: 'terminal-input-line',
            children: [this.promptElement, this.inputElement]
        });

        // 5. Ensamblaje Final
        this.rootElement = mk('div', {
            className: 'app-terminal',
            children: [this.outputElement, inputLine],
            events: {
                // Al hacer click en el fondo, enfoca el input
                click: (e) => {
                    // Si el usuario esta seleccionando texto para copiar, no le saca el foco
                    const selection = window.getSelection();
                    if (selection.toString().length === 0) {
                        this.inputElement.focus();
                    }
                }
            }
        });

        // Asegura el focus al abrir
        setTimeout(() => this.inputElement.focus(), 10);

        return this.rootElement;
    }

    /**
     * Manejador central de teclado.
     * @param {KeyboardEvent} e
     */
    handleKeyDown(e) {
        if (e.key === 'Enter') {
            this.processEnter();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateHistory('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateHistory('down');
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.handleTabCompletion();
        }
    }

    /**
     * Autocomplete de comandos y rutas
     */
    handleTabCompletion() {
        const rawInput = this.inputElement.value;
        const args = rawInput.split(' ');
        const target = args.pop();

        if (!target) return; // Si vacio no hace nada

        let matches = [];

        // Buscar en comandos
        if (args.length === 0) {
            const commands = Object.keys(COMMAND_REGISTRY);
            const cmdMatches = commands.filter(cmd => cmd.toLowerCase().startsWith(target.toLowerCase()));
            matches = matches.concat(cmdMatches);
        }

        // Buscar en el directorio actual
        const pathStr = this.currentPath.join('/');
        try {
            const files = fs.dir(pathStr);
            const fileMatches = files.filter(f => f.toLowerCase().startsWith(target.toLowerCase()));
            matches = matches.concat(fileMatches);
        } catch (e) {
            console.warn("Tab completion error:", e);
        }

        // Eliminar duplicados
        matches = [...new Set(matches)];
            
        // Procesar resultados
        if (matches.length === 1) {
            // Hay *1* match, se completa
            args.push(matches[0]);
            this.inputElement.value = args.join(' ') + ' ';
        } else if (matches.length > 1) {
            // Imprime el prompt y el comando actual en el historial
            const oldPrompt = mk('span', { className: 'terminal-prompt', text: this.getPromptString() });
            const oldCommand = mk('span', { text: rawInput, style: 'color: #fff; font-weight: bold;' });
            this.outputElement.appendChild(mk('div', { children: [oldPrompt, oldCommand] }));
            
            // Imprime las opciones disponibles
            this.print(matches.join('   '), '#00ffff');

            this.scrollToBottom();
        }
    }

    /**
     * Procesa la ejecucion del comando al dar Enter.
     */
    processEnter() {
        const rawInput = this.inputElement.value;
        const cmdString = rawInput.trim();

        // 1. Visualizar lo que el usuario escribio (hacerlo permanente en el log)
        const oldPrompt = mk('span', {
            className: 'terminal-prompt',
            text: this.getPromptString()
        });
        const oldCommand = mk('span', {
            text: rawInput,
            style: 'color: #fff; font-weight: bold;'
        });

        const line = mk('div', { children: [oldPrompt, oldCommand] });
        this.outputElement.appendChild(line);

        // 2. Ejecutar logica
        if (cmdString) {
            // Guardar en historial (Si no es repetido o vacio)
            // Pora ahora guarda todo
            this.cmdHistory.push(cmdString);
            this.historyIndex = this.cmdHistory.length; // Resetear puntero al final

            this.execute(cmdString);
        }

        // 3. Limpieza
        this.inputElement.value = '';
        this.scrollToBottom();
    }

    /**
     * Parsea y delega la ejecucion al Registro de Comandos.
     */
    execute(cmdString) {
        // Tokenizacion basica
        const args = cmdString.split(/\s+/);
        const commandName = args.shift().toLowerCase(); // Extrae el primero

        const commandAction = COMMAND_REGISTRY[commandName];

        if (commandAction) {
            // Inyeccion de dependecias (contexto)
            const ctx = {
                print: (text, color) => this.print(text, color),
                clear: () => {
                    this.outputElement.innerHTML = '';
                    // // // // / // // // // // // // // // 
                    this.printHeader();
                },
                currentPath: this.currentPath,
                updatePath: (newStack) => {
                    this.currentPath = newStack;
                    this.promptElement.textContent = this.getPromptString();
                }
            };

            try {
                commandAction(args, ctx);
            } catch (err) {
                this.print(`Runtime Error: ${err.message}`, '#ff0000');
            }

        } else {
            this.print(`Bad command or file name: "${commandName}"`, '#ff5555');
        }
    }

    /**
     * Gestion del historial con flechas.
     */
    navigateHistory(direction) {
        if (this.cmdHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex > 0) {
                this.historyIndex--;
            }
        } else if (direction === 'down'){
            if (this.historyIndex < this.cmdHistory.length) {
                this.historyIndex++;
            }
        }

        // Si al final, mostrar vacio
        if (this.historyIndex === this.cmdHistory.length) {
            this.inputElement.value = '';
        } else{
            // Mostrar el comando historico
            this.inputElement.value = this.cmdHistory[this.historyIndex];

            // Mover el cursor al final del input (UX vital)
            setTimeout(() => {
                this.inputElement.selectionStart = this.inputElement.selectionEnd = 10000;
            }, 0);
        }
    }

    // UTILIDADES VISUALES

    printHeader() {
        this.print('Web95 Kernel [Version 1.0.5]');
        this.print('(c) 2026 Web95 Corp. All rights reserved.');
        this.print('');
    }

    print(text, color = null) {
        if (text === '') {
            this.outputElement.appendChild(mk('br'));
            return;
        }

        const options = { text: text };
        if (color) options.style = `color: ${color}`;

        const line = mk('div', options);
        this.outputElement.appendChild(line);
        this.scrollToBottom();
    }

    getPromptString() {
        if (this.currentPath.length === 0) return 'C:\\> ';
        return `C:\\${this.currentPath.join('\\')}> `;
    }

    /**
     * Fuerza el scroll asegurando q el renderizado este listo.
     */
    scrollToBottom() {
        requestAnimationFrame(() => {
            if (this.rootElement) {
                this.rootElement.scrollTop = this.rootElement.scrollHeight;
            }
        });
    }
}

export const terminal = new TerminalApp();