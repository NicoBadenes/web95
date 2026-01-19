/**
 * @file src/os/apps/browser.js
 * @description Navegador web simple basado en Iframe.
 */

import { mk } from '../../utils/dom.js';

class BrowserApp {
    constructor() {
        this.homeUrl = 'https://en.wikipedia.org/wiki/Main_Page'; // Bing suele permitir iframes mejor q google
    }

    run(initialUrl = null) {
        const urlToLoad = initialUrl || this.homeUrl;

        // 1. Input de Direccion (Address Bar)
        const input = (mk('input', {
            className: 'browser-input',
            attributes: {
                type: 'text',
                value: urlToLoad
            },
            events: {
                keydown: (e) => {
                    if (e.key === 'Enter') this.loadUrl(iframe, input.value);
                },
                // Evitar que las teclas del navegador se propaguen al OS (como borrar)
                mousedown: (e) => e.stopPropagation()
            }
        }));

        // 2. Boton "Go"
        const btnGo = mk('button', {
            className: 'browser-btn',
            text: 'Go',
            events: {
                click: () => this.loadUrl(iframe, input.value)
            }
        });

        // 3. Iframe
        const iframe = mk('iframe', {
            className: 'browser-content',
            attributes: {
                src: urlToLoad,
                // Sandbox para seguridad basica (opcional, cuidado con bloquear scripts necesarios)
                // sandbox: 'allow-scripts allow-same-origin allow-forms'
            }
        });

        // 4. Toolbar Container
        const toolbar = mk('div', {
            className: 'browser-toolbar',
            children: [
                mk('span', { text: 'Address:', style: 'align-self:center; font-size: 12px; margin-right: 4px'}),
                input,
                btnGo
            ]
        });

        //5. App Container
        return mk('div', {
            className: 'app-browser',
            children: [toolbar, iframe]
        });
    }
    
    loadUrl(iframeElement, url) {
        let finalUrl = url;
        if (!url.startsWith('https://') && !url.startsWith('https://')) {
            finalUrl = 'https://' + url;
        }
        iframeElement.src = finalUrl;
    }
}

export const browser = new BrowserApp();