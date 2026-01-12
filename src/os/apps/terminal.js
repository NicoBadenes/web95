/**
 * @file src/os/apps/terminal.js
 * @description Emulador de terminal de comandos conectado al VFS
 * Permite navegación real, lectura de archivos y gestión de directorios.
 */

import { mk } from '../../utils/dom.js';
import { fs } from '../../filesystem/vfs.js';

class TerminalApp {
    constructor() {
        /**
         * @property {string[]} currentPath - Pila de directorios representando la ruta actual
         * [] equivale a la raiz (C:\). ['documents'] equivale a C:\documents
         */
        this.currentPath = [];

        /** @property {HTMLElement} outputElement - Referencia al contenedor de logs */
        this.outputElement = null;

        /** @property {HTMLElement} promptElement - Referencia al texto del prompt (C:\>)*/
        this.promptElement = null;
    }

    /**
     * Inicializa y renderiza la interfaz de la terminal.
     * @returns {HTMLElement} El contenedor principal de la aplicacion.
     */
    run() {
        //1. Contenedor del historial (Output)
        this.outputElement = mk('div', { className: 'terminal-output' });

        // Header de bienvenida
        this.print('Web95 Kernel [Version 1.0.5]');
        this.print('(c) 2026 Web95 Corp. All rights reserved.');
        this.print('')
        this.print('Filesystem mounted. Type "help" for commands.');
        this.print('');

        //2. Input del usuario
        const input = mk('input', {
            className: 'terminal-input',
            attributes: { type: 'text', autocomplete: 'off', spellcheck: 'false' },
            events: {
                keydown: (e) => this.handleInput(e)
            }
        });

        // 3. Prompt Dinamico (C:\>)
        this.promptElement = mk('span', {
            className: 'terminal-prompt',
            text: this.getPromptString()
        });

        const inputLine = mk('div',{
            className: 'terminal-input-line',
            children: [this.promptElement, input]
        });

        // 4. Contenedor principal
        const container = mk('div', {
            className: 'app-terminal',
            children: [this.outputElement, inputLine],
            events: {
                // Enfocar input al hacer click en el fondo negro
                click: () => input.focus()
            }
        });

        // Auto-focus inicial
        setTimeout(() => input.focus(), 10);

        return container;
    }

    /**
     * Maneja el evento de pulsacion de teclas en el input.
     * @param {KeyboardEvent} e
     */
    handleInput(e) {
        if (e.key === 'Enter') {
            const inputEl = e.target;
            const cmdString = inputEl.value.trim(); //Sin limpiar espacios internos todavia

            if (cmdString) {
                // 1. Imprimir lo que el usuario escribio
                this.print(`${this.getPromptString()} ${cmdString}`);

                // 2. Ejecutar
                this.execute(cmdString);

                // 3.Limpiar y Scroll
                inputEl.value = '';
                this.scrollToBottom();
            }
        }
    }

    /**
     * Construye el string del prompt actual basado en la ruta.
     * @returns {string}
     */
    getPromptString() {
        if (this.currentPath.length === 0) {
            return 'C:\\>';
        }
        // Une con backslash para el estilo Windows
        return `C:\\${this.currentPath.join('\\')}> `;
    }

    /**
     * Actualiza el elemento visual del prompt tras un cambio de directorio.
     */
    updatePromptVisual() {
        if (this.promptElement) {
            this.promptElement.textContent = this.getPromptString();
        }
    }

    /**
     * Hace scroll automatico hacia el final del hitorial.
     */
    scrollToBottom() {
        if (this.outputElement) {
            this.outputElement.scrollTop = this.outputElement.scrollHeight;
        }
    }

    /**
     * Imprime una linea de texto en la consola.
     * @param {string} text
     * @param {string} [color] - Para errores o resaltados.
     */
    print(text, color = null){
        const attributes = {};
        if (color) attributes.style = `color: ${color}`;

        const line = mk('div', {
            text: text,
            attributes: attributes
        });

        this.outputElement.appendChild(line);
        this.scrollToBottom();
    }

