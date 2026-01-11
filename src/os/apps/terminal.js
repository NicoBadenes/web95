/**
 * @file src/os/apps/terminal.js
 * @description Emulador de terminal de comandos estilos DOS/Unix.
 */

import { mk } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';

class TerminalApp {
    constructor() {
        this.history = []; //Historial de comandos
    }

    run() {
        //1. Contenedor del output (historial)
        const output = mk('div', { className: 'terminal-output' });

        // Mensaje de bienvenida
        this.print(output, 'Web95 OS [Version 1.0.5]');
        this.print(output, '(c) 2026 Web95 Corp. All rights reserved.\n');
        this.print(output, 'Type "help" to see available commands.\n' );

        //2. Input
        const input = mk('input', {
            className: 'terminal-input',
            attributes: { type: 'text', autocomplete: 'off'},
            events: {
                keydown: (e) => {
                    if (e.key === 'Enter') {
                        const cmd = input.value.trim();
                        if (cmd) {
                            //Imprime el input
                            this.print(output, `C:\\> ${cmd}`);
                            //Execute
                            this.execute(cmd, output);
                            //Clean
                            input.value = '';
                            //Auto-scroll
                            output.scrollTop = output.scrollHeight;
                        }
                    }
                }
            }
        });

        // 3. Prompt "C:>"
        const prompt = mk('span', { className: 'terminal-prompt', text: 'C:\\>' });
        const inputLine = mk('div', {
            className: 'terminal-input-line',
            children: [prompt, input]
        });

        // 4. Contenedor principal
        const container = mk('div', {
            className: 'app-terminal',
            children: [output, inputLine],
            events: {
                //Si haces click en cualquier lado negro, enfoca al input
                click: () => input.focus()
            }
        });

        //Enfoca el input apenas se abre
        setTimeout(() => input.focus(), 10);

        return container;
    }

    /**
     * Agrega texto a la pantalla negra
     */
    print(container, text){
        const line = mk('div', { text: text});
        container.appendChild(line);
    }

    /**
     * The heart: Interpeta el comando
     */
    execute(cmdString, outputContainer) {
        const args = cmdString.split(' ');
        const command = args[0].toLowerCase();
        const params = args.slice(1).join(' '); //El resto del texto

        switch (command){
            case 'help':
                this.print(outputContainer, 'Available commands:');
                this.print(outputContainer, '  help     - Show this list');
                this.print(outputContainer, '  cls      - Clear screen');
                this.print(outputContainer, '  date     - Show current date/time');
                this.print(outputContainer, '  echo     - Print text');
                this.print(outputContainer, '  whoami   - Current user');
                this.print(outputContainer, '  exit     - Close terminal');
                break;

            case 'cls':
            case 'clear':
                outputContainer.innerHTML = '';
                break;

            case 'date':
                this.print(outputContainer, new Date().toString());
                break;

            case 'echo':
                this.print(outputContainer, params);
                break;

            case 'whoami':
                this.print(outputContainer, 'admin');
                break;

            case 'exit':
                this.print(outputContainer, 'To close, click the X button on the window.');
                break;

            default:
                this.print(outputContainer, `Bad command or file name: "${command}"`);

        }
    }
}

export const terminal = new TerminalApp();