    /**
     * Motor principal de interpretacion de comandos.
     * @param {string} cmdString
     */
    execute(cmdString) {
        // Sperar comando de argumentos respetando espacios simples
        const args = cmdString.split(/\s+/);
        const command = args[0].toLowerCase();
        const params = args.slice(1);

        switch (command) {
            case 'help':
                this.print('--- Web95 Command List ---');
                this.print('  dir / ls    : List files in current directory');
                this.print('  cd <path>   : Change directory');
                this.print('  cat <file>  : Read file content (alias: type)');
                this.print('  cls         : Clear screen');
                this.print('  whoami      : Current user');
                this.print('  date        : System date');
                break;

            case 'cls':
            case 'clear':
                this.outputElement.innerHTML = '';
                break;

            case 'whoami':
                this.print('root (Administrator)');
                break;
            
            case 'date':
                this.print(new Date().toString());
                break;

            case 'ls':
            case 'dir':
                this.execDir();
                break;

            case 'cd':
                // Si no hay params, ir a raiz (comportamiento unix) o imprimir actual (dos)
                // Voy a imitar 'cd' a raiz si no hay args para facilitar navegacion
                const targetPath = params[0] || '';
                this.execCd(targetPath);
                break;

            case 'cat':
            case 'type':
                if (!params[0]) {
                    this.print('Error: Missing filesname.', '#ff5555');
                } else {
                    this.execCat(params[0]);
                }
                break;

            default:
                this.print(`Bad command or file name: "${command}"`, '#ff5555');
        }
    }

    /**
     * Ejecuta el comando 'dir'/'ls'
     */
    execDir() {
        try{
            // Reconstruye la ruta actual para el VFS
            const vfsPath = this.currentPath.join('/');

            // Obtiene la lista de archivos
            const fileList = fs.dir(vfsPath);

            if (fileList.length === 0) {
                this.print('(Empty directory)', '#888');
                return;
            }

            // Listar items
            fileList.forEach(itemName => {
                // Resuelve para saber si es DIR o FILE y ponerle etiqueta
                // Construye ruta completa temporal para consultar al VFS
                const itemFullPath = vfsPath ? `${vfsPath}/${itemName}` : itemName;
                const node = fs.resolve(itemFullPath);

                let prefix = '[FILE]';
                if (node && node.type === 'dir') prefix = '[DIR ]';

                this.print(`${prefix}  ${itemName}`);
            });

        } catch (error) {
            this.print(`Error listing directory: ${error.message}`, '#ff5555');
        }
    }

    /**
     * Ejecuta el comando 'cd'
     * @param {string} pathArg - Ruta destino (puede ser relativa o absoluta)
     */
    execCd(pathArg){
        if (!pathArg || pathArg === '/' || pathArg === '\\') {
            // Ir a raiz
            this.currentPath = [];
            this.updatePromptVisual();
            return;
        }

        // 1. Calcular cual seria la nueva ruta propuesta (array)
        const newPathStack = this._resolvePathFromInput(pathArg);

        if (newPathStack === null){
            //Hubo un intento de subir mas alla de la raiz que retorno null o similar
            // Aunque mi logica _resolve lo maneja.
            return;
        }

        //2. Verificar si esa ruta existe REALMENTE en el VFS
        const vfsString = newPathStack.join('/');

        const node = fs.resolve(vfsString);

        if (!node) {
            this.print(`System cannot find the path specified: "${pathArg}"`, '#ff5555');
            return;
        }

        if (node.type !== 'dir') {
            this.print(`Directory name is invalid (it is a file): "${pathArg}"`, '#ff5555');
            return;
        }

        //3. Si todo ok. ACtualiza estado
        this.currentPath = newPathStack;
        this.updatePromptVisual();
    }

    /**
     * Ejecuta el comando 'cat'/'type'
     * @param {string} fileNameArg
     */
    execCat(fileNameArg) {
        // Calcular ruta completa
        const targetStack = this._resolvePathFromInput(fileNameArg);
        const vfsString = targetStack.join('/');

        try {
            const content = fs.read(vfsString);
            //Imprimir con respeto a los saltos de linea
            this.print(content);
        }catch(error){
            this.print(error.message, '#ff5555');
        }
    }

    /**
     * HELPER: Resuelve una ruta ingresada (relativa/absoluta) contra el path actual.
     * Retorna un Array de strings con la ruta absoluta resultante.
     * NO verifica exitencia en disco, solo logica de strings.
     * @param {string} inputPath
     * @returns {string[]} Stack de carpetas resultantes
     */
    _resolvePathFromInput(inputPath) {
        //Clona el path actual para simular la navegacion
        const stack = [...this.currentPath];

        // Normalizar slashes (permitir / y \)
        const parts = inputPath.replace(/\\/g, '/').split('/');

        parts.forEach(part => {
            if (part === '' || part === '.'){
                //Ignorar (ruta actual o slash repetido)
                return;
            }
            if (part === '..') {
                // Subir un nivel
                if (stack.length > 0) {
                    stack.pop();
                }
            }else {
                //Bajar un nivel (entrar a carpeta)
                stack.push(part);
            }
        });

        return stack;
    }
}

export const terminal = new TerminalApp();